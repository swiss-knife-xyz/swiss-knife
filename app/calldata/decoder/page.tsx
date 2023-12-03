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
import { Interface, TransactionDescription, ParamType } from "ethers";
import axios from "axios";
import { InputField } from "@/components/InputField";
import { Label } from "@/components/Label";
import { renderParams } from "@/components/renderParams";
import { DarkButton } from "@/components/DarkButton";

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

  const _getAllPossibleDecoded = (functionsArr: string[]) => {
    let allPossibleDecoded = [];
    for (var i = 0; i < functionsArr.length; i++) {
      const fn = functionsArr[i];
      const _abi = [`function ${fn}`];

      const iface = new Interface(_abi);
      try {
        if (!calldata) return [];

        let res = iface.parseTransaction({ data: calldata });
        if (res === null) {
          continue;
        }

        console.log(res);
        setFnDescription(res);
        allPossibleDecoded.push({
          function: fn,
          params: res.args,
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
                  <DarkButton
                    onClick={() => decodeWithSelector()}
                    isLoading={isLoading}
                  >
                    Decode
                  </DarkButton>
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
            {fnDescription.fragment.inputs.map((input, i) => {
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
