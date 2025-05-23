"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Heading,
  Text,
  VStack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Center,
  Flex,
  Button,
  Alert,
  AlertIcon,
  Skeleton,
} from "@chakra-ui/react";
import { Layout } from "@/components/Layout";
import { hashTypedData, hashStruct } from "viem";
import { TypedDataEncoder } from "ethers";
import { JsonTextArea } from "@/components/JsonTextArea";
import { CopyToClipboard } from "@/components/CopyToClipboard";
import { parseAsString, useQueryState } from "next-usequerystate";

type TypedDataInput = {
  domain: Record<string, any>;
  types: Record<string, Array<{ name: string; type: string }>>;
  primaryType: string;
  message: Record<string, any>;
};

type HashResult = {
  eip712Hash: string;
  domainHash: string;
  messageHash: string;
};

function computeEip712Hash(json: TypedDataInput): HashResult {
  const eip712Hash = hashTypedData({
    domain: json.domain,
    types: json.types,
    primaryType: json.primaryType,
    message: json.message,
  });

  const messageHash = hashStruct({
    data: json.message,
    primaryType: json.primaryType,
    types: json.types,
  });

  const domainHash = TypedDataEncoder.hashDomain(json.domain);

  return {
    eip712Hash,
    messageHash,
    domainHash,
  };
}

export default function SevenOneTwoHash() {
  const [jsonData, setJsonData] = useQueryState<string>(
    "json",
    parseAsString.withDefault("")
  );
  const [input, setInput] = useState(() => {
    // Initialize with prettified JSON if available
    if (jsonData) {
      try {
        const parsed = JSON.parse(jsonData);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return "";
      }
    }
    return "";
  });
  const [result, setResult] = useState<HashResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (jsonData) {
      try {
        const parsed = JSON.parse(jsonData);
        const hashes = computeEip712Hash(parsed);
        setResult(hashes);
        setError(null);
      } catch (err) {
        console.error(err);
        setError("Invalid JSON or hashing error in URL data.");
        setResult(null);
      }
    }
    setIsLoading(false);
  }, [jsonData]);

  const handleVerify = () => {
    try {
      const parsed = JSON.parse(input);
      const hashes = computeEip712Hash(parsed);
      setResult(hashes);
      setError(null);
      // Update URL with minified JSON
      setJsonData(JSON.stringify(parsed));
    } catch (err) {
      console.error(err);
      setError("Invalid JSON or hashing error. Please check your input.");
      setResult(null);
    }
  };

  const handlePastedJson = (parsedJson: any) => {
    try {
      const hashes = computeEip712Hash(parsedJson);
      setResult(hashes);
      setError(null);
      // Update URL with minified JSON
      setJsonData(JSON.stringify(parsedJson));
      setInput(JSON.stringify(parsedJson, null, 2));
    } catch (err) {
      console.error(err);
      setError("Invalid JSON or hashing error. Please check your input.");
      setResult(null);
    }
  };

  return (
    <Layout>
      <VStack
        spacing={10}
        align="stretch"
        maxW={{ base: "100%", md: "900px" }}
        mx="auto"
        width="100%"
        px={{ base: 2, md: 4 }}
      >
        <Center flexDirection="column" pt={4}>
          <Heading as="h1" size="xl" mb={3} textAlign="center" color="white">
            EIP-712 Hash Visualizer
          </Heading>

          <Text
            fontSize="lg"
            textAlign="center"
            color="whiteAlpha.900"
            maxW="700px"
          >
            Tool to verify and hash EIP-712 typed data
          </Text>
        </Center>

        <Box>
          <Flex mb={5} justifyContent="space-between" alignItems="center">
            <Text>Paste your JSON below</Text>
            <CopyToClipboard textToCopy={input} size="sm" />
          </Flex>
          <Box position="relative" width="100%" overflow="hidden">
            <Skeleton
              isLoaded={!isLoading}
              startColor="whiteAlpha.100"
              endColor="whiteAlpha.300"
              borderRadius="md"
            >
              <JsonTextArea
                value={input}
                onChange={(value) => {
                  setInput(value);
                  // Clear URL if input is empty
                  if (!value) {
                    setJsonData("");
                  }
                }}
                readOnly={false}
                ariaLabel="EIP-712 typed data JSON"
                h="300px"
                onPasteCallback={handlePastedJson}
              />
            </Skeleton>
          </Box>
          <Flex my={5} justifyContent="end">
            <Button onClick={handleVerify} colorScheme="blue">
              Verify
            </Button>
          </Flex>

          {error && (
            <Alert status="error" mb={4}>
              <AlertIcon />
              {error}
            </Alert>
          )}
          {result && (
            <Box mt={8}>
              <Heading size="md" color="white" mb={3}>
                Resulting Hashes
              </Heading>
              <Box
                border="1px"
                borderColor="whiteAlpha.300"
                borderRadius="lg"
                overflow="hidden"
              >
                <Table variant="simple" color="white">
                  <Thead>
                    <Tr>
                      <Th>Type</Th>
                      <Th>Hash</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    <Tr>
                      <Td>EIP-712 Hash</Td>
                      <Td fontFamily="mono">
                        <Flex alignItems="center" gap={2}>
                          {result.eip712Hash}
                          <CopyToClipboard
                            textToCopy={result.eip712Hash}
                            size="xs"
                          />
                        </Flex>
                      </Td>
                    </Tr>
                    <Tr>
                      <Td>Domain Hash</Td>
                      <Td fontFamily="mono">
                        <Flex alignItems="center" gap={2}>
                          {result.domainHash}
                          <CopyToClipboard
                            textToCopy={result.domainHash}
                            size="xs"
                          />
                        </Flex>
                      </Td>
                    </Tr>
                    <Tr>
                      <Td>Message Hash</Td>
                      <Td fontFamily="mono">
                        <Flex alignItems="center" gap={2}>
                          {result.messageHash}
                          <CopyToClipboard
                            textToCopy={result.messageHash}
                            size="xs"
                          />
                        </Flex>
                      </Td>
                    </Tr>
                  </Tbody>
                </Table>
              </Box>
            </Box>
          )}
        </Box>
      </VStack>
    </Layout>
  );
}
