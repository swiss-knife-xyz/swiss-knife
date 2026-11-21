"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  FormControl,
  FormLabel,
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
} from "@chakra-ui/react";
import type { JsonFragmentType } from "ethers";
import type { Hex } from "viem";
import { Wrench } from "lucide-react";
import { DarkSelect } from "@/components/DarkSelect";
import { BytesInput } from "./inputs/BytesInput";
import {
  ManualParametersEditor,
  type ManualParam,
  prepareManualParams,
} from "@/components/calldata/ManualParametersEditor";
import {
  encodeStandard,
  encodeFunctionManual,
  type ManualParamType,
} from "@/lib/encoder";

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

/** Typed builder shared by contract fields, the encoder and nested byte payloads. */
export function ContractBytesInput({
  input,
  value,
  onChange,
  ...props
}: {
  input: JsonFragmentType;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  isInvalid: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Box>
      <BytesInput
        input={input}
        value={value}
        onChange={onChange}
        {...props}
        headerAction={
          <Button
            className="bytes-builder-action"
            leftIcon={<Wrench size={12} aria-hidden="true" />}
            size="xs"
            variant="outline"
            flexShrink={0}
            position="relative"
            zIndex={1}
            h={7}
            bg="bg.subtle"
            borderColor={props.isInvalid ? "red.500" : "whiteAlpha.200"}
            borderBottom={0}
            borderTopRadius="lg"
            borderBottomRadius={0}
            _hover={{ bg: "bg.muted", color: "text.primary" }}
            _active={{ bg: "bg.emphasis" }}
            _after={{
              content: '""',
              position: "absolute",
              bottom: "-1px",
              left: 0,
              right: 0,
              h: "2px",
              bg: "bg.subtle",
            }}
            onClick={() => setIsOpen(true)}
          >
            Build bytes
          </Button>
        }
      />
      <BytesBuilderDialog
        isOpen={isOpen}
        fieldName={input.name || "bytes"}
        onClose={() => setIsOpen(false)}
        onApply={(bytes) => {
          onChange({
            target: { value: bytes },
          } as React.ChangeEvent<HTMLInputElement>);
          setIsOpen(false);
        }}
      />
    </Box>
  );
}

function BytesBuilderDialog({
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
  const [mode, setMode] = useState("parameters");
  const [functionName, setFunctionName] = useState("");
  const [params, setParams] = useState<ManualParam[]>([
    { type: "uint256", name: "", value: "" },
  ]);
  const [result, setResult] = useState<Hex>();
  const [error, setError] = useState("");
  const [generation, setGeneration] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
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
        behavior: "smooth",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [generation]);
  const invalidate = () => {
    setResult(undefined);
    setError("");
  };
  const generate = () => {
    setResult(undefined);
    setError("");
    try {
      if (
        mode === "function" &&
        !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(functionName.trim())
      ) {
        throw new Error(
          "Enter a function name (without parentheses or argument types)."
        );
      }
      const { types, values } = prepareManualParams(params);
      types.forEach((input, i) => validateBuilderValues(input, values[i]));
      setResult(
        mode === "function"
          ? encodeFunctionManual(functionName.trim(), types, values)
          : encodeStandard(
              types as Parameters<typeof encodeStandard>[0],
              values
            )
      );
      setGeneration((previous) => previous + 1);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not encode these parameters."
      );
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
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(8px)" />
      <ModalContent
        mx={{ base: 2, md: 4 }}
        maxW="min(42rem, calc(100vw - 1rem))"
        bg="bg.muted"
        border="1px solid"
        borderColor="border.default"
        rounded="lg"
      >
        <ModalHeader fontSize="md" pt={5} pb={4} pr={12}>
          Build bytes for {fieldName}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody ref={bodyRef} pt={0}>
          <VStack align="stretch" spacing={4} minW={0}>
            <FormControl>
              <FormLabel fontSize="sm" color="text.secondary">
                Payload format
              </FormLabel>
              <DarkSelect
                ariaLabel="Payload format"
                options={[
                  { label: "ABI parameters", value: "parameters" },
                  { label: "Function calldata", value: "function" },
                ]}
                selectedOption={{
                  label:
                    mode === "function"
                      ? "Function calldata"
                      : "ABI parameters",
                  value: mode,
                }}
                setSelectedOption={(option) => {
                  if (!option) return;
                  invalidate();
                  setMode(String(option.value));
                }}
                size="sm"
              />
            </FormControl>
            {mode === "function" && (
              <FormControl>
                <FormLabel
                  htmlFor={functionNameId}
                  fontSize="sm"
                  color="text.secondary"
                >
                  Function name
                </FormLabel>
                <Input
                  id={functionNameId}
                  size="sm"
                  value={functionName}
                  placeholder="e.g. transfer"
                  onChange={(e) => {
                    invalidate();
                    setFunctionName(e.target.value);
                  }}
                />
              </FormControl>
            )}
            <ManualParametersEditor
              rawValues
              variant="plain"
              manualParams={params}
              setManualParams={(next) => {
                invalidate();
                setParams(next);
              }}
              encode={generate}
            />
            <Box display="flex" justifyContent="center">
              <Button size="sm" fontSize="md" onClick={generate}>
                Generate bytes
              </Button>
            </Box>
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
                <Text fontSize="sm" fontWeight="semibold" mb={2}>
                  Encoded bytes
                </Text>
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
        </ModalBody>
        <ModalFooter gap={2} pt={4} pb={5} flexWrap="wrap">
          <Button size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            bg="bg.emphasis"
            isDisabled={result === undefined}
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
