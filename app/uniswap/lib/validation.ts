import { MAX_SLIPPAGE_BPS } from "./constants";

export const parseSlippageBps = (
  value: string,
  maxBps = MAX_SLIPPAGE_BPS
): number => {
  const normalized = value.trim();
  const match = /^(?:(\d+)(?:\.(\d{0,2}))?|\.(\d{1,2}))$/.exec(normalized);
  if (!match) {
    throw new RangeError("Slippage must have at most two decimal places.");
  }

  const whole = Number(match[1] ?? "0");
  const fractional = (match[2] ?? match[3] ?? "").padEnd(2, "0");
  const bps = whole * 100 + Number(fractional || "0");
  if (!Number.isSafeInteger(bps) || bps < 0 || bps > maxBps) {
    throw new RangeError(
      `Slippage must be between 0 and ${maxBps / 100} percent.`
    );
  }
  return bps;
};

export const tryParseSlippageBps = (
  value: string,
  maxBps = MAX_SLIPPAGE_BPS
): number | null => {
  try {
    return parseSlippageBps(value, maxBps);
  } catch {
    return null;
  }
};
