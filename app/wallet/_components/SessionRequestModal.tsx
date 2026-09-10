"use client";

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
  IconButton,
  Modal,
  ModalOverlay,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Switch,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tag,
  Text,
  Tooltip,
  VStack,
  Image,
} from "@chakra-ui/react";
import { useAccount } from "wagmi";
import { formatEther, Address, erc20Abi, zeroAddress } from "viem";
import { DecodedSignatureData, SessionRequest } from "../bridge/types";
import { TreeView } from "@/components/decodedParams/TreeView";
import { useAutoHideScrollbars } from "@/hooks/useAutoHideScrollbars";
import { DecodedCalldataSkeleton } from "@/components/decodedParams/DecodedCalldataSkeleton";
import { getDisplayFunctionName } from "@/utils/functionNames";
import { chainIdToChain } from "@/data/common";
import { getPublicClient } from "@/lib/publicClient";
import { useCallback, useEffect, useState } from "react";
import { fetchAddressLabels } from "@/utils/addressLabels";
import { fetchContractAbi, generateTenderlyUrl } from "@/utils";
import { BsArrowsAngleExpand, BsArrowsAngleContract } from "react-icons/bs";

export interface SessionRequestModalProps {
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
  approveText?: string | React.ReactNode;
  onApprove: () => void;
  onReject: () => void;
  onSimulate?: () => void;
  onChainSwitch: () => void;
  portalId?: string;
  forceInclusionEnabled?: boolean;
  onForceInclusionToggle?: (enabled: boolean) => void;
  isOPStackTransaction?: boolean;
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
  approveText,
  onApprove,
  onReject,
  onSimulate,
  onChainSwitch,
  portalId,
  forceInclusionEnabled = false,
  onForceInclusionToggle,
  isOPStackTransaction = false,
}: SessionRequestModalProps) {
  const { address: connectedAddress } = useAccount();

  const [addressLabels, setAddressLabels] = useState<string[]>([]);
  const [txDataTabIndex, setTxDataTabIndex] = useState(0); // Show decoded data and its loading state by default
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollbars = useAutoHideScrollbars();
  const decodedFunctionName = getDisplayFunctionName(
    decodedTxData?.functionName,
    decodedTxData?.guessedFunctionName
  );

  useEffect(() => {
    // Show the loading state as soon as a new decode starts.
    if (isDecodingTx || decodedTxData) {
      setTxDataTabIndex(0);
    }
  }, [decodedTxData, isDecodingTx]);

  const fetchAndSetAddressLabels = useCallback(
    async (address: string, chainId: number) => {
      setAddressLabels([]);

      try {
        const client = getPublicClient(chainId);

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
          const labels = await fetchAddressLabels(address, chainId);
          if (labels.length > 0) {
            setAddressLabels(labels);
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
        fetchAndSetAddressLabels(
          currentSessionRequest.params.request.params[0].to,
          chainId
        );
      }
    }
  }, [currentSessionRequest, fetchAndSetAddressLabels]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isCentered
      scrollBehavior="inside"
      size="6xl"
      closeOnOverlayClick={false}
      closeOnEsc={true}
      blockScrollOnMount={false}
      portalProps={{
        containerRef: portalId
          ? { current: document.getElementById(portalId) }
          : undefined,
      }}
    >
      <ModalOverlay
        bg="blackAlpha.600"
        backdropFilter="blur(2px)"
        zIndex={20002}
      />
      <ModalContent
        bg="bg.900"
        color="white"
        w="calc(100% - 2rem)"
        maxW={isExpanded ? "1200px" : "600px"}
        maxH={{ base: "calc(100dvh - 2rem)", md: "calc(100dvh - 4rem)" }}
        position="relative"
        containerProps={{ zIndex: 20003, pointerEvents: "auto" }}
        mx="auto"
        my={{ base: 4, md: 8 }}
        boxShadow="2xl"
        pointerEvents="auto"
        transition="all 0.2s ease-in-out"
        height={isExpanded ? "calc(100dvh - 4rem)" : "auto"}
      >
        <ModalHeader
          borderBottomWidth="1px"
          borderColor="whiteAlpha.200"
          fontSize={{ base: "md", md: "lg" }}
          display={isExpanded && txDataTabIndex === 0 ? "none" : "flex"}
        >
          Session Request
          <ModalCloseButton onClick={onClose} />
        </ModalHeader>
        <ModalBody
          {...scrollbars}
          px={{ base: 5, md: 8 }}
          py={5}
          overflowY="auto"
        >
          {currentSessionRequest && (
            <VStack spacing={{ base: 3, md: 4 }} align="stretch">
              <Flex
                align="center"
                gap={3}
                display={isExpanded && txDataTabIndex === 0 ? "none" : "flex"}
              >
                <Text
                  flexShrink={0}
                  fontWeight="bold"
                  fontSize={{ base: "sm", md: "md" }}
                >
                  Method:
                </Text>
                <Code
                  p={2}
                  borderRadius="md"
                  fontSize={{ base: "sm", md: "md" }}
                  ml="auto"
                  textAlign="right"
                  minW={0}
                  overflowWrap="anywhere"
                  bg="whiteAlpha.200"
                  color="white"
                >
                  {currentSessionRequest.params.request.method}
                </Code>
              </Flex>

              {/* Transaction Request */}
              {currentSessionRequest.params.request.method ===
                "eth_sendTransaction" && (
                <Box
                  p={isExpanded ? 0 : { base: 2, md: 3 }}
                  borderWidth={isExpanded ? 0 : 1}
                  borderRadius="md"
                  bg={isExpanded ? "transparent" : "whiteAlpha.100"}
                  borderColor="whiteAlpha.300"
                >
                  <Heading
                    size={{ base: "xs", md: "sm" }}
                    mb={2}
                    color="white"
                    display={
                      isExpanded && txDataTabIndex === 0 ? "none" : "block"
                    }
                  >
                    Transaction Details
                  </Heading>
                  <VStack spacing={1} align="stretch">
                    <Box
                      display={
                        isExpanded && txDataTabIndex === 0 ? "none" : "block"
                      }
                    >
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
                          <Text
                            color="white"
                            fontSize={{ base: "xs", md: "sm" }}
                          >
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
                          <Text
                            color="white"
                            fontSize={{ base: "xs", md: "sm" }}
                          >
                            {BigInt(
                              currentSessionRequest.params.request.params[0].gas
                            ).toString()}
                          </Text>
                        </Flex>
                      )}

                      {/* Force Inclusion Toggle for OP Stack chains */}
                      {isOPStackTransaction && onForceInclusionToggle && (
                        <Box
                          mt={3}
                          p={3}
                          bg="purple.900"
                          borderRadius="md"
                          borderWidth={1}
                          borderColor="purple.500"
                        >
                          <Flex
                            justifyContent="space-between"
                            alignItems="center"
                            flexDirection={{ base: "column", sm: "row" }}
                            gap={2}
                          >
                            <Box flex={1}>
                              <HStack mb={1}>
                                <Text
                                  fontWeight="bold"
                                  color="white"
                                  fontSize={{ base: "sm", md: "md" }}
                                >
                                  ⚡ Force Inclusion
                                </Text>
                                <Badge colorScheme="purple" fontSize="xs">
                                  {chainIdToChain[
                                    parseInt(
                                      currentSessionRequest.params.chainId.split(
                                        ":"
                                      )[1]
                                    )
                                  ]?.name || "Unknown"}
                                </Badge>
                              </HStack>
                              <Text
                                color="whiteAlpha.700"
                                fontSize={{ base: "xs", md: "sm" }}
                              >
                                Submit via L1 deposit to guarantee inclusion.
                                Takes 1-10 minutes.
                              </Text>
                            </Box>
                            <Switch
                              colorScheme="purple"
                              size="lg"
                              isChecked={forceInclusionEnabled}
                              onChange={(e) =>
                                onForceInclusionToggle(e.target.checked)
                              }
                              isDisabled={pendingRequest}
                            />
                          </Flex>
                        </Box>
                      )}
                    </Box>

                    {currentSessionRequest.params.request.params[0].data && (
                      <Box
                        mt={isExpanded && txDataTabIndex === 0 ? 0 : 4}
                        pt={isExpanded && txDataTabIndex === 0 ? 0 : 3}
                        borderTopWidth={
                          isExpanded && txDataTabIndex === 0 ? 0 : 1
                        }
                        borderTopColor="whiteAlpha.300"
                      >
                        <Tabs
                          variant="soft-rounded"
                          colorScheme="blue"
                          size={{ base: "xs", md: "sm" }}
                          index={txDataTabIndex}
                          onChange={setTxDataTabIndex}
                        >
                          <Flex align="center" gap={3} flexWrap="wrap" mb={4}>
                            <Text
                              fontSize="sm"
                              fontWeight="semibold"
                              color="gray.300"
                            >
                              Transaction data
                            </Text>
                            <TabList
                              ml="auto"
                              gap={1}
                              p={1}
                              bg="whiteAlpha.50"
                              borderRadius="lg"
                            >
                              <Tab
                                px={3}
                                py={1.5}
                                borderRadius="md"
                                color="gray.500"
                                _selected={{
                                  bg: "whiteAlpha.200",
                                  color: "gray.100",
                                }}
                                fontSize={{ base: "xs", md: "sm" }}
                              >
                                Decoded
                              </Tab>
                              <Tab
                                px={3}
                                py={1.5}
                                borderRadius="md"
                                color="gray.500"
                                _selected={{
                                  bg: "whiteAlpha.200",
                                  color: "gray.100",
                                }}
                                fontSize={{ base: "xs", md: "sm" }}
                              >
                                Raw
                              </Tab>
                            </TabList>
                            <HStack>
                              {isDecodingTx && txDataTabIndex === 1 && (
                                <Text
                                  fontSize={{ base: "xs", md: "sm" }}
                                  color="whiteAlpha.700"
                                >
                                  Decoding...
                                </Text>
                              )}
                              {txDataTabIndex === 0 && (
                                <Tooltip
                                  label={
                                    isExpanded ? "Collapse view" : "Expand view"
                                  }
                                >
                                  <IconButton
                                    aria-label={
                                      isExpanded ? "Collapse" : "Expand"
                                    }
                                    icon={
                                      isExpanded ? (
                                        <BsArrowsAngleContract size="1.2em" />
                                      ) : (
                                        <BsArrowsAngleExpand size="1.2em" />
                                      )
                                    }
                                    size="sm"
                                    variant="ghost"
                                    color="gray.400"
                                    _hover={{
                                      bg: "whiteAlpha.100",
                                      color: "gray.100",
                                    }}
                                    onClick={() => setIsExpanded(!isExpanded)}
                                  />
                                </Tooltip>
                              )}
                            </HStack>
                          </Flex>
                          <TabPanels>
                            <TabPanel p={0}>
                              {isDecodingTx ? (
                                <DecodedCalldataSkeleton />
                              ) : decodedTxData ? (
                                <Box
                                  p={4}
                                  bg="whiteAlpha.50"
                                  borderRadius="lg"
                                  border="1px solid"
                                  borderColor="whiteAlpha.200"
                                  data-tree-wrapper="true"
                                  maxH={
                                    isExpanded
                                      ? "calc(100dvh - 280px)"
                                      : { base: "300px", md: "450px" }
                                  }
                                  overflowY="auto"
                                >
                                  <TreeView
                                    args={decodedTxData.args}
                                    chainId={Number(
                                      currentSessionRequest.params.chainId.split(
                                        ":"
                                      )[1]
                                    )}
                                    functionName={
                                      decodedFunctionName.name ??
                                      decodedTxData.functionName
                                    }
                                    isFunctionNameGuessed={
                                      decodedFunctionName.isGuessed
                                    }
                                  />
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
              {["personal_sign", "eth_sign"].includes(
                currentSessionRequest.params.request.method
              ) &&
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
              {[
                "eth_signTypedData",
                "eth_signTypedData_v3",
                "eth_signTypedData_v4",
              ].includes(currentSessionRequest.params.request.method) &&
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
        <ModalFooter
          bg="bg.900"
          flexShrink={0}
          borderBottomRadius="inherit"
          borderTopWidth="1px"
          borderColor="whiteAlpha.200"
        >
          <Flex w="100%" justifyContent="space-between" alignItems="center">
            {currentSessionRequest?.params?.request?.method ===
              "eth_sendTransaction" && (
              <Button
                colorScheme="whiteAlpha"
                size={{ base: "sm", md: "md" }}
                onClick={() => {
                  if (onSimulate) {
                    onSimulate();
                    return;
                  }
                  const txData = currentSessionRequest.params.request.params[0];
                  const chainIdStr =
                    currentSessionRequest.params.chainId.split(":")[1];
                  const chainId = parseInt(chainIdStr);

                  const url = generateTenderlyUrl(
                    {
                      from: connectedAddress || zeroAddress,
                      to: txData.to,
                      value: txData.value || "0",
                      data: txData.data || "0x",
                    },
                    chainId
                  );
                  window.open(url, "_blank");
                }}
              >
                <HStack>
                  <Image
                    src="/external/tenderly-favicon.ico"
                    alt="Tenderly"
                    width={5}
                    height={5}
                  />
                  <Text color="white">Simulate</Text>
                </HStack>
              </Button>
            )}
            <HStack spacing={3}>
              <Button
                colorScheme="red"
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
                  {approveText || "Approve"}
                </Button>
              )}
            </HStack>
          </Flex>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
