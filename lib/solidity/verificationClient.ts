import {
  ProviderClient,
  type ProviderResult,
} from "@/lib/verification/providers";
import {
  VERIFICATION_MESSAGES,
  type ImportedSource,
} from "@/lib/verification/source";
import { verificationIdentity } from "./verificationInput";
import type { Address, Hex } from "viem";
export async function verificationSourceId(
  source: ImportedSource,
  bytecode: string
) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verificationIdentity(source, bytecode))
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}
export async function submitDeploymentSourcify(
  chainId: number,
  address: Address,
  source: ImportedSource
): Promise<ProviderResult> {
  const client = new ProviderClient(
    fetch,
    {},
    AbortSignal.timeout(30_000),
    undefined,
    true
  );
  if (await client.verified("sourcify", String(chainId), address))
    return { state: "verified" };
  return client.submit("sourcify", String(chainId), address, source);
}
export async function deploymentEtherscanVerification({
  operation,
  chainId,
  address,
  hash,
  sourceId,
  source,
  bytecode,
  retry = false,
  signal,
}: {
  operation: "submit" | "status";
  chainId: number;
  address: Address;
  hash: Hex;
  sourceId: string;
  source?: ImportedSource;
  bytecode?: string;
  retry?: boolean;
  signal?: AbortSignal;
}): Promise<ProviderResult> {
  const response = await fetch("/api/solidity/verification", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      operation,
      chainId,
      address,
      hash,
      sourceId,
      ...(operation === "submit" ? { source, bytecode, retry } : {}),
    }),
    signal: signal ?? AbortSignal.timeout(30_000),
  });
  const result = await response.json();
  if (
    (!response.ok && result.state !== "failed" && response.status !== 429) ||
    ![
      "pending",
      "ready",
      "unknown",
      "failed",
      "verified",
      "already_verified",
    ].includes(result.state)
  )
    throw new Error("Etherscan verification unavailable");
  return {
    state: result.state,
    ...(typeof result.guid === "string" ? { guid: result.guid } : {}),
    ...(Number.isFinite(result.retryAfterMs)
      ? { retryAfterMs: Math.max(3000, Math.min(60_000, result.retryAfterMs)) }
      : {}),
    ...(result.phase === "queued" ? { phase: "queued" as const } : {}),
    ...(typeof result.error === "string" &&
    Object.hasOwn(VERIFICATION_MESSAGES, result.error)
      ? { error: result.error as keyof typeof VERIFICATION_MESSAGES }
      : {}),
  };
}
