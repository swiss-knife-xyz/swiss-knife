/**
 * Build the on-chain Call list for a single swap row. Three flavours:
 *
 * - Wrap (native → WETH): direct WETH.deposit{value:}. If the user set a custom
 *   recipient we tack on a WETH.transfer to it, since 0x's recipient param
 *   isn't honored for wrap pairs (which is precisely why we synthesize the
 *   quote locally in `useSwapQuotes`).
 *
 * - Unwrap (WETH → native): direct WETH.withdraw. Same recipient-transfer
 *   tack-on, using a plain value transfer.
 *
 * - Normal swap: lifts `transaction` + `allowanceTarget` from the 0x quote
 *   response. The router handles the recipient param itself when set.
 *   ERC-20 sources get an `approve(allowanceTarget, amount)` prepended when
 *   the existing allowance isn't enough — we use exact amount (not max) to
 *   match the rest of the migrate flow's "minimum surface area" approach.
 */
import {
  Address,
  encodeFunctionData,
  erc20Abi,
  getAddress,
  parseAbi,
} from "viem";
import type { Call } from "viem";
import { PortfolioToken, isNativeToken } from "./portfolioApi";
import { SwapQuoteResponse } from "./swapQuoteApi";
import { WRAPPED_NATIVE_BY_CHAIN, detectWrapUnwrap } from "./wrapUnwrap";

const WRAPPED_NATIVE_ABI = parseAbi([
  "function deposit() payable",
  "function withdraw(uint256)",
]);

export interface BuildSwapCallsArgs {
  source: PortfolioToken;
  sourceAmountWei: bigint;
  targetAddress: string; // "native" or 0x… (lowercase ok)
  /** Connected wallet, i.e. the `from` of every call. */
  taker: Address;
  /** Where the bought tokens should end up. Equals `taker` when the user
   *  didn't set a custom recipient. */
  recipient: Address;
  /** Live ERC-20 allowance the taker has granted to `quoteData.allowanceTarget`
   *  for this source. Ignored for native sources / wrap+unwrap rows. */
  currentAllowanceWei: bigint;
  /** Raw 0x quote response. Required for non-wrap rows; ignored for
   *  wrap/unwrap (we synthesize the call locally instead). */
  quoteData?: SwapQuoteResponse;
  chainId: number;
}

export interface BuiltSwapCalls {
  approve?: Call;
  swap: Call;
  /** Only set for wrap/unwrap when `recipient !== taker`. */
  postTransfer?: Call;
}

function asAddress(addr: string): Address {
  // checksum if possible; tolerate already-lowercase upstream values
  try {
    return getAddress(addr);
  } catch {
    return addr as Address;
  }
}

export function buildSwapCalls(args: BuildSwapCallsArgs): BuiltSwapCalls {
  const {
    source,
    sourceAmountWei,
    targetAddress,
    taker,
    recipient,
    currentAllowanceWei,
    quoteData,
    chainId,
  } = args;

  const isNativeSource = isNativeToken(source);
  const sellTokenAddrLower = isNativeSource
    ? "native"
    : source.contractAddress.toLowerCase();
  const buyTokenAddrLower =
    targetAddress.toLowerCase() === "native"
      ? "native"
      : targetAddress.toLowerCase();
  const wrapDirection = detectWrapUnwrap(
    chainId,
    sellTokenAddrLower,
    buyTokenAddrLower
  );
  const recipientDiffers = recipient.toLowerCase() !== taker.toLowerCase();

  if (wrapDirection === "wrap") {
    const wrapped = WRAPPED_NATIVE_BY_CHAIN[chainId];
    if (!wrapped) throw new Error(`No wrapped-native address for chain ${chainId}`);
    const wrappedAddr = asAddress(wrapped);
    const swap: Call = {
      to: wrappedAddr,
      value: sourceAmountWei,
      data: encodeFunctionData({
        abi: WRAPPED_NATIVE_ABI,
        functionName: "deposit",
      }),
    };
    if (!recipientDiffers) return { swap };
    return {
      swap,
      postTransfer: {
        to: wrappedAddr,
        value: 0n,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: "transfer",
          args: [recipient, sourceAmountWei],
        }),
      },
    };
  }

  if (wrapDirection === "unwrap") {
    const wrapped = WRAPPED_NATIVE_BY_CHAIN[chainId];
    if (!wrapped) throw new Error(`No wrapped-native address for chain ${chainId}`);
    const wrappedAddr = asAddress(wrapped);
    const swap: Call = {
      to: wrappedAddr,
      value: 0n,
      data: encodeFunctionData({
        abi: WRAPPED_NATIVE_ABI,
        functionName: "withdraw",
        args: [sourceAmountWei],
      }),
    };
    if (!recipientDiffers) return { swap };
    return {
      swap,
      postTransfer: {
        to: recipient,
        value: sourceAmountWei,
        data: "0x",
      },
    };
  }

  // Normal 0x swap — fall through.
  if (!quoteData?.transaction) {
    throw new Error(
      `Swap quote for ${source.symbol} is missing transaction payload`
    );
  }
  const tx = quoteData.transaction;
  const swap: Call = {
    to: asAddress(tx.to),
    value: tx.value ? BigInt(tx.value) : 0n,
    data: tx.data as `0x${string}`,
  };

  // Native source via 0x router — no approve needed (router pulls value).
  if (isNativeSource) return { swap };

  // ERC-20 source: only insert approve when the existing allowance is short.
  const allowanceTarget = quoteData.allowanceTarget;
  if (!allowanceTarget) {
    // 0x didn't tell us where to approve — without that we can't safely build
    // an approve. Fall back to no approve and let the swap revert visibly
    // rather than approving the wrong address.
    return { swap };
  }
  if (currentAllowanceWei >= sourceAmountWei) {
    return { swap };
  }
  const approve: Call = {
    to: asAddress(source.contractAddress),
    value: 0n,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [asAddress(allowanceTarget), sourceAmountWei],
    }),
  };
  return { approve, swap };
}
