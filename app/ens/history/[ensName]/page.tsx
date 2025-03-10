"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, memo, useRef, useMemo } from "react";
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
import { publicClient, getEnsName, fetchContractAbi } from "@/utils";
import { formatDistanceToNow, format, differenceInDays } from "date-fns";
import axios from "axios";
import { normalize } from "viem/ens";
import contentHash from "content-hash";
import { encodePacked, erc721Abi, keccak256, labelhash } from "viem";

const ENS_SUBGRAPH_URL = `https://gateway.thegraph.com/api/${process.env.NEXT_PUBLIC_THE_GRAPH_API_KEY}/subgraphs/id/5XqPmWe6gjyrJtFn9cLy237i4cWw2j9HcUJEXsP5qGtH`;

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
  registrant: string | null;
  resolver: {
    id: string;
  };
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

const ENSHistory = () => {
  const params = useParams();

  const ensName = typeof params.ensName === "string" ? params.ensName : "";

  const [loadedEnsName, setLoadedEnsName] = useState<string>("");
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

  // Utility functions - moved to the top of the component
  const formatDate = (timestamp: number) => {
    return format(new Date(timestamp * 1000), "PPpp");
  };

  const shortenAddress = (address: string | null) => {
    if (!address) return "N/A";
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
      const [resolvedEnsName, setResolvedEnsName] = useState<string | null>(
        null
      );
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
                  }/api/labels/${address}?chainId=1`
                );
                const data = res.data;
                if (data.length > 0) {
                  setAddressLabels([data[0]]);
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

  // Memoize the domain details section to prevent re-renders when input changes
  const memoizedDomainDetails = useMemo(() => {
    if (!domainDetails) return null;

    // Get the most recent content hash event (if any)
    const latestContentEvent =
      contentEvents.length > 0 ? contentEvents[0] : null;
    const ipfsHash = latestContentEvent?.details.hash || null;

    // Create the .eth.limo URL if we have an IPFS hash
    const ethLimoUrl = ipfsHash && ensName ? `https://${ensName}.limo` : null;

    return (
      <Card variant="outline" shadow="sm" bg="blackAlpha.300">
        <CardHeader pb={0}>
          <Heading size="sm">🔍 Domain Details</Heading>
        </CardHeader>
        <CardBody>
          {/* IPFS Content Section - Added prominently at the top */}
          {ipfsHash && (
            <Box mb={6}>
              <Flex alignItems="center" mb={2}>
                <Heading size="sm" mr={2}>
                  IPFS Content
                </Heading>
                {ethLimoUrl && (
                  <Tooltip label="Open in .eth.limo gateway">
                    <IconButton
                      as="a"
                      href={ethLimoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Open in .eth.limo gateway"
                      icon={<ExternalLinkIcon />}
                      size="xs"
                      variant="ghost"
                    />
                  </Tooltip>
                )}
              </Flex>
              <Tooltip label={ipfsHash} placement="bottom" hasArrow>
                <Code p={2} borderRadius="md" width="100%" position="relative">
                  <Flex align="center">
                    <Text
                      fontFamily="mono"
                      fontSize="sm"
                      overflow="hidden"
                      textOverflow="ellipsis"
                      whiteSpace="nowrap"
                      flex="1"
                    >
                      {shortenHash(ipfsHash)}
                    </Text>
                    <IconButton
                      icon={<CopyIcon />}
                      onClick={() => navigator.clipboard.writeText(ipfsHash)}
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

          <SimpleGrid columns={2} spacing={6} mb={6}>
            <Stat>
              <StatLabel fontWeight="medium">Registration Date</StatLabel>
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
              <StatLabel fontWeight="medium">Expiry Date</StatLabel>
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
                {domainDetails.registrant ? (
                  <AddressResolved
                    address={domainDetails.registrant}
                    labelDirection="vertical"
                  />
                ) : (
                  <Text fontSize="sm" color="gray.500">
                    Not applicable for subdomains
                  </Text>
                )}
              </StatNumber>
            </Stat>
          </SimpleGrid>
        </CardBody>
      </Card>
    );
  }, [domainDetails, contentEvents, ensName]);

  // Memoize the initial registration section
  const memoizedInitialRegistration = useMemo(() => {
    if (!initialRegistration) return null;

    return (
      <Card variant="outline" shadow="sm" bg="blackAlpha.300">
        <CardHeader pb={0}>
          <Heading size="sm">📅 Registration Info</Heading>
        </CardHeader>
        <CardBody>
          <SimpleGrid columns={2} spacing={6}>
            <Stat>
              <StatLabel fontWeight="medium">Block Number</StatLabel>
              <StatNumber fontSize="md" mt={1}>
                {initialRegistration.blockNumber.toLocaleString()}
              </StatNumber>
            </Stat>
            <Stat>
              <StatLabel fontWeight="medium">Initial Expiry</StatLabel>
              <StatNumber fontSize="md" mt={1}>
                {formatDistanceToNow(initialRegistration.expiryDate * 1000, {
                  addSuffix: true,
                })}
              </StatNumber>
              <StatHelpText fontSize="xs" mt={1}>
                {formatDate(initialRegistration.expiryDate)}
              </StatHelpText>
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
                  <Tr key={index}>
                    <Td
                      width="220px"
                      whiteSpace="nowrap"
                      pl={6}
                      py={4}
                      color={getContentChangeColor(event.timestamp)}
                    >
                      <Text fontWeight="medium">
                        {formatDistanceToNow(event.timestamp * 1000, {
                          addSuffix: true,
                        })}
                      </Text>
                      <Text fontSize="xs" color="gray.500" mt={1}>
                        {formatDate(event.timestamp)}
                      </Text>
                    </Td>
                    <Td py={4}>{getEventBadge(event.type)}</Td>
                    <Td py={4}>
                      {event.type === "content" && event.details.hash && (
                        <Flex align="center">
                          <Tooltip label={event.details.hash}>
                            <Text
                              fontFamily="mono"
                              fontSize="sm"
                              mr={2}
                              maxW="300px"
                              overflow="hidden"
                              textOverflow="ellipsis"
                              whiteSpace="nowrap"
                            >
                              {shortenHash(event.details.hash)}
                            </Text>
                          </Tooltip>
                          <IconButton
                            icon={<CopyIcon />}
                            onClick={() =>
                              navigator.clipboard.writeText(event.details.hash!)
                            }
                            size="xs"
                            variant="ghost"
                            aria-label="Copy full hash"
                          />
                          <Link
                            ml={2}
                            href={`https://${event.details.hash}.ipfs.inbrowser.link`}
                            isExternal
                          >
                            <ExternalLinkIcon fontSize={"md"} />
                          </Link>
                        </Flex>
                      )}
                      {event.type === "transfer" && event.details.owner && (
                        <AddressResolved
                          address={event.details.owner}
                          labelDirection="horizontal"
                        />
                      )}
                      {event.type === "renewal" && event.details.expiryDate && (
                        <Text>
                          New expiry: {formatDate(event.details.expiryDate)}
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
      setLoadedEnsName(normalizedName);
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

      // if the ENS name is wrapped, we need to get the owner of the token
      const ENS_NAME_WRAPPER = "0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401";
      let owner = domain.owner.id;
      if (owner.toLowerCase() === ENS_NAME_WRAPPER.toLowerCase()) {
        const labelHash = labelhash(normalizedName.split(".")[0]);

        const ETH_NODE =
          "0x93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae";
        const node = keccak256(
          encodePacked(["bytes32", "bytes32"], [ETH_NODE, labelHash])
        );
        const tokenId = BigInt(node);

        owner = await publicClient.readContract({
          address: ENS_NAME_WRAPPER,
          abi: erc721Abi,
          functionName: "ownerOf",
          args: [tokenId],
        });
      }

      setDomainDetails({
        id: domain.id,
        createdAt: parseInt(domain.createdAt),
        expiryDate: parseInt(domain.expiryDate),
        owner,
        registrant: domain.registrant?.id || null,
        resolver: {
          id: resolverId,
        },
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

  // Effect to load ENS data when ensName is provided
  useEffect(() => {
    if (ensName && ensName !== loadedEnsName) {
      fetchContentHash(ensName);
    }
  }, [ensName, loadedEnsName]);

  return (
    <>
      {loading ? (
        <Box mt={8}>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8} mb={8}>
            <Card variant="outline" shadow="sm" bg="blackAlpha.500">
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

            <Card variant="outline" shadow="sm" bg="blackAlpha.500">
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

          {memoizedHistoryEvents}
        </Box>
      ) : (
        <Box pb={8}></Box>
      )}
    </>
  );
};

export default ENSHistory;
