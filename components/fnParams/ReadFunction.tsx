import React, { useEffect, useState, ReactNode, useCallback } from "react";
import { Box, Button, Center, HStack, Skeleton } from "@chakra-ui/react";
import { ChevronDownIcon, ChevronUpIcon, RepeatIcon } from "@chakra-ui/icons";
import { JsonFragment } from "ethers";
import { ContractFunctionExecutionError, PublicClient, Hex } from "viem";
import { InputInfo } from "@/components/fnParams/inputs";
import { ExtendedJsonFragmentType, HighlightedContent } from "@/types";
import { renderInputFields, renderParamTypes } from "./Renderer";

interface ReadFunctionProps {
  client: PublicClient;
  index: number;
  func: Omit<JsonFragment, "name" | "outputs"> & {
    name: HighlightedContent;
    outputs?: ExtendedJsonFragmentType[];
  };
  address: string;
  chainId: number;
  readAllCollapsed?: boolean;
}

const extractConciseError = (errorMessage: string): string => {
  const functionMatch = errorMessage.match(/"([^"]+)"/);
  const reasonMatch = errorMessage.match(/reason:\s*([^V]+)/);

  if (functionMatch && reasonMatch) {
    const functionName = functionMatch[1];
    const reason = reasonMatch[1].trim();
    return reason;
  }

  return "Contract call failed";
};

const extractStringFromReactNode = (node: HighlightedContent): string => {
  if (typeof node === "string") {
    return node;
  } else if (Array.isArray(node)) {
    return node.map((item) => item.text).join("");
  }
  return "";
};

//only break the word after a ","
//useful for displaying the outputs of a function
const EnhancedFunctionOutput: React.FC<{
  outputs?: ExtendedJsonFragmentType[];
}> = ({ outputs }) => {
  const renderHighlightedText = (
    content: HighlightedContent
  ): React.ReactNode => {
    if (typeof content === "string") {
      return content;
    }

    return content.map((part, index) => (
      <span
        key={index}
        style={{
          backgroundColor: part.isHighlighted
            ? part.isCurrentResult
              ? "orange"
              : "yellow"
            : "transparent",
          color: part.isHighlighted ? "black" : "white",
        }}
      >
        {part.text}
      </span>
    ));
  };

  const processString = (str: string | React.ReactNode) => {
    if (typeof str !== "string") {
      return str;
    }

    return str.split(", ").map((part, index, array) => (
      <React.Fragment key={index}>
        {part}
        {index < array.length - 1 && (
          <span style={{ whiteSpace: "nowrap" }}>,&#8203;</span>
        )}
      </React.Fragment>
    ));
  };

  return (
    <Box
      ml={4}
      maxW="30rem"
      sx={{
        wordBreak: "break-word",
        whiteSpace: "pre-wrap",
      }}
    >
      {outputs && outputs.length > 1 && (
        <Box fontSize="sm" color="whiteAlpha.600">
          →&nbsp;(
          {outputs.map((output, index) => (
            <React.Fragment key={index}>
              {index > 0 && <span>,&nbsp;</span>}
              {processString(output.type !== undefined ? output.type : "")}
              {output.name && (
                <>
                  &nbsp;
                  {processString(renderHighlightedText(output.name))}
                </>
              )}
            </React.Fragment>
          ))}
          )
        </Box>
      )}
    </Box>
  );
};

export const ReadFunction = ({
  client,
  index,
  func: __func,
  address,
  chainId,
  readAllCollapsed,
}: ReadFunctionProps) => {
  const { name: __name, inputs, outputs } = __func;
  const functionName = extractStringFromReactNode(__name);

  const _func = React.useMemo(
    () => ({ ...__func, name: functionName } as JsonFragment),
    [__func, functionName]
  );

  const [isCollapsed, setIsCollapsed] = useState<boolean>(
    readAllCollapsed !== undefined ? readAllCollapsed : false
  );
  const [inputsState, setInputsState] = useState<any>({});
  const [readIsDisabled, setReadIsDisabled] = useState<any>({});
  const [res, setRes] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [enterPressed, setEnterPressed] = useState<boolean>(false);

  const updateInputState = useCallback((index: number, value: string) => {
    setInputsState((prev: any) => ({
      ...prev,
      [index]: value,
    }));
  }, []);

  const updateReadIsDisabled = useCallback((index: number, value: boolean) => {
    setReadIsDisabled((prev: any) => ({
      ...prev,
      [index]: value,
    }));
  }, []);

  const fetchValue = useCallback(async () => {
    if (isError) {
      setIsError(false);
    }

    if (functionName) {
      setLoading(true);
      setRes(null);
      try {
        console.log({ inputsState });
        const result = await client.readContract({
          address: address as Hex,
          abi: [_func] as const,
          functionName: functionName,
          args: inputs?.map((input, i) => inputsState[i]),
        });
        console.log({ inputsState, outputs, result });
        setRes(result);
      } catch (e: any) {
        console.error(e);
        setIsError(true);

        setRes(null);

        if (e instanceof ContractFunctionExecutionError) {
          // extract the error message
          const errorMessage = e.cause?.message || e.message;
          setErrorMsg(extractConciseError(errorMessage));
        } else {
          setErrorMsg("An unknown error occurred");
        }
      } finally {
        setLoading(false);
      }
    }
  }, [isError, functionName, client, address, _func, inputs, inputsState]);

  useEffect(() => {
    if (enterPressed) {
      fetchValue();
      setEnterPressed(false);
    }
  }, [inputsState, enterPressed, fetchValue]);

  useEffect(() => {
    // if there are no inputs, then auto fetch the value
    if (!inputs || (inputs && inputs.length === 0)) {
      fetchValue();
    }
  }, []);

  useEffect(() => {
    setIsError(false);
  }, [inputsState]);

  useEffect(() => {
    setIsCollapsed(readAllCollapsed !== undefined ? readAllCollapsed : false);
  }, [readAllCollapsed]);

  const renderHighlightedText = (content: HighlightedContent): ReactNode => {
    if (typeof content === "string") {
      return content;
    }

    return content.map((part, index) => (
      <span
        key={index}
        style={{
          backgroundColor: part.isHighlighted
            ? part.isCurrentResult
              ? "orange"
              : "yellow"
            : "transparent",
          color: part.isHighlighted ? "black" : "inherit",
        }}
      >
        {part.text}
      </span>
    ));
  };

  const renderRes = () => {
    if (outputs) {
      return (
        <Box>
          {outputs.map((output, i) => (
            <Box
              key={i}
              mt={2}
              bg={outputs.length > 1 ? "whiteAlpha.200" : undefined}
              p={outputs.length > 1 ? 4 : 0}
              rounded={"md"}
            >
              {outputs.length > 1 && (
                <InputInfo
                  input={{
                    name: output.name
                      ? extractStringFromReactNode(output.name)
                      : undefined,
                    type: output.type,
                  }}
                />
              )}
              {output.type &&
                renderParamTypes({
                  chainId,
                  type: output.type,
                  value:
                    outputs.length > 1
                      ? res !== null && res !== undefined
                        ? res[i]
                        : null
                      : res,
                })}
            </Box>
          ))}
        </Box>
      );
    } else {
      return <></>;
    }
  };

  return (
    <Box
      mb={2}
      p={2}
      pb={!inputs || inputs.length === 0 ? undefined : 4}
      border="2px solid"
      borderColor="whiteAlpha.200"
      rounded="md"
      bg={!inputs || inputs.length === 0 ? "whiteAlpha.50" : undefined}
    >
      {/* Function name and refetch button */}
      <HStack mb={2}>
        <HStack
          flexGrow={1}
          onClick={() => setIsCollapsed(!isCollapsed)}
          cursor={"pointer"}
        >
          <HStack>
            <Box fontSize={"2xl"}>
              {isCollapsed ? <ChevronUpIcon /> : <ChevronDownIcon />}
            </Box>
            <HStack alignItems={"flex-end"}>
              <Box fontSize={"md"} fontWeight={"normal"}>
                {index}.
              </Box>
              <Box fontWeight={"bold"}>
                {renderHighlightedText(__func.name)}
              </Box>
            </HStack>
          </HStack>{" "}
          {__func.outputs && __func.outputs.length === 1 && (
            <Box fontSize={"sm"} color="whiteAlpha.600">
              ({__func.outputs[0].type})
            </Box>
          )}
        </HStack>
        {!loading && (
          <Button
            ml={4}
            onClick={fetchValue}
            isDisabled={
              inputs && inputs.some((_, i) => readIsDisabled[i] === true)
            }
            size={"sm"}
            title={res !== null ? "refetch" : "fetch"}
            colorScheme={!isError ? "blue" : "red"}
          >
            {res !== null ? <RepeatIcon /> : "Read"}
          </Button>
        )}
      </HStack>

      <Box ml={4} maxW="30rem" mb={4}>
        <EnhancedFunctionOutput outputs={outputs} />
      </Box>
      <Box display={isCollapsed ? "none" : undefined}>
        {/* Input fields */}
        {inputs && inputs.length > 0 && (
          <Box ml={4}>
            {inputs.map((input, i) => (
              <Box key={i} mt={2}>
                {renderInputFields({
                  chainId,
                  input,
                  value: inputsState[i] || "",
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                    updateInputState(i, e.target.value),
                  setReadIsDisabled: (value: boolean) =>
                    updateReadIsDisabled(i, value),
                  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === "Enter" && !readIsDisabled) {
                      setEnterPressed(true);
                    }
                  },
                  isError,
                })}
              </Box>
            ))}
          </Box>
        )}
        {/* Output fields */}
        <Box mt={2} ml={4} mb={inputs && inputs.length > 0 ? 0 : 4}>
          {inputs && inputs.length > 0
            ? // Show skeleton (res = null) if loading
              (loading || (!loading && res !== null && res !== undefined)) && (
                <Box p={4} bg="whiteAlpha.100" rounded={"md"}>
                  <Box fontWeight={"bold"}>Result:</Box>
                  {renderRes()}
                </Box>
              )
            : !isError && renderRes()}
        </Box>
        {isError && errorMsg && (
          <Center mt={2} p={4} color="red.300" maxW="30rem">
            {errorMsg}
          </Center>
        )}
      </Box>
    </Box>
  );
};
