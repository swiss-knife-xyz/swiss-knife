/** Only prioritize plausible contemporary dates; other integers remain amounts. */
export function getLikelyUnixTimestamp(value: string) {
  if (!/^\d+$/.test(value)) return null;
  const amount = BigInt(value);
  const start = 946684800n; // 2000-01-01 UTC
  const end = 7258118400n; // 2200-01-01 UTC, exclusive
  if (amount >= start && amount < end) return { seconds: value, unit: "seconds" as const };
  if (amount >= start * 1000n && amount < end * 1000n) {
    const fraction = (amount % 1000n).toString().padStart(3, "0").replace(/0+$/, "");
    return { seconds: `${amount / 1000n}${fraction ? `.${fraction}` : ""}`, unit: "milliseconds" as const };
  }
  return null;
}

/** Parse seconds from a deep link without permitting invalid JavaScript dates. */
export function parseUnixTimestamp(value: string | null): number | undefined {
  if (value === null || !/^[+-]?\d+(?:\.\d{1,3})?$/.test(value)) return undefined;
  const seconds = Number(value);
  return Number.isFinite(seconds) && Math.abs(seconds * 1000) <= 8.64e15 ? seconds : undefined;
}
