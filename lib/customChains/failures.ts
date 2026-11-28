export type CustomRpcFailure = {
  chainId: number;
  rpcUrl: string;
  reason: "unreachable" | "access" | "rate-limit";
};
const empty: readonly CustomRpcFailure[] = [];
let snapshot = empty;
let sequence = 0;
const completed = new Map<number, number>();
const listeners = new Set<() => void>();
export const beginCustomRpcRequest = () => ++sequence;
export const getCustomRpcFailures = () => snapshot;
export const getServerCustomRpcFailures = () => empty;
export function subscribeCustomRpcFailures(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function publish(next: readonly CustomRpcFailure[]) {
  if (JSON.stringify(next) === JSON.stringify(snapshot)) return;
  snapshot = next;
  listeners.forEach((listener) => listener());
}
export function clearCustomRpcFailure(chainId: number) {
  completed.set(chainId, ++sequence);
  publish(snapshot.filter((entry) => entry.chainId !== chainId));
}
function failureReason(error: unknown): CustomRpcFailure["reason"] | undefined {
  const seen = new Set<unknown>();
  let connection = false;
  let current = error;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const entry = current as Record<string, unknown>;
    if (entry.status === 401 || entry.status === 403) return "access";
    if (entry.status === 429) return "rate-limit";
    if (
      entry.name === "TimeoutError" ||
      (entry.name === "HttpRequestError" &&
        (entry.status === undefined ||
          Number(entry.status) >= 500 ||
          entry.status === 404 ||
          entry.status === 408))
    )
      connection = true;
    if (
      typeof entry.message === "string" &&
      /failed to fetch|fetch failed|networkerror|network request failed|ECONNREFUSED/i.test(
        entry.message
      )
    )
      connection = true;
    current = entry.cause;
  }
  return connection ? "unreachable" : undefined;
}
/** Only connectivity/provider failures trigger recovery, never contract reverts. */
export function settleCustomRpcRequest(
  chainId: number,
  rpcUrl: string,
  request: number,
  error?: unknown
) {
  if (request < (completed.get(chainId) ?? 0)) return;
  completed.set(chainId, request);
  const reason = failureReason(error);
  const remaining = snapshot.filter((entry) => entry.chainId !== chainId);
  publish(
    reason ? [...remaining, { chainId, rpcUrl, reason }].slice(-5) : remaining
  );
}
