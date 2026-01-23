"use client";

import { useSearchParams } from "next/navigation";
import React, { Suspense, useState, useEffect } from "react";
import {
  Heading,
  Table,
  Tbody,
  Tr,
  Td,
  Box,
  Container,
  Center,
  useToast,
  Stack,
  FormControl,
  FormLabel,
  Collapse,
  useDisclosure,
  HStack,
  Spacer,
  Text,
  useUpdateEffect,
  Link,
  Button,
} from "@chakra-ui/react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ExternalLinkIcon,
} from "@chakra-ui/icons";
import {
  parseAsInteger,
  parseAsString,
  useQueryState,
} from "next-usequerystate";
import { createPublicClient, http, Hex, Chain, stringify } from "viem";
import { DecodeRecursiveResult, SelectedOptionState } from "@/types";
import {
  c,
  chainIdToChain,
  erc3770ShortNameToChain,
  networkOptions,
} from "@/data/common";
import { resolveERC3770Address, startHexWith0x } from "@/utils";
import { Editor } from "@monaco-editor/react";

import { InputField } from "@/components/InputField";
import { Label } from "@/components/Label";
import { renderParams } from "@/components/renderParams";
import { DarkButton } from "@/components/DarkButton";
import TabsSelector from "@/components/Tabs/TabsSelector";
import { DarkSelect } from "@/components/DarkSelect";
import { CopyToClipboard } from "@/components/CopyToClipboard";
import { decodeRecursive } from "@/lib/decoder";

function CalldataDecoderPageContent({ headerText }: { headerText?: string }) {
  const toast = useToast();
  const searchParams = useSearchParams();

  // get data from URL
  const calldataFromURL = searchParams.get("calldata");
  const addressFromURL = searchParams.get("address");
  const chainIdFromURL = searchParams.get("chainId");
  const txFromURL = searchParams.get("tx");

  const networkOptionsIndex = chainIdFromURL
    ? networkOptions.findIndex(
        (option) => option.value === parseInt(chainIdFromURL)
      )
    : 0;

  const [calldata, setCalldata] = useQueryState<string>(
    "calldata",
    parseAsString.withDefault("")
  );
  // can be function calldata or abi.encode bytes
  const [result, setResult] = useState<DecodeRecursiveResult>();
  const [isLoading, setIsLoading] = useState(false);
  const [pasted, setPasted] = useState(false);

  const [selectedTabIndex, setSelectedTabIndex] = useState(0);

  const [abi, setAbi] = useState<any>();

  const [contractAddress, setContractAddress] = useQueryState<string>(
    "address",
    parseAsString.withDefault("")
  );
  const [chainId, setChainId] = useQueryState<number>(
    "chainId",
    parseAsInteger.withDefault(1)
  );
  const [selectedNetworkOption, setSelectedNetworkOption] =
    useState<SelectedOptionState>(networkOptions[networkOptionsIndex]);

  const [fromTxInput, setFromTxInput] = useQueryState<string>(
    "tx",
    parseAsString.withDefault("")
  );
  const [txShowSelectNetwork, setTxShowSelectNetwork] = useState(false);

  useEffect(() => {
    if (calldataFromURL && addressFromURL) {
      setSelectedTabIndex(2);
      decode({
        _address: addressFromURL,
        _chainId:
          chainIdFromURL === null ? undefined : parseInt(chainIdFromURL),
      });
    } else if (calldataFromURL) {
      decode({});
    } else if (txFromURL) {
      setSelectedTabIndex(3);
      decodeFromTx(
        txFromURL,
        chainIdFromURL === null ? undefined : parseInt(chainIdFromURL)
      );
    }
  }, []);

  useUpdateEffect(() => {
    if (selectedTabIndex === 0) {
      setContractAddress(null);
      setChainId(null);
      setFromTxInput(null);
    } else if (selectedTabIndex === 1) {
      setContractAddress(null);
      setChainId(null);
      setFromTxInput(null);
    } else if (selectedTabIndex === 2) {
      setFromTxInput(null);
    } else if (selectedTabIndex === 3) {
      setCalldata(null);
      setContractAddress(null);
    }
  }, [selectedTabIndex]);

  useEffect(() => {
    if (selectedTabIndex === 2) {
      setChainId(parseInt(selectedNetworkOption!.value.toString()));
    } else if (selectedTabIndex === 3) {
      if (txShowSelectNetwork) {
        setChainId(parseInt(selectedNetworkOption!.value.toString()));
      } else {
        setChainId(null);
      }
    } else if (!abi) {
      setChainId(null);
    }
  }, [txShowSelectNetwork, selectedNetworkOption, selectedTabIndex]);

  // not using useEffect because else it loads the page with selectedTabIndex = 0 as default, and removes the address & chainId
  useUpdateEffect(() => {
    if (pasted && selectedTabIndex === 0) {
      decode({});
      setPasted(false);
    }

    // remove from url params if calldata updated
    if (selectedTabIndex === 0 || selectedTabIndex === 1) {
      setContractAddress(null);
      setChainId(null);
    }
  }, [calldata]);

  useEffect(() => {
    document.title = `${
      result ? `${result.functionName} - ` : ""
    }Universal Calldata Decoder | ETH.sh`;
  }, [result]);

  const decode = async ({
    _calldata,
    _address,
    _chainId,
    _abi,
  }: {
    _calldata?: string;
    _address?: string;
    _chainId?: number;
    _abi?: any;
  }) => {
    const __calldata = _calldata || calldata;

    setIsLoading(true);
    console.log("DECODING...");
    try {
      const res = await decodeRecursive({
        calldata: startHexWith0x(__calldata),
        address: _address,
        chainId: _chainId,
        abi: _abi,
      });
      console.log({ DECODED_RESULT: res });
      setResult(res);

      if (res !== null) {
        toast({
          title: "Successfully Decoded",
          status: "success",
          isClosable: true,
          duration: 1000,
        });
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
      setIsLoading(false);
    }
  };

  const decodeFromTx = async (_fromTxInput?: string, _chainId?: number) => {
    setIsLoading(true);

    const __fromTxInput = _fromTxInput || fromTxInput;

    console.log({ __fromTxInput, _chainId, selectedNetworkOption });

    let chain: Chain =
      chainIdToChain[
        _chainId ?? parseInt(selectedNetworkOption!.value.toString())
      ];
    try {
      let txHash: string;
      if (/^0x([A-Fa-f0-9]{64})$/.test(__fromTxInput)) {
        txHash = __fromTxInput;

        if (!txShowSelectNetwork) {
          // if tx hash is provided, but chainId is not, then show select network
          setTxShowSelectNetwork(true);

          // if chainId not provided (from URL)
          if (!_chainId) {
            setIsLoading(false);
            return;
          }
        }
      } else {
        txHash = __fromTxInput.split("/").pop()!;

        const chainKey = Object.keys(c).filter((chainKey) => {
          const chain = c[chainKey as keyof typeof c] as Chain;

          // using "null" instead of "" because __fromTxInput.split("/") contains ""
          let explorerDomainDefault = "null";
          let explorerDomainEtherscan = "null";
          if (chain.blockExplorers) {
            explorerDomainDefault = chain.blockExplorers.default.url
              .split("//")
              .pop()!;

            if (chain.blockExplorers.etherscan) {
              explorerDomainEtherscan = chain.blockExplorers.etherscan.url
                .split("//")
                .pop()!;
            }
          }

          return (
            __fromTxInput
              .split("/")
              .filter(
                (urlPart) =>
                  urlPart.toLowerCase() ===
                    explorerDomainDefault.toLowerCase() ||
                  urlPart.toLowerCase() ===
                    explorerDomainEtherscan.toLowerCase()
              ).length > 0
          );
        })[0];
        chain = c[chainKey as keyof typeof c];
      }

      const publicClient = createPublicClient({
        chain,
        transport: http(),
      });
      const transaction = await publicClient.getTransaction({
        hash: txHash as Hex,
      });
      decode({
        _calldata: transaction.input,
        _address: transaction.to!,
        _chainId: chain.id,
      });
    } catch {
      setIsLoading(false);
      toast({
        title: "Can't fetch transaction",
        status: "error",
        isClosable: true,
        duration: 4000,
      });
    }
  };

  const FromABIBody = () => {
    const handleAbiChange = (value: string | undefined) => {
      const newValue = value || "";

      // Try to prettify if it's valid JSON
      try {
        const parsed = JSON.parse(newValue);
        const prettified = JSON.stringify(parsed, null, 2);
        // Only update if the prettified version is different
        if (prettified !== newValue) {
          setAbi(prettified);
          return;
        }
      } catch (e) {
        // Not valid JSON or already formatted, just set as is
      }

      setAbi(newValue);
    };

    return (
      <Tr>
        <Td colSpan={2}>
          <Center>
            <Center width={"100%"}>
              <FormControl>
                <FormLabel>Input ABI</FormLabel>
                <Editor
                  theme="vs-dark"
                  defaultLanguage="json"
                  value={abi}
                  onChange={handleAbiChange}
                  height={"250px"}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                  }}
                />
              </FormControl>
            </Center>
          </Center>
        </Td>
      </Tr>
    );
  };

  const FromAddressBody = () => {
    const { isOpen, onToggle } = useDisclosure();

    return (
      <>
        <Tr>
          <Label>
            <Box>Contract Address</Box>
            <Box fontSize={"xs"} opacity={"0.6"}>
              (accepts <b>eth:0xabc123...</b>)
            </Box>
          </Label>
          <Td>
            <InputField
              placeholder="Address"
              value={contractAddress}
              onChange={(e) => {
                const input = e.target.value;
                const res = resolveERC3770Address(input);
                setContractAddress(res.address);
                if (res.chainId) {
                  const _networkIndex = networkOptions.findIndex(
                    (option) => option.value === res.chainId
                  );
                  setSelectedNetworkOption(networkOptions[_networkIndex]);
                }
              }}
            />
          </Td>
        </Tr>
        <Tr>
          <Label>Chain</Label>
          <Td>
            <DarkSelect
              boxProps={{
                w: "100%",
              }}
              selectedOption={selectedNetworkOption}
              setSelectedOption={setSelectedNetworkOption}
              options={networkOptions}
            />
          </Td>
        </Tr>
        {abi && (
          <Tr>
            <Td colSpan={2}>
              <Center>
                <Center maxW={"40rem"}>
                  <FormControl>
                    <HStack mb={isOpen ? "0.5rem" : ""}>
                      <HStack
                        p={2}
                        minW="20rem"
                        maxW="37rem"
                        bg={"blackAlpha.400"}
                        cursor={"pointer"}
                        onClick={onToggle}
                        rounded={"lg"}
                      >
                        <Box>ABI</Box>
                        <Spacer />
                        <Text fontSize={"xl"} fontWeight={"bold"}>
                          {isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
                        </Text>
                      </HStack>

                      <Center>
                        <CopyToClipboard textToCopy={abi} />
                      </Center>
                    </HStack>
                    <Collapse in={isOpen} animateOpacity>
                      <Editor
                        theme="vs-dark"
                        defaultLanguage="json"
                        value={abi}
                        onChange={(value) => setAbi(value || "")}
                        height={"250px"}
                        options={{
                          readOnly: true,
                          minimap: { enabled: false },
                          fontSize: 14,
                          scrollBeyondLastLine: false,
                          automaticLayout: true,
                        }}
                      />
                    </Collapse>
                  </FormControl>
                </Center>
              </Center>
            </Td>
          </Tr>
        )}
      </>
    );
  };

  const FromTxBody = () => {
    return (
      <>
        <Tr>
          <Td colSpan={2}>
            <Center>
              <Box w="100%" maxW="30rem">
                <HStack>
                  <InputField
                    placeholder="etherscan link / tx hash"
                    value={fromTxInput}
                    onChange={(e) => setFromTxInput(e.target.value)}
                    onPaste={(e) => {
                      e.preventDefault();
                      setPasted(true);
                      const _fromTxInput = e.clipboardData.getData("text");
                      setFromTxInput(_fromTxInput);
                      decodeFromTx(_fromTxInput);
                    }}
                  />
                  {fromTxInput.includes("http") ? (
                    <Link
                      href={fromTxInput}
                      title="View on explorer"
                      isExternal
                    >
                      <Button size={"sm"}>
                        <HStack>
                          <ExternalLinkIcon />
                        </HStack>
                      </Button>
                    </Link>
                  ) : null}
                </HStack>
              </Box>
            </Center>
          </Td>
        </Tr>
        {txShowSelectNetwork && (
          <Tr>
            <Label>Chain</Label>
            <Td>
              <DarkSelect
                boxProps={{
                  w: "100%",
                }}
                selectedOption={selectedNetworkOption}
                setSelectedOption={setSelectedNetworkOption}
                options={networkOptions}
              />
            </Td>
          </Tr>
        )}
      </>
    );
  };

  const renderTabsBody = () => {
    switch (selectedTabIndex) {
      case 0:
        return null;
      case 1:
        return <FromABIBody />;
      case 2:
        return <FromAddressBody />;
      case 3:
        return <FromTxBody />;
      default:
        return null;
    }
  };

  return (
    <Box p={10} minH={"30rem"} w="full" minW="40rem">
      <Heading color={"custom.pale"} fontSize={"4xl"} textAlign={"center"}>
        {headerText ?? "Universal Calldata Decoder"}
      </Heading>
      <TabsSelector
        tabs={["No ABI", "from ABI", "from Address", "from Tx"]}
        selectedTabIndex={selectedTabIndex}
        setSelectedTabIndex={setSelectedTabIndex}
      />
      <Table mt={"1rem"} variant={"unstyled"}>
        <Tbody>
          {selectedTabIndex !== 3 && (
            <Tr>
              <Label>Calldata</Label>
              <Td>
                <InputField
                  autoFocus
                  placeholder="calldata"
                  value={calldata}
                  onChange={(e) => setCalldata(e.target.value)}
                  onPaste={(e) => {
                    e.preventDefault();
                    setPasted(true);
                    setCalldata(e.clipboardData.getData("text"));
                  }}
                />
              </Td>
            </Tr>
          )}
          {renderTabsBody()}
          <Tr>
            <Td colSpan={2}>
              <Container mt={0}>
                <Center>
                  <DarkButton
                    onClick={() => {
                      switch (selectedTabIndex) {
                        case 0:
                          return decode({});
                        case 1:
                          return decode({ _abi: abi });
                        case 2:
                          return decode({});
                        case 3:
                          return decodeFromTx();
                      }
                    }}
                    isLoading={isLoading}
                  >
                    Decode
                  </DarkButton>
                </Center>
              </Container>
            </Td>
          </Tr>
        </Tbody>
      </Table>
      {result && (
        <Box minW={"80%"}>
          {result.functionName && result.functionName !== "__abi_decoded__" ? (
            <HStack>
              <Box>
                <Box fontSize={"xs"} color={"whiteAlpha.600"}>
                  function
                </Box>
                <Box>{result.functionName}</Box>
              </Box>
              <Spacer />
              <CopyToClipboard
                textToCopy={JSON.stringify(
                  {
                    function: result.signature,
                    params: JSON.parse(stringify(result.rawArgs)),
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
            minW="40rem"
            bg={"whiteAlpha.50"}
            rounded={"lg"}
          >
            {result.args.map((arg, i: number) => {
              return renderParams(i, arg, chainId);
            })}
          </Stack>
        </Box>
      )}
    </Box>
  );
}

export const CalldataDecoderPage = ({
  headerText,
}: {
  headerText?: string;
}) => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CalldataDecoderPageContent headerText={headerText} />
    </Suspense>
  );
};
