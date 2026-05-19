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
import { Address, isAddress } from "viem";
import { usePortfolio } from "./hooks/usePortfolio";
import { useBatchSupport } from "./hooks/useBatchSupport";
import {
  useMigrateExecution,
  PreparedTransfer,
} from "./hooks/useMigrateExecution";
import { ConnectButton } from "@/components/ConnectButton/ConnectButton";
import { Layout } from "@/components/Layout";
import { PortfolioSidebar } from "./components/PortfolioSidebar";
import { TokenTable } from "./components/TokenTable";
import { ReceiverPanel } from "./components/ReceiverPanel";
import { BatchProgressModal } from "./components/BatchProgressModal";
import { SequentialProgressModal } from "./components/SequentialProgressModal";
import { PortfolioToken, tokenKey } from "./lib/portfolioApi";
import { resolveTransferAmountWei } from "./lib/buildTransferCall";
import { applyLiveBalance } from "./lib/onchainBalances";
import { useLiveBalances } from "./hooks/useLiveBalances";
import { SelectionMap } from "./types";

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
            Sweep tokens from your wallet to a single receiver address.
          </Text>
        </Box>
        {mounted && isConnected && (
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
        <Alert
          status="info"
          bg="rgba(59,130,246,0.10)"
          border="1px solid"
          borderColor="rgba(59,130,246,0.30)"
          borderRadius="lg"
          color="primary.400"
        >
          <AlertIcon color="primary.400" />
          Connect your wallet to view your portfolio and start migrating
          tokens.
        </Alert>
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
              {/* Inline receiver — only renders below lg, where the right
                  column is collapsed. Sits between portfolio + token list so
                  it's reachable without scrolling past every chain group. */}
              <Box display={{ base: "block", lg: "none" }}>
                <ReceiverPanel
                  receiver={receiver}
                  onReceiverChange={setReceiver}
                  chainId={currentChainId ?? 1}
                  selectedTokens={selectedOnCurrentChain}
                  onMigrate={handleMigrate}
                  isExecuting={execution.plan !== null}
                  disabledReason={receiverHint}
                />
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
            <ReceiverPanel
              receiver={receiver}
              onReceiverChange={setReceiver}
              chainId={currentChainId ?? 1}
              selectedTokens={selectedOnCurrentChain}
              onMigrate={handleMigrate}
              isExecuting={execution.plan !== null}
              disabledReason={receiverHint}
            />
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

