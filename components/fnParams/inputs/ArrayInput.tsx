import {
  Box,
  Button,
  Center,
  HStack,
  InputProps,
  Spacer,
} from "@chakra-ui/react";
import { JsonFragment, JsonFragmentType } from "ethers";
import { renderInputFields } from "../Renderer";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDownIcon, ChevronUpIcon, DeleteIcon } from "@chakra-ui/icons";
import { InputField } from "@/components/InputField";
import { InputInfo } from "./InputInfo";
import isEqual from "lodash/isEqual";

interface InputFieldProps extends InputProps {
  chainId: number;
  input: JsonFragmentType;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setFunctionIsDisabled: (value: boolean) => void;
  isError: boolean;
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
  onKeyDown,
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
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <HStack mt={2} p={3} bg="whiteAlpha.50" rounded={"lg"}>
      <Box w="full">
        <HStack w="full">
          <HStack
            cursor={"pointer"}
            onClick={() => setIsCollapsed((prev) => !prev)}
            bg="whiteAlpha.50"
            p={2}
            pr={4}
            roundedTop={"lg"}
            roundedBottom={isCollapsed ? "lg" : undefined}
          >
            <Box fontSize={"sm"}>
              {isCollapsed ? <ChevronUpIcon /> : <ChevronDownIcon />}
            </Box>
            <Box>i = {index}</Box>
          </HStack>
          <Spacer />
          <Button
            mb={1}
            size="xs"
            onClick={() => removeFromArrayInputState(id)}
          >
            <DeleteIcon />
          </Button>
        </HStack>
        <Box display={isCollapsed ? "none" : undefined}>
          {renderInputFields({
            chainId,
            input: {
              ...input,
              type: childType,
            },
            value,
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
              updateArrayInputState(id, e.target.value);
            },
            setFunctionIsDisabled: (value: boolean) => {
              updateArrayReadIsDisabled(id, value);
            },
            onKeyDown,
            isError,
            isArrayChild: true,
          })}
        </Box>
      </Box>
    </HStack>
  );
};

export const ArrayInput = ({
  chainId,
  input,
  onChange,
  setFunctionIsDisabled,
  isError,
  onKeyDown,
}: InputFieldProps) => {
  // removes [] from the end of the array type
  const childType = input.type!.substring(0, input.type!.length - 2);

  const [arrayInputState, setArrayInputsState] = useState<ArrayInputState>({});
  const [arrayReadIsDisabled, setArrayReadIsDisabled] = useState<
    Record<string, boolean>
  >({});

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
    const newId = `element-${Date.now()}`;
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
    <Box maxW="30rem">
      <HStack>
        <InputInfo input={input} />
        <Spacer />
        <Box color={"whiteAlpha.700"} fontSize={"sm"}>
          (length = {length})
        </Box>
      </HStack>
      {length === 0 && (
        <InputField value={"[ ]"} placeholder="" onChange={() => {}} />
      )}
      {Object.entries(arrayInputState).map(([id, element], index) => (
        <ArrayElement
          key={id}
          id={id}
          index={index}
          chainId={chainId}
          input={input}
          childType={childType}
          value={element.value}
          updateArrayInputState={updateArrayInputState}
          removeFromArrayInputState={removeFromArrayInputState}
          updateArrayReadIsDisabled={updateArrayReadIsDisabled}
          isError={isError}
          onKeyDown={onKeyDown}
        />
      ))}
      <Center mt={2}>
        <Button onClick={addNewArrayElement}>+ Add</Button>
      </Center>
    </Box>
  );
};
