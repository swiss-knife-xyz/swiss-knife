"use client";

import {
  Badge,
  Box,
  Button,
  Divider,
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
import { ChevronDown, ChevronUp, ExternalLink, FileText } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Layout } from "@/components/Layout";
import type {
  TreasuryQuote,
  TreasuryQuotesResponse,
} from "@/lib/treasury-quotes";
import {
  ethTreasuryCompanies,
  ethereumOrgs,
  roleMap,
  sourceTrail,
  type EthTreasuryCompany,
  type EthereumOrg,
  type SourceLink,
} from "./data";

const ORG_ROW_COLUMNS =
  "minmax(285px,1.35fr) minmax(170px,0.7fr) minmax(290px,1.15fr) 168px";
const TREASURY_ROW_COLUMNS =
  "minmax(210px,0.95fr) 154px minmax(204px,1fr) minmax(245px,1.08fr) 232px";

const focusRing = {
  boxShadow: "0 0 0 1px var(--chakra-colors-primary-400)",
  outline: "none",
};

const TREASURY_QUOTES_STORAGE_KEY = "eth.sh:orgs:treasury-quotes:v2";
const TREASURY_QUOTES_CLIENT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const orgIds = ethereumOrgs.map((org) => org.id);
const orgById = new Map(ethereumOrgs.map((org) => [org.id, org]));
const treasuryOrgReferenceIds: Record<string, string> = {
  Ethlabs: "ethlabs",
  "Ethereum Institutional": "ethereum-institutional",
};

const getOrgAnchorHref = (orgId: string) => `#${orgId}`;

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function isUsableCachedQuotes(data: TreasuryQuotesResponse) {
  const cachedAtMs = Date.parse(data.cachedAt);
  return (
    Number.isFinite(cachedAtMs) &&
    Date.now() - cachedAtMs < TREASURY_QUOTES_CLIENT_MAX_AGE_MS
  );
}

function readCachedTreasuryQuotes(): TreasuryQuotesResponse | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(TREASURY_QUOTES_STORAGE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw) as TreasuryQuotesResponse;
    if (!data?.quotes || data.source !== "finnhub") return null;

    return isUsableCachedQuotes(data) ? data : null;
  } catch {
    return null;
  }
}

function writeCachedTreasuryQuotes(data: TreasuryQuotesResponse) {
  try {
    window.localStorage.setItem(
      TREASURY_QUOTES_STORAGE_KEY,
      JSON.stringify(data)
    );
  } catch {
    // Ignore storage failures; the server cache still protects the upstream API.
  }
}

function formatSignedPercent(value: number) {
  return `${value > 0 ? "+" : ""}${percentFormatter.format(value)}%`;
}

const logoSrcOverrides: Record<string, string> = {
  "ethereum-foundation": "/external/ethereum-foundation.svg",
  ethsystems: "/external/ethsystems.svg",
  "lido-labs-foundation": "/external/lido-labs-foundation.svg",
  "enterprise-ethereum-alliance": "/external/enterprise-ethereum-alliance.png",
  "ethereum-community-foundation":
    "/external/ethereum-community-foundation.svg",
  "european-ethereum-institute": "/external/european-ethereum-institute.svg",
};

const getFaviconUrl = (domain: string) =>
  `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

const getOrgLogoUrl = (org: EthereumOrg) =>
  logoSrcOverrides[org.id] ?? getFaviconUrl(org.logoDomain);

const getTreasuryLogoUrl = (company: EthTreasuryCompany) =>
  getFaviconUrl(company.logoDomain);

const OrgLogo = ({ org, size = 36 }: { org: EthereumOrg; size?: number }) => (
  <Box
    w={`${size}px`}
    h={`${size}px`}
    rounded="lg"
    bg="whiteAlpha.100"
    border="1px solid"
    borderColor="whiteAlpha.300"
    display="grid"
    placeItems="center"
    flexShrink={0}
    overflow="hidden"
  >
    <Image
      alt={`${org.name} logo`}
      src={getOrgLogoUrl(org)}
      boxSize={`${Math.max(size - 10, 22)}px`}
      rounded="md"
      objectFit="contain"
      fallback={
        <Text color="text.primary" fontSize="xs" fontWeight="bold">
          {org.shortName.slice(0, 3)}
        </Text>
      }
    />
  </Box>
);

const TreasuryLogo = ({
  company,
  size = 34,
}: {
  company: EthTreasuryCompany;
  size?: number;
}) => (
  <Box
    w={`${size}px`}
    h={`${size}px`}
    rounded="lg"
    bg="whiteAlpha.100"
    border="1px solid"
    borderColor="whiteAlpha.300"
    display="grid"
    placeItems="center"
    flexShrink={0}
    overflow="hidden"
  >
    <Image
      alt={`${company.name} logo`}
      src={getTreasuryLogoUrl(company)}
      boxSize={`${Math.max(size - 10, 22)}px`}
      rounded="md"
      objectFit="contain"
      fallback={
        <Text color="text.primary" fontSize="xs" fontWeight="bold">
          {company.shortName}
        </Text>
      }
    />
  </Box>
);

const SourceLinkPill = ({ source }: { source: SourceLink }) => (
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
    bg="whiteAlpha.100"
    color="whiteAlpha.800"
    border="1px solid"
    borderColor="whiteAlpha.200"
    fontSize="xs"
    fontWeight="medium"
    textDecoration="none"
    _hover={{
      color: "text.primary",
      bg: "whiteAlpha.200",
      textDecoration: "none",
    }}
    _focusVisible={focusRing}
  >
    {source.label}
    <ExternalLink size={12} />
  </ChakraLink>
);

const TickerPill = ({ company }: { company: EthTreasuryCompany }) => (
  <ChakraLink
    href={company.priceUrl}
    isExternal
    aria-label={`Track ${company.ticker} price`}
    display="inline-flex"
    alignItems="center"
    justifyContent="center"
    gap={1.5}
    w="104px"
    bg="rgba(59,130,246,0.12)"
    color="primary.300"
    border="1px solid"
    borderColor="rgba(59,130,246,0.22)"
    rounded="md"
    fontSize="11px"
    lineHeight="16px"
    px={2}
    py={0.5}
    textDecoration="none"
    _hover={{
      color: "primary.200",
      bg: "rgba(59,130,246,0.18)",
      textDecoration: "none",
    }}
    _focusVisible={focusRing}
  >
    <Text as="span" fontWeight="medium">
      {company.exchange}:
    </Text>
    <Text as="span" fontWeight="bold">
      {company.ticker}
    </Text>
    <ExternalLink size={10} />
  </ChakraLink>
);

const TreasuryQuoteSnapshot = ({ quote }: { quote?: TreasuryQuote }) => {
  if (!quote) return null;

  const changeColor =
    quote.change > 0
      ? "green.300"
      : quote.change < 0
        ? "red.300"
        : "text.tertiary";

  return (
    <HStack
      mt={1}
      w="104px"
      spacing={1.5}
      flexWrap="nowrap"
      whiteSpace="nowrap"
      justify="center"
    >
      <Text
        color="text.primary"
        fontSize="xs"
        fontWeight="semibold"
        lineHeight="16px"
      >
        {usdFormatter.format(quote.price)}
      </Text>
      <Text
        color={changeColor}
        fontSize="11px"
        fontWeight="semibold"
        lineHeight="16px"
      >
        {formatSignedPercent(quote.changesPercentage)}
      </Text>
      <Text
        color="text.tertiary"
        fontSize="10px"
        fontWeight="semibold"
        lineHeight="16px"
      >
        1D
      </Text>
    </HStack>
  );
};

const TreasuryCompanyRow = ({
  company,
  quote,
  onOrgAnchorClick,
}: {
  company: EthTreasuryCompany;
  quote?: TreasuryQuote;
  onOrgAnchorClick: (orgId: string) => void;
}) => {
  const ecosystemConnectionParts = company.ecosystemConnection.split(
    /(Ethereum Institutional|Ethlabs)/g
  );

  return (
    <Grid
      templateColumns={{ base: "1fr", md: TREASURY_ROW_COLUMNS }}
      gap={{ base: 3, md: 4 }}
      px={{ base: 4, md: 5 }}
      py={4}
      borderTop="1px solid"
      borderColor="border.default"
      alignItems={{ base: "start", md: "center" }}
    >
      <HStack spacing={3} minW={0} align="flex-start">
        <TreasuryLogo company={company} />
        <Box minW={0}>
          <HStack spacing={2} flexWrap="wrap">
            <Heading
              as="h3"
              color="text.primary"
              fontSize={{ base: "md", md: "md" }}
              lineHeight="22px"
              fontWeight="bold"
            >
              {company.name}
            </Heading>
            <ChakraLink
              href={company.website}
              isExternal
              aria-label={`${company.name} website`}
              display="inline-flex"
              alignItems="center"
              justifyContent="center"
              w="24px"
              h="24px"
              rounded="md"
              color="text.secondary"
              textDecoration="none"
              _hover={{
                color: "text.primary",
                bg: "whiteAlpha.100",
                textDecoration: "none",
              }}
              _focusVisible={focusRing}
            >
              <ExternalLink size={14} />
            </ChakraLink>
          </HStack>
          <ChakraLink
            href={company.twitter}
            isExternal
            display="inline-flex"
            alignItems="center"
            color="text.tertiary"
            fontSize="sm"
            mt={0.5}
            rounded="md"
            textDecoration="none"
            _hover={{ color: "text.primary", textDecoration: "none" }}
            _focusVisible={focusRing}
          >
            {company.handle}
          </ChakraLink>
        </Box>
      </HStack>

      <Box w="104px">
        <TickerPill company={company} />
        <TreasuryQuoteSnapshot quote={quote} />
      </Box>

      <Text color="text.secondary" fontSize="sm" lineHeight="20px">
        {company.treasuryRole}
      </Text>

      <Text color="text.secondary" fontSize="sm" lineHeight="20px">
        {ecosystemConnectionParts.map((part, index) => {
          const orgId = treasuryOrgReferenceIds[part];

          if (!orgId) return part;

          return (
            <ChakraLink
              key={`${part}-${index}`}
              href={getOrgAnchorHref(orgId)}
              color="primary.300"
              rounded="sm"
              textDecoration="none"
              onClick={() => onOrgAnchorClick(orgId)}
              _hover={{ color: "primary.200", textDecoration: "underline" }}
              _focusVisible={focusRing}
            >
              {part}
            </ChakraLink>
          );
        })}
      </Text>

      <Wrap spacing={2} justify="flex-start">
        {company.sources.map((source) => (
          <WrapItem key={source.href}>
            <SourceLinkPill source={source} />
          </WrapItem>
        ))}
      </Wrap>
    </Grid>
  );
};

const DetailList = ({ title, items }: { title: string; items: string[] }) => (
  <Box minW={0}>
    <Text color="text.primary" fontSize="sm" fontWeight="semibold" mb={2}>
      {title}
    </Text>
    <VStack
      as="ul"
      align="stretch"
      spacing={2}
      m={0}
      pl={0}
      listStyleType="none"
    >
      {items.map((item) => (
        <HStack key={item} as="li" align="flex-start" spacing={2}>
          <Box
            w="4px"
            h="4px"
            mt="8px"
            rounded="full"
            bg="whiteAlpha.500"
            flexShrink={0}
          />
          <Text color="whiteAlpha.800" fontSize="sm" lineHeight="20px">
            {item}
          </Text>
        </HStack>
      ))}
    </VStack>
  </Box>
);

const OrgRow = ({
  org,
  expanded,
  highlighted,
  onToggle,
}: {
  org: EthereumOrg;
  expanded: boolean;
  highlighted: boolean;
  onToggle: () => void;
}) => (
  <Box
    id={org.id}
    borderTop="1px solid"
    borderColor="border.default"
    bg={highlighted ? "rgba(59,130,246,0.12)" : "transparent"}
    boxShadow={
      highlighted
        ? "inset 3px 0 0 rgba(96,165,250,0.72)"
        : "inset 0 0 0 rgba(96,165,250,0)"
    }
    scrollMarginTop="96px"
    transition="background-color 0.7s ease-out, box-shadow 0.7s ease-out"
  >
    <Grid
      templateColumns={{ base: "1fr", md: ORG_ROW_COLUMNS }}
      gap={{ base: 3, md: 4 }}
      alignItems="center"
      px={{ base: 4, md: 5 }}
      py={4}
    >
      <HStack spacing={3} minW={0} align="flex-start">
        <OrgLogo org={org} />
        <Box minW={0}>
          <HStack spacing={2} flexWrap="wrap">
            <Heading
              as="h3"
              color="text.primary"
              fontSize={{ base: "md", md: "lg" }}
              lineHeight="24px"
              fontWeight="bold"
            >
              {org.name}
            </Heading>
            <ChakraLink
              href={org.website}
              isExternal
              aria-label={`${org.name} website`}
              display="inline-flex"
              alignItems="center"
              justifyContent="center"
              w="24px"
              h="24px"
              rounded="md"
              color="text.secondary"
              textDecoration="none"
              _hover={{
                color: "text.primary",
                bg: "whiteAlpha.100",
                textDecoration: "none",
              }}
              _focusVisible={focusRing}
            >
              <ExternalLink size={14} />
            </ChakraLink>
          </HStack>
          <ChakraLink
            href={org.twitter}
            isExternal
            display="inline-flex"
            alignItems="center"
            color="text.tertiary"
            fontSize="sm"
            mt={0.5}
            rounded="md"
            textDecoration="none"
            _hover={{ color: "text.primary", textDecoration: "none" }}
            _focusVisible={focusRing}
          >
            {org.handle}
          </ChakraLink>
        </Box>
      </HStack>

      <Box minW={0}>
        <Badge
          bg="rgba(59,130,246,0.12)"
          color="primary.300"
          border="1px solid"
          borderColor="rgba(59,130,246,0.22)"
          rounded="md"
          textTransform="none"
          fontSize="11px"
          lineHeight="16px"
          px={2}
          py={0.5}
        >
          {org.category}
        </Badge>
        <Text color="text.tertiary" fontSize="xs" mt={1.5} noOfLines={1}>
          {org.stage}
        </Text>
      </Box>

      <Text color="text.secondary" fontSize="sm" lineHeight="20px">
        {org.role}
      </Text>

      <Flex align="center" justify="flex-end" gap={2}>
        <Button
          size="sm"
          variant="outline"
          color="text.primary"
          borderColor="border.default"
          rightIcon={
            expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />
          }
          _hover={{ bg: "whiteAlpha.100", borderColor: "border.strong" }}
          _focusVisible={focusRing}
          onClick={onToggle}
        >
          Details
        </Button>
      </Flex>
    </Grid>

    {expanded && (
      <Box
        mx={{ base: 3, md: 4 }}
        mb={4}
        p={{ base: 4, md: 5 }}
        rounded="lg"
        bg="whiteAlpha.50"
        border="1px solid"
        borderColor="whiteAlpha.200"
      >
        <Text color="text.primary" fontSize="sm" lineHeight="20px" mb={4}>
          {org.summary}
        </Text>
        <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={5}>
          <DetailList title="Research notes" items={org.evidence} />
          <DetailList title="Workstreams" items={org.workstreams} />
          <DetailList title="Watch" items={org.watch} />
        </SimpleGrid>
        <Divider borderColor="whiteAlpha.200" my={4} />
        <Wrap spacing={2}>
          {org.sources.map((source) => (
            <WrapItem key={source.href}>
              <SourceLinkPill source={source} />
            </WrapItem>
          ))}
        </Wrap>
      </Box>
    )}
  </Box>
);

const CoverageMap = ({
  onOrgAnchorClick,
}: {
  onOrgAnchorClick: (orgId: string) => void;
}) => (
  <Box
    mt={5}
    border="1px solid"
    borderColor="border.default"
    rounded="lg"
    bg="bg.subtle"
    overflow="hidden"
  >
    <Box px={{ base: 4, md: 5 }} py={4}>
      <Box>
        <Heading as="h2" color="text.primary" fontSize="md" lineHeight="24px">
          Focus areas
        </Heading>
        <Text color="text.secondary" fontSize="sm" lineHeight="20px" mt={1}>
          How the directory groups the work across stewardship, adoption,
          infrastructure, tooling, institutions, policy, core funding, and
          public goods.
        </Text>
      </Box>
    </Box>

    <VStack align="stretch" spacing={0}>
      {roleMap.map((lane) => (
        <Grid
          key={lane.label}
          templateColumns={{ base: "1fr", md: "260px minmax(0,1fr)" }}
          gap={{ base: 2, md: 4 }}
          px={{ base: 4, md: 5 }}
          py={{ base: 3.5, md: 3 }}
          borderTop="1px solid"
          borderColor="border.default"
          alignItems={{ base: "start", md: "center" }}
        >
          <HStack spacing={2} flexWrap="wrap">
            <Text color="text.primary" fontSize="sm" fontWeight="semibold">
              {lane.label}
            </Text>
            {lane.orgIds.map((orgId) => {
              const org = orgById.get(orgId);
              if (!org) return null;

              return (
                <Tooltip
                  key={org.id}
                  label={org.name}
                  hasArrow
                  placement="top"
                  openDelay={250}
                >
                  <ChakraLink
                    href={getOrgAnchorHref(org.id)}
                    aria-label={`Jump to ${org.name}`}
                    display="inline-flex"
                    rounded="md"
                    textDecoration="none"
                    onClick={() => onOrgAnchorClick(org.id)}
                    _hover={{ textDecoration: "none" }}
                    _focusVisible={focusRing}
                  >
                    <Badge
                      rounded="md"
                      variant="subtle"
                      colorScheme="gray"
                      textTransform="none"
                      px={2}
                      cursor="pointer"
                      transition="background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease"
                      _hover={{
                        bg: "rgba(59,130,246,0.14)",
                        color: "primary.200",
                      }}
                    >
                      {org.shortName}
                    </Badge>
                  </ChakraLink>
                </Tooltip>
              );
            })}
          </HStack>
          <Text color="text.secondary" fontSize="sm" lineHeight="20px">
            {lane.description}
          </Text>
        </Grid>
      ))}
    </VStack>
  </Box>
);

const TreasuryCompanies = ({
  quotes,
  onOrgAnchorClick,
}: {
  quotes: TreasuryQuotesResponse["quotes"];
  onOrgAnchorClick: (orgId: string) => void;
}) => (
  <Box
    id="treasuries"
    border="1px solid"
    borderColor="border.default"
    rounded="lg"
    bg="bg.subtle"
    overflow="hidden"
    scrollMarginTop="96px"
  >
    <Box px={{ base: 4, md: 5 }} py={4}>
      <HStack spacing={2} flexWrap="wrap">
        <ChakraLink
          href="#treasuries"
          display="inline-flex"
          alignItems="center"
          rounded="md"
          color="text.primary"
          textDecoration="none"
          _hover={{ color: "primary.300", textDecoration: "none" }}
          _focusVisible={focusRing}
          sx={{
            "&:hover .anchor-hash, &:focus-visible .anchor-hash": {
              opacity: 0.8,
              transform: "translate(0, -50%)",
            },
          }}
        >
          <Heading
            as="h2"
            position="relative"
            fontSize={{ base: "lg", md: "xl" }}
            lineHeight={{ base: "26px", md: "28px" }}
          >
            ETH Treasury Companies
            <Text
              as="span"
              className="anchor-hash"
              color="primary.300"
              fontSize={{ base: "md", md: "lg" }}
              lineHeight="1"
              position="absolute"
              left="calc(100% + 6px)"
              top="50%"
              opacity={0}
              transform="translate(-2px, -50%)"
              transition="opacity 0.15s ease, transform 0.15s ease"
            >
              #
            </Text>
          </Heading>
        </ChakraLink>
      </HStack>
      <Text color="text.secondary" fontSize="sm" lineHeight="20px" mt={1}>
        Public companies with ETH treasury strategies and direct ecosystem
        connections.
      </Text>
    </Box>

    <Grid
      display={{ base: "none", md: "grid" }}
      templateColumns={TREASURY_ROW_COLUMNS}
      gap={4}
      px={5}
      py={2}
      borderTop="1px solid"
      borderColor="border.default"
      color="text.tertiary"
      fontSize="xs"
      fontWeight="semibold"
    >
      <Text>Company</Text>
      <Text>Ticker</Text>
      <Text>ETH role</Text>
      <Text>Ecosystem connection</Text>
      <Text>Links</Text>
    </Grid>

    <Box>
      {ethTreasuryCompanies.map((company) => (
        <TreasuryCompanyRow
          key={company.id}
          company={company}
          quote={quotes[company.ticker]}
          onOrgAnchorClick={onOrgAnchorClick}
        />
      ))}
    </Box>
  </Box>
);

const OrgsPage = () => {
  const [expandedOrgIds, setExpandedOrgIds] = useState<Set<string>>(
    () => new Set()
  );
  const [highlightedOrgId, setHighlightedOrgId] = useState<string | null>(null);
  const [treasuryQuotes, setTreasuryQuotes] =
    useState<TreasuryQuotesResponse | null>(null);
  const highlightTimeoutRef = useRef<number | null>(null);

  const allDetailsExpanded = orgIds.every((orgId) => expandedOrgIds.has(orgId));

  const triggerOrgHighlight = useCallback((orgId: string) => {
    if (!orgById.has(orgId)) return;

    if (highlightTimeoutRef.current) {
      window.clearTimeout(highlightTimeoutRef.current);
    }

    setHighlightedOrgId(orgId);
    highlightTimeoutRef.current = window.setTimeout(() => {
      setHighlightedOrgId((currentOrgId) =>
        currentOrgId === orgId ? null : currentOrgId
      );
      highlightTimeoutRef.current = null;
    }, 1000);
  }, []);

  useEffect(() => {
    const cachedQuotes = readCachedTreasuryQuotes();
    if (cachedQuotes) {
      setTreasuryQuotes(cachedQuotes);
    }

    const controller = new AbortController();

    fetch("/api/treasury-quotes", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: TreasuryQuotesResponse | null) => {
        if (!data?.quotes || data.source !== "finnhub") return;

        setTreasuryQuotes(data);
        writeCachedTreasuryQuotes(data);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      });

    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const highlightCurrentHash = () => {
      const orgId = window.location.hash.slice(1);
      triggerOrgHighlight(orgId);
    };

    highlightCurrentHash();
    window.addEventListener("hashchange", highlightCurrentHash);

    return () => {
      window.removeEventListener("hashchange", highlightCurrentHash);
    };
  }, [triggerOrgHighlight]);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  const toggleOrgDetails = (orgId: string) => {
    setExpandedOrgIds((current) => {
      const next = new Set(current);

      if (next.has(orgId)) {
        next.delete(orgId);
      } else {
        next.add(orgId);
      }

      return next;
    });
  };

  const toggleAllDetails = () => {
    setExpandedOrgIds((current) => {
      const next = new Set(current);

      if (allDetailsExpanded) {
        orgIds.forEach((orgId) => next.delete(orgId));
      } else {
        orgIds.forEach((orgId) => next.add(orgId));
      }

      return next;
    });
  };

  return (
    <Layout
      allowSticky
      maxW={{ base: "100%", xl: "1180px" }}
      minW={0}
      w="full"
      overflowX={{ base: "hidden", md: "visible" }}
      pb={10}
    >
      <Box mb={5}>
        <Heading
          as="h1"
          color="text.primary"
          fontSize={{ base: "3xl", md: "4xl" }}
          lineHeight={{ base: "38px", md: "46px" }}
          fontWeight="extrabold"
          letterSpacing="0"
        >
          Ethereum Orgs
        </Heading>
        <Text color="text.secondary" fontSize="sm" lineHeight="20px" mt={2}>
          Directory of Ethereum-aligned foundations, labs, guilds, collectives,
          and adoption groups.
        </Text>
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
        <Grid
          display={{ base: "none", md: "grid" }}
          templateColumns={ORG_ROW_COLUMNS}
          gap={4}
          px={5}
          py={2}
          color="text.tertiary"
          fontSize="xs"
          fontWeight="semibold"
        >
          <HStack spacing={2}>
            <Text>Organization</Text>
            <Badge
              colorScheme="gray"
              variant="subtle"
              rounded="md"
              textTransform="none"
              px={2}
            >
              {ethereumOrgs.length}
            </Badge>
          </HStack>
          <Text>Focus</Text>
          <Text>Role</Text>
          <Button
            size="xs"
            h="24px"
            px={2}
            ml="auto"
            variant="ghost"
            color="text.tertiary"
            fontSize="xs"
            fontWeight="semibold"
            rightIcon={
              allDetailsExpanded ? (
                <ChevronUp size={13} />
              ) : (
                <ChevronDown size={13} />
              )
            }
            aria-label={
              allDetailsExpanded ? "Collapse all details" : "Expand all details"
            }
            _hover={{ bg: "whiteAlpha.100", color: "text.primary" }}
            _focusVisible={focusRing}
            onClick={toggleAllDetails}
          >
            Details
          </Button>
        </Grid>

        <Box
          borderTop={{ base: "0", md: "1px solid" }}
          borderColor="border.default"
        >
          {ethereumOrgs.map((org) => (
            <OrgRow
              key={org.id}
              org={org}
              expanded={expandedOrgIds.has(org.id)}
              highlighted={highlightedOrgId === org.id}
              onToggle={() => toggleOrgDetails(org.id)}
            />
          ))}
        </Box>
      </Box>

      <CoverageMap onOrgAnchorClick={triggerOrgHighlight} />

      <Divider borderColor="border.default" my={5} />

      <TreasuryCompanies
        quotes={treasuryQuotes?.quotes ?? {}}
        onOrgAnchorClick={triggerOrgHighlight}
      />

      <Box
        mt={5}
        border="1px solid"
        borderColor="border.default"
        rounded="lg"
        bg="bg.subtle"
        p={{ base: 4, md: 5 }}
      >
        <HStack spacing={2} mb={3}>
          <FileText size={16} color="var(--chakra-colors-text-secondary)" />
          <Heading as="h2" color="text.primary" fontSize="md" lineHeight="24px">
            Sources
          </Heading>
        </HStack>
        <Wrap spacing={2}>
          {sourceTrail.map((source) => (
            <WrapItem key={source.href}>
              <SourceLinkPill source={source} />
            </WrapItem>
          ))}
        </Wrap>
      </Box>
    </Layout>
  );
};

export default OrgsPage;
