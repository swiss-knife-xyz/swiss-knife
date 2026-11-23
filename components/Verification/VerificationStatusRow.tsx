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
import type { Address } from "viem";
import { explorerUrl, VERIFICATION_MESSAGES } from "@/lib/verification/source";
import type { VerificationProgress } from "@/lib/verification/progress";
import type { ProviderResult } from "@/lib/verification/providers";
export type VerificationTask = {
  id: string;
  provider: "sourcify" | "etherscan";
  chainId: number;
  address: Address;
  providerName: string;
  initial?: VerificationProgress;
  save?(progress: VerificationProgress): Promise<void>;
  submit(retry: boolean): Promise<ProviderResult>;
  status(
    guid: string | undefined,
    signal: AbortSignal
  ): Promise<ProviderResult>;
};

export function VerificationStatusRow({
  task,
  persisted,
  inline = false,
}: {
  task: VerificationTask;
  persisted?: boolean;
  inline?: boolean;
}) {
  const { provider, providerName, address } = task;
  const [state, setState] = useState<
    "pending" | "verified" | "failed" | "delayed"
  >(
    task.initial?.state === "submitting"
      ? "pending"
      : (task.initial?.state ?? "pending")
  );
  const [reason, setReason] = useState<
    keyof typeof VERIFICATION_MESSAGES | undefined
  >(task.initial?.error);
  const [queued, setQueued] = useState(!!task.initial?.queued);
  const [attempt, setAttempt] = useState(0);
  const request = useRef<Promise<ProviderResult> | undefined>(undefined);
  const requestIdentity = useRef(task.id);
  const guid = useRef(task.initial?.guid);
  const retryMode = useRef<"submit" | "status" | undefined>(undefined);
  const lastSaved = useRef<string | undefined>(undefined);
  const [saveError, setSaveError] = useState("");
  useEffect(() => {
    if (persisted === true) setSaveError("");
  }, [persisted]);
  useEffect(() => {
    if (requestIdentity.current !== task.id) {
      request.current = undefined;
      requestIdentity.current = task.id;
      guid.current = task.initial?.guid;
      retryMode.current = undefined;
      lastSaved.current = undefined;
    }
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    const timeout = provider === "etherscan" ? 15 * 60_000 : 180_000;
    const deadline = Date.now() + timeout;
    const signal = AbortSignal.any([
      controller.signal,
      AbortSignal.timeout(timeout),
    ]);
    const cleanup = () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
    const initial = task.initial;
    if (
      !retryMode.current &&
      initial &&
      ["verified", "failed", "delayed"].includes(initial.state)
    ) {
      setState(initial.state as "verified" | "failed" | "delayed");
      setReason(initial.error);
      setQueued(!!initial.queued);
      return cleanup;
    }
    setState("pending");
    setReason(undefined);
    setQueued(false);
    async function save(progress: VerificationProgress) {
      if (!task.save) return;
      const key = JSON.stringify(progress);
      if (lastSaved.current === key) return;
      try {
        await task.save(progress);
        lastSaved.current = key;
        if (active) setSaveError("");
      } catch {
        if (active)
          setSaveError(
            "Verification status isn't saved. Retry saving before closing this tab."
          );
      }
    }
    async function accept(result: ProviderResult): Promise<boolean> {
      if (!active) return true;
      if (result.guid) guid.current = result.guid;
      setReason(result.error);
      setQueued(result.phase === "queued");
      if (result.state === "verified" || result.state === "already_verified") {
        setState("verified");
        await save({ state: "verified", guid: guid.current });
        return true;
      }
      if (
        result.state === "failed" ||
        (provider === "sourcify" && !guid.current)
      ) {
        const reason =
          result.error ??
          (provider === "sourcify" && !guid.current
            ? "UNKNOWN_DELIVERY"
            : undefined);
        setState("failed");
        setReason(reason);
        await save({ state: "failed", guid: guid.current, error: reason });
        return true;
      }
      await save({
        state: "pending",
        guid: guid.current,
        error: result.error,
        queued: result.phase === "queued",
        retryAfterMs: result.retryAfterMs,
      });
      return false;
    }
    let pollDelay = initial?.retryAfterMs ?? 3000;
    async function poll() {
      try {
        const result = await task.status(guid.current, signal);
        if (!active) return;
        pollDelay = result.retryAfterMs ?? 3000;
        if (await accept(result)) return;
      } catch {
        if (!active) return;
      }
      if (Date.now() >= deadline) {
        setState("delayed");
        await save({ state: "delayed", guid: guid.current });
        return;
      }
      timer = setTimeout(poll, pollDelay);
    }
    async function run() {
      if (
        (initial && retryMode.current !== "submit") ||
        retryMode.current === "status"
      ) {
        // A restored or ambiguous submission only checks status; never re-POST.
        await poll();
        return;
      }
      try {
        request.current ??= (async () => {
          // Save intent before POST. Strict Mode reuses this promise.
          await task.save?.({ state: "submitting" });
          return task.submit(attempt > 0);
        })();
        const submitted = await request.current;
        if (!active) return;
        pollDelay = submitted.retryAfterMs ?? 3000;
        if (await accept(submitted)) return;
        timer = setTimeout(poll, pollDelay);
      } catch {
        if (active) {
          setState("failed");
          await save({ state: "failed", guid: guid.current });
        }
      }
    }
    void run();
    return cleanup;
  }, [task, attempt, provider]);

  return (
    <HStack role="status" fontSize="xs" spacing={2} flexWrap="wrap" pt={inline ? 0 : 3} minH={inline ? 6 : undefined}>
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
            href={explorerUrl(provider, String(task.chainId), address)}
            isExternal
            aria-label={`View contract on ${providerName}`}
            icon={<ArrowUpRight size={14} />}
            size="xs"
            variant="ghost"
            color="text.secondary"
          />
        </Tooltip>
      )}

      {saveError && <Text color="error.text">{saveError}</Text>}
      {(state === "failed" || state === "delayed") && (
        <Button
          size="xs"
          variant="ghost"
          onClick={() => {
            if (state === "failed") {
              request.current = undefined;
              retryMode.current = "submit";
            } else retryMode.current = "status";
            setAttempt((value) => value + 1);
          }}
        >
          {state === "delayed" ? "Check status" : "Retry verification"}
        </Button>
      )}
    </HStack>
  );
}
