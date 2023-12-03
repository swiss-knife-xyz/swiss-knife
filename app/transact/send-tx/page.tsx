"use client";

import React, { useState, useRef } from "react";
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
  Button,
  useToast,
  ToastId,
  Link,
} from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import { Hex, parseEther, formatEther, isAddress } from "viem";
import { normalize } from "viem/ens";
import { useNetwork, useWalletClient } from "wagmi";
import { waitForTransaction } from "wagmi/actions";
import { InputField } from "@/components/InputField";
import { DarkSelect } from "@/components/DarkSelect";
import { SelectedOptionState } from "@/types";
import { CopyToClipboard } from "@/components/CopyToClipboard";
import { ethFormatOptions, publicClient, startHexWith0x } from "@/utils";
import { DarkButton } from "@/components/DarkButton";

const SendTx = () => {
  const { data: walletClient } = useWalletClient();
  const { chain } = useNetwork();

  const toast = useToast();
  const toastIdRef = useRef<ToastId>();

  const [to, setTo] = useState<string>();
  const [calldata, setCalldata] = useState<string>();
  const [ethValue, setEthValue] = useState<string>();

  const [selectedEthFormatOption, setSelectedEthFormatOption] =
    useState<SelectedOptionState>({
      label: ethFormatOptions[0],
      value: ethFormatOptions[0],
    });

  const [isLoading, setIsLoading] = useState(false);

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

        await waitForTransaction({
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

        await waitForTransaction({
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
                <CopyToClipboard textToCopy={calldata ?? ""} size={"xs"} />
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
                  setSelectedOption={setSelectedEthFormatOption}
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
              isDisabled={!walletClient}
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
