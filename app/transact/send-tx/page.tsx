"use client";

import { useSearchParams } from "next/navigation";
import React, {
  Suspense,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import {
  HStack,
  Heading,
  VStack,
  Text,
  Box,
  Textarea,
  Spacer,
  useToast,
  ToastId,
  Link,
  Button,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  Stack,
  Avatar,
  Spinner,
  Tooltip,
  Image,
  Icon,
} from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import {
  FiSend,
  FiUser,
  FiCode,
  FiDollarSign,
} from "react-icons/fi";
import {
  parseAsInteger,
  parseAsString,
  useQueryState,
} from "next-usequerystate";
import { parseEther, formatEther, isAddress, stringify, zeroAddress } from "viem";
import { normalize } from "viem/ens";
import { useWalletClient, useAccount, useSwitchChain } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { InputField } from "@/components/InputField";
import { DarkSelect } from "@/components/DarkSelect";
import { CopyToClipboard } from "@/components/CopyToClipboard";
import {
  ethFormatOptions,
  ETHSelectedOptionState,
  publicClient,
  startHexWith0x,
  resolveNameToAddress,
  resolveAddressToName,
  getNameAvatar,
  isResolvableName,
  slicedText,
  generateTenderlyUrl,
} from "@/utils";
import debounce from "lodash/debounce";
import { DarkButton } from "@/components/DarkButton";
import { chainIdToChain } from "@/data/common";
import { decodeRecursive } from "@/lib/decoder";
import { renderParams } from "@/components/renderParams";
import { config } from "@/app/providers";

function SendTxContent() {
  const { data: walletClient } = useWalletClient();
  const { chain, address: connectedAddress } = useAccount();
  const { switchChain } = useSwitchChain();

  const toast = useToast();
  const toastIdRef = useRef<ToastId>();
  const searchParams = useSearchParams();

  const [to, setTo] = useQueryState<string>(
    "to",
    parseAsString.withDefault("")
  );
  const [calldata, setCalldata] = useQueryState<string>(
    "calldata",
    parseAsString.withDefault("")
  );
  const [ethValue, setEthValue] = useQueryState<string>(
    "eth",
    parseAsString.withDefault("")
  );
  const [chainId, setChainId] = useQueryState<number>(
    "chainId",
    parseAsInteger.withDefault(1)
  );
  const [chainIdFromURLOnLoad, setChainIdFromURLOnLoad] = useState<
    number | undefined
  >(undefined);
  const [hasEverMatchedUrlChain, setHasEverMatchedUrlChain] = useState(false);
  const [isUrlParsed, setIsUrlParsed] = useState(false);

  const [selectedEthFormatOption, setSelectedEthFormatOption] =
    useState<ETHSelectedOptionState>({
      label: ethFormatOptions[1],
      value: ethFormatOptions[1],
    });

  const [chainIdMismatch, setChainIdMismatch] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [isDecodeModalOpen, setIsDecodeModalOpen] = useState(false);
  const [isDecoding, setIsDecoding] = useState(false);
  const [decoded, setDecoded] = useState<any>();

  // ENS resolution state
  const [ensName, setEnsName] = useState("");
  const [ensAvatar, setEnsAvatar] = useState("");
  const [resolvedAddress, setResolvedAddress] = useState("");
  const [isResolvingEns, setIsResolvingEns] = useState(false);
  const [lastResolvedValue, setLastResolvedValue] = useState("");

  // Debounced name resolution (ENS, Basename, etc.)
  const resolveEns = useCallback(
    debounce(async (val: string) => {
      if (!val || val === lastResolvedValue) return;
      
      try {
        if (isResolvableName(val)) {
          // Looks like a name (ENS, Basename, etc.)
          setIsResolvingEns(true);
          const address = await resolveNameToAddress(val);
          if (address) {
            setResolvedAddress(address);
            setEnsName(val);
            setLastResolvedValue(val);
          } else {
            setEnsName("");
            setResolvedAddress("");
          }
        } else if (isAddress(val)) {
          // It's an address, try to get reverse resolution
          setIsResolvingEns(true);
          setResolvedAddress(val);
          try {
            const name = await resolveAddressToName(val);
            if (name) {
              setEnsName(name);
            } else {
              setEnsName("");
            }
          } catch {
            setEnsName("");
          }
          setLastResolvedValue(val);
        } else {
          setEnsName("");
          setResolvedAddress("");
        }
      } catch (error) {
        console.error("Error resolving name:", error);
        setEnsName("");
        setResolvedAddress("");
      } finally {
        setIsResolvingEns(false);
      }
    }, 500),
    [lastResolvedValue]
  );

  // Resolve ENS when "to" changes
  useEffect(() => {
    if (to && to !== lastResolvedValue) {
      resolveEns(to);
    } else if (!to) {
      setEnsName("");
      setResolvedAddress("");
      setLastResolvedValue("");
    }
  }, [to, resolveEns, lastResolvedValue]);

  // Fetch avatar when ensName changes
  useEffect(() => {
    if (ensName) {
      getNameAvatar(ensName).then((avatar) => {
        setEnsAvatar(avatar || "");
      });
    } else {
      setEnsAvatar("");
    }
  }, [ensName]);

  useEffect(() => {
    const chainIdFromURL = searchParams.get("chainId");
    if (chainIdFromURL) {
      setChainIdFromURLOnLoad(parseInt(chainIdFromURL));
      setHasEverMatchedUrlChain(false); // Reset flag for new URL requirement
    } else {
      // No chainId in URL - clear all restrictions
      setChainIdFromURLOnLoad(undefined);
      setHasEverMatchedUrlChain(true);
      setChainIdMismatch(false);
    }
    setIsUrlParsed(true); // Mark URL parsing as complete
  }, [searchParams]);

  useEffect(() => {
    // Only show chain mismatch toast if:
    // 1. URL has been parsed (isUrlParsed)
    // 2. A chainId was explicitly passed via URL (chainIdFromURLOnLoad is defined)
    // 3. Wallet chain doesn't match the URL chain
    // 4. User hasn't already satisfied the requirement
    if (
      chain &&
      isUrlParsed &&
      chainIdFromURLOnLoad &&
      chain.id !== chainIdFromURLOnLoad &&
      !hasEverMatchedUrlChain
    ) {
      toastIdRef.current = toast({
        title: "Wallet's Network should match the chainId passed via URL",
        description: (
          <VStack spacing={2} align="start">
            <Text fontSize="sm" color="gray.800">
              Switch to{" "}
              <Text as="span" fontWeight="bold" color="gray.900">
                {chainIdToChain[chainIdFromURLOnLoad]?.name}
              </Text>{" "}
              to continue
            </Text>
            <DarkButton
              size="sm"
              onClick={() => switchChain({ chainId: chainIdFromURLOnLoad })}
            >
              Switch Network
            </DarkButton>
          </VStack>
        ),
        status: "error",
        position: "bottom-right",
        duration: null,
        isClosable: false,
      });

      setChainIdMismatch(true);
    }
  }, [chain, chainIdFromURLOnLoad, switchChain, hasEverMatchedUrlChain, isUrlParsed]);

  useEffect(() => {
    if (chain && isUrlParsed) {
      if (chainIdFromURLOnLoad) {
        if (chain.id === chainIdFromURLOnLoad) {
          onChainIdMatched();
        } else if (hasEverMatchedUrlChain) {
          // User has satisfied URL requirement and is now free to switch chains
          setChainIdMismatch(false);
          setChainId(chain.id);
        }
        // Don't update URL when there's a pending requirement and user hasn't matched yet
      } else {
        // In normal mode, always sync URL with wallet chain
        setChainId(chain.id);
      }
    }
  }, [
    chain,
    searchParams,
    chainIdFromURLOnLoad,
    hasEverMatchedUrlChain,
    isUrlParsed,
  ]);

  const onChainIdMatched = () => {
    if (toastIdRef.current) {
      toast.close(toastIdRef.current);
    }
    setChainIdMismatch(false);
    setChainIdFromURLOnLoad(undefined);
    setHasEverMatchedUrlChain(true);
  };

  const resolveAddress = async (addressOrEns: string) => {
    if (isAddress(addressOrEns)) {
      return addressOrEns;
    } else {
      const ensResolvedAddress = await publicClient.getEnsAddress({
        name: normalize(addressOrEns),
      });
      if (ensResolvedAddress) {
        return ensResolvedAddress;
      } else {
        return undefined;
      }
    }
  };

  const sendTx = async () => {
    if (!walletClient) return;

    setIsLoading(true);

    const hexCalldata = startHexWith0x(calldata);

    try {
      if (!to || to.length === 0) {
        const hash = await walletClient.deployContract({
          bytecode: hexCalldata,
          value: parseEther(ethValue ?? "0"),
          abi: [],
        });

        setIsLoading(false);

        toastIdRef.current = toast({
          title: "Deploying contract",
          description: (
            <Link
              href={`${chain?.blockExplorers?.default.url}/tx/${hash}`}
              isExternal
            >
              <HStack>
                <Text>View on explorer</Text>
                <ExternalLinkIcon />
              </HStack>
            </Link>
          ),
          status: "loading",
          position: "bottom-right",
          duration: null,
          isClosable: true,
        });

        await waitForTransactionReceipt(config, {
          hash,
        });
        toast.close(toastIdRef.current);
        toast({
          title: "Contract deployed successfully",
          description: (
            <Link
              href={`${chain?.blockExplorers?.default.url}/tx/${hash}`}
              isExternal
            >
              <HStack>
                <Text>View on explorer</Text>
                <ExternalLinkIcon />
              </HStack>
            </Link>
          ),
          status: "success",
          position: "bottom-right",
          duration: null,
          isClosable: true,
        });
      } else {
        // Use already-resolved address if available, otherwise resolve now
        const resolvedTo = resolvedAddress || (await resolveAddress(to));

        if (!resolvedTo) {
          toast({
            title: "Invalid address or ENS name",
            status: "error",
            position: "bottom-right",
            duration: 5_000,
            isClosable: true,
          });

          setIsLoading(false);
          return;
        }

        const hash = await walletClient.sendTransaction({
          to: resolvedTo as `0x${string}`,
          data: hexCalldata,
          value: parseEther(ethValue ?? "0"),
        });

        setIsLoading(false);

        toastIdRef.current = toast({
          title: "Transaction sent",
          description: (
            <Link
              href={`${chain?.blockExplorers?.default.url}/tx/${hash}`}
              isExternal
            >
              <HStack>
                <Text>View on explorer</Text>
                <ExternalLinkIcon />
              </HStack>
            </Link>
          ),
          status: "loading",
          position: "bottom-right",
          duration: null,
          isClosable: true,
        });

        await waitForTransactionReceipt(config, {
          hash,
        });
        toast.close(toastIdRef.current);
        toast({
          title: "Transaction confirmed",
          description: (
            <Link
              href={`${chain?.blockExplorers?.default.url}/tx/${hash}`}
              isExternal
            >
              <HStack>
                <Text>View on explorer</Text>
                <ExternalLinkIcon />
              </HStack>
            </Link>
          ),
          status: "success",
          position: "bottom-right",
          duration: null,
          isClosable: true,
        });
      }
    } catch (e) {
      console.log(e);

      setIsLoading(false);

      if (toastIdRef.current) {
        toast.close(toastIdRef.current);
      }
      toast({
        title: "Something went wrong",
        description: "Check console for more details",
        status: "error",
        position: "bottom-right",
        duration: 5_000,
        isClosable: true,
      });
    }
  };

  const decode = useCallback(async () => {
    setIsDecoding(true);
    console.log("DECODING...");
    try {
      const res = await decodeRecursive({
        calldata: startHexWith0x(calldata),
        address: to,
        chainId: chainId,
      });
      console.log({ DECODED_RESULT: res });
      setDecoded(res);

      if (res !== null) {
        setIsDecodeModalOpen(true);
      } else {
        throw new Error("Unable to decode this calldata");
      }
    } catch (e: any) {
      console.log("Error Decoding");
      toast({
        title: "Error",
        description: e.message,
        status: "error",
        isClosable: true,
        duration: 4000,
      });
    } finally {
      setIsDecoding(false);
    }
  }, [calldata, to, chainId]);

  return (
    <Box
      p={6}
      bg="rgba(0, 0, 0, 0.05)"
      backdropFilter="blur(5px)"
      borderRadius="xl"
      border="1px solid"
      borderColor="whiteAlpha.50"
      maxW="800px"
      w="full"
      mx="auto"
    >
      {/* Page Header */}
      <Box mb={8} textAlign="center">
        <HStack justify="center" spacing={3} mb={4}>
          <Icon as={FiSend} color="blue.400" boxSize={8} />
          <Heading size="xl" color="gray.100" fontWeight="bold" letterSpacing="tight">
            Send Transaction
          </Heading>
        </HStack>
        <Text color="gray.400" fontSize="lg" maxW="600px" mx="auto">
          Send a transaction or deploy a contract with custom calldata
        </Text>
      </Box>

      <VStack spacing={6} align="stretch">
        {/* To Address Section */}
        <Box
          p={4}
          bg="whiteAlpha.50"
          borderRadius="lg"
          border="1px solid"
          borderColor="whiteAlpha.200"
        >
          <VStack spacing={4} align="stretch">
            <HStack spacing={2} align="center">
              <Icon as={FiUser} color="blue.400" boxSize={5} />
              <Text color="gray.300" fontWeight="medium">
                To Address
              </Text>
              <Spacer />
              {isResolvingEns && <Spinner size="xs" color="blue.400" />}
              {ensName && !isResolvingEns && (
                <HStack px={2} py={1} bg="whiteAlpha.100" rounded="md">
                  {ensAvatar && (
                    <Avatar
                      src={ensAvatar}
                      w="1.2rem"
                      h="1.2rem"
                      ignoreFallback
                    />
                  )}
                  <Text fontSize="sm" color="gray.200">{ensName}</Text>
                </HStack>
              )}
              {resolvedAddress && !isResolvingEns && resolvedAddress !== to && (
                <HStack spacing={1}>
                  <Tooltip label={resolvedAddress} placement="top">
                    <Text fontSize="xs" color="gray.500" cursor="default">
                      {slicedText(resolvedAddress)}
                    </Text>
                  </Tooltip>
                  <CopyToClipboard textToCopy={resolvedAddress} size="xs" />
                </HStack>
              )}
              {(resolvedAddress || isAddress(to ?? "")) &&
                chain?.blockExplorers?.default?.url && (
                  <IconButton
                    as={Link}
                    href={`${chain.blockExplorers.default.url}/address/${resolvedAddress || to}`}
                    isExternal
                    aria-label="View on explorer"
                    icon={<ExternalLinkIcon />}
                    size="xs"
                    variant="ghost"
                    color="gray.400"
                    _hover={{ color: "blue.400" }}
                  />
                )}
            </HStack>
            <InputField
              placeholder="Address or ENS name. Leave blank to deploy contract"
              value={to}
              onChange={(e) => {
                setTo(e.target.value.trim());
              }}
            />
          </VStack>
        </Box>

        {/* Calldata Section */}
        <Box
          p={4}
          bg="whiteAlpha.50"
          borderRadius="lg"
          border="1px solid"
          borderColor="whiteAlpha.200"
        >
          <VStack spacing={4} align="stretch">
            <HStack spacing={2} align="center">
              <Icon as={FiCode} color="blue.400" boxSize={5} />
              <Text color="gray.300" fontWeight="medium">
                Calldata
              </Text>
              <Spacer />
              <HStack spacing={2}>
                <Button
                  size="sm"
                  colorScheme="blue"
                  variant="ghost"
                  onClick={() => decode()}
                  isLoading={isDecoding}
                >
                  Decode
                </Button>
                <CopyToClipboard textToCopy={calldata ?? ""} size="xs" />
              </HStack>
            </HStack>
            <Textarea
              placeholder="Enter calldata (hex)"
              value={calldata}
              onChange={(e) => {
                setCalldata(e.target.value);
              }}
              spellCheck={false}
              data-gramm="false"
              minH="120px"
              bg="whiteAlpha.50"
              border="1px solid"
              borderColor="whiteAlpha.200"
              _hover={{ borderColor: "whiteAlpha.300" }}
              _focus={{
                borderColor: "blue.400",
                boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
              }}
              color="gray.100"
              _placeholder={{ color: "gray.500" }}
              fontSize="sm"
              fontFamily="mono"
            />
          </VStack>
        </Box>

        {/* Decode Modal */}
        <Modal
          isOpen={isDecodeModalOpen}
          onClose={() => setIsDecodeModalOpen(false)}
          isCentered
        >
          <ModalOverlay
            bg="none"
            backdropFilter="auto"
            backdropBlur="5px"
          />
          <ModalContent
            minW={{
              base: 0,
              sm: "30rem",
              md: "40rem",
            }}
            pb="6"
            bg="bg.900"
          >
            <ModalHeader color="gray.100">Decoded Calldata</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              {decoded && (
                <Box minW={"80%"}>
                  {decoded.functionName &&
                  decoded.functionName !== "__abi_decoded__" ? (
                    <HStack>
                      <Box>
                        <Text fontSize="xs" color="gray.500">
                          function
                        </Text>
                        <Text color="gray.100">{decoded.functionName}</Text>
                      </Box>
                      <Spacer />
                      <CopyToClipboard
                        textToCopy={JSON.stringify(
                          {
                            function: decoded.signature,
                            params: JSON.parse(
                              stringify(decoded.rawArgs)
                            ),
                          },
                          undefined,
                          2
                        )}
                        labelText={"Copy params"}
                      />
                    </HStack>
                  ) : null}
                  <Stack
                    mt={2}
                    p={4}
                    spacing={4}
                    bg={"whiteAlpha.50"}
                    rounded={"lg"}
                  >
                    {decoded.args.map((arg: any, i: number) => {
                      return renderParams(i, arg, chainId);
                    })}
                  </Stack>
                </Box>
              )}
            </ModalBody>
          </ModalContent>
        </Modal>

        {/* Value Section */}
        <Box
          p={4}
          bg="whiteAlpha.50"
          borderRadius="lg"
          border="1px solid"
          borderColor="whiteAlpha.200"
        >
          <VStack spacing={4} align="stretch">
            <HStack spacing={2} align="center">
              <Icon as={FiDollarSign} color="blue.400" boxSize={5} />
              <Text color="gray.300" fontWeight="medium">
                Value
              </Text>
              <DarkSelect
                boxProps={{
                  w: "7rem",
                }}
                selectedOption={selectedEthFormatOption}
                setSelectedOption={(value) =>
                  setSelectedEthFormatOption(value as ETHSelectedOptionState)
                }
                options={ethFormatOptions.map((str) => ({
                  label: str,
                  value: str,
                }))}
              />
            </HStack>
            <InputField
              type="number"
              placeholder="Enter value to send"
              value={
                selectedEthFormatOption?.value === "ETH"
                  ? ethValue
                  : parseEther(ethValue ?? "0").toString()
              }
              onChange={(e) => {
                const value = e.target.value;

                if (selectedEthFormatOption?.value === "ETH") {
                  setEthValue(value);
                } else {
                  // convert wei to eth
                  setEthValue(formatEther(BigInt(value)));
                }
              }}
            />
          </VStack>
        </Box>

        {/* Action Buttons */}
        <HStack spacing={4} justify="center" pt={2}>
          <Button
            variant="outline"
            size="md"
            borderColor="whiteAlpha.300"
            _hover={{ 
              borderColor: "whiteAlpha.400",
              bg: "whiteAlpha.100"
            }}
            onClick={() => {
              const targetAddress = resolvedAddress || to || "";
              const url = generateTenderlyUrl(
                {
                  from: connectedAddress || zeroAddress,
                  to: targetAddress,
                  value: parseEther(ethValue ?? "0").toString(),
                  data: startHexWith0x(calldata) || "0x",
                },
                chainId
              );
              window.open(url, "_blank");
            }}
          >
            <HStack spacing={2}>
              <Image
                src="/external/tenderly-favicon.ico"
                alt="Tenderly"
                w={4}
                h={4}
              />
              <Text color="gray.300">
                Simulate
              </Text>
            </HStack>
          </Button>
          <Button
            colorScheme="blue"
            size="md"
            leftIcon={<Icon as={FiSend} boxSize={4} />}
            onClick={() => sendTx()}
            isDisabled={!walletClient || chainIdMismatch}
            isLoading={isLoading}
          >
            Send Transaction
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
}

export default function SendTx() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SendTxContent />
    </Suspense>
  );
}
