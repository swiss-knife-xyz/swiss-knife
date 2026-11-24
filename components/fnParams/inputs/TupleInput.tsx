import React, { useEffect, useState, useCallback, useRef } from "react";
import { Box, Button, InputProps } from "@chakra-ui/react";
import { JsonFragmentType } from "ethers";
import { useCompactParameterInputs } from "../ParameterInputStyle";
import { InputInfo } from "./InputInfo";
import { renderInputFields } from "../Renderer";
import { ChevronDownIcon, ChevronRightIcon } from "@chakra-ui/icons";
import { isEqual } from "lodash";

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
  isArrayChild?: boolean;
}

interface TupleInputState {
  [key: number]: any;
}

export const TupleInput: React.FC<InputFieldProps> = ({
  chainId,
  input,
  onChange,
  setFunctionIsDisabled,
  isError,
  allowBytesBuilder,
  immediateUpdates,
  rawValues,
  onKeyDown,
  isArrayChild,
  value,
}) => {
  const compact = useCompactParameterInputs();
  const [tupleInputsState, setTupleInputsState] = useState<TupleInputState>(
    () =>
      Array.isArray(value)
        ? Object.fromEntries(value.map((v, i) => [i, v]))
        : {}
  );
  const [tupleReadIsDisabled, setTupleReadIsDisabled] = useState<
    Record<number, boolean>
  >({});
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Use refs to store previous values for comparison
  const prevTupleInputStateRef = useRef(tupleInputsState);
  const prevTupleReadIsDisabledRef = useRef(tupleReadIsDisabled);

  // Memoize the update functions with useCallback
  const updateTupleInputState = useCallback((index: number, value: string) => {
    setTupleInputsState((prev) => {
      const newState = {
        ...prev,
        [index]: value,
      };
      // Only update if the value actually changed
      return isEqual(prev, newState) ? prev : newState;
    });
  }, []); // Empty dependency array since we're using the function form of setState

  const updateTupleReadIsDisabled = useCallback(
    (index: number, value: boolean) => {
      setTupleReadIsDisabled((prev) => {
        const newState = {
          ...prev,
          [index]: value,
        };
        // Only update if the value actually changed
        return isEqual(prev, newState) ? prev : newState;
      });
    },
    []
  ); // Empty dependency array since we're using the function form of setState

  // Memoize isAnyChildInvalid calculation
  const isAnyChildInvalid = React.useMemo(() => {
    return Object.values(input.components || []).some(
      (_, i) =>
        tupleInputsState[i] === undefined ||
        tupleInputsState[i] === null ||
        tupleInputsState[i].toString().trim().length === 0
    );
  }, [tupleInputsState, input.components]);

  // Handle parent state updates with debouncing
  useEffect(() => {
    if (!isEqual(tupleInputsState, prevTupleInputStateRef.current)) {
      if (immediateUpdates) {
        prevTupleInputStateRef.current = tupleInputsState;
        onChange({ target: { value: Object.values(tupleInputsState) } } as any);
        return;
      }
      const timeoutId = setTimeout(() => {
        onChange({
          target: {
            value: Object.values(tupleInputsState),
          },
        } as any);
        prevTupleInputStateRef.current = tupleInputsState;
      }, 100); // Add small debounce

      return () => clearTimeout(timeoutId);
    }
  }, [tupleInputsState, onChange, immediateUpdates]);

  // Handle disabled state updates with debouncing
  useEffect(() => {
    if (!isEqual(tupleReadIsDisabled, prevTupleReadIsDisabledRef.current)) {
      const timeoutId = setTimeout(() => {
        setFunctionIsDisabled(Object.values(tupleReadIsDisabled).some(Boolean));
        prevTupleReadIsDisabledRef.current = tupleReadIsDisabled;
      }, 100); // Add small debounce

      return () => clearTimeout(timeoutId);
    }
  }, [tupleReadIsDisabled, setFunctionIsDisabled]);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  return (
    <Box
      data-parameter-branch={compact && isArrayChild ? undefined : ""}
      minW={0}
      p={compact ? 0 : { base: 1.5, md: 2 }}
      mb={compact ? 0 : !isCollapsed ? 4 : undefined}
      pb={compact ? 0 : !isCollapsed ? 4 : undefined}
      border={compact ? "none" : "2px solid"}
      borderColor={
        !isArrayChild
          ? "whiteAlpha.200"
          : isError && isAnyChildInvalid
            ? "red.300"
            : "transparent"
      }
      rounded="md"
      bg={compact ? "transparent" : "whiteAlpha.50"}
    >
      {!(compact && isArrayChild) && (
        <Button
          variant="ghost"
          size="sm"
          h="auto"
          minH={7}
          px={compact ? 0 : 1}
          py={1}
          mb={compact ? 2 : 0}
          minW={0}
          maxW="full"
          textAlign="left"
          justifyContent="flex-start"
          fontWeight="normal"
          data-parameter-toggle=""
          aria-expanded={!isCollapsed}
          aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${input.name || "tuple"}`}
          onClick={toggleCollapse}
          leftIcon={isCollapsed ? <ChevronRightIcon /> : <ChevronDownIcon />}
        >
          <Box sx={{ "& .fn-input-info": { mb: 0 } }}>
            <InputInfo input={input} />
          </Box>
        </Button>
      )}
      <Box
        ml={compact ? 0 : { base: 0, md: 2 }}
        pl={compact ? (isArrayChild ? 0 : 3) : { base: 2, md: 4 }}
        borderLeft={compact && isArrayChild ? "none" : "1px solid"}
        borderColor="border.default"
        display={isCollapsed ? "none" : undefined}
      >
        {input.components?.map((component, i) => (
          <Box key={i} mt={compact ? (i === 0 ? 0 : 3) : 2} minW={0}>
            {renderInputFields({
              chainId,
              input: component,
              value: tupleInputsState[i],
              onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                updateTupleInputState(i, e.target.value),
              setFunctionIsDisabled: (value: boolean) =>
                updateTupleReadIsDisabled(i, value),
              onKeyDown,
              isError,
              allowBytesBuilder,
              immediateUpdates,
              rawValues,
            })}
          </Box>
        ))}
      </Box>
    </Box>
  );
};
