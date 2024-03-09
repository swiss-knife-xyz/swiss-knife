"use client";

import { useSearchParams } from "next/navigation";
import React, { useState, useEffect } from "react";
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
} from "@chakra-ui/react";
import { ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";
import {
  parseAsInteger,
  parseAsString,
  useQueryState,
} from "next-usequerystate";
import {
  Interface,
  ParamType,
  TransactionDescription,
  AbiCoder,
  Result,
  FunctionFragment,
} from "ethers";
import { createPublicClient, http, Hex, Chain, stringify } from "viem";
import { guessAbiEncodedData } from "@openchainxyz/abi-guesser";
import axios from "axios";
import { SelectedOptionState } from "@/types";
import { fetchFunctionInterface } from "@/utils";
import networkInfo from "@/data/networkInfo";
import { c, chainIdToChain } from "@/data/common";

import { InputField } from "@/components/InputField";
import { Label } from "@/components/Label";
import { renderParams } from "@/components/renderParams";
import { DarkButton } from "@/components/DarkButton";
import TabsSelector from "@/components/Tabs/TabsSelector";
import JsonTextArea from "@/components/JsonTextArea";
import { DarkSelect } from "@/components/DarkSelect";
import { CopyToClipboard } from "@/components/CopyToClipboard";

const networkOptions: { label: string; value: number }[] = networkInfo.map(
  (n, i) => ({
    label: n.name,
    value: i, // index in the networkInfo array
  })
);

const CalldataDecoder = () => {
  const toast = useToast();
  const searchParams = useSearchParams();

  // get data from URL
  const calldataFromURL = searchParams.get("calldata");
  const addressFromURL = searchParams.get("address");
  const chainIdFromURL = searchParams.get("chainId");
  const txFromURL = searchParams.get("tx");

  let networkIndexFromURL;
  if (chainIdFromURL) {
    for (var i = 0; i < networkInfo.length; i++) {
      if (networkInfo[i].chainID === parseInt(chainIdFromURL)) {
        networkIndexFromURL = i;
        break;
      }
    }
  }

  const [calldata, setCalldata] = useQueryState<string>(
    "calldata",
    parseAsString.withDefault("")
  );
  // can be function calldata or abi.encode bytes
  const [fnDescription, setFnDescription] = useState<TransactionDescription>();
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
    useState<SelectedOptionState>(networkOptions[networkIndexFromURL ?? 0]);

  const [fromTxInput, setFromTxInput] = useQueryState<string>(
    "tx",
    parseAsString.withDefault("")
  );
  const [txShowSelectNetwork, setTxShowSelectNetwork] = useState(false);

  useEffect(() => {
    if (calldataFromURL && addressFromURL) {
      setSelectedTabIndex(2);
      decodeWithAddress();
    } else if (calldataFromURL) {
      decodeWithSelector();
    } else if (txFromURL) {
      setSelectedTabIndex(3);
      decodeFromTx(
        txFromURL,
        chainIdFromURL === null ? undefined : parseInt(chainIdFromURL)
      );
    }
  }, []);

  useEffect(() => {
    if (selectedTabIndex === 3) {
      setCalldata(null);
      setContractAddress(null);
    }
  }, [selectedTabIndex]);

  useEffect(() => {
    if (selectedTabIndex === 2) {
      setChainId(
        networkInfo[parseInt(selectedNetworkOption!.value.toString())].chainID
      );
    } else if (selectedTabIndex === 3) {
      if (txShowSelectNetwork) {
        setChainId(
          networkInfo[parseInt(selectedNetworkOption!.value.toString())].chainID
        );
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
      decodeWithSelector();
      setPasted(false);
    }

    // remove from url params if calldata updated
    if (selectedTabIndex === 0 || selectedTabIndex === 1) {
      setContractAddress(null);
      setChainId(null);
    }
  }, [calldata]);

  const _getAllPossibleDecoded = (
    functionsArr: string[],
    _calldata?: string
  ) => {
    const __calldata = _calldata || calldata;

    let decodedSuccess = false;
    for (var i = 0; i < functionsArr.length; i++) {
      const fn = functionsArr[i];
      const _abi = [`function ${fn}`];

      try {
        decodedSuccess = _decodeWithABI(_abi, __calldata);
      } catch {
        continue;
      }
    }

    if (decodedSuccess) {
      toast({
        title: "Successfully Decoded",
        status: "success",
        isClosable: true,
        duration: 1000,
      });
    } else {
      toast({
        title: "Can't Decode Calldata",
        status: "error",
        isClosable: true,
        duration: 4000,
      });
    }
  };

  const fetchContractABI = async (
    _contractAddress?: string,
    _chainId?: number
  ): Promise<any> => {
    const __contractAddress = _contractAddress || contractAddress;
    if (!__contractAddress) return {};

    const __chainId =
      _chainId ||
      networkInfo[
        selectedNetworkOption?.value
          ? parseInt(selectedNetworkOption?.value.toString())
          : 0
      ].chainID;
    try {
      const response = await axios.get(
        `https://anyabi.xyz/api/get-abi/${__chainId}/${__contractAddress}`
      );
      return JSON.stringify(response.data.abi);
    } catch {
      toast({
        title: "Can't fetch ABI from Address",
        status: "error",
        isClosable: true,
        duration: 1000,
      });
      return {};
    }
  };

  const decodeWithSelector = async (_calldata?: string) => {
    const __calldata = _calldata || calldata;

    if (!__calldata) return;
    setIsLoading(true);

    const selector = __calldata.slice(0, 10);
    try {
      const results = await fetchFunctionInterface(selector);

      if (results.length > 0) {
        // can have multiple entries with the same selector
        _getAllPossibleDecoded(results, _calldata);
      } else {
        toast({
          title: "Can't fetch function interface",
          status: "error",
          isClosable: true,
          duration: 1000,
        });
      }

      setIsLoading(false);
    } catch {
      try {
        // try decoding the `abi.encode` custom bytes
        const paramTypes: ParamType[] = guessAbiEncodedData(__calldata)!;
        console.log({ paramTypes });

        const abiCoder = AbiCoder.defaultAbiCoder();
        const decoded = abiCoder.decode(paramTypes, __calldata);

        console.log({ decoded });

        const _fnDescription: TransactionDescription = {
          name: "",
          args: decoded,
          signature: "abi.encode",
          selector: "",
          value: BigInt(0),
          fragment: FunctionFragment.from({
            inputs: paramTypes,
            name: "test",
            outputs: [],
            type: "function",
            stateMutability: "nonpayable",
          }),
        };

        setFnDescription(_fnDescription);

        if (!decoded || decoded.length === 0) {
          toast({
            title: "Can't Decode Calldata",
            status: "error",
            isClosable: true,
            duration: 1000,
          });
        }
      } catch (e) {
        console.error(e);

        toast({
          title: "Can't Decode Calldata",
          status: "error",
          isClosable: true,
          duration: 1000,
        });
      }

      setIsLoading(false);
    }
  };

  const _decodeWithABI = (_abi: any, _calldata?: string) => {
    let decodedSuccess = false;

    const iface = new Interface(_abi);
    if (!_calldata) return decodedSuccess;

    let res = iface.parseTransaction({ data: _calldata });
    if (res === null) {
      return decodedSuccess;
    }

    console.log({ fnDescription: res });
    setFnDescription(res);

    decodedSuccess = true;
    return decodedSuccess;
  };

  const decodeWithABI = async () => {
    setIsLoading(true);
    _decodeWithABI(abi, calldata);
    setIsLoading(false);
  };

  const decodeWithAddress = async (
    _address?: string,
    _calldata?: string,
    _chainId?: number
  ) => {
    const __calldata = _calldata || calldata;
    if (!__calldata) return;

    setIsLoading(true);

    try {
      const fetchedABI = await fetchContractABI(_address, _chainId);
      setAbi(JSON.stringify(JSON.parse(fetchedABI), undefined, 2));

      toast({
        title: "ABI Fetched from Address",
        status: "success",
        isClosable: true,
        duration: 1000,
      });

      const decodeSuccess = _decodeWithABI(fetchedABI, __calldata);
      if (!decodeSuccess) {
        decodeWithSelector(__calldata);
      }

      setIsLoading(false);
    } catch {
      decodeWithSelector(__calldata);
    }
  };

  const decodeFromTx = async (_fromTxInput?: string, _chainId?: number) => {
    setIsLoading(true);

    const __fromTxInput = _fromTxInput || fromTxInput;

    let chain: Chain =
      chainIdToChain[
        _chainId ??
          networkInfo[parseInt(selectedNetworkOption!.value.toString())].chainID
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
      decodeWithAddress(transaction.to!, transaction.input, chain.id);
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
    return (
      <Tr>
        <Td colSpan={2}>
          <Center>
            <Center w={"20rem"}>
              <FormControl>
                <FormLabel>Input ABI</FormLabel>
                <JsonTextArea
                  value={abi}
                  setValue={setAbi}
                  placeholder="JSON ABI"
                  ariaLabel="json abi"
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
          <Label>Contract Address</Label>
          <Td>
            <InputField
              placeholder="Address"
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
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
                <Center w={"40rem"}>
                  <FormControl>
                    <HStack mb={isOpen ? "0.5rem" : ""}>
                      <HStack
                        p={2}
                        w="37rem"
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
                      <JsonTextArea
                        value={abi}
                        setValue={setAbi}
                        placeholder="JSON ABI"
                        ariaLabel="json abi"
                        readOnly
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
              <Box w="100%">
                <InputField
                  w="100%"
                  maxW={"30rem"}
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
    <>
      <Heading color={"custom.pale"}>Calldata Decoder</Heading>
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
                          return decodeWithSelector();
                        case 1:
                          return decodeWithABI();
                        case 2:
                          return decodeWithAddress();
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
      {fnDescription && (
        <Box minW={"80%"}>
          {fnDescription.name ? (
            <HStack>
              <Box>
                <Box fontSize={"xs"} color={"whiteAlpha.600"}>
                  function
                </Box>
                <Box>{fnDescription.name}</Box>
              </Box>
              <Spacer />
              <CopyToClipboard
                textToCopy={JSON.stringify(
                  {
                    function: fnDescription.signature,
                    params: JSON.parse(stringify(fnDescription.args)),
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
            border="1px"
            borderStyle={"dashed"}
            borderColor={"whiteAlpha.500"}
            rounded={"lg"}
          >
            {fnDescription.fragment.inputs.map((input, i) => {
              const value = fnDescription.args[i];
              return renderParams(i, input, value);
            })}
          </Stack>
        </Box>
      )}
    </>
  );
};

export default CalldataDecoder;
