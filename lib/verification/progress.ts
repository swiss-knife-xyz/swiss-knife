import type { VERIFICATION_MESSAGES } from "./source";
export type VerificationProgress = {
  state: "submitting" | "pending" | "verified" | "failed" | "delayed";
  guid?: string;
  error?: keyof typeof VERIFICATION_MESSAGES;
  queued?: boolean;
  retryAfterMs?: number;
};
export type StoredVerificationProgress = VerificationProgress & {
  sourceId: string;
  updatedAt: number;
};
export type DeploymentVerifications = Partial<
  Record<"sourcify" | "etherscan", StoredVerificationProgress>
>;
export function mergeVerificationProgress(
  current: DeploymentVerifications = {},
  incoming: DeploymentVerifications = {}
): DeploymentVerifications {
  const merged = { ...current };
  for (const provider of ["sourcify", "etherscan"] as const) {
    const next = incoming[provider],
      previous = current[provider];
    if (!next) continue;
    if (
      previous &&
      (previous.updatedAt > next.updatedAt ||
        (previous.state === "verified" && next.state !== "verified"))
    )
      continue;
    merged[provider] = next;
  }
  return merged;
}
