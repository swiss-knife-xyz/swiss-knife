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
import { hashTypedData, hashStruct } from "viem";
import { TypedDataEncoder } from "ethers";
import { CopyToClipboard } from "@/components/CopyToClipboard";
import { parseAsString, useQueryState } from "next-usequerystate";
import { Editor } from "@monaco-editor/react";

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

  const examplePlaceholderJSON = `{
  "types": {
    "SafeMessage": [
      {
        "name": "message",
        "type": "bytes"
      }
    ],
    "EIP712Domain": [
      {
        "name": "chainId",
        "type": "uint256"
      },
      {
        "name": "verifyingContract",
        "type": "address"
      }
    ]
  },
  "domain": {
    "chainId": "0x1",
    "verifyingContract": "0x35ea56fd9ead2567f339eb9564b6940b9dd5653f"
  },
  "primaryType": "SafeMessage",
  "message": {
    "message": "0x1be8e5ff60e3a11c229dd65f64fcead922ed2e56991362d76f5df5a8e7d4c1c0"
  }
}
`;

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
    <VStack
      spacing={10}
      align="stretch"
      maxW={{ base: "100%", md: "900px" }}
      mx="auto"
      minW={"40rem"}
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
            <Editor
              height="300px"
              defaultLanguage="json"
              theme="vs-dark"
              value={input}
              onChange={(value) => {
                if (value !== undefined) {
                  setInput(value);
                }
                // Clear URL if input is empty
                if (!value) {
                  setJsonData("");
                }
              }}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
          </Skeleton>
        </Box>
        <Flex my={5} justifyContent="space-between" alignItems="center">
          <Box>
            {!input && (
              <Button
                onClick={() => {
                  setInput(examplePlaceholderJSON);
                  const parsed = JSON.parse(examplePlaceholderJSON);
                  const hashes = computeEip712Hash(parsed);
                  setResult(hashes);
                  setError(null);
                  setJsonData(JSON.stringify(parsed));
                }}
                colorScheme="gray"
              >
                Example
              </Button>
            )}
          </Box>
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
  );
}
