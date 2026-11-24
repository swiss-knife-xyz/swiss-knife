"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  HStack,
  VStack,
  Text,
  Box,
  Progress,
  Image,
  IconButton,
  Tooltip,
  Spinner,
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
} from "@chakra-ui/react";
import {
  AlertTriangle,
  Trash2,
  ChevronRight,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { Call, formatUnits } from "viem";
import { useSendCalls, useWaitForCallsStatus } from "wagmi";
import {
  ExecutionPlan,
  PreparedTransfer,
} from "../hooks/useMigrateExecution";
import { tokenKey } from "../lib/portfolioApi";
import { buildTransferCall } from "../lib/buildTransferCall";
import { formatUsd, formatUsdCompact } from "../lib/format";
import { chainIdToChain } from "@/data/common";

// Trim trailing zeros after decimal, keep small numbers readable.
function shortBalance(formatted: string): string {
  if (!formatted.includes(".")) return formatted;
  return formatted.replace(/\.?0+$/, "");
}

function transferAmountDisplay(t: PreparedTransfer): {
  amount: string;
  usd: string | null;
} {
  const formatted = formatUnits(t.amountWei, t.token.decimals);
  const numeric = Number(formatted);
  const usdValue =
    t.token.priceUsd > 0 && Number.isFinite(numeric)
      ? numeric * t.token.priceUsd
      : null;
  return {
    amount: shortBalance(formatted),
    usd: usdValue !== null ? formatUsdCompact(usdValue) : null,
  };
}

// Two distinct limits:
//
// MAX_BATCH_SIZE — global hard cap applied to the first attempt regardless of
// what the wallet advertises. Keeps wallet UIs responsive and bounds the
// blast radius of any single revert.
//
// FALLBACK_CHUNK_SIZE — post-failure size we drop to when a batch is rejected
// or reverts. Targets MetaMask's ~10-call cap and similar lower-limit wallets.
const MAX_BATCH_SIZE = 30;
const FALLBACK_CHUNK_SIZE = 10;

interface BatchProgressModalProps {
  plan: ExecutionPlan;
  onClose: (didMigrateAnything: boolean) => void;
  onSwitchToSequential: () => void;
}

type Phase = "sending" | "awaiting" | "failed" | "done";
type Strategy = "whole" | "chunked";

function chunk<T>(arr: T[], size: number): T[][] {
  if (arr.length === 0) return [];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function buildCalls(transfers: PreparedTransfer[], plan: ExecutionPlan): Call[] {
  return transfers
    .filter((t) => t.amountWei > 0n)
    .map((t) => buildTransferCall(t.token, plan.receiver, t.amountWei));
}

function isUserRejection(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as any;
  if (e.code === 4001) return true;
  const name = (e.name as string) ?? "";
  if (name === "UserRejectedRequestError") return true;
  const cause = e.cause;
  if (cause && typeof cause === "object") {
    if ((cause as any).code === 4001) return true;
    if ((cause as any).name === "UserRejectedRequestError") return true;
  }
  const text = `${e.shortMessage ?? ""} ${e.message ?? ""}`.toLowerCase();
  return (
    text.includes("user rejected") ||
    text.includes("user denied") ||
    text.includes("rejected the request")
  );
}

export function BatchProgressModal({
  plan,
  onClose,
  onSwitchToSequential,
}: BatchProgressModalProps) {
  // Tokens that have not yet been confirmed-transferred. Drained as chunks succeed.
  const [pending, setPending] = useState<PreparedTransfer[]>(plan.transfers);
  const [strategy, setStrategy] = useState<Strategy>("whole");
  // Current batch-size budget. Starts at the global cap; drops to the
  // fallback after any failure so a MetaMask-style ~10 cap is handled.
  const [chunkSize, setChunkSize] = useState<number>(MAX_BATCH_SIZE);
  const [phase, setPhase] = useState<Phase>("sending");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasMigratedAnything, setHasMigratedAnything] = useState(false);
  // Accumulated tx hashes across all confirmed chunks, so the success state
  // can deep-link to every transaction in the migration.
  const [completedTxHashes, setCompletedTxHashes] = useState<string[]>([]);
  // Snapshot of completed transfers; we use it to derive the total USD value
  // shown on the success state (without depending on token order or pricing
  // changing during the migration).
  const [completedTransfers, setCompletedTransfers] = useState<
    PreparedTransfer[]
  >([]);
  const [confirmClose, setConfirmClose] = useState(false);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  // Snapshot of the transfers currently in-flight so we know which ones to
  // mark complete on confirm.
  const inFlightRef = useRef<PreparedTransfer[]>([]);
  // Current sendCalls submission id we're awaiting (used to detect when
  // a stale wait result fires after we've started a new chunk).
  const activeIdRef = useRef<string | null>(null);
  // Once the user cancels, swallow any late onError/sendError so we don't
  // re-prompt the wallet.
  const closingRef = useRef(false);

  const initialTotal = plan.transfers.length;

  const {
    sendCallsAsync,
    data: sendData,
    error: sendError,
    reset: resetSend,
  } = useSendCalls();
  const {
    data: waitData,
    error: waitError,
    isFetching: isWaiting,
  } = useWaitForCallsStatus({
    id: sendData?.id,
    query: { enabled: !!sendData?.id },
  });

  // Derived progress numbers. Computed against the *current* chunk size so the
  // stepper updates if we drop to the fallback size after a failure.
  const totalChunks = useMemo(
    () => Math.max(1, Math.ceil(initialTotal / chunkSize)),
    [initialTotal, chunkSize]
  );
  const completedCount = initialTotal - pending.length;
  const currentChunkIndex =
    strategy === "chunked" ? Math.floor(completedCount / chunkSize) : 0;

  // Kick off the very first attempt on mount.
  //
  // We defer the actual mutate call with `setTimeout(0)` rather than running
  // it synchronously inside the effect. Reason: in React strict-mode dev the
  // effect runs → cleans up → runs again on the same fiber. A TanStack-Query
  // mutation kicked off in the first pass gets stranded by the cleanup and
  // its Promise never resolves (TanStack/query#8512). The setTimeout pushes
  // mutate to a fresh task so it runs after strict-mode settles.
  //
  // NOTE: we deliberately do NOT clear the timeout on cleanup. Strict-mode's
  // pseudo-unmount would otherwise cancel the only queued task we have. The
  // didStartRef guard handles dedup; the worst case on a real unmount is one
  // orphaned mutate call against the mutation cache.
  const didStartRef = useRef(false);
  useEffect(() => {
    if (didStartRef.current) return;
    didStartRef.current = true;
    const initialStrategy: Strategy =
      plan.transfers.length > MAX_BATCH_SIZE ? "chunked" : "whole";
    setTimeout(
      () => submitNext(initialStrategy, plan.transfers, MAX_BATCH_SIZE),
      0
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitNext = useCallback(
    (
      nextStrategy: Strategy,
      fromPending: PreparedTransfer[],
      nextChunkSize: number
    ) => {
      setStrategy(nextStrategy);
      setChunkSize(nextChunkSize);
      setErrorMsg(null);
      setPhase("sending");
      resetSend();

      const slice =
        nextStrategy === "whole"
          ? fromPending
          : fromPending.slice(0, nextChunkSize);
      inFlightRef.current = slice;

      const calls = buildCalls(slice, plan);
      if (calls.length === 0) {
        setPhase("done");
        return;
      }

      sendCallsAsync({
        calls,
        chainId: plan.chainId,
        forceAtomic: true,
      })
        .then((data) => {
          if (closingRef.current) return;
          activeIdRef.current = data.id;
          setPhase("awaiting");
        })
        .catch((err) => {
          if (closingRef.current) return;
          const msg =
            (err as any)?.shortMessage ||
            err?.message ||
            "Transaction request failed";
          // User rejection: surface it as failed and let the user choose to
          // retry / cancel / fall back to one-by-one. Don't auto-resplit, as
          // that would just re-prompt the wallet immediately.
          if (isUserRejection(err)) {
            setErrorMsg("You rejected the request in your wallet.");
            setPhase("failed");
            return;
          }
          // Otherwise auto-downgrade to FALLBACK_CHUNK_SIZE when the current
          // batch is larger than the fallback (covers MetaMask's ~10 cap).
          if (slice.length > FALLBACK_CHUNK_SIZE) {
            setErrorMsg(
              `${msg}. Splitting into batches of ${FALLBACK_CHUNK_SIZE}.`
            );
            setTimeout(
              () => submitNext("chunked", fromPending, FALLBACK_CHUNK_SIZE),
              250
            );
            return;
          }
          setErrorMsg(msg);
          setPhase("failed");
        });
    },
    [plan, sendCallsAsync, resetSend]
  );

  // Backup: some wallets surface the rejection on the hook's `error` state
  // without firing the inline `onError`. If we're still "sending" when an
  // error appears, treat it as a failure so the modal doesn't hang.
  useEffect(() => {
    if (!sendError) return;
    if (closingRef.current) return;
    if (phase !== "sending") return;
    const msg =
      (sendError as any)?.shortMessage ||
      sendError?.message ||
      "Transaction request failed";
    if (isUserRejection(sendError)) {
      setErrorMsg("You rejected the request in your wallet.");
    } else {
      setErrorMsg(msg);
    }
    setPhase("failed");
  }, [sendError, phase]);

  // React to wait-for-calls-status results.
  useEffect(() => {
    if (closingRef.current) return;
    if (!sendData?.id || sendData.id !== activeIdRef.current) return;

    // The wait itself errored (timeout, RPC failure, etc.).
    if (waitError) {
      setErrorMsg(waitError.message || "Failed to confirm batch status.");
      setPhase("failed");
      return;
    }

    if (!waitData) return;

    const receipts = waitData.receipts ?? [];
    // viem maps wallet_getCallsStatus statusCodes 300–699 → 'failure'. This
    // covers wallet rejection after a bundle id was returned, as well as
    // partial/complete on-chain failures. Some wallets surface rejection here
    // (with empty receipts) instead of throwing on `sendCalls`.
    if (waitData.status === "failure") {
      const anyReverted = receipts.some((r) => r.status === "reverted");
      setErrorMsg(
        anyReverted
          ? "One or more transfers in this batch reverted. A token may be a scam contract that blocks transfers."
          : "The wallet rejected or failed to submit the batch."
      );
      setPhase("failed");
      return;
    }

    const allSuccess =
      waitData.status === "success" &&
      receipts.length > 0 &&
      receipts.every((r) => r.status === "success");
    const anyReverted = receipts.some((r) => r.status === "reverted");

    if (allSuccess) {
      const justDone = inFlightRef.current;
      setHasMigratedAnything(true);
      const doneKeys = new Set(justDone.map((t) => tokenKey(t.token)));
      const remaining = pending.filter((t) => !doneKeys.has(tokenKey(t.token)));
      setPending(remaining);
      setCompletedTransfers((prev) => [...prev, ...justDone]);
      const newHashes = receipts
        .map((r) => r.transactionHash)
        .filter((h): h is `0x${string}` => !!h);
      if (newHashes.length > 0) {
        setCompletedTxHashes((prev) => [...prev, ...newHashes]);
      }
      inFlightRef.current = [];
      activeIdRef.current = null;
      if (remaining.length === 0) {
        setPhase("done");
      } else {
        // continue chunked at the same chunk size we've been using
        submitNext("chunked", remaining, chunkSize);
      }
    } else if (anyReverted) {
      setErrorMsg(
        "One or more transfers in this batch reverted. A token may be a scam contract that blocks transfers."
      );
      setPhase("failed");
    }
  }, [waitData, waitError, sendData?.id, pending, submitNext, chunkSize, phase]);

  const inFlight = inFlightRef.current;
  const inFlightOrCurrentChunk =
    phase === "failed"
      ? inFlight.length
        ? inFlight
        : pending.slice(0, chunkSize)
      : pending.slice(0, strategy === "whole" ? pending.length : chunkSize);

  const handleRetry = () => {
    submitNext(strategy, pending, chunkSize);
  };

  const handleUntick = (key: string) => {
    setPending((curr) => curr.filter((t) => tokenKey(t.token) !== key));
  };

  const handleUntickLogoless = () => {
    const targets = new Set(
      inFlightOrCurrentChunk
        .filter((t) => !t.token.logoUrl)
        .map((t) => tokenKey(t.token))
    );
    setPending((curr) =>
      curr.filter((t) => !targets.has(tokenKey(t.token)))
    );
  };

  const isTerminal = phase === "done";

  const handleRequestClose = () => {
    if (isTerminal) {
      onClose(hasMigratedAnything);
      return;
    }
    setConfirmClose(true);
  };

  const handleConfirmClose = () => {
    closingRef.current = true;
    setConfirmClose(false);
    resetSend();
    onClose(hasMigratedAnything);
  };

  const progressValue =
    initialTotal === 0 ? 0 : Math.round((completedCount / initialTotal) * 100);

  return (
    <>
    <Modal
      isOpen
      onClose={handleRequestClose}
      closeOnOverlayClick={isTerminal}
      isCentered
      size="xl"
    >
      <ModalOverlay backdropFilter="blur(6px)" />
      <ModalContent bg="bg.muted" color="white" borderRadius="lg">
        <ModalHeader pr={12}>
          <HStack spacing={2}>
            {phase === "done" && (
              <Box color="#4ADE80">
                <CheckCircle2 size={20} />
              </Box>
            )}
            <Text>
              {phase === "done"
                ? "Migration complete"
                : `Migrating ${initialTotal} tokens`}
            </Text>
            {phase === "awaiting" && <Spinner size="sm" color="primary.400" />}
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {phase === "done" ? (
            <DoneState
              transfers={completedTransfers}
              txHashes={completedTxHashes}
              chainId={plan.chainId}
            />
          ) : (
          <VStack spacing={4} align="stretch">
            <Box>
              <HStack justify="space-between" mb={2}>
                <Text fontSize="xs" color="whiteAlpha.700" letterSpacing="wider">
                  {strategy === "whole"
                    ? "SINGLE BATCH"
                    : `BATCH ${currentChunkIndex + 1} OF ${totalChunks}`}
                </Text>
                <Text fontSize="xs" color="whiteAlpha.700">
                  {completedCount} / {initialTotal} done
                </Text>
              </HStack>
              <Progress
                value={progressValue}
                size="sm"
                colorScheme="blue"
                bg="whiteAlpha.100"
                borderRadius="full"
                isIndeterminate={phase === "awaiting"}
              />
            </Box>

            {/* Stepper dots for chunked mode */}
            {strategy === "chunked" && totalChunks > 1 && (
              <HStack spacing={1.5}>
                {Array.from({ length: totalChunks }, (_, i) => {
                  const state =
                    i < currentChunkIndex
                      ? "done"
                      : i === currentChunkIndex
                      ? phase === "failed"
                        ? "failed"
                        : "active"
                      : "todo";
                  return (
                    <Box
                      key={i}
                      flex={1}
                      h="3px"
                      borderRadius="full"
                      bg={
                        state === "done"
                          ? "#4ADE80"
                          : state === "active"
                          ? "primary.400"
                          : state === "failed"
                          ? "#F87171"
                          : "whiteAlpha.200"
                      }
                    />
                  );
                })}
              </HStack>
            )}

            {phase === "failed" && errorMsg && (
              <Box
                bg="rgba(239,68,68,0.10)"
                border="1px solid"
                borderColor="rgba(239,68,68,0.30)"
                borderRadius="md"
                p={3}
              >
                <HStack align="flex-start" spacing={2}>
                  <Box color="#F87171" pt={0.5}>
                    <AlertTriangle size={16} />
                  </Box>
                  <VStack align="stretch" spacing={1} flex={1}>
                    <Text fontSize="sm" color="#F87171" fontWeight="600">
                      Batch reverted
                    </Text>
                    <Text fontSize="xs" color="whiteAlpha.800">
                      {errorMsg}
                    </Text>
                    <Text fontSize="xs" color="whiteAlpha.700">
                      Tokens without a logo are higher risk — they're often
                      scam contracts that block transfers. Untick the suspect
                      and retry.
                    </Text>
                  </VStack>
                </HStack>
              </Box>
            )}

            <Box
              bg="whiteAlpha.50"
              borderRadius="md"
              border="1px solid"
              borderColor="whiteAlpha.200"
              maxH="240px"
              overflowY="auto"
            >
              <VStack align="stretch" spacing={0}>
                {inFlightOrCurrentChunk.length === 0 ? (
                  <Box p={4}>
                    <Text fontSize="sm" color="whiteAlpha.600">
                      No tokens in this batch.
                    </Text>
                  </Box>
                ) : (
                  inFlightOrCurrentChunk.map((t, i) => {
                    const key = tokenKey(t.token);
                    const isSuspect = !t.token.logoUrl;
                    const { amount, usd } = transferAmountDisplay(t);
                    return (
                      <HStack
                        key={key}
                        px={3}
                        py={2}
                        spacing={3}
                        borderBottom={
                          i < inFlightOrCurrentChunk.length - 1
                            ? "1px solid"
                            : undefined
                        }
                        borderColor="whiteAlpha.100"
                      >
                        {t.token.logoUrl ? (
                          <Image
                            src={t.token.logoUrl}
                            alt={t.token.symbol}
                            boxSize="24px"
                            borderRadius="full"
                            fallbackSrc="/icon.png"
                          />
                        ) : (
                          <Box
                            boxSize="24px"
                            borderRadius="full"
                            bg="rgba(251,191,36,0.20)"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                          >
                            <AlertTriangle size={12} color="#FBBF24" />
                          </Box>
                        )}
                        <Text
                          fontSize="sm"
                          color="white"
                          fontWeight="500"
                          flex={1}
                        >
                          {t.token.symbol.toUpperCase()}
                        </Text>
                        {isSuspect && (
                          <Tooltip label="No logo — may be a scam contract" hasArrow>
                            <Text fontSize="2xs" color="#FBBF24" fontWeight="600">
                              ⚠ SUSPECT
                            </Text>
                          </Tooltip>
                        )}
                        <VStack
                          spacing={0}
                          align="flex-end"
                          minW="0"
                          flexShrink={0}
                        >
                          <Text
                            fontSize="sm"
                            color="white"
                            fontFamily="mono"
                            sx={{ fontVariantNumeric: "tabular-nums" }}
                          >
                            {amount}
                          </Text>
                          {usd && (
                            <Text fontSize="xs" color="whiteAlpha.600">
                              {usd}
                            </Text>
                          )}
                        </VStack>
                        {phase === "failed" && (
                          <Tooltip label="Remove from migration" hasArrow>
                            <IconButton
                              aria-label="Remove"
                              icon={<Trash2 size={14} />}
                              size="xs"
                              variant="ghost"
                              color="whiteAlpha.600"
                              _hover={{ color: "#F87171", bg: "whiteAlpha.100" }}
                              onClick={() => handleUntick(key)}
                            />
                          </Tooltip>
                        )}
                      </HStack>
                    );
                  })
                )}
              </VStack>
            </Box>
          </VStack>
          )}
        </ModalBody>
        <ModalFooter>
          {phase === "done" ? (
            <Button
              colorScheme="blue"
              bg="primary.500"
              _hover={{ bg: "primary.600" }}
              onClick={() => onClose(hasMigratedAnything)}
            >
              Close
            </Button>
          ) : phase === "failed" ? (
            <HStack spacing={2} w="full" justify="space-between">
              <Button
                size="sm"
                variant="ghost"
                color="whiteAlpha.700"
                onClick={onSwitchToSequential}
              >
                Switch to one-by-one
              </Button>
              <HStack>
                {inFlightOrCurrentChunk.some((t) => !t.token.logoUrl) && (
                  <Button
                    size="sm"
                    variant="outline"
                    borderColor="#FBBF24"
                    color="#FBBF24"
                    _hover={{ bg: "whiteAlpha.100" }}
                    onClick={handleUntickLogoless}
                  >
                    Untick all suspects
                  </Button>
                )}
                <Button
                  size="sm"
                  colorScheme="blue"
                  bg="primary.500"
                  _hover={{ bg: "primary.600" }}
                  onClick={handleRetry}
                  rightIcon={<ChevronRight size={14} />}
                >
                  Retry
                </Button>
              </HStack>
            </HStack>
          ) : (
            <HStack w="full" justify="space-between">
              <Button
                size="sm"
                variant="ghost"
                color="whiteAlpha.700"
                _hover={{ bg: "whiteAlpha.100", color: "white" }}
                onClick={handleRequestClose}
              >
                Cancel
              </Button>
              <Text fontSize="xs" color="whiteAlpha.600">
                {isWaiting
                  ? "Waiting for on-chain confirmation…"
                  : "Confirm in your wallet…"}
              </Text>
            </HStack>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>

    <AlertDialog
      isOpen={confirmClose}
      leastDestructiveRef={cancelRef as any}
      onClose={() => setConfirmClose(false)}
      isCentered
    >
      <AlertDialogOverlay>
        <AlertDialogContent bg="bg.muted" color="white">
          <AlertDialogHeader>Stop migration?</AlertDialogHeader>
          <AlertDialogBody>
            {completedCount > 0
              ? `${completedCount} of ${initialTotal} tokens have transferred. The remaining tokens won't be sent.`
              : "No tokens have transferred yet. If you've already confirmed the request in your wallet, the transaction may still go through."}
          </AlertDialogBody>
          <AlertDialogFooter>
            <Button
              ref={cancelRef}
              onClick={() => setConfirmClose(false)}
              variant="ghost"
              _hover={{ bg: "whiteAlpha.100" }}
            >
              Keep going
            </Button>
            <Button
              ml={3}
              bg="#F87171"
              color="white"
              _hover={{ bg: "#EF4444" }}
              onClick={handleConfirmClose}
            >
              Stop
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
    </>
  );
}

function DoneState({
  transfers,
  txHashes,
  chainId,
}: {
  transfers: PreparedTransfer[];
  txHashes: string[];
  chainId: number;
}) {
  const totalUsd = transfers.reduce((sum, t) => {
    const amt = Number(formatUnits(t.amountWei, t.token.decimals));
    if (!Number.isFinite(amt) || t.token.priceUsd <= 0) return sum;
    return sum + amt * t.token.priceUsd;
  }, 0);
  const explorerBase =
    chainIdToChain[chainId]?.blockExplorers?.default.url ?? null;
  const tokenCount = transfers.length;

  return (
    <VStack spacing={5} align="stretch" py={2}>
      <VStack spacing={3} align="center" py={2}>
        <Box
          boxSize="56px"
          borderRadius="full"
          bg="rgba(74,222,128,0.12)"
          border="1px solid"
          borderColor="rgba(74,222,128,0.30)"
          display="flex"
          alignItems="center"
          justifyContent="center"
          color="#4ADE80"
        >
          <CheckCircle2 size={32} />
        </Box>
        <VStack spacing={0.5} align="center">
          <Text fontSize="md" color="white" fontWeight="600">
            {tokenCount} {tokenCount === 1 ? "token" : "tokens"} migrated
          </Text>
          {totalUsd > 0 && (
            <Text fontSize="sm" color="whiteAlpha.700">
              ≈ {formatUsd(totalUsd)} total
            </Text>
          )}
        </VStack>
      </VStack>

      {/* Token summary list */}
      <Box
        bg="whiteAlpha.50"
        borderRadius="md"
        border="1px solid"
        borderColor="whiteAlpha.200"
        maxH="200px"
        overflowY="auto"
      >
        <VStack align="stretch" spacing={0}>
          {transfers.map((t, i) => {
            const formatted = formatUnits(t.amountWei, t.token.decimals);
            const amount = formatted.includes(".")
              ? formatted.replace(/\.?0+$/, "")
              : formatted;
            const amtNum = Number(formatted);
            const usd =
              t.token.priceUsd > 0 && Number.isFinite(amtNum)
                ? formatUsdCompact(amtNum * t.token.priceUsd)
                : null;
            return (
              <HStack
                key={tokenKey(t.token)}
                px={3}
                py={2}
                spacing={3}
                borderBottom={
                  i < transfers.length - 1 ? "1px solid" : undefined
                }
                borderColor="whiteAlpha.100"
              >
                {t.token.logoUrl ? (
                  <Image
                    src={t.token.logoUrl}
                    alt={t.token.symbol}
                    boxSize="20px"
                    borderRadius="full"
                    fallbackSrc="/icon.png"
                  />
                ) : (
                  <Box boxSize="20px" borderRadius="full" bg="whiteAlpha.200" />
                )}
                <Text fontSize="sm" color="white" flex={1}>
                  {t.token.symbol.toUpperCase()}
                </Text>
                <VStack spacing={0} align="flex-end" flexShrink={0}>
                  <Text
                    fontSize="sm"
                    color="white"
                    fontFamily="mono"
                    sx={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {amount}
                  </Text>
                  {usd && (
                    <Text fontSize="xs" color="whiteAlpha.600">
                      {usd}
                    </Text>
                  )}
                </VStack>
              </HStack>
            );
          })}
        </VStack>
      </Box>

      {explorerBase && txHashes.length > 0 && (
        <VStack spacing={1.5} align="stretch">
          <Text
            fontSize="xs"
            color="whiteAlpha.600"
            letterSpacing="wider"
            textTransform="uppercase"
          >
            {txHashes.length === 1
              ? "Transaction"
              : `${txHashes.length} transactions`}
          </Text>
          <HStack spacing={2} flexWrap="wrap">
            {txHashes.map((hash, idx) => (
              <Button
                key={hash}
                as="a"
                href={`${explorerBase}/tx/${hash}`}
                target="_blank"
                rel="noopener noreferrer"
                size="xs"
                variant="outline"
                borderColor="whiteAlpha.300"
                color="white"
                _hover={{ bg: "whiteAlpha.100", borderColor: "primary.400" }}
                rightIcon={<ExternalLink size={12} />}
                fontFamily="mono"
              >
                {txHashes.length > 1 ? `#${idx + 1} · ` : ""}
                {hash.slice(0, 6)}…{hash.slice(-4)}
              </Button>
            ))}
          </HStack>
        </VStack>
      )}
    </VStack>
  );
}
