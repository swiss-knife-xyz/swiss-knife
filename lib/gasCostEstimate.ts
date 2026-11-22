import { formatUnits } from "viem";

/** Exact native-token arithmetic; USD is a separately labelled approximate display. */
export function estimateGasCost({
  gasUsed,
  gasPrice,
  decimals,
  usdPrice,
}: {
  gasUsed: bigint;
  gasPrice: bigint;
  decimals: number;
  usdPrice?: number;
}) {
  if (typeof gasUsed !== "bigint" || gasUsed <= 0n) {
    throw new Error("Receipt gas used is missing or invalid.");
  }
  if (typeof gasPrice !== "bigint" || gasPrice < 0n) {
    throw new Error("Current gas price is missing or invalid.");
  }
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) {
    throw new Error("Native token decimals are missing or invalid.");
  }
  const baseUnits = gasUsed * gasPrice;
  const nativeAmount = formatUnits(baseUnits, decimals);
  const amount =
    typeof usdPrice === "number" && Number.isFinite(usdPrice) && usdPrice > 0
      ? Number(nativeAmount) * usdPrice
      : undefined;
  const usd =
    amount === undefined || !Number.isFinite(amount)
      ? undefined
      : baseUnits > 0n && amount < 0.000001
        ? "< $0.000001"
        : `$${amount.toFixed(6)}`;
  return {
    baseUnits,
    nativeAmount,
    usd,
    usdValue:
      amount !== undefined && Number.isFinite(amount) ? amount : undefined,
  };
}
