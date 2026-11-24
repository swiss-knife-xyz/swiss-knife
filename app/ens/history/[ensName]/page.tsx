"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, memo, useMemo } from "react";
import {
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  HStack,
  Link,
  Box,
  Text,
  useToast,
  Card,
  CardHeader,
  CardBody,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  Badge,
  Skeleton,
  Tooltip,
  Flex,
  Spinner,
  IconButton,
  Code,
} from "@chakra-ui/react";
import { ExternalLinkIcon, CopyIcon } from "@chakra-ui/icons";
import { publicClient, resolveAddressToName, fetchContractAbi } from "@/utils";
import { differenceInDays } from "date-fns";
import {
  parseHistoryTimestamp,
  formatHistoryDate,
  relativeHistoryDate,
  readHistoryTimestamp,
} from "../lib/dates";
import {
  indexedDomainDetails,
  withCurrentContenthash,
  registrationDetails,
  type DomainDetails,
  type DomainRegistration,
} from "../lib/domain";
import { fetchAddressLabels } from "@/utils/addressLabels";
import axios from "axios";
import { namehash } from "viem/ens";
import {
  parseContenthash,
  shortenContenthash,
  type ContenthashRecord,
} from "../lib/contenthash";
import {
  decodeEnsRouteName,
  normalizeEnsInput,
  fetchIndexedEvents,
  DOMAIN_EVENTS_QUERY,
  REGISTRATION_EVENTS_QUERY,
  RESOLVER_EVENTS_QUERY,
  eventSummary,
  type IndexedEvent,
} from "../lib/history";
import {
  readEnsAddressRecord,
  readEnsContenthashRecord,
} from "@/lib/ensUniversalResolver";

const ENS_SUBGRAPH_URL = `https://gateway.thegraph.com/api/${process.env.NEXT_PUBLIC_THE_GRAPH_API_KEY}/subgraphs/id/5XqPmWe6gjyrJtFn9cLy237i4cWw2j9HcUJEXsP5qGtH`;

// Unified history event interface
interface HistoryEvent {
  id: string;
  type: string;
  label: string;
  blockNumber: number;
  logIndex: number;
  timestamp: number | null;
  transactionID: string;
  details: {
    summary?: string;
    hash?: ContenthashRecord;
    owner?: string;
    expiryDate?: number | null;
  };
}

const shortenAddress = (address: string | null) => {
  if (!address) return "N/A";
  return `${address.substring(0, 6)}...${address.substring(
    address.length - 4
  )}`;
};

// AddressResolved component to display addresses with ENS resolution
const AddressResolved = memo(
  ({
    address,
    isExternal = true,
    labelDirection = "vertical",
  }: {
    address: string | null;
    isExternal?: boolean;
    labelDirection?: "vertical" | "horizontal";
  }) => {
    const [resolvedEnsName, setResolvedEnsName] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [addressLabels, setAddressLabels] = useState<string[]>([]);

    useEffect(() => {
      const resolveEns = async () => {
        if (!address) return;

        setIsLoading(true);
        try {
          // Try to get ENS name or Basename
          const name = await resolveAddressToName(address);
          setResolvedEnsName(name);

          // If no ENS name, try to fetch labels or contract name
          if (!name) {
            let labelsFound = false;

            // First try to fetch labels from API
            try {
              const labels = await fetchAddressLabels(address, 1);
              if (labels.length > 0) {
                setAddressLabels([labels[0]]);
                labelsFound = true;
              }
            } catch (error) {
              console.error("Error fetching address labels:", error);
              // Continue to next method if labels API fails
            }

            // If no labels found from API, try to get contract name
            if (!labelsFound) {
              try {
                // first check if the address is a contract
                const isContract = await publicClient.getCode({
                  address: address as `0x${string}`,
                });

                if (isContract) {
                  const contractInfo = await fetchContractAbi({
                    address,
                    chainId: 1, // Ethereum mainnet
                  });

                  if (contractInfo.name) {
                    setAddressLabels([contractInfo.name]);
                  }
                }
              } catch (error) {
                console.error("Error fetching contract ABI:", error);
                setAddressLabels([]);
              }
            }
          }
        } catch (error) {
          console.error("Error resolving ENS name:", error);
        } finally {
          setIsLoading(false);
        }
      };

      resolveEns();
    }, [address]);

    const displayText =
      resolvedEnsName || (address ? shortenAddress(address) : "N/A");

    return (
      <Flex
        direction={labelDirection === "vertical" ? "column" : "row"}
        align={labelDirection === "vertical" ? "flex-start" : "center"}
        gap={labelDirection === "vertical" ? 0 : 2}
      >
        {address && isExternal ? (
          <Link
            href={`https://etherscan.io/address/${address}`}
            isExternal
            color="blue.500"
            fontWeight="medium"
            fontSize="sm"
            _hover={{ textDecoration: "underline" }}
          >
            {displayText}
          </Link>
        ) : (
          <Text color="blue.500" fontWeight="medium" fontSize="sm">
            {displayText}
          </Text>
        )}

        {addressLabels.length > 0 && (
          <HStack spacing={1} mt={labelDirection === "vertical" ? 1 : 0}>
            {addressLabels.map((label, idx) => (
              <Badge
                key={idx}
                colorScheme="green"
                fontSize="xs"
                px={2}
                py={0.5}
                rounded="md"
              >
                {label}
              </Badge>
            ))}
          </HStack>
        )}

        {isLoading && (
          <Spinner
            size="xs"
            ml={1}
            mt={labelDirection === "vertical" ? 1 : 0}
          />
        )}
      </Flex>
    );
  }
);

// Add display name to the memoized component
AddressResolved.displayName = "AddressResolved";

const ENSHistory = () => {
  const params = useParams();

  const ensName =
    typeof params.ensName === "string"
      ? decodeEnsRouteName(params.ensName)
      : "";

  const [loadedEnsName, setLoadedEnsName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [domainDetails, setDomainDetails] = useState<DomainDetails | null>(
    null
  );
  const [initialRegistration, setInitialRegistration] =
    useState<DomainRegistration | null>(null);
  const [historyEvents, setHistoryEvents] = useState<HistoryEvent[]>([]);
  const [contentEvents, setContentEvents] = useState<HistoryEvent[]>([]);
  const [isContentLoaded, setIsContentLoaded] = useState(false);
  const toast = useToast();

  // Update page title when component loads or ensName changes
  useEffect(() => {
    if (ensName) {
      document.title = `${ensName} - ENS History | ETH.sh`;
    }

    // Cleanup function to reset title when navigating away
    return () => {
      document.title = "ENS History | ETH.sh";
    };
  }, [ensName]);

  const getEventBadge = (type: string, label: string) => {
    switch (type) {
      case "content":
        return (
          <Badge colorScheme="blue" fontSize="sm" px={2} py={1} rounded={"lg"}>
            ⚠️ Content Hash
          </Badge>
        );
      case "transfer":
        return (
          <Badge colorScheme="green" fontSize="sm" px={2} py={1} rounded={"lg"}>
            {label}
          </Badge>
        );
      case "renewal":
        return (
          <Badge
            colorScheme="purple"
            fontSize="sm"
            px={2}
            py={1}
            rounded={"lg"}
          >
            Renewal
          </Badge>
        );
      default:
        return (
          <Badge fontSize="sm" px={2} py={1} rounded={"lg"}>
            {label}
          </Badge>
        );
    }
  };

  const getContentChangeColor = (timestamp: number | null) => {
    if (timestamp === null) return undefined;
    const now = new Date();
    const eventDate = new Date(timestamp * 1000);
    const daysDiff = differenceInDays(now, eventDate);

    if (daysDiff <= 10) {
      return "red.500";
    } else if (daysDiff <= 30) {
      return "orange.500";
    }
    return undefined;
  };

  // Memoize the domain details section to prevent re-renders when input changes
  const memoizedDomainDetails = useMemo(() => {
    if (!domainDetails) return null;

    // Read current content independently of historical resolver events.
    const currentContent = domainDetails.currentContenthash;

    // Only IPFS records receive the existing name gateway link.
    const ethLimoUrl =
      currentContent?.protocol === "ipfs" && ensName
        ? `https://${ensName}.link`
        : null;

    return (
      <Card
        color="text.primary"
        variant="outline"
        shadow="sm"
        bg="blackAlpha.300"
      >
        <CardHeader pb={0}>
          <Heading size="sm">🔍 Domain Details</Heading>
        </CardHeader>
        <CardBody>
          {/* Current resolver content, independent of historical events. */}
          {currentContent && (
            <Box mb={6}>
              <Flex alignItems="center" mb={2}>
                <Heading size="sm" mr={2}>
                  Content Hash
                </Heading>
                {ethLimoUrl && (
                  <Tooltip label="Open in .eth.link gateway">
                    <IconButton
                      as="a"
                      href={ethLimoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Open in .eth.link gateway"
                      icon={<ExternalLinkIcon />}
                      size="xs"
                      variant="ghost"
                    />
                  </Tooltip>
                )}
              </Flex>
              <Tooltip
                label={currentContent.display}
                placement="bottom"
                hasArrow
              >
                <Code
                  p={2}
                  borderRadius="md"
                  width="100%"
                  position="relative"
                  bg="bg.subtle"
                  color="text.primary"
                >
                  <Flex align="center">
                    <Text
                      color="inherit"
                      minW={0}
                      fontFamily="mono"
                      fontSize="sm"
                      overflow="hidden"
                      textOverflow="ellipsis"
                      whiteSpace="nowrap"
                      flex="1"
                    >
                      {shortenContenthash(currentContent)}
                    </Text>
                    <IconButton
                      icon={<CopyIcon />}
                      onClick={() =>
                        navigator.clipboard.writeText(currentContent.value)
                      }
                      size="xs"
                      variant="ghost"
                      aria-label="Copy full hash"
                      ml={2}
                    />
                  </Flex>
                </Code>
              </Tooltip>
            </Box>
          )}

          <SimpleGrid
            columns={domainDetails.expiryDate ? 2 : 1}
            spacing={6}
            mb={6}
          >
            <Stat>
              <StatLabel fontWeight="medium">Registration Date</StatLabel>
              {domainDetails.createdAt ? (
                <>
                  <StatNumber fontSize="md" mt={1}>
                    {relativeHistoryDate(domainDetails.createdAt)}
                  </StatNumber>
                  <StatHelpText fontSize="xs" mt={1}>
                    {formatHistoryDate(domainDetails.createdAt)}
                  </StatHelpText>
                </>
              ) : (
                <Text fontSize="sm" color="gray.500" mt={1}>
                  Not indexed
                </Text>
              )}
            </Stat>
            {domainDetails.expiryDate ? (
              <Stat>
                <StatLabel fontWeight="medium">Expiry Date</StatLabel>
                <StatNumber fontSize="md" mt={1}>
                  {relativeHistoryDate(domainDetails.expiryDate)}
                </StatNumber>
                <StatHelpText fontSize="xs" mt={1}>
                  {formatHistoryDate(domainDetails.expiryDate)}
                </StatHelpText>
              </Stat>
            ) : null}
          </SimpleGrid>
          <SimpleGrid columns={2} spacing={6}>
            <Stat>
              <StatLabel fontWeight="medium">Manager</StatLabel>
              <StatNumber fontSize="md" mt={1}>
                <AddressResolved
                  address={domainDetails.owner}
                  labelDirection="vertical"
                />
              </StatNumber>
            </Stat>
            <Stat>
              <StatLabel fontWeight="medium">Registrant</StatLabel>
              <StatNumber fontSize="md" mt={1}>
                {domainDetails.registrant ? (
                  <AddressResolved
                    address={domainDetails.registrant}
                    labelDirection="vertical"
                  />
                ) : (
                  <Text fontSize="sm" color="gray.500">
                    {domainDetails.isSubdomain
                      ? "Not applicable for subdomains"
                      : "Not indexed"}
                  </Text>
                )}
              </StatNumber>
            </Stat>
          </SimpleGrid>
        </CardBody>
      </Card>
    );
  }, [domainDetails, ensName]);

  // Memoize the initial registration section
  const memoizedInitialRegistration = useMemo(() => {
    if (!initialRegistration) return null;

    return (
      <Card
        color="text.primary"
        variant="outline"
        shadow="sm"
        bg="blackAlpha.300"
      >
        <CardHeader pb={0}>
          <Heading size="sm">📅 Registration Info</Heading>
        </CardHeader>
        <CardBody>
          <SimpleGrid columns={2} spacing={6}>
            <Stat>
              <StatLabel fontWeight="medium">Block Number</StatLabel>
              <StatNumber fontSize="md" mt={1}>
                <Link
                  href={`https://etherscan.io/tx/${initialRegistration.transactionID}`}
                  isExternal
                  color="blue.500"
                >
                  {initialRegistration.blockNumber.toLocaleString()}{" "}
                  <ExternalLinkIcon boxSize={3} />
                </Link>
              </StatNumber>
            </Stat>
            <Stat>
              <StatLabel fontWeight="medium">Initial Expiry</StatLabel>
              <StatNumber fontSize="md" mt={1}>
                {relativeHistoryDate(initialRegistration.expiryDate)}
              </StatNumber>
              {initialRegistration.expiryDate !== null && (
                <StatHelpText fontSize="xs" mt={1}>
                  {formatHistoryDate(initialRegistration.expiryDate)}
                </StatHelpText>
              )}
            </Stat>
          </SimpleGrid>
        </CardBody>
      </Card>
    );
  }, [initialRegistration]);

  // Memoize the history events table to prevent re-renders when input changes
  const memoizedHistoryEvents = useMemo(() => {
    return (
      <>
        {!isContentLoaded && contentEvents.length === 0 ? (
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th width="220px" whiteSpace="nowrap" pl={6} py={4}>
                  Time
                </Th>
                <Th py={4}>Event Type</Th>
                <Th py={4}>Details</Th>
                <Th py={4}>Transaction</Th>
              </Tr>
            </Thead>
            <Tbody>
              {[...Array(5)].map((_, index) => (
                <Tr key={index}>
                  <Td width="220px" whiteSpace="nowrap" pl={6} py={4}>
                    <Skeleton
                      height="20px"
                      width="120px"
                      mb={2}
                      rounded={"lg"}
                    />
                    <Skeleton height="16px" width="100px" rounded={"lg"} />
                  </Td>
                  <Td py={4}>
                    <Skeleton height="24px" width="80px" rounded={"lg"} />
                  </Td>
                  <Td py={4}>
                    <Skeleton height="20px" width="200px" rounded={"lg"} />
                  </Td>
                  <Td py={4}>
                    <Skeleton height="20px" width="120px" rounded={"lg"} />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        ) : (
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th width="220px" whiteSpace="nowrap" pl={6} py={4}>
                  Time
                </Th>
                <Th py={4}>Event Type</Th>
                <Th py={4}>Details</Th>
                <Th py={4}>Transaction</Th>
              </Tr>
            </Thead>
            <Tbody>
              {historyEvents.length === 0 ? (
                <Tr>
                  <Td colSpan={4} textAlign="center" py={8}>
                    No history events found for this domain
                  </Td>
                </Tr>
              ) : (
                historyEvents.map((event, index) => (
                  <Tr key={event.id}>
                    <Td
                      width="220px"
                      whiteSpace="nowrap"
                      pl={6}
                      py={4}
                      color={
                        event.type === "content"
                          ? getContentChangeColor(event.timestamp)
                          : undefined
                      }
                    >
                      <Text fontWeight="medium">
                        {relativeHistoryDate(event.timestamp)}
                      </Text>
                      {event.timestamp !== null && (
                        <Text fontSize="xs" color="gray.500" mt={1}>
                          {formatHistoryDate(event.timestamp)}
                        </Text>
                      )}
                    </Td>
                    <Td py={4}>{getEventBadge(event.type, event.label)}</Td>
                    <Td py={4}>
                      {event.type === "content" && event.details.hash && (
                        <Flex align="center">
                          <Tooltip label={event.details.hash.display}>
                            <Text
                              fontFamily="mono"
                              fontSize="sm"
                              mr={2}
                              maxW="300px"
                              overflow="hidden"
                              textOverflow="ellipsis"
                              whiteSpace="nowrap"
                            >
                              {shortenContenthash(event.details.hash)}
                            </Text>
                          </Tooltip>
                          <IconButton
                            icon={<CopyIcon />}
                            onClick={() =>
                              navigator.clipboard.writeText(
                                event.details.hash!.value
                              )
                            }
                            size="xs"
                            variant="ghost"
                            aria-label="Copy full hash"
                          />
                          {event.details.hash.gatewayUrl && (
                            <Link
                              ml={2}
                              href={event.details.hash.gatewayUrl}
                              isExternal
                            >
                              <ExternalLinkIcon fontSize={"md"} />
                            </Link>
                          )}
                        </Flex>
                      )}
                      {event.type === "content" && !event.details.hash && (
                        <Text fontSize="sm">Content hash cleared</Text>
                      )}
                      {event.details.summary && (
                        <Text fontSize="sm" overflowWrap="anywhere">
                          {event.details.summary}
                        </Text>
                      )}
                      {event.details.owner && (
                        <AddressResolved
                          address={event.details.owner}
                          labelDirection="horizontal"
                        />
                      )}
                      {event.details.expiryDate !== undefined && (
                        <Text>
                          New expiry:{" "}
                          {formatHistoryDate(event.details.expiryDate)}
                        </Text>
                      )}
                    </Td>
                    <Td py={4}>
                      <Link
                        href={`https://etherscan.io/tx/${event.transactionID}`}
                        isExternal
                        color="blue.500"
                        fontSize="sm"
                        fontFamily="mono"
                      >
                        {shortenAddress(event.transactionID)}{" "}
                        <ExternalLinkIcon mx="1px" boxSize={3} />
                      </Link>
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        )}
      </>
    );
  }, [historyEvents, contentEvents, isContentLoaded]);

  const fetchResolverBackedDomainDetails = async (
    normalizedName: string,
    isSubdomain: boolean
  ): Promise<DomainDetails | null> => {
    const [owner, rawContenthash] = await Promise.all([
      readEnsAddressRecord(normalizedName).catch(() => null),
      readEnsContenthashRecord(normalizedName).catch(() => null),
    ]);

    const decodedContenthash = rawContenthash
      ? parseContenthash(rawContenthash)
      : null;

    if (!owner && !decodedContenthash) {
      return null;
    }

    return {
      id: namehash(normalizedName),
      createdAt: null,
      expiryDate: null,
      owner,
      registrant: null,
      resolver: null,
      isSubdomain,
      currentContenthash: decodedContenthash,
    };
  };

  const fetchContentHash = async (_ensName?: string, signal?: AbortSignal) => {
    if (!ensName && !_ensName) {
      toast({
        title: "Error",
        description: "Please enter an ENS name",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    const ens = _ensName ?? ensName;

    try {
      setLoading(true);
      setHistoryError(null);
      setHistoryEvents([]);
      setContentEvents([]);
      setIsContentLoaded(false);
      setDomainDetails(null);
      setInitialRegistration(null);

      // Normalize the ENS name
      const normalizedName = normalizeEnsInput(ens);
      setLoadedEnsName(normalizedName);
      const nameParts = normalizedName.split(".");
      const isSubdomain =
        nameParts.length > 2 || nameParts[nameParts.length - 1] !== "eth";

      // 1. Query for domain details
      const domainDetailsQuery = `
        query GetDomainId($node: ID!) {
          domain(id: $node) {
            id,
            expiryDate,
            createdAt,
            wrappedOwner { id }
            owner {
              id
            }, 
            registrant {
              id
            },
            resolver {
              id
            }
          }
        }
      `;

      const domainResponse = await axios.post(
        ENS_SUBGRAPH_URL,
        {
          query: domainDetailsQuery,
          variables: { node: namehash(normalizedName) },
        },
        { signal }
      );
      signal?.throwIfAborted();

      if (domainResponse.data.errors) {
        throw new Error(domainResponse.data.errors[0].message);
      }

      if (!domainResponse.data.data.domain) {
        const fallback = await fetchResolverBackedDomainDetails(
          normalizedName,
          isSubdomain
        );

        if (!fallback) {
          throw new Error("Domain not found");
        }

        signal?.throwIfAborted();
        setDomainDetails(fallback);
        setHistoryEvents([]);
        setContentEvents([]);
        setIsContentLoaded(true);
        return;
      }

      const domain = domainResponse.data.data.domain;
      const domainId = domain.id;
      setDomainDetails(indexedDomainDetails(domain, isSubdomain));

      const request = async (
        query: string,
        variables: Record<string, unknown>
      ) => {
        const response = await axios.post(
          ENS_SUBGRAPH_URL,
          { query, variables },
          { signal }
        );
        if (response.data.errors?.length)
          throw new Error(response.data.errors[0].message);
        return response.data.data;
      };
      const [domainEvents, registrationEvents, resolverEvents, currentHash] =
        await Promise.all([
          fetchIndexedEvents(
            DOMAIN_EVENTS_QUERY,
            "domainEvents",
            domainId,
            request
          ),
          isSubdomain
            ? Promise.resolve([])
            : fetchIndexedEvents(
                REGISTRATION_EVENTS_QUERY,
                "registrationEvents",
                domainId,
                request
              ),
          fetchIndexedEvents(
            RESOLVER_EVENTS_QUERY,
            "resolverEvents",
            domainId,
            request
          ),
          readEnsContenthashRecord(normalizedName).catch(() => null),
        ]);
      signal?.throwIfAborted();

      // Cache block lookups across streams and limit concurrent RPC requests.
      const indexedEvents = [
        ...domainEvents,
        ...registrationEvents,
        ...resolverEvents,
      ];
      const blocks = [
        ...new Set(indexedEvents.map((event) => event.blockNumber)),
      ];
      const timestamps = new Map<number, number | null>();
      for (let start = 0; start < blocks.length; start += 8) {
        signal?.throwIfAborted();
        await Promise.all(
          blocks.slice(start, start + 8).map(async (blockNumber) => {
            timestamps.set(
              blockNumber,
              await readHistoryTimestamp(async () => {
                const block = await publicClient.getBlock({
                  blockNumber: BigInt(blockNumber),
                });
                return block.timestamp;
              })
            );
          })
        );
      }
      signal?.throwIfAborted();
      const processedEvents: HistoryEvent[] = indexedEvents
        .map((event: IndexedEvent) => ({
          id: `${event.__typename}:${event.id}`,
          label:
            (
              {
                Transfer: "Manager Transfer",
                NewOwner: "Owner Assigned",
                NameTransferred: "Registrant Transfer",
                WrappedTransfer: "Wrapped Transfer",
              } as Record<string, string>
            )[event.__typename] ??
            event.__typename.replace(/([a-z])([A-Z])/g, "$1 $2"),
          type:
            event.__typename === "ContenthashChanged"
              ? "content"
              : [
                    "Transfer",
                    "WrappedTransfer",
                    "NameTransferred",
                    "NewOwner",
                  ].includes(event.__typename)
                ? "transfer"
                : event.__typename === "NameRenewed"
                  ? "renewal"
                  : event.__typename,
          blockNumber: event.blockNumber,
          logIndex: Number(event.id.split("-").at(-1)) || 0,
          timestamp: timestamps.get(event.blockNumber) ?? null,
          transactionID: event.transactionID,
          details: {
            hash:
              event.hash && event.hash !== "0x"
                ? parseContenthash(event.hash)!
                : undefined,
            owner:
              event.owner?.id ?? event.newOwner?.id ?? event.registrant?.id,
            expiryDate: [
              "NameRegistered",
              "NameRenewed",
              "NameWrapped",
              "ExpiryExtended",
            ].includes(event.__typename)
              ? parseHistoryTimestamp(event.expiryDate)
              : undefined,
            summary: eventSummary(event),
          },
        }))
        .sort(
          (a, b) =>
            b.blockNumber - a.blockNumber ||
            b.logIndex - a.logIndex ||
            b.id.localeCompare(a.id)
        );
      const registrations = processedEvents.filter(
        (event) => event.type === "NameRegistered"
      );
      const initial = registrations[registrations.length - 1];
      setInitialRegistration(
        registrationDetails(
          initial
            ? {
                blockNumber: initial.blockNumber,
                transactionID: initial.transactionID,
                expiryDate: initial.details.expiryDate,
              }
            : undefined
        )
      );
      setDomainDetails((details) =>
        details ? withCurrentContenthash(details, currentHash) : details
      );
      setContentEvents(
        processedEvents.filter((event) => event.type === "content")
      );
      setHistoryEvents(processedEvents);
      setIsContentLoaded(true);
    } catch (error) {
      if (signal?.aborted) return;
      setIsContentLoaded(true);
      setHistoryError(
        error instanceof Error ? error.message : "Failed to fetch ENS history"
      );
      console.error("Error fetching ENS data:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to fetch ENS data",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  // Route changes cancel subgraph requests and prevent stale results being committed.
  useEffect(() => {
    const controller = new AbortController();
    if (ensName) fetchContentHash(ensName, controller.signal);
    return () => controller.abort();
  }, [ensName]);

  return (
    <>
      {historyError && !domainDetails && (
        <Text color="red.300" role="alert">
          {historyError}
        </Text>
      )}
      {loading ? (
        <Box mt={8}>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8} mb={8}>
            <Card
              color="text.primary"
              variant="outline"
              shadow="sm"
              bg="blackAlpha.500"
            >
              <CardHeader pb={3} pt={4} px={6}>
                <Heading size="sm">🔍 Domain Details</Heading>
              </CardHeader>
              <CardBody pt={2} pb={4} px={6}>
                <SimpleGrid columns={2} spacing={6} mb={4}>
                  <Skeleton height="80px" rounded={"lg"} />
                  <Skeleton height="80px" rounded={"lg"} />
                </SimpleGrid>
                <SimpleGrid columns={2} spacing={6}>
                  <Skeleton height="60px" rounded={"lg"} />
                  <Skeleton height="60px" rounded={"lg"} />
                </SimpleGrid>
              </CardBody>
            </Card>

            <Card
              color="text.primary"
              variant="outline"
              shadow="sm"
              bg="blackAlpha.500"
            >
              <CardHeader pb={3} pt={4} px={6}>
                <Heading size="sm">📅 Registration Info</Heading>
              </CardHeader>
              <CardBody pt={2} pb={4} px={6}>
                <SimpleGrid columns={2} spacing={6}>
                  <Skeleton height="80px" rounded={"lg"} />
                  <Skeleton height="80px" rounded={"lg"} />
                </SimpleGrid>
              </CardBody>
            </Card>
          </SimpleGrid>

          <Heading size="md" mb={5} mt={10}>
            📜 Domain History {loadedEnsName && `(${loadedEnsName})`}
          </Heading>

          <Table variant="simple">
            <Thead>
              <Tr>
                <Th width="220px" whiteSpace="nowrap" pl={6} py={4}>
                  Time
                </Th>
                <Th py={4}>Event Type</Th>
                <Th py={4}>Details</Th>
                <Th py={4}>Transaction</Th>
              </Tr>
            </Thead>
            <Tbody>
              {[...Array(5)].map((_, index) => (
                <Tr key={index}>
                  <Td width="220px" whiteSpace="nowrap" pl={6} py={4}>
                    <Skeleton
                      height="20px"
                      width="120px"
                      mb={2}
                      rounded={"lg"}
                    />
                    <Skeleton height="16px" width="100px" rounded={"lg"} />
                  </Td>
                  <Td py={4}>
                    <Skeleton height="24px" width="80px" rounded={"lg"} />
                  </Td>
                  <Td py={4}>
                    <Skeleton height="20px" width="180px" rounded={"lg"} />
                  </Td>
                  <Td py={4}>
                    <Skeleton height="20px" width="60px" rounded={"lg"} />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      ) : domainDetails ? (
        <Box mt={8}>
          <SimpleGrid
            columns={{ base: 1, md: initialRegistration === null ? 1 : 2 }}
            spacing={6}
            mb={6}
          >
            {memoizedDomainDetails}
            {initialRegistration && memoizedInitialRegistration}
          </SimpleGrid>

          <Heading size="md" mb={5} mt={10}>
            📜 Domain History {loadedEnsName && `(${loadedEnsName})`}
          </Heading>

          <Text fontSize="xs" color="gray.400" mb={4}>
            Indexed registry, registrar and resolver events, including the old
            ENS registry. Legacy auction bids and unindexed resolver activity
            are not included.
          </Text>
          {historyError ? (
            <Text color="red.300" role="alert">
              History could not be loaded: {historyError}
            </Text>
          ) : (
            <Box overflowX="auto">{memoizedHistoryEvents}</Box>
          )}
        </Box>
      ) : (
        <Box pb={8}></Box>
      )}
    </>
  );
};

export default ENSHistory;
