import React, { useEffect, useState, useCallback, useRef } from "react";
import { Box, HStack, InputProps } from "@chakra-ui/react";
import { JsonFragmentType } from "ethers";
import { InputInfo } from "./InputInfo";
import { renderInputFields } from "../Renderer";
import { ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";
import isEqual from "lodash/isEqual";

interface InputFieldProps extends InputProps {
  chainId: number;
  input: JsonFragmentType;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setReadIsDisabled: (value: boolean) => void;
  isError: boolean;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

interface TupleInputState {
  [key: number]: any;
}

export const TupleInput: React.FC<InputFieldProps> = ({
  chainId,
  input,
  onChange,
  setReadIsDisabled,
  isError,
  onKeyDown,
}) => {
  const [tupleInputsState, setTupleInputsState] = useState<TupleInputState>({});
  const [tupleReadIsDisabled, setTupleReadIsDisabled] = useState<
    Record<number, boolean>
  >({});
  const [isCollapsed, setIsCollapsed] = useState(false);

  const prevTupleInputStateRef = useRef(tupleInputsState);
  const prevTupleReadIsDisabledRef = useRef(tupleReadIsDisabled);

  const updateTupleInputState = useCallback((index: number, value: string) => {
    setTupleInputsState((prev: any) => ({
      ...prev,
      [index]: value,
    }));
  }, []);

  const updateTupleReadIsDisabled = useCallback(
    (index: number, value: boolean) => {
      setTupleReadIsDisabled((prev: any) => ({
        ...prev,
        [index]: value,
      }));
    },
    []
  );

  useEffect(() => {
    if (!isEqual(tupleInputsState, prevTupleInputStateRef.current)) {
      onChange({
        target: {
          value: Object.values(tupleInputsState),
        },
      } as any);
      prevTupleInputStateRef.current = tupleInputsState;
    }
  }, [tupleInputsState, onChange]);

  useEffect(() => {
    if (!isEqual(tupleReadIsDisabled, prevTupleReadIsDisabledRef.current)) {
      setReadIsDisabled(Object.values(tupleReadIsDisabled).some(Boolean));
      prevTupleReadIsDisabledRef.current = tupleReadIsDisabled;
    }
  }, [tupleReadIsDisabled, setReadIsDisabled]);

  return (
    <Box
      p={2}
      mb={!isCollapsed ? 4 : undefined}
      pb={!isCollapsed ? 4 : undefined}
      border="2px solid"
      borderColor="whiteAlpha.200"
      rounded="md"
      bg={"whiteAlpha.50"}
    >
      <HStack
        flexGrow={1}
        onClick={() => setIsCollapsed(!isCollapsed)}
        cursor={"pointer"}
      >
        <Box fontSize={"2xl"}>
          {isCollapsed ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </Box>
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
              setReadIsDisabled: (value: boolean) =>
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
