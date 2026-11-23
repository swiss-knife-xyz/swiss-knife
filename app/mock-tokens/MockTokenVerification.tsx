"use client";
import { useMemo } from "react";
import type { Address, Hex } from "viem";
import type { MockDeployment } from "@/lib/mockTokens";
import {
  submitMockVerification,
  mockEtherscanVerification,
} from "@/lib/mockTokenVerification";
import { ProviderClient } from "@/lib/verification/providers";
import {
  VerificationStatusRow,
  type VerificationTask,
} from "@/components/Verification/VerificationStatusRow";
export function MockTokenVerification({
  deployment,
  address,
  hash,
  provider = "sourcify",
}: {
  provider?: "sourcify" | "etherscan";
  deployment: MockDeployment;
  address: Address;
  hash: Hex;
}) {
  const task = useMemo<VerificationTask>(
    () => ({
      id: `${provider}:${deployment.chain.id}:${address}:${hash}`,
      provider,
      chainId: deployment.chain.id,
      address,
      providerName:
        provider === "sourcify"
          ? "Sourcify"
          : deployment.chain.blockExplorers.default.name,
      submit: (retry) =>
        provider === "sourcify"
          ? submitMockVerification(deployment, address, hash)
          : mockEtherscanVerification(
              deployment,
              address,
              hash,
              "submit",
              retry
            ),
      status: (guid, signal) =>
        provider === "sourcify"
          ? new ProviderClient(fetch, {}, signal, undefined, true).status(
              "sourcify",
              String(deployment.chain.id),
              address,
              guid
            )
          : mockEtherscanVerification(
              deployment,
              address,
              hash,
              "status",
              false,
              signal
            ),
    }),
    [deployment, address, hash, provider]
  );
  return <VerificationStatusRow task={task} />;
}
