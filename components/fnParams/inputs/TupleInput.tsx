import React, { useEffect, useState, useCallback, useRef } from "react";
import { Box, HStack, InputProps } from "@chakra-ui/react";
import { JsonFragmentType } from "ethers";
import { InputInfo } from "./InputInfo";
import { renderInputFields } from "../Renderer";
import { ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";
import { isEqual } from "lodash";

interface InputFieldProps extends InputProps {
  chainId: number;
  input: JsonFragmentType;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setFunctionIsDisabled: (value: boolean) => void;
  isError: boolean;
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
  onKeyDown,
  isArrayChild,
  value,
}) => {
  const [tupleInputsState, setTupleInputsState] = useState<TupleInputState>({});
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
  }, [tupleInputsState, onChange]);

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
      p={2}
      mb={!isCollapsed ? 4 : undefined}
      pb={!isCollapsed ? 4 : undefined}
      border="2px solid"
      borderColor={
        !isArrayChild
          ? "whiteAlpha.200"
          : isError && isAnyChildInvalid
          ? "red.300"
          : "transparent"
      }
      rounded="md"
      bg={"whiteAlpha.50"}
      borderTopLeftRadius={isArrayChild ? 0 : "md"}
    >
      <HStack flexGrow={1} onClick={toggleCollapse} cursor={"pointer"}>
        {!isArrayChild && (
          <Box fontSize={"2xl"}>
            {isCollapsed ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </Box>
        )}
        <InputInfo input={input} />
      </HStack>
      <Box
        ml={2}
        pl={4}
        borderLeft={"1px"}
        borderColor={"whiteAlpha.100"}
        display={isCollapsed ? "none" : undefined}
      >
        {input.components?.map((component, i) => (
          <Box key={i} mt={2}>
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
            })}
          </Box>
        ))}
      </Box>
    </Box>
  );
};
