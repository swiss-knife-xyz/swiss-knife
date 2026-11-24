import { Address, encodeFunctionData, erc20Abi } from "viem";
import {
  PortfolioToken,
  isNativeToken,
  getBalanceWei,
} from "./portfolioApi";
import { getNativeGasReserveWei } from "./chains";

export interface TransferCall {
  to: Address;
  value: bigint;
  data: `0x${string}`;
}

/**
 * Resolve the amount (in wei) we'll send for a given token row.
 *
 * - If the user supplied `amountOverrideWei`, use it verbatim.
 * - Otherwise use the full balance. For native tokens, subtract a gas reserve
 *   sized for the whole batch — scaled by `batchTokenCount` and (when known)
 *   the live `gasPriceWei`. If the balance is smaller than the reserve, we
 *   return 0 so the caller can skip the row.
 */
export function resolveTransferAmountWei(
  token: PortfolioToken,
  amountOverrideWei: bigint | undefined,
  batchTokenCount: number,
  gasPriceWei?: bigint
): bigint {
  if (amountOverrideWei !== undefined) return amountOverrideWei;
  const fullBalance = getBalanceWei(token);
  if (!isNativeToken(token)) return fullBalance;
  const reserve = getNativeGasReserveWei(
    token.chainId,
    batchTokenCount,
    gasPriceWei
  );
  if (fullBalance <= reserve) return 0n;
  return fullBalance - reserve;
}

export function buildTransferCall(
  token: PortfolioToken,
  receiver: Address,
  amountWei: bigint
): TransferCall {
  if (isNativeToken(token)) {
    return { to: receiver, value: amountWei, data: "0x" };
  }
  return {
    to: token.contractAddress as Address,
    value: 0n,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: "transfer",
      args: [receiver, amountWei],
    }),
  };
}
