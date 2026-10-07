import { format, formatDistanceToNow } from "date-fns";

// ENS expiries can contain uint64 sentinel values outside JavaScript's date range.
export function parseHistoryTimestamp(value: unknown): number | null {
  if (
    typeof value !== "number" &&
    typeof value !== "string" &&
    typeof value !== "bigint"
  )
    return null;
  if (typeof value === "string" && !/^\d+$/.test(value)) return null;
  const seconds = Number(value);
  if (
    !Number.isSafeInteger(seconds) ||
    seconds <= 0 ||
    seconds > 8_640_000_000_000
  )
    return null;
  return seconds;
}

export function formatHistoryDate(value: unknown): string {
  const seconds = parseHistoryTimestamp(value);
  return seconds === null
    ? "Date unavailable"
    : format(new Date(seconds * 1000), "PPpp");
}

export function relativeHistoryDate(value: unknown): string {
  const seconds = parseHistoryTimestamp(value);
  return seconds === null
    ? "Date unavailable"
    : formatDistanceToNow(seconds * 1000, { addSuffix: true });
}

export async function readHistoryTimestamp(
  readTimestamp: () => Promise<unknown>
): Promise<number | null> {
  try {
    return parseHistoryTimestamp(await readTimestamp());
  } catch {
    // An unavailable date must not discard an otherwise valid indexed event.
    return null;
  }
}
