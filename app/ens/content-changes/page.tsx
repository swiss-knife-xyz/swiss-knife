"use client";

import { useState } from "react";
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
  Divider,
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
  SkeletonText,
  Tooltip,
  Flex,
} from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import { createPublicClient, http, namehash } from "viem";
import { mainnet } from "viem/chains";
import { formatDistanceToNow, format, differenceInDays } from "date-fns";
import axios from "axios";
import { normalize } from "viem/ens";
import bs58 from "bs58";
import contentHash from "content-hash";
import { CopyToClipboard } from "@/components/CopyToClipboard";

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http("https://rpc.ankr.com/eth"),
});

const ENS_SUBGRAPH_URL = `https://gateway.thegraph.com/api/${process.env.NEXT_PUBLIC_THE_GRAPH_API_KEY}/subgraphs/id/5XqPmWe6gjyrJtFn9cLy237i4cWw2j9HcUJEXsP5qGtH`;

interface Domain {
  resolver: {
    id: string;
  };
}

interface QueryResult {
  domain: Domain;
}

interface ContentEvent {
  blockNumber: number;
  transactionID: string;
  hash: string;
}

interface ContentHistory {
  transactionID: string;
  hash: string;
  timestamp: number;
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

  const fetchContentHash = async () => {
    if (!ensName) {
      toast({
        title: "Error",
        description: "Please enter an ENS name",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setLoading(true);
      setHistoryEvents([]);

      // Normalize the ENS name
      const normalizedName = normalize(ensName);
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

      // Collect all events to be merged later
      const allEvents: HistoryEvent[] = [];

      // 2. Query for domain transfers
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

      const transfersResponse = await axios.post(ENS_SUBGRAPH_URL, {
        query: transfersQuery,
        variables: { domainId },
      });

      if (!transfersResponse.data.errors) {
        const transfers = transfersResponse.data.data.domainEvents
          .filter((event: any) => event.id) // Filter out empty objects
          .map((event: any) => ({
            blockNumber: event.blockNumber,
            id: event.id,
            owner: event.owner.id,
            transactionID: event.transactionID,
          }));

        // Add timestamps to transfers and convert to unified format
        for (const transfer of transfers) {
          const block = await publicClient.getBlock({
            blockNumber: BigInt(transfer.blockNumber),
          });

          allEvents.push({
            type: "transfer",
            timestamp: Number(block.timestamp),
            transactionID: transfer.transactionID,
            details: {
              owner: transfer.owner,
            },
          });
        }
      }

      // 3. Query for domain renewals
      const renewalsQuery = `
        query GetDomainRenewals($labelName: String!) {
          registrationEvents(where: {registration_: {labelName: $labelName}}) {
            ... on NameRenewed {
              blockNumber
              transactionID
              expiryDate
            }
          }
        }
      `;

      const renewalsResponse = await axios.post(ENS_SUBGRAPH_URL, {
        query: renewalsQuery,
        variables: { labelName },
      });

      if (!renewalsResponse.data.errors) {
        const renewals = renewalsResponse.data.data.registrationEvents
          .filter((event: any) => event.blockNumber) // Filter out empty objects
          .map((event: any) => ({
            blockNumber: event.blockNumber,
            expiryDate: parseInt(event.expiryDate),
            transactionID: event.transactionID,
          }));

        // Add timestamps to renewals and convert to unified format
        for (const renewal of renewals) {
          const block = await publicClient.getBlock({
            blockNumber: BigInt(renewal.blockNumber),
          });

          allEvents.push({
            type: "renewal",
            timestamp: Number(block.timestamp),
            transactionID: renewal.transactionID,
            details: {
              expiryDate: renewal.expiryDate,
            },
          });
        }
      }

      // 4. Query for initial registration
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

      const registrationResponse = await axios.post(ENS_SUBGRAPH_URL, {
        query: registrationQuery,
        variables: { labelName },
      });

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

      // 5. Query for content hash changes
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

      // Add content events to unified history
      for (const event of contentEvents) {
        const block = await publicClient.getBlock({
          blockNumber: BigInt(event.blockNumber),
        });

        allEvents.push({
          type: "content",
          timestamp: Number(block.timestamp),
          transactionID: event.transactionID,
          details: {
            hash: decodeContentHash(event.hash) ?? "",
          },
        });
      }

      // Sort all events by timestamp (newest first)
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
    fetchContentHash();
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
      <Heading color="custom.pale">ENS Domain History</Heading>
      <Box mt="3rem" maxW="1000px" w="full">
        <FormControl>
          <FormLabel>ENS Name</FormLabel>
          <HStack>
            <Input
              placeholder="horswap.eth"
              value={ensName}
              onChange={(e) => setEnsName(e.target.value)}
              onPaste={handlePaste}
            />
            <Button
              onClick={fetchContentHash}
              isLoading={loading}
              colorScheme="blue"
            >
              Fetch
            </Button>
          </HStack>
        </FormControl>

        {loading ? (
          <Box mt={6}>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mb={6}>
              <Card variant="outline" shadow="sm" bg="blackAlpha.500">
                <CardHeader pb={2}>
                  <Heading size="sm">🔍 Domain Details</Heading>
                </CardHeader>
                <CardBody pt={0}>
                  <SimpleGrid columns={2} spacing={4} mb={4}>
                    <Skeleton height="80px" />
                    <Skeleton height="80px" />
                  </SimpleGrid>
                  <SimpleGrid columns={2} spacing={4}>
                    <Skeleton height="60px" />
                    <Skeleton height="60px" />
                  </SimpleGrid>
                </CardBody>
              </Card>

              <Card variant="outline" shadow="sm" bg="blackAlpha.500">
                <CardHeader pb={2}>
                  <Heading size="sm">📅 Registration Info</Heading>
                </CardHeader>
                <CardBody pt={0}>
                  <SimpleGrid columns={2} spacing={4}>
                    <Skeleton height="80px" />
                    <Skeleton height="80px" />
                  </SimpleGrid>
                </CardBody>
              </Card>
            </SimpleGrid>

            <Heading size="md" mb={4}>
              📜 Domain History
            </Heading>

            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th width="200px" whiteSpace="nowrap">
                    Time
                  </Th>
                  <Th>Event Type</Th>
                  <Th>Details</Th>
                  <Th>Transaction</Th>
                </Tr>
              </Thead>
              <Tbody>
                {[...Array(5)].map((_, index) => (
                  <Tr key={index}>
                    <Td width="200px" whiteSpace="nowrap">
                      <Skeleton height="20px" width="120px" mb={2} />
                      <Skeleton height="16px" width="100px" />
                    </Td>
                    <Td>
                      <Skeleton height="24px" width="80px" />
                    </Td>
                    <Td>
                      <Skeleton height="20px" width="180px" />
                    </Td>
                    <Td>
                      <Skeleton height="20px" width="60px" />
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        ) : domainDetails ? (
          <Box mt={6}>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mb={6}>
              <Card variant="outline" shadow="sm" bg="blackAlpha.500">
                <CardHeader pb={2}>
                  <Heading size="sm">🔍 Domain Details</Heading>
                </CardHeader>
                <CardBody pt={0}>
                  <SimpleGrid columns={2} spacing={4} mb={4}>
                    <Stat>
                      <StatLabel>Created</StatLabel>
                      <StatNumber fontSize="md">
                        {formatDistanceToNow(domainDetails.createdAt * 1000, {
                          addSuffix: true,
                        })}
                      </StatNumber>
                      <StatHelpText fontSize="xs">
                        {formatDate(domainDetails.createdAt)}
                      </StatHelpText>
                    </Stat>
                    <Stat>
                      <StatLabel>Expires</StatLabel>
                      <StatNumber fontSize="md">
                        {formatDistanceToNow(domainDetails.expiryDate * 1000, {
                          addSuffix: true,
                        })}
                      </StatNumber>
                      <StatHelpText fontSize="xs">
                        {formatDate(domainDetails.expiryDate)}
                      </StatHelpText>
                    </Stat>
                  </SimpleGrid>
                  <SimpleGrid columns={2} spacing={4}>
                    <Stat>
                      <StatLabel>Owner</StatLabel>
                      <StatNumber fontSize="md">
                        <Link
                          href={`https://etherscan.io/address/${domainDetails.owner}`}
                          isExternal
                        >
                          {shortenAddress(domainDetails.owner)}{" "}
                          <ExternalLinkIcon mx="1px" boxSize={3} />
                        </Link>
                      </StatNumber>
                    </Stat>
                    <Stat>
                      <StatLabel>Registrant</StatLabel>
                      <StatNumber fontSize="md">
                        <Link
                          href={`https://etherscan.io/address/${domainDetails.registrant}`}
                          isExternal
                        >
                          {shortenAddress(domainDetails.registrant)}{" "}
                          <ExternalLinkIcon mx="1px" boxSize={3} />
                        </Link>
                      </StatNumber>
                    </Stat>
                  </SimpleGrid>
                </CardBody>
              </Card>

              {initialRegistration && (
                <Card variant="outline" shadow="sm" bg="blackAlpha.500">
                  <CardHeader pb={2}>
                    <Heading size="sm">📅 Registration Info</Heading>
                  </CardHeader>
                  <CardBody pt={0}>
                    <SimpleGrid columns={2} spacing={4}>
                      <Stat>
                        <StatLabel>Initial Registration</StatLabel>
                        <StatNumber fontSize="md">
                          {formatDistanceToNow(
                            initialRegistration.timestamp
                              ? initialRegistration.timestamp * 1000
                              : Date.now(),
                            { addSuffix: true }
                          )}
                        </StatNumber>
                        <StatHelpText fontSize="xs">
                          {initialRegistration.timestamp
                            ? formatDate(initialRegistration.timestamp)
                            : "Unknown"}
                        </StatHelpText>
                      </Stat>
                      <Stat>
                        <StatLabel>Initial Expiry</StatLabel>
                        <StatNumber fontSize="md">
                          {formatDistanceToNow(
                            initialRegistration.expiryDate * 1000,
                            { addSuffix: true }
                          )}
                        </StatNumber>
                        <StatHelpText fontSize="xs">
                          {formatDate(initialRegistration.expiryDate)}
                        </StatHelpText>
                      </Stat>
                    </SimpleGrid>
                  </CardBody>
                </Card>
              )}
            </SimpleGrid>

            <Heading size="md" mb={4}>
              📜 Domain History
            </Heading>

            {historyEvents.length > 0 ? (
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th width="200px" whiteSpace="nowrap">
                      Time
                    </Th>
                    <Th>Event Type</Th>
                    <Th>Details</Th>
                    <Th>Transaction</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {historyEvents.map((event, index) => (
                    <Tr key={`${event.transactionID}-${index}`}>
                      <Td width="200px" whiteSpace="nowrap">
                        <Text>{formatDate(event.timestamp)}</Text>
                        <Text
                          fontSize="sm"
                          color={getContentChangeColor(event.timestamp)}
                        >
                          {formatDistanceToNow(event.timestamp * 1000, {
                            addSuffix: true,
                          })}
                        </Text>
                      </Td>
                      <Td>{getEventBadge(event.type)}</Td>
                      <Td>
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
                              ml={2}
                              size="xs"
                              variant="ghost"
                              aria-label="Copy full hash"
                            />
                          </Flex>
                        )}
                        {event.type === "transfer" && event.details.owner && (
                          <Link
                            href={`https://etherscan.io/address/${event.details.owner}`}
                            isExternal
                          >
                            {shortenAddress(event.details.owner)}{" "}
                            <ExternalLinkIcon mx="2px" />
                          </Link>
                        )}
                        {event.type === "renewal" &&
                          event.details.expiryDate && (
                            <Text>
                              New expiry: {formatDate(event.details.expiryDate)}
                            </Text>
                          )}
                      </Td>
                      <Td>
                        <Link
                          href={`https://etherscan.io/tx/${event.transactionID}`}
                          isExternal
                        >
                          Tx <ExternalLinkIcon mx="2px" />
                        </Link>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            ) : (
              <Text>No history events found</Text>
            )}
          </Box>
        ) : (
          <Box mt={6}>
            <Text>Enter an ENS name to view its history</Text>
          </Box>
        )}
      </Box>
    </>
  );
};

export default ContentChanges;
