"use client";

import { useMemo, useState } from "react";
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
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { DarkSelect } from "@/components/DarkSelect";
import {
  archiveReviewedAt,
  shutdownProjects,
  type ShutdownProject,
} from "./data";

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
  const [view, setView] = useState<"timeline" | "grid">("timeline");
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
