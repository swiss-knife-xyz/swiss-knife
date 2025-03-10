"use client";

import { useState, useEffect } from "react";
import {
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  FormControl,
  FormLabel,
  Input,
  Button,
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
  Center,
} from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import { publicClient, getEnsName, fetchContractAbi } from "@/utils";
import { formatDistanceToNow, format, differenceInDays } from "date-fns";
import axios from "axios";
import { normalize } from "viem/ens";
import contentHash from "content-hash";
import { CopyToClipboard } from "@/components/CopyToClipboard";

const ENS_SUBGRAPH_URL = `https://gateway.thegraph.com/api/${process.env.NEXT_PUBLIC_THE_GRAPH_API_KEY}/subgraphs/id/5XqPmWe6gjyrJtFn9cLy237i4cWw2j9HcUJEXsP5qGtH`;

interface Domain {
  resolver: {
    id: string;
  };
}

interface ContentEvent {
  blockNumber: number;
  transactionID: string;
  hash: string;
}

interface DomainDetails {
  id: string;
  createdAt: number;
  expiryDate: number;
  owner: string;
  registrant: string;
}

interface DomainTransfer {
  blockNumber: number;
  id: string;
  owner: string;
  transactionID: string;
  timestamp?: number;
}

interface DomainRenewal {
  blockNumber: number;
  expiryDate: number;
  transactionID: string;
  timestamp?: number;
}

interface DomainRegistration {
  blockNumber: number;
  expiryDate: number;
  timestamp?: number;
}

// Unified history event interface
interface HistoryEvent {
  type: "content" | "transfer" | "renewal";
  timestamp: number;
  transactionID: string;
  details: {
    hash?: string;
    owner?: string;
    expiryDate?: number;
  };
}

const ContentChanges = () => {
  const [ensName, setEnsName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [domainDetails, setDomainDetails] = useState<DomainDetails | null>(
    null
  );
  const [initialRegistration, setInitialRegistration] =
    useState<DomainRegistration | null>(null);
  const [historyEvents, setHistoryEvents] = useState<HistoryEvent[]>([]);
  const [contentEvents, setContentEvents] = useState<HistoryEvent[]>([]);
  const [otherEvents, setOtherEvents] = useState<HistoryEvent[]>([]);
  const [isContentLoaded, setIsContentLoaded] = useState(false);
  const toast = useToast();

  const decodeContentHash = (encoded: string): string | null => {
    try {
      if (!encoded.startsWith("0xe3")) {
        // Not an IPFS link
        return null;
      }

      const ipfsv0 = contentHash.decode(encoded);
      const ipfsv1 = contentHash.helpers.cidV0ToV1Base32(ipfsv0);
      return ipfsv1;
    } catch (error) {
      console.error("Error decoding content hash:", error);
      return null;
    }
  };

  const fetchContentHash = async (_ensName?: string) => {
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
      setHistoryEvents([]);
      setContentEvents([]);
      setOtherEvents([]);
      setIsContentLoaded(false);

      // Normalize the ENS name
      const normalizedName = normalize(ens);
      const labelName = normalizedName.split(".")[0]; // Get the part before .eth

      // 1. Query for domain details
      const domainDetailsQuery = `
        query GetDomainId($ens: String!) {
          domains(where: {name: $ens}) {
            id,
            expiryDate,
            createdAt,
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

      const domainResponse = await axios.post(ENS_SUBGRAPH_URL, {
        query: domainDetailsQuery,
        variables: { ens: normalizedName },
      });

      if (domainResponse.data.errors) {
        throw new Error(domainResponse.data.errors[0].message);
      }

      if (
        !domainResponse.data.data.domains ||
        domainResponse.data.data.domains.length === 0
      ) {
        throw new Error("Domain not found");
      }

      const domain = domainResponse.data.data.domains[0];
      const resolverId = domain.resolver.id;
      const domainId = domain.id;

      setDomainDetails({
        id: domain.id,
        createdAt: parseInt(domain.createdAt),
        expiryDate: parseInt(domain.expiryDate),
        owner: domain.owner.id,
        registrant: domain.registrant.id,
      });

      // Prioritize content hash changes
      const fetchContentHashChanges = async () => {
        // Query for content hash changes
        const contentHashQuery = `
          query GetENSContentHashes($resolverId: String!) {
            contenthashChangeds(
              orderBy: blockNumber
              orderDirection: desc
              where: {resolver: $resolverId}
            ) {
              blockNumber
              transactionID
              hash
            }
          }
        `;

        const contentHashResponse = await axios.post(ENS_SUBGRAPH_URL, {
          query: contentHashQuery,
          variables: { resolverId },
        });

        if (contentHashResponse.data.errors) {
          throw new Error(contentHashResponse.data.errors[0].message);
        }

        const contentEvents = contentHashResponse.data.data
          .contenthashChangeds as ContentEvent[];

        // Process content events with Promise.all for parallel processing
        const contentEventsPromises = contentEvents.map(async (event) => {
          const block = await publicClient.getBlock({
            blockNumber: BigInt(event.blockNumber),
          });

          return {
            type: "content" as const,
            timestamp: Number(block.timestamp),
            transactionID: event.transactionID,
            details: {
              hash: decodeContentHash(event.hash) ?? "",
            },
          };
        });

        const processedContentEvents = await Promise.all(contentEventsPromises);

        // Sort content events by timestamp (newest first)
        processedContentEvents.sort((a, b) => b.timestamp - a.timestamp);

        // Set content events and mark as loaded immediately
        setContentEvents(processedContentEvents);
        setIsContentLoaded(true);

        return processedContentEvents;
      };

      // Start fetching content hash changes immediately
      const contentHashPromise = fetchContentHashChanges();

      // Fetch other data in parallel
      const fetchOtherData = async () => {
        const otherEvents: HistoryEvent[] = [];

        // Prepare all queries
        const transfersQuery = `
          query GetDomainTransfers($domainId: String!) {
            domainEvents(
              where: {domain: $domainId}
            ) {
              ... on WrappedTransfer {
                id
                transactionID
                blockNumber
                owner {
                  id
                }
              }
            }
          }
        `;

        const renewalsQuery = `
          query GetDomainRenewals($labelName: String!) {
            nameReneweds(
              orderBy: blockNumber
              orderDirection: desc
              where: {registration_: {labelName: $labelName}}
            ) {
              blockNumber
              expiryDate
              transactionID
            }
          }
        `;

        const registrationQuery = `
          query GetDomainInitialExpiry($labelName: String!) {
            registrationEvents(where: {registration_: {labelName: $labelName}}) {
              ... on NameRegistered {
                expiryDate,
                blockNumber
              }
            }
          }
        `;

        // Execute all queries in parallel
        const [transfersResponse, renewalsResponse, registrationResponse] =
          await Promise.all([
            axios.post(ENS_SUBGRAPH_URL, {
              query: transfersQuery,
              variables: { domainId },
            }),
            axios.post(ENS_SUBGRAPH_URL, {
              query: renewalsQuery,
              variables: { labelName },
            }),
            axios.post(ENS_SUBGRAPH_URL, {
              query: registrationQuery,
              variables: { labelName },
            }),
          ]);

        // Process transfers
        if (!transfersResponse.data.errors) {
          const transfers = transfersResponse.data.data.domainEvents
            .filter((event: any) => event.id) // Filter out empty objects
            .map((event: any) => ({
              blockNumber: event.blockNumber,
              id: event.id,
              owner: event.owner.id,
              transactionID: event.transactionID,
            }));

          // Process transfers with Promise.all
          const transferPromises = transfers.map(
            async (transfer: DomainTransfer) => {
              const block = await publicClient.getBlock({
                blockNumber: BigInt(transfer.blockNumber),
              });

              return {
                type: "transfer" as const,
                timestamp: Number(block.timestamp),
                transactionID: transfer.transactionID,
                details: {
                  owner: transfer.owner,
                },
              };
            }
          );

          const processedTransfers = await Promise.all(transferPromises);
          otherEvents.push(...processedTransfers);
        }

        // Process renewals
        if (!renewalsResponse.data.errors) {
          const renewals = renewalsResponse.data.data
            .nameReneweds as DomainRenewal[];

          // Process renewals with Promise.all
          const renewalPromises = renewals.map(async (renewal) => {
            const block = await publicClient.getBlock({
              blockNumber: BigInt(renewal.blockNumber),
            });

            return {
              type: "renewal" as const,
              timestamp: Number(block.timestamp),
              transactionID: renewal.transactionID,
              details: {
                expiryDate: renewal.expiryDate,
              },
            };
          });

          const processedRenewals = await Promise.all(renewalPromises);
          otherEvents.push(...processedRenewals);
        }

        // Process registration
        if (!registrationResponse.data.errors) {
          const registrations =
            registrationResponse.data.data.registrationEvents.filter(
              (event: any) => event.blockNumber
            ); // Filter out empty objects

          if (registrations.length > 0) {
            const registration = registrations[0];
            const block = await publicClient.getBlock({
              blockNumber: BigInt(registration.blockNumber),
            });

            setInitialRegistration({
              blockNumber: registration.blockNumber,
              expiryDate: parseInt(registration.expiryDate),
              timestamp: Number(block.timestamp),
            });
          }
        }

        return otherEvents;
      };

      // Execute other data fetching in parallel with content hash fetching
      const [contentHashEvents, otherDataEvents] = await Promise.all([
        contentHashPromise,
        fetchOtherData(),
      ]);

      // Sort other events by timestamp (newest first)
      otherDataEvents.sort((a, b) => b.timestamp - a.timestamp);
      setOtherEvents(otherDataEvents);

      // Combine all events
      const allEvents = [...contentHashEvents, ...otherDataEvents];
      allEvents.sort((a, b) => b.timestamp - a.timestamp);
      setHistoryEvents(allEvents);
    } catch (error) {
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
      setLoading(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault(); // Prevent default paste behavior
    const pastedText = e.clipboardData.getData("text");
    setEnsName(pastedText);
    fetchContentHash(pastedText);
  };

  const formatDate = (timestamp: number) => {
    return format(new Date(timestamp * 1000), "PPpp");
  };

  const shortenAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(
      address.length - 4
    )}`;
  };

  const shortenHash = (hash: string) => {
    if (!hash) return "";
    return `ipfs://${hash.substring(0, 10)}...${hash.substring(
      hash.length - 4
    )}`;
  };

  // AddressResolved component to display addresses with ENS resolution
  const AddressResolved = ({
    address,
    isExternal = true,
    labelDirection = "vertical",
  }: {
    address: string;
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
          // Try to get ENS name
          const name = await getEnsName(address);
          setResolvedEnsName(name);

          // If no ENS name, try to fetch labels or contract name
          if (!name) {
            let labelsFound = false;

            // First try to fetch labels from API
            try {
              const res = await axios.get(
                `${
                  process.env.NEXT_PUBLIC_DEVELOPMENT === "true"
                    ? ""
                    : "https://swiss-knife.xyz"
                }/api/labels/${address}`
              );
              const data = res.data;
              if (data.length > 0) {
                setAddressLabels(data);
                labelsFound = true;
              }
            } catch (error) {
              console.error("Error fetching address labels:", error);
              // Continue to next method if labels API fails
            }

            // If no labels found from API, try to get contract name
            if (!labelsFound) {
              try {
                const contractInfo = await fetchContractAbi({
                  address,
                  chainId: 1, // Ethereum mainnet
                });

                if (contractInfo.name) {
                  setAddressLabels([contractInfo.name]);
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

    const displayText = resolvedEnsName || shortenAddress(address);

    return (
      <Flex
        direction={labelDirection === "vertical" ? "column" : "row"}
        align="flex-start"
        alignItems={labelDirection === "horizontal" ? "center" : "flex-start"}
        gap={labelDirection === "horizontal" ? 2 : 0}
      >
        {isExternal ? (
          <Link href={`https://etherscan.io/address/${address}`} isExternal>
            {isLoading ? <Spinner size="xs" mr={1} /> : null}
            {displayText} <ExternalLinkIcon mx="1px" boxSize={3} />
          </Link>
        ) : (
          <Text>
            {isLoading ? <Spinner size="xs" mr={1} /> : null}
            {displayText}
          </Text>
        )}

        {!resolvedEnsName && addressLabels.length > 0 && (
          <Badge
            mt={labelDirection === "vertical" ? 1 : 0}
            colorScheme="green"
            fontSize="xs"
            rounded="lg"
            width="fit-content"
          >
            {addressLabels[0]}
          </Badge>
        )}
      </Flex>
    );
  };

  const getEventBadge = (type: string) => {
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
            Transfer
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
            Unknown
          </Badge>
        );
    }
  };

  const getContentChangeColor = (timestamp: number) => {
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

  return (
    <>
      <Heading color="custom.pale" mb={6}>
        ENS Domain History
      </Heading>
      <Box maxW="1200px" w="full" px={4}>
        <Center>
          <FormControl maxW="40rem">
            <FormLabel fontWeight="medium">ENS Name</FormLabel>
            <HStack spacing={4}>
              <Input
                placeholder="eternalsafe.eth"
                value={ensName}
                onChange={(e) => setEnsName(e.target.value)}
                onPaste={handlePaste}
                size="md"
              />
              <Button
                onClick={() => fetchContentHash()}
                isLoading={loading}
                colorScheme="blue"
                px={6}
              >
                Fetch
              </Button>
            </HStack>
          </FormControl>
        </Center>

        {loading ? (
          <Box mt={8}>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8} mb={8}>
              <Card variant="outline" shadow="sm" bg="blackAlpha.500">
                <CardHeader pb={3} pt={4} px={6}>
                  <Heading size="sm">🔍 Domain Details</Heading>
                </CardHeader>
                <CardBody pt={2} pb={4} px={6}>
                  <SimpleGrid columns={2} spacing={6} mb={4}>
                    <Skeleton height="80px" />
                    <Skeleton height="80px" />
                  </SimpleGrid>
                  <SimpleGrid columns={2} spacing={6}>
                    <Skeleton height="60px" />
                    <Skeleton height="60px" />
                  </SimpleGrid>
                </CardBody>
              </Card>

              <Card variant="outline" shadow="sm" bg="blackAlpha.500">
                <CardHeader pb={3} pt={4} px={6}>
                  <Heading size="sm">📅 Registration Info</Heading>
                </CardHeader>
                <CardBody pt={2} pb={4} px={6}>
                  <SimpleGrid columns={2} spacing={6}>
                    <Skeleton height="80px" />
                    <Skeleton height="80px" />
                  </SimpleGrid>
                </CardBody>
              </Card>
            </SimpleGrid>

            <Heading size="md" mb={5} mt={10}>
              📜 Domain History ({ensName})
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
                      <Skeleton height="20px" width="120px" mb={2} />
                      <Skeleton height="16px" width="100px" />
                    </Td>
                    <Td py={4}>
                      <Skeleton height="24px" width="80px" />
                    </Td>
                    <Td py={4}>
                      <Skeleton height="20px" width="180px" />
                    </Td>
                    <Td py={4}>
                      <Skeleton height="20px" width="60px" />
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        ) : domainDetails ? (
          <Box mt={8}>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8} mb={8}>
              <Card variant="outline" shadow="sm" bg="blackAlpha.500">
                <CardHeader pb={3} pt={4} px={6}>
                  <Heading size="sm">🔍 Domain Details</Heading>
                </CardHeader>
                <CardBody pt={2} pb={4} px={6}>
                  <SimpleGrid columns={2} spacing={6} mb={5}>
                    <Stat>
                      <StatLabel fontWeight="medium">Created</StatLabel>
                      <StatNumber fontSize="md" mt={1}>
                        {formatDistanceToNow(domainDetails.createdAt * 1000, {
                          addSuffix: true,
                        })}
                      </StatNumber>
                      <StatHelpText fontSize="xs" mt={1}>
                        {formatDate(domainDetails.createdAt)}
                      </StatHelpText>
                    </Stat>
                    <Stat>
                      <StatLabel fontWeight="medium">Expires</StatLabel>
                      <StatNumber fontSize="md" mt={1}>
                        {formatDistanceToNow(domainDetails.expiryDate * 1000, {
                          addSuffix: true,
                        })}
                      </StatNumber>
                      <StatHelpText fontSize="xs" mt={1}>
                        {formatDate(domainDetails.expiryDate)}
                      </StatHelpText>
                    </Stat>
                  </SimpleGrid>
                  <SimpleGrid columns={2} spacing={6}>
                    <Stat>
                      <StatLabel fontWeight="medium">Owner</StatLabel>
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
                        <AddressResolved
                          address={domainDetails.registrant}
                          labelDirection="vertical"
                        />
                      </StatNumber>
                    </Stat>
                  </SimpleGrid>
                </CardBody>
              </Card>

              {initialRegistration && (
                <Card variant="outline" shadow="sm" bg="blackAlpha.500">
                  <CardHeader pb={3} pt={4} px={6}>
                    <Heading size="sm">📅 Registration Info</Heading>
                  </CardHeader>
                  <CardBody pt={2} pb={4} px={6}>
                    <SimpleGrid columns={2} spacing={6}>
                      <Stat>
                        <StatLabel fontWeight="medium">
                          Initial Registration
                        </StatLabel>
                        <StatNumber fontSize="md" mt={1}>
                          {formatDistanceToNow(
                            initialRegistration.timestamp
                              ? initialRegistration.timestamp * 1000
                              : Date.now(),
                            { addSuffix: true }
                          )}
                        </StatNumber>
                        <StatHelpText fontSize="xs" mt={1}>
                          {initialRegistration.timestamp
                            ? formatDate(initialRegistration.timestamp)
                            : "Unknown"}
                        </StatHelpText>
                      </Stat>
                      <Stat>
                        <StatLabel fontWeight="medium">
                          Initial Expiry
                        </StatLabel>
                        <StatNumber fontSize="md" mt={1}>
                          {formatDistanceToNow(
                            initialRegistration.expiryDate * 1000,
                            { addSuffix: true }
                          )}
                        </StatNumber>
                        <StatHelpText fontSize="xs" mt={1}>
                          {formatDate(initialRegistration.expiryDate)}
                        </StatHelpText>
                      </Stat>
                    </SimpleGrid>
                  </CardBody>
                </Card>
              )}
            </SimpleGrid>

            <Heading size="md" mb={5} mt={10}>
              📜 Domain History ({ensName})
            </Heading>

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
                        <Skeleton height="20px" width="120px" mb={2} />
                        <Skeleton height="16px" width="100px" />
                      </Td>
                      <Td py={4}>
                        <Skeleton height="24px" width="80px" />
                      </Td>
                      <Td py={4}>
                        <Skeleton height="20px" width="180px" />
                      </Td>
                      <Td py={4}>
                        <Skeleton height="20px" width="60px" />
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
                  {(loading ? contentEvents : historyEvents).map(
                    (event, index) => (
                      <Tr key={`${event.transactionID}-${index}`}>
                        <Td width="220px" whiteSpace="nowrap" pl={6} py={4}>
                          <Text>{formatDate(event.timestamp)}</Text>
                          <Text
                            fontSize="sm"
                            color={getContentChangeColor(event.timestamp)}
                            mt={1}
                          >
                            {formatDistanceToNow(event.timestamp * 1000, {
                              addSuffix: true,
                            })}
                          </Text>
                        </Td>
                        <Td py={4}>{getEventBadge(event.type)}</Td>
                        <Td py={4}>
                          {event.type === "content" && event.details.hash && (
                            <Flex align="center">
                              <Tooltip
                                label={`ipfs://${event.details.hash}`}
                                placement="top"
                              >
                                <Text>{shortenHash(event.details.hash)}</Text>
                              </Tooltip>
                              <CopyToClipboard
                                textToCopy={`ipfs://${event.details.hash}`}
                                ml={3}
                                size="xs"
                                variant="ghost"
                                aria-label="Copy full hash"
                              />
                            </Flex>
                          )}
                          {event.type === "transfer" && event.details.owner && (
                            <AddressResolved
                              address={event.details.owner}
                              labelDirection="horizontal"
                            />
                          )}
                          {event.type === "renewal" &&
                            event.details.expiryDate && (
                              <Text>
                                New expiry:{" "}
                                {formatDate(event.details.expiryDate)}
                              </Text>
                            )}
                        </Td>
                        <Td py={4}>
                          <Link
                            href={`https://etherscan.io/tx/${event.transactionID}`}
                            isExternal
                          >
                            Tx <ExternalLinkIcon mx="2px" />
                          </Link>
                        </Td>
                      </Tr>
                    )
                  )}
                  {loading && (
                    <Tr>
                      <Td colSpan={4} textAlign="center" py={5}>
                        <Flex justify="center" align="center" py={2}>
                          <Spinner size="sm" mr={3} />
                          <Text>Loading additional history events...</Text>
                        </Flex>
                      </Td>
                    </Tr>
                  )}
                </Tbody>
              </Table>
            )}
          </Box>
        ) : (
          <Box mt={8} p={6} bg="blackAlpha.300" borderRadius="md">
            <Text>Enter an ENS name to view its history</Text>
          </Box>
        )}
      </Box>
    </>
  );
};

export default ContentChanges;
