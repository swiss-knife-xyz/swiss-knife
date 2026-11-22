import type { Address, Hex } from "viem";
import type { MockDeployment } from "./mockTokens";
import { MOCK_COMPILER_VERSION } from "./mockTokens.generated";
import { VERIFICATION_MESSAGES } from "./verification/source";
import { ProviderClient } from "./verification/providers";

export async function submitMockVerification(
  deployment: MockDeployment,
  address: Address,
  hash: Hex,
  fetcher: typeof fetch = fetch
) {
  const signal = AbortSignal.timeout(30_000);
  const client = new ProviderClient(fetcher, {}, signal, undefined, true);
  const chainId = String(deployment.chain.id);
  if (await client.verified("sourcify", chainId, address))
    return { state: "verified" as const };
  const response = await fetcher("/mock-tokens-standard-input.json", {
    signal,
  });
  if (!response.ok) throw new Error("Could not load compiler input");
  const input = await response.json();
  return client.submit("sourcify", chainId, address, {
    contractName: `contracts/mocks/MockTokens.sol:${deployment.artifact.contractName}`,
    compilerVersion: MOCK_COMPILER_VERSION,
    sourceCode: JSON.stringify(input),
    creationTransactionHash: hash,
    constructorArguments: deployment.data.slice(
      deployment.artifact.bytecode.length
    ),
    licenseType: "MIT",
    files: Object.keys(input.sources),
    partial: false,
  });
}

export async function mockEtherscanVerification(
  deployment: MockDeployment,
  address: Address,
  hash: Hex,
  operation: "submit" | "status",
  retry = false,
  signal?: AbortSignal
): Promise<import("./verification/providers").ProviderResult> {
  const response = await fetch("/api/mock-tokens/verification", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      operation,
      chainId: deployment.chain.id,
      standard: deployment.standard,
      address,
      hash,
      retry,
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
    ...(typeof result.retryAfterMs === "number" &&
    Number.isFinite(result.retryAfterMs)
      ? { retryAfterMs: Math.max(3000, Math.min(60_000, result.retryAfterMs)) }
      : {}),
    ...(result.phase === "queued" ? { phase: "queued" as const } : {}),
    ...(typeof result.error === "string" &&
    Object.hasOwn(VERIFICATION_MESSAGES, result.error)
      ? { error: result.error as keyof typeof VERIFICATION_MESSAGES }
      : {}),
  };
}
