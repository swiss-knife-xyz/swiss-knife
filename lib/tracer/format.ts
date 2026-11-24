import { formatUnits } from "viem";
import { chainIdToChain } from "@/data/networks";

export function formatTraceValue(value?: string, chainId?: number) {
  if (value === undefined) return "—";
  const currency = chainId
    ? chainIdToChain[chainId]?.nativeCurrency
    : undefined;
  if (!currency) return `${BigInt(value).toString()} base units`;
  return `${formatUnits(BigInt(value), currency.decimals)} ${currency.symbol}`;
}
