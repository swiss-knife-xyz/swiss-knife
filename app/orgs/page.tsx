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
  VStack,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import { ChevronDown, ChevronUp, ExternalLink, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import {
  ethereumOrgs,
  roleMap,
  sourceTrail,
  type EthereumOrg,
  type SourceLink,
} from "./data";

const ORG_ROW_COLUMNS =
  "minmax(285px,1.35fr) minmax(170px,0.7fr) minmax(290px,1.15fr) 168px";

const focusRing = {
  boxShadow: "0 0 0 1px var(--chakra-colors-primary-400)",
  outline: "none",
};

const orgIds = ethereumOrgs.map((org) => org.id);
const orgById = new Map(ethereumOrgs.map((org) => [org.id, org]));

const logoSrcOverrides: Record<string, string> = {
  "ethereum-foundation": "/external/ethereum-foundation.svg",
  "ethereum-community-foundation":
    "/external/ethereum-community-foundation.svg",
};

const getFaviconUrl = (domain: string) =>
  `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

const getOrgLogoUrl = (org: EthereumOrg) =>
  logoSrcOverrides[org.id] ?? getFaviconUrl(org.logoDomain);

const getDefaultExpandedOrgIds = () => {
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 767px)").matches
  ) {
    return new Set<string>();
  }

  return new Set(orgIds);
};

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
  onToggle,
}: {
  org: EthereumOrg;
  expanded: boolean;
  onToggle: () => void;
}) => (
  <Box borderTop="1px solid" borderColor="border.default">
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

const CoverageMap = () => (
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
          infrastructure, tooling, institutions, and public goods.
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
                <Badge
                  key={org.id}
                  rounded="md"
                  variant="subtle"
                  colorScheme="gray"
                  textTransform="none"
                  px={2}
                >
                  {org.shortName}
                </Badge>
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

const OrgsPage = () => {
  const [expandedOrgIds, setExpandedOrgIds] = useState<Set<string>>(
    getDefaultExpandedOrgIds
  );

  useEffect(() => {
    setExpandedOrgIds(getDefaultExpandedOrgIds());
  }, []);

  const allDetailsExpanded = orgIds.every((orgId) => expandedOrgIds.has(orgId));

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
              onToggle={() => toggleOrgDetails(org.id)}
            />
          ))}
        </Box>
      </Box>

      <CoverageMap />

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
