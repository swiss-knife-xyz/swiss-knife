"use client";

import {
  Box,
  Button,
  Divider,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Heading,
  Image,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  NumberInput,
  NumberInputField,
  Spacer,
  Switch,
  Text,
  Tooltip,
  VStack,
  useDisclosure,
} from "@chakra-ui/react";
import {
  CheckCircle2,
  Clock3,
  ExternalLink,
  Info,
  Plus,
  Search,
  TimerReset,
  XCircle,
} from "lucide-react";
import NumberFlow from "@number-flow/react";
import { Fragment, ReactNode, useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { FaucetEntry, faucets } from "./faucets";
import {
  getFaucetChainBySlug,
  getFaucetChainSeoName,
  getFaucetChainSlug,
} from "./chains";
import { buildFaucetSeo } from "./seo";

type ClaimRecord = {
  claimedAt: number;
  cooldownHours: number;
  chain?: string;
  token?: string;
};

type ClaimRecords = Record<string, ClaimRecord>;
type ClaimVariant = {
  chain: string;
  token: string;
};
type ModalStep = "visit" | "feedback" | "claim";
type SubmittingAction = "no" | "yes" | "claim" | null;

type FaucetRatingStat = {
  total: number;
  worked: number;
  failed: number;
  successRate: number;
  score: number;
  lastRatedAt?: string;
};

type FaucetRatingStats = Record<string, FaucetRatingStat>;

type TrackedClaimVariant = {
  key: string;
  variant: ClaimVariant;
  record: ClaimRecord;
};

const STORAGE_KEY = "ethsh:faucet-claims";
const HOUR_MS = 60 * 60 * 1000;
const TABLE_GRID_COLUMNS =
  "minmax(270px,1.55fr) minmax(205px,1.1fr) minmax(190px,1fr) 162px";
const VOTE_RAIL_WIDTH = "26px";
const missingFaucetIssueBody = [
  "### Faucet URL",
  "",
  "https://",
  "",
  "### Network / chain",
  "",
  "",
  "### Token",
  "",
  "",
  "### Cooldown",
  "",
  "",
  "### Requirements",
  "",
  "",
  "### Notes",
  "",
].join("\n");
const missingFaucetIssueUrl = `https://github.com/swiss-knife-xyz/swiss-knife/issues/new?${new URLSearchParams(
  {
    title: "[ADD Faucet] ",
    body: missingFaucetIssueBody,
    labels: "faucet",
  }
).toString()}`;
const hiddenScrollbarSx = {
  scrollbarWidth: "none",
  msOverflowStyle: "none",
  "&::-webkit-scrollbar": {
    display: "none",
  },
} as const;

const setMetaContent = (
  selector: string,
  content: string,
  attribute = "content"
) => {
  let element = document.querySelector(selector);

  if (!element) {
    const metaMatch = selector.match(
      /^meta\[(name|property)=['"]([^'"]+)['"]\]$/
    );

    if (metaMatch) {
      element = document.createElement("meta");
      element.setAttribute(metaMatch[1], metaMatch[2]);
      document.head.appendChild(element);
    }
  }

  if (element) element.setAttribute(attribute, content);
};

const setCanonicalUrl = (url: string) => {
  let canonical = document.querySelector<HTMLLinkElement>(
    "link[rel='canonical']"
  );

  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }

  canonical.href = url;
};

const getChainFromPathname = (pathname: string) => {
  const segments = pathname.split("/").filter(Boolean);
  const slug = segments[0] === "faucet" ? segments[1] : segments[0];

  return slug ? getFaucetChainBySlug(slug) : undefined;
};

const getRuntimeFaucetPath = (chain: string) => {
  const isFaucetSubdomain = window.location.hostname
    .toLowerCase()
    .startsWith("faucet.");
  const basePath = isFaucetSubdomain ? "" : "/faucet";

  if (chain === "all") return basePath || "/";

  return `${basePath}/${getFaucetChainSlug(chain)}`;
};

const updateDocumentSeo = (chain: string) => {
  const seo = buildFaucetSeo(chain === "all" ? undefined : chain);

  document.title = seo.title;
  setMetaContent("meta[name='description']", seo.description);
  setMetaContent("meta[property='og:title']", seo.title);
  setMetaContent("meta[property='og:description']", seo.description);
  setMetaContent("meta[property='og:url']", seo.canonicalUrl);
  setMetaContent("meta[property='og:image']", seo.image);
  setMetaContent("meta[name='twitter:title']", seo.title);
  setMetaContent("meta[name='twitter:description']", seo.description);
  setMetaContent("meta[name='twitter:image']", seo.image);
  setCanonicalUrl(seo.canonicalUrl);
};

const formatDuration = (ms: number) => {
  if (ms <= 0) return "Ready";

  const totalSeconds = Math.ceil(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

const getDurationParts = (ms: number) => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));

  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
};

const formatClaimedAt = (timestamp: number) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);

const preferredChainOrder = new Map(
  ["Ethereum Sepolia"].map((chain, index) => [chain, index])
);

const preferredTokenOrder = new Map(
  [
    "ETH",
    "NATIVE",
    "USDC",
    "LINK",
    "EURC",
    "CBBTC",
    "CIRBTC",
    "BTC",
    "CBTC",
    "POL",
    "MATIC",
    "AVAX",
    "BNB",
    "MON",
    "HYPE",
    "XPL",
    "FIL",
    "XDAI",
    "APE",
    "FLOW",
    "CELO",
    "IP",
  ].map((token, index) => [token, index])
);

const chainIconMap: Array<[string, string]> = [
  ["ApeChain", "apechain.webp"],
  ["Citrea", "citrea"],
  ["Arbitrum", "arbitrum"],
  ["Avalanche", "avalanche"],
  ["Base", "base"],
  ["BNB", "bsc"],
  ["BSC", "bsc"],
  ["Celo", "celo.webp"],
  ["Ethereum", "ethereum"],
  ["Filecoin", "filecoin.webp"],
  ["Flow", "flow.webp"],
  ["Gnosis", "gnosis.webp"],
  ["Hoodi", "ethereum"],
  ["HyperEVM", "hyperevm.svg"],
  ["Ink", "ink"],
  ["Linea", "linea"],
  ["MegaETH", "megaeth"],
  ["Monad", "monad"],
  ["OP ", "optimism"],
  ["Optimism", "optimism"],
  ["Plasma", "plasma"],
  ["Polygon", "polygon"],
  ["RISE", "rise.svg"],
  ["Robinhood", "robinhood.svg"],
  ["Scroll", "scroll.webp"],
  ["Sei", "sei"],
  ["Stable", "stable"],
  ["Story", "story.webp"],
  ["Unichain", "unichain"],
  ["World", "worldchain"],
  ["Zircuit", "zircuit"],
  ["ZKsync", "zksync.webp"],
];

const getChainIcon = (chain: string) => {
  const match = chainIconMap.find(([name]) => chain.includes(name));
  if (!match) return "/icon.png";
  const iconFile = match[1].includes(".") ? match[1] : `${match[1]}.svg`;
  return `/chainIcons/${iconFile}`;
};

const unique = <T,>(values: T[]) => Array.from(new Set(values));

const getFaucetChains = (faucet: FaucetEntry) => {
  if (faucet.variants?.length) {
    return unique(faucet.variants.map((variant) => variant.chain));
  }

  return faucet.supportedChains?.length
    ? faucet.supportedChains
    : [faucet.chain];
};

const getFaviconUrl = (url: string, faviconDomain?: string) => {
  try {
    const faviconTarget = faviconDomain ?? url;
    return `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(
      faviconTarget
    )}&sz=64`;
  } catch {
    return "";
  }
};

const getInitials = (value: string) =>
  value
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

const getTokenSymbols = (token: string, limit?: number) => {
  const symbols = token
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean)
    .filter((symbol) => symbol !== "OR");

  const uniqueSymbols = Array.from(new Set(symbols));
  return typeof limit === "number"
    ? uniqueSymbols.slice(0, limit)
    : uniqueSymbols;
};

const getFaucetTokenSymbols = (faucet: FaucetEntry, limit?: number) => {
  const symbols = faucet.variants?.length
    ? unique(faucet.variants.map((variant) => variant.token))
    : getTokenSymbols(faucet.token);

  return typeof limit === "number" ? symbols.slice(0, limit) : symbols;
};

const getFaucetTokensForChain = (faucet: FaucetEntry, chain: string) => {
  if (!faucet.variants?.length) return getFaucetTokenSymbols(faucet);

  return unique(
    faucet.variants
      .filter((variant) => variant.chain === chain)
      .map((variant) => variant.token)
  );
};

const getFaucetVariantAmount = (
  faucet: FaucetEntry,
  variant?: ClaimVariant
) => {
  if (!variant) return faucet.amount;

  return (
    faucet.variants?.find(
      (faucetVariant) =>
        faucetVariant.chain === variant.chain &&
        faucetVariant.token === variant.token
    )?.amount ?? faucet.amount
  );
};

const getChainSortValue = (chain: string) =>
  preferredChainOrder.get(chain) ?? 1;

const getPrimarySortChain = (faucet: FaucetEntry, chainFilter = "all") => {
  const chains = getFaucetChains(faucet);
  if (chainFilter !== "all" && chains.includes(chainFilter)) return chainFilter;
  return chains[0] ?? faucet.chain;
};

const compareFaucetsByChain = (
  first: FaucetEntry,
  second: FaucetEntry,
  chainFilter = "all",
  ratingStats: FaucetRatingStats = {}
) => {
  const firstBottomRank = getFaucetFrictionRank(first) >= 1000;
  const secondBottomRank = getFaucetFrictionRank(second) >= 1000;

  if (firstBottomRank !== secondBottomRank) return firstBottomRank ? 1 : -1;

  const firstChain = getPrimarySortChain(first, chainFilter);
  const secondChain = getPrimarySortChain(second, chainFilter);
  const chainDelta =
    getChainSortValue(firstChain) - getChainSortValue(secondChain) ||
    firstChain.localeCompare(secondChain);

  if (chainDelta !== 0) return chainDelta;

  const firstRatingScore = ratingStats[first.id]?.score ?? 0.5;
  const secondRatingScore = ratingStats[second.id]?.score ?? 0.5;
  const ratingDelta = secondRatingScore - firstRatingScore;

  if (Math.abs(ratingDelta) > 0.001) return ratingDelta;

  const frictionDelta =
    getFaucetFrictionRank(first) - getFaucetFrictionRank(second);

  if (frictionDelta !== 0) return frictionDelta;

  const ratingCountDelta =
    (ratingStats[second.id]?.total ?? 0) - (ratingStats[first.id]?.total ?? 0);

  if (ratingCountDelta !== 0) return ratingCountDelta;

  return (
    first.provider.localeCompare(second.provider) ||
    first.name.localeCompare(second.name)
  );
};

const getTokenSortValue = (token: string) =>
  preferredTokenOrder.get(token) ?? 999;

const providerFrictionRanks: Record<string, number> = {
  "Google Cloud": 30,
  ETHGlobal: 35,
  GetBlock: 50,
  Tatum: 50,
  "Coinbase Developer Platform": 50,
  thirdweb: 50,
  Chainlink: 80,
  Chainstack: 85,
  "SepoliaETH.com": 1000,
};

const getFaucetFrictionRank = (faucet: FaucetEntry) => {
  const providerRank = providerFrictionRanks[faucet.provider];
  if (providerRank !== undefined) return providerRank;

  const requirement = faucet.requirement.toLowerCase();

  if (requirement.includes("no account")) return 10;
  if (requirement.includes("payment") || requirement.includes("buy")) {
    return 1000;
  }
  if (requirement.includes("api key")) return 85;
  if (
    requirement.includes("mainnet") ||
    requirement.includes("balance") ||
    requirement.includes("1 link")
  ) {
    return 75;
  }
  if (
    requirement.includes("account") ||
    requirement.includes("login") ||
    requirement.includes("email")
  ) {
    return 50;
  }
  if (
    requirement.includes("proof-of-work") ||
    requirement.includes("captcha")
  ) {
    return 25;
  }
  if (
    requirement.includes("wallet connect") ||
    requirement.includes("wallet address")
  ) {
    return 20;
  }
  return 30;
};

const addLocalRatingVote = (
  current: FaucetRatingStat | undefined,
  didWork: boolean
): FaucetRatingStat => {
  const total = (current?.total ?? 0) + 1;
  const worked = (current?.worked ?? 0) + (didWork ? 1 : 0);
  const failed = (current?.failed ?? 0) + (didWork ? 0 : 1);

  return {
    total,
    worked,
    failed,
    successRate: worked / total,
    score: (worked + 1) / (total + 2),
    lastRatedAt: new Date().toISOString(),
  };
};

const formatChainFilterLabel = (chain: string) =>
  chain
    .replace("OP Sepolia", "Optimism")
    .replace("Ethereum Devcon Sepolia", "Devcon")
    .replace("BNB Smart Chain Testnet", "BNB Testnet")
    .replace("Ethereum Sepolia", "Sepolia")
    .replace(" Sepolia", "")
    .replace(" Testnet", "")
    .replace("Fuji", "Fuji");

const formatTokenFilterLabel = (token: string) =>
  token === "NATIVE" ? "Native" : token === "CIRBTC" ? "cirBTC" : token;

const getClaimKey = (faucet: FaucetEntry, variant?: ClaimVariant) => {
  const chains = getFaucetChains(faucet);
  const tokens = getFaucetTokenSymbols(faucet);

  if (chains.length === 1 && tokens.length === 1) return faucet.id;

  const chain = variant?.chain ?? chains[0] ?? faucet.chain;
  const token = variant?.token ?? tokens[0] ?? faucet.token;

  return [faucet.id, chain, token].map(encodeURIComponent).join("::");
};

const getClaimRecord = (
  faucet: FaucetEntry,
  records: ClaimRecords,
  variant?: ClaimVariant
) => {
  const claimKey = getClaimKey(faucet, variant);
  return records[claimKey] ?? records[faucet.id];
};

const getExactClaimRecord = (
  faucet: FaucetEntry,
  records: ClaimRecords,
  variant: ClaimVariant
) => records[getClaimKey(faucet, variant)];

const getRecordRemainingMs = (record: ClaimRecord, now: number) => {
  if (!now) return 0;
  return record.claimedAt + record.cooldownHours * HOUR_MS - now;
};

const getRemainingMs = (
  faucet: FaucetEntry,
  records: ClaimRecords,
  now: number,
  variant?: ClaimVariant
) => {
  const record = getClaimRecord(faucet, records, variant);
  if (!record || !now) return 0;
  return getRecordRemainingMs(record, now);
};

const getClaimVariants = (
  faucet: FaucetEntry,
  chainFilter = "all",
  tokenFilter = "all"
) => {
  if (faucet.variants?.length) {
    return faucet.variants
      .map(({ chain, token }) => ({ chain, token }))
      .filter(
        (variant) =>
          (chainFilter === "all" || variant.chain === chainFilter) &&
          (tokenFilter === "all" || variant.token === tokenFilter)
      );
  }

  const faucetChains = getFaucetChains(faucet);
  const faucetTokens = getFaucetTokenSymbols(faucet);
  const chains =
    chainFilter !== "all" && faucetChains.includes(chainFilter)
      ? [chainFilter]
      : faucetChains;
  const tokens =
    tokenFilter !== "all" && faucetTokens.includes(tokenFilter)
      ? [tokenFilter]
      : faucetTokens;

  return chains.flatMap((chain) => tokens.map((token) => ({ chain, token })));
};

const getDefaultClaimVariant = (
  faucet: FaucetEntry,
  chainFilter = "all",
  tokenFilter = "all"
) =>
  getClaimVariants(faucet, chainFilter, tokenFilter)[0] ??
  getClaimVariants(faucet)[0] ?? {
    chain: getFaucetChains(faucet)[0] ?? faucet.chain,
    token: getFaucetTokenSymbols(faucet)[0] ?? faucet.token,
  };

const normalizeClaimVariant = (faucet: FaucetEntry, variant: ClaimVariant) => {
  const variants = getClaimVariants(faucet);
  const exactVariant = variants.find(
    (candidate) =>
      candidate.chain === variant.chain && candidate.token === variant.token
  );

  if (exactVariant) return exactVariant;

  return (
    variants.find((candidate) => candidate.chain === variant.chain) ??
    variants.find((candidate) => candidate.token === variant.token) ??
    getDefaultClaimVariant(faucet)
  );
};

const getRowRemainingMs = (
  faucet: FaucetEntry,
  records: ClaimRecords,
  now: number,
  chainFilter = "all",
  tokenFilter = "all"
) => {
  const variants = getClaimVariants(faucet, chainFilter, tokenFilter);
  if (variants.length === 0) return 0;

  const remainingTimes = variants.map((variant) =>
    getRemainingMs(faucet, records, now, variant)
  );

  if (remainingTimes.some((remainingMs) => remainingMs <= 0)) return 0;
  return Math.min(...remainingTimes);
};

const getClaimTooltipLabel = (
  faucet: FaucetEntry,
  records: ClaimRecords,
  now: number,
  chainFilter = "all",
  tokenFilter = "all"
) => {
  const variants = getClaimVariants(faucet, chainFilter, tokenFilter);
  const trackedVariants = variants
    .map((variant) => ({
      variant,
      record: getClaimRecord(faucet, records, variant),
      remainingMs: getRemainingMs(faucet, records, now, variant),
    }))
    .filter(({ record }) => record);

  if (trackedVariants.length === 0) return "No local claim saved";

  if (trackedVariants.length === 1) {
    const [{ variant, record }] = trackedVariants;
    return `${variant.chain} / ${formatTokenFilterLabel(
      variant.token
    )} claimed ${formatClaimedAt(record.claimedAt)}`;
  }

  const readyCount = trackedVariants.filter(
    ({ remainingMs }) => remainingMs <= 0
  ).length;

  if (readyCount > 0) {
    return `${readyCount} of ${trackedVariants.length} tracked claim variants ready`;
  }

  return `${trackedVariants.length} tracked claim variants; next ready in ${formatDuration(
    Math.min(...trackedVariants.map(({ remainingMs }) => remainingMs))
  )}`;
};

const getTrackedClaimVariants = (
  faucet: FaucetEntry,
  records: ClaimRecords,
  now: number,
  chainFilter = "all",
  tokenFilter = "all"
): TrackedClaimVariant[] => {
  const variants = getClaimVariants(faucet, chainFilter, tokenFilter);

  if (variants.length <= 1) return [];

  return variants.flatMap((variant) => {
    const record = getExactClaimRecord(faucet, records, variant);
    if (!record || getRecordRemainingMs(record, now) <= 0) return [];

    return [
      {
        key: getClaimKey(faucet, variant),
        variant,
        record,
      },
    ];
  });
};

const tokenLogoSources: Record<string, string> = {
  AVAX: "/tokenIcons/avax.png",
  BNB: "/tokenIcons/bnb.png",
  BTC: "/tokenIcons/btc.png",
  CBTC: "/tokenIcons/btc.png",
  CBBTC: "/tokenIcons/cbbtc.webp",
  CELO: "/chainIcons/celo.webp",
  CIRBTC: "/tokenIcons/btc.png",
  ETH: "/tokenIcons/eth.png",
  EURC: "/tokenIcons/eurc.png",
  FIL: "/chainIcons/filecoin.webp",
  FLOW: "/chainIcons/flow.webp",
  HYPE: "/chainIcons/hyperevm.svg",
  IP: "/chainIcons/story.webp",
  LINK: "/tokenIcons/link.png",
  MON: "/tokenIcons/mon.svg",
  MATIC: "/tokenIcons/pol.png",
  POL: "/tokenIcons/pol.png",
  USDC: "/tokenIcons/usdc.png",
  XPL: "/tokenIcons/xpl.svg",
  APE: "/chainIcons/apechain.webp",
  XDAI: "/chainIcons/gnosis.webp",
};

const logoSurfaceBg = "rgba(255,255,255,0.94)";
const logoSurfaceBorder = "rgba(255,255,255,0.28)";

const TokenLogo = ({
  symbol,
  chain,
  chains,
  index,
}: {
  symbol: string;
  chain: string;
  chains: string[];
  index: number;
}) => {
  const normalizedSymbol = symbol === "NATIVE" ? "NATIVE" : symbol;
  const iconSrc =
    normalizedSymbol === "NATIVE"
      ? getChainIcon(chains[index % chains.length] ?? chain)
      : tokenLogoSources[normalizedSymbol];

  return (
    <Flex
      align="center"
      justify="center"
      w="22px"
      h="22px"
      ml={index === 0 ? 0 : "-7px"}
      rounded="full"
      bg={iconSrc ? logoSurfaceBg : "bg.emphasis"}
      color={iconSrc ? "gray.900" : "text.primary"}
      border="2px solid"
      borderColor="bg.subtle"
      overflow="hidden"
      flexShrink={0}
      fontSize="10px"
      fontWeight="bold"
      boxShadow={iconSrc ? "inset 0 0 0 1px rgba(0,0,0,0.08)" : "none"}
    >
      {iconSrc ? (
        <Image src={iconSrc} alt="" w="100%" h="100%" objectFit="contain" />
      ) : (
        normalizedSymbol.slice(0, 1)
      )}
    </Flex>
  );
};

const TokenLogoStack = ({
  token,
  chain,
  chains,
  symbols,
}: {
  token: string;
  chain: string;
  chains: string[];
  symbols?: string[];
}) => {
  const tokenSymbols = symbols ?? getTokenSymbols(token, 3);
  const stackWidth =
    tokenSymbols.length > 0 ? 22 + (tokenSymbols.length - 1) * 15 : 22;

  return (
    <HStack spacing={0} w={`${stackWidth}px`} flexShrink={0}>
      {tokenSymbols.map((symbol, index) => (
        <TokenLogo
          key={symbol}
          symbol={symbol}
          chain={chain}
          chains={chains}
          index={index}
        />
      ))}
    </HStack>
  );
};

const ChainLogo = ({ chain, size = 20 }: { chain: string; size?: number }) => (
  <Image
    src={getChainIcon(chain)}
    alt=""
    w={`${size}px`}
    h={`${size}px`}
    rounded="full"
    bg={logoSurfaceBg}
    border="1px solid"
    borderColor={logoSurfaceBorder}
    boxShadow="inset 0 0 0 1px rgba(0,0,0,0.08)"
    objectFit="contain"
    flexShrink={0}
  />
);

const ChainLogoStack = ({ chains }: { chains: string[] }) => {
  const visibleChains = chains.slice(0, 4);
  const stackWidth =
    visibleChains.length > 0 ? 20 + (visibleChains.length - 1) * 14 : 20;

  return (
    <Tooltip label={chains.join(", ")}>
      <HStack spacing={0} w={`${stackWidth}px`} flexShrink={0}>
        {visibleChains.map((chain, index) => (
          <Box key={chain} ml={index === 0 ? 0 : "-6px"} flexShrink={0}>
            <ChainLogo chain={chain} />
          </Box>
        ))}
      </HStack>
    </Tooltip>
  );
};

const FilterRail = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <Flex align="center" gap={2} minW={0}>
    <Text
      color="text.tertiary"
      fontSize="11px"
      fontWeight="semibold"
      letterSpacing="0"
      textTransform="uppercase"
      w={{ base: "46px", md: "54px" }}
      flexShrink={0}
    >
      {label}
    </Text>
    <HStack
      spacing={1.5}
      overflowX="auto"
      flex="1"
      minW={0}
      sx={hiddenScrollbarSx}
    >
      {children}
    </HStack>
  </Flex>
);

const FilterPill = ({
  active,
  label,
  count,
  icon,
  title,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  icon?: ReactNode;
  title?: string;
  onClick: () => void;
}) => (
  <Button
    aria-pressed={active}
    title={title ?? label}
    variant="ghost"
    size="sm"
    h="28px"
    minW="fit-content"
    px={2.5}
    rounded="full"
    border="1px solid"
    borderColor={active ? "border.strong" : "border.subtle"}
    bg={active ? "bg.emphasis" : "transparent"}
    color={active ? "text.primary" : "text.secondary"}
    boxShadow={active ? "inset 0 0 0 1px rgba(232,65,66,0.26)" : "none"}
    fontSize="xs"
    fontWeight="medium"
    _hover={{
      bg: active ? "bg.emphasis" : "rgba(255,255,255,0.045)",
      color: "text.primary",
      borderColor: active ? "border.strong" : "border.default",
    }}
    _active={{ bg: "bg.emphasis" }}
    onClick={onClick}
  >
    <HStack spacing={1.5}>
      {icon}
      <Text as="span" whiteSpace="nowrap">
        {label}
      </Text>
      <Text as="span" color="text.tertiary" fontWeight="semibold">
        {count}
      </Text>
    </HStack>
  </Button>
);

const ChoicePill = ({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
}) => (
  <Button
    size="sm"
    h="30px"
    minW="fit-content"
    px={2.5}
    variant="ghost"
    rounded="full"
    border="1px solid"
    borderColor={active ? "border.strong" : "border.subtle"}
    bg={active ? "bg.emphasis" : "transparent"}
    color={active ? "text.primary" : "text.secondary"}
    fontSize="xs"
    fontWeight="medium"
    _hover={{
      bg: active ? "bg.emphasis" : "rgba(255,255,255,0.045)",
      color: "text.primary",
      borderColor: active ? "border.strong" : "border.default",
    }}
    onClick={onClick}
  >
    <HStack spacing={1.5}>
      {icon}
      <Text as="span" whiteSpace="nowrap">
        {label}
      </Text>
    </HStack>
  </Button>
);

const FilterTokenLogo = ({ symbol }: { symbol: string }) => (
  <Flex
    align="center"
    justify="center"
    w="18px"
    h="18px"
    rounded="full"
    bg={tokenLogoSources[symbol] ? logoSurfaceBg : "bg.emphasis"}
    color={tokenLogoSources[symbol] ? "gray.900" : "text.primary"}
    overflow="hidden"
    flexShrink={0}
    fontSize="9px"
    fontWeight="bold"
    boxShadow={
      tokenLogoSources[symbol] ? "inset 0 0 0 1px rgba(0,0,0,0.08)" : "none"
    }
  >
    {tokenLogoSources[symbol] ? (
      <Image
        src={tokenLogoSources[symbol]}
        alt=""
        w="100%"
        h="100%"
        objectFit="contain"
      />
    ) : (
      symbol.slice(0, 1)
    )}
  </Flex>
);

const AnimatedDuration = ({ remainingMs }: { remainingMs: number }) => {
  if (remainingMs <= 0) return <>Ready</>;

  const { days, hours, minutes, seconds } = getDurationParts(remainingMs);
  const twoDigits = { minimumIntegerDigits: 2 };

  return (
    <>
      {days > 0 && (
        <>
          <NumberFlow value={days} />d{" "}
        </>
      )}
      {(days > 0 || hours > 0) && (
        <>
          <NumberFlow value={hours} format={days > 0 ? twoDigits : undefined} />
          h{" "}
        </>
      )}
      {(days > 0 || hours > 0 || minutes > 0) && (
        <>
          <NumberFlow
            value={minutes}
            format={days > 0 || hours > 0 ? twoDigits : undefined}
          />
          m{" "}
        </>
      )}
      <NumberFlow
        value={seconds}
        format={days > 0 || hours > 0 || minutes > 0 ? twoDigits : undefined}
      />
      s
    </>
  );
};

const TimerPill = ({
  remainingMs,
  tooltipLabel,
}: {
  remainingMs: number;
  tooltipLabel: ReactNode;
}) => {
  const isReady = remainingMs <= 0;

  return (
    <Tooltip label={tooltipLabel}>
      <HStack
        spacing={1.5}
        px={2}
        h="26px"
        minW={isReady ? "76px" : "104px"}
        justify="center"
        rounded="full"
        border="1px solid"
        borderColor={isReady ? "rgba(74,222,128,0.24)" : "warning.border"}
        bg={isReady ? "rgba(74,222,128,0.07)" : "warning.bg"}
        color={isReady ? "success.text" : "warning.text"}
      >
        {isReady ? <CheckCircle2 size={13} /> : <Clock3 size={13} />}
        <Text
          fontSize="xs"
          fontWeight="semibold"
          whiteSpace="nowrap"
          fontFamily={isReady ? undefined : "mono"}
          sx={{ fontVariantNumeric: "tabular-nums" }}
        >
          <AnimatedDuration remainingMs={remainingMs} />
        </Text>
      </HStack>
    </Tooltip>
  );
};

const ClaimPill = ({
  faucet,
  records,
  now,
  chainFilter,
  tokenFilter,
}: {
  faucet: FaucetEntry;
  records: ClaimRecords;
  now: number;
  chainFilter: string;
  tokenFilter: string;
}) => (
  <TimerPill
    remainingMs={getRowRemainingMs(
      faucet,
      records,
      now,
      chainFilter,
      tokenFilter
    )}
    tooltipLabel={getClaimTooltipLabel(
      faucet,
      records,
      now,
      chainFilter,
      tokenFilter
    )}
  />
);

const FaucetLogo = ({
  url,
  provider,
  faviconDomain,
  size = 28,
}: {
  url: string;
  provider: string;
  faviconDomain?: string;
  size?: number;
}) => {
  const [hasError, setHasError] = useState(false);
  const faviconUrl = getFaviconUrl(url, faviconDomain);
  const imageSize = Math.max(18, size - 10);

  return (
    <Flex
      align="center"
      justify="center"
      w={`${size}px`}
      h={`${size}px`}
      rounded="md"
      bg="rgba(255,255,255,0.92)"
      border="1px solid"
      borderColor="border.subtle"
      boxShadow="inset 0 0 0 1px rgba(0,0,0,0.08)"
      overflow="hidden"
      flexShrink={0}
    >
      {hasError || !faviconUrl ? (
        <Text color="gray.800" fontSize="10px" fontWeight="bold">
          {getInitials(provider) || "F"}
        </Text>
      ) : (
        <Image
          src={faviconUrl}
          alt={`${provider} favicon`}
          w={`${imageSize}px`}
          h={`${imageSize}px`}
          rounded="sm"
          objectFit="cover"
          onError={() => setHasError(true)}
        />
      )}
    </Flex>
  );
};

const RatingVotes = ({ stat }: { stat?: FaucetRatingStat }) => {
  const worked = stat?.worked ?? 0;
  const failed = stat?.failed ?? 0;
  const hasWorked = worked > 0;
  const hasFailed = failed > 0;

  return (
    <Tooltip
      label={
        stat?.total ? `${worked} worked / ${failed} failed` : "No reports yet"
      }
      placement="top"
      hasArrow
    >
      <VStack
        spacing="3px"
        align="center"
        w={VOTE_RAIL_WIDTH}
        h="30px"
        justify="center"
        flexShrink={0}
        aria-label={`${worked} upvotes and ${failed} downvotes`}
      >
        <Box
          w="10px"
          h="6px"
          position="relative"
          _before={{
            content: '""',
            position: "absolute",
            inset: "1px 0 auto 0",
            mx: "auto",
            w: "7px",
            h: "7px",
            borderTop: "2px solid",
            borderLeft: "2px solid",
            borderColor: hasWorked ? "#5EE787" : "border.strong",
            transform: "rotate(45deg)",
            borderRadius: "1px",
            opacity: hasWorked ? 1 : 0.55,
          }}
        />
        <HStack spacing={0.5} justify="center" h="9px">
          <Text
            color={hasWorked ? "#5EE787" : "text.tertiary"}
            fontSize="9px"
            lineHeight="1"
            fontWeight="semibold"
            sx={{ fontVariantNumeric: "tabular-nums" }}
          >
            {worked}
          </Text>
          <Text color="text.tertiary" fontSize="9px" lineHeight="1">
            /
          </Text>
          <Text
            color={hasFailed ? "#F87171" : "text.tertiary"}
            fontSize="9px"
            lineHeight="1"
            fontWeight="semibold"
            sx={{ fontVariantNumeric: "tabular-nums" }}
          >
            {failed}
          </Text>
        </HStack>
        <Box
          w="10px"
          h="6px"
          position="relative"
          _before={{
            content: '""',
            position: "absolute",
            inset: "auto 0 1px 0",
            mx: "auto",
            w: "7px",
            h: "7px",
            borderRight: "2px solid",
            borderBottom: "2px solid",
            borderColor: hasFailed ? "#F87171" : "border.strong",
            transform: "rotate(45deg)",
            borderRadius: "1px",
            opacity: hasFailed ? 1 : 0.55,
          }}
        />
      </VStack>
    </Tooltip>
  );
};

const FaucetInfoIcon = ({ faucet }: { faucet: FaucetEntry }) => (
  <Tooltip
    label={
      <Box>
        <Text fontWeight="semibold" mb={1}>
          {faucet.requirement}
        </Text>
        <Text>{faucet.notes}</Text>
      </Box>
    }
    placement="top"
  >
    <Box as="span" color="text.tertiary" flexShrink={0}>
      <Info size={14} />
    </Box>
  </Tooltip>
);

const MobileHeaderMetaLine = ({ children }: { children: ReactNode }) => (
  <HStack
    spacing={1.25}
    justify="flex-end"
    maxW="100%"
    minW={0}
    overflow="hidden"
  >
    {children}
  </HStack>
);

const FaucetRow = ({
  faucet,
  ratingStat,
  records,
  now,
  chainFilter,
  tokenFilter,
  onOpen,
}: {
  faucet: FaucetEntry;
  ratingStat?: FaucetRatingStat;
  records: ClaimRecords;
  now: number;
  chainFilter: string;
  tokenFilter: string;
  onOpen: (faucet: FaucetEntry, variant?: ClaimVariant) => void;
}) => {
  const faucetChains = getFaucetChains(faucet);
  const chainLabel =
    faucetChains.length > 1 ? `${faucetChains.length} networks` : faucet.chain;
  const faucetTokenSymbols = getFaucetTokenSymbols(faucet);
  const visibleMobileTokens = faucetTokenSymbols.slice(0, 2);
  const hiddenMobileTokenCount = Math.max(
    0,
    faucetTokenSymbols.length - visibleMobileTokens.length
  );
  const mobileTokenLabel = `${visibleMobileTokens
    .map(formatTokenFilterLabel)
    .join(
      ", "
    )}${hiddenMobileTokenCount > 0 ? ` +${hiddenMobileTokenCount}` : ""}`;

  return (
    <Box
      display={{ base: "block", md: "grid" }}
      gridTemplateColumns={{
        md: TABLE_GRID_COLUMNS,
      }}
      gap={{ md: 4 }}
      alignItems="center"
      px={{ base: 3, md: 4 }}
      py={{ base: 3, md: 2.75 }}
      borderBottom="1px solid"
      borderColor="border.subtle"
      _last={{ borderBottom: "none" }}
      cursor="pointer"
      role="button"
      tabIndex={0}
      _hover={{ bg: "rgba(255,255,255,0.035)" }}
      _focusVisible={{
        outline: "none",
        boxShadow: "inset 0 0 0 1px var(--chakra-colors-primary-400)",
      }}
      onClick={() => onOpen(faucet)}
      aria-label={`Open ${faucet.provider} ${faucet.name}`}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(faucet);
        }
      }}
    >
      <Box display={{ base: "block", md: "none" }} minW={0}>
        <Flex align="flex-start" gap={2.5} minW={0}>
          <RatingVotes stat={ratingStat} />
          <FaucetLogo
            url={faucet.url}
            provider={faucet.provider}
            faviconDomain={faucet.faviconDomain}
            size={30}
          />
          <Box minW={0} flex="1">
            <HStack spacing={1.5} minW={0}>
              <Text
                color="text.primary"
                fontWeight="semibold"
                fontSize="sm"
                lineHeight="18px"
                noOfLines={1}
              >
                {faucet.provider}
              </Text>
              <FaucetInfoIcon faucet={faucet} />
            </HStack>
            <Text
              color="text.secondary"
              fontSize="xs"
              lineHeight="17px"
              mt={0.5}
              noOfLines={1}
            >
              {faucet.name}
            </Text>
          </Box>
          <VStack
            align="flex-end"
            spacing={1}
            minW="92px"
            maxW="42%"
            pt="1px"
            overflow="hidden"
            flexShrink={0}
          >
            <MobileHeaderMetaLine>
              <ChainLogoStack chains={faucetChains} />
              <Text
                color="text.secondary"
                fontSize="xs"
                noOfLines={1}
                textAlign="right"
              >
                {chainLabel}
              </Text>
            </MobileHeaderMetaLine>
            <MobileHeaderMetaLine>
              <TokenLogoStack
                token={faucet.token}
                chain={faucet.chain}
                chains={faucetChains}
                symbols={visibleMobileTokens}
              />
              <Text
                color="text.primary"
                fontSize="xs"
                noOfLines={1}
                textAlign="right"
              >
                {mobileTokenLabel}
              </Text>
            </MobileHeaderMetaLine>
          </VStack>
        </Flex>

        <HStack spacing={3} justify="center" mt={2.5} minW={0}>
          <ClaimPill
            faucet={faucet}
            records={records}
            now={now}
            chainFilter={chainFilter}
            tokenFilter={tokenFilter}
          />
          <Text
            color="text.tertiary"
            fontSize="xs"
            whiteSpace="nowrap"
            sx={{ fontVariantNumeric: "tabular-nums" }}
          >
            {faucet.cooldownHours}h recharge
          </Text>
        </HStack>
      </Box>

      <HStack display={{ base: "none", md: "flex" }} spacing={3} minW={0}>
        <RatingVotes stat={ratingStat} />
        <FaucetLogo
          url={faucet.url}
          provider={faucet.provider}
          faviconDomain={faucet.faviconDomain}
        />
        <Box minW={0}>
          <HStack spacing={2} minW={0}>
            <Text
              color="text.primary"
              fontWeight="semibold"
              fontSize="sm"
              noOfLines={1}
            >
              {faucet.provider}
            </Text>
            <FaucetInfoIcon faucet={faucet} />
          </HStack>
          <HStack spacing={2} mt={0.5} minW={0}>
            <Text color="text.secondary" fontSize="xs" noOfLines={1}>
              {faucet.name}
            </Text>
          </HStack>
        </Box>
      </HStack>

      <HStack display={{ base: "none", md: "flex" }} spacing={2} minW={0}>
        <ChainLogoStack chains={faucetChains} />
        <Text color="text.secondary" fontSize="sm" noOfLines={1}>
          {chainLabel}
        </Text>
      </HStack>

      <HStack display={{ base: "none", md: "flex" }} spacing={2} minW={0}>
        <TokenLogoStack
          token={faucet.token}
          chain={faucet.chain}
          chains={faucetChains}
          symbols={faucetTokenSymbols.slice(0, 3)}
        />
        <Box minW={0}>
          <Text color="text.primary" fontSize="sm" noOfLines={1}>
            {faucet.token}
          </Text>
          <Text color="text.tertiary" fontSize="xs" noOfLines={1}>
            {faucet.amount}
          </Text>
        </Box>
      </HStack>

      <HStack display={{ base: "none", md: "flex" }} spacing={2} minW={0}>
        <ClaimPill
          faucet={faucet}
          records={records}
          now={now}
          chainFilter={chainFilter}
          tokenFilter={tokenFilter}
        />
        <Text
          color="text.tertiary"
          fontSize="xs"
          whiteSpace="nowrap"
          w="28px"
          sx={{ fontVariantNumeric: "tabular-nums" }}
        >
          {faucet.cooldownHours}h
        </Text>
      </HStack>
    </Box>
  );
};

const ClaimVariantRow = ({
  faucet,
  trackedClaim,
  now,
  onOpen,
}: {
  faucet: FaucetEntry;
  trackedClaim: TrackedClaimVariant;
  now: number;
  onOpen: (faucet: FaucetEntry, variant?: ClaimVariant) => void;
}) => {
  const { variant, record } = trackedClaim;
  const remainingMs = getRecordRemainingMs(record, now);

  return (
    <Box
      display={{ base: "block", md: "grid" }}
      gridTemplateColumns={{
        md: TABLE_GRID_COLUMNS,
      }}
      gap={{ md: 4 }}
      alignItems="center"
      px={{ base: 3, md: 4 }}
      py={{ base: 2.75, md: 2.25 }}
      bg="rgba(255,255,255,0.012)"
      borderBottom="1px solid"
      borderColor="border.subtle"
      _last={{ borderBottom: "none" }}
      cursor="pointer"
      role="button"
      tabIndex={0}
      _hover={{ bg: "rgba(255,255,255,0.035)" }}
      _focusVisible={{
        outline: "none",
        boxShadow: "inset 0 0 0 1px var(--chakra-colors-primary-400)",
      }}
      onClick={() => onOpen(faucet, variant)}
      aria-label={`Open tracked ${formatTokenFilterLabel(variant.token)} claim for ${faucet.provider} on ${variant.chain}`}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(faucet, variant);
        }
      }}
    >
      <Box display={{ base: "block", md: "none" }} minW={0}>
        <Flex align="flex-start" gap={2.5} minW={0}>
          <Flex
            w="24px"
            h="30px"
            align="center"
            justify="center"
            flexShrink={0}
          >
            <Box
              w="12px"
              h="12px"
              borderLeft="1px solid"
              borderBottom="1px solid"
              borderColor="border.strong"
              transform="translateY(-3px)"
            />
          </Flex>
          <Box minW={0} flex="1">
            <Text
              color="text.primary"
              fontWeight="semibold"
              fontSize="sm"
              lineHeight="18px"
              noOfLines={1}
            >
              Tracked claim
            </Text>
            <Text
              color="text.secondary"
              fontSize="xs"
              lineHeight="17px"
              mt={0.5}
              noOfLines={1}
            >
              {formatTokenFilterLabel(variant.token)} /{" "}
              {getFaucetVariantAmount(faucet, variant)}
            </Text>
          </Box>
          <VStack
            align="flex-end"
            spacing={1}
            minW="92px"
            maxW="42%"
            pt="1px"
            overflow="hidden"
            flexShrink={0}
          >
            <MobileHeaderMetaLine>
              <ChainLogo chain={variant.chain} />
              <Text
                color="text.secondary"
                fontSize="xs"
                noOfLines={1}
                textAlign="right"
              >
                {variant.chain}
              </Text>
            </MobileHeaderMetaLine>
            <MobileHeaderMetaLine>
              <FilterTokenLogo symbol={variant.token} />
              <Text
                color="text.primary"
                fontSize="xs"
                noOfLines={1}
                textAlign="right"
              >
                {formatTokenFilterLabel(variant.token)}
              </Text>
            </MobileHeaderMetaLine>
          </VStack>
        </Flex>

        <HStack spacing={3} justify="center" mt={2.5} mb={0.75} minW={0}>
          <TimerPill
            remainingMs={remainingMs}
            tooltipLabel={`${variant.chain} / ${formatTokenFilterLabel(
              variant.token
            )} claimed ${formatClaimedAt(record.claimedAt)}`}
          />
          <Text
            color="text.tertiary"
            fontSize="xs"
            whiteSpace="nowrap"
            sx={{ fontVariantNumeric: "tabular-nums" }}
          >
            {record.cooldownHours}h recharge
          </Text>
        </HStack>
      </Box>

      <HStack display={{ base: "none", md: "flex" }} spacing={3} minW={0}>
        <Box w={VOTE_RAIL_WIDTH} flexShrink={0} />
        <Flex w="28px" h="28px" align="center" justify="center" flexShrink={0}>
          <Box
            w="14px"
            h="14px"
            borderLeft="1px solid"
            borderBottom="1px solid"
            borderColor="border.strong"
            transform="translateY(-4px)"
          />
        </Flex>
        <Box minW={0}>
          <Text
            color="text.primary"
            fontWeight="semibold"
            fontSize="sm"
            noOfLines={1}
          >
            Tracked claim
          </Text>
          <HStack spacing={1.5} mt={0.5} minW={0}>
            <FilterTokenLogo symbol={variant.token} />
            <Text color="text.secondary" fontSize="xs" noOfLines={1}>
              {formatTokenFilterLabel(variant.token)}
            </Text>
            <Text color="text.tertiary" fontSize="xs" noOfLines={1}>
              {getFaucetVariantAmount(faucet, variant)}
            </Text>
          </HStack>
        </Box>
      </HStack>

      <HStack display={{ base: "none", md: "flex" }} spacing={2} minW={0}>
        <ChainLogo chain={variant.chain} />
        <Text color="text.secondary" fontSize="sm" noOfLines={1}>
          {variant.chain}
        </Text>
      </HStack>

      <Box display={{ base: "none", md: "block" }} />

      <HStack display={{ base: "none", md: "flex" }} spacing={2} minW={0}>
        <TimerPill
          remainingMs={remainingMs}
          tooltipLabel={`${variant.chain} / ${formatTokenFilterLabel(
            variant.token
          )} claimed ${formatClaimedAt(record.claimedAt)}`}
        />
        <Text
          color="text.tertiary"
          fontSize="xs"
          whiteSpace="nowrap"
          w="28px"
          sx={{ fontVariantNumeric: "tabular-nums" }}
        >
          {record.cooldownHours}h
        </Text>
      </HStack>
    </Box>
  );
};

const FaucetPageClient = ({ initialChain }: { initialChain?: string }) => {
  const [records, setRecords] = useState<ClaimRecords>({});
  const [now, setNow] = useState(0);
  const [query, setQuery] = useState("");
  const [selectedChain, setSelectedChain] = useState(initialChain ?? "all");
  const [selectedToken, setSelectedToken] = useState("all");
  const [readyOnly, setReadyOnly] = useState(false);
  const [ratingStats, setRatingStats] = useState<FaucetRatingStats>({});
  const [selectedFaucet, setSelectedFaucet] = useState<FaucetEntry | null>(
    null
  );
  const [claimChain, setClaimChain] = useState("");
  const [claimToken, setClaimToken] = useState("");
  const [draftCooldown, setDraftCooldown] = useState(24);
  const [modalStep, setModalStep] = useState<ModalStep>("visit");
  const [openedFaucetUrl, setOpenedFaucetUrl] = useState(false);
  const [submittingAction, setSubmittingAction] =
    useState<SubmittingAction>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const selectChain = (chain: string) => {
    setSelectedChain(chain);

    const nextPath = getRuntimeFaucetPath(chain);
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, "", nextPath);
    }
  };

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const syncChainFromPath = () => {
      setSelectedChain(getChainFromPathname(window.location.pathname) ?? "all");
    };

    window.addEventListener("popstate", syncChainFromPath);

    return () => {
      window.removeEventListener("popstate", syncChainFromPath);
    };
  }, []);

  useEffect(() => {
    updateDocumentSeo(selectedChain);
  }, [selectedChain]);

  useEffect(() => {
    try {
      const rawRecords = window.localStorage.getItem(STORAGE_KEY);
      if (rawRecords) setRecords(JSON.parse(rawRecords) as ClaimRecords);
    } catch {
      setRecords({});
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const loadRatingStats = async () => {
      try {
        const response = await fetch("/api/faucet-ratings", {
          cache: "no-store",
        });
        if (!response.ok) return;

        const data = (await response.json()) as {
          ratings?: FaucetRatingStats;
        };

        if (!isCancelled && data.ratings) {
          setRatingStats(data.ratings);
        }
      } catch {}
    };

    loadRatingStats();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isOpen || !openedFaucetUrl || modalStep !== "visit") return;

    const showFeedbackStep = () => {
      if (document.visibilityState === "visible") setModalStep("feedback");
    };

    window.addEventListener("focus", showFeedbackStep);
    document.addEventListener("visibilitychange", showFeedbackStep);

    return () => {
      window.removeEventListener("focus", showFeedbackStep);
      document.removeEventListener("visibilitychange", showFeedbackStep);
    };
  }, [isOpen, modalStep, openedFaucetUrl]);

  const saveRecords = (nextRecords: ClaimRecords) => {
    setRecords(nextRecords);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecords));
  };

  const chains = useMemo(() => {
    const orderedChains = Array.from(
      new Set(faucets.flatMap((faucet) => getFaucetChains(faucet)))
    ).sort(
      (a, b) =>
        getChainSortValue(a) - getChainSortValue(b) || a.localeCompare(b)
    );

    return orderedChains;
  }, []);

  const chainCounts = useMemo(
    () =>
      faucets.reduce<Record<string, number>>((counts, faucet) => {
        getFaucetChains(faucet).forEach((chain) => {
          counts[chain] = (counts[chain] ?? 0) + 1;
        });
        return counts;
      }, {}),
    []
  );

  const tokens = useMemo(
    () =>
      Array.from(
        new Set(faucets.flatMap((faucet) => getFaucetTokenSymbols(faucet)))
      ).sort(
        (a, b) =>
          getTokenSortValue(a) - getTokenSortValue(b) || a.localeCompare(b)
      ),
    []
  );

  const tokenCounts = useMemo(
    () =>
      faucets.reduce<Record<string, number>>((counts, faucet) => {
        getFaucetTokenSymbols(faucet).forEach((token) => {
          counts[token] = (counts[token] ?? 0) + 1;
        });
        return counts;
      }, {}),
    []
  );

  const filteredFaucets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return faucets
      .filter((faucet) => {
        const faucetChains = getFaucetChains(faucet);
        const matchesChain =
          selectedChain === "all" || faucetChains.includes(selectedChain);
        const matchesToken =
          selectedToken === "all" ||
          getFaucetTokenSymbols(faucet).includes(selectedToken);
        const matchesQuery =
          normalizedQuery.length === 0 ||
          [
            faucet.name,
            faucet.provider,
            faucet.chain,
            faucetChains.join(" "),
            faucetChains.map(formatChainFilterLabel).join(" "),
            faucet.token,
            faucet.amount,
            faucet.variants
              ?.map(
                (variant) =>
                  `${variant.chain} ${variant.chainId ?? ""} ${variant.token} ${
                    variant.amount
                  }`
              )
              .join(" "),
            faucet.requirement,
            faucet.notes,
            faucet.tags.join(" "),
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery);
        const matchesReady =
          !readyOnly ||
          getRowRemainingMs(
            faucet,
            records,
            now,
            selectedChain,
            selectedToken
          ) <= 0;

        return matchesChain && matchesToken && matchesQuery && matchesReady;
      })
      .sort((first, second) =>
        compareFaucetsByChain(first, second, selectedChain, ratingStats)
      );
  }, [
    query,
    ratingStats,
    records,
    now,
    readyOnly,
    selectedChain,
    selectedToken,
  ]);

  const openClaimModal = (
    faucet: FaucetEntry,
    initialVariant?: ClaimVariant
  ) => {
    const variant =
      initialVariant ??
      getDefaultClaimVariant(faucet, selectedChain, selectedToken);

    setSelectedFaucet(faucet);
    setClaimChain(variant.chain);
    setClaimToken(variant.token);
    setDraftCooldown(
      getClaimRecord(faucet, records, variant)?.cooldownHours ??
        faucet.cooldownHours
    );
    setModalStep("visit");
    setOpenedFaucetUrl(false);
    onOpen();
  };

  const closeModal = () => {
    setOpenedFaucetUrl(false);
    setSubmittingAction(null);
    onClose();
  };

  const visitFaucet = () => {
    if (!selectedFaucet) return;

    setOpenedFaucetUrl(true);
    window.open(selectedFaucet.url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => {
      if (document.visibilityState === "visible") setModalStep("feedback");
    }, 800);
  };

  const updateClaimVariant = (nextVariant: ClaimVariant) => {
    if (!selectedFaucet) return;
    const normalizedVariant = normalizeClaimVariant(
      selectedFaucet,
      nextVariant
    );

    setClaimChain(normalizedVariant.chain);
    setClaimToken(normalizedVariant.token);
    setDraftCooldown(
      getClaimRecord(selectedFaucet, records, normalizedVariant)
        ?.cooldownHours ?? selectedFaucet.cooldownHours
    );
  };

  const saveClaimRecord = (
    faucet: FaucetEntry,
    variant: ClaimVariant,
    cooldownHours: number
  ) => {
    saveRecords({
      ...records,
      [getClaimKey(faucet, variant)]: {
        claimedAt: Date.now(),
        cooldownHours: Math.max(0.25, cooldownHours || faucet.cooldownHours),
        chain: variant.chain,
        token: variant.token,
      },
    });
  };

  const submitFaucetRating = async (
    faucet: FaucetEntry,
    variant: ClaimVariant,
    didWork: boolean,
    cooldownHours?: number
  ) => {
    setRatingStats((currentStats) => ({
      ...currentStats,
      [faucet.id]: addLocalRatingVote(currentStats[faucet.id], didWork),
    }));

    try {
      await fetch("/api/faucet-ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          faucetId: faucet.id,
          chain: variant.chain,
          token: variant.token,
          worked: didWork,
          cooldownHours,
        }),
      });
    } catch {}
  };

  const answerFaucetFeedback = async (didWork: boolean) => {
    if (!selectedFaucet || submittingAction) return;

    const variant = normalizeClaimVariant(selectedFaucet, {
      chain: claimChain,
      token: claimToken,
    });

    if (!didWork) {
      setSubmittingAction("no");
      try {
        await submitFaucetRating(selectedFaucet, variant, false);
      } finally {
        setSubmittingAction(null);
      }
      closeModal();
      return;
    }

    const variants = getClaimVariants(selectedFaucet);

    if (variants.length <= 1) {
      const singleVariant = variants[0] ?? variant;

      setSubmittingAction("yes");
      try {
        await submitFaucetRating(
          selectedFaucet,
          singleVariant,
          true,
          selectedFaucet.cooldownHours
        );
        saveClaimRecord(
          selectedFaucet,
          singleVariant,
          selectedFaucet.cooldownHours
        );
      } finally {
        setSubmittingAction(null);
      }
      closeModal();
      return;
    }

    setModalStep("claim");
  };

  const confirmClaim = async () => {
    if (!selectedFaucet || submittingAction) return;
    const variant = normalizeClaimVariant(selectedFaucet, {
      chain: claimChain,
      token: claimToken,
    });
    const cooldownHours = Math.max(
      0.25,
      draftCooldown || selectedFaucet.cooldownHours
    );

    setSubmittingAction("claim");
    try {
      await submitFaucetRating(selectedFaucet, variant, true, cooldownHours);
      saveClaimRecord(selectedFaucet, variant, cooldownHours);
    } finally {
      setSubmittingAction(null);
    }
    closeModal();
  };

  const clearClaim = () => {
    if (!selectedFaucet) return;
    const variant = { chain: claimChain, token: claimToken };
    const claimKey = getClaimKey(selectedFaucet, variant);

    const nextRecords = { ...records };
    delete nextRecords[claimKey];
    if (claimKey !== selectedFaucet.id) delete nextRecords[selectedFaucet.id];
    saveRecords(nextRecords);
    closeModal();
  };

  const resetFilters = () => {
    setQuery("");
    selectChain("all");
    setSelectedToken("all");
    setReadyOnly(false);
  };

  const selectedClaimChains = selectedFaucet
    ? getFaucetChains(selectedFaucet)
    : [];
  const selectedClaimTokens = selectedFaucet
    ? getFaucetTokensForChain(selectedFaucet, claimChain)
    : [];
  const selectedClaimVariant = { chain: claimChain, token: claimToken };
  const selectedClaimRecord = selectedFaucet
    ? getClaimRecord(selectedFaucet, records, selectedClaimVariant)
    : undefined;

  const pageHeading =
    selectedChain === "all"
      ? "Faucets"
      : `${getFaucetChainSeoName(selectedChain)} Faucets`;

  return (
    <Layout
      allowSticky
      maxW={{ base: "100%", xl: "1180px" }}
      minW={0}
      w="full"
      overflowX={{ base: "hidden", md: "visible" }}
      pb={10}
    >
      <Flex
        align={{ base: "start", md: "end" }}
        justify="space-between"
        gap={5}
        direction={{ base: "column", md: "row" }}
        mb={5}
      >
        <Heading
          as="h1"
          color="text.primary"
          fontSize={{ base: "3xl", md: "4xl" }}
          lineHeight={{ base: "38px", md: "46px" }}
          fontWeight="extrabold"
          letterSpacing="0"
        >
          {pageHeading}
        </Heading>
        <Box
          color="text.secondary"
          maxW={{ base: "full", md: "360px" }}
          textAlign={{ base: "left", md: "right" }}
        >
          <Text color="text.secondary" fontSize="sm" lineHeight="20px">
            Claim tokens from faucets{" "}
            <Box as="br" display={{ base: "none", md: "block" }} />
            and track your cooldowns per network and token.
          </Text>
        </Box>
      </Flex>

      <Box
        border="1px solid"
        borderColor="border.default"
        rounded="lg"
        p={3}
        mb={4}
      >
        <Flex
          gap={3}
          direction={{ base: "column", md: "row" }}
          align={{ base: "stretch", md: "center" }}
        >
          <InputGroup maxW={{ base: "full", md: "360px" }} h="34px">
            <InputLeftElement pointerEvents="none" h="34px" w="40px">
              <Search size={16} color="#71717A" />
            </InputLeftElement>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search faucets"
              bg="bg.base"
              borderColor="border.default"
              color="text.primary"
              h="34px"
              pl="40px"
              rounded="md"
              _placeholder={{ color: "text.tertiary" }}
            />
          </InputGroup>

          <Spacer display={{ base: "none", md: "block" }} />

          <HStack spacing={3} align="center">
            <Tooltip label="Only show faucets that are ready locally">
              <FormControl display="flex" alignItems="center" gap={2} w="auto">
                <Switch
                  size="sm"
                  isChecked={readyOnly}
                  onChange={(event) => setReadyOnly(event.target.checked)}
                  colorScheme="green"
                />
                <FormLabel
                  mb={0}
                  color="text.secondary"
                  fontSize="sm"
                  whiteSpace="nowrap"
                >
                  Ready
                </FormLabel>
              </FormControl>
            </Tooltip>
            <Button
              size="sm"
              variant="ghost"
              color="text.secondary"
              onClick={resetFilters}
            >
              Reset
            </Button>
          </HStack>
        </Flex>

        <VStack
          align="stretch"
          spacing={2}
          pt={3}
          mt={3}
          borderTop="1px solid"
          borderColor="border.subtle"
        >
          <FilterRail label="Chains">
            <FilterPill
              active={selectedChain === "all"}
              label="All"
              count={faucets.length}
              onClick={() => selectChain("all")}
            />

            {chains.map((chain) => (
              <FilterPill
                key={chain}
                active={selectedChain === chain}
                label={formatChainFilterLabel(chain)}
                title={chain}
                count={chainCounts[chain]}
                icon={<ChainLogo chain={chain} size={18} />}
                onClick={() => selectChain(chain)}
              />
            ))}
          </FilterRail>

          <FilterRail label="Tokens">
            <FilterPill
              active={selectedToken === "all"}
              label="All"
              count={faucets.length}
              onClick={() => setSelectedToken("all")}
            />

            {tokens.map((token) => (
              <FilterPill
                key={token}
                active={selectedToken === token}
                label={formatTokenFilterLabel(token)}
                title={token}
                count={tokenCounts[token]}
                icon={<FilterTokenLogo symbol={token} />}
                onClick={() => setSelectedToken(token)}
              />
            ))}
          </FilterRail>
        </VStack>
      </Box>

      <Box
        border="1px solid"
        borderColor="border.default"
        rounded="lg"
        bg="rgba(17,17,19,0.72)"
        overflow="hidden"
        maxW="100%"
        minW={0}
      >
        <Box
          display={{ base: "none", md: "grid" }}
          gridTemplateColumns={TABLE_GRID_COLUMNS}
          gap={4}
          px={4}
          py={2}
          borderBottom="1px solid"
          borderColor="border.default"
          color="text.tertiary"
          fontSize="xs"
          fontWeight="semibold"
        >
          <HStack spacing={3} minW={0}>
            <Box w={VOTE_RAIL_WIDTH} flexShrink={0} />
            <Text>Faucet</Text>
          </HStack>
          <Text>Chain</Text>
          <Text>Token</Text>
          <Text>Timer</Text>
        </Box>

        {filteredFaucets.length > 0 ? (
          filteredFaucets.map((faucet) => {
            const trackedClaims = getTrackedClaimVariants(
              faucet,
              records,
              now,
              selectedChain,
              selectedToken
            );

            return (
              <Fragment key={faucet.id}>
                <FaucetRow
                  faucet={faucet}
                  ratingStat={ratingStats[faucet.id]}
                  records={records}
                  now={now}
                  chainFilter={selectedChain}
                  tokenFilter={selectedToken}
                  onOpen={openClaimModal}
                />
                {trackedClaims.map((trackedClaim) => (
                  <ClaimVariantRow
                    key={trackedClaim.key}
                    faucet={faucet}
                    trackedClaim={trackedClaim}
                    now={now}
                    onOpen={openClaimModal}
                  />
                ))}
              </Fragment>
            );
          })
        ) : (
          <Box p={8} textAlign="center">
            <Heading as="h2" size="sm" color="text.primary" mb={2}>
              No faucets match those filters
            </Heading>
            <Text color="text.secondary" fontSize="sm" mb={4}>
              Clear the search or switch back to all categories.
            </Text>
            <Button size="sm" onClick={resetFilters}>
              Reset filters
            </Button>
          </Box>
        )}
      </Box>

      <Modal isOpen={isOpen} onClose={closeModal} isCentered>
        <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(8px)" />
        <ModalContent
          bg="bg.subtle"
          border="1px solid"
          borderColor="border.default"
          rounded="2xl"
          maxW={{
            base: "calc(100vw - 28px)",
            md: modalStep === "feedback" ? "440px" : "512px",
          }}
          boxShadow="0 24px 90px rgba(0,0,0,0.55)"
        >
          {modalStep !== "feedback" && (
            <ModalHeader color="text.primary">
              {modalStep === "visit" ? "Open faucet" : "Track claim"}
            </ModalHeader>
          )}
          <ModalCloseButton color="text.secondary" top={4} right={4} />
          <ModalBody
            pt={modalStep === "feedback" ? 6 : undefined}
            px={modalStep === "feedback" ? 6 : undefined}
            pb={modalStep === "feedback" ? 4 : undefined}
          >
            {selectedFaucet && (
              <VStack
                align="stretch"
                spacing={modalStep === "feedback" ? 5 : 4}
              >
                {modalStep === "feedback" && (
                  <Text
                    color="text.tertiary"
                    fontSize="11px"
                    fontWeight="semibold"
                    letterSpacing="0"
                    textTransform="uppercase"
                  >
                    Faucet result
                  </Text>
                )}

                <HStack spacing={3} minW={0}>
                  <FaucetLogo
                    url={selectedFaucet.url}
                    provider={selectedFaucet.provider}
                    faviconDomain={selectedFaucet.faviconDomain}
                    size={modalStep === "feedback" ? 44 : 40}
                  />
                  <Box minW={0}>
                    <Text
                      color="text.primary"
                      fontWeight="semibold"
                      fontSize={modalStep === "feedback" ? "xl" : "lg"}
                      lineHeight="1.25"
                      noOfLines={1}
                    >
                      {selectedFaucet.provider}
                    </Text>
                    <Text color="text.secondary" fontSize="sm" noOfLines={1}>
                      {selectedFaucet.name}
                    </Text>
                  </Box>
                </HStack>

                <Flex gap={4} wrap="wrap" align="center">
                  <HStack spacing={2} minW={0} color="text.secondary">
                    <ChainLogo chain={claimChain} size={20} />
                    <Text color="text.primary" fontSize="sm" noOfLines={1}>
                      {claimChain}
                    </Text>
                  </HStack>
                  <Box
                    display={{ base: "none", sm: "block" }}
                    w="1px"
                    h="16px"
                    bg="border.default"
                  />
                  <HStack spacing={2} minW={0} color="text.secondary">
                    <FilterTokenLogo symbol={claimToken} />
                    <Text color="text.primary" fontSize="sm" noOfLines={1}>
                      {formatTokenFilterLabel(claimToken)}
                    </Text>
                  </HStack>
                </Flex>

                {modalStep === "claim" && (
                  <Divider borderColor="border.default" />
                )}

                {modalStep === "claim" && (
                  <>
                    {(selectedClaimChains.length > 1 ||
                      selectedClaimTokens.length > 1) && (
                      <VStack align="stretch" spacing={4}>
                        {selectedClaimChains.length > 1 && (
                          <FormControl>
                            <FormLabel color="text.secondary">
                              Network
                            </FormLabel>
                            <HStack
                              spacing={2}
                              overflowX="auto"
                              sx={hiddenScrollbarSx}
                            >
                              {selectedClaimChains.map((chain) => (
                                <ChoicePill
                                  key={chain}
                                  active={claimChain === chain}
                                  label={formatChainFilterLabel(chain)}
                                  icon={<ChainLogo chain={chain} size={18} />}
                                  onClick={() =>
                                    updateClaimVariant({
                                      chain,
                                      token: claimToken,
                                    })
                                  }
                                />
                              ))}
                            </HStack>
                          </FormControl>
                        )}

                        {selectedClaimTokens.length > 1 && (
                          <FormControl>
                            <FormLabel color="text.secondary">Token</FormLabel>
                            <HStack
                              spacing={2}
                              overflowX="auto"
                              sx={hiddenScrollbarSx}
                            >
                              {selectedClaimTokens.map((token) => (
                                <ChoicePill
                                  key={token}
                                  active={claimToken === token}
                                  label={formatTokenFilterLabel(token)}
                                  icon={<FilterTokenLogo symbol={token} />}
                                  onClick={() =>
                                    updateClaimVariant({
                                      chain: claimChain,
                                      token,
                                    })
                                  }
                                />
                              ))}
                            </HStack>
                          </FormControl>
                        )}
                      </VStack>
                    )}

                    <FormControl>
                      <FormLabel color="text.secondary">
                        Recharge time in hours
                      </FormLabel>
                      <NumberInput
                        value={draftCooldown}
                        min={0.25}
                        step={0.25}
                        precision={2}
                        onChange={(_, valueAsNumber) =>
                          setDraftCooldown(
                            Number.isFinite(valueAsNumber)
                              ? valueAsNumber
                              : selectedFaucet.cooldownHours
                          )
                        }
                      >
                        <NumberInputField
                          bg="bg.base"
                          borderColor="border.default"
                          color="text.primary"
                        />
                      </NumberInput>
                      <FormHelperText color="text.tertiary">
                        Default for this faucet is{" "}
                        {selectedFaucet.cooldownHours}
                        h. Edit it if the faucet shows a different limit.
                      </FormHelperText>
                    </FormControl>

                    {selectedClaimRecord && (
                      <Box
                        border="1px solid"
                        borderColor="warning.border"
                        bg="warning.bg"
                        rounded="md"
                        p={3}
                      >
                        <Text
                          color="warning.text"
                          fontSize="sm"
                          fontWeight="semibold"
                        >
                          Current countdown:{" "}
                          {formatDuration(
                            getRemainingMs(
                              selectedFaucet,
                              records,
                              now,
                              selectedClaimVariant
                            )
                          )}
                        </Text>
                        <Text color="text.secondary" fontSize="sm">
                          Last saved claim:{" "}
                          {formatClaimedAt(selectedClaimRecord.claimedAt)}
                        </Text>
                      </Box>
                    )}
                  </>
                )}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter
            gap={3}
            px={modalStep === "feedback" ? 6 : undefined}
            pt={modalStep === "feedback" ? 4 : undefined}
            pb={modalStep === "feedback" ? 6 : undefined}
            borderTop={modalStep === "feedback" ? "1px solid" : undefined}
            borderColor="border.subtle"
          >
            {modalStep === "claim" && selectedFaucet && selectedClaimRecord && (
              <Button
                variant="ghost"
                color="text.secondary"
                onClick={clearClaim}
              >
                Clear
              </Button>
            )}
            {modalStep === "visit" ? (
              <>
                <Button
                  variant="ghost"
                  color="text.secondary"
                  onClick={closeModal}
                >
                  Cancel
                </Button>
                <Button
                  leftIcon={<ExternalLink size={16} />}
                  bg="custom.base"
                  color="white"
                  _hover={{ bg: "#d33435" }}
                  onClick={visitFaucet}
                >
                  Visit faucet
                </Button>
              </>
            ) : modalStep === "feedback" ? (
              <VStack w="full" spacing={2.5} align="center">
                <Text color="text.primary" fontSize="md" fontWeight="semibold">
                  Did it work?
                </Text>
                <HStack
                  spacing={1.5}
                  justify="center"
                  bg="rgba(255,255,255,0.035)"
                  border="1px solid"
                  borderColor="border.subtle"
                  rounded="full"
                  p={1}
                >
                  <Button
                    leftIcon={<XCircle size={16} />}
                    variant="ghost"
                    h="40px"
                    minW="116px"
                    rounded="full"
                    bg="rgba(239,68,68,0.12)"
                    color="#FCA5A5"
                    _hover={{
                      bg: "rgba(239,68,68,0.2)",
                      color: "#FECACA",
                    }}
                    _active={{ bg: "rgba(239,68,68,0.24)" }}
                    isLoading={submittingAction === "no"}
                    isDisabled={
                      Boolean(submittingAction) && submittingAction !== "no"
                    }
                    onClick={() => answerFaucetFeedback(false)}
                  >
                    No
                  </Button>
                  <Button
                    leftIcon={<CheckCircle2 size={16} />}
                    h="40px"
                    minW="116px"
                    rounded="full"
                    bg="#16A34A"
                    color="white"
                    _hover={{ bg: "#15803D" }}
                    _active={{ bg: "#166534" }}
                    isLoading={submittingAction === "yes"}
                    isDisabled={
                      Boolean(submittingAction) && submittingAction !== "yes"
                    }
                    onClick={() => answerFaucetFeedback(true)}
                  >
                    Yes
                  </Button>
                </HStack>
              </VStack>
            ) : (
              <>
                <Button
                  variant="ghost"
                  color="text.secondary"
                  onClick={closeModal}
                >
                  Cancel
                </Button>
                <Button
                  leftIcon={<TimerReset size={16} />}
                  bg="custom.base"
                  color="white"
                  _hover={{ bg: "#d33435" }}
                  isLoading={submittingAction === "claim"}
                  onClick={confirmClaim}
                >
                  Start countdown
                </Button>
              </>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Tooltip label="Add missing faucet" placement="left" hasArrow>
        <IconButton
          as="a"
          href={missingFaucetIssueUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Add missing faucet"
          icon={<Plus size={17} strokeWidth={2.3} />}
          position="fixed"
          right={{ base: 3.5, md: 5 }}
          bottom={{ base: 3.5, md: 5 }}
          zIndex={20}
          w={{ base: "38px", md: "40px" }}
          h={{ base: "38px", md: "40px" }}
          minW="auto"
          rounded="full"
          bg="custom.base"
          color="white"
          border="1px solid"
          borderColor="rgba(255,255,255,0.18)"
          boxShadow="0 10px 28px rgba(231,71,72,0.22), 0 8px 20px rgba(0,0,0,0.42)"
          _hover={{
            bg: "#d33435",
            transform: "translateY(-1px)",
            boxShadow:
              "0 14px 34px rgba(231,71,72,0.28), 0 10px 24px rgba(0,0,0,0.48)",
          }}
          _active={{ bg: "#b92b2c", transform: "translateY(0)" }}
        />
      </Tooltip>
    </Layout>
  );
};

export default FaucetPageClient;
