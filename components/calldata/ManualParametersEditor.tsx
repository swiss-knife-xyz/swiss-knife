"use client";

import React from "react";
import {
  Box,
  HStack,
  VStack,
  Text,
  IconButton,
  Spacer,
} from "@chakra-ui/react";
import { AddIcon, DeleteIcon } from "@chakra-ui/icons";
import { InputField } from "@/components/InputField";
import { DarkSelect } from "@/components/DarkSelect";
import { DarkButton } from "@/components/DarkButton";
import { renderInputFields } from "@/components/fnParams/Renderer";
import { convertBooleans } from "@/lib/convertBooleans";
import { type ManualParamType } from "@/lib/encoder";

const opt = (t: string) => ({ label: t, value: t });

const typeOptions = [
  {
    label: "Common",
    options: [
      opt("address"),
      opt("bool"),
      opt("bytes"),
      opt("bytes32"),
      opt("int256"),
      opt("string"),
      opt("tuple"),
      opt("uint256"),
    ],
  },
  {
    label: "Arrays",
    options: [
      opt("address[]"),
      opt("bool[]"),
      opt("bytes[]"),
      opt("bytes32[]"),
      opt("int256[]"),
      opt("string[]"),
      opt("tuple[]"),
      opt("uint256[]"),
    ],
  },
  {
    label: "Unsigned Integers",
    options: [
      opt("uint8"),
      opt("uint16"),
      opt("uint32"),
      opt("uint64"),
      opt("uint128"),
    ],
  },
  {
    label: "Signed Integers",
    options: [
      opt("int8"),
      opt("int16"),
      opt("int32"),
      opt("int64"),
      opt("int128"),
    ],
  },
  {
    label: "Fixed Bytes",
    options: [
      opt("bytes1"),
      opt("bytes2"),
      opt("bytes4"),
      opt("bytes8"),
      opt("bytes16"),
      opt("bytes20"),
    ],
  },
];

// Flat list for tuple component selector (no nested tuples)
const componentTypeOptions = [
  {
    label: "Common",
    options: [
      opt("address"),
      opt("bool"),
      opt("bytes"),
      opt("bytes32"),
      opt("int256"),
      opt("string"),
      opt("uint256"),
    ],
  },
  {
    label: "Arrays",
    options: [
      opt("address[]"),
      opt("bool[]"),
      opt("bytes[]"),
      opt("bytes32[]"),
      opt("int256[]"),
      opt("string[]"),
      opt("uint256[]"),
    ],
  },
  {
    label: "Unsigned Integers",
    options: [
      opt("uint8"),
      opt("uint16"),
      opt("uint32"),
      opt("uint64"),
      opt("uint128"),
    ],
  },
  {
    label: "Signed Integers",
    options: [
      opt("int8"),
      opt("int16"),
      opt("int32"),
      opt("int64"),
      opt("int128"),
    ],
  },
  {
    label: "Fixed Bytes",
    options: [
      opt("bytes1"),
      opt("bytes2"),
      opt("bytes4"),
      opt("bytes8"),
      opt("bytes16"),
      opt("bytes20"),
    ],
  },
];

// =============================================================================
// MANUAL PARAM TYPES
// =============================================================================

interface TupleComponent {
  type: string;
  name: string;
}

export interface ManualParam {
  type: string;
  name: string;
  value: any;
  components?: TupleComponent[];
}

/** Check if a type needs tuple component definitions */
export const isTupleType = (type: string) =>
  type === "tuple" || type === "tuple[]";

/** Shared preparation for the standalone encoder and the in-form builder. */
export function prepareManualParams(params: ManualParam[]) {
  const types: ManualParamType[] = params.map(({ type, name, components }) => ({
    type,
    name: name || "",
    ...(isTupleType(type) && components?.length ? { components } : {}),
  }));
  return {
    types,
    values: params.map((param, i) => convertBooleans(param.value, types[i])),
  };
}

/** The standalone encoder's controlled typed-parameter editor, without routing or results. */
export function ManualParametersEditor({
  manualParams,
  setManualParams,
  encode,
  rawValues = false,
}: {
  manualParams: ManualParam[];
  setManualParams: React.Dispatch<React.SetStateAction<ManualParam[]>>;
  encode: () => void;
  rawValues?: boolean;
}) {
  const addManualParam = () => {
    setManualParams((prev) => [
      ...prev,
      { type: "uint256", name: "", value: "" },
    ]);
  };

  const removeManualParam = (index: number) => {
    setManualParams((prev) => prev.filter((_, i) => i !== index));
  };

  const updateManualParamType = (index: number, type: string) => {
    setManualParams((prev) =>
      prev.map((p, i) => {
        if (i !== index) return p;
        const updated: ManualParam = { ...p, type, value: "" };
        // Initialize components when switching to a tuple type
        if (isTupleType(type) && !p.components?.length) {
          updated.components = [{ type: "uint256", name: "" }];
        }
        // Clear components when switching away from tuple
        if (!isTupleType(type)) {
          updated.components = undefined;
        }
        return updated;
      })
    );
  };

  const updateManualParamValue = (index: number, value: any) => {
    setManualParams((prev) =>
      prev.map((p, i) => (i === index ? { ...p, value } : p))
    );
  };

  const updateManualParamName = (index: number, name: string) => {
    setManualParams((prev) =>
      prev.map((p, i) => (i === index ? { ...p, name } : p))
    );
  };

  // --- Tuple Component Handlers ---

  const addTupleComponent = (paramIndex: number) => {
    setManualParams((prev) =>
      prev.map((p, i) => {
        if (i !== paramIndex) return p;
        const prevValues = Array.isArray(p.value) ? p.value : [];
        return {
          ...p,
          value:
            p.type === "tuple[]"
              ? prevValues.map((row) => [
                  ...(Array.isArray(row) ? row : []),
                  "",
                ])
              : [...prevValues, ""],
          components: [...(p.components || []), { type: "uint256", name: "" }],
        };
      })
    );
  };

  const removeTupleComponent = (paramIndex: number, compIndex: number) => {
    setManualParams((prev) =>
      prev.map((p, i) => {
        if (i !== paramIndex) return p;
        const prevValues = Array.isArray(p.value) ? [...p.value] : [];
        const nextValues =
          p.type === "tuple[]"
            ? prevValues.map((row) =>
                (Array.isArray(row) ? row : []).filter(
                  (_, ci) => ci !== compIndex
                )
              )
            : prevValues.filter((_, ci) => ci !== compIndex);
        return {
          ...p,
          value: nextValues,
          components: (p.components || []).filter((_, ci) => ci !== compIndex),
        };
      })
    );
  };

  const updateTupleFieldValue = (
    paramIndex: number,
    fieldIndex: number,
    fieldValue: any
  ) => {
    setManualParams((prev) =>
      prev.map((p, i) => {
        if (i !== paramIndex) return p;
        const arr = Array.isArray(p.value) ? [...p.value] : [];
        arr[fieldIndex] = fieldValue;
        return { ...p, value: arr };
      })
    );
  };

  const updateTupleComponentType = (
    paramIndex: number,
    compIndex: number,
    type: string
  ) => {
    setManualParams((prev) =>
      prev.map((p, i) =>
        i === paramIndex
          ? {
              ...p,
              value: "",
              components: (p.components || []).map((c, ci) =>
                ci === compIndex ? { ...c, type } : c
              ),
            }
          : p
      )
    );
  };

  const updateTupleComponentName = (
    paramIndex: number,
    compIndex: number,
    name: string
  ) => {
    setManualParams((prev) =>
      prev.map((p, i) =>
        i === paramIndex
          ? {
              ...p,
              components: (p.components || []).map((c, ci) =>
                ci === compIndex ? { ...c, name } : c
              ),
            }
          : p
      )
    );
  };

  return (
    <VStack spacing={3} align="stretch">
      {manualParams.map((param, i) => (
        <Box
          key={`${manualParams.length}-${i}-${param.type}-${JSON.stringify(param.components?.map((c) => c.type))}`}
          p={{ base: 2, md: 4 }}
          bg="whiteAlpha.50"
          border="1px solid"
          borderColor="border.subtle"
          borderRadius="lg"
          position="relative"
        >
          {/* Header row: index badge + type selector + delete */}
          <HStack mb={3} justify="space-between" align="start" spacing={3}>
            <HStack spacing={3} flex={1} minW={0} flexWrap="wrap">
              <Box
                bg="whiteAlpha.100"
                px={2}
                py={0.5}
                borderRadius="md"
                fontSize="xs"
                color="text.tertiary"
                fontFamily="mono"
                flexShrink={0}
              >
                [{i}]
              </Box>
              <Box w={{ base: "full", md: "200px" }} minW={0}>
                <DarkSelect
                  isCreatable
                  ariaLabel={`Parameter ${i + 1} type`}
                  placeholder="Select type..."
                  options={typeOptions}
                  selectedOption={
                    param.type ? { label: param.type, value: param.type } : null
                  }
                  setSelectedOption={(opt) => {
                    if (opt) updateManualParamType(i, opt.value as string);
                  }}
                />
              </Box>
              <Box w={{ base: "full", md: "180px" }} minW={0}>
                <InputField
                  placeholder="name (optional)"
                  value={param.name}
                  onChange={(e) => updateManualParamName(i, e.target.value)}
                  size="sm"
                />
              </Box>
            </HStack>
            <IconButton
              aria-label="Remove parameter"
              icon={<DeleteIcon />}
              size="xs"
              variant="ghost"
              color="text.tertiary"
              _hover={{ color: "red.300", bg: "whiteAlpha.100" }}
              onClick={() => removeManualParam(i)}
              isDisabled={false}
              flexShrink={0}
            />
          </HStack>

          {/* Tuple fields — merged type/name/value per field */}
          {param.type === "tuple" && param.components?.length ? (
            <Box>
              <VStack spacing={3} align="stretch">
                {param.components.map((comp, ci) => {
                  const fieldValues = Array.isArray(param.value)
                    ? param.value
                    : [];
                  return (
                    <Box
                      key={ci}
                      p={3}
                      bg="whiteAlpha.50"
                      border="1px solid"
                      borderColor="border.subtle"
                      borderRadius="md"
                    >
                      {/* Field header: index + type + name + delete */}
                      <HStack spacing={2} mb={2} flexWrap="wrap">
                        <Box
                          bg="whiteAlpha.100"
                          px={1.5}
                          py={0.5}
                          borderRadius="sm"
                          fontSize="xs"
                          color="text.tertiary"
                          fontFamily="mono"
                          flexShrink={0}
                        >
                          {ci}
                        </Box>
                        <Box w={{ base: "full", md: "160px" }} minW={0}>
                          <DarkSelect
                            isCreatable
                            ariaLabel={`Parameter ${i + 1} field ${ci + 1} type`}
                            placeholder="Type"
                            options={componentTypeOptions}
                            selectedOption={
                              comp.type
                                ? {
                                    label: comp.type,
                                    value: comp.type,
                                  }
                                : null
                            }
                            setSelectedOption={(opt) => {
                              if (opt)
                                updateTupleComponentType(
                                  i,
                                  ci,
                                  opt.value as string
                                );
                            }}
                          />
                        </Box>
                        <Box w={{ base: "full", md: "180px" }} minW={0}>
                          <InputField
                            placeholder="name (optional)"
                            value={comp.name}
                            onChange={(e) =>
                              updateTupleComponentName(i, ci, e.target.value)
                            }
                            size="sm"
                          />
                        </Box>
                        <Spacer />
                        <IconButton
                          aria-label="Remove field"
                          icon={<DeleteIcon />}
                          size="xs"
                          variant="ghost"
                          color="text.tertiary"
                          _hover={{
                            color: "red.300",
                            bg: "whiteAlpha.100",
                          }}
                          onClick={() => removeTupleComponent(i, ci)}
                          isDisabled={(param.components || []).length <= 1}
                        />
                      </HStack>
                      {/* Field value input */}
                      <Box>
                        {renderInputFields({
                          chainId: 1,
                          immediateUpdates: true,
                          rawValues,
                          input: {
                            type: comp.type,
                            name: comp.name || `field_${ci}`,
                          },
                          value: fieldValues[ci] || "",
                          onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                            updateTupleFieldValue(i, ci, e.target.value),
                          setFunctionIsDisabled: () => {},
                          isError: false,
                          onKeyDown: (
                            e: React.KeyboardEvent<HTMLInputElement>
                          ) => {
                            if (e.key === "Enter") encode();
                          },
                        })}
                      </Box>
                    </Box>
                  );
                })}
                <Box>
                  <DarkButton onClick={() => addTupleComponent(i)} size="xs">
                    <HStack spacing={1}>
                      <AddIcon boxSize={2.5} />
                      <Text fontSize="xs">Add Field</Text>
                    </HStack>
                  </DarkButton>
                </Box>
              </VStack>
            </Box>
          ) : param.type === "tuple[]" && param.components?.length ? (
            <>
              {/* tuple[] — component definition separate, then array input */}
              <Box
                mb={3}
                p={3}
                bg="whiteAlpha.50"
                border="1px solid"
                borderColor="border.subtle"
                borderRadius="md"
              >
                <Text
                  color="text.tertiary"
                  fontSize="xs"
                  fontWeight="medium"
                  mb={2}
                >
                  TUPLE STRUCTURE
                </Text>
                <VStack spacing={2} align="stretch">
                  {param.components.map((comp, ci) => (
                    <HStack key={ci} spacing={2} flexWrap="wrap">
                      <Box
                        bg="whiteAlpha.100"
                        px={1.5}
                        py={0.5}
                        borderRadius="sm"
                        fontSize="xs"
                        color="text.tertiary"
                        fontFamily="mono"
                        flexShrink={0}
                      >
                        {ci}
                      </Box>
                      <Box w={{ base: "full", md: "160px" }} minW={0}>
                        <DarkSelect
                          isCreatable
                          ariaLabel={`Parameter ${i + 1} field ${ci + 1} type`}
                          placeholder="Type"
                          options={componentTypeOptions}
                          selectedOption={
                            comp.type
                              ? {
                                  label: comp.type,
                                  value: comp.type,
                                }
                              : null
                          }
                          setSelectedOption={(opt) => {
                            if (opt)
                              updateTupleComponentType(
                                i,
                                ci,
                                opt.value as string
                              );
                          }}
                        />
                      </Box>
                      <Box w={{ base: "full", md: "180px" }} minW={0}>
                        <InputField
                          placeholder="name (optional)"
                          value={comp.name}
                          onChange={(e) =>
                            updateTupleComponentName(i, ci, e.target.value)
                          }
                          size="sm"
                        />
                      </Box>
                      <Spacer />
                      <IconButton
                        aria-label="Remove field"
                        icon={<DeleteIcon />}
                        size="xs"
                        variant="ghost"
                        color="text.tertiary"
                        _hover={{
                          color: "red.300",
                          bg: "whiteAlpha.100",
                        }}
                        onClick={() => removeTupleComponent(i, ci)}
                        isDisabled={(param.components || []).length <= 1}
                      />
                    </HStack>
                  ))}
                  <Box>
                    <DarkButton onClick={() => addTupleComponent(i)} size="xs">
                      <HStack spacing={1}>
                        <AddIcon boxSize={2.5} />
                        <Text fontSize="xs">Add Field</Text>
                      </HStack>
                    </DarkButton>
                  </Box>
                </VStack>
              </Box>
              <Box>
                {renderInputFields({
                  chainId: 1,
                  immediateUpdates: true,
                  rawValues,
                  input: {
                    type: param.type,
                    name: param.name || `param_${i}`,
                    components: param.components.map((c) => ({
                      type: c.type,
                      name: c.name || "",
                    })),
                  },
                  value: param.value || "",
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                    updateManualParamValue(i, e.target.value),
                  setFunctionIsDisabled: () => {},
                  isError: false,
                  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === "Enter") encode();
                  },
                })}
              </Box>
            </>
          ) : (
            /* Non-tuple value input */
            <Box>
              {renderInputFields({
                chainId: 1,
                immediateUpdates: true,
                rawValues,
                input: { type: param.type, name: param.name || `param_${i}` },
                value: param.value || "",
                onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                  updateManualParamValue(i, e.target.value),
                setFunctionIsDisabled: () => {},
                isError: false,
                onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === "Enter") encode();
                },
              })}
            </Box>
          )}
        </Box>
      ))}

      <Box>
        <DarkButton onClick={addManualParam} size="sm">
          <HStack spacing={2}>
            <AddIcon boxSize={3} />
            <Text>Add Parameter</Text>
          </HStack>
        </DarkButton>
      </Box>
    </VStack>
  );
}
