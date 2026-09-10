import { Address, Call, encodeFunctionData, erc20Abi, zeroAddress } from "viem";
import { getExactInputCalldata } from "@/lib/uniswap/universalRouter";
import { Permit2Abi } from "../../lib/constants";
import { MAX_SLIPPAGE_BPS } from "../../lib/constants";
import { SwapQuoteSnapshot } from "./quoteState";
import { getSwapChainConfig } from "./utils";
import { getErc20ApprovalAmounts } from "../../add-liquidity/lib/approvals";

export const buildSwapCalls = ({
  quote,
  chainId,
  sender,
  slippageBps,
  nowSeconds,
  erc20Allowance,
  permit2Allowance,
}: {
  quote: SwapQuoteSnapshot;
  chainId: number;
  sender: Address;
  slippageBps: number;
  nowSeconds: number;
  erc20Allowance?: bigint;
  permit2Allowance?: { amount: bigint; expiration: number };
}): Call[] => {
  const config = getSwapChainConfig(chainId);
  if (!config) throw new RangeError("Swap contracts are not configured.");
  if (quote.chainId !== chainId) {
    throw new RangeError("The quote belongs to a different chain.");
  }
  if (
    !Number.isInteger(slippageBps) ||
    slippageBps < 0 ||
    slippageBps > MAX_SLIPPAGE_BPS
  ) {
    throw new RangeError("Swap slippage is outside the supported range.");
  }
  if (!Number.isSafeInteger(nowSeconds) || nowSeconds <= 0) {
    throw new RangeError("Current timestamp is invalid.");
  }

  const amountOutMin =
    (quote.amountOut * (10_000n - BigInt(slippageBps))) / 10_000n;
  if (amountOutMin <= 0n) {
    throw new RangeError("Minimum output rounds to zero.");
  }
  const deadline = BigInt(nowSeconds + 20 * 60);
  const calls: Call[] = [];

  if (quote.quoteParams.exactCurrency !== zeroAddress) {
    if (erc20Allowance !== undefined && erc20Allowance < 0n) {
      throw new RangeError("ERC20 allowance cannot be negative.");
    }
    for (const approvalAmount of getErc20ApprovalAmounts(
      erc20Allowance,
      quote.quoteParams.exactAmount,
      quote.quoteParams.exactAmount
    )) {
      calls.push({
        to: quote.quoteParams.exactCurrency,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: "approve",
          args: [config.permit2, approvalAmount],
        }),
      });
    }
    if (
      permit2Allowance === undefined ||
      permit2Allowance.amount < quote.quoteParams.exactAmount ||
      permit2Allowance.expiration < Number(deadline)
    ) {
      calls.push({
        to: config.permit2,
        data: encodeFunctionData({
          abi: Permit2Abi,
          functionName: "approve",
          args: [
            quote.quoteParams.exactCurrency,
            config.universalRouter,
            quote.quoteParams.exactAmount,
            nowSeconds + 60 * 60,
          ],
        }),
      });
    }
  }

  calls.push({
    to: config.universalRouter,
    data: getExactInputCalldata({
      quoteParams: quote.quoteParams,
      amountOutMin,
      tokenOut: quote.tokenOut,
      recipient: sender,
      deadline,
    }),
    value:
      quote.quoteParams.exactCurrency === zeroAddress
        ? quote.quoteParams.exactAmount
        : undefined,
  });

  return calls;
};
