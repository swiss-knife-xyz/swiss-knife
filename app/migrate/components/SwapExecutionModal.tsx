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
  useChainId,
  useReadContracts,
  useSendCalls,
  useSendTransaction,
  useSwitchChain,
  useWaitForCallsStatus,
  useWaitForTransactionReceipt,
} from "wagmi";
import { SwapQuote, TargetTokenEntry, sumQuotes } from "../lib/swapTypes";
import {
  BridgeStatusCode,
  BridgeStatusEntry,
  TERMINAL_BRIDGE_STATUS_CODES,
  fetchBridgeQuote,
  fetchBridgeStatus,
} from "../lib/bridgeApi";
import { isNativeToken } from "../lib/portfolioApi";
import { detectWrapUnwrap } from "../lib/wrapUnwrap";
import { buildBridgeCalls } from "../lib/buildBridgeCalls";
import { buildSwapCalls } from "../lib/buildSwapCalls";
import { formatUsd, formatUsdCompact } from "../lib/format";
import { chainIdToChain } from "@/data/common";

// Mirror the limits used in the Send-flow BatchProgressModal — keeping them
// in sync so the two flows behave consistently for the same wallet.
const MAX_BATCH_SIZE = 30;
const FALLBACK_CHUNK_SIZE = 10;
const BRIDGE_QUOTE_REFRESH_BUFFER_MS = 45_000;
const DEFAULT_BRIDGE_STATUS_TIMEOUT_SEC = 30 * 60;
const BRIDGE_STATUS_TIMEOUT_BUFFER_SEC = 5 * 60;

type Phase = "preview" | "ready" | "sending" | "awaiting" | "done" | "failed";
type Strategy = "whole" | "chunked" | "sequential";
type RowStatus =
  | "queued"
  | "wallet"
  | "mining"
  | "bridging"
  | "done"
  | "failed"
  | "refunded"
  | "skipped";

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

function classify(
  quote: SwapQuote,
  chainId: number,
  targetAddress: string
): UnitClassification {
  const sellTokenAddrLower = isNativeToken(quote.source)
    ? "native"
    : quote.source.contractAddress.toLowerCase();
  const buyTokenAddrLower =
    targetAddress.toLowerCase() === "native"
      ? "native"
      : targetAddress.toLowerCase();
  const wrapDirection = detectWrapUnwrap(
    chainId,
    sellTokenAddrLower,
    buyTokenAddrLower
  );
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

function isBridgeQuote(quote: SwapQuote): boolean {
  return quote.routeKind === "bridge";
}

function normalizeEpochMs(value: number | undefined): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }
  return value > 1_000_000_000_000 ? value : value * 1000;
}

function bridgeRouteExpiryMs(quote: SwapQuote): number | undefined {
  const expiries = [
    normalizeEpochMs(quote.bridgeRoute?.quoteExpiry),
    normalizeEpochMs(quote.bridgeRoute?.expiresAt),
    normalizeEpochMs(quote.bridgeData?.result.quoteExpiry),
  ].filter((value): value is number => value !== undefined);
  if (expiries.length === 0) return undefined;
  return Math.min(...expiries);
}

function isBridgeQuoteExpiring(quote: SwapQuote, now = Date.now()): boolean {
  if (!isBridgeQuote(quote)) return false;
  const expiryMs = bridgeRouteExpiryMs(quote);
  return (
    expiryMs !== undefined && expiryMs - now <= BRIDGE_QUOTE_REFRESH_BUFFER_MS
  );
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function bridgeStatusMaxDurationSec(quote: SwapQuote): number | undefined {
  const route = quote.bridgeRoute;
  const socketRoute = route?.socketRoute as any;
  const statusCheck = route?.statusCheck ?? socketRoute?.statusCheck;
  return readNumber(statusCheck?.maxDurationSec);
}

function bridgePollTimeoutMs(quote: SwapQuote): number {
  const routeMax = bridgeStatusMaxDurationSec(quote) ?? 0;
  const estimated =
    quote.estimatedTimeSeconds ?? quote.bridgeRoute?.estimatedTime ?? 0;
  const timeoutSec =
    Math.max(routeMax, estimated, DEFAULT_BRIDGE_STATUS_TIMEOUT_SEC) +
    BRIDGE_STATUS_TIMEOUT_BUFFER_SEC;
  return timeoutSec * 1000;
}

function bridgeQuoteFromResponse(
  existing: SwapQuote,
  data: NonNullable<SwapQuote["bridgeData"]>,
  targetToken: TargetTokenEntry
): SwapQuote {
  const route = data.result.manualRoutes[0];
  if (!route) throw new Error("No bridge routes available for this pair");
  const output = route.output;
  const targetAmountWei = (() => {
    try {
      return BigInt(output.amount);
    } catch {
      return 0n;
    }
  })();
  const outputFloat = Number(
    formatUnits(targetAmountWei, targetToken.decimals)
  );
  const targetUsd =
    typeof output.valueInUsd === "number" && output.valueInUsd > 0
      ? output.valueInUsd
      : typeof output.priceInUsd === "number" &&
          output.priceInUsd > 0 &&
          outputFloat > 0
        ? outputFloat * output.priceInUsd
        : existing.targetUsd;
  const gasFeeUsd =
    route.gasFee?.feesInUsd ?? route.gasFee?.feeInUsd ?? undefined;

  return {
    ...existing,
    targetAmountWei,
    targetUsd,
    needsApprove: !isNativeToken(existing.source),
    isPending: false,
    errorMessage: undefined,
    isPremiumFee: data.isPremiumFee === true,
    bridgeData: data,
    bridgeRoute: route,
    routeName: route.routeDetails?.name,
    estimatedTimeSeconds: route.estimatedTime,
    gasFeeUsd,
    feeBps: data.feeBps,
  };
}

function bridgeStatusToRowStatus(
  entry: BridgeStatusEntry | undefined
): RowStatus {
  const code = entry?.bungeeStatusCode;
  if (
    code === BridgeStatusCode.FULFILLED ||
    code === BridgeStatusCode.SETTLED
  ) {
    return "done";
  }
  if (code === BridgeStatusCode.REFUNDED) return "refunded";
  if (
    code === BridgeStatusCode.EXPIRED ||
    code === BridgeStatusCode.CANCELLED
  ) {
    return "failed";
  }
  return "bridging";
}

function isTerminalRowStatus(status: RowStatus | undefined): boolean {
  return status === "done" || status === "failed" || status === "refunded";
}

interface PlannedUnit {
  quote: SwapQuote;
  kind: "swap" | "bridge";
  sourceChainId: number;
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
  chainId: initialChainId,
  taker,
  recipient,
}: SwapExecutionModalProps) {
  const connectedChainId = useChainId();
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();
  const initialChainIdRef = useRef(initialChainId);
  const [runtimeQuotes, setRuntimeQuotes] = useState(() => quotes);

  // -------- Allowance reads ------------------------------------------------
  // For every ERC-20 source whose quote carries an allowanceTarget, peek at
  // the on-chain allowance. If it already covers the amount we'd swap, we
  // drop the approve call entirely. Native sources / wrap+unwrap rows skip
  // the read.
  const allowanceQueries = useMemo(() => {
    return runtimeQuotes
      .map((q, idx) => {
        const sourceChainId = q.source.chainId;
        const c = classify(q, sourceChainId, targetToken.address);
        if (c.wrap || c.unwrap || c.nativeSource) return null;
        const allowanceTarget = isBridgeQuote(q)
          ? q.bridgeRoute?.approvalData?.spenderAddress
          : q.quoteData?.allowanceTarget;
        const tokenAddress = isBridgeQuote(q)
          ? q.bridgeRoute?.approvalData?.tokenAddress
          : q.source.contractAddress;
        if (!allowanceTarget || !tokenAddress) return null;
        let token: Address;
        let spender: Address;
        try {
          token = getAddress(tokenAddress);
          spender = getAddress(allowanceTarget);
        } catch {
          return null;
        }
        return {
          idx,
          contract: {
            address: token,
            abi: erc20Abi,
            functionName: "allowance" as const,
            args: [taker, spender] as const,
            chainId: sourceChainId,
          },
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [runtimeQuotes, targetToken.address, taker]);

  const { data: allowanceData, isLoading: isLoadingAllowances } =
    useReadContracts({
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
    return runtimeQuotes.map((q, idx) => {
      const sourceChainId = q.source.chainId;
      const kind = isBridgeQuote(q) ? "bridge" : "swap";
      const classification = classify(q, sourceChainId, targetToken.address);
      const currentAllowance = allowanceByIdx.get(idx) ?? 0n;
      const bridgeApprovalAmount = (() => {
        try {
          return BigInt(q.bridgeRoute?.approvalData?.amount ?? "0");
        } catch {
          return 0n;
        }
      })();
      const allowanceCovered =
        !classification.wrap &&
        !classification.unwrap &&
        !classification.nativeSource &&
        currentAllowance >=
          (kind === "bridge" ? bridgeApprovalAmount : q.sourceAmountWei);

      let approve: Call | undefined;
      let swap: Call;
      let postTransfer: Call | undefined;
      try {
        if (kind === "bridge") {
          if (!q.bridgeRoute) {
            throw new Error(
              `Bridge quote for ${q.source.symbol} is missing route`
            );
          }
          const built = buildBridgeCalls({
            source: q.source,
            route: q.bridgeRoute,
            currentAllowanceWei: currentAllowance,
          });
          approve = built.approve;
          swap = built.bridge;
        } else {
          const built = buildSwapCalls({
            source: q.source,
            sourceAmountWei: q.sourceAmountWei,
            targetAddress: targetToken.address,
            taker,
            recipient,
            currentAllowanceWei: currentAllowance,
            quoteData: q.quoteData,
            chainId: sourceChainId,
          });
          approve = built.approve;
          swap = built.swap;
          postTransfer = built.postTransfer;
        }
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

      const callCount = (approve ? 1 : 0) + 1 + (postTransfer ? 1 : 0);
      return {
        quote: q,
        kind,
        sourceChainId,
        classification,
        allowanceCovered,
        approve,
        swap,
        postTransfer,
        callCount,
      };
    });
  }, [runtimeQuotes, targetToken.address, taker, recipient, allowanceByIdx]);

  const totalCalls = plannedUnits.reduce((s, u) => s + u.callCount, 0);
  const totals = useMemo(
    () => sumQuotes(runtimeQuotes, targetToken.decimals),
    [runtimeQuotes, targetToken]
  );
  const chainUnitIdxs = useMemo(() => {
    const map = new Map<number, number[]>();
    plannedUnits.forEach((unit, idx) => {
      const arr = map.get(unit.sourceChainId) ?? [];
      arr.push(idx);
      map.set(unit.sourceChainId, arr);
    });
    return map;
  }, [plannedUnits]);
  const orderedChainIds = useMemo(() => {
    const ids = Array.from(chainUnitIdxs.keys());
    if (ids.length <= 1) return ids;
    const currentIdx = ids.findIndex((id) => id === initialChainIdRef.current);
    if (currentIdx <= 0) return ids;
    const next = [...ids];
    const [current] = next.splice(currentIdx, 1);
    return [current, ...next];
  }, [chainUnitIdxs]);

  // -------- Phase state ----------------------------------------------------
  const [phase, setPhase] = useState<Phase>("preview");
  const [strategy, setStrategy] = useState<Strategy>(
    supportsBatching ? "whole" : "sequential"
  );
  const [chunkSize, setChunkSize] = useState<number>(MAX_BATCH_SIZE);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [rowStatus, setRowStatus] = useState<Map<number, RowStatus>>(new Map());
  const [rowTxHashes, setRowTxHashes] = useState<Map<number, Hex>>(new Map());
  const [bridgeStatusByIdx, setBridgeStatusByIdx] = useState<
    Map<number, BridgeStatusEntry>
  >(new Map());
  const [pendingUnitIdxs, setPendingUnitIdxs] = useState<number[]>([]);
  const [isRefreshingBridgeQuotes, setIsRefreshingBridgeQuotes] =
    useState(false);
  const [activeChainIndex, setActiveChainIndex] = useState(0);
  const [hasSwappedAnything, setHasSwappedAnything] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  // Snapshot of unit indexes currently in-flight (for batch mode tracking).
  const inFlightRef = useRef<number[]>([]);
  const activeIdRef = useRef<string | null>(null);
  const closingRef = useRef(false);
  const bridgeTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map()
  );
  const bridgeAbortRef = useRef<Map<number, AbortController>>(new Map());
  const bridgeStartedAtRef = useRef<Map<number, number>>(new Map());
  // Index pointer for sequential mode.
  const seqIdxRef = useRef<number>(0);
  const pendingStartChainIndexRef = useRef<number | null>(null);
  const retryStartChainIndexRef = useRef<number | null>(null);

  const totalUnits = plannedUnits.length;
  const hasBridgeUnits = plannedUnits.some((unit) => unit.kind === "bridge");
  const activeChainId = orderedChainIds[activeChainIndex];
  const activeChainUnitIdxs =
    activeChainId !== undefined ? (chainUnitIdxs.get(activeChainId) ?? []) : [];
  const activeChainName =
    activeChainId !== undefined
      ? (chainIdToChain[activeChainId]?.name ?? `Chain ${activeChainId}`)
      : undefined;
  const activeChainCallCount = activeChainUnitIdxs.reduce(
    (sum, idx) => sum + (plannedUnits[idx]?.callCount ?? 0),
    0
  );
  const needsChainSwitch =
    activeChainId !== undefined && connectedChainId !== activeChainId;

  const stopBridgePolling = useCallback((unitIdx?: number) => {
    const idxs =
      unitIdx === undefined
        ? Array.from(
            new Set([
              ...bridgeTimersRef.current.keys(),
              ...bridgeAbortRef.current.keys(),
              ...bridgeStartedAtRef.current.keys(),
            ])
          )
        : [unitIdx];
    for (const idx of idxs) {
      const timer = bridgeTimersRef.current.get(idx);
      if (timer) clearTimeout(timer);
      bridgeTimersRef.current.delete(idx);
      bridgeAbortRef.current.get(idx)?.abort();
      bridgeAbortRef.current.delete(idx);
      bridgeStartedAtRef.current.delete(idx);
    }
  }, []);

  const pollBridgeStatus = useCallback(
    (unitIdx: number, attempt = 0) => {
      const unit = plannedUnits[unitIdx];
      const quoteId = unit?.quote.bridgeRoute?.quoteId;
      if (!unit || !quoteId || closingRef.current) return;

      const startedAt = bridgeStartedAtRef.current.get(unitIdx) ?? Date.now();
      bridgeStartedAtRef.current.set(unitIdx, startedAt);
      const elapsed = Date.now() - startedAt;
      if (elapsed > bridgePollTimeoutMs(unit.quote)) {
        setRowStatus((curr) => {
          const next = new Map(curr);
          next.set(unitIdx, "failed");
          return next;
        });
        stopBridgePolling(unitIdx);
        return;
      }

      const controller = new AbortController();
      bridgeAbortRef.current.set(unitIdx, controller);

      fetchBridgeStatus({ requestHash: quoteId }, controller.signal)
        .then((res) => {
          bridgeAbortRef.current.delete(unitIdx);
          if (closingRef.current) return;
          const entry = res.result?.[0];
          if (entry) {
            setBridgeStatusByIdx((curr) => {
              const next = new Map(curr);
              next.set(unitIdx, entry);
              return next;
            });
          }

          const code = entry?.bungeeStatusCode;
          if (code !== undefined && TERMINAL_BRIDGE_STATUS_CODES.has(code)) {
            setRowStatus((curr) => {
              const next = new Map(curr);
              next.set(unitIdx, bridgeStatusToRowStatus(entry));
              return next;
            });
            stopBridgePolling(unitIdx);
            return;
          }

          const delay = Math.min(5_000 * 1.5 ** attempt, 30_000);
          const timer = setTimeout(
            () => pollBridgeStatus(unitIdx, attempt + 1),
            delay
          );
          bridgeTimersRef.current.set(unitIdx, timer);
        })
        .catch((err) => {
          bridgeAbortRef.current.delete(unitIdx);
          if (closingRef.current) return;
          if (err instanceof Error && err.name === "AbortError") return;
          const delay = Math.min(5_000 * 1.5 ** attempt, 30_000);
          const timer = setTimeout(
            () => pollBridgeStatus(unitIdx, attempt + 1),
            delay
          );
          bridgeTimersRef.current.set(unitIdx, timer);
        });
    },
    [plannedUnits, stopBridgePolling]
  );

  const startBridgePolling = useCallback(
    (unitIdx: number) => {
      setRowStatus((curr) => {
        const next = new Map(curr);
        next.set(unitIdx, "bridging");
        return next;
      });
      stopBridgePolling(unitIdx);
      bridgeStartedAtRef.current.set(unitIdx, Date.now());
      pollBridgeStatus(unitIdx, 0);
    },
    [pollBridgeStatus, stopBridgePolling]
  );

  useEffect(() => {
    return () => stopBridgePolling();
  }, [stopBridgePolling]);

  useEffect(() => {
    if (phase === "preview" || phase === "failed" || phase === "done") return;
    if (plannedUnits.length === 0) return;
    const allTerminal = plannedUnits.every((_, i) =>
      isTerminalRowStatus(rowStatus.get(i))
    );
    if (allTerminal) setPhase("done");
  }, [phase, plannedUnits, rowStatus]);

  const finishActiveChain = useCallback(() => {
    const nextIndex = activeChainIndex + 1;
    if (nextIndex < orderedChainIds.length) {
      const nextChainId = orderedChainIds[nextIndex];
      setActiveChainIndex(nextIndex);
      setPendingUnitIdxs(chainUnitIdxs.get(nextChainId) ?? []);
      setPhase("ready");
      return;
    }
    if (plannedUnits.some((unit) => unit.kind === "bridge")) {
      setPhase("awaiting");
    } else {
      setPhase("done");
    }
  }, [activeChainIndex, orderedChainIds, chainUnitIdxs, plannedUnits]);

  // -------- Batch hooks ----------------------------------------------------
  const {
    sendCallsAsync,
    data: sendCallsData,
    error: sendCallsError,
    reset: resetSendCalls,
  } = useSendCalls();
  const { data: waitData, error: waitError } = useWaitForCallsStatus({
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
      const sourceChainId = plannedUnits[slice[0]]?.sourceChainId;
      if (sourceChainId === undefined) {
        setPhase("done");
        return;
      }
      sendCallsAsync({ calls, chainId: sourceChainId, forceAtomic: true })
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
    [plannedUnits, sendCallsAsync, resetSendCalls]
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
      const bridgeIdxs = justDone.filter(
        (i) => plannedUnits[i]?.kind === "bridge"
      );
      setHasSwappedAnything(true);
      setRowStatus((curr) => {
        const next = new Map(curr);
        for (const i of justDone) {
          next.set(i, plannedUnits[i]?.kind === "bridge" ? "bridging" : "done");
        }
        return next;
      });
      const newHashes = receipts
        .map((r) => r.transactionHash)
        .filter((h): h is `0x${string}` => !!h);
      if (newHashes.length > 0) {
        const sourceHash = newHashes[0];
        setRowTxHashes((curr) => {
          const next = new Map(curr);
          for (const i of justDone) next.set(i, sourceHash);
          return next;
        });
      }
      for (const idx of bridgeIdxs) startBridgePolling(idx);
      const remaining = pendingUnitIdxs.filter((i) => !justDone.includes(i));
      setPendingUnitIdxs(remaining);
      inFlightRef.current = [];
      activeIdRef.current = null;
      if (remaining.length === 0) {
        finishActiveChain();
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
  }, [
    waitData,
    waitError,
    sendCallsData?.id,
    pendingUnitIdxs,
    submitBatch,
    chunkSize,
    plannedUnits,
    startBridgePolling,
    finishActiveChain,
  ]);

  // -------- Sequential submission flow ------------------------------------
  type SeqStep = {
    unitIdx: number;
    kind: "approve" | "swap" | "post";
    call: Call;
    chainId: number;
  };

  // Flatten units to a step list — each step is one wallet prompt.
  const seqStepsRef = useRef<SeqStep[]>([]);
  // Index of the step the sequential loop is currently driving.
  const [seqStepIdx, setSeqStepIdx] = useState<number>(0);

  const buildSeqSteps = useCallback(
    (fromIdxs: number[]): SeqStep[] => {
      const steps: SeqStep[] = [];
      for (const i of fromIdxs) {
        const u = plannedUnits[i];
        if (u.approve)
          steps.push({
            unitIdx: i,
            kind: "approve",
            call: u.approve,
            chainId: u.sourceChainId,
          });
        steps.push({
          unitIdx: i,
          kind: "swap",
          call: u.swap,
          chainId: u.sourceChainId,
        });
        if (u.postTransfer)
          steps.push({
            unitIdx: i,
            kind: "post",
            call: u.postTransfer,
            chainId: u.sourceChainId,
          });
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
        chainId: step.chainId,
      });
    },
    [sendTransaction, resetSeqSend]
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
      const isLastStepForUnit =
        seqIdxRef.current === seqStepsRef.current.length - 1 ||
        seqStepsRef.current[seqIdxRef.current + 1]?.unitIdx !== step.unitIdx;
      if (isLastStepForUnit) {
        setHasSwappedAnything(true);
        if (plannedUnits[step.unitIdx]?.kind === "bridge") {
          startBridgePolling(step.unitIdx);
        } else {
          setRowStatus((curr) => {
            const next = new Map(curr);
            next.set(step.unitIdx, "done");
            return next;
          });
        }
      }
      const nextStepIdx = seqIdxRef.current + 1;
      if (nextStepIdx >= seqStepsRef.current.length) {
        finishActiveChain();
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
    plannedUnits,
    startBridgePolling,
    finishActiveChain,
  ]);

  // -------- Confirm / retry / close --------------------------------------
  const refreshExpiringBridgeQuotes = useCallback(
    async (unitIdxs: number[], chainIndex: number): Promise<boolean> => {
      const expiringIdxs = unitIdxs.filter((idx) => {
        const unit = plannedUnits[idx];
        return unit?.kind === "bridge" && isBridgeQuoteExpiring(unit.quote);
      });
      if (expiringIdxs.length === 0) return false;

      setIsRefreshingBridgeQuotes(true);
      setErrorMsg(null);
      setPhase("ready");

      try {
        const refreshed = await Promise.all(
          expiringIdxs.map(async (idx) => {
            const quote = plannedUnits[idx].quote;
            if (quote.destinationChainId === undefined) {
              throw new Error(
                `Missing destination chain for ${quote.source.symbol}`
              );
            }
            const data = await fetchBridgeQuote({
              userAddress: taker,
              receiverAddress: recipient,
              originChainId: quote.source.chainId,
              destinationChainId: quote.destinationChainId,
              inputToken: quote.source.contractAddress,
              outputToken: targetToken.address,
              inputAmountWei: quote.sourceAmountWei,
              slippageBps,
            });
            const refreshedQuote = bridgeQuoteFromResponse(
              quote,
              data,
              targetToken
            );
            if (isBridgeQuoteExpiring(refreshedQuote)) {
              throw new Error(
                `Fresh ${quote.source.symbol} bridge quote expires too soon`
              );
            }
            return [idx, refreshedQuote] as const;
          })
        );

        if (closingRef.current) return true;

        setRuntimeQuotes((curr) => {
          const next = [...curr];
          for (const [idx, quote] of refreshed) next[idx] = quote;
          return next;
        });
        pendingStartChainIndexRef.current = chainIndex;
        retryStartChainIndexRef.current = null;
        return true;
      } catch (err) {
        if (closingRef.current) return true;
        retryStartChainIndexRef.current = chainIndex;
        const message =
          (err as any)?.shortMessage ||
          (err as Error)?.message ||
          "Unknown error";
        setErrorMsg(
          `Bridge quote expired and couldn't be refreshed: ${message}`
        );
        setPhase("failed");
        return true;
      } finally {
        if (!closingRef.current) setIsRefreshingBridgeQuotes(false);
      }
    },
    [plannedUnits, recipient, slippageBps, taker, targetToken]
  );

  const startChainAtIndex = useCallback(
    async (chainIndex: number) => {
      if (isRefreshingBridgeQuotes) return;
      const targetChainId = orderedChainIds[chainIndex];
      if (targetChainId === undefined) return;
      const unitIdxs = chainUnitIdxs.get(targetChainId) ?? [];
      if (unitIdxs.length === 0) {
        finishActiveChain();
        return;
      }
      setActiveChainIndex(chainIndex);
      setPendingUnitIdxs(unitIdxs);
      if (connectedChainId !== targetChainId) {
        setPhase("ready");
        return;
      }
      const didRefresh = await refreshExpiringBridgeQuotes(
        unitIdxs,
        chainIndex
      );
      if (didRefresh) return;

      const groupCallCount = unitIdxs.reduce(
        (sum, idx) => sum + (plannedUnits[idx]?.callCount ?? 0),
        0
      );
      if (supportsBatching) {
        const initialStrategy: "whole" | "chunked" =
          groupCallCount > MAX_BATCH_SIZE ? "chunked" : "whole";
        setTimeout(
          () =>
            submitBatch(
              initialStrategy,
              unitIdxs,
              initialStrategy === "whole" ? groupCallCount : MAX_BATCH_SIZE
            ),
          0
        );
      } else {
        startSequential(unitIdxs);
      }
    },
    [
      orderedChainIds,
      chainUnitIdxs,
      finishActiveChain,
      connectedChainId,
      refreshExpiringBridgeQuotes,
      isRefreshingBridgeQuotes,
      plannedUnits,
      supportsBatching,
      submitBatch,
      startSequential,
    ]
  );

  useEffect(() => {
    const chainIndex = pendingStartChainIndexRef.current;
    if (
      chainIndex === null ||
      isRefreshingBridgeQuotes ||
      isLoadingAllowances ||
      phase !== "ready"
    ) {
      return;
    }
    const targetChainId = orderedChainIds[chainIndex];
    if (targetChainId === undefined || connectedChainId !== targetChainId) {
      return;
    }
    pendingStartChainIndexRef.current = null;
    void startChainAtIndex(chainIndex);
  }, [
    connectedChainId,
    isLoadingAllowances,
    isRefreshingBridgeQuotes,
    orderedChainIds,
    phase,
    plannedUnits,
    startChainAtIndex,
  ]);

  const handleSwitchActiveChain = useCallback(async () => {
    if (activeChainId === undefined) return;
    setErrorMsg(null);
    try {
      await switchChainAsync({ chainId: activeChainId });
      setPhase("ready");
    } catch (err) {
      if (isUserRejection(err)) {
        setErrorMsg("You rejected the network switch in your wallet.");
      } else {
        setErrorMsg(
          (err as any)?.shortMessage ||
            (err as Error)?.message ||
            "Network switch failed"
        );
      }
      setPhase("failed");
    }
  }, [activeChainId, switchChainAsync]);

  const handleConfirm = useCallback(() => {
    if (plannedUnits.length === 0) return;
    const allIdxs = plannedUnits.map((_, i) => i);
    setRowStatus(new Map(allIdxs.map((i) => [i, "queued"] as const)));
    setActiveChainIndex(0);
    void startChainAtIndex(0);
  }, [plannedUnits, startChainAtIndex]);

  const handleRetry = useCallback(() => {
    setErrorMsg(null);
    const retryChainIndex = retryStartChainIndexRef.current;
    if (retryChainIndex !== null) {
      retryStartChainIndexRef.current = null;
      void startChainAtIndex(retryChainIndex);
      return;
    }
    if (needsChainSwitch) {
      handleSwitchActiveChain();
      return;
    }
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
  }, [
    needsChainSwitch,
    handleSwitchActiveChain,
    startChainAtIndex,
    strategy,
    fireSeqStep,
    submitBatch,
    pendingUnitIdxs,
    chunkSize,
  ]);

  const handleSwitchToSequential = useCallback(() => {
    setErrorMsg(null);
    startSequential(
      pendingUnitIdxs.length > 0 ? pendingUnitIdxs : activeChainUnitIdxs
    );
  }, [pendingUnitIdxs, activeChainUnitIdxs, startSequential]);

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
    stopBridgePolling();
    onClose(hasSwappedAnything);
  }, [
    hasSwappedAnything,
    onClose,
    resetSendCalls,
    resetSeqSend,
    stopBridgePolling,
  ]);

  // -------- Render --------------------------------------------------------
  const completedCount = plannedUnits.filter((_, i) =>
    isTerminalRowStatus(rowStatus.get(i))
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
                  ? hasBridgeUnits
                    ? "Conversion complete"
                    : "Swap complete"
                  : phase === "preview"
                    ? `${hasBridgeUnits ? "Bridge" : "Swap"} into ${
                        targetToken.symbol
                      }`
                    : phase === "ready"
                      ? `Ready on ${activeChainName ?? "next chain"}`
                      : `${hasBridgeUnits ? "Converting" : "Swapping"} into ${
                          targetToken.symbol
                        }`}
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
                bridgeStatusByIdx={bridgeStatusByIdx}
                targetToken={targetToken}
                rowTxHashes={rowTxHashes}
              />
            ) : (
              <VStack spacing={4} align="stretch">
                {/* Summary strip */}
                <SummaryStrip
                  totals={totals}
                  targetToken={targetToken}
                  slippageBps={slippageBps}
                />

                <ChainBroadcastQueue
                  orderedChainIds={orderedChainIds}
                  chainUnitIdxs={chainUnitIdxs}
                  plannedUnits={plannedUnits}
                  rowStatus={rowStatus}
                  activeChainId={activeChainId}
                  connectedChainId={connectedChainId}
                  phase={phase}
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
                      isIndeterminate={
                        phase === "awaiting" || phase === "sending"
                      }
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
                    ROUTE STATUS · {plannedUnits.length}{" "}
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
                      chainId={u.sourceChainId}
                      bridgeStatus={bridgeStatusByIdx.get(i)}
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
                    isDisabled={
                      isLoadingAllowances || plannedUnits.length === 0
                    }
                  >
                    {hasBridgeUnits ? "Confirm bridge" : "Confirm swap"}
                  </Button>
                </HStack>
              </HStack>
            ) : phase === "ready" ? (
              <HStack spacing={2} w="full" justify="space-between">
                <VStack spacing={0} align="flex-start">
                  <Text fontSize="xs" color="whiteAlpha.700">
                    Next source chain
                  </Text>
                  <Text fontSize="sm" color="white" fontWeight="600">
                    {activeChainName} · {activeChainCallCount} call
                    {activeChainCallCount === 1 ? "" : "s"}
                  </Text>
                </VStack>
                <HStack spacing={2}>
                  <Button
                    variant="ghost"
                    color="whiteAlpha.700"
                    _hover={{ bg: "whiteAlpha.100" }}
                    onClick={handleRequestClose}
                  >
                    Cancel
                  </Button>
                  {needsChainSwitch ? (
                    <Button
                      bg="primary.500"
                      color="white"
                      _hover={{ bg: "primary.600" }}
                      onClick={handleSwitchActiveChain}
                      isLoading={isSwitchingChain}
                      loadingText="Switching…"
                    >
                      Switch to {activeChainName}
                    </Button>
                  ) : (
                    <Button
                      bg="primary.500"
                      color="white"
                      _hover={{ bg: "primary.600" }}
                      rightIcon={<ChevronRight size={14} />}
                      onClick={() => void startChainAtIndex(activeChainIndex)}
                      isLoading={isRefreshingBridgeQuotes}
                      loadingText="Refreshing…"
                    >
                      Send {activeChainName}
                    </Button>
                  )}
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
                    ? hasBridgeUnits
                      ? "Waiting for destination delivery…"
                      : "Waiting for on-chain confirmation…"
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
            <AlertDialogHeader>
              Stop the {hasBridgeUnits ? "conversion" : "swap"}?
            </AlertDialogHeader>
            <AlertDialogBody>
              {completedCount > 0
                ? `${completedCount} of ${totalUnits} ${
                    hasBridgeUnits ? "conversions" : "swaps"
                  } have already gone through. The remaining ${
                    hasBridgeUnits ? "conversions" : "swaps"
                  } won't be sent.`
                : `No ${
                    hasBridgeUnits ? "conversions" : "swaps"
                  } have gone through yet. If you've already confirmed in your wallet, the batch may still land.`}
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

function isSourceBroadcastComplete(status: RowStatus | undefined): boolean {
  return (
    status === "done" ||
    status === "bridging" ||
    status === "failed" ||
    status === "refunded"
  );
}

function ChainBroadcastQueue({
  orderedChainIds,
  chainUnitIdxs,
  plannedUnits,
  rowStatus,
  activeChainId,
  connectedChainId,
  phase,
}: {
  orderedChainIds: number[];
  chainUnitIdxs: Map<number, number[]>;
  plannedUnits: PlannedUnit[];
  rowStatus: Map<number, RowStatus>;
  activeChainId?: number;
  connectedChainId?: number;
  phase: Phase;
}) {
  if (orderedChainIds.length <= 1 && phase === "preview") return null;

  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="md"
      p={3}
    >
      <HStack justify="space-between" mb={2}>
        <Text fontSize="2xs" color="whiteAlpha.700" letterSpacing="wider">
          BROADCAST STEPS
        </Text>
        <Text fontSize="2xs" color="whiteAlpha.600">
          {orderedChainIds.length} source chain
          {orderedChainIds.length === 1 ? "" : "s"}
        </Text>
      </HStack>
      <VStack spacing={1.5} align="stretch">
        {orderedChainIds.map((sourceChainId, idx) => {
          const unitIdxs = chainUnitIdxs.get(sourceChainId) ?? [];
          const chainName =
            chainIdToChain[sourceChainId]?.name ?? `Chain ${sourceChainId}`;
          const isActive =
            sourceChainId === activeChainId &&
            phase !== "preview" &&
            phase !== "done";
          const sourceDone =
            unitIdxs.length > 0 &&
            unitIdxs.every((unitIdx) =>
              isSourceBroadcastComplete(rowStatus.get(unitIdx))
            );
          const callCount = unitIdxs.reduce(
            (sum, unitIdx) => sum + (plannedUnits[unitIdx]?.callCount ?? 0),
            0
          );
          const needsSwitch =
            isActive &&
            connectedChainId !== undefined &&
            connectedChainId !== sourceChainId;
          const statusLabel = sourceDone
            ? "sent"
            : isActive
              ? needsSwitch
                ? "switch"
                : "active"
              : phase === "preview"
                ? "preview"
                : "queued";
          return (
            <HStack
              key={sourceChainId}
              spacing={2.5}
              px={2.5}
              py={2}
              borderRadius="sm"
              bg={
                sourceDone
                  ? "rgba(74,222,128,0.06)"
                  : isActive
                    ? "rgba(59,130,246,0.10)"
                    : "whiteAlpha.50"
              }
              border="1px solid"
              borderColor={
                sourceDone
                  ? "rgba(74,222,128,0.24)"
                  : isActive
                    ? "rgba(59,130,246,0.35)"
                    : "whiteAlpha.100"
              }
            >
              <Text
                fontSize="2xs"
                color="whiteAlpha.500"
                fontFamily="mono"
                w="18px"
              >
                {idx + 1}
              </Text>
              <VStack spacing={0} align="flex-start" flex={1} minW={0}>
                <Text
                  fontSize="xs"
                  color="white"
                  fontWeight="600"
                  noOfLines={1}
                >
                  {chainName}
                </Text>
                <Text fontSize="2xs" color="whiteAlpha.600">
                  {unitIdxs.length} route{unitIdxs.length === 1 ? "" : "s"} ·{" "}
                  {callCount} call{callCount === 1 ? "" : "s"}
                </Text>
              </VStack>
              <Text
                fontSize="2xs"
                color={
                  sourceDone
                    ? "#4ADE80"
                    : isActive
                      ? "primary.300"
                      : "whiteAlpha.500"
                }
                fontWeight="700"
                letterSpacing="wider"
                textTransform="uppercase"
              >
                {statusLabel}
              </Text>
            </HStack>
          );
        })}
      </VStack>
    </Box>
  );
}

function UnitCard({
  unit,
  status,
  txHash,
  targetToken,
  chainId,
  bridgeStatus,
  isLoadingAllowances,
  phase,
}: {
  unit: PlannedUnit;
  status?: RowStatus;
  txHash?: Hex;
  targetToken: TargetTokenEntry;
  chainId: number;
  bridgeStatus?: BridgeStatusEntry;
  isLoadingAllowances: boolean;
  phase: Phase;
}) {
  const explorerBase =
    chainIdToChain[chainId]?.blockExplorers?.default.url ?? null;
  const destinationChainId = unit.quote.destinationChainId;
  const destinationExplorerBase =
    destinationChainId !== undefined
      ? (chainIdToChain[destinationChainId]?.blockExplorers?.default.url ??
        null)
      : null;
  const destinationTxHash = bridgeStatus?.destinationData?.txHash;
  const refundTxHash = bridgeStatus?.refund?.txHash;
  const src = unit.quote.source;
  const srcAmt = fmtAmount(unit.quote.sourceAmountWei, src.decimals);
  const dstAmt = fmtAmount(unit.quote.targetAmountWei, targetToken.decimals);
  const dstUsd = formatUsdCompact(unit.quote.targetUsd);

  const chips: {
    label: string;
    tone: "yellow" | "blue" | "green" | "neutral";
  }[] = [];
  if (unit.kind === "bridge") {
    if (unit.approve) chips.push({ label: "APPROVE + BRIDGE", tone: "yellow" });
    else if (!unit.classification.nativeSource && unit.allowanceCovered)
      chips.push({ label: "ALREADY APPROVED", tone: "green" });
    else chips.push({ label: "BRIDGE", tone: "blue" });
  } else if (unit.classification.wrap)
    chips.push({ label: "WRAP", tone: "blue" });
  else if (unit.classification.unwrap)
    chips.push({ label: "UNWRAP", tone: "blue" });
  else if (unit.approve)
    chips.push({ label: "APPROVE + SWAP", tone: "yellow" });
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
              {unit.quote.destinationChainName && (
                <Text fontSize="2xs" color="whiteAlpha.500" noOfLines={1}>
                  on {unit.quote.destinationChainName}
                </Text>
              )}
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
              <Text>
                {txHash.slice(0, 6)}…{txHash.slice(-4)}
              </Text>
              <ExternalLink size={10} />
            </HStack>
          )}
          {destinationTxHash && destinationExplorerBase && (
            <HStack
              as="a"
              href={`${destinationExplorerBase}/tx/${destinationTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              spacing={1}
              color="#4ADE80"
              _hover={{ color: "#86EFAC" }}
              fontSize="2xs"
              fontFamily="mono"
            >
              <Text>
                dest {destinationTxHash.slice(0, 6)}…
                {destinationTxHash.slice(-4)}
              </Text>
              <ExternalLink size={10} />
            </HStack>
          )}
          {refundTxHash && explorerBase && (
            <HStack
              as="a"
              href={`${explorerBase}/tx/${refundTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              spacing={1}
              color="#FBBF24"
              _hover={{ color: "#FCD34D" }}
              fontSize="2xs"
              fontFamily="mono"
            >
              <Text>
                refund {refundTxHash.slice(0, 6)}…{refundTxHash.slice(-4)}
              </Text>
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
    case "bridging":
      return (
        <HStack spacing={1}>
          <Spinner size="xs" color="primary.400" speed="0.6s" />
          <Text fontSize="2xs" color="primary.400" letterSpacing="wider">
            BRIDGING
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
    case "refunded":
      return (
        <HStack spacing={1}>
          <AlertTriangle size={11} color="#FBBF24" />
          <Text fontSize="2xs" color="#FBBF24" letterSpacing="wider">
            REFUNDED
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
  bridgeStatusByIdx,
  targetToken,
  rowTxHashes,
}: {
  plannedUnits: PlannedUnit[];
  rowStatus: Map<number, RowStatus>;
  bridgeStatusByIdx: Map<number, BridgeStatusEntry>;
  targetToken: TargetTokenEntry;
  rowTxHashes: Map<number, Hex>;
}) {
  const hasBridgeUnits = plannedUnits.some((unit) => unit.kind === "bridge");
  const successfulUnits = plannedUnits.filter(
    (_, i) => rowStatus.get(i) === "done"
  );
  const refundedCount = plannedUnits.filter(
    (_, i) => rowStatus.get(i) === "refunded"
  ).length;
  const failedCount = plannedUnits.filter(
    (_, i) => rowStatus.get(i) === "failed"
  ).length;
  const destinationLinks = plannedUnits.flatMap((unit, idx) => {
    if (unit.kind !== "bridge") return [];
    const entry = bridgeStatusByIdx.get(idx);
    const hash = entry?.destinationData?.txHash;
    const destChainId =
      entry?.destinationData?.destinationChainId ??
      unit.quote.destinationChainId;
    const base =
      destChainId !== undefined
        ? chainIdToChain[destChainId]?.blockExplorers?.default.url
        : undefined;
    if (!hash || !base) return [];
    return [
      { hash, url: `${base}/tx/${hash}`, symbol: unit.quote.source.symbol },
    ];
  });
  const sourceLinks = Array.from(
    plannedUnits.reduce((map, unit, idx) => {
      const hash = rowTxHashes.get(idx);
      const base =
        chainIdToChain[unit.sourceChainId]?.blockExplorers?.default.url;
      if (hash && base) {
        map.set(`${unit.sourceChainId}:${hash}`, {
          hash,
          url: `${base}/tx/${hash}`,
          chainName:
            chainIdToChain[unit.sourceChainId]?.name ??
            `Chain ${unit.sourceChainId}`,
        });
      }
      return map;
    }, new Map<string, { hash: Hex; url: string; chainName: string }>())
  ).map(([, value]) => value);
  const totals = useMemo(
    () =>
      sumQuotes(
        successfulUnits.map((u) => u.quote),
        targetToken.decimals
      ),
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
            {hasBridgeUnits ? "Converted" : "Swapped"} {successfulUnits.length}{" "}
            {successfulUnits.length === 1 ? "token" : "tokens"} into{" "}
            {targetToken.symbol}
          </Text>
          {hasBridgeUnits && (refundedCount > 0 || failedCount > 0) && (
            <Text fontSize="sm" color="whiteAlpha.700">
              {refundedCount > 0 ? `${refundedCount} refunded` : ""}
              {refundedCount > 0 && failedCount > 0 ? " · " : ""}
              {failedCount > 0 ? `${failedCount} failed` : ""}
            </Text>
          )}
          {totals.totalUsd > 0 && (
            <Text fontSize="sm" color="whiteAlpha.700">
              ≈ {formatUsd(totals.totalUsd)} ·{" "}
              {fmtAmount(totals.totalTargetWei, targetToken.decimals)}{" "}
              {targetToken.symbol}
            </Text>
          )}
        </VStack>
      </VStack>

      {sourceLinks.length > 0 && (
        <VStack spacing={1.5} align="stretch">
          <Text
            fontSize="xs"
            color="whiteAlpha.600"
            letterSpacing="wider"
            textTransform="uppercase"
          >
            {sourceLinks.length === 1
              ? "Transaction"
              : `${sourceLinks.length} transactions`}
          </Text>
          <HStack spacing={2} flexWrap="wrap">
            {sourceLinks.map((link, idx) => (
              <Button
                key={`${link.chainName}:${link.hash}`}
                as="a"
                href={link.url}
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
                {sourceLinks.length > 1 ? `${link.chainName} · ` : ""}
                {link.hash.slice(0, 6)}…{link.hash.slice(-4)}
              </Button>
            ))}
          </HStack>
        </VStack>
      )}

      {destinationLinks.length > 0 && (
        <VStack spacing={1.5} align="stretch">
          <Text
            fontSize="xs"
            color="whiteAlpha.600"
            letterSpacing="wider"
            textTransform="uppercase"
          >
            Destination
          </Text>
          <HStack spacing={2} flexWrap="wrap">
            {destinationLinks.map((link, idx) => (
              <Button
                key={`${link.hash}:${idx}`}
                as="a"
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                size="xs"
                variant="outline"
                borderColor="rgba(74,222,128,0.40)"
                color="#4ADE80"
                _hover={{ bg: "rgba(74,222,128,0.10)" }}
                rightIcon={<ExternalLink size={12} />}
                fontFamily="mono"
              >
                {link.symbol.toUpperCase()} {link.hash.slice(0, 6)}…
                {link.hash.slice(-4)}
              </Button>
            ))}
          </HStack>
        </VStack>
      )}
    </VStack>
  );
}
