"use client";

import React, { useState, useEffect } from "react";
import {
  Heading,
  Table,
  Tbody,
  Tr,
  Td,
  Box,
  Button,
  Container,
  Center,
  useToast,
  Stack,
  Text,
} from "@chakra-ui/react";
import { utils, BigNumber } from "ethers";
import { TransactionDescription, JsonFragmentType } from "@ethersproject/abi";
import axios from "axios";
import { InputField } from "@/components/InputField";
import { Label } from "@/components/Label";
import {
  UintParam,
  StringParam,
  AddressParam,
  TupleParam,
} from "@/components/fnParams";

// TODO: handle uint256[] and other arrays. In case of empty array, the value is "" so show "[]" instead
const renderParamTypes = (input: JsonFragmentType, value: any) => {
  switch (input.type) {
    case "uint256":
      return <UintParam value={value} />;
    case "address":
      return <AddressParam value={value} />;
    case "tuple":
      return <TupleParam value={value} input={input} />;
    default:
      return <StringParam value={value} />;
  }
};

export const renderParams = (
  key: number,
  input: JsonFragmentType,
  value: any
) => {
  return (
    <Stack
      key={key}
      p={4}
      bg={"whiteAlpha.100"}
      border="1px"
      borderColor={"whiteAlpha.500"}
      rounded={"lg"}
    >
      {input.name ? (
        <Box>
          <Box fontSize={"xs"} fontWeight={"thin"}>
            {input.type}
          </Box>
          <Box>{input.name}</Box>
        </Box>
      ) : (
        <Text fontSize={"sm"}>{input.type}</Text>
      )}
      <Stack spacing={2}>{renderParamTypes(input, value)}</Stack>
    </Stack>
  );
};

const CalldataDecoder = () => {
  const toast = useToast();

  const [calldata, setCalldata] = useState<string>();
  const [fnDescription, setFnDescription] = useState<TransactionDescription>();
  const [isLoading, setIsLoading] = useState(false);
  const [pasted, setPasted] = useState(false);

  useEffect(() => {
    if (pasted) {
      decodeWithSelector();
      setPasted(false);
    }
  }, [calldata]);

  const recursiveBNToString = (args: any) => {
    return args.map((arg: any) =>
      BigNumber.isBigNumber(arg)
        ? arg.toString()
        : // if arg is a struct in solidity
        arg.constructor === Array
        ? recursiveBNToString(arg)
        : arg
    );
  };

  const _getAllPossibleDecoded = (functionsArr: string[]) => {
    let allPossibleDecoded = [];
    for (var i = 0; i < functionsArr.length; i++) {
      const fn = functionsArr[i];
      const _abi = [`function ${fn}`];

      const iface = new utils.Interface(_abi);
      try {
        if (!calldata) return [];

        let res = iface.parseTransaction({ data: calldata });
        console.log(res);
        setFnDescription(res);
        allPossibleDecoded.push({
          function: fn,
          params: recursiveBNToString(res.args),
        });
      } catch {
        continue;
      }
    }
    return allPossibleDecoded;
  };

  const fetchFunctionInterface = async (selector: string): Promise<any[]> => {
    // from api.openchain.xyz
    const response = await axios.get(
      "https://api.openchain.xyz/signature-database/v1/lookup",
      {
        params: {
          function: selector,
        },
      }
    );
    const results = response.data.result.function[selector].map(
      (f: { name: string }) => f.name
    );

    if (results.length > 0) {
      return results;
    } else {
      // from 4byte.directory
      const response = await axios.get(
        "https://www.4byte.directory/api/v1/signatures/",
        {
          params: {
            hex_signature: selector,
          },
        }
      );
      const results = response.data.results.map(
        (f: { text_signature: string }) => f.text_signature
      );

      return results;
    }
  };

  const decodeWithSelector = async () => {
    if (!calldata) return;
    setIsLoading(true);

    const selector = calldata.slice(0, 10);
    try {
      const results = await fetchFunctionInterface(selector);

      if (results.length > 0) {
        // can have multiple entries with the same selector
        const allPossibleDecoded = _getAllPossibleDecoded(results);

        if (allPossibleDecoded.length > 0) {
          toast({
            title: "Successfully Decoded",
            status: "success",
            isClosable: true,
            duration: 1000,
          });
        } else {
          console.log(
            JSON.stringify(
              {
                possibleFunctions: results,
              },
              undefined,
              2
            )
          );
          toast({
            title: "Can't Decode Calldata",
            status: "error",
            isClosable: true,
            duration: 4000,
          });
        }
      } else {
        toast({
          title: "Can't Decode Calldata",
          status: "error",
          isClosable: true,
          duration: 1000,
        });
      }

      setIsLoading(false);
    } catch {
      toast({
        title: "Can't Decode Calldata",
        status: "error",
        isClosable: true,
        duration: 1000,
      });
      setIsLoading(false);
    }
  };

  return (
    <>
      <Heading color={"custom.pale"}>Calldata Decoder</Heading>
      <Table mt={"3rem"} variant={"unstyled"}>
        <Tbody>
          <Tr>
            <Label>Calldata</Label>
            <Td>
              <InputField
                placeholder="calldata"
                value={calldata}
                onChange={(e) => setCalldata(e.target.value)}
                onPaste={(e) => {
                  e.preventDefault();
                  setPasted(true);
                  setCalldata(e.clipboardData.getData("text"));
                }}
              />
            </Td>
          </Tr>
          <Tr>
            <Td colSpan={2}>
              <Container mt={0}>
                <Center>
                  <Button
                    colorScheme="blue"
                    onClick={() => decodeWithSelector()}
                    isLoading={isLoading}
                  >
                    Decode
                  </Button>
                </Center>
              </Container>
            </Td>
          </Tr>
        </Tbody>
      </Table>
      {fnDescription && (
        <Box minW={"80%"}>
          <Box>
            <Box fontSize={"xs"} color={"whiteAlpha.600"}>
              function
            </Box>
            <Box>{fnDescription.name}</Box>
          </Box>
          <Stack
            mt={2}
            p={4}
            spacing={4}
            border="1px"
            borderStyle={"dashed"}
            borderColor={"whiteAlpha.500"}
            rounded={"lg"}
          >
            {fnDescription.functionFragment.inputs.map((input, i) => {
              const value = fnDescription.args[i];
              return renderParams(i, input, value);
            })}
          </Stack>
        </Box>
      )}
    </>
  );
};

export default CalldataDecoder;
