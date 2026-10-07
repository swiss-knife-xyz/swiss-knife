"use client";

import { useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import {
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  Heading,
  HStack,
  Input,
  InputGroup,
  InputLeftElement,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  ModalFooter,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  VStack,
} from "@chakra-ui/react";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Globe,
  Search,
  Table2,
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { DarkSelect } from "@/components/DarkSelect";
import {
  archiveReviewedAt,
  shutdownProjects,
  type ShutdownProject,
} from "./data";
import {
  financials,
  financialReviewedAt,
  disclosedFunding,
  fundingIsApproximate,
  financialSortValue,
  type FinancialSort,
  type RevenuePeak,
} from "./financials";

const moneyFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});
const compactMoneyFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 2,
});
function money(amount?: number) {
  return amount === undefined
    ? "Not verified"
    : compactMoneyFormat.format(amount);
}
function periodLabel(period: string) {
  return period.length === 4
    ? period
    : new Intl.DateTimeFormat("en", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${period}-01T00:00:00Z`));
}

function fundingDate(date: string) {
  if (date.length === 4) return date;
  if (date.length === 7) return periodLabel(date);
  return formatDate(date);
}

function FinancialDetails({ project }: { project: ShutdownProject }) {
  const record = financials[project.id];
  const funding = record?.funding;
  const revenue = record?.revenue;
  return (
    <Box mt={5} borderTop="1px solid" borderColor="border.default" pt={4}>
      <Text fontSize="sm" fontWeight="semibold" mb={3}>
        Funding & revenue
      </Text>
      <Text fontSize="xs" color="text.tertiary" mb={2}>
        Financial sources reviewed {formatDate(financialReviewedAt)} · USD
      </Text>
      <Text fontSize="sm" fontWeight="medium">
        Disclosed funding:{" "}
        {disclosedFunding(record) === undefined
          ? funding
            ? "Amount not disclosed"
            : "Not verified"
          : `${fundingIsApproximate(record) ? "≈ " : ""}${moneyFormat.format(disclosedFunding(record)!)}`}
      </Text>
      <Text fontSize="xs" color="text.secondary" mt={1} lineHeight="1.6">
        {funding?.scopeNote ??
          "No funding figure has been verified for this project or product. This does not mean it raised no money."}
      </Text>
      {funding?.rounds.map((round, index) => (
        <Box
          key={`${round.date}-${index}`}
          py={2}
          mt={1}
          borderBottom="1px solid"
          borderColor="border.default"
        >
          <Flex justify="space-between" gap={3} fontSize="xs">
            <Text>
              {round.round} · {fundingDate(round.date)}
            </Text>
            <Text fontWeight="medium">
              {round.amountUsd === undefined
                ? "Amount not disclosed"
                : `${round.amountApproximate ? "≈ " : ""}${moneyFormat.format(round.amountUsd)}`}
            </Text>
          </Flex>
          <Link
            href={round.source.url}
            isExternal
            color="primary.400"
            fontSize="xs"
          >
            {round.source.label} ↗
          </Link>
          <Text fontSize="10px" color="text.tertiary">
            {round.source.kind}
          </Text>
        </Box>
      ))}
      <Grid templateColumns="1fr 1fr" gap={3} mt={4}>
        {[
          { label: "Peak observed month", peak: revenue?.peakMonth },
          { label: "Peak observed year", peak: revenue?.peakYear },
        ].map(({ label, peak }) => (
          <Box key={label}>
            <Text fontSize="xs" color="text.tertiary">
              {label}
            </Text>
            <Text fontSize="sm" fontWeight="medium" mt={1}>
              {peak
                ? moneyFormat.format(peak.amountUsd)
                : revenue
                  ? "No complete period"
                  : "Not verified"}
            </Text>
            {peak && (
              <Text fontSize="xs" color="text.secondary" mt={1}>
                {periodLabel(peak.period)}
              </Text>
            )}
          </Box>
        ))}
      </Grid>
      <Text fontSize="xs" color="text.secondary" mt={3} lineHeight="1.6">
        {revenue?.scopeNote ??
          "No revenue history has been verified for this project or product."}
      </Text>
      {revenue && (
        <Box fontSize="xs" color="text.tertiary" mt={2}>
          <Text lineHeight="1.6">
            Available history: {formatDate(revenue.coverageStart)} –{" "}
            {formatDate(revenue.coverageEnd)}. Peaks use fully covered UTC
            calendar months and years, retain negative days, and exclude the
            current day and periods beyond the archive’s closure cutoff. Missing
            days are not treated as zero. These are observed peaks within
            available history, not verified lifetime peaks or annualized
            estimates.
          </Text>
          <Link
            href={revenue.source.url}
            isExternal
            color="primary.400"
            display="inline-block"
            mt={2}
          >
            {revenue.source.label} ↗
          </Link>
          {revenue.methodologyUrl && (
            <Link
              href={revenue.methodologyUrl}
              isExternal
              color="primary.400"
              display="block"
              mt={1}
            >
              Protocol methodology ↗
            </Link>
          )}
        </Box>
      )}
    </Box>
  );
}

function FinancialTable({
  projects,
  onSelect,
}: {
  projects: ShutdownProject[];
  onSelect: (project: ShutdownProject) => void;
}) {
  const [sort, setSort] = useState<FinancialSort>("funding");
  const [ascending, setAscending] = useState(false);
  const sorted = useMemo(
    () =>
      [...projects].sort((a, b) => {
        if (sort === "name")
          return a.name.localeCompare(b.name) * (ascending ? 1 : -1);
        const av = financialSortValue(a.id, sort),
          bv = financialSortValue(b.id, sort);
        if (av === undefined)
          return bv === undefined ? a.name.localeCompare(b.name) : 1;
        if (bv === undefined) return -1;
        const result =
          typeof av === "number" && typeof bv === "number"
            ? av - bv
            : String(av).localeCompare(String(bv));
        return result * (ascending ? 1 : -1) || a.name.localeCompare(b.name);
      }),
    [projects, sort, ascending]
  );
  const columns: { key: FinancialSort; label: string }[] = [
    { key: "name", label: "Project" },
    { key: "funding", label: "Disclosed funding" },
    { key: "raise", label: "Latest sourced raise" },
    { key: "month", label: "Peak monthly revenue" },
    { key: "year", label: "Peak annual revenue" },
  ];
  function changeSort(key: FinancialSort) {
    if (sort === key) setAscending((value) => !value);
    else {
      setSort(key);
      setAscending(key === "name");
    }
  }
  function sourceButton(
    project: ShutdownProject,
    label: string,
    content: ReactNode,
    available: boolean
  ) {
    return available ? (
      <Button
        variant="unstyled"
        h="auto"
        display="block"
        fontWeight="normal"
        textAlign="left"
        aria-label={`View ${project.name} ${label} sources`}
        onClick={() => onSelect(project)}
        _hover={{ textDecoration: "underline" }}
        _focusVisible={{
          outline: "2px solid",
          outlineColor: "primary.400",
          outlineOffset: "3px",
        }}
      >
        {content}
      </Button>
    ) : (
      content
    );
  }
  function peakCell(
    project: ShutdownProject,
    peak?: RevenuePeak,
    hasHistory?: boolean
  ) {
    return sourceButton(
      project,
      "revenue",
      <Box>
        <Text
          color={peak ? "text.primary" : "text.tertiary"}
          fontSize="sm"
          title={peak ? moneyFormat.format(peak.amountUsd) : undefined}
        >
          {peak
            ? money(peak.amountUsd)
            : hasHistory
              ? "No complete period"
              : "Not verified"}
        </Text>
        {peak && (
          <Text color="text.tertiary" fontSize="xs" mt={1}>
            {periodLabel(peak.period)}
          </Text>
        )}
      </Box>,
      !!hasHistory
    );
  }
  function fundingCell(project: ShutdownProject) {
    const record = financials[project.id],
      amount = disclosedFunding(record);
    const prefix = fundingIsApproximate(record) ? "≈ " : "";
    return sourceButton(
      project,
      "funding",
      <Box>
        <Text
          fontSize="sm"
          color={amount === undefined ? "text.tertiary" : "text.primary"}
          title={
            amount === undefined
              ? undefined
              : `${prefix}${moneyFormat.format(amount)}`
          }
        >
          {amount === undefined && record?.funding
            ? "Amount not disclosed"
            : `${prefix}${money(amount)}`}
        </Text>
        {record?.funding && (
          <Text color="text.tertiary" fontSize="xs" mt={1}>
            {record.funding.rounds.length} sourced{" "}
            {record.funding.rounds.length === 1 ? "round" : "rounds"}
          </Text>
        )}
      </Box>,
      !!record?.funding
    );
  }
  const coverage = projects.filter(
    (p) => financials[p.id]?.funding || financials[p.id]?.revenue
  ).length;
  return (
    <Box mt={5}>
      <Flex display={{ base: "flex", md: "none" }} gap={2} mb={3}>
        <DarkSelect
          ariaLabel="Sort financial table"
          selectedOption={{
            value: sort,
            label: columns.find((c) => c.key === sort)!.label,
          }}
          options={columns.map((c) => ({ value: c.key, label: c.label }))}
          setSelectedOption={(option) => {
            const key = String(option?.value ?? "funding") as FinancialSort;
            setSort(key);
            setAscending(key === "name");
          }}
          boxProps={{ flex: 1, minW: 0, fontSize: "xs" }}
        />
        <Button
          size="sm"
          variant="ghost"
          aria-label={ascending ? "Sort descending" : "Sort ascending"}
          onClick={() => setAscending((value) => !value)}
        >
          {ascending ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </Button>
      </Flex>
      <Box display={{ base: "none", md: "block" }} overflowX="auto">
        <Table
          size="sm"
          minW="780px"
          sx={{
            th: { borderColor: "border.default" },
            td: { borderColor: "border.default", py: 4 },
          }}
        >
          <Thead>
            <Tr>
              {columns.map((column) => (
                <Th
                  key={column.key}
                  aria-sort={
                    sort === column.key
                      ? ascending
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                  px={3}
                >
                  <Button
                    size="xs"
                    fontSize="11px"
                    fontWeight="medium"
                    variant="ghost"
                    color={
                      sort === column.key ? "text.primary" : "text.tertiary"
                    }
                    px={2}
                    mx={-2}
                    borderRadius="md"
                    _hover={{ bg: "whiteAlpha.100", color: "text.primary" }}
                    onClick={() => changeSort(column.key)}
                    rightIcon={
                      sort === column.key ? (
                        ascending ? (
                          <ChevronUp size={12} />
                        ) : (
                          <ChevronDown size={12} />
                        )
                      ) : undefined
                    }
                  >
                    {column.label}
                  </Button>
                </Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {sorted.map((project) => {
              const record = financials[project.id];
              return (
                <Tr key={project.id} _hover={{ bg: "whiteAlpha.50" }}>
                  <Td px={3}>
                    <Button
                      variant="link"
                      color="text.primary"
                      fontSize="sm"
                      onClick={() => onSelect(project)}
                      aria-label={`View ${project.name} financial details`}
                    >
                      <HStack spacing={2.5} textAlign="left">
                        <ProjectLogo project={project} size={30} />
                        <Box>
                          <Text>{project.name}</Text>
                          <Text
                            fontSize="10px"
                            color="text.tertiary"
                            fontWeight="normal"
                            mt={1}
                          >
                            {project.category}
                          </Text>
                        </Box>
                      </HStack>
                    </Button>
                  </Td>
                  <Td px={3}>{fundingCell(project)}</Td>
                  <Td px={3}>
                    <Text
                      fontSize="xs"
                      color={
                        record?.funding ? "text.secondary" : "text.tertiary"
                      }
                    >
                      {record?.funding?.rounds[0]
                        ? fundingDate(record.funding.rounds[0].date)
                        : "Not verified"}
                    </Text>
                  </Td>
                  <Td px={3}>
                    {peakCell(
                      project,
                      record?.revenue?.peakMonth,
                      !!record?.revenue
                    )}
                  </Td>
                  <Td px={3}>
                    {peakCell(
                      project,
                      record?.revenue?.peakYear,
                      !!record?.revenue
                    )}
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </Box>
      <Box display={{ base: "block", md: "none" }}>
        {sorted.map((project) => {
          const record = financials[project.id];
          return (
            <Box
              key={project.id}
              py={4}
              borderTop="1px solid"
              borderColor="border.default"
            >
              <Button
                variant="link"
                color="text.primary"
                fontSize="sm"
                onClick={() => onSelect(project)}
                aria-label={`View ${project.name} financial details`}
              >
                <HStack spacing={3}>
                  <ProjectLogo project={project} size={32} />
                  <Text>{project.name}</Text>
                  <ArrowUpRight size={14} />
                </HStack>
              </Button>
              <Grid templateColumns="1fr 1fr" gap={4} mt={4}>
                {[
                  { label: "Disclosed funding", content: fundingCell(project) },
                  {
                    label: "Latest sourced raise",
                    content: (
                      <Text fontSize="xs" color="text.secondary">
                        {record?.funding?.rounds[0]
                          ? fundingDate(record.funding.rounds[0].date)
                          : "Not verified"}
                      </Text>
                    ),
                  },
                  {
                    label: "Peak monthly revenue",
                    content: peakCell(
                      project,
                      record?.revenue?.peakMonth,
                      !!record?.revenue
                    ),
                  },
                  {
                    label: "Peak annual revenue",
                    content: peakCell(
                      project,
                      record?.revenue?.peakYear,
                      !!record?.revenue
                    ),
                  },
                ].map(({ label, content }) => (
                  <Box key={label}>
                    <Text fontSize="10px" color="text.tertiary" mb={1}>
                      {label}
                    </Text>
                    {content}
                  </Box>
                ))}
              </Grid>
            </Box>
          );
        })}
      </Box>
      <Box mt={6}>
        <Text fontSize="xs" color="text.secondary" lineHeight="1.7" mb={2}>
          USD · Funding covers sourced rounds, not verified lifetime totals.
          Revenue shows peaks observed in complete calendar periods from
          DefiLlama’s available history; protocol revenue is not company revenue
          or profit. Open a project for dates, scope and sources.
        </Text>
        <Text fontSize="xs" color="text.tertiary" mb={4}>
          {coverage} of {projects.length} matching projects have financial
          evidence · Reviewed {formatDate(financialReviewedAt)}
        </Text>
        <Box as="details" fontSize="xs" color="text.secondary" mb={4}>
          <Box as="summary" cursor="pointer">
            Data definitions & limitations
          </Box>
          <Text mt={2} lineHeight="1.7">
            Funding dates are provider-recorded or announcement/reporting dates,
            not verified closing dates. Round labels do not establish whether
            financing was equity, tokens or grants. Undisclosed amounts are
            excluded from sums. Missing figures mean not verified, not zero.
            Revenue excludes incomplete periods and never multiplies a peak
            month by 12. Histories can omit earlier activity. Chain metrics can
            measure burned fees or gas fees less settlement costs rather than
            team income; each project’s details specify scope.
          </Text>
          <Link
            href="https://docs.llama.fi/analysts/data-definitions"
            isExternal
            color="primary.400"
            mt={2}
            display="inline-block"
          >
            DefiLlama definitions ↗
          </Link>
        </Box>
      </Box>
    </Box>
  );
}

const dateFormat = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
function formatDate(date?: string) {
  if (!date) return "Date unverified";
  return dateFormat.format(new Date(`${date}T00:00:00Z`));
}
const categories = [...new Set(shutdownProjects.map((p) => p.category))].sort();
const categoryCounts = shutdownProjects.reduce<Record<string, number>>(
  (counts, project) => {
    counts[project.category] = (counts[project.category] ?? 0) + 1;
    return counts;
  },
  { all: shutdownProjects.length }
);
const statuses = ["Closed", "Winding down", "Product retired"];

type DateBasis = "milestones" | "announcements" | "service-ends";
function eventDate(project: ShutdownProject, basis: DateBasis) {
  return (
    (basis === "announcements"
      ? project.announced
      : basis === "service-ends"
        ? project.closed
        : (project.closed ?? project.announced)) ?? ""
  );
}
function dateLabel(project: ShutdownProject, basis: DateBasis) {
  if (!eventDate(project, basis)) return "Exact date unavailable";
  if (basis === "announcements" || !project.closed)
    return project.dateKind === "Reporting" ? "Reporting date" : "Announcement";
  return project.closed > archiveReviewedAt
    ? "Scheduled service end"
    : "Closure / service end";
}

function ProjectLogo({
  project,
  size = 42,
}: {
  project: ShutdownProject;
  size?: number;
}) {
  const [failedLogo, setFailedLogo] = useState<string | null>(null);
  const frame = project.logoFrame;
  const logoScale = frame
    ? (size - 2) / Math.max(frame.width, frame.height)
    : 1;
  return (
    <Box
      boxSize={`${size}px`}
      flexShrink={0}
      rounded="lg"
      border="1px solid"
      borderColor="border.default"
      overflow="hidden"
      bg={project.logoBackground ?? "whiteAlpha.100"}
      display="grid"
      placeItems="center"
    >
      {project.logo && failedLogo !== project.logo ? (
        <Box
          position="relative"
          overflow="hidden"
          width={frame ? `${frame.width * logoScale}px` : `${size}px`}
          height={frame ? `${frame.height * logoScale}px` : `${size}px`}
        >
          <Image
            src={project.logo}
            alt={`${project.name} logo`}
            width={frame?.sourceWidth ?? size}
            height={frame?.sourceHeight ?? size}
            sizes={
              frame
                ? `${Math.ceil(frame.sourceWidth * logoScale)}px`
                : `${size}px`
            }
            style={
              frame
                ? {
                    position: "absolute",
                    width: frame.sourceWidth * logoScale,
                    height: frame.sourceHeight * logoScale,
                    maxWidth: "none",
                    left: -frame.left * logoScale,
                    top: -frame.top * logoScale,
                  }
                : {
                    width: `${size}px`,
                    height: `${size}px`,
                    objectFit: "contain",
                  }
            }
            onError={() => setFailedLogo(project.logo ?? null)}
          />
        </Box>
      ) : (
        <Text fontWeight="bold" color="text.secondary">
          {project.name.slice(0, 2)}
        </Text>
      )}
    </Box>
  );
}

function ProjectDetails({ project }: { project: ShutdownProject }) {
  return (
    <Box
      id={`details-${project.id}`}
      mt={3}
      pt={3}
      borderTop="1px solid"
      borderColor="border.default"
    >
      <Text color="text.tertiary" fontSize="xs" mb={1}>
        Why it ended
      </Text>
      <Text color="text.secondary" fontSize="sm" lineHeight="1.6" mb={2}>
        {project.reason}
      </Text>
      <Text color="text.tertiary" fontSize="xs">
        {project.announced
          ? `${project.dateKind === "Reporting" ? "Reported" : "Announced"} ${formatDate(project.announced)}`
          : "Announcement date unavailable"}
        {project.closed
          ? ` · Service end ${formatDate(project.closed)}`
          : " · Final closure date not specified"}
      </Text>
      {project.dateNote && (
        <Text color="text.tertiary" fontSize="xs" mt={2}>
          {project.dateNote}
        </Text>
      )}
      <Flex gap={2} flexWrap="wrap" mt={3}>
        {project.sources.map((source) => (
          <Link
            key={source.url}
            href={source.url}
            isExternal
            fontSize="xs"
            color="text.secondary"
            display="inline-flex"
            alignItems="center"
            gap={1.5}
            px={2.5}
            py={1}
            minH="28px"
            rounded="md"
            bg="whiteAlpha.50"
            border="1px solid"
            borderColor="border.default"
            _hover={{
              bg: "whiteAlpha.100",
              color: "text.primary",
              textDecoration: "none",
            }}
          >
            {source.label} <ArrowUpRight size={12} />
          </Link>
        ))}
      </Flex>
      <HStack mt={2} spacing={4} flexWrap="wrap" rowGap={2}>
        {project.website && (
          <Link
            href={project.website}
            isExternal
            color="text.secondary"
            fontSize="xs"
          >
            Original website ↗
          </Link>
        )}
        {project.social && (
          <Link
            href={project.social}
            isExternal
            color="text.secondary"
            fontSize="xs"
          >
            Project on X ↗
          </Link>
        )}
      </HStack>
    </Box>
  );
}

function ProjectModal({
  project,
  onClose,
}: {
  project: ShutdownProject;
  onClose: () => void;
}) {
  const windingDown = project.status === "Winding down";
  return (
    <Modal
      isOpen
      onClose={onClose}
      size="xl"
      isCentered
      scrollBehavior="inside"
    >
      <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(8px)" />
      <ModalContent
        bg="bg.subtle"
        color="text.primary"
        border="1px solid"
        borderColor="border.default"
        rounded="2xl"
        mx={4}
        boxShadow="0 24px 90px rgba(0,0,0,.55)"
        overflow="hidden"
      >
        <ModalCloseButton
          color="text.tertiary"
          top={3}
          right={3}
          rounded="full"
        />
        <ModalHeader p={{ base: 5, md: 6 }} pb={4}>
          <HStack spacing={4} align="center" pr={5}>
            <ProjectLogo project={project} size={64} />
            <Box minW={0}>
              <Text
                fontSize="xs"
                fontWeight="normal"
                color="text.tertiary"
                mb={1}
              >
                {project.category}
              </Text>
              <Text
                fontSize={{ base: "xl", md: "2xl" }}
                fontWeight="bold"
                lineHeight="1.2"
                letterSpacing="-.025em"
              >
                {project.name}
              </Text>
              <HStack
                spacing={1.5}
                mt={2}
                color={windingDown ? "#fbbf24" : "text.secondary"}
              >
                <Box w="5px" h="5px" rounded="full" bg="currentColor" />
                <Text fontSize="xs" fontWeight="medium">
                  {project.status}
                </Text>
              </HStack>
            </Box>
          </HStack>
        </ModalHeader>
        <ModalBody px={{ base: 5, md: 6 }} pb={5}>
          <Grid
            templateColumns="1fr 1fr"
            bg="whiteAlpha.50"
            rounded="lg"
            mb={5}
          >
            {[
              {
                label:
                  project.dateKind === "Reporting" ? "Reported" : "Announced",
                date: project.announced,
              },
              {
                label:
                  project.closed && project.closed > archiveReviewedAt
                    ? "Scheduled closure"
                    : "Service ended",
                date: project.closed,
              },
            ].map((event, index) => (
              <Box
                key={event.label}
                px={4}
                py={3}
                borderLeft={index ? "1px solid" : undefined}
                borderColor="border.default"
              >
                <Text fontSize="xs" color="text.tertiary" mb={1}>
                  {event.label}
                </Text>
                <Text
                  fontSize="sm"
                  fontWeight="semibold"
                  color={event.date ? "text.primary" : "text.tertiary"}
                >
                  {event.date ? formatDate(event.date) : "Not specified"}
                </Text>
              </Box>
            ))}
          </Grid>
          <Text fontSize="sm" color="text.secondary" lineHeight="1.65" mb={4}>
            {project.summary}
          </Text>
          <Box
            pl={3}
            borderLeft="2px solid"
            borderColor={windingDown ? "rgba(245,158,11,.4)" : "border.strong"}
          >
            <Text
              fontSize="xs"
              fontWeight="medium"
              color="text.tertiary"
              mb={1}
            >
              Why it ended
            </Text>
            <Text fontSize="sm" color="text.primary" lineHeight="1.6">
              {project.reason}
            </Text>
          </Box>
          {project.dateNote && (
            <Box as="details" mt={3} color="text.tertiary" fontSize="xs">
              <Box
                as="summary"
                cursor="pointer"
                _hover={{ color: "text.secondary" }}
                _focusVisible={{
                  outline: "2px solid",
                  outlineColor: "primary.400",
                  outlineOffset: "3px",
                }}
              >
                Timeline notes
              </Box>
              <Text mt={2} lineHeight="1.65">
                {project.dateNote}
              </Text>
            </Box>
          )}
          <FinancialDetails project={project} />
          <Flex justify="space-between" align="center" mt={5} mb={2}>
            <Text fontSize="xs" color="text.tertiary" fontWeight="medium">
              Sources
            </Text>
            <Text fontSize="xs" color="text.tertiary">
              {project.sources.length}
            </Text>
          </Flex>
          <VStack spacing={0} align="stretch">
            {project.sources.map((source) => (
              <Link
                key={source.url}
                href={source.url}
                isExternal
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                gap={3}
                py={2.5}
                borderTop="1px solid"
                borderColor="border.default"
                color="text.secondary"
                _hover={{ color: "text.primary", textDecoration: "none" }}
              >
                <Box minW={0}>
                  <Text fontSize="xs" fontWeight="medium">
                    {source.label}
                  </Text>
                  <Text fontSize="10px" color="text.tertiary" mt={0.5}>
                    {source.kind}
                  </Text>
                </Box>
                <ArrowUpRight size={14} style={{ flexShrink: 0 }} />
              </Link>
            ))}
          </VStack>
        </ModalBody>
        {(project.website || project.social) && (
          <ModalFooter
            px={{ base: 5, md: 6 }}
            py={4}
            gap={2}
            borderTop="1px solid"
            borderColor="border.default"
            bg="whiteAlpha.50"
          >
            {project.website && (
              <Button
                as={Link}
                href={project.website}
                isExternal
                flex={1}
                size="sm"
                h="36px"
                leftIcon={<Globe size={14} />}
                rightIcon={<ArrowUpRight size={13} />}
                variant="outline"
                borderColor="border.default"
                color="text.primary"
                fontWeight="medium"
                fontSize="xs"
                _hover={{ bg: "whiteAlpha.100", textDecoration: "none" }}
              >
                Website
              </Button>
            )}
            {project.social && (
              <Button
                as={Link}
                href={project.social}
                isExternal
                flex={1}
                size="sm"
                h="36px"
                rightIcon={<ArrowUpRight size={13} />}
                variant="outline"
                borderColor="border.default"
                color="text.secondary"
                fontWeight="medium"
                fontSize="xs"
                _hover={{ bg: "whiteAlpha.100", textDecoration: "none" }}
              >
                Twitter / X
              </Button>
            )}
          </ModalFooter>
        )}
      </ModalContent>
    </Modal>
  );
}

function Project({
  project,
  timeline,
  basis = "milestones",
}: {
  project: ShutdownProject;
  timeline: boolean;
  basis?: DateBasis;
}) {
  const [expanded, setExpanded] = useState(false);
  const date = eventDate(project, basis);
  return (
    <Box
      as="article"
      id={project.id}
      scrollMarginTop="24px"
      borderBottom="1px solid"
      borderColor="border.default"
      py={timeline ? 3 : 5}
      pl={timeline ? { base: 5, md: 8 } : 0}
      position="relative"
    >
      {timeline && (
        <Box
          position="absolute"
          w="9px"
          h="9px"
          rounded="full"
          bg="text.tertiary"
          backgroundImage={{
            md: "linear-gradient(to bottom, #ef4444 0, #ef4444 55vh, var(--chakra-colors-text-tertiary) 55vh, var(--chakra-colors-text-tertiary) 100%)",
          }}
          backgroundAttachment={{ md: "fixed" }}
          left="-5px"
          top="24px"
          border="2px solid"
          borderColor="bg.base"
        />
      )}
      <Grid
        templateColumns={{
          base: "1fr",
          md: timeline
            ? "160px 1fr"
            : "minmax(210px, .9fr) minmax(300px, 1.65fr) 180px",
        }}
        columnGap={{ base: 3, md: 7 }}
        rowGap={timeline ? 2 : { base: 3, md: 7 }}
        alignItems="start"
      >
        {timeline && (
          <Text color="text.secondary" fontSize="sm" pt={1}>
            {formatDate(date)}
            <Text
              as="span"
              display="block"
              color="text.tertiary"
              fontSize="xs"
              mt={1}
            >
              {dateLabel(project, basis)}
            </Text>
          </Text>
        )}
        <HStack spacing={3} align="start">
          <ProjectLogo project={project} />
          <Box minW={0}>
            <Heading
              as="h3"
              fontSize="md"
              lineHeight="24px"
              color="text.primary"
            >
              <Link
                href={project.website || project.social}
                isExternal
                color="inherit"
              >
                {project.name}
              </Link>
            </Heading>
            <Text color="text.tertiary" fontSize="xs" mt={1}>
              {project.category}
            </Text>
          </Box>
        </HStack>
        <Box gridColumn={timeline ? { base: "auto", md: "2" } : undefined}>
          <Text color="text.secondary" fontSize="sm" lineHeight="1.7">
            {project.summary}
          </Text>
          <HStack mt={3} spacing={3} flexWrap="wrap" rowGap={2}>
            <Badge
              fontSize="10px"
              textTransform="none"
              fontWeight="medium"
              rounded="md"
              px={2}
              py={1}
              bg={
                project.status === "Winding down"
                  ? "rgba(245,158,11,.09)"
                  : "whiteAlpha.50"
              }
              color={
                project.status === "Winding down" ? "#fbbf24" : "text.secondary"
              }
            >
              {project.status}
            </Badge>
            <Button
              size="xs"
              variant="link"
              color="text.secondary"
              fontWeight="normal"
              rightIcon={
                expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />
              }
              onClick={() => setExpanded(!expanded)}
              aria-expanded={expanded}
              aria-controls={`details-${project.id}`}
            >
              Details & sources
            </Button>
          </HStack>
          {expanded && <ProjectDetails project={project} />}
        </Box>
        {!timeline && (
          <Box textAlign={{ base: "left", md: "right" }}>
            <Text color="text.secondary" fontSize="sm">
              {formatDate(date)}
            </Text>
            <Text fontSize="xs" color="text.tertiary" mt={1}>
              {dateLabel(project, basis)}
            </Text>
          </Box>
        )}
      </Grid>
    </Box>
  );
}

export default function RipPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [selectedProject, setSelectedProject] =
    useState<ShutdownProject | null>(null);
  const [view, setView] = useState<"timeline" | "grid" | "table">("timeline");
  const basis = "milestones";
  const filtered = useMemo(
    () =>
      shutdownProjects
        .filter(
          (p) =>
            (category === "all" || p.category === category) &&
            (status === "all" || p.status === status) &&
            `${p.name} ${p.category} ${p.summary} ${p.reason}`
              .toLowerCase()
              .includes(query.trim().toLowerCase())
        )
        .sort((a, b) => {
          const ad = eventDate(a, basis),
            bd = eventDate(b, basis);
          if (!ad) return bd ? 1 : a.name.localeCompare(b.name);
          if (!bd) return -1;
          return (ad.localeCompare(bd) || a.name.localeCompare(b.name)) * -1;
        }),
    [query, category, status, basis]
  );
  const months = [
    ...new Set(filtered.map((p) => eventDate(p, basis).slice(0, 7))),
  ];
  return (
    <Layout as="main" allowSticky minW={0} maxW="1180px" w="full" pb={12}>
      <Flex
        direction="row"
        justify="space-between"
        align={{ base: "start", md: "center" }}
        gap={{ base: 3, md: 5 }}
        mb={7}
      >
        <Box minW={0} flex={1}>
          <Heading
            as="h1"
            fontSize={{ base: "3xl", md: "4xl" }}
            color="text.primary"
            fontWeight="extrabold"
          >
            R.I.P.
          </Heading>
          <Text
            color="text.secondary"
            fontSize={{ base: "xs", md: "sm" }}
            mt={3}
          >
            Web3 projects that shut down
          </Text>
        </Box>
        <Box textAlign="right" flexShrink={0}>
          <HStack
            spacing={{ base: 0, md: 2 }}
            flexDirection={{ base: "column", md: "row" }}
            align="end"
            justify="end"
          >
            <Text color="text.primary" fontWeight="semibold" fontSize="3xl">
              {shutdownProjects.length}
            </Text>
            <Text color="text.secondary" fontSize={{ base: "10px", md: "sm" }}>
              Archived projects
            </Text>
          </HStack>
          <HStack
            display={{ base: "none", md: "flex" }}
            spacing={{ base: 1, md: 5 }}
            flexDirection={{ base: "column", md: "row" }}
            align="end"
            justify="end"
            mt={{ base: 2, md: 1 }}
          >
            {[
              {
                value: shutdownProjects.filter((p) => p.status === "Closed")
                  .length,
                label: "Closed",
              },
              {
                value: shutdownProjects.filter(
                  (p) => p.status === "Winding down"
                ).length,
                label: "Winding down",
              },
            ].map((stat) => (
              <HStack key={stat.label} spacing={1.5}>
                <Text
                  color="text.secondary"
                  fontWeight="medium"
                  fontSize={{ base: "xs", md: "sm" }}
                >
                  {stat.value}
                </Text>
                <Text
                  color="text.tertiary"
                  fontSize={{ base: "10px", md: "xs" }}
                >
                  {stat.label}
                </Text>
              </HStack>
            ))}
          </HStack>
        </Box>
      </Flex>
      <Box mb={4}>
        <Flex gap={3} flexWrap="wrap" align="center">
          <HStack spacing={1} bg="bg.subtle" p={1} rounded="lg" flexShrink={0}>
            {(
              [
                { key: "timeline", label: "Timeline", icon: CalendarDays },
                { key: "grid", label: "Grid", icon: LayoutGrid },
                { key: "table", label: "Funding", icon: Table2 },
              ] as const
            ).map((v) => (
              <Button
                key={v.key}
                size="sm"
                h="32px"
                fontSize="xs"
                leftIcon={<v.icon size={14} />}
                variant="ghost"
                bg={view === v.key ? "bg.emphasis" : "transparent"}
                color={view === v.key ? "text.primary" : "text.tertiary"}
                aria-pressed={view === v.key}
                onClick={() => setView(v.key)}
              >
                {v.label}
              </Button>
            ))}
          </HStack>

          <InputGroup flex="1" minW="180px">
            <InputLeftElement h="40px">
              <Search size={15} color="#71717a" />
            </InputLeftElement>
            <Input
              h="40px"
              aria-label="Search projects"
              placeholder="Search projects, stories, reasons…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              fontSize="sm"
              borderColor="border.default"
              color="text.primary"
            />
          </InputGroup>
          <DarkSelect
            ariaLabel="Filter by category"
            optionCounts={categoryCounts}
            selectedOption={{
              value: category,
              label: category === "all" ? "All categories" : category,
            }}
            setSelectedOption={(option) =>
              setCategory(String(option?.value ?? "all"))
            }
            options={[
              { value: "all", label: "All categories" },
              ...categories.map((value) => ({ value, label: value })),
            ]}
            boxProps={{
              w: { base: "calc(50% - 6px)", md: "175px" },
              fontSize: "xs",
            }}
          />
          <DarkSelect
            ariaLabel="Filter by status"
            selectedOption={{
              value: status,
              label: status === "all" ? "All statuses" : status,
            }}
            setSelectedOption={(option) =>
              setStatus(String(option?.value ?? "all"))
            }
            options={[
              { value: "all", label: "All statuses" },
              ...statuses.map((value) => ({ value, label: value })),
            ]}
            boxProps={{
              w: { base: "calc(50% - 6px)", md: "175px" },
              fontSize: "xs",
            }}
          />
        </Flex>
      </Box>
      {filtered.length === 0 ? (
        <Box py={14} textAlign="center">
          <Text color="text.secondary">No projects match these filters.</Text>
          <Button
            variant="link"
            size="sm"
            mt={3}
            color="primary.400"
            onClick={() => {
              setQuery("");
              setCategory("all");
              setStatus("all");
            }}
          >
            Clear filters
          </Button>
        </Box>
      ) : view === "table" ? (
        <FinancialTable projects={filtered} onSelect={setSelectedProject} />
      ) : view === "grid" ? (
        <Grid
          templateColumns={{
            base: "repeat(2, minmax(0, 1fr))",
            sm: "repeat(3, minmax(0, 1fr))",
            md: "repeat(4, minmax(0, 1fr))",
            lg: "repeat(6, minmax(0, 1fr))",
          }}
          gap={3}
          mt={5}
        >
          {filtered.map((project) => (
            <VStack
              key={project.id}
              as="button"
              type="button"
              onClick={() => setSelectedProject(project)}
              aria-label={`View ${project.name} details`}
              cursor="pointer"
              bg="transparent"
              w="full"
              spacing={3}
              py={6}
              px={3}
              border="1px solid"
              borderColor="border.default"
              rounded="lg"
              textAlign="center"
              _hover={{
                bg: "whiteAlpha.50",
                borderColor: "border.strong",
                textDecoration: "none",
              }}
              _focusVisible={{
                outline: "2px solid",
                outlineColor: "primary.400",
                outlineOffset: "2px",
              }}
            >
              <ProjectLogo project={project} size={56} />
              <Text
                as="span"
                fontSize="sm"
                fontWeight="bold"
                lineHeight="1.5"
                color="text.primary"
              >
                {project.name}
              </Text>
              <Text
                fontSize="xs"
                color="text.tertiary"
                title={dateLabel(project, "milestones")}
              >
                {formatDate(eventDate(project, "milestones"))}
              </Text>
            </VStack>
          ))}
        </Grid>
      ) : (
        <Box>
          {months.map((month) => (
            <Box key={month} mt={4}>
              <Heading as="h2" fontSize="sm" color="text.secondary" mb={1}>
                {month
                  ? new Intl.DateTimeFormat("en", {
                      month: "long",
                      year: "numeric",
                      timeZone: "UTC",
                    }).format(new Date(`${month}-01T00:00:00Z`))
                  : "Date unverified"}
              </Heading>
              <Box
                position="relative"
                borderLeft="1px solid"
                borderColor={{ base: "border.default", md: "transparent" }}
                ml={1}
                _before={{
                  content: '""',
                  display: { base: "none", md: "block" },
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: "-1px",
                  width: "2px",
                  pointerEvents: "none",
                  backgroundImage:
                    "linear-gradient(to bottom, #ef4444 0, #ef4444 55vh, var(--chakra-colors-border-default) 55vh, var(--chakra-colors-border-default) 100%)",
                  backgroundAttachment: "fixed",
                }}
              >
                {filtered
                  .filter((p) => eventDate(p, basis).slice(0, 7) === month)
                  .map((project) => (
                    <Project
                      key={project.id}
                      project={project}
                      timeline
                      basis={basis}
                    />
                  ))}
              </Box>
            </Box>
          ))}
        </Box>
      )}
      {selectedProject && (
        <ProjectModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      )}
      <Box mt={8} textAlign="right">
        <Link
          href="https://github.com/swiss-knife-xyz/swiss-knife/issues/new?title=Web3%20Graveyard%3A%20addition%20or%20correction"
          isExternal
          fontSize="xs"
          color="primary.400"
          display="inline-block"
        >
          Suggest a project or correction ↗
        </Link>
      </Box>
    </Layout>
  );
}
