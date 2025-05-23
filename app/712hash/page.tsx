"use client";

import { useState } from "react";
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
  Textarea,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";
import { Layout } from "@/components/Layout";
import { hashTypedData, hashStruct } from "viem";
import { TypedDataEncoder } from "ethers";

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
  const [input, setInput] = useState("");
  const [result, setResult] = useState<HashResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = () => {
    try {
      const parsed = JSON.parse(input);
      const hashes = computeEip712Hash(parsed);
      setResult(hashes);
      setError(null);
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
        minW="900px"
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
          <Flex mb={5}>
            <Text>Paste your JSON below</Text>
          </Flex>
          <Textarea
            placeholder="Insert EIP-712 typed data struct"
            rows={9}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            color="white"
            fontFamily="mono"
          />
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
              <Table
                variant="simple"
                color="white"
                bg="gray.900"
                rounded={"lg"}
              >
                <Thead>
                  <Tr>
                    <Th>Type</Th>
                    <Th>Hash</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  <Tr>
                    <Td>EIP-712 Hash</Td>
                    <Td fontFamily="mono">{result.eip712Hash}</Td>
                  </Tr>
                  <Tr>
                    <Td>Domain Hash</Td>
                    <Td fontFamily="mono">{result.domainHash}</Td>
                  </Tr>
                  <Tr>
                    <Td>Message Hash</Td>
                    <Td fontFamily="mono">{result.messageHash}</Td>
                  </Tr>
                </Tbody>
              </Table>
            </Box>
          )}
        </Box>
      </VStack>
    </Layout>
  );
}
