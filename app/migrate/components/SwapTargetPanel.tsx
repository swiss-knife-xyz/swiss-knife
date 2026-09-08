"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  HStack,
  IconButton,
  Image,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Skeleton,
  Spinner,
  Text,
  useDisclosure,
  VStack,
} from "@chakra-ui/react";
import {
  ArrowRight,
  ExternalLink,
  Pencil,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import { formatUnits, isAddress, getAddress } from "viem";
import type { BridgeChain } from "../lib/bridgeApi";
import { PortfolioToken } from "../lib/portfolioApi";
import { SwapQuote, TargetTokenEntry, sumQuotes } from "../lib/swapTypes";
import { formatUsd, formatUsdCompact } from "../lib/format";
import { ChainPickerDropdown } from "./ChainPickerDropdown";
import { TokenPickerDropdown } from "./TokenPickerDropdown";
import { SlippageSettings } from "./SlippageSettings";
import { AddressInput } from "@/components/fnParams/inputs/AddressInput";
import { chainIdToImage } from "@/data/common";
import { resolveAddressToName, getNameAvatar } from "@/lib/nameResolution";

// Shim — AddressInput's `input` prop is a JsonFragment-shaped placeholder we
// don't actually use here.
const ADDRESS_INPUT_SHIM = { name: "Recipient", type: "address" } as any;

interface SwapTargetPanelProps {
  chainName?: string;
  chainId?: number;
  destinationChainId: number | null;
  onDestinationChainChange: (chainId: number | null) => void;
  destinationChainName?: string;
  hasBridgeRoutes?: boolean;
  bridgeChains: BridgeChain[];
  isLoadingBridgeChains?: boolean;
  selectedSourceTokens: PortfolioToken[];
  targetToken: TargetTokenEntry | null;
  onTargetTokenChange: (t: TargetTokenEntry) => void;
  popularTargets: TargetTokenEntry[];
  restTargets: TargetTokenEntry[];
  isLoadingTargetList?: boolean;
  slippageBps: number;
  onSlippageChange: (bps: number) => void;
  quotes: SwapQuote[];
  isLoadingQuotes: boolean;
  /** True while any row is refetching in the background. Distinct from
   *  `isLoadingQuotes`, which is only the initial fetch. */
  isFetchingQuotes?: boolean;
  /** Force-refetch every row's quote (bypasses staleTime). */
  onRefreshQuotes?: () => void;
  onSwap: () => void;
  isExecuting: boolean;
  disabledReason?: string;
  /** Surfaced under the warning when the user picked a target that's also one
   *  of the checked source tokens. Clicking unchecks those rows. */
  onResolveTargetConflict?: () => void;
  /** Number of source rows currently conflicting with the chosen target. */
  conflictingSourceCount?: number;
  /** Optional explicit recipient for the bought tokens. Empty string ↔
   *  default to the connected wallet. */
  recipient: string;
  onRecipientChange: (value: string) => void;
  /** Chain id for ENS/CCIP resolution inside the AddressInput. */
  recipientChainId: number;
  /** For the avatar inside the "Connected wallet" pill. */
  connectedWalletAddress?: string;
}

function shortBalance(formatted: string): string {
  if (!formatted.includes(".")) return formatted;
  // Up to 6 sig digits after the dot; strip trailing zeros.
  const [int, dec] = formatted.split(".");
  const trimmed = dec.slice(0, 6).replace(/0+$/, "");
  return trimmed ? `${int}.${trimmed}` : int;
}

function formatTokenAmount(wei: bigint, decimals: number): string {
  return shortBalance(formatUnits(wei, decimals));
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
      <Text fontSize="2xs" color="whiteAlpha.700" fontWeight="700">
        {symbol.slice(0, 2).toUpperCase()}
      </Text>
    </Box>
  );
}

function TokenLogoWithChainBadge({
  tokenSrc,
  symbol,
  chainLogoUrl,
  size = "24px",
  chainSize = "11px",
}: {
  tokenSrc?: string;
  symbol: string;
  chainLogoUrl?: string;
  size?: string;
  chainSize?: string;
}) {
  return (
    <Box position="relative" boxSize={size} flexShrink={0}>
      <TokenLogo src={tokenSrc} symbol={symbol} size={size} />
      {chainLogoUrl && (
        <Image
          src={chainLogoUrl}
          alt=""
          aria-hidden
          boxSize={chainSize}
          borderRadius="full"
          bg="bg.muted"
          border="1px solid"
          borderColor="whiteAlpha.700"
          position="absolute"
          right="-2px"
          bottom="-2px"
          fallbackSrc="/icon.png"
        />
      )}
    </Box>
  );
}

function DestinationChainLabel({
  logoUrl,
  name,
  align = "flex-end",
  prefix,
}: {
  logoUrl?: string;
  name?: string;
  align?: "flex-start" | "flex-end";
  prefix?: string;
}) {
  if (!logoUrl && !name) return null;

  const label = name ? `${prefix ? `${prefix} ` : ""}${name}` : "Destination";

  return (
    <HStack
      spacing={1}
      alignSelf={align}
      minW={0}
      maxW="full"
      color="whiteAlpha.600"
    >
      {logoUrl && (
        <Image
          src={logoUrl}
          alt={name ? `${name} chain` : "Destination chain"}
          boxSize="12px"
          borderRadius="full"
          bg="whiteAlpha.200"
          flexShrink={0}
          fallbackSrc="/icon.png"
        />
      )}
      <Text fontSize="2xs" fontWeight="600" noOfLines={1}>
        {label}
      </Text>
    </HStack>
  );
}

export function SwapTargetPanel({
  chainName,
  chainId,
  destinationChainId,
  onDestinationChainChange,
  destinationChainName,
  hasBridgeRoutes = false,
  bridgeChains,
  isLoadingBridgeChains,
  selectedSourceTokens,
  targetToken,
  onTargetTokenChange,
  popularTargets,
  restTargets,
  isLoadingTargetList,
  slippageBps,
  onSlippageChange,
  quotes,
  isLoadingQuotes,
  isFetchingQuotes,
  onRefreshQuotes,
  onSwap,
  isExecuting,
  disabledReason,
  onResolveTargetConflict,
  conflictingSourceCount = 0,
  recipient,
  onRecipientChange,
  recipientChainId,
  connectedWalletAddress,
}: SwapTargetPanelProps) {
  const isBridgeMode =
    hasBridgeRoutes ||
    (destinationChainId !== null &&
      destinationChainId !== undefined &&
      chainId !== undefined &&
      destinationChainId !== chainId);
  const effectiveDestinationChainId = isBridgeMode
    ? (destinationChainId ?? chainId)
    : chainId;
  const destinationChainLogoUrl = useMemo(() => {
    if (effectiveDestinationChainId === undefined) return undefined;
    const bridgeChain = bridgeChains.find(
      (chain) => chain.chainId === effectiveDestinationChainId
    );
    return (
      bridgeChain?.icon ??
      bridgeChain?.logoURI ??
      chainIdToImage[effectiveDestinationChainId]
    );
  }, [effectiveDestinationChainId, bridgeChains]);
  const destinationChainDisplayName =
    isBridgeMode && effectiveDestinationChainId !== undefined
      ? (destinationChainName ?? `Chain ${effectiveDestinationChainId}`)
      : undefined;
  const totals = useMemo(() => {
    if (!targetToken || quotes.length === 0) {
      return {
        totalTargetWei: 0n,
        totalUsd: 0,
        pendingCount: 0,
        totalFeeUsd: 0,
        isPremiumFee: false,
      };
    }
    return sumQuotes(quotes, targetToken.decimals);
  }, [quotes, targetToken]);

  const hasSelection = selectedSourceTokens.length > 0;
  const hasTarget = targetToken !== null;
  const settledQuotes = useMemo(
    () => quotes.filter((q) => !q.isPending && !q.errorMessage),
    [quotes]
  );
  const failedQuotes = useMemo(
    () => quotes.filter((q) => !q.isPending && q.errorMessage),
    [quotes]
  );
  const hasPending = quotes.some((q) => q.isPending);
  const hasSwapQuotes = quotes.some((q) => q.routeKind !== "bridge");
  const hasBridgeQuotes = quotes.some((q) => q.routeKind === "bridge");
  const actionVerb =
    hasSwapQuotes && hasBridgeQuotes
      ? "Convert"
      : isBridgeMode
        ? "Bridge"
        : "Swap";
  const routeMeta = useMemo(() => {
    const settledBridgeQuotes = settledQuotes.filter(
      (q) => q.routeKind === "bridge"
    );
    const routeNames = Array.from(
      new Set(
        settledBridgeQuotes
          .map((q) => q.routeName)
          .filter((name): name is string => !!name)
      )
    );
    const feeBps = settledBridgeQuotes.find((q) => q.feeBps)?.feeBps;
    const gasFeeUsd = settledBridgeQuotes.reduce(
      (sum, q) => sum + (q.gasFeeUsd ?? 0),
      0
    );
    return { routeNames, feeBps, gasFeeUsd };
  }, [settledQuotes]);
  // Don't let the user fire the modal mid-fetch — the preview would show
  // half-empty rows. Wait until every requested quote has settled.
  const canSwap =
    hasSelection &&
    hasTarget &&
    settledQuotes.length > 0 &&
    !hasPending &&
    !isExecuting;

  return (
    <Box
      p={5}
      bg="whiteAlpha.50"
      borderRadius="lg"
      border="1px solid"
      borderColor="whiteAlpha.200"
      w="full"
    >
      <HStack justify="space-between" align="center" mb={3}>
        <Text fontSize="xs" color="whiteAlpha.700" letterSpacing="wider">
          DESTINATION
        </Text>
        <SlippageSettings
          slippageBps={slippageBps}
          onSlippageChange={onSlippageChange}
        />
      </HStack>

      <VStack mb={4} spacing={2.5} align="stretch">
        <Box>
          <Text
            fontSize="2xs"
            color="whiteAlpha.600"
            letterSpacing="wider"
            mb={1}
          >
            CHAIN
          </Text>
          <ChainPickerDropdown
            sourceChainId={chainId}
            destinationChainId={destinationChainId}
            chains={bridgeChains}
            onSelect={onDestinationChainChange}
            isLoading={isLoadingBridgeChains}
          />
        </Box>
        <Box>
          <Text
            fontSize="2xs"
            color="whiteAlpha.600"
            letterSpacing="wider"
            mb={1}
          >
            TOKEN
          </Text>
          <TokenPickerDropdown
            selected={targetToken}
            popular={popularTargets}
            rest={restTargets}
            onSelect={onTargetTokenChange}
            chainName={isBridgeMode ? destinationChainName : chainName}
            chainId={isBridgeMode ? effectiveDestinationChainId : chainId}
            isLoadingRest={isLoadingTargetList}
            autoOpenOnMount={!targetToken}
          />
        </Box>
      </VStack>

      {/* Quotes section header — only shown once the user has both a target
          and selected sources, since the empty/placeholder states render
          their own copy and the refresh button has nothing to refresh. */}
      {hasSelection && hasTarget && (
        <HStack justify="flex-end" mb={1.5}>
          <HStack
            as="button"
            type="button"
            onClick={onRefreshQuotes}
            disabled={!onRefreshQuotes || !!isFetchingQuotes}
            spacing={1}
            px={2}
            py={0.5}
            borderRadius="sm"
            color="whiteAlpha.700"
            cursor={
              onRefreshQuotes && !isFetchingQuotes ? "pointer" : "not-allowed"
            }
            _hover={
              onRefreshQuotes && !isFetchingQuotes
                ? { color: "white", bg: "whiteAlpha.100" }
                : undefined
            }
          >
            <Box
              sx={{
                animation: isFetchingQuotes
                  ? "spin 0.9s linear infinite"
                  : undefined,
                "@keyframes spin": {
                  from: { transform: "rotate(0deg)" },
                  to: { transform: "rotate(360deg)" },
                },
              }}
            >
              <RefreshCw size={10} />
            </Box>
            <Text fontSize="2xs" fontWeight="600" letterSpacing="wide">
              {isFetchingQuotes ? "refreshing…" : "refresh quotes"}
            </Text>
          </HStack>
        </HStack>
      )}

      {/* Quotes list */}
      <Box
        bg="whiteAlpha.50"
        border="1px dashed"
        borderColor="whiteAlpha.200"
        borderRadius="lg"
        p={3}
        mb={4}
      >
        {!hasSelection ? (
          <VStack
            justify="center"
            align="center"
            minH="120px"
            color="whiteAlpha.600"
            spacing={1}
            py={4}
          >
            <Text fontSize="sm">Select tokens to swap</Text>
            <Text fontSize="xs" textAlign="center">
              Tick the boxes on the left to see quotes
            </Text>
          </VStack>
        ) : !hasTarget ? (
          <VStack
            justify="center"
            align="center"
            minH="120px"
            color="whiteAlpha.600"
            spacing={1}
            py={4}
          >
            <Text fontSize="sm">Pick a target token</Text>
            <Text fontSize="xs" textAlign="center">
              {isBridgeMode
                ? "We'll bridge every selected token into it"
                : "We'll quote every selected token into it"}
            </Text>
          </VStack>
        ) : quotes.length === 0 && isLoadingQuotes ? (
          <VStack justify="center" minH="120px" color="whiteAlpha.700">
            <Spinner size="sm" color="primary.400" />
            <Text fontSize="sm">Fetching quotes…</Text>
          </VStack>
        ) : (
          <VStack
            spacing={0}
            align="stretch"
            maxH="240px"
            overflowY="auto"
            // Hide the scrollbar gutter at rest; reveal a thin thumb on hover
            // (and when the user is actively scrolling — both Firefox and
            // WebKit pop the thumb in for the duration of a scroll). Keeps
            // the row content from shifting under a persistent macOS bar.
            sx={{
              scrollbarWidth: "thin",
              scrollbarColor: "transparent transparent",
              transition: "scrollbar-color 0.2s",
              "&:hover": {
                scrollbarColor: "rgba(255,255,255,0.3) transparent",
              },
              "&::-webkit-scrollbar": { width: "6px" },
              "&::-webkit-scrollbar-track": { background: "transparent" },
              "&::-webkit-scrollbar-thumb": {
                background: "transparent",
                borderRadius: "3px",
                transition: "background 0.2s",
              },
              "&:hover::-webkit-scrollbar-thumb": {
                background: "rgba(255,255,255,0.25)",
              },
            }}
          >
            {isBridgeMode && (
              <HStack
                spacing={2.5}
                px={2}
                pt={0.5}
                pb={1.5}
                borderBottom="1px solid"
                borderColor="whiteAlpha.100"
              >
                <Box boxSize="22px" flexShrink={0} />
                <Box flex={1} minW={0} />
                <Box boxSize="12px" flexShrink={0} />
                <HStack flex={1} minW={0} justify="flex-end">
                  <DestinationChainLabel
                    logoUrl={destinationChainLogoUrl}
                    name={destinationChainDisplayName}
                  />
                </HStack>
              </HStack>
            )}
            {quotes.map((q, idx) => {
              const srcAmt = formatTokenAmount(
                q.sourceAmountWei,
                q.source.decimals
              );
              const isPending = !!q.isPending;
              const hasError = !!q.errorMessage;
              const dstAmt = formatTokenAmount(
                q.targetAmountWei,
                targetToken!.decimals
              );
              // Source-side USD: derived directly from the source's portfolio
              // price × amount we're selling. We use the source value (rather
              // than mirroring targetUsd) because target prices can be missing
              // for less-common targets, but source rows always have a price.
              const srcUsd = (() => {
                if (q.source.priceUsd <= 0) return null;
                const amtFloat = Number(
                  formatUnits(q.sourceAmountWei, q.source.decimals)
                );
                if (!Number.isFinite(amtFloat) || amtFloat <= 0) return null;
                return amtFloat * q.source.priceUsd;
              })();
              const sourceChain = bridgeChains.find(
                (chain) => chain.chainId === q.source.chainId
              );
              const sourceChainLogoUrl =
                sourceChain?.icon ??
                sourceChain?.logoURI ??
                chainIdToImage[q.source.chainId];
              return (
                <HStack
                  key={`${q.source.chainId}:${q.source.contractAddress}`}
                  spacing={2.5}
                  px={2}
                  py={2}
                  borderBottom={
                    idx < quotes.length - 1 ? "1px solid" : undefined
                  }
                  borderColor="whiteAlpha.100"
                >
                  <TokenLogoWithChainBadge
                    tokenSrc={q.source.logoUrl}
                    symbol={q.source.symbol}
                    chainLogoUrl={sourceChainLogoUrl}
                    size="22px"
                    chainSize="10px"
                  />
                  {/* Two equal flex columns + a fixed-width arrow keep every
                      row's arrow on the same x — otherwise variable source /
                      target text widths shove the glyph all over the panel. */}
                  <VStack spacing={0.5} align="flex-start" flex={1} minW={0}>
                    <Text
                      fontSize="xs"
                      color="white"
                      fontWeight="600"
                      fontFamily="mono"
                      sx={{ fontVariantNumeric: "tabular-nums" }}
                      noOfLines={1}
                      textAlign="left"
                    >
                      {srcAmt} {q.source.symbol.toUpperCase()}
                    </Text>
                    {srcUsd !== null && (
                      <Text fontSize="2xs" color="whiteAlpha.600">
                        {formatUsdCompact(srcUsd)}
                      </Text>
                    )}
                  </VStack>
                  <Box
                    color={
                      hasError
                        ? "#F87171"
                        : isPending
                          ? "whiteAlpha.400"
                          : "whiteAlpha.500"
                    }
                    flexShrink={0}
                  >
                    <ArrowRight size={12} />
                  </Box>
                  <VStack spacing={0.5} align="flex-end" flex={1} minW={0}>
                    {isPending ? (
                      <>
                        <HStack spacing={1.5}>
                          <Skeleton
                            height="10px"
                            w="48px"
                            startColor="whiteAlpha.100"
                            endColor="whiteAlpha.300"
                            borderRadius="sm"
                          />
                          <TokenLogo
                            src={targetToken!.logoUrl}
                            symbol={targetToken!.symbol}
                            size="14px"
                          />
                        </HStack>
                        <Skeleton
                          height="8px"
                          w="28px"
                          startColor="whiteAlpha.100"
                          endColor="whiteAlpha.300"
                          borderRadius="sm"
                        />
                      </>
                    ) : hasError ? (
                      <Text
                        fontSize="2xs"
                        color="#F87171"
                        fontWeight="600"
                        noOfLines={1}
                        title={q.errorMessage}
                      >
                        No route
                      </Text>
                    ) : (
                      <>
                        <HStack spacing={1.5}>
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
                            src={targetToken!.logoUrl}
                            symbol={targetToken!.symbol}
                            size="14px"
                          />
                        </HStack>
                        <Text fontSize="2xs" color="whiteAlpha.600">
                          {formatUsdCompact(q.targetUsd)}
                        </Text>
                      </>
                    )}
                  </VStack>
                </HStack>
              );
            })}
          </VStack>
        )}
      </Box>

      {/* Recipient — defaults to connected wallet, can be overridden */}
      <RecipientField
        value={recipient}
        onChange={onRecipientChange}
        chainId={recipientChainId}
        connectedWalletAddress={connectedWalletAddress}
      />

      {/* Total receive */}
      {hasSelection && hasTarget && settledQuotes.length > 0 && (
        <Box
          mb={4}
          p={4}
          bg="rgba(59,130,246,0.08)"
          border="1px solid"
          borderColor="rgba(59,130,246,0.30)"
          borderRadius="lg"
        >
          <HStack justify="space-between" align="flex-start" mb={1.5}>
            <Text fontSize="2xs" color="whiteAlpha.700" letterSpacing="wider">
              YOU RECEIVE
            </Text>
            {totals.pendingCount > 0 && (
              <HStack spacing={1} color="whiteAlpha.700">
                <Spinner size="xs" color="primary.400" />
                <Text fontSize="2xs" letterSpacing="wide">
                  +{totals.pendingCount} loading
                </Text>
              </HStack>
            )}
          </HStack>
          <VStack spacing={0.5} align="stretch" w="full">
            <HStack spacing={2} align="center" minW={0}>
              <TokenLogo
                src={targetToken!.logoUrl}
                symbol={targetToken!.symbol}
                size="28px"
              />
              <HStack spacing={2} align="baseline" minW={0} flex={1}>
                <Text
                  fontSize="2xl"
                  color="white"
                  fontWeight="700"
                  fontFamily="mono"
                  letterSpacing="tight"
                  sx={{ fontVariantNumeric: "tabular-nums" }}
                  lineHeight="1"
                >
                  {formatTokenAmount(
                    totals.totalTargetWei,
                    targetToken!.decimals
                  )}
                </Text>
                <Text fontSize="md" color="whiteAlpha.800" fontWeight="600">
                  {targetToken!.symbol}
                </Text>
              </HStack>
            </HStack>
            <HStack justify="space-between" align="center" pl="36px" minW={0}>
              <Text fontSize="sm" color="whiteAlpha.700" fontWeight="500">
                ≈ {formatUsd(totals.totalUsd)}
              </Text>
              {isBridgeMode && (
                <HStack
                  spacing={1}
                  minW={0}
                  color="whiteAlpha.700"
                  justify="flex-end"
                >
                  <Text fontSize="sm" fontWeight="600" whiteSpace="nowrap">
                    on
                  </Text>
                  {destinationChainLogoUrl && (
                    <Image
                      src={destinationChainLogoUrl}
                      alt={
                        destinationChainDisplayName
                          ? `${destinationChainDisplayName} chain`
                          : "Destination chain"
                      }
                      boxSize="13px"
                      borderRadius="full"
                      bg="whiteAlpha.200"
                      flexShrink={0}
                      fallbackSrc="/icon.png"
                    />
                  )}
                  <Text fontSize="sm" fontWeight="600" noOfLines={1}>
                    {destinationChainDisplayName}
                  </Text>
                </HStack>
              )}
            </HStack>
          </VStack>
        </Box>
      )}

      <Button
        w="full"
        size="lg"
        bg="primary.500"
        color="white"
        _hover={{ bg: "primary.600" }}
        _active={{ bg: "primary.700" }}
        _disabled={{
          bg: "whiteAlpha.200",
          color: "whiteAlpha.500",
          cursor: "not-allowed",
        }}
        onClick={onSwap}
        isLoading={isExecuting}
        loadingText={actionVerb === "Bridge" ? "Bridging…" : "Converting…"}
        isDisabled={!canSwap}
      >
        {!hasSelection
          ? isBridgeMode
            ? "Select tokens to bridge"
            : "Select tokens to swap"
          : !hasTarget
            ? "Pick a target token"
            : hasPending && settledQuotes.length === 0
              ? "Fetching quotes…"
              : `${actionVerb} ${settledQuotes.length} token${
                  settledQuotes.length === 1 ? "" : "s"
                } → ${targetToken!.symbol}`}
      </Button>

      {(disabledReason || failedQuotes.length > 0) && (
        <VStack mt={2} spacing={2} align="center">
          {disabledReason && (
            <Text fontSize="xs" color="#FBBF24" textAlign="center">
              {disabledReason}
            </Text>
          )}
          {failedQuotes.length > 0 && settledQuotes.length > 0 && (
            <Text fontSize="xs" color="whiteAlpha.600" textAlign="center">
              {failedQuotes.length} route
              {failedQuotes.length === 1 ? "" : "s"} excluded from calls
            </Text>
          )}
          {onResolveTargetConflict && conflictingSourceCount > 0 && (
            <Button
              size="xs"
              variant="outline"
              borderColor="rgba(251,191,36,0.40)"
              color="#FBBF24"
              bg="rgba(251,191,36,0.08)"
              _hover={{ bg: "rgba(251,191,36,0.16)" }}
              onClick={onResolveTargetConflict}
            >
              Uncheck{" "}
              {conflictingSourceCount > 1 ? `${conflictingSourceCount} ` : ""}
              {targetToken?.symbol ?? "matching"}
            </Button>
          )}
        </VStack>
      )}

      {settledQuotes.length > 0 && (
        <VStack mt={2.5} spacing={1.5} align="flex-end">
          {isBridgeMode ? (
            <>
              {routeMeta.routeNames.length > 0 && (
                <Text
                  fontSize="2xs"
                  color="whiteAlpha.500"
                  letterSpacing="wide"
                >
                  Via {routeMeta.routeNames.slice(0, 2).join(", ")}
                  {routeMeta.routeNames.length > 2 ? " +" : ""}
                </Text>
              )}
              <Text fontSize="2xs" color="whiteAlpha.500" letterSpacing="wide">
                Fee:{" "}
                {routeMeta.feeBps
                  ? `${(Number(routeMeta.feeBps) / 100).toFixed(2)}%`
                  : totals.isPremiumFee
                    ? "0.3%"
                    : "0.8%"}
                {routeMeta.gasFeeUsd > 0
                  ? ` · est. gas ${formatUsdCompact(routeMeta.gasFeeUsd)}`
                  : ""}
              </Text>
            </>
          ) : (
            <>
              <Text fontSize="2xs" color="whiteAlpha.500" letterSpacing="wide">
                Fee: {totals.isPremiumFee ? "0.3%" : "0.8%"}
              </Text>
              {!totals.isPremiumFee && <StakerDiscountCta />}
              {totals.isPremiumFee && (
                <Text fontSize="2xs" color="whiteAlpha.500">
                  👑 WCHAN staker discount applied
                </Text>
              )}
            </>
          )}
        </VStack>
      )}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// StakerDiscountCta
//
// Tiny inline pill next to the fee caption that points non-premium users at
// the sWCHAN stake page. Opens a modal first (rather than navigating straight
// out) so the user gets the eligibility detail — the 20M sWCHAN balance
// threshold isn't obvious from "60% discount" alone.
// ---------------------------------------------------------------------------

const WALLETCHAN_STAKE_URL = "https://stake.walletchan.com";
const WALLETCHAN_LOGO = "/external/walletchan-icon.png";

function StakerDiscountCta() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  return (
    <>
      <HStack
        as="button"
        type="button"
        onClick={onOpen}
        spacing={1}
        px={1.5}
        py={0.5}
        borderRadius="sm"
        bg="rgba(59,130,246,0.10)"
        border="1px solid"
        borderColor="rgba(59,130,246,0.30)"
        color="primary.400"
        cursor="pointer"
        _hover={{ bg: "rgba(59,130,246,0.18)", color: "primary.300" }}
      >
        <Sparkles size={9} />
        <Text fontSize="2xs" fontWeight="600" letterSpacing="wide">
          Slash fees by 60%
        </Text>
      </HStack>

      <Modal isOpen={isOpen} onClose={onClose} isCentered size="sm">
        <ModalOverlay backdropFilter="blur(6px)" />
        <ModalContent bg="bg.muted" color="white" borderRadius="lg">
          <ModalHeader pr={12}>
            <HStack spacing={2.5}>
              <Image
                src={WALLETCHAN_LOGO}
                alt="WalletChan"
                boxSize="28px"
                borderRadius="full"
              />
              <Text fontSize="lg">
                Stake{" "}
                <Text as="span" color="primary.400">
                  $WCHAN
                </Text>
              </Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={3} align="stretch">
              <Box
                bg="whiteAlpha.50"
                border="1px solid"
                borderColor="whiteAlpha.200"
                borderRadius="md"
                p={3}
              >
                <HStack justify="space-between">
                  <VStack spacing={0} align="flex-start">
                    <Text
                      fontSize="2xs"
                      color="whiteAlpha.600"
                      letterSpacing="wider"
                    >
                      STANDARD
                    </Text>
                    <Text fontSize="xl" color="white" fontWeight="700">
                      0.8%
                    </Text>
                  </VStack>
                  <ArrowRight
                    size={16}
                    color="var(--chakra-colors-whiteAlpha-500)"
                  />
                  <VStack spacing={0} align="flex-end">
                    <Text
                      fontSize="2xs"
                      color="primary.400"
                      letterSpacing="wider"
                    >
                      👑 PREMIUM
                    </Text>
                    <Text fontSize="xl" color="primary.300" fontWeight="700">
                      0.3%
                    </Text>
                  </VStack>
                </HStack>
              </Box>
              <Text fontSize="sm" color="whiteAlpha.800" textAlign="center">
                Hold{" "}
                <Text as="span" fontWeight="700" color="white">
                  20M+ sWCHAN
                </Text>{" "}
                to unlock the premium tier.
              </Text>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack spacing={2} w="full" justify="flex-end">
              <Button
                variant="ghost"
                size="sm"
                color="whiteAlpha.700"
                _hover={{ bg: "whiteAlpha.100" }}
                onClick={onClose}
              >
                Not now
              </Button>
              <Button
                as={Link}
                href={WALLETCHAN_STAKE_URL}
                isExternal
                size="sm"
                bg="primary.500"
                color="white"
                _hover={{ bg: "primary.600", textDecoration: "none" }}
                rightIcon={<ExternalLink size={12} />}
              >
                Stake $WCHAN
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

// ---------------------------------------------------------------------------
// RecipientField
//
// Collapsed by default to a small "Connected wallet" pill so the panel stays
// tidy. Expanding reveals an AddressInput; once a *valid* address is entered
// we lock it expanded — collapsing while a custom recipient is set would
// hide the fact that tokens are going elsewhere, which is exactly the bit
// you don't want a user to forget.
// ---------------------------------------------------------------------------

interface RecipientFieldProps {
  value: string;
  onChange: (value: string) => void;
  chainId: number;
  connectedWalletAddress?: string;
}

function RecipientField({
  value,
  onChange,
  chainId,
  connectedWalletAddress,
}: RecipientFieldProps) {
  const trimmed = value.trim();
  const isValid = isAddress(trimmed);
  // Auto-expand whenever there's text (valid or not — we want the user to be
  // able to see what they typed if they got a half-completed paste in).
  const [isExpanded, setIsExpanded] = useState(trimmed.length > 0);

  useEffect(() => {
    if (trimmed.length > 0) setIsExpanded(true);
  }, [trimmed.length]);

  const [walletName, setWalletName] = useState<string | null>(null);
  const [walletAvatar, setWalletAvatar] = useState<string | null>(null);

  useEffect(() => {
    if (!connectedWalletAddress) return;
    let cancelled = false;
    const checksummed = (() => {
      try {
        return getAddress(connectedWalletAddress);
      } catch {
        return connectedWalletAddress;
      }
    })();
    setWalletName(null);
    setWalletAvatar(null);
    (async () => {
      const name = await resolveAddressToName(checksummed);
      if (cancelled || !name) return;
      setWalletName(name);
      const avatar = await getNameAvatar(name);
      if (cancelled) return;
      setWalletAvatar(avatar);
    })();
    return () => {
      cancelled = true;
    };
  }, [connectedWalletAddress]);

  const handleCollapse = () => {
    // Defensive: only callable when value is empty (the UI hides the button
    // otherwise) but enforce here too in case props go out of sync.
    if (trimmed.length === 0) {
      onChange("");
      setIsExpanded(false);
    }
  };

  const handleClear = () => {
    onChange("");
    setIsExpanded(false);
  };

  if (!isExpanded) {
    return (
      <HStack
        as="button"
        type="button"
        onClick={() => setIsExpanded(true)}
        spacing={2}
        mb={4}
        w="full"
        bg="whiteAlpha.50"
        border="1px dashed"
        borderColor="whiteAlpha.200"
        borderRadius="md"
        px={3}
        py={2}
        cursor="pointer"
        _hover={{ borderColor: "whiteAlpha.400", bg: "whiteAlpha.100" }}
      >
        <Text
          fontSize="2xs"
          color="whiteAlpha.600"
          letterSpacing="wider"
          flexShrink={0}
        >
          RECIPIENT
        </Text>
        <HStack spacing={1.5} flex={1} minW={0}>
          <Avatar
            size="2xs"
            name={walletName ?? connectedWalletAddress ?? "?"}
            src={walletAvatar ?? undefined}
            bg="whiteAlpha.200"
          />
          <Text fontSize="xs" color="white" fontWeight="500" noOfLines={1}>
            {walletName ?? "Connected wallet"}
          </Text>
        </HStack>
        <HStack spacing={1} color="whiteAlpha.600">
          <Pencil size={11} />
          <Text fontSize="2xs" fontWeight="600">
            edit
          </Text>
        </HStack>
      </HStack>
    );
  }

  return (
    <Box mb={4}>
      <HStack justify="space-between" mb={1.5}>
        <Text fontSize="2xs" color="whiteAlpha.600" letterSpacing="wider">
          RECIPIENT
        </Text>
        {trimmed.length === 0 ? (
          <Text
            as="button"
            type="button"
            onClick={handleCollapse}
            fontSize="2xs"
            color="whiteAlpha.600"
            _hover={{ color: "whiteAlpha.800" }}
            cursor="pointer"
          >
            use connected wallet
          </Text>
        ) : (
          <HStack spacing={1}>
            {!isValid && (
              <Text fontSize="2xs" color="#FBBF24">
                invalid address
              </Text>
            )}
            <IconButton
              aria-label="Clear recipient"
              icon={<X size={12} />}
              size="xs"
              variant="ghost"
              color="whiteAlpha.600"
              _hover={{ color: "white", bg: "whiteAlpha.100" }}
              onClick={handleClear}
            />
          </HStack>
        )}
      </HStack>
      <AddressInput
        input={ADDRESS_INPUT_SHIM}
        chainId={chainId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0x… or name.eth"
        hideTags
        hideQuickFillButtons
      />
    </Box>
  );
}
