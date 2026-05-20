"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Flex,
  Grid,
  GridItem,
  Heading,
  Text,
  VStack,
  Alert,
  AlertIcon,
  HStack,
  Skeleton,
  SkeletonCircle,
  SimpleGrid,
} from "@chakra-ui/react";
import {
  useAccount,
  useChainId,
  useGasPrice,
  useSwitchChain,
} from "wagmi";
import { Address, formatUnits, isAddress } from "viem";
import { usePortfolio } from "./hooks/usePortfolio";
import { useBatchSupport } from "./hooks/useBatchSupport";
import {
  useMigrateExecution,
  PreparedTransfer,
} from "./hooks/useMigrateExecution";
import { ConnectButton } from "@/components/ConnectButton/ConnectButton";
import { Layout } from "@/components/Layout";
import TabsSelector from "@/components/Tabs/TabsSelector";
import { PortfolioSidebar } from "./components/PortfolioSidebar";
import { TokenTable } from "./components/TokenTable";
import { ReceiverPanel } from "./components/ReceiverPanel";
import { SwapTargetPanel } from "./components/SwapTargetPanel";
import { SwapExecutionModal } from "./components/SwapExecutionModal";
import { BatchProgressModal } from "./components/BatchProgressModal";
import { SequentialProgressModal } from "./components/SequentialProgressModal";
import { chainIdToChain } from "@/data/common";
import { PortfolioToken, tokenKey } from "./lib/portfolioApi";
import { resolveTransferAmountWei } from "./lib/buildTransferCall";
import { applyLiveBalance } from "./lib/onchainBalances";
import { useLiveBalances } from "./hooks/useLiveBalances";
import {
  SwapQuote,
  TargetTokenEntry,
  getTargetTokensForChain,
} from "./lib/swapTypes";
import { useSwapTokenList } from "./hooks/useSwapTokenList";
import { useSwapQuotes, QuoteRequest } from "./hooks/useSwapQuotes";
import { detectWrapUnwrap } from "./lib/wrapUnwrap";
import { NATIVE_TOKEN_ADDRESS_0X } from "./lib/swapQuoteApi";
import { SelectionMap } from "./types";

type MigrateTab = "send" | "swap";
const TAB_LABELS = ["Send", "Swap"];

const DUST_THRESHOLD_USD = 0.1;

function scrollChainIntoView(chainId: number) {
  const el = document.getElementById(`migrate-chain-${chainId}`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function MigratePage() {
  // Wagmi's connected state isn't available during SSR — gate the dynamic UI
  // behind a mounted flag so server and client render the same initial tree.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { address, isConnected } = useAccount();
  const currentChainId = useChainId();
  const { switchChainAsync, isPending: isSwitchingChain, variables } =
    useSwitchChain();
  const switchingToChainId = isSwitchingChain
    ? (variables?.chainId as number | undefined)
    : undefined;

  const {
    tokens: portfolioTokens,
    chainGroups,
    totalValueUsd,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = usePortfolio(address);

  const { supports: supportsBatching } = useBatchSupport(currentChainId);

  // Live gas price for the current chain, used to size the native gas reserve
  // when the user sweeps the full native balance. Refreshes every 20s so
  // long-lived sessions still reflect current network conditions.
  const { data: gasPriceWei } = useGasPrice({
    chainId: currentChainId,
    query: {
      enabled: currentChainId !== undefined,
      refetchInterval: 20_000,
    },
  });

  const [selection, setSelection] = useState<SelectionMap>(new Map());
  const [receiver, setReceiver] = useState<string>("");
  const [activeTab, setActiveTab] = useState<MigrateTab>("send");
  const [targetToken, setTargetToken] = useState<TargetTokenEntry | null>(null);
  const [slippageBps, setSlippageBps] = useState<number>(300); // 3% default
  const [isSwapPreviewOpen, setIsSwapPreviewOpen] = useState(false);
  // Empty string ↔ "send the bought tokens to the connected wallet" (the
  // 0x default). A non-empty *valid* address overrides via the `recipient`
  // query param all the way through to 0x.
  const [swapRecipient, setSwapRecipient] = useState<string>("");
  // Per-chain "show dust" toggle. Default off → tokens with valueUsd < $0.10
  // are hidden from the chain group, excluded from select-all, and excluded
  // from the migration plan.
  const [showDustByChain, setShowDustByChain] = useState<Map<number, boolean>>(
    new Map()
  );

  const setShowDustForChain = useCallback(
    (chainId: number, value: boolean) => {
      setShowDustByChain((curr) => {
        const next = new Map(curr);
        next.set(chainId, value);
        return next;
      });
    },
    []
  );

  // Pre-live chain groups filtered by the per-chain dust toggle. These define
  // which tokens are *visible* — and therefore which ones get a live on-chain
  // balance refresh below. Hidden (dust-filtered) tokens are deliberately
  // skipped to keep the multicall cheap; they wouldn't migrate anyway.
  const visibleChainGroups = useMemo(() => {
    return chainGroups
      .map((g) => {
        const showDust = showDustByChain.get(g.chainId) ?? false;
        const tokens = showDust
          ? g.tokens
          : g.tokens.filter((t) => t.valueUsd >= DUST_THRESHOLD_USD);
        return { ...g, tokens };
      })
      .filter((g) => g.tokens.length > 0);
  }, [chainGroups, showDustByChain]);

  // Flat list of visible tokens fed to the multicall pass. Identity changes
  // when chainGroups or the dust toggles change; `useLiveBalances` dedups
  // per-token internally so this is cheap.
  const visibleTokens = useMemo(
    () => visibleChainGroups.flatMap((g) => g.tokens),
    [visibleChainGroups]
  );

  // Bumping this version invalidates the per-token dedup cache inside
  // `useLiveBalances`, forcing a fresh multicall for every visible token.
  // We bump on user-triggered reload and after a successful migration so
  // both refresh paths re-read on-chain (not just the portfolio API).
  const [liveBalancesVersion, setLiveBalancesVersion] = useState(0);
  const invalidateLiveBalances = useCallback(
    () => setLiveBalancesVersion((v) => v + 1),
    []
  );

  // Refresh balances on-chain (one multicall per chain). The portfolio API
  // can lag a few minutes; this pass overlays the freshest values so the
  // table and prepared transfers always reflect what we'll actually send.
  const { liveMap } = useLiveBalances(
    address,
    visibleTokens,
    liveBalancesVersion
  );

  // Re-derive the chain groups with live-balance overlays applied. Tokens
  // without a live result keep their API values verbatim. Per-chain totals
  // are recomputed from the (possibly updated) per-token valueUsd.
  //
  // Tokens whose on-chain balance came back as 0 are dropped entirely so the
  // table doesn't show "ghost" rows (e.g. after a sweep, or for tokens the
  // portfolio API still reports stale). We only drop when there IS a live
  // result — tokens still awaiting their multicall keep their API row.
  const displayedChainGroups = useMemo(() => {
    if (liveMap.size === 0) return visibleChainGroups;
    return visibleChainGroups
      .map((g) => {
        const tokens = g.tokens
          .map((t) => applyLiveBalance(t, liveMap))
          .filter((t) => {
            const live = liveMap.get(tokenKey(t));
            if (!live) return true;
            try {
              return BigInt(live.balanceRawString) > 0n;
            } catch {
              return true;
            }
          });
        const totalValueUsd = tokens.reduce((s, t) => s + t.valueUsd, 0);
        return { ...g, tokens, totalValueUsd };
      })
      .filter((g) => g.tokens.length > 0);
  }, [visibleChainGroups, liveMap]);

  // Total USD across all chains, recomputed against live values when present.
  const liveTotalValueUsd = useMemo(() => {
    if (liveMap.size === 0) return totalValueUsd;
    return displayedChainGroups.reduce((s, g) => s + g.totalValueUsd, 0);
  }, [liveMap.size, totalValueUsd, displayedChainGroups]);

  // How many dust tokens exist per chain (used both to gate the toggle UI and
  // to surface a "N hidden" hint underneath it).
  const dustCountByChain = useMemo(() => {
    const m = new Map<number, number>();
    for (const g of chainGroups) {
      m.set(
        g.chainId,
        g.tokens.reduce(
          (n, t) => (t.valueUsd < DUST_THRESHOLD_USD ? n + 1 : n),
          0
        )
      );
    }
    return m;
  }, [chainGroups]);

  const execution = useMigrateExecution();

  // Wipe selection when wallet changes — stale selections from a different
  // owner make no sense.
  useEffect(() => {
    setSelection(new Map());
  }, [address]);

  const toggle = useCallback((key: string) => {
    setSelection((curr) => {
      const next = new Map(curr);
      const existing = next.get(key);
      if (existing?.selected) {
        // Preserve any custom override but flip selected off.
        next.set(key, { ...existing, selected: false });
      } else {
        next.set(key, {
          selected: true,
          amountOverrideWei: existing?.amountOverrideWei,
        });
      }
      return next;
    });
  }, []);

  const setAmountOverride = useCallback(
    (key: string, wei: bigint | undefined) => {
      setSelection((curr) => {
        const next = new Map(curr);
        const existing = next.get(key);
        next.set(key, {
          selected: existing?.selected ?? true,
          amountOverrideWei: wei,
        });
        return next;
      });
    },
    []
  );

  const selectAll = useCallback(
    (chainId: number, value: boolean) => {
      const group = displayedChainGroups.find((g) => g.chainId === chainId);
      if (!group) return;
      setSelection((curr) => {
        const next = new Map(curr);
        for (const t of group.tokens) {
          const k = tokenKey(t);
          const existing = next.get(k);
          next.set(k, {
            selected: value,
            amountOverrideWei: existing?.amountOverrideWei,
          });
        }
        return next;
      });
    },
    [displayedChainGroups]
  );

  const handleSwitchChain = useCallback(
    async (chainId: number) => {
      try {
        await switchChainAsync({ chainId });
        // After the switch, the now-current group jumps to top. Bring it back
        // into view (the user clicked from somewhere in the middle).
        setTimeout(() => scrollChainIntoView(chainId), 100);
      } catch {
        // user likely rejected — no-op
      }
    },
    [switchChainAsync]
  );

  const handleChainTileClick = useCallback((chainId: number) => {
    scrollChainIntoView(chainId);
  }, []);

  const handleReload = useCallback(() => {
    refetch();
    invalidateLiveBalances();
  }, [refetch, invalidateLiveBalances]);

  // Selected tokens on the *current* chain — the only ones we can actually
  // transact on right now. Sourced from displayed (filtered) groups so hidden
  // $0 tokens never sneak into the migration.
  const selectedOnCurrentChain = useMemo<PortfolioToken[]>(() => {
    if (currentChainId === undefined) return [];
    const group = displayedChainGroups.find((g) => g.chainId === currentChainId);
    if (!group) return [];
    return group.tokens.filter(
      (t) => selection.get(tokenKey(t))?.selected
    );
  }, [displayedChainGroups, currentChainId, selection]);

  // Prepared transfers (with resolved amounts) for the current chain. The
  // native gas reserve scales with both the batch size and (when known) the
  // current gas price, so larger sweeps and busier networks leave more behind.
  const preparedTransfers = useMemo<PreparedTransfer[]>(() => {
    const batchCount = selectedOnCurrentChain.length;
    return selectedOnCurrentChain
      .map((token) => {
        const override = selection.get(tokenKey(token))?.amountOverrideWei;
        const amountWei = resolveTransferAmountWei(
          token,
          override,
          batchCount,
          gasPriceWei
        );
        return { token, amountWei };
      })
      .filter((t) => t.amountWei > 0n);
  }, [selectedOnCurrentChain, selection, gasPriceWei]);

  // Only fetch the live token list when the Swap tab is actually visible.
  // Avoids a needless round-trip for users who only ever use Send.
  const {
    tokens: liveTokenList,
    isLoading: isLoadingTokenList,
  } = useSwapTokenList(activeTab === "swap" ? currentChainId : undefined);

  // Swap target token lists per current chain. The base set comes from the
  // hardcoded `POPULAR_TARGETS_BY_CHAIN`; we then prefer USDT over WETH
  // whenever the live token list has a real USDT entry (most users care
  // more about a stablecoin chip than a wrapped-native chip — Mainnet and
  // Arbitrum already have both, this catches Base / Optimism / Polygon).
  const popularTargets = useMemo<TargetTokenEntry[]>(() => {
    if (!currentChainId) return [];
    const base = getTargetTokensForChain(currentChainId);
    const hasUsdt = base.some((t) => t.symbol.toUpperCase() === "USDT");
    if (hasUsdt) return base;
    const liveUsdt = liveTokenList.find(
      (t) => t.symbol.toUpperCase() === "USDT"
    );
    if (!liveUsdt) return base;
    const wethIndex = base.findIndex(
      (t) => t.symbol.toUpperCase() === "WETH"
    );
    // Inherit WETH's popularRank so chip ordering stays stable; if there's
    // no WETH at all (unusual), tack USDT on at the end.
    if (wethIndex >= 0) {
      const next = [...base];
      next[wethIndex] = { ...liveUsdt, popularRank: base[wethIndex].popularRank };
      return next;
    }
    return [...base, liveUsdt];
  }, [currentChainId, liveTokenList]);

  // Rest list: live token list minus addresses already in `popularTargets`
  // (the picker promotes those to chips and would otherwise show them twice).
  // Empty while the live fetch is in flight — the dropdown shows a "loading"
  // hint in that state via `isLoadingTargetList`.
  const restTargets = useMemo<TargetTokenEntry[]>(() => {
    if (currentChainId === undefined) return [];
    if (liveTokenList.length === 0) return [];
    const popularAddrs = new Set(
      popularTargets.map((t) => t.address.toLowerCase())
    );
    return liveTokenList.filter(
      (t) => !popularAddrs.has(t.address.toLowerCase())
    );
  }, [currentChainId, liveTokenList, popularTargets]);

  useEffect(() => {
    setTargetToken(null);
  }, [currentChainId]);

  const currentChainName = useMemo(() => {
    if (currentChainId === undefined) return undefined;
    return chainIdToChain[currentChainId]?.name;
  }, [currentChainId]);

  // Source rows that *could* be quoted — i.e. selected on the current chain,
  // with a non-zero send amount, and whose address isn't the chosen target.
  // The live quote hook is keyed on this list; identity changes drive refetch.
  const quoteRequests = useMemo<QuoteRequest[]>(() => {
    if (activeTab !== "swap" || !targetToken) return [];
    const targetAddrLower = targetToken.address.toLowerCase();
    return preparedTransfers
      .filter((t) => {
        const sourceAddr =
          t.token.contractAddress === "native"
            ? "native"
            : t.token.contractAddress.toLowerCase();
        return sourceAddr !== targetAddrLower;
      })
      .map((t) => ({ source: t.token, sourceAmountWei: t.amountWei }));
  }, [activeTab, targetToken, preparedTransfers]);

  // Only pass `recipient` to the quote API once it's a valid address —
  // half-typed values would just make every request fail with a 400.
  const validSwapRecipient = useMemo(() => {
    const trimmed = swapRecipient.trim();
    return isAddress(trimmed) ? trimmed : undefined;
  }, [swapRecipient]);

  const liveQuotes = useSwapQuotes({
    chainId: currentChainId,
    taker: address,
    buyToken: targetToken?.address,
    requests: quoteRequests,
    slippageBps,
    recipient: validSwapRecipient,
    enabled:
      activeTab === "swap" &&
      !!targetToken &&
      !!address &&
      quoteRequests.length > 0,
  });

  // Target USD price: look in the user's portfolio first — both an exact
  // (chainId, address) match on the current chain (most accurate) and a
  // symbol-wide fallback for cross-chain stables. Falls back to undefined if
  // we have nothing; the row USD is then derived from the source-side value
  // (assumes the swap roughly conserves dollars, which is true for sane DEX
  // routes). Saves us a separate CoinGecko round-trip when the user already
  // holds the target somewhere.
  const targetPriceUsd = useMemo<number | undefined>(() => {
    if (!targetToken) return undefined;
    const targetAddrLower = targetToken.address.toLowerCase();
    const targetSymbol = targetToken.symbol.toUpperCase();
    let symbolFallback: number | undefined;
    for (const t of portfolioTokens) {
      const tAddr =
        t.contractAddress === "native"
          ? "native"
          : t.contractAddress.toLowerCase();
      const tSym = t.symbol.toUpperCase();
      if (
        t.chainId === currentChainId &&
        tAddr === targetAddrLower &&
        t.priceUsd > 0
      ) {
        return t.priceUsd;
      }
      if (
        symbolFallback === undefined &&
        tSym === targetSymbol &&
        t.priceUsd > 0
      ) {
        symbolFallback = t.priceUsd;
      }
    }
    return symbolFallback;
  }, [targetToken, currentChainId, portfolioTokens]);

  // Marry live quote responses with the target USD price to produce the
  // SwapQuote shape consumed by the panel + modal. Always emits one row per
  // request — pending rows carry `isPending`, failed rows carry
  // `errorMessage` — so adding a new token doesn't blank out the existing
  // settled rows while only the new one is in flight.
  const swapQuotes = useMemo<SwapQuote[]>(() => {
    if (activeTab !== "swap" || !targetToken) return [];
    return liveQuotes.results.map((r) => {
      const isNativeSource = r.request.source.contractAddress === "native";
      // Wrap/unwrap rows execute against the wrapped-native contract
      // directly (deposit{value:} / withdraw) — neither path needs an
      // ERC-20 approve. Detect here so chunk packing in the modal counts
      // these as single-call units.
      const wrapDirection =
        currentChainId !== undefined && targetToken
          ? detectWrapUnwrap(
              currentChainId,
              isNativeSource ? "native" : r.request.source.contractAddress,
              targetToken.address
            )
          : null;
      const needsApprove = !isNativeSource && !wrapDirection;
      const base = {
        source: r.request.source,
        sourceAmountWei: r.request.sourceAmountWei,
        needsApprove,
      };
      if (r.data && !r.isError) {
        const buyAmountWei = (() => {
          try {
            return BigInt(r.data!.buyAmount);
          } catch {
            return 0n;
          }
        })();
        const buyAmountFloat = Number(
          formatUnits(buyAmountWei, targetToken.decimals)
        );
        const sourceFloat = Number(
          formatUnits(r.request.sourceAmountWei, r.request.source.decimals)
        );
        const sourceUsd = sourceFloat * r.request.source.priceUsd;
        // Prefer target-side USD if we have a price; otherwise source-side
        // value is the best honest estimate (DEX routes ≈ price-conserving).
        const targetUsd =
          targetPriceUsd !== undefined && buyAmountFloat > 0
            ? buyAmountFloat * targetPriceUsd
            : sourceUsd;

        // Integrator fee → USD. Walletchan's response carries either the
        // singular `integratorFee` (current shape) or an `integratorFees`
        // array. We price the fee token using whichever side of the swap
        // it matches — typically the buy token (most fees skim from the
        // output), but `resolveSwapFeeToken` can pick the sell side too.
        // Synthetic wrap/unwrap rows have no `fees` field, so they
        // contribute nothing to the fee total (correct: no DEX fee on a
        // direct WETH.deposit/withdraw).
        const integratorFee =
          r.data.fees?.integratorFee ?? r.data.fees?.integratorFees?.[0];
        let feeUsd: number | undefined;
        if (integratorFee) {
          const feeAddrLower = integratorFee.token.toLowerCase();
          const targetAddrLower =
            targetToken.address.toLowerCase() === "native"
              ? NATIVE_TOKEN_ADDRESS_0X.toLowerCase()
              : targetToken.address.toLowerCase();
          const sourceAddrLower =
            r.request.source.contractAddress === "native"
              ? NATIVE_TOKEN_ADDRESS_0X.toLowerCase()
              : r.request.source.contractAddress.toLowerCase();

          let priceUsd: number | undefined;
          let feeDecimals: number | undefined;
          if (feeAddrLower === targetAddrLower) {
            priceUsd = targetPriceUsd;
            feeDecimals = targetToken.decimals;
          } else if (feeAddrLower === sourceAddrLower) {
            priceUsd = r.request.source.priceUsd;
            feeDecimals = r.request.source.decimals;
          }
          if (
            priceUsd !== undefined &&
            priceUsd > 0 &&
            feeDecimals !== undefined
          ) {
            try {
              const feeFloat = Number(
                formatUnits(BigInt(integratorFee.amount), feeDecimals)
              );
              feeUsd = feeFloat * priceUsd;
            } catch {
              // ignore — feeUsd stays undefined, footer just shows
              // "Includes walletchan fee" without a $ amount.
            }
          }
        }

        return {
          ...base,
          targetAmountWei: buyAmountWei,
          targetUsd,
          feeUsd,
          isPremiumFee: r.data.isPremiumFee === true,
          quoteData: r.data,
        };
      }
      if (r.isError) {
        return {
          ...base,
          targetAmountWei: 0n,
          targetUsd: 0,
          errorMessage: r.error?.message ?? "Quote failed",
        };
      }
      return {
        ...base,
        targetAmountWei: 0n,
        targetUsd: 0,
        isPending: true,
      };
    });
  }, [activeTab, targetToken, liveQuotes.results, targetPriceUsd]);

  const swapDisabledReason = useMemo(() => {
    if (activeTab !== "swap") return undefined;
    if (!isConnected) return "Connect a wallet to start";
    if (
      targetToken &&
      preparedTransfers.length > 0 &&
      quoteRequests.length === 0
    ) {
      return "Selected token matches the target — pick a different target";
    }
    if (
      targetToken &&
      quoteRequests.length > 0 &&
      liveQuotes.isSettled &&
      swapQuotes.every((q) => q.errorMessage)
    ) {
      return "Couldn't fetch swap quotes — try a different target or retry";
    }
    return undefined;
  }, [
    activeTab,
    isConnected,
    targetToken,
    preparedTransfers.length,
    quoteRequests.length,
    swapQuotes,
    liveQuotes.isSettled,
  ]);

  // Source rows on the current chain whose address matches the chosen swap
  // target — these would be no-op swaps so we offer to uncheck them.
  const conflictingSourceKeys = useMemo<string[]>(() => {
    if (activeTab !== "swap" || !targetToken) return [];
    const targetAddrLower = targetToken.address.toLowerCase();
    return selectedOnCurrentChain
      .filter((t) => {
        const sourceAddr =
          t.contractAddress === "native"
            ? "native"
            : t.contractAddress.toLowerCase();
        return sourceAddr === targetAddrLower;
      })
      .map((t) => tokenKey(t));
  }, [activeTab, targetToken, selectedOnCurrentChain]);

  const handleResolveTargetConflict = useCallback(() => {
    if (conflictingSourceKeys.length === 0) return;
    setSelection((curr) => {
      const next = new Map(curr);
      for (const key of conflictingSourceKeys) {
        const existing = next.get(key);
        next.set(key, {
          selected: false,
          amountOverrideWei: existing?.amountOverrideWei,
        });
      }
      return next;
    });
  }, [conflictingSourceKeys]);

  const handleOpenSwapPreview = useCallback(() => {
    if (!targetToken || swapQuotes.length === 0) return;
    setIsSwapPreviewOpen(true);
  }, [targetToken, swapQuotes.length]);

  const handleMigrate = useCallback(() => {
    if (!isAddress(receiver.trim())) return;
    if (preparedTransfers.length === 0) return;
    if (currentChainId === undefined) return;
    execution.start(
      {
        receiver: receiver.trim() as Address,
        chainId: currentChainId,
        transfers: preparedTransfers,
      },
      supportsBatching
    );
  }, [receiver, preparedTransfers, currentChainId, supportsBatching, execution]);

  // Cancel any pending post-migration delayed-refresh timer if the user
  // leaves the page. (React 18 silently ignores setState on an unmounted
  // component, but we clean up anyway for hygiene.)
  const delayedRefreshRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (delayedRefreshRef.current) clearTimeout(delayedRefreshRef.current);
    };
  }, []);

  const handleSwapModalClose = useCallback(
    (didSwapAnything: boolean) => {
      setIsSwapPreviewOpen(false);
      if (didSwapAnything) {
        // Wipe selections that were swapped so the user doesn't accidentally
        // re-send the same amounts. Mirrors the post-send cleanup below.
        setSelection(new Map());
        refetch();
        invalidateLiveBalances();
        if (delayedRefreshRef.current) clearTimeout(delayedRefreshRef.current);
        delayedRefreshRef.current = setTimeout(() => {
          refetch();
          invalidateLiveBalances();
          delayedRefreshRef.current = null;
        }, 4_000);
      }
    },
    [refetch, invalidateLiveBalances]
  );

  const handleModalClose = useCallback(
    (didMigrateAnything: boolean) => {
      execution.close();
      if (didMigrateAnything) {
        // Wipe selections that were processed so the user doesn't accidentally
        // re-send the same amounts.
        setSelection(new Map());
        refetch();
        // RPC propagation lag: public providers (Alchemy/Infura/etc.) often
        // serve cached `latest` balances for a few seconds after a tx lands.
        // We bump live-balances immediately (in case the RPC is fast) and
        // again after a delay so the multicall is guaranteed to see post-
        // migration state. Two cheap round-trips beat showing stale balances.
        invalidateLiveBalances();
        if (delayedRefreshRef.current) clearTimeout(delayedRefreshRef.current);
        delayedRefreshRef.current = setTimeout(() => {
          refetch();
          invalidateLiveBalances();
          delayedRefreshRef.current = null;
        }, 4_000);
      }
    },
    [execution, refetch, invalidateLiveBalances]
  );

  // Surface for the receiver-panel "disabled" hint
  const receiverHint = useMemo(() => {
    if (!isConnected) return "Connect a wallet to start";
    if (currentChainId === undefined) return undefined;
    const currentGroup = chainGroups.find(
      (g) => g.chainId === currentChainId
    );
    if (currentGroup && selectedOnCurrentChain.length === 0)
      return undefined;
    if (
      selectedOnCurrentChain.length > 0 &&
      preparedTransfers.length === 0
    ) {
      return "All selected balances are below the gas-reserve threshold";
    }
    return undefined;
  }, [
    isConnected,
    currentChainId,
    chainGroups,
    selectedOnCurrentChain,
    preparedTransfers,
  ]);

  return (
    <Layout allowSticky>
    <Box w="full" py={{ base: 4, md: 6 }}>
      <Flex
        direction={{ base: "column-reverse", md: "row" }}
        align={{ base: "stretch", md: "center" }}
        justify="space-between"
        gap={{ base: 3, md: 4 }}
        mb={6}
      >
        <Box flex={1} textAlign={{ base: "center", md: "left" }} minW={0}>
          <Heading
            fontSize={{ base: "3xl", md: "4xl", lg: "5xl", xl: "6xl" }}
            color="text.primary"
            fontWeight="bold"
            letterSpacing="tight"
            lineHeight="1.05"
          >
            Migrate Tokens
          </Heading>
          <Text color="text.secondary" fontSize="md" mt={2}>
            {activeTab === "swap"
              ? "Swap every selected token into one — batched into as few transactions as your wallet allows."
              : "Sweep tokens from your wallet to a single receiver address."}
          </Text>
        </Box>
        {mounted && (
          <Box
            flexShrink={0}
            display="flex"
            justifyContent={{ base: "flex-end", md: "flex-end" }}
          >
            <ConnectButton />
          </Box>
        )}
      </Flex>

      {!mounted ? (
        <Box
          bg="whiteAlpha.50"
          border="1px solid"
          borderColor="whiteAlpha.200"
          borderRadius="lg"
          p={10}
        />
      ) : !isConnected ? (
        <DisconnectedPreview />
      ) : isLoading ? (
        <Grid
          templateColumns={{ base: "1fr", lg: "1fr 380px" }}
          gap={4}
          alignItems="flex-start"
        >
          <GridItem minW={0}>
            <PortfolioSkeleton />
          </GridItem>
          <GridItem
            display={{ base: "none", lg: "block" }}
            position={{ lg: "sticky" }}
            top={{ lg: "1rem" }}
            maxH={{ lg: "calc(100vh - 2rem)" }}
            overflowY={{ lg: "auto" }}
          >
            <ReceiverPanel
              receiver={receiver}
              onReceiverChange={setReceiver}
              chainId={currentChainId ?? 1}
              selectedTokens={[]}
              onMigrate={handleMigrate}
              isExecuting={false}
              disabledReason="Loading your portfolio…"
            />
          </GridItem>
        </Grid>
      ) : isError ? (
        <Alert
          status="error"
          bg="rgba(239,68,68,0.10)"
          border="1px solid"
          borderColor="rgba(239,68,68,0.30)"
          borderRadius="lg"
          color="#F87171"
        >
          <AlertIcon color="#F87171" />
          Failed to load portfolio: {error?.message ?? "Unknown error"}
        </Alert>
      ) : (
        <Grid
          templateColumns={{ base: "1fr", lg: "1fr 380px" }}
          gap={4}
          alignItems="flex-start"
        >
          <GridItem minW={0}>
            <VStack spacing={4} align="stretch">
              <PortfolioSidebar
                totalValueUsd={liveTotalValueUsd}
                chainGroups={displayedChainGroups}
                currentChainId={currentChainId}
                isFetching={isFetching}
                onChainClick={handleChainTileClick}
                onReload={handleReload}
              />
              {/* Inline panel — only renders below lg, where the right
                  column is collapsed. Sits between portfolio + token list so
                  it's reachable without scrolling past every chain group. */}
              <Box display={{ base: "block", lg: "none" }}>
                <Box mb={3} display="flex" justifyContent="flex-start">
                  <TabsSelector
                    tabs={TAB_LABELS}
                    selectedTabIndex={activeTab === "send" ? 0 : 1}
                    setSelectedTabIndex={(i) =>
                      setActiveTab(i === 0 ? "send" : "swap")
                    }
                    mt={0}
                  />
                </Box>
                {activeTab === "send" ? (
                  <ReceiverPanel
                    receiver={receiver}
                    onReceiverChange={setReceiver}
                    chainId={currentChainId ?? 1}
                    selectedTokens={selectedOnCurrentChain}
                    onMigrate={handleMigrate}
                    isExecuting={execution.plan !== null}
                    disabledReason={receiverHint}
                  />
                ) : (
                  <SwapTargetPanel
                    chainName={currentChainName}
                    chainId={currentChainId}
                    selectedSourceTokens={selectedOnCurrentChain}
                    targetToken={targetToken}
                    onTargetTokenChange={setTargetToken}
                    popularTargets={popularTargets}
                    restTargets={restTargets}
                    isLoadingTargetList={isLoadingTokenList}
                    slippageBps={slippageBps}
                    onSlippageChange={setSlippageBps}
                    quotes={swapQuotes}
                    isLoadingQuotes={liveQuotes.isLoading}
                    onSwap={handleOpenSwapPreview}
                    isExecuting={isSwapPreviewOpen}
                    disabledReason={swapDisabledReason}
                    onResolveTargetConflict={handleResolveTargetConflict}
                    conflictingSourceCount={conflictingSourceKeys.length}
                    recipient={swapRecipient}
                    onRecipientChange={setSwapRecipient}
                    recipientChainId={currentChainId ?? 1}
                    connectedWalletAddress={address}
                  />
                )}
              </Box>
              <TokenTable
                chainGroups={displayedChainGroups}
                currentChainId={currentChainId}
                selection={selection}
                onToggle={toggle}
                onAmountOverride={setAmountOverride}
                onSelectAll={selectAll}
                onSwitchChain={handleSwitchChain}
                switchingToChainId={switchingToChainId}
                showDustByChain={showDustByChain}
                onToggleDustForChain={setShowDustForChain}
                dustThresholdUsd={DUST_THRESHOLD_USD}
                dustCountByChain={dustCountByChain}
              />
            </VStack>
          </GridItem>

          <GridItem
            display={{ base: "none", lg: "block" }}
            position={{ lg: "sticky" }}
            top={{ lg: "1rem" }}
            maxH={{ lg: "calc(100vh - 2rem)" }}
            overflowY={{ lg: "auto" }}
          >
            <Box mb={3} display="flex" justifyContent="flex-start">
              <TabsSelector
                tabs={TAB_LABELS}
                selectedTabIndex={activeTab === "send" ? 0 : 1}
                setSelectedTabIndex={(i) =>
                  setActiveTab(i === 0 ? "send" : "swap")
                }
                mt={0}
              />
            </Box>
            {activeTab === "send" ? (
              <ReceiverPanel
                receiver={receiver}
                onReceiverChange={setReceiver}
                chainId={currentChainId ?? 1}
                selectedTokens={selectedOnCurrentChain}
                onMigrate={handleMigrate}
                isExecuting={execution.plan !== null}
                disabledReason={receiverHint}
              />
            ) : (
              <SwapTargetPanel
                chainName={currentChainName}
                chainId={currentChainId}
                selectedSourceTokens={selectedOnCurrentChain}
                targetToken={targetToken}
                onTargetTokenChange={setTargetToken}
                popularTargets={popularTargets}
                restTargets={restTargets}
                isLoadingTargetList={isLoadingTokenList}
                slippageBps={slippageBps}
                onSlippageChange={setSlippageBps}
                quotes={swapQuotes}
                isLoadingQuotes={liveQuotes.isLoading}
                isFetchingQuotes={liveQuotes.isFetching}
                onRefreshQuotes={liveQuotes.refetchAll}
                onSwap={handleOpenSwapPreview}
                isExecuting={isSwapPreviewOpen}
                disabledReason={swapDisabledReason}
                onResolveTargetConflict={handleResolveTargetConflict}
                conflictingSourceCount={conflictingSourceKeys.length}
                recipient={swapRecipient}
                onRecipientChange={setSwapRecipient}
                recipientChainId={currentChainId ?? 1}
                connectedWalletAddress={address}
              />
            )}
          </GridItem>
        </Grid>
      )}

      {execution.plan && execution.mode === "batch" && (
        <BatchProgressModal
          plan={execution.plan}
          onClose={handleModalClose}
          onSwitchToSequential={execution.switchToSequential}
        />
      )}
      {execution.plan && execution.mode === "sequential" && (
        <SequentialProgressModal
          plan={execution.plan}
          onClose={handleModalClose}
        />
      )}
      {isSwapPreviewOpen && targetToken && address && currentChainId !== undefined && (
        <SwapExecutionModal
          isOpen
          onClose={handleSwapModalClose}
          quotes={swapQuotes.filter(
            (q) => !q.isPending && !q.errorMessage
          )}
          targetToken={targetToken}
          slippageBps={slippageBps}
          supportsBatching={supportsBatching}
          chainId={currentChainId}
          taker={address as Address}
          recipient={(validSwapRecipient as Address | undefined) ?? (address as Address)}
        />
      )}
    </Box>
    </Layout>
  );
}

// Mirrors the real layout (sidebar header + per-chain grid + token rows) so the
// page doesn't visually jump when portfolio data lands. Shared skeleton tokens:
// `whiteAlpha.100` start → `whiteAlpha.300` end on `whiteAlpha.50` surfaces.
const skelStart = "whiteAlpha.100";
const skelEnd = "whiteAlpha.300";

function PortfolioSkeleton() {
  return (
    <VStack spacing={4} align="stretch">
          <Box
            p={5}
            bg="whiteAlpha.50"
            borderRadius="lg"
            border="1px solid"
            borderColor="whiteAlpha.200"
          >
            <HStack
              align="stretch"
              spacing={{ base: 4, md: 6 }}
              flexDir={{ base: "column", md: "row" }}
            >
              <VStack
                align="flex-start"
                spacing={2}
                flexShrink={0}
                minW={{ md: "260px" }}
              >
                <Skeleton
                  height="10px"
                  width="120px"
                  startColor={skelStart}
                  endColor={skelEnd}
                  borderRadius="sm"
                />
                <Skeleton
                  height={{ base: "36px", md: "44px", lg: "52px" }}
                  width="200px"
                  startColor={skelStart}
                  endColor={skelEnd}
                  borderRadius="md"
                />
              </VStack>
              <Box flex={1} minW={0}>
                <Skeleton
                  height="10px"
                  width="80px"
                  startColor={skelStart}
                  endColor={skelEnd}
                  borderRadius="sm"
                  mb={2}
                />
                <SimpleGrid
                  columns={{ base: 2, sm: 3, md: 3, lg: 4, xl: 5 }}
                  spacing={2}
                >
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Box
                      key={i}
                      bg="whiteAlpha.100"
                      borderRadius="md"
                      border="1px solid"
                      borderColor="whiteAlpha.200"
                      p={2.5}
                    >
                      <HStack spacing={2} mb={2}>
                        <SkeletonCircle
                          size="18px"
                          startColor={skelStart}
                          endColor={skelEnd}
                        />
                        <Skeleton
                          height="10px"
                          flex={1}
                          startColor={skelStart}
                          endColor={skelEnd}
                          borderRadius="sm"
                        />
                      </HStack>
                      <Skeleton
                        height="14px"
                        width="60%"
                        startColor={skelStart}
                        endColor={skelEnd}
                        borderRadius="sm"
                      />
                    </Box>
                  ))}
                </SimpleGrid>
              </Box>
            </HStack>
          </Box>

          {Array.from({ length: 2 }).map((_, gi) => (
            <Box
              key={gi}
              bg="whiteAlpha.50"
              borderRadius="lg"
              border="1px solid"
              borderColor="whiteAlpha.200"
              overflow="hidden"
            >
              <HStack px={4} py={3} bg="whiteAlpha.100" spacing={3}>
                <SkeletonCircle
                  size="22px"
                  startColor={skelStart}
                  endColor={skelEnd}
                />
                <VStack spacing={1.5} align="flex-start" flex={1}>
                  <Skeleton
                    height="12px"
                    width="120px"
                    startColor={skelStart}
                    endColor={skelEnd}
                    borderRadius="sm"
                  />
                  <Skeleton
                    height="10px"
                    width="180px"
                    startColor={skelStart}
                    endColor={skelEnd}
                    borderRadius="sm"
                  />
                </VStack>
                <Skeleton
                  height="20px"
                  width="80px"
                  startColor={skelStart}
                  endColor={skelEnd}
                  borderRadius="sm"
                />
              </HStack>
              <VStack spacing={1} align="stretch" px={2} py={2}>
                {Array.from({ length: 4 }).map((_, ri) => (
                  <HStack key={ri} px={3} py={2.5} spacing={3}>
                    <Skeleton
                      height="16px"
                      width="16px"
                      startColor={skelStart}
                      endColor={skelEnd}
                      borderRadius="sm"
                    />
                    <SkeletonCircle
                      size="28px"
                      startColor={skelStart}
                      endColor={skelEnd}
                    />
                    <VStack spacing={1.5} align="flex-start" flex={1}>
                      <Skeleton
                        height="12px"
                        width="80px"
                        startColor={skelStart}
                        endColor={skelEnd}
                        borderRadius="sm"
                      />
                      <Skeleton
                        height="10px"
                        width="140px"
                        startColor={skelStart}
                        endColor={skelEnd}
                        borderRadius="sm"
                      />
                    </VStack>
                    <Skeleton
                      height="14px"
                      width="60px"
                      startColor={skelStart}
                      endColor={skelEnd}
                      borderRadius="sm"
                    />
                  </HStack>
                ))}
              </VStack>
            </Box>
          ))}
        </VStack>
  );
}

// Static preview shown to disconnected users. Mirrors the real two-column
// layout (portfolio + receiver) with plausible-looking fake data so the page
// doesn't read as empty. Dimmed and click-blocked; a centered CTA overlay
// surfaces the connect button.
function DisconnectedPreview() {
  return (
    <Box position="relative">
      <Box opacity={0.45} pointerEvents="none" filter="blur(0.5px)" aria-hidden>
        <Grid
          templateColumns={{ base: "1fr", lg: "1fr 380px" }}
          gap={4}
          alignItems="flex-start"
        >
          <GridItem minW={0}>
            <VStack spacing={4} align="stretch">
              {/* Portfolio header */}
              <Box
                p={5}
                bg="whiteAlpha.50"
                border="1px solid"
                borderColor="whiteAlpha.200"
                borderRadius="lg"
              >
                <Text
                  fontSize="xs"
                  color="whiteAlpha.600"
                  letterSpacing="wider"
                  mb={1}
                >
                  TOTAL VALUE
                </Text>
                <Heading
                  fontSize="3xl"
                  color="text.primary"
                  fontWeight="bold"
                  letterSpacing="tight"
                >
                  $12,847.23
                </Heading>
                <SimpleGrid
                  columns={{ base: 3, sm: 4, md: 5 }}
                  spacing={2}
                  mt={4}
                >
                  {DEMO_CHAINS.map((c) => (
                    <Box
                      key={c.name}
                      p={2}
                      bg="whiteAlpha.50"
                      border="1px solid"
                      borderColor="whiteAlpha.100"
                      borderRadius="md"
                    >
                      <Text fontSize="xs" color="whiteAlpha.700">
                        {c.name}
                      </Text>
                      <Text fontSize="sm" color="white" fontWeight="600">
                        {c.usd}
                      </Text>
                    </Box>
                  ))}
                </SimpleGrid>
              </Box>

              {/* Token group */}
              <Box
                bg="whiteAlpha.50"
                border="1px solid"
                borderColor="whiteAlpha.200"
                borderRadius="lg"
                overflow="hidden"
              >
                <HStack
                  px={4}
                  py={3}
                  borderBottom="1px solid"
                  borderColor="whiteAlpha.100"
                >
                  <Text color="white" fontWeight="600">
                    Ethereum
                  </Text>
                  <Text color="whiteAlpha.500" fontSize="sm">
                    · 4 tokens
                  </Text>
                  <Box flex={1} />
                  <Text color="whiteAlpha.700" fontSize="sm">
                    $8,221.40
                  </Text>
                </HStack>
                <VStack spacing={0} align="stretch">
                  {DEMO_TOKENS.map((t, i) => (
                    <HStack
                      key={t.symbol}
                      px={4}
                      py={3}
                      spacing={3}
                      borderBottom={
                        i < DEMO_TOKENS.length - 1 ? "1px solid" : undefined
                      }
                      borderColor="whiteAlpha.100"
                    >
                      <Box
                        boxSize="20px"
                        borderRadius="md"
                        border="1px solid"
                        borderColor="whiteAlpha.300"
                      />
                      <Box
                        boxSize="28px"
                        borderRadius="full"
                        bg="whiteAlpha.200"
                      />
                      <VStack spacing={0} align="flex-start" flex={1} minW={0}>
                        <Text color="white" fontWeight="600">
                          {t.symbol}
                        </Text>
                        <Text color="whiteAlpha.500" fontSize="sm">
                          {t.name}
                        </Text>
                      </VStack>
                      <VStack spacing={0} align="flex-end">
                        <Text
                          color="white"
                          fontFamily="mono"
                          sx={{ fontVariantNumeric: "tabular-nums" }}
                        >
                          {t.balance}
                        </Text>
                        <Text color="whiteAlpha.600" fontSize="sm">
                          {t.usd}
                        </Text>
                      </VStack>
                    </HStack>
                  ))}
                </VStack>
              </Box>
            </VStack>
          </GridItem>

          {/* Receiver panel */}
          <GridItem display={{ base: "none", lg: "block" }}>
            <Box
              p={5}
              bg="whiteAlpha.50"
              border="1px solid"
              borderColor="whiteAlpha.200"
              borderRadius="lg"
            >
              <Text
                fontSize="xs"
                color="whiteAlpha.600"
                letterSpacing="wider"
                mb={2}
              >
                MIGRATE TO
              </Text>
              <Box
                px={3}
                py={2.5}
                bg="whiteAlpha.50"
                border="1px solid"
                borderColor="whiteAlpha.200"
                borderRadius="md"
                mb={3}
              >
                <Text color="whiteAlpha.500" fontSize="sm">
                  vitalik.eth
                </Text>
              </Box>
              <Box
                py={6}
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Box
                  px={4}
                  py={2}
                  bg="whiteAlpha.50"
                  border="1px solid"
                  borderColor="whiteAlpha.200"
                  borderRadius="full"
                >
                  <Text color="whiteAlpha.600" fontSize="xs">
                    4 tokens → 1 batch
                  </Text>
                </Box>
              </Box>
              <Box
                w="full"
                h="40px"
                bg="primary.500"
                borderRadius="md"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Text color="white" fontWeight="600" fontSize="sm">
                  Migrate 4 tokens
                </Text>
              </Box>
            </Box>
          </GridItem>
        </Grid>
      </Box>

      {/* CTA overlay */}
      <Flex
        position="absolute"
        inset={0}
        align="center"
        justify="center"
        pointerEvents="none"
      >
        <VStack
          spacing={3}
          p={6}
          bg="bg.muted"
          border="1px solid"
          borderColor="whiteAlpha.300"
          borderRadius="lg"
          boxShadow="0 12px 40px rgba(0,0,0,0.45)"
          pointerEvents="auto"
          maxW="sm"
          textAlign="center"
        >
          <Heading fontSize="lg" color="text.primary">
            Connect your wallet
          </Heading>
          <Text color="text.secondary" fontSize="sm">
            We&apos;ll load your tokens across every supported chain and let
            you sweep them to a single address in one batched transaction.
          </Text>
          <Box pt={1}>
            <ConnectButton />
          </Box>
        </VStack>
      </Flex>
    </Box>
  );
}

const DEMO_CHAINS = [
  { name: "Ethereum", usd: "$8,221" },
  { name: "Base", usd: "$2,915" },
  { name: "Arbitrum", usd: "$1,108" },
  { name: "Optimism", usd: "$412" },
  { name: "Polygon", usd: "$190" },
];

const DEMO_TOKENS = [
  { symbol: "ETH", name: "Ether", balance: "1.842", usd: "$5,612.45" },
  { symbol: "USDC", name: "USD Coin", balance: "1,420.00", usd: "$1,420.00" },
  { symbol: "AAVE", name: "Aave", balance: "14.21", usd: "$1,089.55" },
  { symbol: "UNI", name: "Uniswap", balance: "112.5", usd: "$99.40" },
];

