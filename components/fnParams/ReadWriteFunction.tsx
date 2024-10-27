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
  HStack,
  IconButton,
  Link,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Skeleton,
  Spinner,
} from "@chakra-ui/react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ExternalLinkIcon,
  RepeatIcon,
} from "@chakra-ui/icons";
import { useWalletClient, useAccount, useNetwork } from "wagmi";
import { waitForTransaction } from "wagmi/actions";
import { FunctionFragment, JsonFragment, JsonFragmentType } from "ethers";
import {
  ContractFunctionExecutionError,
  PublicClient,
  Hex,
  encodeFunctionData,
  Abi,
} from "viem";
import { InputInfo, IntInput } from "@/components/fnParams/inputs";
import { ExtendedJsonFragmentType, HighlightedContent } from "@/types";
import { renderInputFields, renderParamTypes } from "./Renderer";
import { ConnectButton } from "@/components/ConnectButton";
import { slicedText } from "@/utils";
import { getTransactionError, getContractError } from "viem/utils";

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
  isWhatsAbiDecoded: boolean;
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

enum WriteButtonType {
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
  isWhatsAbiDecoded,
  readAllCollapsed,
}: ReadWriteFunctionProps) => {
  const { data: walletClient } = useWalletClient();
  const { address: userAddress } = useAccount();
  const { chain } = useNetwork();

  const {
    name: __name,
    inputs,
    outputs: _outputs,
    payable,
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

  const outputs =
    _outputs ?? isWhatsAbiDecoded
      ? [
          {
            type: "calldata", // set output type as custom calldata
            name: "",
          },
        ]
      : [];

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
    !isWhatsAbiDecoded ? WriteButtonType.Write : WriteButtonType.CallAsViewFn
  );

  const [res, setRes] = useState<any>(null);
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

      try {
        const result = await client.readContract({
          address: address as Hex,
          abi,
          functionName,
          args,
        });
        setRes(result);
      } catch (e: any) {
        console.error(e);
        setIsError(true);

        setRes(null);

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

        setTxHash(hash);

        await waitForTransaction({
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
          if (!isWhatsAbiDecoded) {
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
      isWhatsAbiDecoded,
    ]
  );

  const simulateOnTenderly = useCallback(async () => {
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

        setTxHash(hash);

        await waitForTransaction({
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
    if (type === "read" && (!inputs || (inputs && inputs.length === 0))) {
      readFunction();
    }

    // try to call as read function is isWhatsAbiDecoded and there are no inputs
    if (isWhatsAbiDecoded && (!inputs || (inputs && inputs.length === 0))) {
      callAsReadFunction(true);
    }
  }, []);

  useEffect(() => {
    setIsError(false);
  }, [inputsState]);

  useEffect(() => {
    setIsCollapsed(readAllCollapsed !== undefined ? readAllCollapsed : false);
  }, [readAllCollapsed]);

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
    if (isWhatsAbiDecoded ? res !== null && res !== undefined : outputs) {
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
      isWhatsAbiDecoded &&
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
          <HStack
            bg={!isError ? "blue.200" : "red.200"}
            rounded="lg"
            spacing={0}
          >
            {!userAddress && writeButtonType === WriteButtonType.Write ? (
              <ConnectButton />
            ) : (
              <Button
                px={4}
                onClick={
                  writeButtonType === WriteButtonType.Write
                    ? writeFunction
                    : writeButtonType === WriteButtonType.CallAsViewFn
                    ? () => callAsReadFunction()
                    : simulateOnTenderly
                }
                isDisabled={
                  (inputs &&
                    inputs.some((_, i) => functionIsDisabled[i] === true)) ||
                  payableETHIsDisabled
                }
                isLoading={loading}
                size={"sm"}
                title={"write"}
                colorScheme={!isError ? "blue" : "red"}
              >
                {writeButtonType}
              </Button>
            )}
            <Menu>
              <MenuButton
                as={IconButton}
                aria-label="Options"
                icon={<ChevronDownIcon />}
                variant="outline"
                size={"xs"}
                color="blue.800"
                borderLeftColor="blue.800"
                borderLeftRadius={0}
              />
              <MenuList bg="gray.800">
                <MenuItem
                  color="white"
                  bg="gray.800"
                  _hover={{ bg: "gray.700" }}
                  onClick={() => {
                    setWriteButtonType(WriteButtonType.Write);
                    setIsError(false);
                  }}
                >
                  Write
                </MenuItem>
                <MenuItem
                  color="white"
                  bg="gray.800"
                  _hover={{ bg: "gray.700" }}
                  onClick={() => {
                    setWriteButtonType(WriteButtonType.CallAsViewFn);
                    setIsError(false);
                  }}
                >
                  Call as View Fn
                </MenuItem>
                <MenuItem
                  color="white"
                  bg="gray.800"
                  _hover={{ bg: "gray.700" }}
                  onClick={() => {
                    setWriteButtonType(WriteButtonType.SimulateOnTenderly);
                    setIsError(false);
                  }}
                >
                  Simulate on Tenderly
                </MenuItem>
              </MenuList>
            </Menu>
          </HStack>
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

      <Box display={isCollapsed ? "none" : undefined}>
        {/* Input fields */}
        {payable && (
          <Box ml={4} p={4} bg="whiteAlpha.100" rounded={"lg"}>
            <IntInput
              input={{
                name: "Payable ETH",
                type: "uint256",
              }}
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
        {/* Transaction status for Write */}
        {txHash && !confirmedTxHash && (
          <Box mt={4} ml={4}>
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
            <HStack p={4} bg="green.500" rounded={"md"}>
              <Box fontWeight={"bold"}>✅ Transaction confirmed:</Box>
              <Box>
                <Link
                  href={`${chain?.blockExplorers?.default.url}/tx/${confirmedTxHash}`}
                  isExternal
                >
                  <HStack>
                    <Box>{slicedText(confirmedTxHash, 10)}</Box>
                    <ExternalLinkIcon />
                  </HStack>
                </Link>
              </Box>
            </HStack>
          </Box>
        )}
        {isError && errorMsg && (
          <Center mt={2} p={4} color="red.300" maxW="40rem">
            {errorMsg}
          </Center>
        )}
      </Box>
    </Box>
  );
};
