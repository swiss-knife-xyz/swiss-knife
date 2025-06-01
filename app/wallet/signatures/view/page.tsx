"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { verifyMessage, verifyTypedData } from "viem";
import {
  VStack,
  Heading,
  Text,
  Box,
  Code,
  Badge,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Link,
  Flex,
} from "@chakra-ui/react";
import { SharedSignaturePayload, EIP712TypedData } from "../components/types";

export const decodeDataFromUrl = (
  encodedData: string
): SharedSignaturePayload | null => {
  try {
    const base64String = decodeURIComponent(encodedData);
    const jsonString = atob(base64String);
    return JSON.parse(jsonString) as SharedSignaturePayload;
  } catch (error) {
    console.error("Failed to decode or parse URL data:", error);
    if (
      error instanceof DOMException &&
      error.name === "InvalidCharacterError"
    ) {
      console.error(
        "Error during atob(): Input may not be a valid Base64 string."
      );
    }
    return null;
  }
};

export default function SignatureView() {
  const searchParams = useSearchParams();
  const [signatureData, setSignatureData] =
    useState<SharedSignaturePayload | null>(null);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const encodedData = searchParams.get("payload");

    if (encodedData) {
      const decoded = decodeDataFromUrl(encodedData);
      if (decoded) {
        setSignatureData(decoded);
      } else {
        setError("Invalid signature data format in URL.");
        setSignatureData(null);
      }
    } else {
      setError("No signature data found in URL.");
    }
    setIsLoading(false);
  }, [searchParams]);

  useEffect(() => {
    if (!signatureData) {
      setIsVerified(null);
      return;
    }

    const verify = async () => {
      setIsLoading(true);
      setError(null);
      try {
        let isValid = false;
        if (signatureData.type === "message" && signatureData.message) {
          isValid = await verifyMessage({
            address: signatureData.address,
            message: signatureData.message,
            signature: signatureData.signature,
          });
        } else if (
          signatureData.type === "typed_data" &&
          signatureData.parsedData
        ) {
          const {
            types,
            primaryType,
            message: typedMessage,
          } = signatureData.parsedData as EIP712TypedData;

          if (types && primaryType && typedMessage) {
            isValid = await verifyTypedData({
              address: signatureData.address,
              types,
              primaryType,
              message: typedMessage,
              signature: signatureData.signature,
            });
          } else {
            throw new Error(
              "Parsed typed data is missing essential fields (types, primaryType, or message) for verification."
            );
          }
        } else {
          throw new Error("Signature data is incomplete for verification.");
        }
        setIsVerified(isValid);
      } catch (e) {
        console.error("Verification failed:", e);
        setError(
          e instanceof Error
            ? e.message
            : "An unknown error occurred during verification."
        );
        setIsVerified(false);
      } finally {
        setIsLoading(false);
      }
    };

    verify();
  }, [signatureData]);

  if (isLoading && !signatureData && !error) {
    return (
      <VStack justify="center" align="center" minH="50vh">
        <Spinner size="xl" />
        <Text mt={4}>Loading signature data...</Text>
      </VStack>
    );
  }

  if (error && !signatureData) {
    return (
      <VStack justify="center" align="center" minH="50vh" p={4}>
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <AlertTitle>Error!</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </VStack>
    );
  }

  if (!signatureData) {
    return (
      <VStack justify="center" align="center" minH="50vh">
        <Text>No signature data available to display.</Text>
      </VStack>
    );
  }

  const explorerBaseUrl = "https://etherscan.io/address/";

  const getTypeBadge = (type: string) => {
    const isNumeric =
      type.toLowerCase().includes("int") ||
      type.toLowerCase().includes("uint") ||
      type.toLowerCase().includes("fixed") ||
      type.toLowerCase().includes("ufixed");
    const isAddress = type.toLowerCase() === "address";
    const isBytes = type.toLowerCase().startsWith("bytes");
    const isBool = type.toLowerCase() === "bool";

    let colorScheme = "blue";
    let prefix = "T";
    if (isNumeric) {
      colorScheme = "yellow";
      prefix = "#";
    } else if (isAddress) {
      colorScheme = "teal";
      prefix = "@";
    } else if (isBytes) {
      colorScheme = "orange";
      prefix = "0x";
    } else if (isBool) {
      colorScheme = "pink";
      prefix = "?";
    }

    return (
      <Badge
        colorScheme={colorScheme}
        variant="subtle"
        px={2}
        py={0.5}
        borderRadius="md"
        mr={3}
        fontSize="xs"
        textTransform="none"
      >
        {prefix} {type}
      </Badge>
    );
  };

  return (
    <VStack spacing={6} align="stretch" maxW="800px" mx="auto" p={4} py={8}>
      <Heading as="h1" size="xl" textAlign="center" mb={4}>
        Signature Verification
      </Heading>

      <Box>
        {isLoading && isVerified === null && (
          <Text textAlign="center">Verifying signature...</Text>
        )}
        {isVerified === true && (
          <Alert status="success" borderRadius="md">
            <AlertIcon />
            <AlertTitle>Signature Verified!</AlertTitle>
            <AlertDescription>
              The signature is authentic and matches the provided data and
              address.
            </AlertDescription>
          </Alert>
        )}
        {isVerified === false && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <AlertTitle>Signature Verification Failed!</AlertTitle>
            <AlertDescription>
              {error ||
                "The signature is invalid, does not match the data, or the signer address is incorrect."}
            </AlertDescription>
          </Alert>
        )}
      </Box>

      <Box
        borderWidth="1px"
        borderRadius="lg"
        p={5}
        bg="gray.700"
        borderColor="gray.600"
      >
        <Badge
          colorScheme={signatureData.type === "message" ? "cyan" : "purple"}
          mb={3}
          fontSize="md"
          variant="solid"
          px={3}
          py={1}
          borderRadius="full"
        >
          {signatureData.type === "message"
            ? "Personal Message Signature"
            : "EIP-712 Typed Data Signature"}
        </Badge>
        <Text fontSize="sm" color="gray.300">
          <strong>Signed at:</strong>{" "}
          {new Date(signatureData.timestamp).toLocaleString()}
        </Text>
        <Text fontSize="sm" color="gray.300">
          <strong>Signer Address:</strong>{" "}
          <Link
            href={`${explorerBaseUrl}${signatureData.address}`}
            isExternal
            color="blue.300"
            _hover={{ textDecoration: "underline" }}
          >
            <Code fontSize="sm" bg="transparent" color="blue.300" p={0}>
              {signatureData.address}
            </Code>
          </Link>
        </Text>
      </Box>

      {signatureData.type === "message" && signatureData.message && (
        <Box
          borderWidth="1px"
          borderRadius="lg"
          p={5}
          bg="gray.800"
          borderColor="gray.700"
        >
          <Heading size="md" mb={3} color="gray.100">
            Original Message
          </Heading>
          <Code
            p={3}
            display="block"
            whiteSpace="pre-wrap"
            bg="gray.900"
            color="gray.200"
            borderRadius="md"
            fontFamily="monospace"
          >
            {signatureData.message}
          </Code>
        </Box>
      )}

      {signatureData.type === "typed_data" &&
        signatureData.parsedData &&
        (() => {
          const { domain, types, primaryType, message } =
            signatureData.parsedData as EIP712TypedData;
          const primaryTypeFields =
            types && types[primaryType] ? types[primaryType] : [];

          return (
            <VStack spacing={4} align="stretch">
              {domain && Object.keys(domain).length > 0 && (
                <Box
                  borderWidth="1px"
                  borderRadius="lg"
                  p={5}
                  bg="gray.800"
                  borderColor="gray.700"
                >
                  <Heading size="sm" mb={3} color="gray.200">
                    Domain
                  </Heading>
                  {Object.entries(domain).map(([key, value]) => (
                    <Flex
                      key={key}
                      justifyContent="space-between"
                      alignItems="center"
                      py={1.5}
                      borderBottomWidth="1px"
                      borderColor="gray.700"
                      _last={{ borderBottomWidth: 0 }}
                    >
                      <Text
                        fontFamily="monospace"
                        fontSize="sm"
                        color="gray.400"
                      >
                        {key}:
                      </Text>
                      <Text
                        fontFamily="monospace"
                        fontSize="sm"
                        color="gray.100"
                        wordBreak="break-all"
                      >
                        {String(value)}
                      </Text>
                    </Flex>
                  ))}
                </Box>
              )}

              <Box
                borderWidth="1px"
                borderRadius="lg"
                p={5}
                bg="gray.800"
                borderColor="gray.700"
              >
                <Flex alignItems="center" mb={4}>
                  <Heading size="md" mr={3} color="gray.100">
                    Message
                  </Heading>
                  {primaryType && (
                    <Badge
                      colorScheme="purple"
                      variant="solid"
                      px={3}
                      py={1}
                      borderRadius="full"
                      fontSize="sm"
                    >
                      ➔ {primaryType}
                    </Badge>
                  )}
                </Flex>
                {primaryTypeFields.map((field) => (
                  <Flex
                    key={field.name}
                    justifyContent="space-between"
                    alignItems="center"
                    py={2.5}
                    borderBottomWidth="1px"
                    borderColor="gray.700"
                    _last={{ borderBottomWidth: 0 }}
                  >
                    <Text fontFamily="monospace" fontSize="md" color="gray.300">
                      {field.name}
                    </Text>
                    <Flex alignItems="center">
                      {getTypeBadge(field.type)}
                      <Text
                        fontFamily="monospace"
                        fontSize="md"
                        color="gray.100"
                      >
                        {typeof message[field.name] === "string"
                          ? `"${String(message[field.name])}"`
                          : String(message[field.name])}
                      </Text>
                    </Flex>
                  </Flex>
                ))}
                {primaryTypeFields.length === 0 && primaryType && (
                  <Text color="gray.500">
                    No fields defined or found for primary type: {primaryType}
                  </Text>
                )}
                {!primaryType && (
                  <Text color="gray.500">
                    Primary type not specified in parsed data.
                  </Text>
                )}
              </Box>

              {types && Object.keys(types).length > 0 && (
                <Box
                  borderWidth="1px"
                  borderRadius="lg"
                  p={5}
                  bg="gray.800"
                  borderColor="gray.700"
                >
                  <Heading size="md" mb={3} color="gray.100">
                    Type Definitions
                  </Heading>
                  {Object.entries(types).map(([typeName, typeFields]) => {
                    if (
                      typeName === "EIP712Domain" &&
                      primaryType !== "EIP712Domain" &&
                      Object.keys(types).length > 1
                    )
                      return null;

                    return (
                      <Box key={typeName} mb={4} _last={{ mb: 0 }}>
                        <Text
                          fontWeight="bold"
                          color="gray.200"
                          fontSize="lg"
                          mb={2}
                        >
                          {typeName}
                        </Text>
                        {(
                          typeFields as Array<{ name: string; type: string }>
                        ).map((field) => (
                          <Flex
                            key={`${typeName}-${field.name}`}
                            justifyContent="space-between"
                            alignItems="center"
                            py={1.5}
                            pl={4}
                            borderBottomWidth="1px"
                            borderColor="gray.700"
                            _last={{ borderBottomWidth: 0 }}
                          >
                            <Text
                              fontFamily="monospace"
                              color="gray.400"
                              fontSize="md"
                            >
                              {field.name}
                            </Text>
                            {getTypeBadge(field.type)}
                          </Flex>
                        ))}
                        {(!typeFields ||
                          (typeFields as Array<any>).length === 0) && (
                          <Text pl={4} color="gray.500" fontSize="sm">
                            No fields in this type.
                          </Text>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              )}
            </VStack>
          );
        })()}

      <Box
        borderWidth="1px"
        borderRadius="lg"
        p={5}
        bg="gray.800"
        borderColor="gray.700"
      >
        <Heading size="md" mb={3} color="gray.100">
          Signature
        </Heading>
        <Code
          p={3}
          display="block"
          wordBreak="break-all"
          bg="gray.900"
          color="gray.200"
          borderRadius="md"
          fontFamily="monospace"
        >
          {signatureData.signature}
        </Code>
      </Box>
    </VStack>
  );
}
