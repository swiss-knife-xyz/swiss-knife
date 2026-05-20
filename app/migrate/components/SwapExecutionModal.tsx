"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  HStack,
  Image,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Progress,
  Skeleton,
  Spinner,
  Text,
  VStack,
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
} from "@chakra-ui/react";
import {
  AlertTriangle,
  ArrowRight,
  ArrowDownUp,
  Check,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { Address, Call, Hex, erc20Abi, formatUnits, getAddress } from "viem";
import {
  useReadContracts,
  useSendCalls,
  useSendTransaction,
  useWaitForCallsStatus,
  useWaitForTransactionReceipt,
} from "wagmi";
import { SwapQuote, TargetTokenEntry, sumQuotes } from "../lib/swapTypes";
import { isNativeToken } from "../lib/portfolioApi";
import { detectWrapUnwrap } from "../lib/wrapUnwrap";
import { buildSwapCalls } from "../lib/buildSwapCalls";
import { formatUsd, formatUsdCompact } from "../lib/format";
import { chainIdToChain } from "@/data/common";

// Mirror the limits used in the Send-flow BatchProgressModal — keeping them
// in sync so the two flows behave consistently for the same wallet.
const MAX_BATCH_SIZE = 30;
const FALLBACK_CHUNK_SIZE = 10;

type Phase = "preview" | "sending" | "awaiting" | "done" | "failed";
type Strategy = "whole" | "chunked" | "sequential";
type RowStatus = "queued" | "wallet" | "mining" | "done" | "failed" | "skipped";

interface SwapExecutionModalProps {
  isOpen: boolean;
  onClose: (didSwapAnything: boolean) => void;
  quotes: SwapQuote[];
  targetToken: TargetTokenEntry;
  slippageBps: number;
  supportsBatching: boolean;
  chainId: number;
  taker: Address;
  /** Where the bought tokens end up. Equals `taker` when the user didn't set
   *  a custom recipient. Pre-validated by the caller. */
  recipient: Address;
}

interface UnitClassification {
  /** Wrap = native → wrapped-native (no approve, no DEX fee). */
  wrap: boolean;
  /** Unwrap = wrapped-native → native. */
  unwrap: boolean;
  /** Native sell-side (e.g. ETH → USDC). No approve regardless. */
  nativeSource: boolean;
}

function classify(quote: SwapQuote, chainId: number, targetAddress: string): UnitClassification {
  const sellTokenAddrLower = isNativeToken(quote.source)
    ? "native"
    : quote.source.contractAddress.toLowerCase();
  const buyTokenAddrLower =
    targetAddress.toLowerCase() === "native" ? "native" : targetAddress.toLowerCase();
  const wrapDirection = detectWrapUnwrap(chainId, sellTokenAddrLower, buyTokenAddrLower);
  return {
    wrap: wrapDirection === "wrap",
    unwrap: wrapDirection === "unwrap",
    nativeSource: isNativeToken(quote.source),
  };
}

function shortBalance(formatted: string): string {
  if (!formatted.includes(".")) return formatted;
  const [int, dec] = formatted.split(".");
  const trimmed = dec.slice(0, 6).replace(/0+$/, "");
  return trimmed ? `${int}.${trimmed}` : int;
}
function fmtAmount(wei: bigint, decimals: number): string {
  return shortBalance(formatUnits(wei, decimals));
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

/** Split units across batches without breaking up a single unit's calls. */
function chunkUnits<T extends { callCount: number }>(units: T[], limit: number): T[][] {
  if (limit <= 0) return units.length ? [units] : [];
  const out: T[][] = [];
  let current: T[] = [];
  let count = 0;
  for (const u of units) {
    if (count + u.callCount > limit && current.length > 0) {
      out.push(current);
      current = [];
      count = 0;
    }
    current.push(u);
    count += u.callCount;
  }
  if (current.length) out.push(current);
  return out;
}

interface PlannedUnit {
  quote: SwapQuote;
  classification: UnitClassification;
  /** True when an existing on-chain allowance covers the swap. Forces the
   *  approve call to be skipped at execute time. */
  allowanceCovered: boolean;
  /** Pre-built calls. Re-computed when allowance reads land. */
  approve?: Call;
  swap: Call;
  postTransfer?: Call;
  callCount: number;
}

export function SwapExecutionModal({
  isOpen,
  onClose,
  quotes,
  targetToken,
  slippageBps,
  supportsBatching,
  chainId,
  taker,
  recipient,
}: SwapExecutionModalProps) {
  // -------- Allowance reads ------------------------------------------------
  // For every ERC-20 source whose quote carries an allowanceTarget, peek at
  // the on-chain allowance. If it already covers the amount we'd swap, we
  // drop the approve call entirely. Native sources / wrap+unwrap rows skip
  // the read.
  const allowanceQueries = useMemo(() => {
    return quotes
      .map((q, idx) => {
        const c = classify(q, chainId, targetToken.address);
        if (c.wrap || c.unwrap || c.nativeSource) return null;
        const target = q.quoteData?.allowanceTarget;
        if (!target) return null;
        let token: Address;
        let allowanceTarget: Address;
        try {
          token = getAddress(q.source.contractAddress);
          allowanceTarget = getAddress(target);
        } catch {
          return null;
        }
        return {
          idx,
          contract: {
            address: token,
            abi: erc20Abi,
            functionName: "allowance" as const,
            args: [taker, allowanceTarget] as const,
            chainId,
          },
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [quotes, chainId, targetToken.address, taker]);

  const { data: allowanceData, isLoading: isLoadingAllowances } = useReadContracts({
    contracts: allowanceQueries.map((q) => q.contract),
    query: { enabled: isOpen && allowanceQueries.length > 0 },
  });

  const allowanceByIdx = useMemo<Map<number, bigint>>(() => {
    const m = new Map<number, bigint>();
    if (!allowanceData) return m;
    allowanceData.forEach((res, i) => {
      if (res.status === "success" && typeof res.result === "bigint") {
        m.set(allowanceQueries[i].idx, res.result);
      }
    });
    return m;
  }, [allowanceData, allowanceQueries]);

  // -------- Planned units --------------------------------------------------
  const plannedUnits = useMemo<PlannedUnit[]>(() => {
    return quotes.map((q, idx) => {
      const classification = classify(q, chainId, targetToken.address);
      const currentAllowance = allowanceByIdx.get(idx) ?? 0n;
      const allowanceCovered =
        !classification.wrap &&
        !classification.unwrap &&
        !classification.nativeSource &&
        currentAllowance >= q.sourceAmountWei;

      let approve: Call | undefined;
      let swap: Call;
      let postTransfer: Call | undefined;
      try {
        const built = buildSwapCalls({
          source: q.source,
          sourceAmountWei: q.sourceAmountWei,
          targetAddress: targetToken.address,
          taker,
          recipient,
          currentAllowanceWei: currentAllowance,
          quoteData: q.quoteData,
          chainId,
        });
        approve = built.approve;
        swap = built.swap;
        postTransfer = built.postTransfer;
      } catch {
        // Defensive: if a single unit can't build (e.g. missing quoteData),
        // surface a no-op swap pointing at the source contract so the
        // outer flow can still render — the row will show as "failed" later.
        swap = {
          to: (q.source.contractAddress === "native"
            ? "0x0000000000000000000000000000000000000000"
            : (q.source.contractAddress as Address)) as Address,
          value: 0n,
          data: "0x",
        };
      }

      const callCount =
        (approve ? 1 : 0) + 1 + (postTransfer ? 1 : 0);
      return {
        quote: q,
        classification,
        allowanceCovered,
        approve,
        swap,
        postTransfer,
        callCount,
      };
    });
  }, [quotes, chainId, targetToken.address, taker, recipient, allowanceByIdx]);

  const totalCalls = plannedUnits.reduce((s, u) => s + u.callCount, 0);
  const totals = useMemo(() => sumQuotes(quotes, targetToken.decimals), [quotes, targetToken]);

  // -------- Phase state ----------------------------------------------------
  const [phase, setPhase] = useState<Phase>("preview");
  const [strategy, setStrategy] = useState<Strategy>(
    supportsBatching ? "whole" : "sequential"
  );
  const [chunkSize, setChunkSize] = useState<number>(MAX_BATCH_SIZE);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [rowStatus, setRowStatus] = useState<Map<number, RowStatus>>(new Map());
  const [rowTxHashes, setRowTxHashes] = useState<Map<number, Hex>>(new Map());
  const [completedTxHashes, setCompletedTxHashes] = useState<Hex[]>([]);
  const [pendingUnitIdxs, setPendingUnitIdxs] = useState<number[]>([]);
  const [hasSwappedAnything, setHasSwappedAnything] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  // Snapshot of unit indexes currently in-flight (for batch mode tracking).
  const inFlightRef = useRef<number[]>([]);
  const activeIdRef = useRef<string | null>(null);
  const closingRef = useRef(false);
  // Index pointer for sequential mode.
  const seqIdxRef = useRef<number>(0);

  const totalUnits = plannedUnits.length;
  const isTerminal = phase === "done";

  // -------- Batch hooks ----------------------------------------------------
  const {
    sendCallsAsync,
    data: sendCallsData,
    error: sendCallsError,
    reset: resetSendCalls,
  } = useSendCalls();
  const {
    data: waitData,
    error: waitError,
  } = useWaitForCallsStatus({
    id: sendCallsData?.id,
    query: { enabled: !!sendCallsData?.id },
  });

  // -------- Sequential hooks ----------------------------------------------
  const {
    sendTransaction,
    data: seqHash,
    error: seqSendError,
    reset: resetSeqSend,
  } = useSendTransaction();
  const {
    isSuccess: seqReceiptSuccess,
    isError: seqReceiptError,
    error: seqReceiptErr,
    data: seqReceiptData,
  } = useWaitForTransactionReceipt({
    hash: seqHash,
    query: { enabled: !!seqHash },
  });

  // -------- Batch submission flow -----------------------------------------
  const submitBatch = useCallback(
    (
      nextStrategy: "whole" | "chunked",
      fromIdxs: number[],
      nextChunkSize: number
    ) => {
      setStrategy(nextStrategy);
      setChunkSize(nextChunkSize);
      setErrorMsg(null);
      setPhase("sending");
      resetSendCalls();

      const slice =
        nextStrategy === "whole" ? fromIdxs : fromIdxs.slice(0, nextChunkSize);

      // Mark these rows as wallet-pending while waiting on confirmation.
      setRowStatus((curr) => {
        const next = new Map(curr);
        for (const i of slice) next.set(i, "wallet");
        return next;
      });
      inFlightRef.current = slice;

      const calls: Call[] = [];
      for (const i of slice) {
        const u = plannedUnits[i];
        if (u.approve) calls.push(u.approve);
        calls.push(u.swap);
        if (u.postTransfer) calls.push(u.postTransfer);
      }
      if (calls.length === 0) {
        setPhase("done");
        return;
      }
      sendCallsAsync({ calls, chainId, forceAtomic: true })
        .then((data) => {
          if (closingRef.current) return;
          activeIdRef.current = data.id;
          setPhase("awaiting");
          setRowStatus((curr) => {
            const next = new Map(curr);
            for (const i of slice) next.set(i, "mining");
            return next;
          });
        })
        .catch((err) => {
          if (closingRef.current) return;
          const msg =
            (err as any)?.shortMessage ||
            err?.message ||
            "Transaction request failed";
          if (isUserRejection(err)) {
            setErrorMsg("You rejected the request in your wallet.");
            setPhase("failed");
            // Roll the wallet-pending markers back so retry can re-issue.
            setRowStatus((curr) => {
              const next = new Map(curr);
              for (const i of slice) next.set(i, "queued");
              return next;
            });
            return;
          }
          // Auto-downgrade larger batches when a wallet's batch cap rejects it.
          if (slice.length > FALLBACK_CHUNK_SIZE) {
            setErrorMsg(
              `${msg}. Splitting into batches of ${FALLBACK_CHUNK_SIZE}.`
            );
            setTimeout(
              () => submitBatch("chunked", fromIdxs, FALLBACK_CHUNK_SIZE),
              250
            );
            return;
          }
          setErrorMsg(msg);
          setPhase("failed");
          setRowStatus((curr) => {
            const next = new Map(curr);
            for (const i of slice) next.set(i, "queued");
            return next;
          });
        });
    },
    [plannedUnits, chainId, sendCallsAsync, resetSendCalls]
  );

  // Backup capture for hook-level send errors (wallets that surface
  // rejection on the hook's `error` rather than throwing).
  useEffect(() => {
    if (!sendCallsError) return;
    if (closingRef.current) return;
    if (phase !== "sending") return;
    const msg =
      (sendCallsError as any)?.shortMessage ||
      sendCallsError?.message ||
      "Transaction request failed";
    if (isUserRejection(sendCallsError)) {
      setErrorMsg("You rejected the request in your wallet.");
    } else {
      setErrorMsg(msg);
    }
    setPhase("failed");
    setRowStatus((curr) => {
      const next = new Map(curr);
      for (const i of inFlightRef.current) next.set(i, "queued");
      return next;
    });
  }, [sendCallsError, phase]);

  // Wait-for-calls receipts.
  useEffect(() => {
    if (closingRef.current) return;
    if (!sendCallsData?.id || sendCallsData.id !== activeIdRef.current) return;

    if (waitError) {
      setErrorMsg(waitError.message || "Failed to confirm batch status.");
      setPhase("failed");
      setRowStatus((curr) => {
        const next = new Map(curr);
        for (const i of inFlightRef.current) next.set(i, "failed");
        return next;
      });
      return;
    }
    if (!waitData) return;
    const receipts = waitData.receipts ?? [];

    if (waitData.status === "failure") {
      const anyReverted = receipts.some((r) => r.status === "reverted");
      setErrorMsg(
        anyReverted
          ? "One or more swaps in this batch reverted. A token may be a scam contract or the quote went stale — try refetching."
          : "The wallet rejected or failed to submit the batch."
      );
      setPhase("failed");
      setRowStatus((curr) => {
        const next = new Map(curr);
        for (const i of inFlightRef.current) next.set(i, "failed");
        return next;
      });
      return;
    }

    const allSuccess =
      waitData.status === "success" &&
      receipts.length > 0 &&
      receipts.every((r) => r.status === "success");
    const anyReverted = receipts.some((r) => r.status === "reverted");

    if (allSuccess) {
      const justDone = inFlightRef.current;
      setHasSwappedAnything(true);
      setRowStatus((curr) => {
        const next = new Map(curr);
        for (const i of justDone) next.set(i, "done");
        return next;
      });
      const newHashes = receipts
        .map((r) => r.transactionHash)
        .filter((h): h is `0x${string}` => !!h);
      if (newHashes.length > 0) {
        setCompletedTxHashes((prev) => [...prev, ...newHashes]);
      }
      const remaining = pendingUnitIdxs.filter((i) => !justDone.includes(i));
      setPendingUnitIdxs(remaining);
      inFlightRef.current = [];
      activeIdRef.current = null;
      if (remaining.length === 0) {
        setPhase("done");
      } else {
        submitBatch("chunked", remaining, chunkSize);
      }
    } else if (anyReverted) {
      setErrorMsg(
        "One or more swaps in this batch reverted. Try refetching quotes or removing the offending token."
      );
      setPhase("failed");
      setRowStatus((curr) => {
        const next = new Map(curr);
        for (const i of inFlightRef.current) next.set(i, "failed");
        return next;
      });
    }
  }, [waitData, waitError, sendCallsData?.id, pendingUnitIdxs, submitBatch, chunkSize]);

  // -------- Sequential submission flow ------------------------------------
  type SeqStep = { unitIdx: number; kind: "approve" | "swap" | "post"; call: Call };

  // Flatten units to a step list — each step is one wallet prompt.
  const seqStepsRef = useRef<SeqStep[]>([]);
  // Index of the step the sequential loop is currently driving.
  const [seqStepIdx, setSeqStepIdx] = useState<number>(0);

  const buildSeqSteps = useCallback(
    (fromIdxs: number[]): SeqStep[] => {
      const steps: SeqStep[] = [];
      for (const i of fromIdxs) {
        const u = plannedUnits[i];
        if (u.approve) steps.push({ unitIdx: i, kind: "approve", call: u.approve });
        steps.push({ unitIdx: i, kind: "swap", call: u.swap });
        if (u.postTransfer)
          steps.push({ unitIdx: i, kind: "post", call: u.postTransfer });
      }
      return steps;
    },
    [plannedUnits]
  );

  const fireSeqStep = useCallback(
    (stepIdx: number) => {
      const step = seqStepsRef.current[stepIdx];
      if (!step) return;
      seqIdxRef.current = stepIdx;
      setSeqStepIdx(stepIdx);
      setRowStatus((curr) => {
        const next = new Map(curr);
        next.set(step.unitIdx, "wallet");
        return next;
      });
      resetSeqSend();
      sendTransaction({
        to: step.call.to,
        data: step.call.data,
        value: step.call.value,
        chainId,
      });
    },
    [chainId, sendTransaction, resetSeqSend]
  );

  const startSequential = useCallback(
    (fromIdxs: number[]) => {
      setStrategy("sequential");
      setErrorMsg(null);
      const steps = buildSeqSteps(fromIdxs);
      seqStepsRef.current = steps;
      if (steps.length === 0) {
        setPhase("done");
        return;
      }
      setPhase("sending");
      setTimeout(() => fireSeqStep(0), 0);
    },
    [buildSeqSteps, fireSeqStep]
  );

  // Sequential: hash → mining
  useEffect(() => {
    if (!seqHash) return;
    if (strategy !== "sequential") return;
    const step = seqStepsRef.current[seqIdxRef.current];
    if (!step) return;
    setRowStatus((curr) => {
      const next = new Map(curr);
      next.set(step.unitIdx, "mining");
      return next;
    });
    setRowTxHashes((curr) => {
      const next = new Map(curr);
      next.set(step.unitIdx, seqHash);
      return next;
    });
  }, [seqHash, strategy]);

  // Sequential: send-level errors.
  useEffect(() => {
    if (!seqSendError) return;
    if (strategy !== "sequential") return;
    const step = seqStepsRef.current[seqIdxRef.current];
    if (!step) return;
    const msg =
      (seqSendError as any)?.shortMessage ||
      seqSendError.message ||
      "Wallet rejected the request";
    setRowStatus((curr) => {
      const next = new Map(curr);
      next.set(step.unitIdx, "failed");
      return next;
    });
    setErrorMsg(msg);
    setPhase("failed");
  }, [seqSendError, strategy]);

  // Sequential: receipt → advance.
  useEffect(() => {
    if (!seqHash) return;
    if (strategy !== "sequential") return;
    const step = seqStepsRef.current[seqIdxRef.current];
    if (!step) return;
    if (seqReceiptSuccess && seqReceiptData) {
      if (seqReceiptData.status === "reverted") {
        setRowStatus((curr) => {
          const next = new Map(curr);
          next.set(step.unitIdx, "failed");
          return next;
        });
        setErrorMsg("Transaction reverted on-chain.");
        setPhase("failed");
        return;
      }
      setCompletedTxHashes((prev) => [...prev, seqHash]);
      const isLastStepForUnit =
        seqIdxRef.current === seqStepsRef.current.length - 1 ||
        seqStepsRef.current[seqIdxRef.current + 1]?.unitIdx !== step.unitIdx;
      if (isLastStepForUnit) {
        setHasSwappedAnything(true);
        setRowStatus((curr) => {
          const next = new Map(curr);
          next.set(step.unitIdx, "done");
          return next;
        });
      }
      const nextStepIdx = seqIdxRef.current + 1;
      if (nextStepIdx >= seqStepsRef.current.length) {
        setPhase("done");
      } else {
        // RPC propagation lag: after an approve confirms, public providers
        // can still serve a `latest` block where the allowance hasn't landed
        // yet, causing the very next swap call to revert with
        // "ERC20: insufficient allowance". Wait ~2s after an approve before
        // firing the paired swap; other boundaries get the snappy 50ms.
        const nextStep = seqStepsRef.current[nextStepIdx];
        const isApproveToSwap =
          step.kind === "approve" &&
          nextStep.kind === "swap" &&
          nextStep.unitIdx === step.unitIdx;
        setTimeout(
          () => fireSeqStep(nextStepIdx),
          isApproveToSwap ? 2_000 : 50
        );
      }
    } else if (seqReceiptError) {
      setRowStatus((curr) => {
        const next = new Map(curr);
        next.set(step.unitIdx, "failed");
        return next;
      });
      setErrorMsg(
        (seqReceiptErr as any)?.shortMessage ||
          seqReceiptErr?.message ||
          "Failed to confirm"
      );
      setPhase("failed");
    }
  }, [
    seqReceiptSuccess,
    seqReceiptError,
    seqReceiptData,
    seqReceiptErr,
    seqHash,
    strategy,
    fireSeqStep,
  ]);

  // -------- Confirm / retry / close --------------------------------------
  const handleConfirm = useCallback(() => {
    if (plannedUnits.length === 0) return;
    const allIdxs = plannedUnits.map((_, i) => i);
    setPendingUnitIdxs(allIdxs);
    setRowStatus(new Map(allIdxs.map((i) => [i, "queued"] as const)));
    if (supportsBatching) {
      const initialStrategy: "whole" | "chunked" =
        totalCalls > MAX_BATCH_SIZE ? "chunked" : "whole";
      setTimeout(
        () =>
          submitBatch(
            initialStrategy,
            allIdxs,
            initialStrategy === "whole" ? totalCalls : MAX_BATCH_SIZE
          ),
        0
      );
    } else {
      startSequential(allIdxs);
    }
  }, [plannedUnits.length, supportsBatching, totalCalls, submitBatch, startSequential]);

  const handleRetry = useCallback(() => {
    setErrorMsg(null);
    if (strategy === "sequential") {
      const stepIdx = seqIdxRef.current;
      setTimeout(() => fireSeqStep(stepIdx), 0);
    } else {
      submitBatch(
        strategy === "whole" ? "whole" : "chunked",
        pendingUnitIdxs,
        chunkSize
      );
    }
  }, [strategy, fireSeqStep, submitBatch, pendingUnitIdxs, chunkSize]);

  const handleSwitchToSequential = useCallback(() => {
    setErrorMsg(null);
    startSequential(pendingUnitIdxs.length > 0 ? pendingUnitIdxs : plannedUnits.map((_, i) => i));
  }, [pendingUnitIdxs, plannedUnits, startSequential]);

  const handleRequestClose = useCallback(() => {
    if (phase === "preview" || phase === "done") {
      closingRef.current = true;
      onClose(hasSwappedAnything);
      return;
    }
    setConfirmClose(true);
  }, [phase, onClose, hasSwappedAnything]);

  const handleConfirmClose = useCallback(() => {
    closingRef.current = true;
    setConfirmClose(false);
    resetSendCalls();
    resetSeqSend();
    onClose(hasSwappedAnything);
  }, [hasSwappedAnything, onClose, resetSendCalls, resetSeqSend]);

  // -------- Render --------------------------------------------------------
  const completedCount = plannedUnits.filter(
    (_, i) => rowStatus.get(i) === "done"
  ).length;
  const progressValue =
    totalUnits === 0 ? 0 : Math.round((completedCount / totalUnits) * 100);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleRequestClose}
        closeOnOverlayClick={phase === "preview" || phase === "done"}
        isCentered
        size="xl"
        scrollBehavior="inside"
      >
        <ModalOverlay backdropFilter="blur(6px)" />
        <ModalContent bg="bg.muted" color="white" borderRadius="lg">
          <ModalHeader pr={12}>
            <HStack spacing={2.5}>
              {phase === "done" ? (
                <Box color="#4ADE80">
                  <CheckCircle2 size={20} />
                </Box>
              ) : (
                <Box color="primary.400">
                  <ArrowDownUp size={18} />
                </Box>
              )}
              <Text>
                {phase === "done"
                  ? "Swap complete"
                  : phase === "preview"
                  ? `Swap into ${targetToken.symbol}`
                  : `Swapping into ${targetToken.symbol}`}
              </Text>
              {phase === "awaiting" && (
                <Spinner size="sm" color="primary.400" speed="0.6s" />
              )}
            </HStack>
          </ModalHeader>
          <ModalCloseButton />

          <ModalBody>
            {phase === "done" ? (
              <DoneState
                plannedUnits={plannedUnits}
                rowStatus={rowStatus}
                targetToken={targetToken}
                txHashes={completedTxHashes}
                chainId={chainId}
              />
            ) : (
              <VStack spacing={4} align="stretch">
                {/* Summary strip */}
                <SummaryStrip
                  totals={totals}
                  targetToken={targetToken}
                  slippageBps={slippageBps}
                />

                {/* In-flight progress (only when running) */}
                {phase !== "preview" && (
                  <Box>
                    <HStack justify="space-between" mb={1.5}>
                      <Text
                        fontSize="2xs"
                        color="whiteAlpha.700"
                        letterSpacing="wider"
                      >
                        {strategy === "sequential"
                          ? "ONE BY ONE"
                          : strategy === "whole"
                          ? "ATOMIC BATCH"
                          : "CHUNKED"}
                      </Text>
                      <Text fontSize="2xs" color="whiteAlpha.700">
                        {completedCount} / {totalUnits} done
                      </Text>
                    </HStack>
                    <Progress
                      value={progressValue}
                      size="xs"
                      colorScheme="blue"
                      bg="whiteAlpha.100"
                      borderRadius="full"
                      isIndeterminate={phase === "awaiting" || phase === "sending"}
                    />
                  </Box>
                )}

                {/* Failure banner */}
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
                      <Text fontSize="xs" color="whiteAlpha.900">
                        {errorMsg}
                      </Text>
                    </HStack>
                  </Box>
                )}

                {/* Section divider — labels the source list and gives the
                    YOU RECEIVE strip clear separation from the per-token
                    sell rows below it. */}
                <HStack spacing={3} align="center" mt={1}>
                  <Box flex={1} h="1px" bg="whiteAlpha.200" />
                  <Text
                    fontSize="2xs"
                    color="whiteAlpha.600"
                    letterSpacing="wider"
                    whiteSpace="nowrap"
                  >
                    YOU SELL · {plannedUnits.length}{" "}
                    {plannedUnits.length === 1 ? "token" : "tokens"}
                  </Text>
                  <Box flex={1} h="1px" bg="whiteAlpha.200" />
                </HStack>

                {/* Per-token unit cards */}
                <VStack spacing={2} align="stretch">
                  {plannedUnits.map((u, i) => (
                    <UnitCard
                      key={`${u.quote.source.chainId}:${u.quote.source.contractAddress}`}
                      unit={u}
                      status={rowStatus.get(i)}
                      txHash={rowTxHashes.get(i)}
                      targetToken={targetToken}
                      chainId={chainId}
                      isLoadingAllowances={isLoadingAllowances}
                      phase={phase}
                    />
                  ))}
                </VStack>
              </VStack>
            )}
          </ModalBody>

          <ModalFooter>
            {phase === "done" ? (
              <Button
                bg="primary.500"
                color="white"
                _hover={{ bg: "primary.600" }}
                onClick={() => onClose(hasSwappedAnything)}
              >
                Close
              </Button>
            ) : phase === "failed" ? (
              <HStack spacing={2} w="full" justify="space-between">
                {supportsBatching && strategy !== "sequential" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    color="whiteAlpha.700"
                    onClick={handleSwitchToSequential}
                  >
                    Switch to one-by-one
                  </Button>
                )}
                <Box flex={1} />
                <Button
                  size="sm"
                  bg="primary.500"
                  color="white"
                  _hover={{ bg: "primary.600" }}
                  rightIcon={<ChevronRight size={14} />}
                  onClick={handleRetry}
                >
                  Retry
                </Button>
              </HStack>
            ) : phase === "preview" ? (
              <HStack spacing={2} w="full" justify="space-between">
                <Text fontSize="xs" color="whiteAlpha.600">
                  {supportsBatching
                    ? totalCalls > MAX_BATCH_SIZE
                      ? `${totalCalls} calls · split into batches`
                      : `${totalCalls} calls · single batch`
                    : `${totalCalls} wallet prompts · one by one`}
                </Text>
                <HStack spacing={2}>
                  <Button
                    variant="ghost"
                    color="whiteAlpha.700"
                    _hover={{ bg: "whiteAlpha.100" }}
                    onClick={handleRequestClose}
                  >
                    Cancel
                  </Button>
                  <Button
                    bg="primary.500"
                    color="white"
                    _hover={{ bg: "primary.600" }}
                    leftIcon={<Check size={14} />}
                    onClick={handleConfirm}
                    isDisabled={isLoadingAllowances || plannedUnits.length === 0}
                  >
                    Confirm swap
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
                  {phase === "awaiting"
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
            <AlertDialogHeader>Stop the swap?</AlertDialogHeader>
            <AlertDialogBody>
              {completedCount > 0
                ? `${completedCount} of ${totalUnits} swaps have already gone through. The remaining swaps won't be sent.`
                : "No swaps have gone through yet. If you've already confirmed in your wallet, the batch may still land."}
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

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function SummaryStrip({
  totals,
  targetToken,
  slippageBps,
}: {
  totals: ReturnType<typeof sumQuotes>;
  targetToken: TargetTokenEntry;
  slippageBps: number;
}) {
  return (
    <HStack
      p={3}
      bg="rgba(59,130,246,0.06)"
      border="1px solid"
      borderColor="rgba(59,130,246,0.25)"
      borderRadius="md"
      justify="space-between"
      align="center"
      spacing={4}
    >
      <HStack spacing={3} flex={1} minW={0}>
        <TokenLogo
          src={targetToken.logoUrl}
          symbol={targetToken.symbol}
          size="36px"
        />
        <VStack spacing={0.5} align="flex-start" minW={0}>
          <Text fontSize="2xs" color="whiteAlpha.700" letterSpacing="wider">
            YOU RECEIVE
          </Text>
          <HStack spacing={1.5} align="baseline">
            <Text
              fontSize="xl"
              color="white"
              fontWeight="700"
              fontFamily="mono"
              sx={{ fontVariantNumeric: "tabular-nums" }}
              lineHeight="1.1"
              noOfLines={1}
            >
              {fmtAmount(totals.totalTargetWei, targetToken.decimals)}
            </Text>
            <Text fontSize="sm" color="whiteAlpha.800" fontWeight="600">
              {targetToken.symbol}
            </Text>
          </HStack>
        </VStack>
      </HStack>
      <VStack spacing={0.5} align="flex-end">
        <Text
          fontSize="md"
          color="whiteAlpha.800"
          fontWeight="600"
          lineHeight="1"
        >
          ≈ {formatUsd(totals.totalUsd)}
        </Text>
        <Text fontSize="2xs" color="whiteAlpha.600">
          slippage{" "}
          {(slippageBps / 100).toFixed(slippageBps % 100 === 0 ? 0 : 1)}%
        </Text>
      </VStack>
    </HStack>
  );
}

function TokenLogo({
  src,
  symbol,
  size = "24px",
}: {
  src?: string;
  symbol: string;
  size?: string;
}) {
  if (src) {
    return (
      <Image
        src={src}
        alt={symbol}
        boxSize={size}
        borderRadius="full"
        bg="whiteAlpha.200"
        fallbackSrc="/icon.png"
      />
    );
  }
  return (
    <Box
      boxSize={size}
      borderRadius="full"
      bg="whiteAlpha.200"
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <Text fontSize="2xs" fontWeight="700" color="whiteAlpha.700">
        {symbol.slice(0, 2).toUpperCase()}
      </Text>
    </Box>
  );
}

function UnitCard({
  unit,
  status,
  txHash,
  targetToken,
  chainId,
  isLoadingAllowances,
  phase,
}: {
  unit: PlannedUnit;
  status?: RowStatus;
  txHash?: Hex;
  targetToken: TargetTokenEntry;
  chainId: number;
  isLoadingAllowances: boolean;
  phase: Phase;
}) {
  const explorerBase =
    chainIdToChain[chainId]?.blockExplorers?.default.url ?? null;
  const src = unit.quote.source;
  const srcAmt = fmtAmount(unit.quote.sourceAmountWei, src.decimals);
  const dstAmt = fmtAmount(unit.quote.targetAmountWei, targetToken.decimals);
  const dstUsd = formatUsdCompact(unit.quote.targetUsd);

  const chips: { label: string; tone: "yellow" | "blue" | "green" | "neutral" }[] = [];
  if (unit.classification.wrap) chips.push({ label: "WRAP", tone: "blue" });
  else if (unit.classification.unwrap) chips.push({ label: "UNWRAP", tone: "blue" });
  else if (unit.approve) chips.push({ label: "APPROVE + SWAP", tone: "yellow" });
  else if (!unit.classification.nativeSource && unit.allowanceCovered)
    chips.push({ label: "ALREADY APPROVED", tone: "green" });
  else chips.push({ label: "SWAP", tone: "blue" });
  if (unit.postTransfer) chips.push({ label: "+ TRANSFER", tone: "neutral" });

  return (
    <Box
      bg={
        status === "done"
          ? "rgba(74,222,128,0.06)"
          : status === "failed"
          ? "rgba(239,68,68,0.06)"
          : "whiteAlpha.50"
      }
      border="1px solid"
      borderColor={
        status === "done"
          ? "rgba(74,222,128,0.30)"
          : status === "failed"
          ? "rgba(239,68,68,0.30)"
          : "whiteAlpha.200"
      }
      borderRadius="md"
      px={3}
      py={2.5}
    >
      <HStack spacing={3} align="center">
        <TokenLogo src={src.logoUrl} symbol={src.symbol} size="28px" />
        <VStack spacing={0.5} align="flex-start" flex={1} minW={0}>
          {/* Row 1: source amount + symbol */}
          <HStack spacing={1.5} w="full" minW={0}>
            <Text
              fontSize="sm"
              color="white"
              fontWeight="600"
              fontFamily="mono"
              sx={{ fontVariantNumeric: "tabular-nums" }}
              noOfLines={1}
            >
              {srcAmt}
            </Text>
            <Text fontSize="xs" color="whiteAlpha.700" fontWeight="600">
              {src.symbol.toUpperCase()}
            </Text>
          </HStack>
          {/* Row 2: arrow + target + chips on the same line */}
          <HStack spacing={2} w="full" minW={0}>
            <HStack spacing={1.5} color="whiteAlpha.600" minW={0}>
              <ArrowRight size={11} />
              <Text
                fontSize="xs"
                color="primary.400"
                fontWeight="600"
                fontFamily="mono"
                sx={{ fontVariantNumeric: "tabular-nums" }}
              >
                {dstAmt}
              </Text>
              <TokenLogo
                src={targetToken.logoUrl}
                symbol={targetToken.symbol}
                size="12px"
              />
              <Text fontSize="2xs" color="whiteAlpha.500">
                {dstUsd}
              </Text>
            </HStack>
            {/* Chips */}
            {isLoadingAllowances ? (
              <Skeleton
                height="12px"
                w="64px"
                startColor="whiteAlpha.100"
                endColor="whiteAlpha.300"
                borderRadius="sm"
              />
            ) : (
              chips.map((c, idx) => <Chip key={idx} {...c} />)
            )}
          </HStack>
        </VStack>
        <VStack spacing={1} align="flex-end" flexShrink={0}>
          <StatusBadge status={status} phase={phase} />
          {txHash && explorerBase && (
            <HStack
              as="a"
              href={`${explorerBase}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              spacing={1}
              color="primary.400"
              _hover={{ color: "primary.300" }}
              fontSize="2xs"
              fontFamily="mono"
            >
              <Text>{txHash.slice(0, 6)}…{txHash.slice(-4)}</Text>
              <ExternalLink size={10} />
            </HStack>
          )}
        </VStack>
      </HStack>
    </Box>
  );
}

function Chip({
  label,
  tone,
}: {
  label: string;
  tone: "yellow" | "blue" | "green" | "neutral";
}) {
  // Inline metadata, not a button — bullet separator + tinted caption text.
  // Avoids the bordered-pill look that read as an actionable element.
  const tones = {
    yellow: "#FBBF24",
    blue: "primary.300",
    green: "#4ADE80",
    neutral: "whiteAlpha.700",
  } as const;
  const color = tones[tone];
  return (
    <HStack spacing={1} color={color} flexShrink={0}>
      <Text color="whiteAlpha.400" fontSize="2xs" lineHeight="1">
        ·
      </Text>
      {tone === "green" && <ShieldCheck size={10} />}
      <Text
        fontSize="2xs"
        fontWeight="600"
        letterSpacing="wide"
        lineHeight="1"
        textTransform="lowercase"
      >
        {label.toLowerCase()}
      </Text>
    </HStack>
  );
}

function StatusBadge({ status, phase }: { status?: RowStatus; phase: Phase }) {
  if (phase === "preview") return null;
  switch (status) {
    case "queued":
      return (
        <Text fontSize="2xs" color="whiteAlpha.500" letterSpacing="wider">
          QUEUED
        </Text>
      );
    case "wallet":
      return (
        <HStack spacing={1}>
          <Wallet size={11} color="var(--chakra-colors-primary-400)" />
          <Text fontSize="2xs" color="primary.400" letterSpacing="wider">
            WALLET
          </Text>
        </HStack>
      );
    case "mining":
      return (
        <HStack spacing={1}>
          <Spinner size="xs" color="primary.400" speed="0.6s" />
          <Text fontSize="2xs" color="primary.400" letterSpacing="wider">
            MINING
          </Text>
        </HStack>
      );
    case "done":
      return (
        <HStack spacing={1}>
          <Check size={12} color="#4ADE80" />
          <Text fontSize="2xs" color="#4ADE80" letterSpacing="wider">
            DONE
          </Text>
        </HStack>
      );
    case "failed":
      return (
        <HStack spacing={1}>
          <AlertTriangle size={11} color="#F87171" />
          <Text fontSize="2xs" color="#F87171" letterSpacing="wider">
            FAILED
          </Text>
        </HStack>
      );
    case "skipped":
      return (
        <Text fontSize="2xs" color="whiteAlpha.500" letterSpacing="wider">
          SKIPPED
        </Text>
      );
    default:
      return null;
  }
}

function DoneState({
  plannedUnits,
  rowStatus,
  targetToken,
  txHashes,
  chainId,
}: {
  plannedUnits: PlannedUnit[];
  rowStatus: Map<number, RowStatus>;
  targetToken: TargetTokenEntry;
  txHashes: Hex[];
  chainId: number;
}) {
  const explorerBase =
    chainIdToChain[chainId]?.blockExplorers?.default.url ?? null;
  const successfulUnits = plannedUnits.filter(
    (_, i) => rowStatus.get(i) === "done"
  );
  const totals = useMemo(
    () => sumQuotes(successfulUnits.map((u) => u.quote), targetToken.decimals),
    [successfulUnits, targetToken]
  );

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
            Swapped {successfulUnits.length}{" "}
            {successfulUnits.length === 1 ? "token" : "tokens"} into{" "}
            {targetToken.symbol}
          </Text>
          {totals.totalUsd > 0 && (
            <Text fontSize="sm" color="whiteAlpha.700">
              ≈ {formatUsd(totals.totalUsd)} ·{" "}
              {fmtAmount(totals.totalTargetWei, targetToken.decimals)}{" "}
              {targetToken.symbol}
            </Text>
          )}
        </VStack>
      </VStack>

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
