"use client";

import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  Heading,
  HStack,
  Image,
  Link as ChakraLink,
  SimpleGrid,
  Text,
  Tooltip,
  VStack,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import { ArrowUpRight } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Layout } from "@/components/Layout";
import type { LinkPreview } from "@/lib/linkPreview";
import {
  privacyProtocolGroups,
  privacyProtocols,
  type PrivacyProtocolEntry,
  type PrivacyProtocolSource,
  type PrivacyStatus,
} from "./data";

const TABLE_COLUMNS =
  "minmax(260px,1.05fr) minmax(210px,0.8fr) minmax(145px,0.55fr) minmax(205px,0.75fr) minmax(175px,0.65fr) minmax(190px,0.7fr)";
const TABLE_MIN_WIDTH = "1185px";

const focusRing = {
  outline: "none",
  boxShadow: "0 0 0 1px var(--chakra-colors-primary-400)",
};

const statusColorMap: Record<
  Exclude<PrivacyStatus, "Mainnet">,
  { color: string; bg: string; border: string }
> = {
  "Public testnet": {
    color: "blue.200",
    bg: "rgba(59,130,246,0.12)",
    border: "rgba(59,130,246,0.24)",
  },
};

type FeeTone = "best" | "ok" | "caution";

type FeeSummary = {
  deposit: string;
  withdrawal: string;
  transfer: string;
  wait: string;
  notes?: Partial<
    Record<"deposit" | "withdrawal" | "transfer" | "wait", string[]>
  >;
  tones: {
    deposit: FeeTone;
    withdrawal: FeeTone;
    transfer: FeeTone;
    wait: FeeTone;
  };
};

const feeSummaryByProtocolId: Record<string, FeeSummary> = {
  "tornado-cash": {
    deposit: "0%",
    withdrawal: "Gas or relayer quote",
    transfer: "Nova only:\ngas / relay",
    wait: "No wait",
    notes: {
      wait: [
        "No enforced protocol wait.",
        "Waiting longer before withdrawal can still improve anonymity because more deposits may enter the pool.",
      ],
    },
    tones: {
      deposit: "best",
      withdrawal: "caution",
      transfer: "caution",
      wait: "best",
    },
  },
  railgun: {
    deposit: "0.25%",
    withdrawal: "0.25% + relay",
    transfer: "0% protocol",
    wait: "POI check:\n1 hour",
    notes: {
      wait: [
        "New shields are pending for 1 hour in wallets using Proof of Innocence checks.",
        "During that window, the only action is unshielding back to the original shielding address; this gives list providers time to update risk data.",
      ],
    },
    tones: {
      deposit: "ok",
      withdrawal: "ok",
      transfer: "best",
      wait: "ok",
    },
  },
  "privacy-pools-v1": {
    deposit: "0% or 0.5%",
    withdrawal: "0% direct\nrelay cap 5-10%",
    transfer: "Not supported",
    wait: "ASP approval",
    notes: {
      deposit: [
        "0%: DAI, USD1, USDT, WBTC, wstETH, USDS, sUSDS, USDe, frxUSD, fxUSD, wOETH",
        "0.5%: ETH, USDC, BOLD",
      ],
      wait: [
        "ASP = Association Set Provider.",
        "It maintains approved deposit labels; only approved deposits can privately withdraw. Excluded deposits can ragequit publicly.",
        "Privacy Pools docs do not publish a fixed approval timeframe.",
      ],
    },
    tones: {
      deposit: "ok",
      withdrawal: "caution",
      transfer: "caution",
      wait: "ok",
    },
  },
  "privacy-pools-v2": {
    deposit: "0%",
    withdrawal: "Relayer quote",
    transfer: "Relayer quote",
    wait: "ASP approval\n+ registration",
    notes: {
      wait: [
        "ASP approval means 0xbow has approved the deposit label for private actions.",
        "No fixed approval timeframe is published for the V2 testnet.",
        "Registration is a one-time wallet setup so encrypted notes can be received and discovered.",
      ],
    },
    tones: {
      deposit: "best",
      withdrawal: "caution",
      transfer: "caution",
      wait: "ok",
    },
  },
  "veil-cash": {
    deposit: "0.3%",
    withdrawal: "0% extra fee",
    transfer: "0% extra fee",
    wait: "Instant or KYT:\n~15m",
    notes: {
      wait: [
        "KYT = Know Your Transaction screening.",
        "Verified users can enter instantly.",
        "For 0xbow screening, Veil docs say most checks finish in about 15 minutes; complex cases can take up to 5 days.",
        "A 6-hour holding-period flow applies, but cleared deposits can move forward before the full 6 hours.",
      ],
    },
    tones: {
      deposit: "ok",
      withdrawal: "best",
      transfer: "best",
      wait: "ok",
    },
  },
};

const feeToneStyles: Record<
  FeeTone,
  { color: string; bg: string; border: string }
> = {
  best: {
    color: "green.100",
    bg: "rgba(34,197,94,0.13)",
    border: "rgba(34,197,94,0.32)",
  },
  ok: {
    color: "yellow.100",
    bg: "rgba(234,179,8,0.14)",
    border: "rgba(234,179,8,0.3)",
  },
  caution: {
    color: "orange.100",
    bg: "rgba(249,115,22,0.14)",
    border: "rgba(249,115,22,0.32)",
  },
};

const feeLegendItems: Array<{ tone: FeeTone; label: string }> = [
  { tone: "best", label: "Best: 0% / no extra fee" },
  { tone: "ok", label: "Low fixed fee / known check" },
  { tone: "caution", label: "Variable / capped / limited" },
];

const getFaviconUrl = (domain: string) =>
  `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(
    `https://${domain}`
  )}&sz=128`;

const joinList = (items: string[]) => items.join(", ");

const compactList = (items: string[], count = 4) =>
  items.length > count
    ? `${items.slice(0, count).join(", ")} +${items.length - count}`
    : items.join(", ");

const getProtocolLabel = (protocol: PrivacyProtocolEntry) =>
  protocol.version ? `${protocol.name} ${protocol.version}` : protocol.name;

const chainIconMap: Array<[string, string]> = [
  ["Arbitrum", "arbitrum"],
  ["Avalanche", "avalanche"],
  ["Base", "base"],
  ["BNB", "bsc"],
  ["BSC", "bsc"],
  ["Ethereum", "ethereum"],
  ["Gnosis", "gnosis.webp"],
  ["OP ", "optimism"],
  ["Optimism", "optimism"],
  ["Polygon", "polygon"],
  ["Sepolia", "ethereum"],
];

const tokenLogoSources: Record<string, string> = {
  AVAX: "/tokenIcons/avax.png",
  BNB: "/tokenIcons/bnb.png",
  BTC: "/tokenIcons/btc.png",
  CBTC: "/tokenIcons/btc.png",
  CBBTC: "/tokenIcons/cbbtc.webp",
  CDAI: "/tokenIcons/cdai.png",
  DAI: "/tokenIcons/dai.png",
  ETH: "/tokenIcons/eth.png",
  MATIC: "/tokenIcons/pol.png",
  POL: "/tokenIcons/pol.png",
  SUSDS: "/tokenIcons/susds.png",
  USDC: "/tokenIcons/usdc.png",
  USDS: "/tokenIcons/usds.webp",
  USDT: "/tokenIcons/usdt.png",
  WBTC: "/tokenIcons/btc.png",
  WETH: "/tokenIcons/eth.png",
  WSTETH: "/tokenIcons/wsteth.png",
  XDAI: "/chainIcons/gnosis.webp",
};

const logoSurfaceBg = "rgba(255,255,255,0.94)";
const logoSurfaceBorder = "rgba(255,255,255,0.28)";

const getChainIcon = (chain: string) => {
  const match = chainIconMap.find(([name]) => chain.includes(name));
  if (!match) return "/icon.png";
  const iconFile = match[1].includes(".") ? match[1] : `${match[1]}.svg`;
  return `/chainIcons/${iconFile}`;
};

const getAssetSymbol = (asset: string) => asset.replace(/[^a-z0-9]/gi, "");

const getAssetFallbackLabel = (asset: string) => {
  if (/ERC-20/i.test(asset)) return "20";
  if (/ERC-721|NFT/i.test(asset)) return "NFT";
  if (/other listed/i.test(asset)) return "+";
  const compactAsset = getAssetSymbol(asset);
  return compactAsset.slice(0, 2).toUpperCase() || "?";
};

const hasTokenLogo = (asset: string) =>
  Boolean(tokenLogoSources[getAssetSymbol(asset).toUpperCase()]);

const getFeeSummary = (protocol: PrivacyProtocolEntry) =>
  feeSummaryByProtocolId[protocol.id] ?? {
    deposit: protocol.depositFee,
    withdrawal: protocol.withdrawalFee,
    transfer: protocol.transferFee,
    wait: protocol.waitTime,
    tones: {
      deposit: "caution",
      withdrawal: "caution",
      transfer: "caution",
      wait: "caution",
    },
  };

const StatusBadge = ({ status }: { status: PrivacyStatus }) => {
  if (status === "Mainnet") return null;

  const colors = statusColorMap[status];

  return (
    <Badge
      bg={colors.bg}
      color={colors.color}
      border="1px solid"
      borderColor={colors.border}
      rounded="md"
      textTransform="none"
      fontSize="11px"
      lineHeight="16px"
      px={2}
      py={0.5}
      whiteSpace="nowrap"
    >
      {status}
    </Badge>
  );
};

const ProtocolLogo = ({
  protocol,
  size = 38,
}: {
  protocol: PrivacyProtocolEntry;
  size?: number;
}) => {
  const [hasError, setHasError] = useState(false);
  const hasCustomLogoBg = Boolean(protocol.logoBg);

  return (
    <Flex
      align="center"
      justify="center"
      w={`${size}px`}
      h={`${size}px`}
      rounded="md"
      bg={protocol.logoBg ?? "rgba(255,255,255,0.94)"}
      border="1px solid"
      borderColor={
        hasCustomLogoBg ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.18)"
      }
      boxShadow={
        hasCustomLogoBg
          ? "inset 0 0 0 1px rgba(255,255,255,0.08)"
          : `inset 0 0 0 2px ${protocol.accent}26`
      }
      overflow="hidden"
      flexShrink={0}
    >
      {hasError ? (
        <Text
          color={hasCustomLogoBg ? "whiteAlpha.900" : "gray.900"}
          fontSize="11px"
          fontWeight="bold"
        >
          {protocol.name.slice(0, 2).toUpperCase()}
        </Text>
      ) : (
        <Image
          src={getFaviconUrl(protocol.logoDomain)}
          alt={`${protocol.name} logo`}
          boxSize={`${Math.max(size - 12, 22)}px`}
          rounded="sm"
          objectFit="contain"
          onError={() => setHasError(true)}
        />
      )}
    </Flex>
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
    <HStack spacing={0} w={`${stackWidth}px`} flexShrink={0}>
      {visibleChains.map((chain, index) => (
        <Box key={chain} ml={index === 0 ? 0 : "-6px"} flexShrink={0}>
          <ChainLogo chain={chain} />
        </Box>
      ))}
    </HStack>
  );
};

const TokenLogo = ({ asset, index }: { asset: string; index: number }) => {
  const symbol = getAssetSymbol(asset).toUpperCase();
  const iconSrc = tokenLogoSources[symbol];

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
      fontSize="9px"
      fontWeight="bold"
      boxShadow={iconSrc ? "inset 0 0 0 1px rgba(0,0,0,0.08)" : "none"}
    >
      {iconSrc ? (
        <Image src={iconSrc} alt="" w="100%" h="100%" objectFit="contain" />
      ) : (
        getAssetFallbackLabel(asset)
      )}
    </Flex>
  );
};

const TokenLogoStack = ({ assets }: { assets: string[] }) => {
  const visibleAssets = assets.filter(hasTokenLogo).slice(0, 4);
  if (visibleAssets.length === 0) return null;

  const stackWidth =
    visibleAssets.length > 0 ? 22 + (visibleAssets.length - 1) * 15 : 22;

  return (
    <HStack spacing={0} w={`${stackWidth}px`} flexShrink={0}>
      {visibleAssets.map((asset, index) => (
        <TokenLogo key={`${asset}-${index}`} asset={asset} index={index} />
      ))}
    </HStack>
  );
};

const ChainAssetSummary = ({
  protocol,
  chainLimit = 2,
  assetLimit = 3,
}: {
  protocol: PrivacyProtocolEntry;
  chainLimit?: number;
  assetLimit?: number;
}) => (
  <VStack align="stretch" spacing={1.5} minW={0}>
    <Tooltip label={protocol.networks.join(", ")}>
      <Flex align="center" gap={2} minW={0} cursor="default">
        <ChainLogoStack chains={protocol.networks} />
        <Text
          color="text.primary"
          fontSize="sm"
          fontWeight="semibold"
          noOfLines={2}
        >
          {compactList(protocol.networks, chainLimit)}
        </Text>
      </Flex>
    </Tooltip>
    <Tooltip label={protocol.assets.join(", ")}>
      <Flex align="center" gap={2} minW={0} cursor="default">
        <TokenLogoStack assets={protocol.assets} />
        <Text color="text.tertiary" fontSize="xs" noOfLines={1}>
          {compactList(protocol.assets, assetLimit)}
        </Text>
      </Flex>
    </Tooltip>
  </VStack>
);

const SourceLinkPill = ({ source }: { source: PrivacyProtocolSource }) => (
  <ChakraLink
    href={source.href}
    isExternal
    display="inline-flex"
    alignItems="center"
    gap={1.5}
    minH="28px"
    px={2.5}
    py={1}
    rounded="md"
    bg="rgba(255,255,255,0.055)"
    color="whiteAlpha.800"
    border="1px solid"
    borderColor="whiteAlpha.200"
    fontSize="xs"
    fontWeight="medium"
    textDecoration="none"
    _hover={{
      color: "text.primary",
      bg: "rgba(255,255,255,0.1)",
      textDecoration: "none",
    }}
    _focusVisible={focusRing}
  >
    {source.label}
    <ArrowUpRight size={12} />
  </ChakraLink>
);

const TagPill = ({ children }: { children: ReactNode }) => (
  <Box
    as="span"
    display="inline-flex"
    alignItems="center"
    h="24px"
    px={2}
    rounded="md"
    border="1px solid"
    borderColor="border.subtle"
    bg="rgba(255,255,255,0.04)"
    color="text.secondary"
    fontSize="11px"
    fontWeight="medium"
    whiteSpace="nowrap"
  >
    {children}
  </Box>
);

const DetailBlock = ({ label, value }: { label: string; value: ReactNode }) => (
  <Box minW={0}>
    <Text color="text.tertiary" fontSize="11px" fontWeight="semibold" mb={1}>
      {label}
    </Text>
    <Box color="text.secondary" fontSize="sm" lineHeight="20px">
      {value}
    </Box>
  </Box>
);

const FeeNoteTooltip = ({
  children,
  note,
}: {
  children: ReactNode;
  note?: string[];
}) => {
  if (!note?.length) return <>{children}</>;

  return (
    <Tooltip
      label={
        <VStack align="stretch" spacing={1}>
          {note.map((line) => (
            <Text key={line} fontSize="sm" lineHeight="20px">
              {line}
            </Text>
          ))}
        </VStack>
      }
      placement="top"
      hasArrow
      maxW="360px"
    >
      <Box as="span" display="inline-flex" cursor="help">
        {children}
      </Box>
    </Tooltip>
  );
};

const FeeCell = ({
  value,
  tone,
  note,
}: {
  value: string;
  tone: FeeTone;
  note?: string[];
}) => {
  const colors = feeToneStyles[tone];

  return (
    <FeeNoteTooltip note={note}>
      <Box
        as="span"
        display="inline-flex"
        alignItems="center"
        justifyContent="center"
        maxW="100%"
        minH="30px"
        px={2.5}
        py={1}
        rounded="md"
        bg={colors.bg}
        border="1px solid"
        borderColor={colors.border}
        color={colors.color}
        fontSize="sm"
        lineHeight="18px"
        fontWeight="semibold"
        textAlign="center"
      >
        <Text as="span" overflowWrap="anywhere" whiteSpace="pre-line">
          {value}
        </Text>
      </Box>
    </FeeNoteTooltip>
  );
};

const FeeLegend = () => (
  <Wrap spacing={2} mb={3}>
    {feeLegendItems.map((item) => {
      const colors = feeToneStyles[item.tone];

      return (
        <WrapItem key={item.tone}>
          <HStack
            spacing={2}
            minH="28px"
            px={2.5}
            py={1}
            rounded="md"
            bg={colors.bg}
            border="1px solid"
            borderColor={colors.border}
            color={colors.color}
          >
            <Box boxSize="7px" rounded="full" bg={colors.color} />
            <Text fontSize="xs" fontWeight="semibold" lineHeight="16px">
              {item.label}
            </Text>
          </HStack>
        </WrapItem>
      );
    })}
  </Wrap>
);

const ProtocolHeading = ({
  protocol,
  showProvider = true,
}: {
  protocol: PrivacyProtocolEntry;
  showProvider?: boolean;
}) => (
  <HStack spacing={3} minW={0} align="flex-start">
    <ProtocolLogo protocol={protocol} />
    <Box minW={0}>
      <HStack spacing={2} flexWrap="wrap">
        <Heading
          as="h3"
          color="text.primary"
          fontSize="md"
          lineHeight="22px"
          fontWeight="bold"
        >
          {getProtocolLabel(protocol)}
        </Heading>
        <StatusBadge status={protocol.status} />
      </HStack>
      {showProvider && (
        <Text color="text.tertiary" fontSize="xs" mt={1} noOfLines={1}>
          {protocol.provider}
        </Text>
      )}
    </Box>
  </HStack>
);

const TableHeaderCell = ({ children }: { children: ReactNode }) => (
  <Box
    role="columnheader"
    px={4}
    py={3}
    color="text.tertiary"
    fontSize="11px"
    fontWeight="semibold"
    textTransform="uppercase"
    letterSpacing="0"
  >
    {children}
  </Box>
);

const ProtocolTableRow = ({ protocol }: { protocol: PrivacyProtocolEntry }) => {
  const summary = getFeeSummary(protocol);

  return (
    <Grid
      role="row"
      templateColumns={TABLE_COLUMNS}
      alignItems="center"
      borderTop="1px solid"
      borderColor="border.subtle"
      _hover={{ bg: "rgba(255,255,255,0.025)" }}
    >
      <Box role="cell" px={4} py={4} minW={0}>
        <Flex align="flex-start" justify="space-between" gap={3}>
          <ProtocolHeading protocol={protocol} />
          <Button
            as={ChakraLink}
            href={protocol.url}
            isExternal
            size="sm"
            variant="outline"
            borderColor="border.default"
            color="text.primary"
            minW="34px"
            h="34px"
            px={0}
            aria-label={`Open ${getProtocolLabel(protocol)}`}
            textDecoration="none"
            _hover={{
              bg: "rgba(255,255,255,0.08)",
              borderColor: "border.strong",
              textDecoration: "none",
            }}
            _focusVisible={focusRing}
          >
            <ArrowUpRight size={14} />
          </Button>
        </Flex>
      </Box>
      <Box role="cell" px={4} py={4} minW={0}>
        <ChainAssetSummary protocol={protocol} />
      </Box>
      <Box role="cell" px={4} py={4} minW={0}>
        <FeeCell
          value={summary.deposit}
          tone={summary.tones.deposit}
          note={summary.notes?.deposit}
        />
      </Box>
      <Box role="cell" px={4} py={4} minW={0}>
        <FeeCell
          value={summary.withdrawal}
          tone={summary.tones.withdrawal}
          note={summary.notes?.withdrawal}
        />
      </Box>
      <Box role="cell" px={4} py={4} minW={0}>
        <FeeCell
          value={summary.transfer}
          tone={summary.tones.transfer}
          note={summary.notes?.transfer}
        />
      </Box>
      <Box role="cell" px={4} py={4} minW={0}>
        <FeeCell
          value={summary.wait}
          tone={summary.tones.wait}
          note={summary.notes?.wait}
        />
      </Box>
    </Grid>
  );
};

const MobileProtocolCard = ({
  protocol,
}: {
  protocol: PrivacyProtocolEntry;
}) => {
  const summary = getFeeSummary(protocol);

  return (
    <Box
      rounded="lg"
      bg="rgba(255,255,255,0.04)"
      border="1px solid"
      borderColor="border.subtle"
      p={4}
    >
      <Flex align="flex-start" justify="space-between" gap={3}>
        <ProtocolHeading protocol={protocol} />
        <Button
          as={ChakraLink}
          href={protocol.url}
          isExternal
          size="sm"
          variant="outline"
          borderColor="border.default"
          color="text.primary"
          minW="38px"
          px={0}
          aria-label={`Open ${getProtocolLabel(protocol)}`}
          textDecoration="none"
          _hover={{
            bg: "rgba(255,255,255,0.08)",
            borderColor: "border.strong",
            textDecoration: "none",
          }}
          _focusVisible={focusRing}
        >
          <ArrowUpRight size={15} />
        </Button>
      </Flex>

      <Box mt={4}>
        <ChainAssetSummary protocol={protocol} assetLimit={4} />
      </Box>

      <SimpleGrid columns={2} spacing={2.5} mt={4}>
        <DetailBlock
          label="Deposit"
          value={
            <FeeCell
              value={summary.deposit}
              tone={summary.tones.deposit}
              note={summary.notes?.deposit}
            />
          }
        />
        <DetailBlock
          label="Withdraw"
          value={
            <FeeCell
              value={summary.withdrawal}
              tone={summary.tones.withdrawal}
              note={summary.notes?.withdrawal}
            />
          }
        />
        <DetailBlock
          label="Transfer"
          value={
            <FeeCell
              value={summary.transfer}
              tone={summary.tones.transfer}
              note={summary.notes?.transfer}
            />
          }
        />
        <DetailBlock
          label="Wait"
          value={
            <FeeCell
              value={summary.wait}
              tone={summary.tones.wait}
              note={summary.notes?.wait}
            />
          }
        />
      </SimpleGrid>
    </Box>
  );
};

const FeeComparisonTable = () => (
  <Box>
    <FeeLegend />

    <Box
      display={{ base: "none", md: "block" }}
      rounded="lg"
      bg="rgba(255,255,255,0.032)"
      border="1px solid"
      borderColor="border.subtle"
      overflowX="auto"
      role="table"
      aria-label="Privacy protocol fee comparison"
    >
      <Box minW={TABLE_MIN_WIDTH}>
        <Grid
          role="row"
          templateColumns={TABLE_COLUMNS}
          bg="rgba(255,255,255,0.05)"
          borderBottom="1px solid"
          borderColor="border.subtle"
        >
          <TableHeaderCell>Protocol</TableHeaderCell>
          <TableHeaderCell>Chains / Assets</TableHeaderCell>
          <TableHeaderCell>Deposit</TableHeaderCell>
          <TableHeaderCell>Withdraw</TableHeaderCell>
          <TableHeaderCell>In-pool transfer</TableHeaderCell>
          <TableHeaderCell>Wait / approval</TableHeaderCell>
        </Grid>
        {privacyProtocols.map((protocol) => (
          <ProtocolTableRow key={protocol.id} protocol={protocol} />
        ))}
      </Box>
    </Box>

    <VStack display={{ base: "flex", md: "none" }} align="stretch" spacing={3}>
      {privacyProtocols.map((protocol) => (
        <MobileProtocolCard key={protocol.id} protocol={protocol} />
      ))}
    </VStack>
  </Box>
);

const ProtocolDetails = ({ protocol }: { protocol: PrivacyProtocolEntry }) => (
  <Box
    borderTop="1px solid"
    borderColor="border.subtle"
    pt={4}
    _first={{ borderTop: "0", pt: 0 }}
  >
    <ProtocolHeading protocol={protocol} />
    <Text color="text.secondary" fontSize="sm" lineHeight="20px" mt={3}>
      {protocol.bestFor}
    </Text>

    <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={4} mt={4}>
      <DetailBlock label="Networks" value={joinList(protocol.networks)} />
      <DetailBlock label="Assets" value={joinList(protocol.assets)} />
      <DetailBlock label="Amount model" value={protocol.amountModel} />
      <DetailBlock label="Deposit fee" value={protocol.depositFee} />
      <DetailBlock label="Withdraw fee" value={protocol.withdrawalFee} />
      <DetailBlock label="Transfer fee" value={protocol.transferFee} />
      <DetailBlock label="Wait / approval" value={protocol.waitTime} />
      <DetailBlock label="Transfer model" value={protocol.transferModel} />
      <DetailBlock label="Privacy model" value={protocol.privacyModel} />
      <DetailBlock label="Cryptography" value={protocol.cryptography} />
      <DetailBlock label="Screening / compliance" value={protocol.compliance} />
      <DetailBlock label="Custody" value={protocol.custody} />
    </SimpleGrid>

    <Box mt={4}>
      <DetailBlock label="User caveat" value={protocol.userCaveat} />
    </Box>

    <Box mt={4}>
      <Text color="text.tertiary" fontSize="11px" fontWeight="semibold" mb={2}>
        Sources
      </Text>
      <Wrap spacing={1.5}>
        {protocol.sources.map((source) => (
          <WrapItem key={source.href}>
            <SourceLinkPill source={source} />
          </WrapItem>
        ))}
      </Wrap>
    </Box>
  </Box>
);

const DetailsSection = () => (
  <Box id="details" mt={10} scrollMarginTop="88px">
    <Flex
      align={{ base: "flex-start", md: "center" }}
      justify="space-between"
      gap={3}
      direction={{ base: "column", md: "row" }}
      mb={3}
    >
      <Box>
        <Heading
          as="h2"
          color="text.primary"
          fontSize={{ base: "xl", md: "2xl" }}
          lineHeight="32px"
          fontWeight="bold"
        >
          Details and sources
        </Heading>
        <Text color="text.secondary" fontSize="sm" lineHeight="20px" mt={1}>
          Expanded notes stay here so the table remains the primary view.
        </Text>
      </Box>
    </Flex>

    <Accordion allowMultiple>
      <VStack align="stretch" spacing={3}>
        {privacyProtocolGroups.map((group) => (
          <AccordionItem
            key={group.id}
            rounded="lg"
            bg="rgba(255,255,255,0.032)"
            border="1px solid"
            borderColor="border.subtle"
            overflow="hidden"
          >
            <h3>
              <AccordionButton
                px={{ base: 4, md: 5 }}
                py={4}
                _hover={{ bg: "rgba(255,255,255,0.04)" }}
                _focusVisible={focusRing}
              >
                <Flex align="center" gap={3} flex="1" minW={0}>
                  <ProtocolLogo protocol={group.entries[0]} size={34} />
                  <Box flex="1" textAlign="left" minW={0}>
                    <HStack spacing={2} flexWrap="wrap">
                      <Text
                        color="text.primary"
                        fontSize="md"
                        fontWeight="bold"
                      >
                        {group.name}
                      </Text>
                      {group.entries.length > 1 && (
                        <TagPill>{group.entries.length} versions</TagPill>
                      )}
                    </HStack>
                    <Text color="text.secondary" fontSize="sm" mt={1}>
                      {group.description}
                    </Text>
                  </Box>
                </Flex>
                <AccordionIcon color="text.secondary" />
              </AccordionButton>
            </h3>
            <AccordionPanel px={{ base: 4, md: 5 }} pb={5}>
              <VStack align="stretch" spacing={4}>
                {group.entries.map((protocol) => (
                  <ProtocolDetails key={protocol.id} protocol={protocol} />
                ))}
              </VStack>
            </AccordionPanel>
          </AccordionItem>
        ))}
      </VStack>
    </Accordion>
  </Box>
);

const ExternalDashboardMedia = ({ dashboard }: { dashboard: LinkPreview }) => {
  const [hasImageError, setHasImageError] = useState(false);
  const showImage = dashboard.image && !hasImageError;

  return (
    <Box
      aspectRatio="1.91 / 1"
      bg="rgba(255,255,255,0.045)"
      borderBottom="1px solid"
      borderColor="border.subtle"
      overflow="hidden"
      position="relative"
    >
      {showImage ? (
        <Image
          src={dashboard.image ?? undefined}
          alt=""
          w="100%"
          h="100%"
          objectFit="cover"
          onError={() => setHasImageError(true)}
        />
      ) : (
        <Flex
          h="100%"
          align="center"
          justify="center"
          direction="column"
          gap={3}
          px={5}
          bg="linear-gradient(135deg, rgba(255,255,255,0.075), rgba(255,255,255,0.018))"
        >
          {dashboard.favicon && (
            <Image
              src={dashboard.favicon}
              alt=""
              boxSize="42px"
              rounded="md"
              bg="rgba(20,54,42,0.92)"
              border="1px solid"
              borderColor="rgba(125,226,209,0.28)"
              boxShadow="inset 0 0 0 1px rgba(255,255,255,0.08)"
              p={1.5}
            />
          )}
          <Text
            color="text.primary"
            fontSize="sm"
            fontWeight="bold"
            lineHeight="18px"
            textAlign="center"
            noOfLines={2}
          >
            {dashboard.title}
          </Text>
        </Flex>
      )}
    </Box>
  );
};

const ExternalDashboardCard = ({ dashboard }: { dashboard: LinkPreview }) => (
  <ChakraLink
    href={dashboard.url}
    isExternal
    display="block"
    h="100%"
    textDecoration="none"
    _hover={{ textDecoration: "none" }}
    _focusVisible={focusRing}
  >
    <Box
      h="100%"
      rounded="lg"
      bg="rgba(255,255,255,0.04)"
      border="1px solid"
      borderColor="border.subtle"
      overflow="hidden"
      transition="border-color 160ms ease, background 160ms ease"
      _hover={{
        bg: "rgba(255,255,255,0.06)",
        borderColor: "border.default",
      }}
    >
      <ExternalDashboardMedia dashboard={dashboard} />
      <VStack align="stretch" spacing={3} p={4}>
        <Flex align="flex-start" justify="space-between" gap={3}>
          <Box minW={0}>
            <Text
              color="text.primary"
              fontSize="md"
              fontWeight="bold"
              lineHeight="22px"
              noOfLines={2}
            >
              {dashboard.title}
            </Text>
            <Text color="text.tertiary" fontSize="xs" mt={1} noOfLines={1}>
              {dashboard.hostname}
            </Text>
          </Box>
          <Flex
            align="center"
            justify="center"
            boxSize="30px"
            rounded="md"
            border="1px solid"
            borderColor="border.subtle"
            color="text.primary"
            flexShrink={0}
          >
            <ArrowUpRight size={14} />
          </Flex>
        </Flex>

        {dashboard.description && (
          <Text
            color="text.secondary"
            fontSize="sm"
            lineHeight="20px"
            noOfLines={3}
          >
            {dashboard.description}
          </Text>
        )}
      </VStack>
    </Box>
  </ChakraLink>
);

const ExternalDashboardsSection = ({
  dashboards,
}: {
  dashboards: LinkPreview[];
}) => (
  <Box mt={10}>
    <Box mb={3}>
      <Heading
        as="h2"
        color="text.primary"
        fontSize={{ base: "xl", md: "2xl" }}
        lineHeight="32px"
        fontWeight="bold"
      >
        External Dashboards
      </Heading>
      <Text color="text.secondary" fontSize="sm" lineHeight="20px" mt={1}>
        Live ecosystem views for privacy flows, balances, and adoption.
      </Text>
    </Box>

    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
      {dashboards.map((dashboard) => (
        <ExternalDashboardCard key={dashboard.url} dashboard={dashboard} />
      ))}
    </SimpleGrid>
  </Box>
);

const PrivacyPageClient = ({
  externalDashboards,
}: {
  externalDashboards: LinkPreview[];
}) => {
  return (
    <Layout
      allowSticky
      maxW={{ base: "100%", xl: "1240px" }}
      minW={0}
      w="full"
      overflowX={{ base: "hidden", md: "visible" }}
      pb={12}
    >
      <Flex
        align={{ base: "flex-start", lg: "flex-end" }}
        justify="space-between"
        gap={4}
        direction={{ base: "column", lg: "row" }}
        mb={5}
      >
        <Box maxW="760px">
          <Heading
            as="h1"
            color="text.primary"
            fontSize={{ base: "3xl", md: "4xl" }}
            lineHeight={{ base: "38px", md: "46px" }}
            fontWeight="extrabold"
            letterSpacing="0"
          >
            Privacy Protocols
          </Heading>
          <Text color="text.secondary" fontSize="sm" lineHeight="21px" mt={2}>
            Fee-first comparison of Ethereum privacy tools. Gas and relayer
            quotes can change by chain and wallet.
          </Text>
        </Box>

        <Button
          as={ChakraLink}
          href="#details"
          size="sm"
          variant="outline"
          borderColor="border.default"
          color="text.primary"
          textDecoration="none"
          _hover={{
            bg: "rgba(255,255,255,0.08)",
            borderColor: "border.strong",
            textDecoration: "none",
          }}
          _focusVisible={focusRing}
        >
          Details
        </Button>
      </Flex>

      <FeeComparisonTable />

      <HStack spacing={2} flexWrap="wrap" mt={3}>
        <TagPill>Gas is separate unless noted</TagPill>
        <TagPill>Relayer quotes can vary</TagPill>
        <TagPill>Privacy Pools V2 is Sepolia only</TagPill>
      </HStack>

      <DetailsSection />

      <ExternalDashboardsSection dashboards={externalDashboards} />
    </Layout>
  );
};

export default PrivacyPageClient;
