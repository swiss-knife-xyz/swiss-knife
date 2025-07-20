"use client";

import { useSearchParams } from "next/navigation";
import React, { useState, useRef, useEffect, useCallback } from "react";
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
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  Stack,
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
} from "@/utils";
import { DarkButton } from "@/components/DarkButton";
import { chainIdToChain } from "@/data/common";
import { decodeRecursive } from "@/lib/decoder";
import { renderParams } from "@/components/renderParams";
import { config } from "@/app/providers";

const SendTx = () => {
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

  useEffect(() => {
    const chainIdFromURL = searchParams.get("chainId");
    if (chainIdFromURL) {
      setChainIdFromURLOnLoad(chainId);
    }
  }, [chainId, searchParams]);

  useEffect(() => {
    if (chain && chainIdFromURLOnLoad && chain.id !== chainIdFromURLOnLoad) {
      toastIdRef.current = toast({
        title: "Wallet's Network should match the chainId passed via URL",
        description: `Switch network to ${chainIdToChain[chainIdFromURLOnLoad]?.name} to continue`,
        status: "error",
        position: "bottom-right",
        duration: null,
        isClosable: false,
      });

      setChainIdMismatch(true);
      switchChain({ chainId: chainIdFromURLOnLoad });
    }
  }, [chainIdFromURLOnLoad, switchChain]);

  useEffect(() => {
    if (chain) {
      if (chainIdFromURLOnLoad) {
        if (chain.id === chainIdFromURLOnLoad) {
          onChainIdMatched();
        }
      } else {
        const chainIdFromURL = searchParams.get("chainId");
        if (!chainIdFromURL) {
          setChainId(chain.id);
        }
      }
    }
  }, [chain, searchParams]);

  const onChainIdMatched = () => {
    if (toastIdRef.current) {
      toast.close(toastIdRef.current);
    }
    setChainIdMismatch(false);
    setChainIdFromURLOnLoad(undefined);
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
        const resolvedTo = await resolveAddress(to);

        if (!resolvedTo) {
          toast({
            title: "Invalid address",
            status: "error",
            position: "bottom-right",
            duration: 5_000,
            isClosable: true,
          });

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
            <FormLabel>To Address</FormLabel>
            <InputField
              placeholder="address or ens. Leave blank to deploy contract"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
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
};

export default SendTx;
