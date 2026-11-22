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
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
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
  LinkIcon,
  SettingsIcon,
  WarningTwoIcon,
} from "@chakra-ui/icons";
import { useWalletClient, useAccount } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { FunctionFragment, JsonFragment, JsonFragmentType } from "ethers";
import {
  ContractFunctionExecutionError,
  PublicClient,
  Hex,
  encodeFunctionData as encodeAbiFunctionData,
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
import { ReadButton, type ReadAction } from "../ReadButton";
import { SignatureRegistryForm } from "@/components/SignatureRegistryForm";
import { CopyToClipboard } from "@/components/CopyToClipboard";
import axios from "axios";
import { convertBooleans } from "@/lib/convertBooleans";
import { inferFunctionInputs, type InferredFunctionInfo } from "@/lib/inferredContract";
import { getPath } from "@/utils";
import subdomains from "@/subdomains";
import { erc165Interfaces } from "@/data/erc165Interfaces";
import { createContractCallLink, contractFunctionSignature } from "@/lib/contractCall";

const interfacePresetOptions = erc165Interfaces.map(({ label, id }) => ({
  label: label.replace(" (optional)", ""),
  value: id,
}));

interface ReadWriteFunctionProps {
  client: PublicClient;
  index: number;
  type: "read" | "write";
  func: Omit<JsonFragment, "name" | "outputs"> &
    InferredFunctionInfo & {
      name: HighlightedContent;
      outputs?: readonly JsonFragmentType[];
      highlightedOutputs?: ExtendedJsonFragmentType[];
    };
  address: string;
  chainId: number;
  isAbiDecoded?: boolean;
  isCustomAdded?: boolean;
  readAllCollapsed?: boolean;
  // Parent keys this form by prefill revision so child-local widget state resets.
  initialCall?: { args: unknown[]; value: string };
  abiMode?: "contract" | "implementation";
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
      ml={{ base: 0, md: 4 }}
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
  EncodeCalldata = "Encode Calldata",
}

/**
 * Recursively converts boolean string values ("true"/"false") to actual
 * booleans, handling nested arrays (bool[], bool[3]) and tuples.
 */
const ReadWriteFunctionComponent = ({
  client,
  index,
  type,
  func: originalFunc,
  address,
  chainId,
  isAbiDecoded,
  isCustomAdded,
  readAllCollapsed,
  initialCall,
  abiMode = "contract",
}: ReadWriteFunctionProps) => {
  const [submittedSignature, setSubmittedSignature] = useState<{ context: string; signature: string }>();
  const selectorContext = `${chainId}:${address.toLowerCase()}:${originalFunc.selector ?? ""}`;
  const __func = React.useMemo(() => {
    if (!originalFunc.selector || submittedSignature?.context !== selectorContext) return originalFunc;
    return {
      ...originalFunc,
      ...inferFunctionInputs(originalFunc.selector, undefined, [submittedSignature.signature]),
    };
  }, [originalFunc, submittedSignature, selectorContext]);
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
  const inputsUnknown = __func.inputInference?.source === "unknown";
  // A display-only selector label is not a valid ABI function identifier.
  const displayName = extractStringFromReactNode(__name);
  const functionName =
    __func.inputInference && displayName.startsWith("selector: ")
      ? "inferred"
      : displayName;
  const encodeFunctionData = useCallback(
    (parameters: Parameters<typeof encodeAbiFunctionData>[0]): Hex => {
      if (__func.inputInference?.source === "unknown") {
        throw new Error(
          "Input types are unknown; supply an ABI or use Raw Calldata."
        );
      }
      const encoded = encodeAbiFunctionData(parameters);
      // Bytecode supplies the real selector even when no function name is known.
      return __func.inputInference && __func.selector
        ? (`${__func.selector}${encoded.slice(10)}` as Hex)
        : encoded;
    },
    [__func]
  );

  const _func = React.useMemo(
    () =>
      ({ ...__func, name: functionName, type: "function" }) as JsonFragment & {
        type: "function";
      },
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
    initialCall
      ? false
      : readAllCollapsed !== undefined
        ? readAllCollapsed
        : false
  );
  const [payableETH, setPayableETH] = useState<string>(
    initialCall?.value ?? "0"
  );
  const [payableETHIsDisabled, setPayableETHIsDisabled] =
    useState<boolean>(false);
  const [inputsState, setInputsState] = useState<any>(() =>
    Object.fromEntries((initialCall?.args ?? []).map((value, i) => [i, value]))
  );
  const isSupportsInterface =
    functionName === "supportsInterface" &&
    inputs?.length === 1 &&
    inputs[0].type === "bytes4";
  const [functionIsDisabled, setFunctionIsDisabled] = useState<any>({});
  const [readAction, setReadAction] = useState<ReadAction>("Read");
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
  const [calldataModalOpen, setCalldataModalOpen] = useState<boolean>(false);
  const [encodedCalldata, setEncodedCalldata] = useState<string>("");
  const [encodingError, setEncodingError] = useState("");
  const [share, setShare] = useState<{ link: string; error: string } | null>(null);

  useEffect(() => {
    setEncodedCalldata("");
    setCalldataModalOpen(false);
    setEncodingError("");
    setShare(null);
  }, [
    inputsState,
    functionName,
    inputs,
    address,
    chainId,
    isAbiDecoded,
    payableETH,
    abiMode,
  ]);

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

  const prepareArgs = useCallback(() => {
    return inputs?.map((input, i) => convertBooleans(inputsState[i], input));
  }, [inputs, inputsState]);

  const readFunction = useCallback(async () => {
    if (inputsUnknown) return;
    if (isError) {
      setIsError(false);
    }

    if (functionName) {
      setLoading(true);
      setRes(null);

      const abi = [_func] as unknown as Abi;
      const args = prepareArgs();

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

  const [writePreview, setWritePreview] = useState<{
    key: string;
    status: "loading" | "ready" | "error";
    result?: unknown;
  } | null>(null);
  const [writeStatus, setWriteStatus] = useState<{
    key: string;
    phase: "wallet" | "submitted" | "confirmed" | "rejected" | "error";
  } | null>(null);
  const writeContextKey = JSON.stringify([
    chainId,
    address,
    _func,
    inputsState,
    payableETH,
    userAddress,
    chain?.id,
    walletClient?.account?.address,
    walletClient?.chain?.id,
    client.chain?.id,
    writeButtonType,
    isAbiDecoded,
  ]);
  const writeContextRef = useRef(writeContextKey);
  writeContextRef.current = writeContextKey;
  const simulationId = useRef(0);
  const writeInFlight = useRef(false);
  const cancelWritePreview = useCallback(() => {
    simulationId.current++;
    setWritePreview(null);
    setWriteStatus(null);
    setTxHash(null);
    setConfirmedTxHash(null);
    if (!writeInFlight.current) setLoading(false);
  }, []);
  useEffect(() => {
    cancelWritePreview();
    return () => {
      simulationId.current++;
    };
  }, [writeContextKey, client, cancelWritePreview]);

  const sendWriteTransaction = useCallback(async (calldata: Hex, key: string) => {
    if (key !== writeContextRef.current || writeInFlight.current) return;
    if (inputsUnknown) return;
    const requestId = simulationId.current;
    const isCurrent = () => key === writeContextRef.current && requestId === simulationId.current;
    if (isError) {
      setIsError(false);
    }

    if (functionName && walletClient) {
      setLoading(true);
      setTxHash(null);
      setConfirmedTxHash(null);

      writeInFlight.current = true;
      setWriteStatus({ key, phase: "wallet" });
      try {
        // Send the exact calldata encoded from the submitted inputs.
        const hash = await walletClient.sendTransaction({
          account: walletClient.account,
          chain: walletClient.chain,
          to: address as Hex,
          data: calldata,
          value: BigInt(payableETH),
        });

        if (!isCurrent()) return;
        setWriteStatus({ key, phase: "submitted" });
        setTxIsTenderlySimulation(false);
        setTxHash(hash);

        const receipt = await waitForTransactionReceipt(config, {
          hash,
          chainId,
        });
        if (!isCurrent()) return;
        if (receipt.status === "reverted") throw new Error("Transaction reverted.");
        setWriteStatus({ key, phase: "confirmed" });
        setConfirmedTxHash(hash);
      } catch (e: any) {
        if (!isCurrent()) return;
        const transactionError = getTransactionError(e, {
          account: walletClient.account,
          docsPath: "",
        });
        const rejected = e.code === 4001 || e.cause?.code === 4001 ||
          /rejected|denied/i.test(transactionError.shortMessage || e.message || "");
        setWriteStatus({ key, phase: rejected ? "rejected" : "error" });
        setIsError(true);

        setRes(null);

        setErrorMsg(transactionError.shortMessage);
      } finally {
        writeInFlight.current = false;
        setLoading(false);
      }
    }
  }, [isError, functionName, walletClient, address, payableETH, chainId, inputsUnknown]);

  const writeFunction = useCallback(async () => {
    if (inputsUnknown || !walletClient || loading || writeInFlight.current) return;
    const key = writeContextKey;
    const id = ++simulationId.current;
    const isCurrent = () => id === simulationId.current && key === writeContextRef.current;
    setWritePreview(null);
    setWriteStatus(null);
    setIsError(false);
    setTxHash(null);
    setConfirmedTxHash(null);
    try {
      if (chain?.id !== chainId || walletClient.chain?.id !== chainId ||
          !userAddress || walletClient.account.address.toLowerCase() !== userAddress.toLowerCase()) {
        throw new Error("Wallet account or network changed. Reconnect on the selected chain and retry.");
      }
      const args = prepareArgs();
      const data = encodeFunctionData({ abi: [_func] as const, functionName, args });
      const canSimulate = !isAbiDecoded && _outputs && _outputs.length > 0;
      if (canSimulate && client.chain?.id !== chainId) {
        throw new Error("Simulation client does not match the selected chain.");
      }
      // Request wallet confirmation immediately; simulation never gates sending.
      const sending = sendWriteTransaction(data, key);
      if (canSimulate) {
        setWritePreview({ key, status: "loading" });
        void (async () => {
          try {
            const simulation = await client.simulateContract({
              abi: [_func] as unknown as Abi,
              functionName,
              address: address as Hex,
              account: walletClient.account,
              chain: walletClient.chain,
              args,
              value: BigInt(payableETH),
            });
            if (isCurrent()) setWritePreview({ key, status: "ready", result: simulation.result });
          } catch {
            if (isCurrent()) setWritePreview({ key, status: "error" });
          }
        })();
      }
      await sending;
    } catch (error: any) {
      if (isCurrent()) {
        setIsError(true);
        setErrorMsg(error.shortMessage || error.message || "Unable to request wallet confirmation.");
      }
    }
  }, [inputsUnknown, walletClient, loading, writeContextKey, chain, chainId,
    userAddress, prepareArgs, _func, functionName, isAbiDecoded, _outputs,
    client, address, payableETH, sendWriteTransaction]);

  const callAsReadFunction = useCallback(
    async (bypassSettingError: boolean = false) => {
      if (inputsUnknown) return;
      if (isError) {
        setIsError(false);
      }

      if (functionName) {
        setLoading(true);
        setRes(null);

        const abi = [_func] as unknown as Abi;
        const args = prepareArgs();

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
    if (inputsUnknown) return;
    if (isError) {
      setIsError(false);
    }

    setLoading(true);

    const abi = [_func] as unknown as Abi;
    const args = prepareArgs();

    const tenderlyUrl = generateTenderlyUrl(
      {
        from:
          settingsSenderAddr.length > 0
            ? settingsSenderAddr
            : (userAddress ?? zeroAddress),
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
      const args = prepareArgs();

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

  const encodeCalldataFn = useCallback(() => {
    if (inputsUnknown) return;
    setEncodingError("");
    setEncodedCalldata("");
    setCalldataModalOpen(false);
    try {
      const abi = [_func] as unknown as Abi;
      const args = prepareArgs();

      const calldata = encodeFunctionData({
        abi,
        functionName,
        args,
      });
      setEncodedCalldata(calldata);
      setCalldataModalOpen(true);
    } catch (e: unknown) {
      setEncodingError(
        e instanceof Error ? e.message : "Failed to encode calldata"
      );
    }
  }, [_func, prepareArgs, functionName, inputsUnknown, encodeFunctionData]);

  const shareFunctionCall = () => {
    try {
      if (inputsUnknown) throw new Error("Input types are unavailable for this function.");
      let payload: { data: string } | { args: unknown[] };
      const isFilled = (value: unknown): boolean =>
        value !== undefined && value !== null && value !== "" &&
        (!Array.isArray(value) || value.every(isFilled));
      try {
        if (!(inputs ?? []).every((_, i) => isFilled(inputsState[i])))
          throw new Error("Unfinished parameters");
        payload = { data: encodeFunctionData({
          abi: [_func] as unknown as Abi,
          functionName,
          args: prepareArgs(),
        }) };
      } catch {
        payload = { args: (inputs ?? []).map((_, i) => inputsState[i] ?? null) };
      }
      const link = createContractCallLink(
        new URL(getPath(subdomains.CONTRACT.base), window.location.origin).href,
        chainId,
        address,
        { ...payload, value: payableETH, abiMode, signature: contractFunctionSignature(_func) }
      );
      setShare({ link, error: "" });
    } catch (error) {
      setShare({ link: "", error: error instanceof Error ? error.message : "Unable to share this function call." });
    }
  };

  useEffect(() => {
    try {
      setFnSelector(
        __func.inputInference && __func.selector
          ? __func.selector
          : FunctionFragment.from(_func).selector
      );
    } catch (e) {
      console.error(e);
    }
  }, [_func]);

  useEffect(() => {
    if (enterPressed) {
      if (type === "read" && readAction === "Encode Calldata") encodeCalldataFn();
      else readFunction();
      setEnterPressed(false);
    }
  }, [inputsState, enterPressed, readFunction, type, readAction, encodeCalldataFn]);

  useEffect(() => {
    // if there are no inputs, then auto fetch the value
    // stagger calls by 150ms per function to avoid RPC rate limits (429)
    if (
      !initialCall &&
      !inputsUnknown &&
      type === "read" &&
      (!inputs || (inputs && inputs.length === 0))
    ) {
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
    setIsCollapsed(
      initialCall
        ? false
        : readAllCollapsed !== undefined
          ? readAllCollapsed
          : false
    );
  }, [readAllCollapsed, initialCall]);

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
    const wrapName = (text: string) => text.split(/(?<=_)/).map((segment, index) => (
      <React.Fragment key={index}>{segment}<wbr /></React.Fragment>
    ));
    if (typeof content === "string") {
      return wrapName(content);
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
        {wrapName(part.text)}
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
              pt={outputs.length > 1 ? 3 : 0}
              borderTopWidth={i > 0 ? "1px" : 0}
              borderColor="whiteAlpha.100"
            >
              {outputs.length > 1 && output.type !== "tuple" && (
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
                  components: output.components,
                  name: outputs.length > 1 ? output.name : "",
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
      minW={0}
      w="full"
      mb={2}
      p={2}
      pb={!inputs || inputs.length === 0 ? undefined : 4}
      border="1px solid"
      borderColor={isCustomAdded ? "rgba(236, 201, 75, 0.3)" : initialCall ? "blue.400" : "whiteAlpha.200"}
      rounded="md"
      bg={initialCall ? "whiteAlpha.50" : !inputs || inputs.length === 0 ? "whiteAlpha.50" : undefined}
    >
      {/* Show the function name above its selector and tools. */}
      <Box display="grid" gridTemplateColumns="1.5rem max-content minmax(0, 1fr) auto" columnGap={1.5} rowGap={0} alignItems="start" mb={1}>
          <HStack gridColumn={3} gridRow={2} spacing={2} minW={0} flexWrap="wrap" rowGap={1} color="text.tertiary" fontSize="xs" lineHeight={5}>
            {fnSelector && <Box
              as="button"
              type="button"
              textAlign="left"
              whiteSpace="nowrap"
              aria-label={`Toggle ${displayName} selector`}
              aria-expanded={!isCollapsed}
              onClick={() => setIsCollapsed(collapsed => !collapsed)}
              borderRadius="md"
              _focusVisible={{outline:"2px solid", outlineColor:"blue.400"}}
            >selector: {fnSelector}</Box>}
          <HStack spacing={0.5} align="center" flexWrap="nowrap" minH={6} aria-label="Function tools">
            <Tooltip label="Share function call" hasArrow>
              <IconButton
                aria-label={`Share ${displayName} function call`}
                icon={<LinkIcon boxSize={3} />}
                size="xs"
                h={6}
                minW={6}
                variant="ghost"
                color="text.secondary"
                flexShrink={0}
                onClick={shareFunctionCall}
              />
            </Tooltip>
            {isAbiDecoded && (
              <Tooltip label="Inferred from bytecode and signature lookups. Check the input types before use." hasArrow>
                <Box display="flex" alignItems="center" justifyContent="center" boxSize={6} flexShrink={0} tabIndex={0} aria-label="Inferred signature, not verified" borderRadius="md" _focusVisible={{outline:"2px solid", outlineColor:"blue.400"}}>
                  <WarningTwoIcon color="yellow.300" boxSize={3} />
                </Box>
              </Tooltip>
            )}
            {isAbiDecoded && displayName.startsWith("selector: ") && fnSelector && (
              <SignatureRegistryForm
                selector={fnSelector}
                iconOnly
                onSubmitted={(signature, selector) => {
                  if (selector !== originalFunc.selector?.toLowerCase()) return;
                  setSubmittedSignature({ context: selectorContext, signature });
                  setInputsState({});
                  setFunctionIsDisabled({});
                  setRes(null);
                }}
              />
            )}
            </HStack>
            {__func.outputs && __func.outputs.length > 0 && <Text whiteSpace="nowrap">→ {__func.outputs.length === 1 ? __func.outputs[0].type : `${__func.outputs.length} outputs`}</Text>}
          </HStack>
              <IconButton
                gridColumn={1}
                gridRow={1}
                alignSelf="start"
                aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${displayName}`}
                aria-expanded={!isCollapsed}
                icon={isCollapsed ? <ChevronUpIcon boxSize={5} /> : <ChevronDownIcon boxSize={5} />}
                onClick={() => setIsCollapsed(collapsed => !collapsed)}
                size="xs"
                variant="ghost"
                color="text.secondary"
                h={6}
                minW={6}
              />
              <Text gridColumn={2} gridRow={1} fontSize="sm" lineHeight={6} color="text.secondary">{index}.</Text>
          <HStack
            gridColumn={3}
            gridRow={1}
            as="button"
            type="button"
            w="full"
            minW={0}
            minH={6}
            spacing={1.5}
            align="start"
            textAlign="left"
            aria-label={`Toggle ${displayName}`}
            aria-expanded={!isCollapsed}
            onClick={() => setIsCollapsed(collapsed => !collapsed)}
            borderRadius="md"
            _focusVisible={{outline:"2px solid", outlineColor:"blue.400"}}
          >
            <Box minW={0} fontSize="lg" lineHeight={6} fontWeight="semibold" overflowWrap="anywhere">{renderHighlightedText(__func.name)}</Box>
          </HStack>
          <HStack gridColumn={4} gridRow="1 / 3" justify="flex-end" alignSelf="start" spacing={1.5} flexWrap="nowrap" align="start">
          {type === "read" && <ReadButton
            action={readAction}
            onActionChange={action => { setReadAction(action); setIsError(false); setEncodingError(""); }}
            onRead={readFunction}
            onEncode={encodeCalldataFn}
            isLoading={loading}
            isError={isError}
            isDisabled={inputsUnknown || Boolean(inputs?.some((_, i) => functionIsDisabled[i] === true))}
          />}
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
            encodeCalldata={encodeCalldataFn}
            isDisabled={
              inputsUnknown ||
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
              isLazy
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
                w="min(30rem, calc(100vw - 2rem))"
                minW={0}
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
          {highlightedOutputs && highlightedOutputs.length > 1 && <Box gridColumn="3 / -1" gridRow={3} display={{base:"none",md:"block"}} mt={1}><EnhancedFunctionOutput highlightedOutputs={highlightedOutputs} /></Box>}
      </Box>
      {encodingError && (
        <Text role="alert" color="red.300" p={2} wordBreak="break-word">
          {encodingError}
        </Text>
      )}
      {/* Explain unavailable actions without repeating notices on usable functions. */}
      {inputsUnknown && (
        <Text role="note" ml={{ base: 0, md: 4 }} mb={2} fontSize="sm" color="orange.300">
          {__func.inputInference?.message}
        </Text>
      )}
      {/* Compact transaction status with an independently loaded return value. */}
      {((writeStatus && writeStatus.key === writeContextKey) ||
        (writePreview && writePreview.key === writeContextKey) || txHash || confirmedTxHash) && (
        <Box
          role="region"
          aria-label="Transaction status"
          mt={3}
          mb={4}
          mx={{ base: 0, md: 4 }}
          minW={0}
        >
          <HStack spacing={2} flexWrap="wrap" fontSize="sm" px={4} py={3} bg="whiteAlpha.50" rounded="md">
            {writeStatus?.key === writeContextKey && writeStatus.phase === "wallet" && <Spinner size="xs" />}
            <Text fontWeight="medium">
              {writeStatus?.key === writeContextKey && writeStatus.phase === "rejected"
                ? "Request rejected"
                : writeStatus?.key === writeContextKey && writeStatus.phase === "error"
                  ? "Transaction failed"
                  : confirmedTxHash ? "Transaction confirmed"
                    : txHash ? "Transaction submitted" : "Confirm in your wallet"}
            </Text>
            {(confirmedTxHash || txHash) && (
              txIsTenderlySimulation ? <Text>{slicedText(confirmedTxHash || txHash!, 10)}</Text> : (
                <Link href={`${chain?.blockExplorers?.default.url}/tx/${confirmedTxHash || txHash}`} isExternal>
                  <HStack spacing={1}><Text>{slicedText(confirmedTxHash || txHash!, 10)}</Text><ExternalLinkIcon /></HStack>
                </Link>
              )
            )}
          </HStack>
          {writePreview && writePreview.key === writeContextKey && (
            <Box mt={3} p={4} bg="whiteAlpha.50" borderWidth="1px" borderColor="whiteAlpha.200" rounded="md">
              <HStack spacing={2} mb={2}>
                <Text fontSize="sm" fontWeight="bold">Function return value:</Text>
                <Tooltip
                  label="Predicted output from a read-only simulation using the same function inputs. This value is not taken from the transaction receipt and may differ when the transaction executes."
                  hasArrow
                  placement="top"
                >
                  <Box
                    as="button"
                    type="button"
                    aria-label="About function return values"
                    display="inline-flex"
                    alignItems="center"
                    justifyContent="center"
                    boxSize={6}
                    fontSize="xs"
                    color="whiteAlpha.600"
                    borderRadius="sm"
                    _hover={{ color: "white" }}
                    _focusVisible={{ outline: "2px solid", outlineColor: "blue.400" }}
                  >
                    <InfoIcon />
                  </Box>
                </Tooltip>
              </HStack>
              <Box role="status" aria-live="polite" fontSize="sm" overflowWrap="anywhere">
                {writePreview.status === "loading" ? (
                  <Text color="whiteAlpha.600">Fetching simulated return…</Text>
                ) : writePreview.status === "error" ? (
                  <Text color="whiteAlpha.600">Simulated return unavailable</Text>
                ) : _outputs?.map((output, i) => (
                  <HStack key={i} spacing={2} alignItems="baseline" flexWrap="wrap">
                    <Text fontFamily="mono" fontSize="xs" color="whiteAlpha.600">
                      {output.name ? `${output.name} (${output.type})` : output.type}
                    </Text>
                    <Text as="span" fontFamily="mono" whiteSpace="pre-wrap">
                      {JSON.stringify(
                        _outputs.length === 1 ? writePreview.result : (writePreview.result as unknown[])?.[i],
                        (_, value) => typeof value === "bigint" ? value.toString() : value,
                        2
                      )}
                    </Text>
                  </HStack>
                ))}
              </Box>
            </Box>
          )}
          {txIsTenderlySimulation && confirmedTxHash && <Text fontSize="xs" mt={1}>(view on your Tenderly dashboard)</Text>}
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
          <Box ml={{ base: 0, md: 4 }} p={{ base: 2, md: 4 }} bg="whiteAlpha.100" rounded={"lg"}>
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
          <Box ml={{ base: 0, md: 4 }}>
            {inputs.map((input, i) => (
              <Box key={i} mt={2}>
                {renderInputFields({
                  chainId,
                  input,
                  suggestions: isSupportsInterface && i === 0 ? interfacePresetOptions : undefined,
                  value: inputsState[i] ?? "",
                  allowBytesBuilder: true,
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
        <Box mt={2} ml={{ base: 0, md: 4 }} mb={inputs && inputs.length > 0 ? 0 : 4}>
          {inputs && inputs.length > 0
            ? // Show skeleton (res = null) if loading
              (type === "read" ||
                writeButtonType === WriteButtonType.CallAsViewFn) &&
              (loading || (!loading && res !== null && res !== undefined)) && (
                <Box pt={3} borderTopWidth="1px" borderColor="whiteAlpha.100">
                  {!(outputs.length === 1 && outputs[0].type === "tuple") && (
                    <Text fontSize="xs" color="whiteAlpha.600" mb={2}>
                      Result
                    </Text>
                  )}
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


      <Modal isOpen={share !== null} onClose={() => setShare(null)} isCentered size="lg" scrollBehavior="inside">
        <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(8px)" />
        <ModalContent mx={{ base: 3, sm: 4 }} maxW={{ base: "calc(100vw - 1.5rem)", sm: "lg" }} bg="bg.base" border="1px solid" borderColor="border.subtle">
          <ModalHeader pb={2}>Share function call</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={5} px={{ base: 3, sm: 6 }}>
            <Text fontSize="sm" color="text.secondary" mb={4}>
              Share this function with its current parameters.
            </Text>
            {share?.error ? (
              <Text role="alert" color="red.300" fontSize="sm">{share.error}</Text>
            ) : (
              <>
                <Box position="relative">
                  <Input aria-label="Function call link" value={share?.link ?? ""} isReadOnly pr={12} fontSize="sm" />
                  <IconButton
                    as="a"
                    href={share?.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open function call link"
                    icon={<ExternalLinkIcon />}
                    variant="ghost"
                    size="sm"
                    position="absolute"
                    top={1}
                    right={1}
                    color="text.secondary"
                  />
                </Box>
                <Center mt={4}>
                  <CopyToClipboard
                    textToCopy={share?.link ?? ""}
                    labelText="Copy link"
                    aria-label="Copy function call link"
                    variant="outline"
                  />
                </Center>
              </>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Encode Calldata Modal */}
      <Modal
        isOpen={calldataModalOpen}
        onClose={() => setCalldataModalOpen(false)}
        isCentered
        size="lg"
      >
        <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(8px)" />
        <ModalContent
          mx={{ base: 3, sm: 4 }}
          maxW={{ base: "calc(100vw - 1.5rem)", sm: "lg" }}
          bg="bg.base"
          border="1px solid"
          borderColor="border.subtle"
        >
          <ModalHeader color="text.primary">Encoded Calldata</ModalHeader>
          <ModalCloseButton
            color="text.secondary"
            _hover={{ color: "text.primary" }}
          />
          <ModalBody pb={6} px={{ base: 3, sm: 6 }}>
            <Box
              position="relative"
              bg="bg.muted"
              border="1px solid"
              borderColor="border.default"
              rounded="lg"
              color="text.primary"
            >
              <Box
                p={4}
                pr={12}
                fontFamily="mono"
                fontSize="sm"
                wordBreak="break-all"
                maxH="300px"
                overflowY="auto"
              >
                {encodedCalldata}
              </Box>
              <CopyToClipboard
                textToCopy={encodedCalldata}
                aria-label="Copy Calldata"
                position="absolute"
                top={2}
                right={2}
                size="sm"
                minW={8}
                w={8}
                px={0}
              />
            </Box>
            <HStack mt={3} spacing={3} justify="flex-end" flexWrap="wrap">
              <Link
                href={`${getPath(subdomains.CALLDATA.base)}decoder?calldata=${encodedCalldata}`}
                isExternal
                fontSize="sm"
              >
                Open in decoder <ExternalLinkIcon boxSize="3.5" ml={1} />
              </Link>

            </HStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export const ReadWriteFunction = React.memo(ReadWriteFunctionComponent);
