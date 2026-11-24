import { encodeFunctionData, erc20Abi, getAddress } from "viem";
import type { Address, Call } from "viem";
import type { BridgeManualRoute } from "./bridgeApi";
import { PortfolioToken, isNativeToken } from "./portfolioApi";

export interface BuildBridgeCallsArgs {
  source: PortfolioToken;
  route: BridgeManualRoute;
  currentAllowanceWei: bigint;
}

export interface BuiltBridgeCalls {
  approve?: Call;
  bridge: Call;
}

function asAddress(addr: string): Address {
  try {
    return getAddress(addr);
  } catch {
    return addr as Address;
  }
}

function parseAmount(value: string | undefined): bigint {
  if (!value) return 0n;
  try {
    return BigInt(value);
  } catch {
    return 0n;
  }
}

export function buildBridgeCalls(args: BuildBridgeCallsArgs): BuiltBridgeCalls {
  const { source, route, currentAllowanceWei } = args;
  const txData = route.txData;
  if (!txData?.to || !txData.data) {
    throw new Error(`Bridge quote for ${source.symbol} is missing txData`);
  }

  const bridge: Call = {
    to: asAddress(txData.to),
    value: txData.value ? BigInt(txData.value) : 0n,
    data: txData.data as `0x${string}`,
  };

  const approval = route.approvalData;
  if (!approval || isNativeToken(source)) return { bridge };

  const approvalAmount = parseAmount(approval.amount);
  if (approvalAmount === 0n || currentAllowanceWei >= approvalAmount) {
    return { bridge };
  }

  const approve: Call = {
    to: asAddress(approval.tokenAddress || source.contractAddress),
    value: 0n,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [asAddress(approval.spenderAddress), approvalAmount],
    }),
  };
  return { approve, bridge };
}
