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
  Container,
  FormControl,
  FormLabel,
  HStack,
  Heading,
  VStack,
  Text,
  Box,
  Textarea,
  Spacer,
  Center,
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
} from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import {
  parseAsInteger,
  parseAsString,
  useQueryState,
} from "next-usequerystate";
import { parseEther, formatEther, isAddress, stringify } from "viem";
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
  getEnsAddress,
  getEnsName,
  getEnsAvatar,
  slicedText,
} from "@/utils";
import debounce from "lodash/debounce";
import { DarkButton } from "@/components/DarkButton";
import { chainIdToChain } from "@/data/common";
import { decodeRecursive } from "@/lib/decoder";
import { renderParams } from "@/components/renderParams";
import { config } from "@/app/providers";

function SendTxContent() {
  const { data: walletClient } = useWalletClient();
  const { chain } = useAccount();
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

  // Debounced ENS resolution
  const resolveEns = useCallback(
    debounce(async (val: string) => {
      if (!val || val === lastResolvedValue) return;
      
      try {
        if (val.includes(".")) {
          // Looks like an ENS name
          setIsResolvingEns(true);
          const address = await getEnsAddress(val);
          if (address) {
            setResolvedAddress(address);
            setEnsName(val);
            setLastResolvedValue(val);
          } else {
            setEnsName("");
            setResolvedAddress("");
          }
        } else if (isAddress(val)) {
          // It's an address, try to get reverse ENS
          setIsResolvingEns(true);
          setResolvedAddress(val);
          try {
            const name = await getEnsName(val);
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
        console.error("Error resolving ENS:", error);
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

  // Fetch ENS avatar when ensName changes
  useEffect(() => {
    if (ensName) {
      getEnsAvatar(ensName).then((avatar) => {
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
    if (
      chain &&
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
  }, [chain, chainIdFromURLOnLoad, switchChain, hasEverMatchedUrlChain]);

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
          to: resolvedTo,
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
    <>
      <Heading mb="2rem" color={"custom.pale"}>
        Send Transaction
      </Heading>
      <Container pb="3rem">
        <VStack spacing={5}>
          <FormControl>
            <HStack mb={2}>
              <FormLabel mb={0}>To Address</FormLabel>
              <Spacer />
              {isResolvingEns && <Spinner size="xs" />}
              {ensName && !isResolvingEns && (
                <HStack px={2} bg="whiteAlpha.200" rounded="md">
                  {ensAvatar && (
                    <Avatar
                      src={ensAvatar}
                      w="1.2rem"
                      h="1.2rem"
                      ignoreFallback
                    />
                  )}
                  <Text fontSize="sm">{ensName}</Text>
                </HStack>
              )}
              {resolvedAddress && !isResolvingEns && resolvedAddress !== to && (
                <Text fontSize="xs" color="whiteAlpha.600">
                  {slicedText(resolvedAddress)}
                </Text>
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
                  />
                )}
            </HStack>
            <InputField
              placeholder="address or ens. Leave blank to deploy contract"
              value={to}
              onChange={(e) => {
                setTo(e.target.value.trim());
              }}
            />
          </FormControl>
          <FormControl mt="1rem">
            <FormLabel>
              <HStack>
                <Text>Data</Text>
                <Spacer />
                <HStack>
                  <Button
                    size={"sm"}
                    onClick={() => decode()}
                    isLoading={isDecoding}
                  >
                    Decode
                  </Button>
                  <CopyToClipboard textToCopy={calldata ?? ""} size={"xs"} />
                </HStack>
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
                    <ModalHeader>Decoded</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                      {decoded && (
                        <Box minW={"80%"}>
                          {decoded.functionName &&
                          decoded.functionName !== "__abi_decoded__" ? (
                            <HStack>
                              <Box>
                                <Box fontSize={"xs"} color={"whiteAlpha.600"}>
                                  function
                                </Box>
                                <Box>{decoded.functionName}</Box>
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
              </HStack>
            </FormLabel>
            <Textarea
              placeholder="calldata"
              value={calldata}
              onChange={(e) => {
                setCalldata(e.target.value);
              }}
              spellCheck={false}
              data-gramm="false"
            />
          </FormControl>
          <Box w="full">
            <Box mb="0.5rem">
              <HStack>
                <Text>Value in</Text>
                <DarkSelect
                  boxProps={{
                    w: "8rem",
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
            </Box>
            <InputField
              type="number"
              placeholder="value"
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
          </Box>
          <Center>
            <DarkButton
              onClick={() => sendTx()}
              isDisabled={!walletClient || chainIdMismatch}
              isLoading={isLoading}
            >
              Send Tx
            </DarkButton>
          </Center>
        </VStack>
      </Container>
    </>
  );
}

export default function SendTx() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SendTxContent />
    </Suspense>
  );
}
