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
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Flex,
  Center,
  Tooltip,
  Icon,
  Grid,
} from "@chakra-ui/react";
import { CheckCircleIcon, WarningIcon, WarningTwoIcon } from "@chakra-ui/icons";
import { SharedSignaturePayload, EIP712TypedData } from "../components/types";
import { CopyToClipboard } from "@/components/CopyToClipboard";
import AddressDisplay from "@/components/AddressDisplay";
import TypeBadge from "../components/TypeBadge";

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

const explorerBaseUrl = "https://etherscan.io/address/";

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
            domain,
            types,
            primaryType,
            message: typedMessage,
          } = signatureData.parsedData as EIP712TypedData;
          if (types && primaryType && typedMessage) {
            isValid = await verifyTypedData({
              address: signatureData.address,
              domain: domain,
              types,
              primaryType,
              message: typedMessage,
              signature: signatureData.signature,
            });
          } else {
            throw new Error(
              "Parsed typed data is missing essential fields for verification."
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

  return (
    <VStack spacing={6} align="stretch" maxW="800px" mx="auto" p={4} py={8}>
      <Center>
        <Heading fontSize="2xl" mb={4}>
          {signatureData.type === "message"
            ? "Message Signature"
            : "Typed Data Signature"}
        </Heading>
      </Center>
      {signatureData.type === "message" && signatureData.message && (
        <Box borderWidth="1px" borderRadius="lg" p={5}>
          <Code
            p={3}
            display="block"
            whiteSpace="pre-wrap"
            bg="gray.900"
            color="gray.200"
            borderRadius="md"
            fontFamily="monospace"
            height="100px"
          >
            {signatureData.message}
          </Code>
        </Box>
      )}
      {signatureData.type === "typed_data" &&
        signatureData.parsedData &&
        (() => {
          const domain = signatureData.parsedData.domain;
          const types = signatureData.parsedData.types;
          const primaryType = signatureData.parsedData.primaryType;
          const message = signatureData.parsedData.message;

          if (!types || typeof types !== "object") {
            return (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                EIP-712 'types' definition is missing or invalid.
              </Alert>
            );
          }
          if (!primaryType || typeof primaryType !== "string") {
            return (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                EIP-712 'primaryType' is missing or invalid.
              </Alert>
            );
          }
          if (!message || typeof message !== "object") {
            return (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                EIP-712 'message' object is missing or invalid.
              </Alert>
            );
          }
          const primaryTypeDefinition = types[primaryType];
          if (!primaryTypeDefinition || !Array.isArray(primaryTypeDefinition)) {
            return (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                Definition for primary type '{primaryType}' is missing or not an
                array.
              </Alert>
            );
          }
          const primaryTypeFields = primaryTypeDefinition;

          const RenderFieldValue = ({
            value,
            fieldType,
            currentTypes,
            isAddressType,
            nestingLevel = 0,
          }: {
            value: any;
            fieldType: string;
            currentTypes: EIP712TypedData["types"];
            isAddressType: boolean;
            nestingLevel?: number;
          }): React.ReactElement => {
            if (isAddressType && typeof value === "string") {
              return (
                <AddressDisplay
                  address={value}
                  fullAddress={value}
                  showExplorerLink={true}
                  explorerUrl={`${explorerBaseUrl}${signatureData.address}`}
                />
              );
            }
            if (typeof value !== "object" || value === null) {
              return (
                <Text
                  fontFamily="monospace"
                  fontSize="md"
                  color="gray.100"
                  wordBreak="break-all"
                >
                  {typeof value === "string"
                    ? `"${String(value)}"`
                    : String(value === null ? "null" : value)}{" "}
                </Text>
              );
            }

            const structDefinition = currentTypes[fieldType];

            if (structDefinition && Array.isArray(structDefinition)) {
              return (
                <Box pl={nestingLevel > 0 ? 4 : 2} mt={1} w="full">
                  {structDefinition.map(
                    (subField: { name: string; type: string }) => {
                      const subFieldValue = value[subField.name];
                      return (
                        <Flex
                          key={subField.name}
                          justifyContent="space-between"
                          alignItems="flex-start"
                          py={2}
                          direction={{ base: "column", sm: "row" }}
                        >
                          <Text
                            fontFamily="monospace"
                            fontSize="sm"
                            color="gray.400"
                            mr={2}
                            whiteSpace="nowrap"
                            minW={{ base: "auto", sm: "100px" }}
                          >
                            {subField.name}:
                          </Text>
                          <Flex
                            alignItems="center"
                            flex="1"
                            justifyContent="flex-end"
                            ml={{ base: 0, sm: 1 }}
                            mt={{ base: 1, sm: 0 }}
                          >
                            <TypeBadge type={subField.type} />
                            <RenderFieldValue
                              value={subFieldValue}
                              fieldType={subField.type}
                              currentTypes={currentTypes}
                              isAddressType={
                                subField.type.toLowerCase() === "address"
                              }
                              nestingLevel={nestingLevel + 1}
                            />
                          </Flex>
                        </Flex>
                      );
                    }
                  )}
                </Box>
              );
            } else if (Array.isArray(value)) {
              return (
                <Text fontFamily="monospace" fontSize="md" color="gray.100">
                  [Array ({value.length} items)]
                </Text>
              );
            }
            return (
              <Text fontFamily="monospace" fontSize="md" color="gray.100">
                [object Object]
              </Text>
            );
          };
          return (
            <VStack spacing={4} align="stretch">
              {domain &&
                typeof domain === "object" &&
                Object.keys(domain).length > 0 && (
                  <Box borderWidth="1px" borderRadius="lg" p={5}>
                    <Heading size="sm" mb={3} color="gray.200">
                      Domain
                    </Heading>
                    {Object.entries(domain).map(([key, value]) => (
                      <Flex
                        key={key}
                        justifyContent="space-between"
                        alignItems="center"
                        py={2}
                        borderBottomWidth="1px"
                        borderColor="border.muted"
                        _last={{ borderBottomWidth: 0 }}
                      >
                        <Text
                          fontFamily="monospace"
                          fontSize="sm"
                          color="gray.400"
                        >
                          {key}:
                        </Text>
                        {(key.toLowerCase().includes("address") ||
                          key.toLowerCase().includes("contract")) &&
                        typeof value === "string" ? (
                          <AddressDisplay
                            address={String(value)}
                            fullAddress={String(value)}
                            showExplorerLink={true}
                            explorerUrl={`${explorerBaseUrl}${signatureData.address}`}
                          />
                        ) : (
                          <Text
                            fontFamily="monospace"
                            fontSize="sm"
                            color="gray.100"
                            wordBreak="break-all"
                          >
                            {String(value)}
                          </Text>
                        )}
                      </Flex>
                    ))}
                  </Box>
                )}
              <Box borderWidth="1px" borderRadius="lg" p={5}>
                <Flex alignItems="center" mb={4}>
                  <Heading size="md" mr={3} color="gray.100">
                    Message
                  </Heading>
                  {primaryType && <TypeBadge type={primaryType} />}
                </Flex>
                {primaryTypeFields.map((field) => {
                  const fieldValue = message[field.name];
                  const isEIP712Struct =
                    types[field.type] &&
                    Array.isArray(types[field.type]) &&
                    typeof fieldValue === "object" &&
                    fieldValue !== null;
                  if (isEIP712Struct) {
                    return (
                      <Grid
                        key={field.name}
                        borderBottomWidth="1px"
                        borderColor="border.muted"
                        _last={{ borderBottomWidth: 0 }}
                        pb={2.5}
                        mb={2.5}
                      >
                        <Flex
                          justifyContent="space-between"
                          alignItems="center"
                          py={2.5}
                        >
                          <Text
                            fontFamily="monospace"
                            fontSize="md"
                            color="gray.300"
                          >
                            {field.name}
                          </Text>
                          <TypeBadge type={field.type} />
                        </Flex>
                        <Grid pl={2}>
                          <RenderFieldValue
                            value={fieldValue}
                            fieldType={field.type}
                            currentTypes={types}
                            isAddressType={
                              field.type.toLowerCase() === "address"
                            }
                            nestingLevel={1}
                          />
                        </Grid>
                      </Grid>
                    );
                  }
                  return (
                    <Flex
                      key={field.name}
                      justifyContent="space-between"
                      alignItems="center"
                      py={2.5}
                      borderBottomWidth="1px"
                      borderColor="border.muted"
                      _last={{ borderBottomWidth: 0 }}
                    >
                      <Text
                        fontFamily="monospace"
                        fontSize="md"
                        color="gray.300"
                      >
                        {field.name}
                      </Text>
                      <Flex alignItems="center">
                        <TypeBadge type={field.type} />
                        <RenderFieldValue
                          value={fieldValue}
                          fieldType={field.type}
                          currentTypes={types}
                          isAddressType={field.type.toLowerCase() === "address"}
                          nestingLevel={0}
                        />
                      </Flex>
                    </Flex>
                  );
                })}
                {primaryTypeFields.length === 0 && primaryType && (
                  <Text color="gray.500">
                    No fields defined for primary type: {primaryType}
                  </Text>
                )}
              </Box>
              {types &&
                typeof types === "object" &&
                Object.keys(types).length > 0 && (
                  <Box borderWidth="1px" borderRadius="lg" p={5}>
                    <Heading size="md" mb={3} color="gray.100">
                      Type Definitions
                    </Heading>
                    {Object.entries(types).map(
                      ([typeName, typeFieldsArrayUntyped]) => {
                        if (
                          typeName === "EIP712Domain" &&
                          primaryType !== "EIP712Domain" &&
                          Object.keys(types).length > 1
                        )
                          return null;
                        if (!Array.isArray(typeFieldsArrayUntyped)) {
                          return (
                            <Box key={typeName} mb={4} _last={{ mb: 0 }}>
                              <Text
                                fontWeight="bold"
                                color="gray.300"
                                fontSize="lg"
                                mb={1}
                              >
                                {typeName}
                              </Text>
                              <Text pl={4} color="orange.300" fontSize="sm">
                                Warning: Type definition is not a list of
                                fields.
                              </Text>
                            </Box>
                          );
                        }
                        const typeFields = typeFieldsArrayUntyped as Array<{
                          name: string;
                          type: string;
                        }>;
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
                            {typeFields.map((field) => (
                              <Flex
                                key={`${typeName}-${field.name}`}
                                justifyContent="space-between"
                                alignItems="center"
                                py={2}
                                pl={4}
                                borderBottomWidth="1px"
                                borderColor="border.muted"
                                _last={{ borderBottomWidth: 0 }}
                              >
                                <Text
                                  fontFamily="monospace"
                                  color="gray.400"
                                  fontSize="md"
                                >
                                  {field.name}
                                </Text>
                                <TypeBadge type={field.type} />
                              </Flex>
                            ))}
                            {typeFields.length === 0 && (
                              <Text pl={4} color="gray.500" fontSize="sm">
                                No fields in this type definition.
                              </Text>
                            )}
                          </Box>
                        );
                      }
                    )}
                  </Box>
                )}
            </VStack>
          );
        })()}
      <Box borderWidth="1px" borderRadius="lg" p={5}>
        <Flex justifyContent="space-between" alignItems="center" mb={3}>
          <Heading size="md" color="gray.100">
            Signature
          </Heading>
          {isVerified === true && (
            <Tooltip
              label="The signature matches the data and address."
              bg="green.600"
              color="white"
              hasArrow
              rounded="md"
            >
              <Flex alignItems="center" color="green.300">
                <Icon as={CheckCircleIcon} w={5} h={5} />
              </Flex>
            </Tooltip>
          )}
          {isVerified === false && (
            <Tooltip
              label={error || "Signature does not match or an error occurred."}
              bg="red.600"
              color="white"
              hasArrow
              rounded="md"
            >
              <Flex alignItems="center" color="red.300">
                <Icon as={WarningTwoIcon} w={5} h={5} />
              </Flex>
            </Tooltip>
          )}
          {isVerified === null && isLoading && (
            <Tooltip
              label="Verifying signature..."
              bg="yellow.600"
              color="white"
              hasArrow
            >
              <Spinner size="sm" color="yellow.300" />
            </Tooltip>
          )}
          {isVerified === null && !isLoading && !error && (
            <Tooltip
              label="Verification status unknown."
              bg="gray.600"
              color="white"
              hasArrow
            >
              <Icon as={WarningIcon} color="gray.400" w={5} h={5} />
            </Tooltip>
          )}
        </Flex>
        <Flex
          py={2}
          justifyContent="space-between"
          alignItems="center"
          direction={{ base: "column", md: "row" }}
          mt={isVerified !== null ? 0 : 2}
        >
          <AddressDisplay
            address={signatureData.address}
            fullAddress={signatureData.address}
            showExplorerLink={true}
            explorerUrl={`${explorerBaseUrl}${signatureData.address}`}
          />
          <Text
            fontSize="xs"
            color="gray.400"
            textAlign={{ base: "left", md: "right" }}
          >
            {new Date(signatureData.timestamp).toLocaleString()}
          </Text>
        </Flex>
        <Flex alignItems="center" mt={2}>
          <Code
            p={3}
            display="block"
            wordBreak="break-all"
            bg="gray.900"
            color="gray.200"
            borderRadius="md"
            fontFamily="monospace"
            flex="1"
            mr={2}
          >
            {signatureData.signature}
          </Code>
          <CopyToClipboard textToCopy={signatureData.signature} />
        </Flex>
      </Box>
    </VStack>
  );
}
