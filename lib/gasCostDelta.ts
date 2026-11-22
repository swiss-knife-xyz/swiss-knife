import { formatUnits } from "viem";
import type { estimateGasCost } from "./gasCostEstimate";
type Cost = ReturnType<typeof estimateGasCost>;

const dollars = (value: number) =>
  value > 0 && value < 0.000001 ? "< $0.000001" : `$${value.toFixed(6)}`;

export function gasCostDelta(
  source: Cost,
  target: Cost,
  sourceDecimals: number,
  targetDecimals: number,
  sameAsset: boolean
) {
  if (sameAsset) {
    const decimals = Math.max(sourceDecimals, targetDecimals);
    const original =
      source.baseUnits * 10n ** BigInt(decimals - sourceDecimals);
    const estimated =
      target.baseUnits * 10n ** BigInt(decimals - targetDecimals);
    const difference = original - estimated;
    const absolute = difference < 0n ? -difference : difference;
    const basisPoints =
      original > 0n ? (absolute * 10000n) / original : undefined;
    return {
      direction:
        difference > 0n ? "saving" : difference < 0n ? "extra" : "equal",
      nativeAmount: formatUnits(absolute, decimals),
      usd:
        source.usdValue !== undefined && target.usdValue !== undefined
          ? dollars(Math.abs(source.usdValue - target.usdValue))
          : undefined,
      percent:
        basisPoints === undefined
          ? undefined
          : `${basisPoints / 100n}.${String(basisPoints % 100n).padStart(2, "0")}`,
    } as const;
  }
  if (source.usdValue === undefined || target.usdValue === undefined)
    return undefined;
  const difference = source.usdValue - target.usdValue;
  const percent =
    source.usdValue > 0
      ? (Math.abs(difference) / source.usdValue) * 100
      : undefined;
  return {
    direction: difference > 0 ? "saving" : difference < 0 ? "extra" : "equal",
    nativeAmount: undefined,
    usd: dollars(Math.abs(difference)),
    percent:
      percent !== undefined && Number.isFinite(percent)
        ? (Math.floor(percent * 100) / 100).toFixed(2)
        : undefined,
  } as const;
}
