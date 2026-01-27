import React, {
  useEffect,
  useState,
  ReactNode,
  useCallback,
  useRef,
} from "react";
import {
  Box,
  Button,
  Center,
  chakra,
  HStack,
  IconButton,
  Link,
  List,
  ListItem,
  Text,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Skeleton,
  Spinner,
  Tooltip,
  Input,
} from "@chakra-ui/react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ExternalLinkIcon,
  InfoIcon,
  RepeatIcon,
  SettingsIcon,
} from "@chakra-ui/icons";
import { useWalletClient, useAccount } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { FunctionFragment, JsonFragment, JsonFragmentType } from "ethers";
import {
  ContractFunctionExecutionError,
  PublicClient,
  Hex,
  encodeFunctionData,
  Abi,
  toHex,
  zeroAddress,
} from "viem";
import {
  AddressInput,
  InputInfo,
  IntInput,
} from "@/components/fnParams/inputs";
import { ExtendedJsonFragmentType, HighlightedContent } from "@/types";
import { renderInputFields, renderParamTypes } from "./Renderer";
import { generateTenderlyUrl, slicedText } from "@/utils";
import { getTransactionError, getContractError } from "viem/utils";
import { config } from "@/app/providers";
import { WriteButton } from "../WriteButton";
import axios from "axios";

interface ReadWriteFunctionProps {
  client: PublicClient;
  index: number;
  type: "read" | "write";
  func: Omit<JsonFragment, "name" | "outputs"> & {
    name: HighlightedContent;
    outputs?: readonly JsonFragmentType[];
    highlightedOutputs?: ExtendedJsonFragmentType[];
  };
  address: string;
  chainId: number;
  isAbiDecoded?: boolean;
  readAllCollapsed?: boolean;
}

const extractStringFromReactNode = (node: HighlightedContent): string => {
  if (typeof node === "string") {
    return node;
  } else if (Array.isArray(node)) {
    return node.map((item) => item.text).join("");
  }
  return "";
};

// only break the word after a ","
// useful for displaying the outputs of a function
const EnhancedFunctionOutput: React.FC<{
  highlightedOutputs?: ExtendedJsonFragmentType[];
}> = ({ highlightedOutputs }) => {
  const renderHighlightedText = (
    content: HighlightedContent
  ): React.ReactNode => {
    if (typeof content === "string") {
      return content;
    }

    return content.map((part, index) => (
      <span
        key={index}
        style={{
          backgroundColor: part.isHighlighted
            ? part.isCurrentResult
              ? "orange"
              : "yellow"
            : "transparent",
          color: part.isHighlighted ? "black" : "white",
        }}
      >
        {part.text}
      </span>
    ));
  };

  const processString = (str: string | React.ReactNode) => {
    if (typeof str !== "string") {
      return str;
    }

    return str.split(", ").map((part, index, array) => (
      <React.Fragment key={index}>
        {part}
        {index < array.length - 1 && (
          <span style={{ whiteSpace: "nowrap" }}>,&#8203;</span>
        )}
      </React.Fragment>
    ));
  };

  return (
    <Box
      ml={4}
      maxW="30rem"
      sx={{
        wordBreak: "break-word",
        whiteSpace: "pre-wrap",
      }}
    >
      {highlightedOutputs && highlightedOutputs.length > 1 && (
        <Box fontSize="sm" color="whiteAlpha.600">
          →&nbsp;(
          {highlightedOutputs.map((highlightedOutput, index) => (
            <React.Fragment key={index}>
              {index > 0 && <span>,&nbsp;</span>}
              {processString(
                highlightedOutput.type !== undefined
                  ? highlightedOutput.type
                  : ""
              )}
              {highlightedOutput.name && (
                <>
                  &nbsp;
                  {processString(renderHighlightedText(highlightedOutput.name))}
                </>
              )}
            </React.Fragment>
          ))}
          )
        </Box>
      )}
    </Box>
  );
};

export enum WriteButtonType {
  Write = "Write",
  CallAsViewFn = "Call as View Fn",
  SimulateOnTenderly = "Simulate on Tenderly",
}

export const ReadWriteFunction = ({
  client,
  index,
  type,
  func: __func,
  address,
  chainId,
  isAbiDecoded,
  readAllCollapsed,
}: ReadWriteFunctionProps) => {
  const { data: walletClient } = useWalletClient();
  const { address: userAddress, chain } = useAccount();

  const {
    name: __name,
    inputs,
    outputs: _outputs,
    payable,
    stateMutability,
    highlightedOutputs,
  } = __func;
  const functionName = extractStringFromReactNode(__name);

  const _func = React.useMemo(
    () =>
      ({ ...__func, name: functionName, type: "function" } as JsonFragment & {
        type: "function";
      }),
    [__func, functionName]
  );

  const outputs = _outputs
    ? _outputs
    : isAbiDecoded
    ? [
        {
          type: "calldata", // set output type as custom calldata
          name: "",
        },
      ]
    : [];

  let tenderlyForkIdCache: string | null = null;
  if (localStorage !== undefined) {
    tenderlyForkIdCache = localStorage.getItem("tenderlyForkId");
  }

  const [fnSelector, setFnSelector] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(
    readAllCollapsed !== undefined ? readAllCollapsed : false
  );
  const [payableETH, setPayableETH] = useState<string>("0");
  const [payableETHIsDisabled, setPayableETHIsDisabled] =
    useState<boolean>(false);
  const [inputsState, setInputsState] = useState<any>({});
  const [functionIsDisabled, setFunctionIsDisabled] = useState<any>({});
  const [writeButtonType, setWriteButtonType] = useState<WriteButtonType>(
    WriteButtonType.Write
  );
  const [settingsIsOpen, setSettingsIsOpen] = useState<boolean>(false);
  const [tenderlyForkId, setTenderlyForkId] = useState<string>(
    tenderlyForkIdCache ?? ""
  );
  const [settingsSenderAddr, setSettingsSenderAddr] = useState<string>("");

  const [res, setRes] = useState<any>(null);
  const [txIsTenderlySimulation, setTxIsTenderlySimulation] =
    useState<boolean>(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [confirmedTxHash, setConfirmedTxHash] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [enterPressed, setEnterPressed] = useState<boolean>(false);

  const updateInputState = useCallback((index: number, value: string) => {
    setInputsState((prev: any) => ({
      ...prev,
      [index]: value,
    }));
  }, []);

  const updateFunctionIsDisabled = useCallback(
    (index: number, value: boolean) => {
      setFunctionIsDisabled((prev: any) => ({
        ...prev,
        [index]: value,
      }));
    },
    []
  );

  const readFunction = useCallback(async () => {
    if (isError) {
      setIsError(false);
    }

    if (functionName) {
      setLoading(true);
      setRes(null);

      const abi = [_func] as unknown as Abi;
      const args = inputs?.map((input, i) => inputsState[i]);

      const maxRetries = 3;
      try {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            if (!isAbiDecoded) {
              const result = await client.readContract({
                address: address as Hex,
                abi,
                functionName,
                args,
              });
              setRes(result);
            } else {
              const result = await client.call({
                to: address as Hex,
                data: encodeFunctionData({
                  abi,
                  functionName,
                  args,
                }),
                value: BigInt(payableETH),
              });
              console.log({
                result,
                abi,
                functionName,
                args,
                outputs,
                isAbiDecoded,
              });
              setRes(result.data);
            }
            // Success - break out of retry loop
            break;
          } catch (e: any) {
            // Check if this is a 429 rate limit error and we can retry
            const is429 =
              e?.cause?.message?.includes("429") ||
              e?.message?.includes("429") ||
              e?.cause?.message?.includes("rate limit") ||
              e?.message?.includes("rate limit");

            if (is429 && attempt < maxRetries) {
              // Exponential backoff: 1s, 2s, 4s
              await new Promise((resolve) =>
                setTimeout(resolve, 1000 * Math.pow(2, attempt))
              );
              continue;
            }

            console.error(e);
            setIsError(true);
            setRes(null);

            if (e instanceof ContractFunctionExecutionError) {
              setErrorMsg(
                getContractError(e, {
                  docsPath: "",
                  address: address as Hex,
                  abi,
                  functionName,
                  args,
                }).shortMessage
              );
            } else {
              setErrorMsg("An unknown error occurred");
            }
            break;
          }
        }
      } finally {
        setLoading(false);
      }
    }
  }, [isError, functionName, client, address, _func, inputs, inputsState]);

  const writeFunction = useCallback(async () => {
    if (isError) {
      setIsError(false);
    }

    if (functionName && walletClient) {
      setLoading(true);
      setTxHash(null);
      setConfirmedTxHash(null);

      try {
        // encode calldata
        const calldata = await encodeFunctionData({
          abi: [_func] as const,
          functionName: functionName,
          args: inputs?.map((input, i) => inputsState[i]),
        });

        // send transaction to wallet
        const hash = await walletClient.sendTransaction({
          to: address as Hex,
          data: calldata,
          value: BigInt(payableETH),
        });

        setLoading(false);

        setTxIsTenderlySimulation(false);
        setTxHash(hash);

        await waitForTransactionReceipt(config, {
          hash,
        });

        setConfirmedTxHash(hash);
      } catch (e: any) {
        console.error(e);
        setIsError(true);

        setRes(null);

        setErrorMsg(
          getTransactionError(e, {
            account: walletClient.account,
            docsPath: "",
          }).shortMessage
        );
      } finally {
        setLoading(false);
      }
    }
  }, [
    isError,
    functionName,
    walletClient,
    address,
    _func,
    inputs,
    inputsState,
    payableETH,
  ]);

  const callAsReadFunction = useCallback(
    async (bypassSettingError: boolean = false) => {
      if (isError) {
        setIsError(false);
      }

      if (functionName) {
        setLoading(true);
        setRes(null);

        const abi = [_func] as unknown as Abi;
        const args = inputs?.map((input, i) => inputsState[i]);

        try {
          // TODO: add caller address in the settings modal
          if (!isAbiDecoded) {
            const result = await client.simulateContract({
              address: address as Hex,
              abi,
              functionName,
              args,
              value: BigInt(payableETH),
            });
            setRes(result.result);
          } else {
            const result = await client.call({
              to: address as Hex,
              data: encodeFunctionData({
                abi,
                functionName,
                args,
              }),
              value: BigInt(payableETH),
            });
            setRes(result.data);
          }
        } catch (e: any) {
          console.error(e);
          setRes(null);
          if (!bypassSettingError) {
            setIsError(true);
            if (e instanceof ContractFunctionExecutionError) {
              // extract the error message
              const errorMessage = e.cause?.message || e.message;
              setErrorMsg(
                getContractError(e, {
                  docsPath: "",
                  address: address as Hex,
                  abi,
                  functionName,
                  args,
                }).shortMessage
              );
            } else {
              setErrorMsg("An unknown error occurred");
            }
          }
        } finally {
          setLoading(false);
        }
      }
    },
    [
      isError,
      functionName,
      client,
      address,
      _func,
      inputs,
      inputsState,
      payableETH,
      isAbiDecoded,
    ]
  );

  const simulateOnTenderly = useCallback(async () => {
    if (isError) {
      setIsError(false);
    }

    setLoading(true);

    const abi = [_func] as unknown as Abi;
    const args = inputs?.map((input, i) => inputsState[i]);

    const tenderlyUrl = generateTenderlyUrl(
      {
        from:
          settingsSenderAddr.length > 0
            ? settingsSenderAddr
            : userAddress ?? zeroAddress,
        to: address,
        value: payableETH,
        data: encodeFunctionData({
          abi,
          functionName,
          args,
        }),
      },
      chainId
    );
    window.open(tenderlyUrl, "_blank");

    setLoading(false);
  }, [
    isError,
    setLoading,
    _func,
    inputs,
    inputsState,
    settingsSenderAddr,
    userAddress,
    address,
    payableETH,
    functionName,
    chainId,
  ]);

  const simulateOnTenderlyFork = useCallback(async () => {
    if (isError) {
      setIsError(false);
    }

    if (tenderlyForkId.trim().length === 0) {
      // open the settings
      setSettingsIsOpen(true);
    } else {
      setLoading(true);
      setTxHash(null);
      setConfirmedTxHash(null);

      const abi = [_func] as unknown as Abi;
      const args = inputs?.map((input, i) => inputsState[i]);

      // send transaction to tenderly fork
      try {
        const { data: res } = await axios.post(
          "https://rpc.tenderly.co/fork/" + tenderlyForkId.trim(),
          {
            jsonrpc: "2.0",
            // current unix timestamp as id
            id: Math.floor(Date.now() / 1000),
            method: "eth_sendTransaction",
            params: [
              {
                from:
                  settingsSenderAddr.length > 0
                    ? settingsSenderAddr
                    : userAddress,
                to: address,
                value: toHex(payableETH),
                data: encodeFunctionData({
                  abi,
                  functionName,
                  args,
                }),
              },
            ],
          }
        );
        console.log({ res });

        if (res.error) {
          throw new Error(res.error);
        }

        setLoading(false);

        setTxIsTenderlySimulation(true);
        setTxHash(res.result);
        setConfirmedTxHash(res.result);
      } catch (e: any) {
        console.error(e);
        setIsError(true);
        setRes(null);

        if (e.message) {
          setErrorMsg(e.message);
        } else {
          setErrorMsg("Error simulating on Tenderly");
        }
      } finally {
        setLoading(false);
      }
    }
  }, [
    isError,
    functionName,
    walletClient,
    address,
    _func,
    inputs,
    inputsState,
    payableETH,
    tenderlyForkId,
  ]);

  useEffect(() => {
    try {
      setFnSelector(FunctionFragment.from(_func).selector);
    } catch (e) {
      console.error(e);
    }
  }, [_func]);

  useEffect(() => {
    if (enterPressed) {
      readFunction();
      setEnterPressed(false);
    }
  }, [inputsState, enterPressed, readFunction]);

  useEffect(() => {
    // if there are no inputs, then auto fetch the value
    // stagger calls by 150ms per function to avoid RPC rate limits (429)
    if (type === "read" && (!inputs || (inputs && inputs.length === 0))) {
      const delay = index * 150;
      const timer = setTimeout(() => {
        readFunction();
      }, delay);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    setIsError(false);
  }, [inputsState]);

  useEffect(() => {
    setIsCollapsed(readAllCollapsed !== undefined ? readAllCollapsed : false);
  }, [readAllCollapsed]);

  useEffect(() => {
    // uncollapse if result fetched
    if (res) {
      setIsCollapsed(false);
    }
  }, [res]);

  // keep local storage in sync for tenderly fork id
  useEffect(() => {
    localStorage.setItem("tenderlyForkId", tenderlyForkId);
  }, [tenderlyForkId]);

  // // open settings modal if tenderly fork id is not set
  // useEffect(() => {
  //   if (
  //     writeButtonType === WriteButtonType.SimulateOnTenderly &&
  //     tenderlyForkId.length === 0
  //   ) {
  //     setSettingsIsOpen(true);
  //   }
  // }, [writeButtonType]);

  const renderHighlightedText = (content: HighlightedContent): ReactNode => {
    if (typeof content === "string") {
      return content;
    }

    return content.map((part, index) => (
      <span
        key={index}
        style={{
          backgroundColor: part.isHighlighted
            ? part.isCurrentResult
              ? "orange"
              : "yellow"
            : "transparent",
          color: part.isHighlighted ? "black" : "inherit",
        }}
      >
        {part.text}
      </span>
    ));
  };

  const renderRes = () => {
    if (isAbiDecoded ? res !== null && res !== undefined : outputs) {
      return (
        <Box>
          {outputs.map((output, i) => (
            <Box
              key={i}
              mt={2}
              bg={outputs.length > 1 ? "whiteAlpha.200" : undefined}
              p={outputs.length > 1 ? 4 : 0}
              rounded={"md"}
            >
              {outputs.length > 1 && (
                <InputInfo
                  input={{
                    name: output.name
                      ? extractStringFromReactNode(output.name)
                      : undefined,
                    type: output.type,
                  }}
                />
              )}
              {output.type &&
                renderParamTypes({
                  chainId,
                  type: output.type,
                  value:
                    outputs.length > 1
                      ? res !== null && res !== undefined
                        ? res[i]
                        : null
                      : res,
                })}
            </Box>
          ))}
        </Box>
      );
    } else if (
      isAbiDecoded &&
      loading &&
      writeButtonType === WriteButtonType.CallAsViewFn
    ) {
      return <Skeleton mt={2} h={"5rem"} rounded={"lg"} />;
    } else {
      return <></>;
    }
  };

  return (
    <Box
      mb={2}
      p={2}
      pb={!inputs || inputs.length === 0 ? undefined : 4}
      border="2px solid"
      borderColor="whiteAlpha.200"
      rounded="md"
      bg={!inputs || inputs.length === 0 ? "whiteAlpha.50" : undefined}
    >
      {/* Function name and refetch button */}
      <HStack mb={!fnSelector ? 2 : undefined}>
        <HStack
          flexGrow={1}
          onClick={() => setIsCollapsed(!isCollapsed)}
          cursor={"pointer"}
        >
          <HStack>
            <Box fontSize={"2xl"}>
              {isCollapsed ? <ChevronUpIcon /> : <ChevronDownIcon />}
            </Box>
            <HStack alignItems={"flex-end"}>
              <Box fontSize={"md"} fontWeight={"normal"}>
                {index}.
              </Box>
              <Box fontWeight={"bold"}>
                {renderHighlightedText(__func.name)}
              </Box>
            </HStack>
          </HStack>{" "}
          {/* If single output, then show inline */}
          {__func.outputs && __func.outputs.length === 1 && (
            <Box fontSize={"sm"} color="whiteAlpha.600">
              (→&nbsp;{__func.outputs[0].type})
            </Box>
          )}
        </HStack>
        {/* Read/Write Buttons */}
        {!loading && type === "read" && (
          <Button
            ml={4}
            onClick={readFunction}
            isDisabled={
              inputs && inputs.some((_, i) => functionIsDisabled[i] === true)
            }
            size={"sm"}
            title={res !== null ? "refetch" : "fetch"}
            colorScheme={!isError ? "blue" : "red"}
          >
            {res !== null ? <RepeatIcon /> : "Read"}
          </Button>
        )}
        {type === "write" && (
          <WriteButton
            isError={isError}
            userAddress={userAddress}
            writeButtonType={writeButtonType}
            chain={chain}
            chainId={chainId}
            writeFunction={writeFunction}
            callAsReadFunction={callAsReadFunction}
            simulateOnTenderly={simulateOnTenderly}
            isDisabled={
              (inputs &&
                inputs.some((_, i) => functionIsDisabled[i] === true)) ||
              payableETHIsDisabled
            }
            loading={loading}
            setWriteButtonType={setWriteButtonType}
            setIsError={setIsError}
          />
        )}
        {type === "write" &&
          writeButtonType === WriteButtonType.SimulateOnTenderly && (
            <Popover
              placement="bottom-start"
              isOpen={settingsIsOpen}
              onOpen={() => setSettingsIsOpen(true)}
              onClose={() => setSettingsIsOpen(false)}
            >
              <PopoverTrigger>
                <Box>
                  <Button size="sm">
                    <SettingsIcon
                      transition="900ms rotate ease-in-out"
                      transform={
                        settingsIsOpen ? "rotate(33deg)" : "rotate(0deg)"
                      }
                    />
                  </Button>
                </Box>
              </PopoverTrigger>
              <PopoverContent
                minW="30rem"
                border={"1px solid"}
                borderColor={"whiteAlpha.400"}
                bg="bg.900"
                boxShadow="xl"
                rounded="xl"
                overflowY="auto"
              >
                <Box px="1rem" py="1rem">
                  {/* <HStack>
                    <Text>Tenderly Fork Id:</Text>
                    <Tooltip
                      label={
                        <>
                          <Text>
                            Simulate sending transactions on forked node.
                          </Text>
                          <chakra.hr bg="gray.400" />
                          <List>
                            <ListItem>
                              Create a fork on Tenderly and grab it&apos;s id
                              from the URL.
                            </ListItem>
                          </List>
                        </>
                      }
                      hasArrow
                      placement="top"
                    >
                      <InfoIcon />
                    </Tooltip>
                  </HStack>
                  <Input
                    mt="0.5rem"
                    aria-label="fork-rpc"
                    placeholder="xxxx-xxxx-xxxx-xxxx"
                    autoComplete="off"
                    value={tenderlyForkId}
                    onChange={(e) => {
                      setTenderlyForkId(e.target.value);
                    }}
                  /> */}
                  <Box mt={4}>
                    <AddressInput
                      input={{
                        name: "(optional) Sender",
                        type: "address",
                      }}
                      value={settingsSenderAddr}
                      chainId={chainId}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setSettingsSenderAddr(e.target.value);
                      }}
                      onKeyDown={(
                        e: React.KeyboardEvent<HTMLInputElement>
                      ) => {}}
                      isInvalid={false}
                      setFunctionIsDisabled={() => {}}
                      hideTags
                    />
                  </Box>
                </Box>
              </PopoverContent>
            </Popover>
          )}
      </HStack>
      {/* Function Selector */}
      {fnSelector && (
        <Box ml={12} mb={2} fontSize={"sm"} color="whiteAlpha.600">
          [selector: {fnSelector}]
        </Box>
      )}
      {/* If multiple outputs */}
      {highlightedOutputs && highlightedOutputs.length > 1 && (
        <Box ml={4} maxW="30rem" mb={4}>
          <EnhancedFunctionOutput highlightedOutputs={highlightedOutputs} />
        </Box>
      )}

      {/* Transaction status for Write */}
      {txHash && !confirmedTxHash && (
        <Box mb={4} ml={4}>
          <HStack p={4} bg="blue.500" rounded={"md"}>
            <HStack>
              <Spinner />
              <Box fontWeight={"bold"}>Transaction initiated:</Box>
            </HStack>
            <Box>
              <Link
                href={`${chain?.blockExplorers?.default.url}/tx/${txHash}`}
                isExternal
              >
                <HStack>
                  <Box>{slicedText(txHash, 10)}</Box>
                  <ExternalLinkIcon />
                </HStack>
              </Link>
            </Box>
          </HStack>
        </Box>
      )}
      {confirmedTxHash && (
        <Box mt={4} ml={4}>
          <Box p={4} bg="green.500" rounded={"md"}>
            <HStack>
              <Box fontWeight={"bold"}>✅ Transaction confirmed:</Box>
              <Box>
                {txIsTenderlySimulation ? (
                  <Box>{slicedText(confirmedTxHash, 10)}</Box>
                ) : (
                  <Link
                    href={`${chain?.blockExplorers?.default.url}/tx/${confirmedTxHash}`}
                    isExternal
                  >
                    <HStack>
                      <Box>{slicedText(confirmedTxHash, 10)}</Box>
                      <ExternalLinkIcon />
                    </HStack>
                  </Link>
                )}
              </Box>
            </HStack>
            {txIsTenderlySimulation && (
              <Center fontSize={"sm"}>(view on your tenderly dashboard)</Center>
            )}
          </Box>
        </Box>
      )}
      {isError && errorMsg && type === "write" && (
        <Center mt={2} p={4} color="red.300" maxW="40rem">
          {errorMsg}
        </Center>
      )}

      <Box display={isCollapsed ? "none" : undefined}>
        {/* Input fields */}
        {(payable || stateMutability === "payable") && (
          <Box ml={4} p={4} bg="whiteAlpha.100" rounded={"lg"}>
            <IntInput
              input={{
                name: "Payable ETH",
                type: "uint256",
              }}
              defaultEthFormatIndex={1}
              value={payableETH}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setPayableETH(e.target.value);
              }}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {}}
              isInvalid={
                isError &&
                (payableETH === undefined ||
                  payableETH === null ||
                  payableETH.toString().trim().length === 0)
              }
              functionIsError={isError}
              setFunctionIsDisabled={setPayableETHIsDisabled}
            />
          </Box>
        )}
        {inputs && inputs.length > 0 && (
          <Box ml={4}>
            {inputs.map((input, i) => (
              <Box key={i} mt={2}>
                {renderInputFields({
                  chainId,
                  input,
                  value: inputsState[i] || "",
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                    updateInputState(i, e.target.value),
                  setFunctionIsDisabled: (value: boolean) =>
                    updateFunctionIsDisabled(i, value),
                  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === "Enter" && !functionIsDisabled) {
                      setEnterPressed(true);
                    }
                  },
                  isError,
                })}
              </Box>
            ))}
          </Box>
        )}
        {/* Output fields for Read or Call as View Fn */}
        <Box mt={2} ml={4} mb={inputs && inputs.length > 0 ? 0 : 4}>
          {inputs && inputs.length > 0
            ? // Show skeleton (res = null) if loading
              (type === "read" ||
                writeButtonType === WriteButtonType.CallAsViewFn) &&
              (loading || (!loading && res !== null && res !== undefined)) && (
                <Box p={4} bg="whiteAlpha.100" rounded={"md"}>
                  <Box fontWeight={"bold"}>Result:</Box>
                  {renderRes()}
                </Box>
              )
            : !isError && renderRes()}
        </Box>

        {isError && errorMsg && type === "read" && (
          <Center mt={2} p={4} color="red.300" maxW="40rem">
            {errorMsg}
          </Center>
        )}
      </Box>
    </Box>
  );
};
