import {
  Box,
  Button,
  Center,
  HStack,
  InputProps,
  Spacer,
  IconButton,
  Text,
} from "@chakra-ui/react";
import { useCompactParameterInputs } from "../ParameterInputStyle";
import { JsonFragment, JsonFragmentType } from "ethers";
import { renderInputFields } from "../Renderer";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  DeleteIcon,
} from "@chakra-ui/icons";
import { InputField } from "@/components/InputField";
import { InputInfo } from "./InputInfo";
import isEqual from "lodash/isEqual";

interface InputFieldProps extends InputProps {
  chainId: number;
  input: JsonFragmentType;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setFunctionIsDisabled: (value: boolean) => void;
  isError: boolean;
  allowBytesBuilder?: boolean;
  immediateUpdates?: boolean;
  rawValues?: boolean;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

interface ArrayElement {
  id: string;
  value: any;
}

interface ArrayInputState {
  [key: string]: ArrayElement;
}

const ArrayElement = ({
  id,
  index,
  chainId,
  input,
  childType,
  value,
  updateArrayInputState,
  removeFromArrayInputState,
  updateArrayReadIsDisabled,
  isError,
  allowBytesBuilder,
  immediateUpdates,
  rawValues,
  onKeyDown,
  fixedLength,
  focusOnMount,
}: {
  id: string;
  index: number;
  chainId: number;
  input: JsonFragment;
  childType: string;
  value: string;
  updateArrayInputState: (id: string, value: string) => void;
  removeFromArrayInputState: (id: string) => void;
  updateArrayReadIsDisabled: (id: string, value: boolean) => void;
  isError: boolean;
  allowBytesBuilder?: boolean;
  immediateUpdates?: boolean;
  rawValues?: boolean;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  fixedLength?: number;
  focusOnMount: boolean;
}) => {
  const compact = useCompactParameterInputs();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!focusOnMount) return;
    const frame = requestAnimationFrame(() => {
      const root = fieldRef.current;
      const field =
        root?.querySelector<HTMLElement>(
          'input:not([disabled]):not([readonly]):not([type="hidden"]):not([value="[ ]"]), textarea:not([disabled]):not([readonly]), select:not([disabled])'
        ) ?? root?.querySelector<HTMLElement>("button:not([disabled])");
      field?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [focusOnMount]);

  return (
    <Box
      data-parameter-branch=""
      minW={0}
      mt={2}
      p={compact ? 0 : { base: 1.5, md: 3 }}
      bg={compact ? "transparent" : "whiteAlpha.50"}
      border={compact ? "1px solid" : undefined}
      borderColor="border.default"
      borderRadius={compact ? "md" : "lg"}
    >
      <HStack
        px={0}
        py={0}
        spacing={compact ? 0 : 2}
        borderBottom={compact && !isCollapsed ? "1px solid" : undefined}
        borderColor="border.subtle"
      >
        <Button
          variant="ghost"
          size="xs"
          h={compact ? 9 : 7}
          minW={0}
          flex={1}
          justifyContent="flex-start"
          borderRadius={compact ? 0 : "md"}
          borderTopLeftRadius="md"
          borderBottomLeftRadius={isCollapsed ? "md" : 0}
          _hover={{ bg: "whiteAlpha.100" }}
          px={compact ? 3 : 2}
          color="text.secondary"
          fontWeight="normal"
          fontFamily={compact ? "mono" : undefined}
          aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${input.name || "array"} item ${index}`}
          data-parameter-toggle=""
          aria-expanded={!isCollapsed}
          leftIcon={isCollapsed ? <ChevronRightIcon /> : <ChevronDownIcon />}
          onClick={() => setIsCollapsed((previous) => !previous)}
        >
          {compact ? `[${index}]` : `i = ${index}`}
        </Button>
        <IconButton
          aria-label={`Remove ${input.name || "array"} item ${index}`}
          icon={<DeleteIcon />}
          variant="ghost"
          borderRadius={compact ? 0 : "md"}
          borderTopRightRadius="md"
          borderBottomRightRadius={isCollapsed ? "md" : 0}
          color="text.tertiary"
          _hover={{ color: "red.300", bg: "whiteAlpha.100" }}
          isDisabled={fixedLength !== undefined}
          size="xs"
          h={compact ? 9 : 6}
          minW={compact ? 9 : 6}
          onClick={() => removeFromArrayInputState(id)}
        />
      </HStack>
      <Box
        ref={fieldRef}
        p={compact ? 2 : 0}
        display={isCollapsed ? "none" : undefined}
        minW={0}
      >
        {renderInputFields({
          chainId,
          input: { ...input, type: childType },
          value,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
            updateArrayInputState(id, e.target.value),
          setFunctionIsDisabled: (value: boolean) =>
            updateArrayReadIsDisabled(id, value),
          onKeyDown,
          isError,
          allowBytesBuilder,
          immediateUpdates,
          rawValues,
          isArrayChild: true,
        })}
      </Box>
    </Box>
  );
};

export const ArrayInput = ({
  chainId,
  input,
  onChange,
  setFunctionIsDisabled,
  isError,
  allowBytesBuilder,
  immediateUpdates,
  rawValues,
  onKeyDown,
  value,
}: InputFieldProps) => {
  const compact = useCompactParameterInputs();
  // removes [] from the end of the array type
  const baseType = input.type!.replace(/\[\d*\]$/, "");
  const fixedMatch = input.type!.match(/\[(\d+)\]$/);
  const fixedLength = fixedMatch ? Number(fixedMatch[1]) : undefined;

  const [arrayInputState, setArrayInputsState] = useState<ArrayInputState>(
    () => {
      const values = Array.isArray(value)
        ? value
        : Array.from({ length: fixedLength ?? 0 }, () => "");
      return Object.fromEntries(
        values.map((v, i) => [`initial-${i}`, { id: `initial-${i}`, value: v }])
      );
    }
  );
  const [arrayReadIsDisabled, setArrayReadIsDisabled] = useState<
    Record<string, boolean>
  >({});

  const nextElementId = useRef(0);
  const focusRequestedId = useRef<string | null>(null);
  const prevArrayInputStateRef = useRef(arrayInputState);
  const prevArrayReadIsDisabledRef = useRef(arrayReadIsDisabled);

  const updateArrayInputState = useCallback((id: string, value: string) => {
    setArrayInputsState((prev) => ({
      ...prev,
      [id]: { ...prev[id], value },
    }));
  }, []);

  const updateArrayReadIsDisabled = useCallback(
    (id: string, value: boolean) => {
      setArrayReadIsDisabled((prev) => ({
        ...prev,
        [id]: value,
      }));
    },
    []
  );

  const addNewArrayElement = useCallback(() => {
    // unique id so that react re-renders the correct element when it is removed
    const newId = `element-${++nextElementId.current}`;
    focusRequestedId.current = newId;
    setArrayInputsState((prev) => ({
      ...prev,
      [newId]: { id: newId, value: "" },
    }));
  }, []);

  const removeFromArrayInputState = useCallback((id: string) => {
    setArrayInputsState((prev) => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  useEffect(() => {
    if (!isEqual(arrayInputState, prevArrayInputStateRef.current)) {
      onChange({
        target: {
          value: Object.values(arrayInputState).map((el) => el.value),
        },
      } as any);
      prevArrayInputStateRef.current = arrayInputState;
    }
  }, [arrayInputState, onChange]);

  useEffect(() => {
    if (!isEqual(arrayReadIsDisabled, prevArrayReadIsDisabledRef.current)) {
      setFunctionIsDisabled(Object.values(arrayReadIsDisabled).some(Boolean));
      prevArrayReadIsDisabledRef.current = arrayReadIsDisabled;
    }
  }, [arrayReadIsDisabled, setFunctionIsDisabled]);

  const length = Object.keys(arrayInputState).length;

  return (
    <Box maxW={compact ? "full" : "30rem"} minW={0}>
      <HStack spacing={2} align="start">
        <InputInfo input={input} />
        <Spacer />
        <Text
          color="text.secondary"
          fontSize={compact ? "xs" : "sm"}
          whiteSpace="nowrap"
        >
          {compact
            ? `${length} ${length === 1 ? "item" : "items"}`
            : `(length = ${length})`}
        </Text>
      </HStack>
      {length === 0 &&
        (compact ? (
          <Text color="text.tertiary" fontSize="xs" py={2}>
            No items
          </Text>
        ) : (
          <InputField value={"[ ]"} placeholder="" onChange={() => {}} />
        ))}
      {Object.entries(arrayInputState).map(([id, element], index) => (
        <ArrayElement
          key={id}
          id={id}
          index={index}
          chainId={chainId}
          input={input}
          childType={baseType}
          fixedLength={fixedLength}
          focusOnMount={id === focusRequestedId.current}
          value={element.value}
          updateArrayInputState={updateArrayInputState}
          removeFromArrayInputState={removeFromArrayInputState}
          updateArrayReadIsDisabled={updateArrayReadIsDisabled}
          isError={isError}
          allowBytesBuilder={allowBytesBuilder}
          immediateUpdates={immediateUpdates}
          rawValues={rawValues}
          onKeyDown={onKeyDown}
        />
      ))}
      <Center mt={2}>
        <Button
          onClick={addNewArrayElement}
          size={compact ? "xs" : undefined}
          h={compact ? 7 : undefined}
          variant={compact ? "ghost" : undefined}
          color={compact ? "text.secondary" : undefined}
          fontWeight={compact ? "medium" : undefined}
          isDisabled={fixedLength !== undefined}
        >
          + Add
        </Button>
      </Center>
    </Box>
  );
};
