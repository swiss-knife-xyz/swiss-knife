"use client";

import { ToolLoading } from "@/components/ToolLoading";

import React, { Suspense, useState, useCallback, useEffect } from "react";
import {
  Heading,
  Box,
  useToast,
  VStack,
  HStack,
  Text,
  Icon,
  IconButton,
  Checkbox,
  Collapse,
  useDisclosure,
  Spacer,
  Badge,
} from "@chakra-ui/react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  AddIcon,
  DeleteIcon,
} from "@chakra-ui/icons";
import {
  FiCode,
  FiMapPin,
  FiFileText,
  FiLayers,
  FiShield,
} from "react-icons/fi";
import { JsonFragmentType } from "ethers";
import { Abi, Hex } from "viem";
import { Editor } from "@monaco-editor/react";

import { SelectedOptionState } from "@/types";
import { networkOptions } from "@/data/common";
import { resolveERC3770Address, fetchContractAbi } from "@/utils";

import { InputField } from "@/components/InputField";
import { DarkButton } from "@/components/DarkButton";
import { DarkSelect } from "@/components/DarkSelect";
import TabsSelector from "@/components/Tabs/TabsSelector";
import { CopyToClipboard } from "@/components/CopyToClipboard";
import { renderInputFields } from "@/components/fnParams/Renderer";
import { AddressInput } from "@/components/fnParams/inputs/AddressInput";
import { IntInput } from "@/components/fnParams/inputs/IntInput";
import { BytesInput } from "@/components/fnParams/inputs/BytesInput";
import {
  ManualParametersEditor,
  ManualParam,
  isTupleType,
  prepareManualParams,
} from "@/components/calldata/ManualParametersEditor";
import { convertBooleans } from "@/lib/convertBooleans";
import {
  encodeStandard,
  encodePackedParams,
  encodeFunction,
  encodeFunctionManual,
  encodeConstructorArgs,
  encodeSafeMultiSend,
  SafeMultiSendTx,
} from "@/lib/encoder";

// =============================================================================
// CONSTANTS
// =============================================================================

// =============================================================================
// SECTION WRAPPER
// =============================================================================

const Section = ({
  icon,
  title,
  badge,
  children,
  noPadding,
}: {
  icon: any;
  title: string;
  badge?: string;
  children: React.ReactNode;
  noPadding?: boolean;
}) => (
  <Box
    bg="bg.subtle"
    border="1px solid"
    borderColor="border.default"
    borderRadius="xl"
    overflow="hidden"
  >
    <HStack
      px={5}
      py={3}
      borderBottom="1px solid"
      borderColor="border.subtle"
      bg="bg.muted"
    >
      <Icon as={icon} color="primary.400" boxSize={4} />
      <Text color="text.primary" fontWeight="semibold" fontSize="sm">
        {title}
      </Text>
      {badge && (
        <Badge
          colorScheme="blue"
          variant="subtle"
          fontSize="xs"
          px={2}
          py={0.5}
          borderRadius="md"
        >
          {badge}
        </Badge>
      )}
    </HStack>
    <Box px={noPadding ? 0 : 5} py={noPadding ? 0 : 4}>
      {children}
    </Box>
  </Box>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

function CalldataEncoderPageContent() {
  const toast = useToast();
  const { isOpen: isAbiOpen, onToggle: onAbiToggle } = useDisclosure();
  const { isOpen: isGeneratedAbiOpen, onToggle: onGeneratedAbiToggle } =
    useDisclosure();
  // --- Tab State ---
  const [selectedTabIndex, setSelectedTabIndex] = useState(0); // Manual, From ABI, From Address
  const [isSafeMultiSend, setIsSafeMultiSend] = useState(false);

  // --- Manual Mode State ---
  const [manualFunctionName, setManualFunctionName] = useState("");
  const [manualParams, setManualParams] = useState<ManualParam[]>([
    { type: "uint256", name: "", value: "" },
  ]);

  // --- ABI Mode State ---
  const [abi, setAbi] = useState<string>("");
  const [parsedFunctions, setParsedFunctions] = useState<
    { label: string; value: string; inputs: readonly JsonFragmentType[] }[]
  >([]);
  const [selectedFunction, setSelectedFunction] =
    useState<SelectedOptionState>(null);
  const [functionInputs, setFunctionInputs] = useState<
    readonly JsonFragmentType[]
  >([]);
  const [inputsState, setInputsState] = useState<{ [key: number]: any }>({});

  // --- From Address State ---
  const [contractAddress, setContractAddress] = useState("");
  const [chainId, setChainId] = useState(1);
  const [selectedNetworkOption, setSelectedNetworkOption] =
    useState<SelectedOptionState>(networkOptions[0]);
  const [fetchedAbi, setFetchedAbi] = useState<string>("");
  const [isFetchingAbi, setIsFetchingAbi] = useState(false);

  // --- Safe MultiSend State ---
  const [multiSendTxs, setMultiSendTxs] = useState<SafeMultiSendTx[]>([
    { operation: 0, to: "", value: "0", data: "0x" },
  ]);

  // --- Result ---
  const [encodedResult, setEncodedResult] = useState<string>("");
  const [encodedResultPacked, setEncodedResultPacked] = useState<string>("");
  const [packedError, setPackedError] = useState<string>("");
  const [encodedParamsOnly, setEncodedParamsOnly] = useState<string>("");
  const [encodedParamsOnlyPacked, setEncodedParamsOnlyPacked] =
    useState<string>("");
  const [paramsOnlyPackedError, setParamsOnlyPackedError] =
    useState<string>("");
  const [resultTabIndex, setResultTabIndex] = useState(0);
  const [paramsSubTabIndex, setParamsSubTabIndex] = useState(0);
  const [isEncoding, setIsEncoding] = useState(false);
  const [isError, setIsError] = useState(false);

  // =============================================================================
  // EFFECTS
  // =============================================================================

  // Parse ABI when it changes (for ABI and Address modes)
  useEffect(() => {
    const abiStr = selectedTabIndex === 2 ? fetchedAbi : abi;
    if (!abiStr) {
      setParsedFunctions([]);
      setSelectedFunction(null);
      setFunctionInputs([]);
      return;
    }

    try {
      const parsed = JSON.parse(abiStr);
      const abiFunctions: {
        label: string;
        value: string;
        inputs: readonly JsonFragmentType[];
      }[] = [];

      const constructorEntry = parsed.find(
        (item: any) => item.type === "constructor"
      );
      if (constructorEntry) {
        abiFunctions.push({
          label: "constructor",
          value: "__constructor__",
          inputs: constructorEntry.inputs || [],
        });
      }

      for (const item of parsed) {
        if (item.type === "function" && item.name) {
          const inputTypes = (item.inputs || [])
            .map((inp: any) => inp.type)
            .join(", ");
          abiFunctions.push({
            label: `${item.name}(${inputTypes})`,
            value: item.name,
            inputs: item.inputs || [],
          });
        }
      }

      setParsedFunctions(abiFunctions);

      if (abiFunctions.length > 0) {
        // Auto-select first function, or re-match current selection
        const currentMatch = selectedFunction
          ? abiFunctions.find((f) => f.value === selectedFunction.value)
          : null;
        if (currentMatch) {
          setFunctionInputs(currentMatch.inputs);
          setInputsState({});
        } else {
          const first = abiFunctions[0];
          setSelectedFunction({ label: first.label, value: first.value });
          setFunctionInputs(first.inputs);
          setInputsState({});
        }
      }
    } catch {
      setParsedFunctions([]);
    }
  }, [abi, fetchedAbi, selectedTabIndex]);

  useEffect(() => {
    if (!selectedFunction) {
      setFunctionInputs([]);
      setInputsState({});
      return;
    }
    const fn = parsedFunctions.find((f) => f.value === selectedFunction.value);
    if (fn) {
      setFunctionInputs(fn.inputs);
      setInputsState({});
    }
  }, [selectedFunction, parsedFunctions]);

  useEffect(() => {
    if (selectedNetworkOption) {
      setChainId(parseInt(selectedNetworkOption.value.toString()));
    }
  }, [selectedNetworkOption]);

  const clearResults = useCallback(() => {
    setEncodedResult("");
    setEncodedResultPacked("");
    setPackedError("");
    setEncodedParamsOnly("");
    setEncodedParamsOnlyPacked("");
    setParamsOnlyPackedError("");
    setIsError(false);
    setResultTabIndex(0);
    setParamsSubTabIndex(0);
  }, []);

  // Clear results when switching tabs
  useEffect(() => {
    clearResults();
    setIsSafeMultiSend(false);
  }, [selectedTabIndex, clearResults]);

  // Clear results when any input changes (result becomes stale)
  useEffect(() => {
    clearResults();
  }, [
    manualParams,
    manualFunctionName,
    isSafeMultiSend,
    multiSendTxs,
    abi,
    fetchedAbi,
    selectedFunction,
    inputsState,
    clearResults,
  ]);

  // =============================================================================
  // CALLBACKS
  // =============================================================================

  const updateInputState = useCallback((index: number, value: any) => {
    setInputsState((prev) => ({ ...prev, [index]: value }));
  }, []);

  const fetchAbiFromAddress = useCallback(async () => {
    if (!contractAddress) return;
    setIsFetchingAbi(true);
    try {
      const result = await fetchContractAbi({
        address: contractAddress,
        chainId,
      });
      const abiStr = JSON.stringify(result.abi, null, 2);
      setFetchedAbi(abiStr);
      setSelectedFunction(null);
      toast({
        title: "ABI Fetched",
        description: result.name ? `Contract: ${result.name}` : "Success",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
    } catch (e: any) {
      toast({
        title: "Failed to fetch ABI",
        description: e.message || "Contract may not be verified",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
      setFetchedAbi("");
    } finally {
      setIsFetchingAbi(false);
    }
  }, [contractAddress, chainId, toast]);

  // =============================================================================
  // ENCODE LOGIC
  // =============================================================================

  const encode = useCallback(() => {
    setIsEncoding(true);
    setIsError(false);
    setEncodedResult("");
    setEncodedResultPacked("");
    setPackedError("");
    setEncodedParamsOnly("");
    setEncodedParamsOnlyPacked("");
    setParamsOnlyPackedError("");

    try {
      let result: Hex;

      // --- Safe MultiSend ---
      if (isSafeMultiSend) {
        result = encodeSafeMultiSend(multiSendTxs);
        setEncodedResult(result);
        return;
      }

      // --- Manual Mode ---
      if (selectedTabIndex === 0) {
        const { types, values } = prepareManualParams(manualParams);

        // If function name is provided, encode as function calldata (selector + args)
        if (manualFunctionName.trim()) {
          result = encodeFunctionManual(
            manualFunctionName.trim(),
            types,
            values
          );
        } else {
          // Standard encoding
          result = encodeStandard(types as any, values);

          // Also try packed encoding
          try {
            const packed = encodePackedParams(
              types.map((t) => t.type),
              values
            );
            setEncodedResultPacked(packed);
          } catch (pe: any) {
            setPackedError(
              pe.message || "Packed encoding not supported for these types"
            );
          }
        }
      }

      // --- From ABI / From Address ---
      else {
        const abiStr = selectedTabIndex === 2 ? fetchedAbi : abi;
        if (!abiStr) throw new Error("No ABI provided");

        const parsedAbi = JSON.parse(abiStr) as Abi;
        const preparedArgs =
          functionInputs?.map((input, i) =>
            convertBooleans(inputsState[i], input)
          ) || [];

        if (selectedFunction && selectedFunction.value === "__constructor__") {
          const constructorEntry = (parsedAbi as any[]).find(
            (item: any) => item.type === "constructor"
          );
          if (!constructorEntry) throw new Error("No constructor found in ABI");

          result = encodeConstructorArgs(
            constructorEntry.inputs as any,
            preparedArgs
          );
        } else {
          if (!selectedFunction) throw new Error("No function selected");

          result = encodeFunction(
            parsedAbi,
            selectedFunction.value as string,
            preparedArgs
          );

          // Also encode params-only (without selector) for non-constructor functions
          if (functionInputs && functionInputs.length > 0) {
            const abiParams = functionInputs.map((input) => ({
              type: input.type as string,
              name: (input.name as string) || "",
              ...(input.components
                ? { components: input.components as any }
                : {}),
            }));

            // Standard abi.encode
            try {
              const paramsEncoded = encodeStandard(
                abiParams as any,
                preparedArgs
              );
              setEncodedParamsOnly(paramsEncoded);
            } catch {
              setEncodedParamsOnly("");
            }

            // Packed abi.encodePacked
            try {
              const types = abiParams.map((p) => p.type);
              const packedEncoded = encodePackedParams(types, preparedArgs);
              setEncodedParamsOnlyPacked(packedEncoded);
              setParamsOnlyPackedError("");
            } catch (pe: any) {
              setEncodedParamsOnlyPacked("");
              setParamsOnlyPackedError(
                pe.message || "Packed encoding not supported for these types"
              );
            }
          } else {
            setEncodedParamsOnly("");
            setEncodedParamsOnlyPacked("");
            setParamsOnlyPackedError("");
          }
        }
      }

      setEncodedResult(result!);
    } catch (e: any) {
      setIsError(true);
      console.error("Encode error:", e);
      toast({
        title: "Encoding Error",
        description: e.message || "Failed to encode",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setIsEncoding(false);
    }
  }, [
    selectedTabIndex,
    manualParams,
    manualFunctionName,
    abi,
    fetchedAbi,
    selectedFunction,
    functionInputs,
    inputsState,
    isSafeMultiSend,
    multiSendTxs,
    toast,
  ]);

  // =============================================================================
  // MANUAL MODE HANDLERS
  // =============================================================================

  // =============================================================================
  // MULTISEND HANDLERS
  // =============================================================================

  const addMultiSendTx = () => {
    setMultiSendTxs((prev) => [
      ...prev,
      { operation: 0, to: "", value: "0", data: "0x" },
    ]);
  };

  const removeMultiSendTx = (index: number) => {
    setMultiSendTxs((prev) => prev.filter((_, i) => i !== index));
  };

  const updateMultiSendTx = (
    index: number,
    field: keyof SafeMultiSendTx,
    value: any
  ) => {
    setMultiSendTxs((prev) =>
      prev.map((tx, i) => (i === index ? { ...tx, [field]: value } : tx))
    );
  };

  // =============================================================================
  // RENDER: MANUAL MODE
  // =============================================================================

  const renderManualMode = () => (
    <VStack spacing={5} align="stretch" w="full">
      {/* Function Name (Optional) */}
      <Section icon={FiCode} title="Function Name" badge="Optional">
        <VStack spacing={3} align="stretch">
          <InputField
            placeholder="e.g. transfer, approve, swap"
            value={manualFunctionName}
            onChange={(e) => setManualFunctionName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") encode();
            }}
          />
          <Text color="text.tertiary" fontSize="xs">
            {manualFunctionName.trim()
              ? `Output: 4-byte selector + ABI-encoded args for "${manualFunctionName.trim()}(${manualParams.map((p) => p.type).join(",")})" `
              : "Leave empty for raw encoding output (no selector). Both standard and packed results shown."}
          </Text>
        </VStack>
      </Section>

      {/* Parameters */}
      <Section
        icon={FiLayers}
        title="Parameters"
        badge={`${manualParams.length}`}
      >
        <ManualParametersEditor
          manualParams={manualParams}
          setManualParams={setManualParams}
          encode={encode}
        />
      </Section>

      {/* Generated ABI */}
      {manualParams.length > 0 &&
        (() => {
          const buildAbiParam = (p: ManualParam, idx: number): any => {
            const base: any = {
              name: p.name || `param_${idx}`,
              type: p.type,
            };
            if (isTupleType(p.type) && p.components?.length) {
              base.components = p.components.map((c, ci) => ({
                name: c.name || `field_${ci}`,
                type: c.type,
              }));
            }
            return base;
          };

          const abiJson = manualFunctionName.trim()
            ? [
                {
                  name: manualFunctionName.trim(),
                  type: "function",
                  stateMutability: "nonpayable",
                  inputs: manualParams.map(buildAbiParam),
                  outputs: [],
                },
              ]
            : manualParams.map(buildAbiParam);

          const abiStr = JSON.stringify(abiJson, null, 2);

          return (
            <Box
              bg="bg.subtle"
              border="1px solid"
              borderColor="border.default"
              borderRadius="xl"
              overflow="hidden"
            >
              <HStack
                px={5}
                py={3}
                borderBottom={isGeneratedAbiOpen ? "1px solid" : "none"}
                borderColor="border.subtle"
                bg="bg.muted"
                cursor="pointer"
                onClick={onGeneratedAbiToggle}
                _hover={{ bg: "bg.emphasis" }}
                transition="background 0.15s"
              >
                <Icon as={FiFileText} color="primary.400" boxSize={4} />
                <Text color="text.primary" fontWeight="semibold" fontSize="sm">
                  Generated ABI
                </Text>
                <Spacer />
                <Box onClick={(e) => e.stopPropagation()}>
                  <CopyToClipboard textToCopy={abiStr} />
                </Box>
                <Text fontSize="xl" fontWeight="bold" color="text.tertiary">
                  {isGeneratedAbiOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
                </Text>
              </HStack>
              <Collapse in={isGeneratedAbiOpen} animateOpacity>
                <Box borderTop="0">
                  <Editor
                    theme="vs-dark"
                    defaultLanguage="json"
                    value={abiStr}
                    height={`${Math.min(Math.max(abiStr.split("\n").length * 19, 80), 300)}px`}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 14,
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      padding: { top: 12 },
                      lineNumbers: "off",
                      folding: true,
                      renderLineHighlight: "none",
                    }}
                  />
                </Box>
              </Collapse>
            </Box>
          );
        })()}
    </VStack>
  );

  // =============================================================================
  // RENDER: ABI MODE
  // =============================================================================

  const renderAbiMode = () => {
    const handleAbiChange = (value: string | undefined) => {
      const newValue = value || "";
      try {
        const parsed = JSON.parse(newValue);
        const prettified = JSON.stringify(parsed, null, 2);
        if (prettified !== newValue) {
          setAbi(prettified);
          return;
        }
      } catch {}
      setAbi(newValue);
    };

    return (
      <VStack spacing={5} align="stretch" w="full">
        {/* ABI Input */}
        <Section icon={FiFileText} title="Contract ABI" noPadding>
          <Box borderTop="0">
            <Editor
              theme="vs-dark"
              defaultLanguage="json"
              value={abi}
              onChange={handleAbiChange}
              height="250px"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 12 },
              }}
            />
          </Box>
        </Section>

        {/* Function Selector */}
        {parsedFunctions.length > 0 && (
          <Section icon={FiCode} title="Function">
            <DarkSelect
              boxProps={{ w: "100%" }}
              placeholder="Select function..."
              options={parsedFunctions.map((f) => ({
                label: f.label,
                value: f.value,
              }))}
              selectedOption={selectedFunction}
              setSelectedOption={(opt) => {
                setSelectedFunction(opt);
              }}
            />
          </Section>
        )}

        {/* Function Inputs */}
        {functionInputs.length > 0 && renderFunctionInputsSection()}
      </VStack>
    );
  };

  // =============================================================================
  // RENDER: FROM ADDRESS MODE
  // =============================================================================

  const renderFromAddressMode = () => {
    return (
      <VStack spacing={5} align="stretch" w="full">
        {/* Contract Lookup */}
        <Section icon={FiMapPin} title="Contract Lookup">
          <VStack spacing={4} align="stretch">
            <Box>
              <AddressInput
                chainId={chainId}
                input={{ name: "Contract Address", type: "address" }}
                placeholder="0x... or ENS name"
                value={contractAddress}
                onChange={(e) => {
                  const input = e.target.value;
                  const res = resolveERC3770Address(input);
                  setContractAddress(res.address);
                  if (res.chainId) {
                    const _networkIndex = networkOptions.findIndex(
                      (option) => option.value === res.chainId
                    );
                    if (_networkIndex >= 0)
                      setSelectedNetworkOption(networkOptions[_networkIndex]);
                  }
                }}
              />
            </Box>
            <Box>
              <Text
                color="text.tertiary"
                fontSize="xs"
                mb={1.5}
                fontWeight="medium"
              >
                CHAIN
              </Text>
              <DarkSelect
                boxProps={{ w: "100%" }}
                selectedOption={selectedNetworkOption}
                setSelectedOption={setSelectedNetworkOption}
                options={networkOptions}
              />
            </Box>
            <Box>
              <DarkButton
                onClick={fetchAbiFromAddress}
                isLoading={isFetchingAbi}
                w="full"
              >
                Fetch ABI
              </DarkButton>
            </Box>
          </VStack>
        </Section>

        {/* Fetched ABI Display */}
        {fetchedAbi && (
          <Box
            bg="bg.subtle"
            border="1px solid"
            borderColor="border.default"
            borderRadius="xl"
            overflow="hidden"
          >
            <HStack
              px={5}
              py={3}
              borderBottom={isAbiOpen ? "1px solid" : "none"}
              borderColor="border.subtle"
              bg="bg.muted"
              cursor="pointer"
              onClick={onAbiToggle}
              _hover={{ bg: "bg.emphasis" }}
              transition="background 0.15s"
            >
              <Icon as={FiFileText} color="primary.400" boxSize={4} />
              <Text color="text.primary" fontWeight="semibold" fontSize="sm">
                ABI
              </Text>
              <Spacer />
              <Box onClick={(e) => e.stopPropagation()}>
                <CopyToClipboard textToCopy={fetchedAbi} />
              </Box>
              <Text fontSize="xl" fontWeight="bold" color="text.tertiary">
                {isAbiOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
              </Text>
            </HStack>
            <Collapse in={isAbiOpen} animateOpacity>
              <Editor
                theme="vs-dark"
                defaultLanguage="json"
                value={fetchedAbi}
                height="250px"
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 14,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 12 },
                }}
              />
            </Collapse>
          </Box>
        )}

        {/* Function Selector */}
        {parsedFunctions.length > 0 && (
          <Section icon={FiCode} title="Function">
            <DarkSelect
              boxProps={{ w: "100%" }}
              placeholder="Select function..."
              options={parsedFunctions.map((f) => ({
                label: f.label,
                value: f.value,
              }))}
              selectedOption={selectedFunction}
              setSelectedOption={(opt) => {
                setSelectedFunction(opt);
              }}
            />
          </Section>
        )}

        {/* Function Inputs */}
        {functionInputs.length > 0 && renderFunctionInputsSection()}
      </VStack>
    );
  };

  // =============================================================================
  // RENDER: FUNCTION INPUTS (shared for ABI / Address modes)
  // =============================================================================

  const renderFunctionInputsSection = () => (
    <Section
      icon={FiLayers}
      title="Parameters"
      badge={`${functionInputs.length}`}
    >
      <VStack spacing={3} align="stretch">
        {functionInputs.map((input, i) => (
          <Box key={i}>
            {renderInputFields({
              chainId,
              input,
              value: inputsState[i] || "",
              onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                updateInputState(i, e.target.value),
              setFunctionIsDisabled: () => {},
              isError: false,
              onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter") encode();
              },
            })}
          </Box>
        ))}
      </VStack>
    </Section>
  );

  // =============================================================================
  // RENDER: MULTISEND MODE
  // =============================================================================

  const renderMultiSendMode = () => (
    <VStack spacing={5} align="stretch" w="full">
      <Section
        icon={FiShield}
        title="Safe MultiSend"
        badge={`${multiSendTxs.length} tx`}
      >
        <VStack spacing={4} align="stretch">
          <Text color="text.tertiary" fontSize="xs">
            Encode multiple transactions in Safe MultiSend packed format. Each
            transaction is packed as: operation(1B) + to(20B) + value(32B) +
            dataLength(32B) + data.
          </Text>

          {multiSendTxs.map((tx, i) => (
            <Box
              key={i}
              p={4}
              bg="whiteAlpha.50"
              border="1px solid"
              borderColor="border.subtle"
              borderRadius="lg"
            >
              <HStack mb={3} justify="space-between" align="center">
                <HStack spacing={2}>
                  <Box
                    bg="whiteAlpha.100"
                    px={2}
                    py={0.5}
                    borderRadius="md"
                    fontSize="xs"
                    color="text.tertiary"
                    fontFamily="mono"
                  >
                    TX {i + 1}
                  </Box>
                </HStack>
                <IconButton
                  aria-label="Remove transaction"
                  icon={<DeleteIcon />}
                  size="xs"
                  variant="ghost"
                  color="text.tertiary"
                  _hover={{ color: "red.300", bg: "whiteAlpha.100" }}
                  onClick={() => removeMultiSendTx(i)}
                  isDisabled={multiSendTxs.length <= 1}
                />
              </HStack>

              <VStack spacing={3} align="stretch">
                <Box>
                  <Text
                    color="text.tertiary"
                    fontSize="xs"
                    mb={1.5}
                    fontWeight="medium"
                  >
                    OPERATION
                  </Text>
                  <DarkSelect
                    boxProps={{ w: "100%" }}
                    options={[
                      { label: "CALL (0)", value: 0 },
                      { label: "DELEGATECALL (1)", value: 1 },
                    ]}
                    selectedOption={
                      tx.operation === 0
                        ? { label: "CALL (0)", value: 0 }
                        : { label: "DELEGATECALL (1)", value: 1 }
                    }
                    setSelectedOption={(opt) => {
                      if (opt)
                        updateMultiSendTx(i, "operation", opt.value as 0 | 1);
                    }}
                  />
                </Box>

                <Box>
                  <AddressInput
                    chainId={1}
                    input={{ name: "to", type: "address" }}
                    value={tx.to}
                    onChange={(e) => updateMultiSendTx(i, "to", e.target.value)}
                    hideTags
                  />
                </Box>

                <Box>
                  <IntInput
                    input={{ name: "value", type: "uint256" }}
                    value={tx.value}
                    onChange={(e) =>
                      updateMultiSendTx(i, "value", e.target.value)
                    }
                    setFunctionIsDisabled={() => {}}
                    defaultEthFormatIndex={0}
                  />
                </Box>

                <Box>
                  <BytesInput
                    input={{ name: "data", type: "bytes" }}
                    value={tx.data}
                    onChange={(e) =>
                      updateMultiSendTx(i, "data", e.target.value)
                    }
                  />
                </Box>
              </VStack>
            </Box>
          ))}

          <Box>
            <DarkButton onClick={addMultiSendTx} size="sm">
              <HStack spacing={2}>
                <AddIcon boxSize={3} />
                <Text>Add Transaction</Text>
              </HStack>
            </DarkButton>
          </Box>
        </VStack>
      </Section>
    </VStack>
  );

  // =============================================================================
  // RENDER: TAB ROUTER
  // =============================================================================

  const renderTabContent = () => {
    if (isSafeMultiSend) return renderMultiSendMode();

    switch (selectedTabIndex) {
      case 0:
        return renderManualMode();
      case 1:
        return renderAbiMode();
      case 2:
        return renderFromAddressMode();
      default:
        return null;
    }
  };

  // =============================================================================
  // MAIN RENDER
  // =============================================================================

  return (
    <Box w="full" maxW="900px" mx="auto">
      {/* Page Header */}
      <Box mb={8} textAlign="center">
        <HStack justify="center" spacing={3} mb={3}>
          <Icon as={FiCode} color="primary.400" boxSize={7} />
          <Heading
            as="h1"
            size="lg"
            color="text.primary"
            fontWeight="bold"
            letterSpacing="tight"
          >
            Calldata Encoder
          </Heading>
        </HStack>
        <Text color="text.secondary" fontSize="md" maxW="520px" mx="auto">
          Encode Ethereum calldata manually, from ABI, or from a verified
          contract address
        </Text>
      </Box>

      {/* Mode Selection */}
      <VStack spacing={4} mb={6}>
        <TabsSelector
          tabs={["Manual", "From ABI", "From Address"]}
          selectedTabIndex={isSafeMultiSend ? -1 : selectedTabIndex}
          setSelectedTabIndex={(idx) => {
            setSelectedTabIndex(idx);
            setIsSafeMultiSend(false);
          }}
        />

        <HStack spacing={5} justify="center">
          <Checkbox
            isChecked={isSafeMultiSend}
            onChange={(e) => setIsSafeMultiSend(e.target.checked)}
            colorScheme="blue"
            size="sm"
          >
            <HStack spacing={1.5}>
              <Icon as={FiShield} boxSize={3.5} color="text.tertiary" />
              <Text color="text.secondary" fontSize="sm">
                Safe MultiSend
              </Text>
            </HStack>
          </Checkbox>
        </HStack>
      </VStack>

      {/* Content */}
      <VStack spacing={5} align="stretch" mb={6}>
        {renderTabContent()}
      </VStack>

      {/* Encode Button */}
      <Box textAlign="center" mb={8}>
        <DarkButton
          onClick={encode}
          isLoading={isEncoding}
          px={10}
          py={5}
          fontSize="md"
        >
          Encode
        </DarkButton>
      </Box>

      {/* Result */}
      {encodedResult &&
        (() => {
          // Manual mode: show Standard/Packed tabs when no function name
          const showManualPackedTab =
            selectedTabIndex === 0 &&
            !manualFunctionName.trim() &&
            !isSafeMultiSend;

          // ABI/Address mode: show Full Calldata / Params Only tabs for non-constructor functions
          const isAbiFunctionMode =
            selectedTabIndex !== 0 &&
            selectedFunction &&
            selectedFunction.value !== "__constructor__" &&
            encodedResult.length > 10 &&
            encodedParamsOnly;

          const hasSelector =
            (encodedResult.length > 10 && manualFunctionName.trim()) ||
            (encodedResult.length > 10 && isSafeMultiSend) ||
            (selectedTabIndex !== 0 &&
              selectedFunction &&
              selectedFunction.value !== "__constructor__" &&
              encodedResult.length > 10);

          // Determine what to display
          let displayResult = encodedResult;
          let displayLabel = "Copy Calldata";

          if (showManualPackedTab && resultTabIndex === 1) {
            displayResult = encodedResultPacked;
          } else if (isAbiFunctionMode && resultTabIndex === 1) {
            // Params Only tab
            if (paramsSubTabIndex === 1) {
              displayResult = encodedParamsOnlyPacked;
            } else {
              displayResult = encodedParamsOnly;
            }
            displayLabel = "Copy Encoded Params";
          }

          const activeByteLength = displayResult
            ? Math.floor((displayResult.length - 2) / 2)
            : 0;

          // Show error for packed encoding
          const showPackedError =
            (showManualPackedTab && resultTabIndex === 1 && packedError) ||
            (isAbiFunctionMode &&
              resultTabIndex === 1 &&
              paramsSubTabIndex === 1 &&
              paramsOnlyPackedError);
          const packedErrorMsg = isAbiFunctionMode
            ? paramsOnlyPackedError
            : packedError;

          return (
            <Section
              icon={FiCode}
              title="Encoded Result"
              badge={displayResult ? `${activeByteLength} bytes` : undefined}
            >
              <VStack spacing={3} align="stretch">
                {/* Manual mode: Standard / Packed tabs */}
                {showManualPackedTab && (
                  <TabsSelector
                    tabs={[
                      "Standard (abi.encode)",
                      "Packed (abi.encodePacked)",
                    ]}
                    selectedTabIndex={resultTabIndex}
                    setSelectedTabIndex={setResultTabIndex}
                    mt={0}
                  />
                )}

                {/* ABI/Address mode: Full Calldata / Params Only tabs */}
                {isAbiFunctionMode && (
                  <VStack spacing={2} align="stretch">
                    <TabsSelector
                      tabs={["Full Calldata", "Params Only"]}
                      selectedTabIndex={resultTabIndex}
                      setSelectedTabIndex={(idx) => {
                        setResultTabIndex(idx);
                        setParamsSubTabIndex(0);
                      }}
                      mt={0}
                    />
                    {resultTabIndex === 1 && (
                      <TabsSelector
                        tabs={[
                          "Standard (abi.encode)",
                          "Packed (abi.encodePacked)",
                        ]}
                        selectedTabIndex={paramsSubTabIndex}
                        setSelectedTabIndex={setParamsSubTabIndex}
                        mt={0}
                      />
                    )}
                  </VStack>
                )}

                {showPackedError ? (
                  <Box
                    p={4}
                    bg="whiteAlpha.50"
                    border="1px solid"
                    borderColor="red.400"
                    borderRadius="lg"
                    fontFamily="mono"
                    fontSize="sm"
                    color="red.300"
                  >
                    Packed encoding failed: {packedErrorMsg}
                  </Box>
                ) : displayResult ? (
                  <>
                    <Box
                      p={4}
                      bg="whiteAlpha.50"
                      border="1px solid"
                      borderColor="border.subtle"
                      borderRadius="lg"
                      fontFamily="mono"
                      fontSize="sm"
                      wordBreak="break-all"
                      maxH="300px"
                      overflowY="auto"
                      color="text.primary"
                      lineHeight="1.7"
                      letterSpacing="0.01em"
                    >
                      {hasSelector && resultTabIndex === 0 ? (
                        <>
                          <Text
                            as="span"
                            color="primary.400"
                            fontWeight="semibold"
                          >
                            {displayResult.slice(0, 10)}
                          </Text>
                          <Text as="span">{displayResult.slice(10)}</Text>
                        </>
                      ) : (
                        displayResult
                      )}
                    </Box>
                    <HStack justify="flex-end">
                      <CopyToClipboard
                        textToCopy={displayResult}
                        labelText={displayLabel}
                      />
                    </HStack>
                  </>
                ) : null}
              </VStack>
            </Section>
          );
        })()}
    </Box>
  );
}

export const CalldataEncoderPage = () => {
  return (
    <Suspense
      fallback={
        <ToolLoading
          title="Calldata Encoder"
          description="Encode smart contract function arguments into Ethereum transaction calldata."
        />
      }
    >
      <CalldataEncoderPageContent />
    </Suspense>
  );
};
