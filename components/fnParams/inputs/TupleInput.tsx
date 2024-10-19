import React, { useEffect, useState, useCallback } from "react";
import { Box, HStack, InputProps } from "@chakra-ui/react";
import { JsonFragmentType } from "ethers";
import { InputInfo } from "./InputInfo";
import { renderInputFields } from "../Renderer";
import { ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";

interface InputFieldProps extends InputProps {
  chainId: number;
  input: JsonFragmentType;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  readIsDisabled: boolean;
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

  useEffect(() => {
    const newValue = input.components?.map((_, i) => tupleInputsState[i]);
    onChange({
      target: {
        value: newValue,
      },
    } as any);
  }, [input.components, tupleInputsState, onChange]);

  const updateParentReadIsDisabled = useCallback(() => {
    if (Object.keys(tupleReadIsDisabled).length > 0 && input.components) {
      const isDisabled = input.components.some(
        (_, i) => tupleReadIsDisabled[i] === true
      );
      setReadIsDisabled(isDisabled);
    }
  }, [input.components, tupleReadIsDisabled, setReadIsDisabled]);

  useEffect(() => {
    updateParentReadIsDisabled();
  }, [updateParentReadIsDisabled]);

  const handleTupleInputChange = (index: number, value: any) => {
    setTupleInputsState((prevState: TupleInputState) => ({
      ...prevState,
      [index]: value,
    }));
  };

  const handleTupleReadIsDisabledChange = (index: number, value: boolean) => {
    setTupleReadIsDisabled((prevState: Record<number, boolean>) => ({
      ...prevState,
      [index]: value,
    }));
  };

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
                handleTupleInputChange(i, e.target.value),
              readIsDisabled: tupleReadIsDisabled[i],
              setReadIsDisabled: (value: boolean) =>
                handleTupleReadIsDisabledChange(i, value),
              onKeyDown,
              isError,
            })}
          </Box>
        ))}
      </Box>
    </Box>
  );
};
