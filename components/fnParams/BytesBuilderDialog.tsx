"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Text,
  VStack,
  Tabs,
  TabList,
  Tab,
  Textarea,
  SimpleGrid,
} from "@chakra-ui/react";
import { ArrowDownIcon } from "@chakra-ui/icons";
import { Interface, type JsonFragmentType } from "ethers";
import type { Hex } from "viem";
import { DarkSelect } from "@/components/DarkSelect";
import { NetworkSelect } from "@/components/NetworkSelect";
import { CopyToClipboard } from "@/components/CopyToClipboard";
import {
  ManualParametersEditor,
  type ManualParam,
  prepareManualParams,
} from "@/components/calldata/ManualParametersEditor";
import { CompactParameterInputs } from "./ParameterInputStyle";
import { renderInputFields } from "./Renderer";
import {
  encodeStandard,
  encodeFunctionManual,
  type ManualParamType,
} from "@/lib/encoder";
import { parseJsonAbi } from "@/lib/parseJsonAbi";
import { convertBooleans } from "@/lib/convertBooleans";
import { fetchContractAbi, resolveERC3770Address } from "@/utils";

// viem accepts an empty integer string as zero. Require an explicit base-unit value.
function validateBuilderValues(input: ManualParamType, value: unknown): void {
  const array = input.type.match(/^(.+)\[\d*\]$/);
  if (array && Array.isArray(value)) {
    value.forEach((item) =>
      validateBuilderValues({ ...input, type: array[1] }, item)
    );
  } else if (input.type === "tuple" && Array.isArray(value)) {
    input.components?.forEach((component, i) =>
      validateBuilderValues(component, value[i])
    );
  } else if (
    /^bytes(\d+)?$/.test(input.type) &&
    (typeof value !== "string" || !/^0x(?:[\da-f]{2})*$/i.test(value))
  ) {
    throw new Error(
      `Enter even-length 0x-prefixed hex for ${input.name || input.type}.`
    );
  } else if (
    /^u?int(\d+)?$/.test(input.type) &&
    !/^(?:-?\d+|0x[\da-f]+)$/i.test(String(value ?? ""))
  ) {
    throw new Error(
      `Enter an explicit integer in raw base units for ${input.name || input.type}.`
    );
  }
}

// The visible empty array represents [], while tuple slots retain ABI order.
function builderInputValue(input: ManualParamType, value: any): any {
  const array = input.type.match(/^(.+)\[(\d*)\]$/);
  if (array) {
    const items = Array.isArray(value)
      ? value
      : array[2]
        ? Array.from({ length: Number(array[2]) }, () => "")
        : [];
    return items.map((item) =>
      builderInputValue({ ...input, type: array[1] }, item)
    );
  }
  if (input.type === "tuple")
    return (
      input.components?.map((component, index) =>
        builderInputValue(
          component,
          Array.isArray(value) ? value[index] : undefined
        )
      ) ?? []
    );
  return value ?? (input.type === "bool" ? false : "");
}

type AbiDraft = { text: string; selected: string; values: Record<number, any> };
const emptyAbiDraft = (): AbiDraft => ({ text: "", selected: "", values: {} });

export function BytesBuilderDialog({
  isOpen,
  fieldName,
  onClose,
  onApply,
}: {
  isOpen: boolean;
  fieldName: string;
  onClose: () => void;
  onApply: (bytes: Hex) => void;
}) {
  const functionNameId = useId();
  const [mode, setMode] = useState(0);
  const [functionName, setFunctionName] = useState("");
  const [params, setParams] = useState<ManualParam[]>([
    { type: "uint256", name: "", value: "" },
  ]);
  // These states live outside Modal's unmounted body, including for nested builders.
  const [abiDraft, setAbiDraft] = useState<AbiDraft>(emptyAbiDraft);
  const [addressDraft, setAddressDraft] = useState<AbiDraft>(emptyAbiDraft);
  const [contractAddress, setContractAddress] = useState("");
  const [chainId, setChainId] = useState(1);
  const [isFetching, setIsFetching] = useState(false);
  const fetchRequest = useRef(0);
  useEffect(
    () => () => {
      fetchRequest.current++;
    },
    []
  );
  const [result, setResult] = useState<Hex>();
  const [error, setError] = useState("");
  const [generation, setGeneration] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const activeDraft = mode === 2 ? addressDraft : abiDraft;
  const setActiveDraft = mode === 2 ? setAddressDraft : setAbiDraft;
  const parsed = useMemo(() => {
    if (!activeDraft.text.trim())
      return { entries: [], error: "", iface: undefined };
    try {
      const abi = parseJsonAbi(activeDraft.text);
      const iface = new Interface(JSON.stringify(abi));
      const entries = iface.fragments
        .filter(
          (fragment) =>
            fragment.type === "function" || fragment.type === "constructor"
        )
        .map((fragment) => ({
          label:
            fragment.type === "constructor"
              ? "constructor"
              : fragment.format("sighash"),
          value:
            fragment.type === "constructor"
              ? "__constructor__"
              : fragment.format("sighash"),
          inputs: (JSON.parse(fragment.format("json")).inputs ??
            []) as JsonFragmentType[],
        }));
      return {
        iface,
        entries,
        error: entries.length
          ? ""
          : "This ABI has no functions or constructor to encode.",
      };
    } catch (cause) {
      return {
        entries: [],
        iface: undefined,
        error: cause instanceof Error ? cause.message : "Invalid ABI.",
      };
    }
  }, [activeDraft.text]);
  const selected =
    parsed.entries.find((entry) => entry.value === activeDraft.selected) ??
    parsed.entries[0];
  useEffect(() => {
    if (!generation) return;
    const frame = requestAnimationFrame(() => {
      const body = bodyRef.current;
      const output = outputRef.current;
      if (!body || !output) return;
      body.scrollTo({
        top:
          body.scrollTop +
          output.getBoundingClientRect().top -
          body.getBoundingClientRect().top,
        behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)")
          .matches
          ? "instant"
          : "smooth",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [generation]);
  const invalidate = () => {
    setResult(undefined);
    setError("");
  };
  const generate = () => {
    invalidate();
    try {
      let encoded: Hex;
      if (mode === 0) {
        const name = functionName.trim();
        if (name && !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)) {
          throw new Error(
            "Enter a function name (without parentheses or argument types)."
          );
        }
        const { types, values: preparedValues } = prepareManualParams(params);
        const values = types.map((input, index) =>
          builderInputValue(input, preparedValues[index])
        );
        types.forEach((input, index) =>
          validateBuilderValues(input, values[index])
        );
        encoded = name
          ? encodeFunctionManual(name, types, values)
          : encodeStandard(
              types as Parameters<typeof encodeStandard>[0],
              values
            );
      } else {
        if (parsed.error) throw new Error(parsed.error);
        if (!selected || !parsed.iface)
          throw new Error(
            mode === 2
              ? "Fetch a contract ABI first."
              : "Paste a contract ABI first."
          );
        const values = selected.inputs.map((input, index) =>
          convertBooleans(
            builderInputValue(
              input as ManualParamType,
              activeDraft.values[index]
            ),
            input
          )
        );
        selected.inputs.forEach((input, index) =>
          validateBuilderValues(input as ManualParamType, values[index])
        );
        encoded = (
          selected.value === "__constructor__"
            ? parsed.iface.encodeDeploy(values)
            : parsed.iface.encodeFunctionData(selected.value, values)
        ) as Hex;
      }
      setResult(encoded);
      setGeneration((previous) => previous + 1);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not encode these parameters."
      );
    }
  };
  const clearFetchedAbi = () => {
    fetchRequest.current++;
    setIsFetching(false);
    setAddressDraft(emptyAbiDraft());
    invalidate();
  };
  const fetchAbi = async () => {
    invalidate();
    if (!/^0x[\da-f]{40}$/i.test(contractAddress)) {
      setError("Enter a valid contract address.");
      return;
    }
    const request = ++fetchRequest.current;
    setIsFetching(true);
    setAddressDraft(emptyAbiDraft());
    try {
      const fetched = await fetchContractAbi({
        address: contractAddress,
        chainId,
      });
      if (request !== fetchRequest.current) return;
      const text = new Interface(fetched.abi).formatJson();
      setAddressDraft({ text, selected: "", values: {} });
    } catch (cause) {
      if (request === fetchRequest.current)
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not fetch the contract ABI."
        );
    } finally {
      if (request === fetchRequest.current) setIsFetching(false);
    }
  };
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      isCentered
      scrollBehavior="inside"
    >
      <ModalOverlay bg="blackAlpha.600" />
      <ModalContent
        mx={{ base: 2, md: 4 }}
        maxW="min(46rem, calc(100vw - 1rem))"
        bg="bg.subtle"
        border="1px solid"
        borderColor="border.default"
        rounded="lg"
      >
        <ModalHeader fontSize="md" py={4} pr={12}>
          Build bytes for {fieldName}
        </ModalHeader>
        <ModalCloseButton />
        <Tabs
          index={mode}
          onChange={(index) => {
            fetchRequest.current++;
            setIsFetching(false);
            invalidate();
            setMode(index);
          }}
        >
          <TabList px={{ base: 3, md: 5 }} borderColor="border.default">
            {["Manual", "From ABI", "From Address"].map((label) => (
              <Tab
                key={label}
                px={3}
                py={2.5}
                fontSize="sm"
                color="text.secondary"
                _selected={{
                  color: "text.primary",
                  borderColor: "primary.400",
                }}
                _focusVisible={{
                  outline: "2px solid",
                  outlineColor: "blue.400",
                }}
              >
                {label}
              </Tab>
            ))}
          </TabList>
        </Tabs>
        <ModalBody ref={bodyRef} py={4} px={{ base: 3, md: 5 }}>
          <CompactParameterInputs.Provider value={true}>
            <VStack align="stretch" spacing={4} minW={0}>
              {mode === 0 ? (
                <>
                  <FormControl>
                    <FormLabel
                      htmlFor={functionNameId}
                      fontSize="xs"
                      color="text.secondary"
                      mb={1.5}
                    >
                      Function name{" "}
                      <Box as="span" color="text.tertiary">
                        (optional)
                      </Box>
                    </FormLabel>
                    <Input
                      id={functionNameId}
                      aria-label="Function name"
                      size="sm"
                      h={8}
                      fontFamily="mono"
                      fontSize="13px"
                      borderRadius="md"
                      value={functionName}
                      placeholder="e.g. transfer"
                      onChange={(event) => {
                        invalidate();
                        setFunctionName(event.target.value);
                      }}
                    />
                    <Text fontSize="xs" color="text.tertiary" mt={1.5}>
                      {functionName.trim()
                        ? "Includes the function selector."
                        : "Leave empty to encode parameters without a selector."}
                    </Text>
                  </FormControl>
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" mb={3}>
                      Parameters{" "}
                      <Box as="span" color="text.tertiary" ml={1}>
                        {params.length}
                      </Box>
                    </Text>
                    <ManualParametersEditor
                      rawValues
                      variant="compact"
                      manualParams={params}
                      setManualParams={(next) => {
                        invalidate();
                        setParams(next);
                      }}
                      encode={generate}
                    />
                  </Box>
                </>
              ) : (
                <>
                  {mode === 1 ? (
                    <FormControl>
                      <FormLabel fontSize="xs" color="text.secondary" mb={1.5}>
                        Contract ABI
                      </FormLabel>
                      <Textarea
                        aria-label="Contract ABI"
                        value={abiDraft.text}
                        placeholder={
                          'JSON ABI or ["function transfer(address to, uint256 amount)"]'
                        }
                        fontFamily="mono"
                        fontSize="xs"
                        minH="140px"
                        resize="vertical"
                        borderRadius="md"
                        onChange={(event) => {
                          invalidate();
                          setAbiDraft({
                            text: event.target.value,
                            selected: "",
                            values: {},
                          });
                        }}
                      />
                    </FormControl>
                  ) : (
                    <>
                      <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
                        <FormControl>
                          <FormLabel
                            fontSize="xs"
                            color="text.secondary"
                            mb={1.5}
                          >
                            Contract address
                          </FormLabel>
                          <Input
                            aria-label="Contract address"
                            value={contractAddress}
                            placeholder="0x… or eth:0x…"
                            h={8}
                            fontSize="13px"
                            fontFamily="mono"
                            borderRadius="md"
                            onChange={(event) => {
                              clearFetchedAbi();
                              const resolved = resolveERC3770Address(
                                event.target.value.trim()
                              );
                              setContractAddress(resolved.address);
                              if (resolved.chainId)
                                setChainId(resolved.chainId);
                            }}
                          />
                        </FormControl>
                        <FormControl>
                          <FormLabel
                            fontSize="xs"
                            color="text.secondary"
                            mb={1.5}
                          >
                            Network
                          </FormLabel>
                          <NetworkSelect
                            ariaLabel="Contract network"
                            chainId={chainId}
                            onChange={(id) => {
                              clearFetchedAbi();
                              setChainId(id);
                            }}
                          />
                        </FormControl>
                      </SimpleGrid>
                      <HStack justify="center">
                        <Button
                          size="sm"
                          onClick={fetchAbi}
                          isLoading={isFetching}
                        >
                          Fetch ABI
                        </Button>
                      </HStack>
                    </>
                  )}
                  {parsed.error && (
                    <Text role="alert" fontSize="sm" color="red.300">
                      {parsed.error}
                    </Text>
                  )}
                  {selected && (
                    <>
                      <FormControl>
                        <FormLabel
                          fontSize="xs"
                          color="text.secondary"
                          mb={1.5}
                        >
                          Function
                        </FormLabel>
                        <DarkSelect
                          ariaLabel="ABI function"
                          options={parsed.entries.map(({ label, value }) => ({
                            label,
                            value,
                          }))}
                          selectedOption={{
                            label: selected.label,
                            value: selected.value,
                          }}
                          setSelectedOption={(option) => {
                            if (option) {
                              invalidate();
                              setActiveDraft((previous) => ({
                                ...previous,
                                selected: String(option.value),
                                values: {},
                              }));
                            }
                          }}
                        />
                      </FormControl>
                      <VStack
                        align="stretch"
                        spacing={3}
                        key={`${mode}:${selected.value}:${activeDraft.text}`}
                      >
                        {selected.inputs.map((input, index) => (
                          <Box key={index} minW={0}>
                            {renderInputFields({
                              chainId,
                              input,
                              value: builderInputValue(
                                input as ManualParamType,
                                activeDraft.values[index]
                              ),
                              rawValues: true,
                              immediateUpdates: true,
                              allowBytesBuilder: true,
                              ariaLabel: `Argument ${index + 1} ${input.name || input.type}`,
                              onChange: (event) => {
                                invalidate();
                                setActiveDraft((previous) => ({
                                  ...previous,
                                  values: {
                                    ...previous.values,
                                    [index]: event.target.value,
                                  },
                                }));
                              },
                              setFunctionIsDisabled: () => {},
                              isError: false,
                              onKeyDown: (event) => {
                                if (event.key === "Enter") generate();
                              },
                            })}
                          </Box>
                        ))}
                        {!selected.inputs.length && (
                          <Text fontSize="xs" color="text.tertiary">
                            No parameters required.
                          </Text>
                        )}
                      </VStack>
                    </>
                  )}
                </>
              )}
              <HStack justify="center">
                <Button
                  size="sm"
                  onClick={generate}
                  isDisabled={
                    mode !== 0 && (!selected || !!parsed.error || isFetching)
                  }
                >
                  Generate bytes
                </Button>
              </HStack>
              {error && (
                <Alert status="error" alignItems="start" rounded="md">
                  <AlertIcon />
                  <Text whiteSpace="pre-wrap" overflowWrap="anywhere">
                    {error}
                  </Text>
                </Alert>
              )}
              {result !== undefined && (
                <Box ref={outputRef}>
                  <HStack justify="space-between" mb={2}>
                    <Text fontSize="sm" fontWeight="medium">
                      Encoded bytes{" "}
                      <Box
                        as="span"
                        fontSize="xs"
                        color="text.secondary"
                        ml={1}
                      >
                        {(result.length - 2) / 2} bytes
                      </Box>
                    </Text>
                    <CopyToClipboard textToCopy={result} />
                  </HStack>
                  <Text
                    as="pre"
                    bg="bg.base"
                    border="1px solid"
                    borderColor="border.default"
                    rounded="md"
                    p={3}
                    fontFamily="mono"
                    fontSize="xs"
                    whiteSpace="pre-wrap"
                    overflowWrap="anywhere"
                    maxH="12rem"
                    overflowY="auto"
                    tabIndex={0}
                  >
                    {result}
                  </Text>
                </Box>
              )}
            </VStack>
          </CompactParameterInputs.Provider>
        </ModalBody>
        <ModalFooter
          gap={2}
          py={3}
          px={{ base: 3, md: 5 }}
          borderTop="1px solid"
          borderColor="border.default"
          flexWrap="wrap"
        >
          <Button size="sm" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            bg="primary.600"
            _hover={{ bg: "primary.500" }}
            isDisabled={result === undefined}
            rightIcon={<ArrowDownIcon aria-hidden="true" />}
            onClick={() => {
              if (result !== undefined) onApply(result);
            }}
          >
            Set bytes value
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
