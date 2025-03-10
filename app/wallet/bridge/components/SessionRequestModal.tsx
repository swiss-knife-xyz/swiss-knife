import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Badge,
  Box,
  Button,
  Code,
  Flex,
  Heading,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Skeleton,
  SkeletonText,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tag,
  Text,
  VStack,
} from "@chakra-ui/react";
import { formatEther } from "viem";
import { DecodedSignatureData, SessionRequest } from "../types";
import { renderParams } from "@/components/renderParams";
import { chainIdToChain } from "@/data/common";
import { useCallback, useEffect, useState } from "react";
import { Address, createPublicClient, http } from "viem";
import { erc20Abi } from "viem";
import axios from "axios";
import { fetchContractAbi } from "@/utils";

interface SessionRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSessionRequest: SessionRequest | null;
  decodedTxData: any;
  isDecodingTx: boolean;
  decodedSignatureData: DecodedSignatureData | null;
  pendingRequest: boolean;
  isSwitchingChain: boolean;
  needsChainSwitch: boolean;
  targetChainId: number | null;
  onApprove: () => void;
  onReject: () => void;
  onChainSwitch: () => void;
}

export default function SessionRequestModal({
  isOpen,
  onClose,
  currentSessionRequest,
  decodedTxData,
  isDecodingTx,
  decodedSignatureData,
  pendingRequest,
  isSwitchingChain,
  needsChainSwitch,
  targetChainId,
  onApprove,
  onReject,
  onChainSwitch,
}: SessionRequestModalProps) {
  const [addressLabels, setAddressLabels] = useState<string[]>([]);

  const fetchAddressLabels = useCallback(
    async (address: string, chainId: number) => {
      setAddressLabels([]);

      try {
        const client = createPublicClient({
          chain: chainIdToChain[chainId],
          transport: http(),
        });

        // check if the address is a contract
        const res = await client.getBytecode({
          address: address as Address,
        });

        // try fetching the contract symbol() if it's a token
        try {
          const symbol = await client.readContract({
            address: address as Address,
            abi: erc20Abi,
            functionName: "symbol",
          });
          setAddressLabels([symbol]);
        } catch {
          // else try fetching the contract name if it's verified
          const fetchedAbi = await fetchContractAbi({ address, chainId });
          if (fetchedAbi) {
            setAddressLabels([fetchedAbi.name]);
          }
        }
      } catch {
        try {
          const res = await axios.get(
            `${
              process.env.NEXT_PUBLIC_DEVELOPMENT === "true"
                ? ""
                : "https://swiss-knife.xyz"
            }/api/labels/${address}`
          );
          const data = res.data;
          if (data.length > 0) {
            setAddressLabels(data);
          }
        } catch {
          setAddressLabels([]);
        }
      }
    },
    []
  );

  useEffect(() => {
    if (
      currentSessionRequest?.params?.request?.method ===
        "eth_sendTransaction" &&
      currentSessionRequest?.params?.request?.params?.[0]?.to
    ) {
      // Extract chainId from the request
      const chainIdStr = currentSessionRequest.params.chainId?.split(":")?.[1];
      const chainId = chainIdStr ? parseInt(chainIdStr) : null;

      if (chainId) {
        fetchAddressLabels(
          currentSessionRequest.params.request.params[0].to,
          chainId
        );
      }
    }
  }, [currentSessionRequest, fetchAddressLabels]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isCentered
      size={{ base: "sm", md: "lg" }}
      closeOnOverlayClick={false}
      closeOnEsc={true}
      blockScrollOnMount={true}
    >
      <ModalOverlay bg="none" backdropFilter="auto" backdropBlur="5px" />
      <ModalContent
        bg="bg.900"
        color="white"
        maxW={{
          base: "95%",
          sm: "30rem",
          md: "40rem",
        }}
        zIndex="1400"
      >
        <ModalHeader
          borderBottomWidth="1px"
          borderColor="whiteAlpha.200"
          fontSize={{ base: "md", md: "lg" }}
        >
          Session Request
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {currentSessionRequest && (
            <VStack spacing={{ base: 3, md: 4 }} align="stretch">
              <Box>
                <Text fontWeight="bold" fontSize={{ base: "sm", md: "md" }}>
                  Method:
                </Text>
                <Code
                  p={2}
                  borderRadius="md"
                  fontSize={{ base: "sm", md: "md" }}
                  width="100%"
                  bg="whiteAlpha.200"
                  color="white"
                >
                  {currentSessionRequest.params.request.method}
                </Code>
              </Box>

              {/* Transaction Request */}
              {currentSessionRequest.params.request.method ===
                "eth_sendTransaction" && (
                <Box
                  p={{ base: 2, md: 3 }}
                  borderWidth={1}
                  borderRadius="md"
                  bg="whiteAlpha.100"
                  borderColor="whiteAlpha.300"
                >
                  <Heading size={{ base: "xs", md: "sm" }} mb={2} color="white">
                    Transaction Details
                  </Heading>
                  <VStack spacing={1} align="stretch">
                    <Flex
                      justifyContent="space-between"
                      flexDirection={{ base: "column", sm: "row" }}
                    >
                      <Text
                        fontWeight="bold"
                        color="white"
                        fontSize={{ base: "sm", md: "md" }}
                      >
                        To:
                      </Text>
                      <Box>
                        {addressLabels.length > 0 && (
                          <Flex justifyContent="flex-end" mb={1}>
                            <HStack spacing={1}>
                              {addressLabels.map((label, index) => (
                                <Tag
                                  key={index}
                                  size="sm"
                                  variant="solid"
                                  colorScheme="blue"
                                >
                                  {label}
                                </Tag>
                              ))}
                            </HStack>
                          </Flex>
                        )}
                        <Text
                          color="white"
                          fontSize={{ base: "xs", md: "sm" }}
                          wordBreak="break-all"
                        >
                          {currentSessionRequest.params.request.params[0].to}
                        </Text>
                      </Box>
                    </Flex>
                    {currentSessionRequest.params.request.params[0].value && (
                      <Flex
                        justifyContent="space-between"
                        flexDirection={{ base: "column", sm: "row" }}
                      >
                        <Text
                          fontWeight="bold"
                          color="white"
                          fontSize={{ base: "sm", md: "md" }}
                        >
                          Value:
                        </Text>
                        <Text color="white" fontSize={{ base: "xs", md: "sm" }}>
                          {formatEther(
                            BigInt(
                              currentSessionRequest.params.request.params[0]
                                .value
                            )
                          )}{" "}
                          ETH
                        </Text>
                      </Flex>
                    )}
                    {currentSessionRequest.params.request.params[0].gas && (
                      <Flex
                        justifyContent="space-between"
                        flexDirection={{ base: "column", sm: "row" }}
                      >
                        <Text
                          fontWeight="bold"
                          color="white"
                          fontSize={{ base: "sm", md: "md" }}
                        >
                          Gas Limit:
                        </Text>
                        <Text color="white" fontSize={{ base: "xs", md: "sm" }}>
                          {BigInt(
                            currentSessionRequest.params.request.params[0].gas
                          ).toString()}
                        </Text>
                      </Flex>
                    )}

                    {currentSessionRequest.params.request.params[0].data && (
                      <Box
                        mt={4}
                        pt={3}
                        borderTopWidth={1}
                        borderTopColor="whiteAlpha.300"
                      >
                        <Flex justifyContent="space-between" mb={2}>
                          <Text
                            fontWeight="bold"
                            color="white"
                            fontSize={{ base: "sm", md: "md" }}
                          >
                            Transaction Data:
                          </Text>
                          {isDecodingTx && (
                            <Text
                              fontSize={{ base: "xs", md: "sm" }}
                              color="whiteAlpha.700"
                            >
                              Decoding...
                            </Text>
                          )}
                        </Flex>

                        <Tabs
                          variant="soft-rounded"
                          colorScheme="blue"
                          size={{ base: "xs", md: "sm" }}
                        >
                          <TabList mb={3}>
                            <Tab
                              px={{ base: 4, md: 6 }}
                              fontSize={{ base: "xs", md: "sm" }}
                            >
                              Decoded
                            </Tab>
                            <Tab
                              px={{ base: 4, md: 6 }}
                              fontSize={{ base: "xs", md: "sm" }}
                            >
                              Raw
                            </Tab>
                          </TabList>
                          <TabPanels>
                            <TabPanel p={0}>
                              {isDecodingTx ? (
                                <Box
                                  p={{ base: 2, md: 4 }}
                                  bg="whiteAlpha.100"
                                  borderRadius="md"
                                >
                                  <SkeletonText
                                    mt={2}
                                    noOfLines={2}
                                    spacing={4}
                                    skeletonHeight="4"
                                  />
                                  <Skeleton height="20px" mt={4} />
                                  <Skeleton height="20px" mt={2} />
                                  <SkeletonText
                                    mt={4}
                                    noOfLines={3}
                                    spacing={4}
                                    skeletonHeight="4"
                                  />
                                </Box>
                              ) : decodedTxData ? (
                                <Box>
                                  {decodedTxData.functionName && (
                                    <Flex
                                      justifyContent="space-between"
                                      mb={3}
                                      p={2}
                                      bg="blue.800"
                                      borderRadius="md"
                                      flexDirection={{
                                        base: "column",
                                        sm: "row",
                                      }}
                                    >
                                      <Text
                                        fontWeight="bold"
                                        color="white"
                                        fontSize={{ base: "sm", md: "md" }}
                                      >
                                        Function:
                                      </Text>
                                      <Text
                                        color="white"
                                        fontFamily="monospace"
                                        fontSize={{ base: "xs", md: "sm" }}
                                      >
                                        {decodedTxData.functionName}
                                      </Text>
                                    </Flex>
                                  )}
                                  <Box
                                    bg="whiteAlpha.100"
                                    borderRadius="md"
                                    p={{ base: 2, md: 3 }}
                                    maxH={{ base: "200px", md: "300px" }}
                                    overflowY="auto"
                                    overflowX="hidden"
                                    sx={{
                                      "::-webkit-scrollbar": {
                                        w: "8px",
                                      },
                                      "::-webkit-scrollbar-track": {
                                        bg: "whiteAlpha.100",
                                        rounded: "md",
                                      },
                                      "::-webkit-scrollbar-thumb": {
                                        bg: "whiteAlpha.300",
                                        rounded: "md",
                                      },
                                      "& > div > div": {
                                        maxWidth: "100%",
                                      },
                                      ".uint-select-container": {
                                        position: "relative",
                                        zIndex: 9999,
                                      },
                                      ".chakra-react-select": {
                                        zIndex: 9999,
                                      },
                                      ".chakra-react-select__menu": {
                                        zIndex: 9999,
                                        position: "absolute !important",
                                      },
                                    }}
                                    position="relative"
                                  >
                                    <Stack
                                      spacing={{ base: 2, md: 4 }}
                                      width="100%"
                                    >
                                      {decodedTxData.args.map(
                                        (arg: any, i: number) => {
                                          const chainIdStr =
                                            currentSessionRequest.params.chainId.split(
                                              ":"
                                            )[1];
                                          const chainIdNum =
                                            parseInt(chainIdStr);
                                          return renderParams(
                                            i,
                                            arg,
                                            chainIdNum
                                          );
                                        }
                                      )}
                                    </Stack>
                                  </Box>
                                </Box>
                              ) : (
                                <Text
                                  color="whiteAlpha.700"
                                  fontStyle="italic"
                                  p={2}
                                  fontSize={{ base: "xs", md: "sm" }}
                                >
                                  Could not decode transaction data
                                </Text>
                              )}
                            </TabPanel>
                            <TabPanel p={0}>
                              <Box
                                p={{ base: 2, md: 3 }}
                                bg="whiteAlpha.100"
                                borderRadius="md"
                                maxH={{ base: "200px", md: "300px" }}
                                overflowY="auto"
                                overflowX="hidden"
                                sx={{
                                  "::-webkit-scrollbar": {
                                    w: "8px",
                                  },
                                  "::-webkit-scrollbar-track": {
                                    bg: "whiteAlpha.100",
                                    rounded: "md",
                                  },
                                  "::-webkit-scrollbar-thumb": {
                                    bg: "whiteAlpha.300",
                                    rounded: "md",
                                  },
                                  "& > div > div": {
                                    maxWidth: "100%",
                                  },
                                }}
                              >
                                <Code
                                  p={2}
                                  borderRadius="md"
                                  fontSize={{ base: "xs", md: "sm" }}
                                  width="100%"
                                  whiteSpace="pre-wrap"
                                  bg="transparent"
                                  color="white"
                                  fontFamily="monospace"
                                >
                                  {
                                    currentSessionRequest.params.request
                                      .params[0].data
                                  }
                                </Code>
                              </Box>
                            </TabPanel>
                          </TabPanels>
                        </Tabs>
                      </Box>
                    )}
                  </VStack>
                </Box>
              )}

              {/* Message Signing Request (personal_sign or eth_sign) */}
              {(currentSessionRequest.params.request.method ===
                "personal_sign" ||
                currentSessionRequest.params.request.method === "eth_sign") &&
                decodedSignatureData?.type === "message" && (
                  <Box
                    p={{ base: 2, md: 3 }}
                    borderWidth={1}
                    borderRadius="md"
                    bg="whiteAlpha.100"
                    borderColor="whiteAlpha.300"
                  >
                    <Heading
                      size={{ base: "xs", md: "sm" }}
                      mb={2}
                      color="white"
                    >
                      Message to Sign
                    </Heading>

                    <Tabs
                      variant="soft-rounded"
                      colorScheme="blue"
                      size={{ base: "xs", md: "sm" }}
                    >
                      <TabList mb={3}>
                        <Tab
                          px={{ base: 4, md: 6 }}
                          fontSize={{ base: "xs", md: "sm" }}
                        >
                          Decoded
                        </Tab>
                        <Tab
                          px={{ base: 4, md: 6 }}
                          fontSize={{ base: "xs", md: "sm" }}
                        >
                          Raw
                        </Tab>
                      </TabList>
                      <TabPanels>
                        <TabPanel p={0}>
                          <Box
                            p={{ base: 2, md: 3 }}
                            borderRadius="md"
                            bg="whiteAlpha.200"
                            whiteSpace="pre-wrap"
                            wordBreak="break-word"
                            fontSize={{ base: "xs", md: "sm" }}
                          >
                            {decodedSignatureData.decoded.decoded}
                            {decodedSignatureData.decoded.type !==
                              "unknown" && (
                              <Badge ml={2} colorScheme="blue" fontSize="xs">
                                {decodedSignatureData.decoded.type}
                              </Badge>
                            )}
                          </Box>
                        </TabPanel>
                        <TabPanel p={0}>
                          <Code
                            p={2}
                            borderRadius="md"
                            fontSize={{ base: "xs", md: "sm" }}
                            width="100%"
                            whiteSpace="pre-wrap"
                            wordBreak="break-word"
                            bg="whiteAlpha.200"
                            color="white"
                          >
                            {currentSessionRequest.params.request.method ===
                            "personal_sign"
                              ? currentSessionRequest.params.request.params[0]
                              : currentSessionRequest.params.request.params[1]}
                          </Code>
                        </TabPanel>
                      </TabPanels>
                    </Tabs>
                  </Box>
                )}

              {/* Typed Data Signing Request */}
              {(currentSessionRequest.params.request.method ===
                "eth_signTypedData" ||
                currentSessionRequest.params.request.method ===
                  "eth_signTypedData_v3" ||
                currentSessionRequest.params.request.method ===
                  "eth_signTypedData_v4") &&
                decodedSignatureData?.type === "typedData" && (
                  <Box
                    p={{ base: 2, md: 3 }}
                    borderWidth={1}
                    borderRadius="md"
                    bg="whiteAlpha.100"
                    borderColor="whiteAlpha.300"
                  >
                    <Heading
                      size={{ base: "xs", md: "sm" }}
                      mb={2}
                      color="white"
                    >
                      Typed Data to Sign
                    </Heading>

                    <Tabs
                      variant="soft-rounded"
                      colorScheme="blue"
                      size={{ base: "xs", md: "sm" }}
                    >
                      <TabList mb={3}>
                        <Tab
                          px={{ base: 4, md: 6 }}
                          fontSize={{ base: "xs", md: "sm" }}
                        >
                          Formatted
                        </Tab>
                        <Tab
                          px={{ base: 4, md: 6 }}
                          fontSize={{ base: "xs", md: "sm" }}
                        >
                          Raw
                        </Tab>
                      </TabList>
                      <TabPanels>
                        <TabPanel p={0}>
                          {decodedSignatureData.decoded ? (
                            <VStack
                              spacing={{ base: 2, md: 3 }}
                              align="stretch"
                            >
                              {/* Domain Section */}
                              <Box>
                                <Text
                                  fontWeight="bold"
                                  fontSize={{ base: "xs", md: "sm" }}
                                >
                                  Domain:
                                </Text>
                                <Code
                                  p={2}
                                  borderRadius="md"
                                  fontSize={{ base: "2xs", md: "xs" }}
                                  width="100%"
                                  whiteSpace="pre-wrap"
                                  wordBreak="break-word"
                                  bg="whiteAlpha.200"
                                  color="white"
                                >
                                  {JSON.stringify(
                                    decodedSignatureData.decoded.domain,
                                    null,
                                    2
                                  )}
                                </Code>
                              </Box>

                              {/* Primary Type */}
                              <Box>
                                <Text
                                  fontWeight="bold"
                                  fontSize={{ base: "xs", md: "sm" }}
                                >
                                  Primary Type:
                                </Text>
                                <Badge colorScheme="purple">
                                  {decodedSignatureData.decoded.primaryType}
                                </Badge>
                              </Box>

                              {/* Message Data */}
                              <Box>
                                <Text
                                  fontWeight="bold"
                                  fontSize={{ base: "xs", md: "sm" }}
                                >
                                  Message:
                                </Text>
                                <Code
                                  p={2}
                                  borderRadius="md"
                                  fontSize={{ base: "2xs", md: "xs" }}
                                  width="100%"
                                  whiteSpace="pre-wrap"
                                  wordBreak="break-word"
                                  bg="whiteAlpha.200"
                                  color="white"
                                >
                                  {JSON.stringify(
                                    decodedSignatureData.decoded.message,
                                    null,
                                    2
                                  )}
                                </Code>
                              </Box>

                              {/* Types */}
                              <Box>
                                <Text
                                  fontWeight="bold"
                                  fontSize={{ base: "xs", md: "sm" }}
                                >
                                  Types:
                                </Text>
                                <Accordion allowToggle>
                                  {Object.entries(
                                    decodedSignatureData.decoded.types || {}
                                  ).map(([typeName, typeProps]) => (
                                    <AccordionItem
                                      key={typeName}
                                      border="none"
                                      mb={1}
                                    >
                                      <AccordionButton
                                        bg="whiteAlpha.200"
                                        borderRadius="md"
                                        _hover={{ bg: "whiteAlpha.300" }}
                                        py={{ base: 1, md: 2 }}
                                        px={{ base: 2, md: 3 }}
                                      >
                                        <Box
                                          flex="1"
                                          textAlign="left"
                                          fontWeight="medium"
                                          fontSize={{ base: "xs", md: "sm" }}
                                        >
                                          {typeName}
                                        </Box>
                                        <AccordionIcon />
                                      </AccordionButton>
                                      <AccordionPanel
                                        pb={{ base: 2, md: 4 }}
                                        bg="whiteAlpha.100"
                                        borderRadius="md"
                                        mt={1}
                                      >
                                        <Code
                                          p={2}
                                          borderRadius="md"
                                          fontSize={{ base: "2xs", md: "xs" }}
                                          width="100%"
                                          whiteSpace="pre-wrap"
                                          wordBreak="break-word"
                                          bg="transparent"
                                          color="white"
                                        >
                                          {JSON.stringify(typeProps, null, 2)}
                                        </Code>
                                      </AccordionPanel>
                                    </AccordionItem>
                                  ))}
                                </Accordion>
                              </Box>
                            </VStack>
                          ) : (
                            <Text
                              color="red.300"
                              fontSize={{ base: "xs", md: "sm" }}
                            >
                              Failed to decode typed data
                            </Text>
                          )}
                        </TabPanel>
                        <TabPanel p={0}>
                          <Code
                            p={2}
                            borderRadius="md"
                            fontSize={{ base: "xs", md: "sm" }}
                            width="100%"
                            whiteSpace="pre-wrap"
                            wordBreak="break-word"
                            bg="whiteAlpha.200"
                            color="white"
                            maxH={{ base: "200px", md: "300px" }}
                            overflowY="auto"
                          >
                            {JSON.stringify(
                              currentSessionRequest.params.request.params[1],
                              null,
                              2
                            )}
                          </Code>
                        </TabPanel>
                      </TabPanels>
                    </Tabs>
                  </Box>
                )}

              {/* For other request types, show raw params */}
              {![
                "eth_sendTransaction",
                "personal_sign",
                "eth_sign",
                "eth_signTypedData",
                "eth_signTypedData_v3",
                "eth_signTypedData_v4",
              ].includes(currentSessionRequest.params.request.method) && (
                <Box>
                  <Text fontWeight="bold" fontSize={{ base: "sm", md: "md" }}>
                    Params:
                  </Text>
                  <Code
                    p={2}
                    borderRadius="md"
                    fontSize={{ base: "xs", md: "sm" }}
                    width="100%"
                    whiteSpace="pre-wrap"
                    bg="whiteAlpha.200"
                    color="white"
                    maxH={{ base: "200px", md: "300px" }}
                    overflowY="auto"
                  >
                    {JSON.stringify(
                      currentSessionRequest.params.request.params,
                      null,
                      2
                    )}
                  </Code>
                </Box>
              )}
            </VStack>
          )}
        </ModalBody>
        <ModalFooter borderTopWidth="1px" borderColor="whiteAlpha.200">
          <Button
            colorScheme="red"
            mr={3}
            onClick={onReject}
            isDisabled={pendingRequest || isSwitchingChain}
            size={{ base: "sm", md: "md" }}
          >
            Reject
          </Button>

          {needsChainSwitch && targetChainId ? (
            <Button
              colorScheme="orange"
              onClick={onChainSwitch}
              isLoading={isSwitchingChain}
              loadingText="Switching..."
              size={{ base: "sm", md: "md" }}
            >
              Switch to{" "}
              {chainIdToChain[targetChainId]?.name ||
                `Chain ID: ${targetChainId}`}
            </Button>
          ) : (
            <Button
              colorScheme="blue"
              onClick={onApprove}
              isLoading={pendingRequest}
              loadingText="Processing..."
              isDisabled={needsChainSwitch || isSwitchingChain}
              size={{ base: "sm", md: "md" }}
            >
              Approve
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
