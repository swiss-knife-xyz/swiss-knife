"use client";

import { useEffect, useRef, useState } from "react";
import {
  Button,
  HStack,
  Icon,
  IconButton,
  Link,
  Spinner,
  Text,
  Tooltip,
} from "@chakra-ui/react";
import { CheckCircle2, AlertCircle, ArrowUpRight, Clock3 } from "lucide-react";
import type { Address, Hex } from "viem";
import type { MockDeployment } from "@/lib/mockTokens";
import {
  submitMockVerification,
  mockEtherscanVerification,
} from "@/lib/mockTokenVerification";
import { explorerUrl, VERIFICATION_MESSAGES } from "@/lib/verification/source";
import { ProviderClient } from "@/lib/verification/providers";

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
  const providerName =
    provider === "sourcify"
      ? "Sourcify"
      : deployment.chain.blockExplorers.default.name;
  const [state, setState] = useState<
    "pending" | "verified" | "failed" | "delayed"
  >("pending");
  const [reason, setReason] = useState<keyof typeof VERIFICATION_MESSAGES>();
  const [queued, setQueued] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const request = useRef<ReturnType<typeof submitMockVerification> | undefined>(
    undefined
  );
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    const timeout = provider === "etherscan" ? 15 * 60_000 : 180_000;
    const deadline = Date.now() + timeout;
    const signal = AbortSignal.any([
      controller.signal,
      AbortSignal.timeout(timeout),
    ]);
    const client = new ProviderClient(fetch, {}, signal, undefined, true);
    setState("pending");
    setReason(undefined);
    setQueued(false);
    // Keep the submission promise through Strict Mode's effect replay. A POST is never replayed by polling.
    request.current ??=
      provider === "sourcify"
        ? submitMockVerification(deployment, address, hash)
        : mockEtherscanVerification(
            deployment,
            address,
            hash,
            "submit",
            attempt > 0
          );
    async function run() {
      try {
        const submitted = await request.current!;
        if (!active) return;
        setReason(submitted.error);
        setQueued(submitted.phase === "queued");
        if (
          submitted.state === "verified" ||
          submitted.state === "already_verified"
        ) {
          setState("verified");
          return;
        }
        if (submitted.state === "failed") {
          setState("failed");
          return;
        }
        if (provider === "sourcify" && !submitted.guid)
          throw new Error("Verification submission not confirmed");
        const guid = submitted.guid;
        let pollDelay = submitted.retryAfterMs ?? 3000;
        async function poll() {
          try {
            const result =
              provider === "sourcify"
                ? await client.status(
                    "sourcify",
                    String(deployment.chain.id),
                    address,
                    guid
                  )
                : await mockEtherscanVerification(
                    deployment,
                    address,
                    hash,
                    "status",
                    false,
                    signal
                  );
            if (!active) return;
            pollDelay = result.retryAfterMs ?? 3000;
            setReason(result.error);
            setQueued(result.phase === "queued");
            if (
              result.state === "verified" ||
              result.state === "already_verified"
            ) {
              setState("verified");
              return;
            }
            if (result.state === "failed") {
              setState("failed");
              return;
            }
          } catch {
            if (!active) return;
          }
          if (Date.now() >= deadline) {
            setState("delayed");
            return;
          }
          timer = setTimeout(poll, pollDelay);
        }
        timer = setTimeout(poll, pollDelay);
      } catch {
        if (active) setState("failed");
      }
    }
    void run();
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [deployment, address, hash, attempt, provider]);

  return (
    <HStack role="status" fontSize="xs" spacing={2} flexWrap="wrap" pt={3}>
      {state === "pending" ? (
        <Spinner size="xs" color="blue.300" />
      ) : (
        <Icon
          as={
            state === "verified"
              ? CheckCircle2
              : state === "delayed"
                ? Clock3
                : AlertCircle
          }
          color={state === "verified" ? "green.300" : "orange.300"}
          boxSize={4}
        />
      )}
      <Text color={state === "verified" ? "green.300" : "text.secondary"}>
        {state === "pending"
          ? reason === "RATE_LIMITED"
            ? `${providerName} rate limit reached. Retrying shortly…`
            : reason === "CONTRACT_NOT_INDEXED"
              ? `Waiting for ${providerName} to index the contract…`
              : queued
                ? `Queued for ${providerName} verification…`
                : `Verifying source on ${providerName}…`
          : state === "verified"
            ? `Source verified on ${providerName}`
            : state === "delayed"
              ? `${providerName} verification is taking longer than usual.`
              : reason
                ? `${providerName}: ${VERIFICATION_MESSAGES[reason]}`
                : `${providerName} verification not confirmed.`}
      </Text>

      {state === "verified" && (
        <Tooltip label={`View contract on ${providerName}`}>
          <IconButton
            as={Link}
            href={explorerUrl(provider, String(deployment.chain.id), address)}
            isExternal
            aria-label={`View contract on ${providerName}`}
            icon={<ArrowUpRight size={14} />}
            size="xs"
            variant="ghost"
            color="text.secondary"
          />
        </Tooltip>
      )}

      {(state === "failed" || state === "delayed") && (
        <Button
          size="xs"
          variant="ghost"
          onClick={() => {
            if (state === "failed") request.current = undefined;
            setAttempt((value) => value + 1);
          }}
        >
          {state === "delayed" ? "Check status" : "Retry verification"}
        </Button>
      )}
    </HStack>
  );
}
