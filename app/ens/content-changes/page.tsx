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
} from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import { createPublicClient, http, namehash } from "viem";
import { mainnet } from "viem/chains";
import { formatDistanceToNow, format } from "date-fns";
import axios from "axios";
import { normalize } from "viem/ens";
import bs58 from "bs58";

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

const IPFS_GATEWAY = "https://cloudflare-ipfs.com";
const ENS_SUBGRAPH_URL =
  "https://api.thegraph.com/subgraphs/name/ensdomains/ens";

interface ContenthashChangedEvent {
  id: string;
  blockNumber: string;
  transactionID: string;
  hash: string;
}

interface Domain {
  id: string;
  name: string;
  owner: {
    id: string;
  };
  resolver: {
    id: string;
    events: ContenthashChangedEvent[];
  };
}

interface QueryResult {
  domain: Domain;
}

const ContentChanges = () => {
  const [ensName, setEnsName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [currentContentHash, setCurrentContentHash] = useState<string>();
  const [currentIpfsHash, setCurrentIpfsHash] = useState<string>();
  const [data, setData] = useState<QueryResult | null>(null);
  const toast = useToast();

  const decodeContentHash = (hash: string): string | null => {
    if (!hash || hash === "0x") return null;

    try {
      // For IPFS hashes (most common use case)
      if (hash.startsWith("0xe3010170")) {
        // Remove IPFS hash prefix and convert to base58
        const ipfsHashHex = hash.substring(10);
        const bytes = Buffer.from(ipfsHashHex, "hex");
        // Skip the first two bytes (multihash prefix) and convert to Uint8Array
        const uint8Array = new Uint8Array(bytes.slice(2));
        return bs58.encode(uint8Array);
      }
      return null;
    } catch (error) {
      console.error("Failed to decode content hash:", error);
      return null;
    }
  };

  const fetchContentHash = async () => {
    if (!ensName) return;

    setLoading(true);
    try {
      const normalizedName = normalize(ensName);
      const node = namehash(normalizedName);

      // First get the current content hash using viem
      const resolver = await publicClient.getEnsResolver({
        name: normalizedName,
      });

      if (!resolver) {
        throw new Error("ENS name not found");
      }

      const currentHash = await publicClient.readContract({
        address: resolver,
        abi: [
          {
            name: "contenthash",
            type: "function",
            stateMutability: "view",
            inputs: [{ name: "node", type: "bytes32" }],
            outputs: [{ type: "bytes" }],
          },
        ],
        functionName: "contenthash",
        args: [node],
      });

      if (currentHash) {
        const hexContentHash =
          typeof currentHash === "string"
            ? currentHash
            : `0x${Buffer.from(currentHash).toString("hex")}`;
        setCurrentContentHash(hexContentHash);
        const decodedHash = decodeContentHash(hexContentHash);
        if (decodedHash) {
          setCurrentIpfsHash(decodedHash);
        }
      }

      // Then fetch historical changes from ENS subgraph
      const { data: graphData } = await axios.post(ENS_SUBGRAPH_URL, {
        query: `
          query GetContentHashHistory($nameHash: String!) {
            domain(id: $nameHash) {
              id
              name
              owner {
                id
              }
              resolver {
                id
                events(orderBy: blockNumber, orderDirection: desc, where: { eventType: "ContenthashChanged" }) {
                  id
                  blockNumber
                  transactionID
                  ... on ContenthashChanged {
                    hash
                  }
                }
              }
            }
          }
        `,
        variables: {
          nameHash: node,
        },
      });

      const result = graphData.data as QueryResult;
      if (!result?.domain) {
        throw new Error("No ENS data found");
      }

      setData(result);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to fetch ENS data",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      console.error(error);
    }
    setLoading(false);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault(); // Prevent default paste behavior
    const pastedText = e.clipboardData.getData("text");
    setEnsName(pastedText);
    fetchContentHash();
  };

  return (
    <>
      <Heading color="custom.pale">ENS Content Changes</Heading>
      <Box mt="3rem" maxW="800px" w="full">
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

        {currentContentHash && (
          <Box mt={6} p={4} borderWidth={1} borderRadius="md">
            <Text fontWeight="bold" mb={2}>
              Current Content Hash:
            </Text>
            <Text mb={2}>{currentContentHash}</Text>
            {currentIpfsHash && (
              <Text mb={2} color="gray.500">
                Decoded IPFS Hash: {currentIpfsHash}
              </Text>
            )}
            <HStack spacing={4}>
              <Link href={`https://${ensName}.eth.limo`} isExternal>
                ETH.LIMO <ExternalLinkIcon mx="2px" />
              </Link>
              {currentIpfsHash && (
                <Link
                  href={`${IPFS_GATEWAY}/ipfs/${currentIpfsHash}`}
                  isExternal
                >
                  Cloudflare IPFS <ExternalLinkIcon mx="2px" />
                </Link>
              )}
            </HStack>
          </Box>
        )}

        {data?.domain?.resolver?.events &&
          data.domain.resolver.events.length > 0 && (
            <Table mt={6} variant="simple">
              <Thead>
                <Tr>
                  <Th>Time</Th>
                  <Th>Content Hash</Th>
                  <Th>Transaction</Th>
                </Tr>
              </Thead>
              <Tbody>
                {data.domain.resolver.events.map((event) => {
                  const ipfsHash = event.hash
                    ? decodeContentHash(event.hash)
                    : null;
                  return (
                    <Tr key={event.id}>
                      <Td>
                        <Text>Block #{event.blockNumber}</Text>
                      </Td>
                      <Td>
                        {ipfsHash ? (
                          <>
                            <Link
                              href={`${IPFS_GATEWAY}/ipfs/${ipfsHash}`}
                              isExternal
                            >
                              {event.hash.slice(0, 10)}...{event.hash.slice(-8)}
                              <ExternalLinkIcon mx="2px" />
                            </Link>
                            <Text fontSize="sm" color="gray.500">
                              {ipfsHash}
                            </Text>
                          </>
                        ) : (
                          <Text>
                            {event.hash ? (
                              <>
                                {event.hash.slice(0, 10)}...
                                {event.hash.slice(-8)}
                              </>
                            ) : (
                              <span className="text-gray-400">Cleared</span>
                            )}
                          </Text>
                        )}
                      </Td>
                      <Td>
                        <Link
                          href={`https://etherscan.io/tx/${event.transactionID}`}
                          isExternal
                        >
                          {event.transactionID.slice(0, 10)}...
                          {event.transactionID.slice(-8)}
                          <ExternalLinkIcon mx="2px" />
                        </Link>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          )}
      </Box>
    </>
  );
};

export default ContentChanges;
