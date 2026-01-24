"use client";

import { Suspense, useState, useEffect } from "react";
import {
  Box,
  Heading,
  Text,
  VStack,
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

function SevenOneTwoHashContent() {
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
    <Box maxW="800px" mx="auto" w="full">
      {/* Page Header */}
      <Box textAlign="center" mb={6}>
        <Heading size="lg" color="gray.100" fontWeight="bold" letterSpacing="tight">
          EIP-712 Hash Visualizer
        </Heading>
        <Text color="gray.400" fontSize="md" mt={2}>
          Tool to verify and hash EIP-712 typed data
        </Text>
      </Box>

      <Box
        p={5}
        bg="whiteAlpha.50"
        borderRadius="lg"
        border="1px solid"
        borderColor="whiteAlpha.200"
      >
        <Flex mb={3} justifyContent="space-between" alignItems="center">
          <Text color="gray.300" fontSize="sm">Paste your JSON below</Text>
          <CopyToClipboard textToCopy={input} size="sm" />
        </Flex>
        <Box
          borderRadius="md"
          overflow="hidden"
          border="1px solid"
          borderColor="whiteAlpha.300"
        >
          <Skeleton
            isLoaded={!isLoading}
            startColor="whiteAlpha.100"
            endColor="whiteAlpha.300"
            borderRadius="md"
          >
            <Editor
              height="220px"
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
                fontSize: 13,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                lineNumbers: "off",
                folding: false,
                padding: { top: 8, bottom: 8 },
              }}
            />
          </Skeleton>
        </Box>
        <Flex mt={4} justifyContent="space-between" alignItems="center">
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
                variant="outline"
                size="sm"
                borderColor="whiteAlpha.300"
              >
                Example
              </Button>
            )}
          </Box>
          <Button onClick={handleVerify} colorScheme="blue" size="sm">
            Verify
          </Button>
        </Flex>
      </Box>

      {error && (
        <Alert status="error" mt={4} borderRadius="md" bg="red.900">
          <AlertIcon color="red.400" />
          <Text color="red.100" fontSize="sm">{error}</Text>
        </Alert>
      )}

      {result && (
        <Box
          mt={5}
          p={5}
          bg="whiteAlpha.50"
          borderRadius="lg"
          border="1px solid"
          borderColor="whiteAlpha.200"
        >
          <Text color="gray.300" fontSize="sm" fontWeight="medium" mb={3}>
            Resulting Hashes
          </Text>
          <VStack spacing={3} align="stretch">
            <Box p={3} bg="whiteAlpha.100" borderRadius="md">
              <Text color="gray.400" fontSize="xs" mb={1}>EIP-712 Hash</Text>
              <Flex alignItems="center" gap={2}>
                <Text fontFamily="mono" fontSize="sm" color="gray.100" wordBreak="break-all">
                  {result.eip712Hash}
                </Text>
                <CopyToClipboard textToCopy={result.eip712Hash} size="xs" />
              </Flex>
            </Box>
            <Box p={3} bg="whiteAlpha.100" borderRadius="md">
              <Text color="gray.400" fontSize="xs" mb={1}>Domain Hash</Text>
              <Flex alignItems="center" gap={2}>
                <Text fontFamily="mono" fontSize="sm" color="gray.100" wordBreak="break-all">
                  {result.domainHash}
                </Text>
                <CopyToClipboard textToCopy={result.domainHash} size="xs" />
              </Flex>
            </Box>
            <Box p={3} bg="whiteAlpha.100" borderRadius="md">
              <Text color="gray.400" fontSize="xs" mb={1}>Message Hash</Text>
              <Flex alignItems="center" gap={2}>
                <Text fontFamily="mono" fontSize="sm" color="gray.100" wordBreak="break-all">
                  {result.messageHash}
                </Text>
                <CopyToClipboard textToCopy={result.messageHash} size="xs" />
              </Flex>
            </Box>
          </VStack>
        </Box>
      )}
    </Box>
  );
}

export default function SevenOneTwoHash() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SevenOneTwoHashContent />
    </Suspense>
  );
}
