"use client";

import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  IconButton,
  Image,
  Input,
  InputGroup,
  InputLeftElement,
  Link as ChakraLink,
  Spacer,
  Text,
  Tooltip,
  VStack,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import {
  Check,
  Copy,
  ExternalLink,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react";
import { ReactNode, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import {
  aiToolTypeOrder,
  categoryOrder,
  skillResources,
  type AiToolType,
  type SkillResource,
  type SkillResourceCategory,
} from "./data";

const TABLE_GRID_COLUMNS =
  "minmax(300px,1.08fr) minmax(146px,0.55fr) minmax(232px,0.9fr) minmax(340px,1.35fr) 48px";
const LLMS_TXT_URL = "https://skills.eth.sh/llms.txt";
const missingSkillIssueBody = [
  "### Skill / tool URL",
  "",
  "https://",
  "",
  "### Name",
  "",
  "",
  "### Provider",
  "",
  "",
  "### Type",
  "",
  "Skill / MCP / CLI / Wallet / Model / Plugin / API",
  "",
  "### Category",
  "",
  "DeFi / Data / Wallet / Commerce / Trading / NFT / Cross-chain / Security / Developer / Infrastructure / Model",
  "",
  "### Install or usage",
  "",
  "",
  "### Description",
  "",
  "",
  "### Notes",
  "",
].join("\n");
const missingSkillIssueUrl = `https://github.com/swiss-knife-xyz/swiss-knife/issues/new?${new URLSearchParams(
  {
    title: "[ADD Skill] ",
    body: missingSkillIssueBody,
    labels: "skills",
  }
).toString()}`;

const hiddenScrollbarSx = {
  scrollbarWidth: "none",
  msOverflowStyle: "none",
  "&::-webkit-scrollbar": {
    display: "none",
  },
} as const;

const focusRing = {
  outline: "none",
  boxShadow: "0 0 0 1px var(--chakra-colors-primary-400)",
};

const getInitials = (value: string) =>
  value
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

const getFaviconUrl = (domain: string) =>
  `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(
    `https://${domain}`
  )}&sz=128`;

const formatResourceUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    const path = parsed.pathname.replace(/\/$/, "");
    return `${host}${path}`;
  } catch {
    return url;
  }
};

const getCountMap = <T extends string>(
  values: readonly T[],
  getValues: (resource: SkillResource) => readonly T[]
) =>
  Object.fromEntries(
    values.map((value) => [
      value,
      skillResources.filter((resource) => getValues(resource).includes(value))
        .length,
    ])
  ) as Record<T, number>;

const ResourceLogo = ({
  resource,
  size = 34,
}: {
  resource: SkillResource;
  size?: number;
}) => {
  const [hasError, setHasError] = useState(false);
  const faviconUrl = getFaviconUrl(resource.logoDomain);
  const imageSize = Math.max(22, size - 10);
  const hasCustomLogoBg = Boolean(resource.logoBg);

  return (
    <Flex
      align="center"
      justify="center"
      w={`${size}px`}
      h={`${size}px`}
      rounded="md"
      bg={resource.logoBg ?? "rgba(255,255,255,0.93)"}
      border="1px solid"
      borderColor={hasCustomLogoBg ? "rgba(255,255,255,0.14)" : "border.subtle"}
      boxShadow={
        hasCustomLogoBg
          ? "inset 0 0 0 1px rgba(255,255,255,0.08)"
          : "inset 0 0 0 1px rgba(0,0,0,0.08)"
      }
      overflow="hidden"
      flexShrink={0}
    >
      {hasError || !faviconUrl ? (
        <Text
          color={hasCustomLogoBg ? "whiteAlpha.900" : "gray.800"}
          fontSize="10px"
          fontWeight="bold"
        >
          {getInitials(resource.name) || "AI"}
        </Text>
      ) : (
        <Image
          src={faviconUrl}
          alt={`${resource.name} logo`}
          w={`${imageSize}px`}
          h={`${imageSize}px`}
          rounded="sm"
          objectFit="contain"
          onError={() => setHasError(true)}
        />
      )}
    </Flex>
  );
};

const TypePill = ({ children }: { children: ReactNode }) => (
  <Box
    as="span"
    display="inline-flex"
    alignItems="center"
    h="24px"
    px={2}
    rounded="full"
    border="1px solid"
    borderColor="rgba(232,65,66,0.32)"
    bg="rgba(232,65,66,0.09)"
    color="text.primary"
    fontSize="11px"
    fontWeight="semibold"
    whiteSpace="nowrap"
  >
    {children}
  </Box>
);

const TagPill = ({ children }: { children: ReactNode }) => (
  <Box
    as="span"
    display="inline-flex"
    alignItems="center"
    h="23px"
    px={2}
    rounded="full"
    border="1px solid"
    borderColor="border.subtle"
    bg="rgba(255,255,255,0.035)"
    color="text.secondary"
    fontSize="11px"
    whiteSpace="nowrap"
  >
    {children}
  </Box>
);

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
      w={{ base: "52px", md: "58px" }}
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
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) => (
  <Button
    aria-pressed={active}
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
    boxShadow={active ? "inset 0 0 0 1px rgba(232,65,66,0.24)" : "none"}
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
      <Text as="span" whiteSpace="nowrap">
        {label}
      </Text>
      <Text as="span" color="text.tertiary" fontWeight="semibold">
        {count}
      </Text>
    </HStack>
  </Button>
);

const ResourceMeta = ({ resource }: { resource: SkillResource }) => (
  <HStack spacing={3} minW={0}>
    <ResourceLogo resource={resource} />
    <Box minW={0} flex="1">
      <Text
        color="text.primary"
        fontWeight="semibold"
        fontSize="sm"
        noOfLines={1}
      >
        {resource.name}
      </Text>
      <Flex align="center" gap={2} mt={0.5} minW={0}>
        <Text
          color="text.tertiary"
          fontSize="xs"
          whiteSpace="nowrap"
          flexShrink={0}
        >
          {resource.provider}
        </Text>
        <Text color="text.tertiary" fontSize="xs" flexShrink={0} aria-hidden>
          /
        </Text>
        <Text
          color="text.secondary"
          fontSize="xs"
          minW={0}
          flex="1"
          noOfLines={1}
          title={resource.url}
        >
          {formatResourceUrl(resource.url)}
        </Text>
      </Flex>
    </Box>
  </HStack>
);

const TypePills = ({ resource }: { resource: SkillResource }) => (
  <Wrap spacing={1.5}>
    {resource.toolTypes.map((type) => (
      <WrapItem key={type}>
        <TypePill>{type}</TypePill>
      </WrapItem>
    ))}
  </Wrap>
);

const ResourceTags = ({ resource }: { resource: SkillResource }) => (
  <Wrap spacing={1.5}>
    {[...resource.categories, ...resource.tags].slice(0, 7).map((tag) => (
      <WrapItem key={tag}>
        <TagPill>{tag}</TagPill>
      </WrapItem>
    ))}
  </Wrap>
);

const InstallLine = ({ value }: { value?: string }) => {
  if (!value) return null;

  return (
    <Text
      color="text.tertiary"
      fontSize="11px"
      lineHeight="16px"
      mt={1.5}
      fontFamily="mono"
      noOfLines={1}
      title={value}
    >
      {value}
    </Text>
  );
};

const ResourceRow = ({ resource }: { resource: SkillResource }) => (
  <Box
    as={ChakraLink}
    href={resource.url}
    isExternal
    aria-label={`Open ${resource.name}`}
    display={{ base: "block", md: "grid" }}
    gridTemplateColumns={{ md: TABLE_GRID_COLUMNS }}
    gap={{ md: 4 }}
    alignItems="center"
    px={{ base: 3, md: 4 }}
    py={{ base: 3.5, md: 3 }}
    borderBottom="1px solid"
    borderColor="border.subtle"
    _last={{ borderBottom: "none" }}
    cursor="pointer"
    textDecoration="none"
    _hover={{ bg: "rgba(255,255,255,0.035)", textDecoration: "none" }}
    _focusVisible={{
      outline: "none",
      boxShadow: "inset 0 0 0 1px var(--chakra-colors-primary-400)",
    }}
  >
    <Box display={{ base: "block", md: "none" }} minW={0}>
      <Flex align="flex-start" gap={3} minW={0}>
        <ResourceLogo resource={resource} size={36} />
        <Box minW={0} flex="1">
          <Text
            color="text.primary"
            fontWeight="semibold"
            fontSize="sm"
            noOfLines={1}
          >
            {resource.name}
          </Text>
          <Flex align="center" gap={2} mt={0.5} minW={0}>
            <Text
              color="text.tertiary"
              fontSize="xs"
              whiteSpace="nowrap"
              flexShrink={0}
            >
              {resource.provider}
            </Text>
            <Text
              color="text.tertiary"
              fontSize="xs"
              flexShrink={0}
              aria-hidden
            >
              /
            </Text>
            <Text
              color="text.tertiary"
              fontSize="xs"
              minW={0}
              flex="1"
              noOfLines={1}
              title={resource.url}
            >
              {formatResourceUrl(resource.url)}
            </Text>
          </Flex>
        </Box>
        <Tooltip label={`Open ${resource.name}`}>
          <Flex
            align="center"
            justify="center"
            w="32px"
            h="32px"
            rounded="md"
            color="text.secondary"
            flexShrink={0}
            aria-hidden
          >
            <ExternalLink size={16} />
          </Flex>
        </Tooltip>
      </Flex>

      <HStack spacing={2} mt={2.5} align="flex-start">
        <TypePills resource={resource} />
      </HStack>
      <Text color="text.secondary" fontSize="sm" lineHeight="19px" mt={2.5}>
        {resource.description}
      </Text>
      <InstallLine value={resource.install} />
      <Box mt={2.5}>
        <ResourceTags resource={resource} />
      </Box>
    </Box>

    <Box display={{ base: "none", md: "block" }} minW={0}>
      <ResourceMeta resource={resource} />
    </Box>

    <Box display={{ base: "none", md: "block" }} minW={0}>
      <TypePills resource={resource} />
    </Box>

    <Box display={{ base: "none", md: "block" }} minW={0}>
      <ResourceTags resource={resource} />
    </Box>

    <Box display={{ base: "none", md: "block" }} minW={0}>
      <Text color="text.secondary" fontSize="sm" lineHeight="19px">
        {resource.description}
      </Text>
      <InstallLine value={resource.install} />
    </Box>

    <Flex display={{ base: "none", md: "flex" }} justify="flex-end">
      <Tooltip label={`Open ${resource.name}`}>
        <Flex
          align="center"
          justify="center"
          w="32px"
          h="32px"
          rounded="md"
          color="text.secondary"
          aria-hidden
        >
          <ExternalLink size={16} />
        </Flex>
      </Tooltip>
    </Flex>
  </Box>
);

const SkillsPageClient = () => {
  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState<AiToolType | "all">("all");
  const [selectedCategory, setSelectedCategory] = useState<
    SkillResourceCategory | "all"
  >("all");
  const [copiedLlmsUrl, setCopiedLlmsUrl] = useState(false);

  const types = useMemo(
    () =>
      aiToolTypeOrder.filter((type) =>
        skillResources.some((resource) => resource.toolTypes.includes(type))
      ),
    []
  );
  const categories = useMemo(
    () =>
      categoryOrder.filter((category) =>
        skillResources.some((resource) =>
          resource.categories.includes(category)
        )
      ),
    []
  );

  const typeCounts = useMemo(
    () => getCountMap(types, (resource) => resource.toolTypes),
    [types]
  );
  const categoryCounts = useMemo(
    () => getCountMap(categories, (resource) => resource.categories),
    [categories]
  );

  const filteredResources = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return skillResources.filter((resource) => {
      const matchesType =
        selectedType === "all" || resource.toolTypes.includes(selectedType);
      const matchesCategory =
        selectedCategory === "all" ||
        resource.categories.includes(selectedCategory);

      if (!matchesType || !matchesCategory) return false;
      if (!normalizedQuery) return true;

      const haystack = [
        resource.name,
        resource.provider,
        resource.url,
        resource.description,
        resource.install ?? "",
        ...resource.toolTypes,
        ...resource.categories,
        ...resource.tags,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [query, selectedCategory, selectedType]);

  const resetFilters = () => {
    setQuery("");
    setSelectedType("all");
    setSelectedCategory("all");
  };

  const copyLlmsUrl = async () => {
    try {
      await navigator.clipboard.writeText(LLMS_TXT_URL);
      setCopiedLlmsUrl(true);
      window.setTimeout(() => setCopiedLlmsUrl(false), 1600);
    } catch {
      setCopiedLlmsUrl(false);
    }
  };

  return (
    <Layout
      allowSticky
      maxW={{ base: "100%", xl: "1240px" }}
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
        <Box>
          <Heading
            as="h1"
            color="text.primary"
            fontSize={{ base: "3xl", md: "4xl" }}
            lineHeight={{ base: "38px", md: "46px" }}
            fontWeight="extrabold"
            letterSpacing="0"
          >
            Web3 AI Skills
          </Heading>
          <Text color="text.secondary" fontSize="sm" lineHeight="21px" mt={2}>
            Agent-facing skills, MCP servers, CLIs, wallets, models, and
            protocol interfaces for onchain work.
          </Text>
        </Box>
        <Flex
          direction="column"
          align={{ base: "stretch", md: "flex-end" }}
          gap={2}
          w={{ base: "full", md: "auto" }}
        >
          <Box w={{ base: "full", sm: "420px", md: "470px" }}>
            <Text
              color="text.tertiary"
              fontSize="11px"
              fontWeight="semibold"
              letterSpacing="0"
              textTransform="uppercase"
              mb={1.5}
            >
              For your Agent
            </Text>
            <Flex
              align="center"
              border="1px solid"
              borderColor="border.default"
              rounded="lg"
              bg="rgba(255,255,255,0.025)"
              overflow="hidden"
              minW={0}
            >
              <Text
                color="text.primary"
                fontSize="sm"
                fontFamily="mono"
                bg="rgba(0,0,0,0.28)"
                px={3}
                py={2.5}
                flex="1"
                minW={0}
                noOfLines={1}
              >
                {LLMS_TXT_URL}
              </Text>
              <Tooltip label={copiedLlmsUrl ? "Copied" : "Copy llms.txt URL"}>
                <Button
                  aria-label="Copy llms.txt URL"
                  size="sm"
                  variant="ghost"
                  h="39px"
                  minW="42px"
                  px={0}
                  rounded="none"
                  color="text.primary"
                  borderLeft="1px solid"
                  borderColor="border.subtle"
                  onClick={copyLlmsUrl}
                  _hover={{ bg: "bg.emphasis" }}
                  _focusVisible={focusRing}
                >
                  {copiedLlmsUrl ? <Check size={17} /> : <Copy size={17} />}
                </Button>
              </Tooltip>
              <Tooltip label="Open llms.txt">
                <Button
                  as={ChakraLink}
                  href={LLMS_TXT_URL}
                  isExternal
                  aria-label="Open llms.txt"
                  size="sm"
                  variant="ghost"
                  h="39px"
                  minW="42px"
                  px={0}
                  rounded="none"
                  color="text.primary"
                  borderLeft="1px solid"
                  borderColor="border.subtle"
                  _hover={{ bg: "bg.emphasis", textDecoration: "none" }}
                  _focusVisible={focusRing}
                >
                  <ExternalLink size={17} />
                </Button>
              </Tooltip>
            </Flex>
          </Box>
        </Flex>
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
          <InputGroup maxW={{ base: "full", md: "380px" }} h="34px">
            <InputLeftElement pointerEvents="none" h="34px" w="40px">
              <Search size={16} color="#71717A" />
            </InputLeftElement>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search skills, MCPs, protocols"
              bg="bg.base"
              borderColor="border.default"
              color="text.primary"
              h="34px"
              pl="40px"
              rounded="md"
              _placeholder={{ color: "text.tertiary" }}
              _focusVisible={focusRing}
            />
          </InputGroup>

          <Spacer display={{ base: "none", md: "block" }} />

          <HStack spacing={3} align="center">
            <Text
              color="text.secondary"
              fontSize="sm"
              whiteSpace="nowrap"
              sx={{ fontVariantNumeric: "tabular-nums" }}
            >
              {filteredResources.length} shown
            </Text>
            <Button
              size="sm"
              variant="ghost"
              color="text.secondary"
              leftIcon={<RotateCcw size={14} />}
              onClick={resetFilters}
              _focusVisible={focusRing}
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
          <FilterRail label="Types">
            <FilterPill
              active={selectedType === "all"}
              label="All"
              count={skillResources.length}
              onClick={() => setSelectedType("all")}
            />
            {types.map((type) => (
              <FilterPill
                key={type}
                active={selectedType === type}
                label={type}
                count={typeCounts[type]}
                onClick={() => setSelectedType(type)}
              />
            ))}
          </FilterRail>

          <FilterRail label="Areas">
            <FilterPill
              active={selectedCategory === "all"}
              label="All"
              count={skillResources.length}
              onClick={() => setSelectedCategory("all")}
            />
            {categories.map((category) => (
              <FilterPill
                key={category}
                active={selectedCategory === category}
                label={category}
                count={categoryCounts[category]}
                onClick={() => setSelectedCategory(category)}
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
          <Text>Resource</Text>
          <Text>Type</Text>
          <Text>Tags</Text>
          <Text>Description</Text>
          <Box />
        </Box>

        {filteredResources.length > 0 ? (
          filteredResources.map((resource) => (
            <ResourceRow key={resource.id} resource={resource} />
          ))
        ) : (
          <Box p={8} textAlign="center">
            <Heading as="h2" size="sm" color="text.primary" mb={2}>
              No resources match those filters
            </Heading>
            <Text color="text.secondary" fontSize="sm">
              Try a broader type, area, or search term.
            </Text>
          </Box>
        )}
      </Box>

      <Tooltip label="Add missing skill" placement="left" hasArrow>
        <IconButton
          as="a"
          href={missingSkillIssueUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Add missing skill"
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

export default SkillsPageClient;
