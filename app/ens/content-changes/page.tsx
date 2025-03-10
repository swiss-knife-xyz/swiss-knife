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
import contentHash from "content-hash";

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

const ContentChanges = () => {
  const [ensName, setEnsName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [contentEvents, setContentEvents] = useState<ContentHistory[]>([]);
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

      // Normalize the ENS name
      const normalizedName = normalize(ensName);

      // Query The Graph for historical data
      const query = `
          query GetENSResolver($ens: String!) {
            domains(where: {name: $ens}) {
              name
              resolver {
                id
              }
            }
        }
      `;

      const response = await axios.post(ENS_SUBGRAPH_URL, {
        query,
        variables: { ens: normalizedName },
      });

      if (response.data.errors) {
        throw new Error(response.data.errors[0].message);
      }

      const resolverId = response.data.data.domains[0].resolver.id;

      if (!resolverId) {
        throw new Error("Domain not found");
      }

      try {
        const query = `
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

        const response = await axios.post(ENS_SUBGRAPH_URL, {
          query,
          variables: { resolverId: resolverId },
        });

        if (response.data.errors) {
          throw new Error(response.data.errors[0].message);
        }

        const contentEvents = response.data.data
          .contenthashChangeds as ContentEvent[];
        const decoded = contentEvents.map(
          ({ hash, blockNumber, transactionID }) => ({
            hash: decodeContentHash(hash) ?? "",
            blockNumber,
            transactionID,
          })
        );
        const decodedWithDate = await Promise.all(
          decoded.map(async (obj) => {
            const block = await publicClient.getBlock({
              blockNumber: BigInt(obj.blockNumber),
            });
            return { ...obj, timestamp: Number(block.timestamp) };
          })
        );
        console.log({ decodedWithDate });
        setContentEvents(decodedWithDate);
      } catch {
        toast({
          title: "Error",
          description: "Failed to fetch ENS data",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
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

        {contentEvents && (
          <Table mt={6} variant="simple">
            <Thead>
              <Tr>
                <Th>Time</Th>
                <Th>Event Type</Th>
                <Th>Details</Th>
                <Th>Transaction</Th>
              </Tr>
            </Thead>
            <Tbody>
              {contentEvents.map((event) => (
                <Tr key={event.transactionID}>
                  <Td>
                    {formatDistanceToNow(event.timestamp * 1000, {
                      addSuffix: true,
                    })}
                  </Td>
                  <Td>Content Hash Changed</Td>
                  <Td>{event.hash}</Td>
                  <Td>
                    <Link
                      href={`https://etherscan.io/tx/${event.transactionID}`}
                      target="_blank"
                    >
                      Tx
                    </Link>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Box>
    </>
  );
};

export default ContentChanges;
