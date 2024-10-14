import React, { useEffect, useState, ReactNode } from "react";
import {
  Box,
  Button,
  Center,
  HStack,
  Spinner,
  useToast,
} from "@chakra-ui/react";
import { ChevronDownIcon, ChevronUpIcon, RepeatIcon } from "@chakra-ui/icons";
import { JsonFragment, JsonFragmentType } from "ethers";
import {
  ContractFunctionExecutionError,
  createPublicClient,
  Hex,
  http,
  isAddress,
} from "viem";
import { chainIdToChain } from "@/data/common";
import {
  UintParam,
  StringParam,
  AddressParam,
  TupleParam,
  ArrayParam,
  IntParam,
  BytesParam,
} from "@/components/decodedParams";
import {
  AddressInput,
  InputInfo,
  StringInput,
} from "@/components/fnParams/inputs";
import { ExtendedJsonFragmentType, HighlightedContent } from "@/types";

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

interface ReadFunctionProps {
  index: number;
  func: Omit<JsonFragment, "name" | "outputs"> & {
    name: HighlightedContent;
    outputs?: ExtendedJsonFragmentType[];
  };
  address: string;
  chainId: number;
  readAllCollapsed?: boolean;
}

export const ReadFunction = ({
  index,
  func: __func,
  address,
  chainId,
  readAllCollapsed,
}: ReadFunctionProps) => {
  const toast = useToast();

  const { name: __name, inputs, outputs } = __func;
  const functionName = extractStringFromReactNode(__name);
  const _func = { ...__func, name: functionName } as JsonFragment;

  const client = createPublicClient({
    chain: chainIdToChain[chainId],
    transport: http(),
  });

  const [isCollapsed, setIsCollapsed] = useState<boolean>(
    readAllCollapsed !== undefined ? readAllCollapsed : false
  );
  const [inputsState, setInputsState] = useState<any>({});
  const [res, setRes] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const fetchValue = async () => {
    if (isError) {
      setIsError(false);
    }

    if (functionName) {
      setLoading(true);
      try {
        const result = await client.readContract({
          address: address as Hex,
          abi: [_func] as const,
          functionName: functionName,
          args: inputs?.map((input, i) => inputsState[i]),
        });
        setRes(result);
      } catch (e: any) {
        console.error(e);
        toast({
          title: `Error calling ${functionName}()`,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
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
  };

  const renderInputFields = (input: JsonFragmentType, i: number) => {
    const value = inputsState[i] || ""; // Ensure value is always defined

    if (input.type === "address") {
      return (
        <AddressInput
          input={input}
          value={value}
          onChange={(e) =>
            setInputsState({
              ...inputsState,
              [i]: e.target.value,
            })
          }
          chainId={chainId}
          isInvalid={isError && (!value || value.trim().length === 0)}
        />
      );
    } else {
      return (
        <StringInput
          input={input}
          value={value}
          onChange={(e) =>
            setInputsState({
              ...inputsState,
              [i]: e.target.value,
            })
          }
          isInvalid={isError && (!value || value.trim().length === 0)}
        />
      );
    }
  };

  const renderParamTypes = (type: string, value: any) => {
    if (type.includes("uint")) {
      return <UintParam value={(value as BigInt).toString()} />;
    } else if (type.includes("int")) {
      return <IntParam value={(value as BigInt).toString()} />;
    } else if (type === "address") {
      return <AddressParam address={value} showLink chainId={chainId} />;
    } else if (type.includes("bytes")) {
      // account for cases where the bytes value is just an address
      if (isAddress(value)) {
        return <AddressParam address={value} />;
      } else {
        return (
          <BytesParam arg={{ rawValue: value, value: { decoded: null } }} />
        );
      }
    } else if (type === "tuple") {
      return <TupleParam arg={{ value }} />;
    } else if (type === "array") {
      return <ArrayParam arg={{ rawValue: value, value }} />;
    } else if (type === "bool") {
      return <StringParam value={value ? "true" : "false"} />;
    } else {
      return <StringParam value={value} />;
    }
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
                <InputInfo input={output as JsonFragmentType} />
              )}
              {output.type &&
                renderParamTypes(
                  output.type,
                  outputs.length > 1 ? res[i] : res
                )}
            </Box>
          ))}
        </Box>
      );
    } else {
      return <></>;
    }
  };

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
            size={"sm"}
            title={res !== null ? "refetch" : "fetch"}
            colorScheme={!isError ? "blue" : "red"}
          >
            {res !== null ? <RepeatIcon /> : "Read"}
          </Button>
        )}
      </HStack>
      <Box ml={4} maxW="30rem">
        {__func.outputs && __func.outputs.length > 1 && (
          <Box fontSize={"sm"} color="whiteAlpha.600">
            (
            {__func.outputs.map((output, index) => (
              <React.Fragment key={index}>
                {index > 0 && ", "}
                {output.type}
                {output.name && <> {renderHighlightedText(output.name)}</>}
              </React.Fragment>
            ))}
            )
          </Box>
        )}
      </Box>
      <Box display={isCollapsed ? "none" : undefined}>
        {/* Input fields */}
        {inputs && inputs.length > 0 && (
          <Box ml={4}>
            {inputs.map((input, i) => (
              <Box key={i} mt={2}>
                {renderInputFields(input, i)}
              </Box>
            ))}
          </Box>
        )}
        {loading ? (
          <Center>
            <Spinner mt={2} mb={4} />
          </Center>
        ) : (
          res !== null && (
            <Box mt={2} ml={4} mb={inputs && inputs.length > 0 ? 0 : 4}>
              {inputs && inputs.length > 0 ? (
                <Box p={4} bg="whiteAlpha.100" rounded={"md"}>
                  <Box fontWeight={"bold"}>Result:</Box>
                  {renderRes()}
                </Box>
              ) : (
                renderRes()
              )}
            </Box>
          )
        )}
        {isError && errorMsg && (
          <Center mt={2} p={4} color="red.300" maxW="30rem">
            {errorMsg}
          </Center>
        )}
      </Box>
    </Box>
  );
};
