import React, { useState, useEffect } from "react";
import { Box, HStack, Stack, Text } from "@chakra-ui/react";
import { ParamType } from "ethers";
import {
  UintParam,
  StringParam,
  AddressParam,
  TupleParam,
  ArrayParam,
  IntParam,
} from "@/components/fnParams";
import { BytesParam } from "./fnParams/BytesParam";

export const renderParamTypes = (input: ParamType, value: any) => {
  if (input.baseType.includes("uint")) {
    return <UintParam value={value} />;
  } else if (input.baseType.includes("int")) {
    return <IntParam value={value} />;
  } else if (input.baseType === "address") {
    return <AddressParam value={value} />;
  } else if (input.baseType.includes("bytes")) {
    return <BytesParam value={value} />;
  } else if (input.baseType === "tuple") {
    return <TupleParam value={value} input={input} />;
  } else if (input.baseType === "array") {
    return <ArrayParam value={value} input={input} />;
  } else {
    return <StringParam value={value} />;
  }
};

export const renderParams = (key: number, input: ParamType, value: any) => {
  const type = input.type.includes("tuple") ? "tuple" : input.type;

  return (
    <Stack key={key} p={4} bg={"whiteAlpha.50"} rounded={"lg"}>
      {input.name ? (
        <Box>
          <Box fontSize={"xs"} fontWeight={"thin"} color={"whiteAlpha.600"}>
            {type}
          </Box>
          <HStack>
            <Box>
              {input.name}
              {input.baseType === "array" ? "[]" : ""}
            </Box>
            {input.baseType === "array" ? (
              <Box fontSize={"xs"} fontWeight={"thin"} color={"whiteAlpha.600"}>
                (length: {value.length})
              </Box>
            ) : null}
          </HStack>
        </Box>
      ) : (
        <HStack>
          <Text fontSize={"sm"}>{type}</Text>
          {input.baseType === "array" ? (
            <Box fontSize={"xs"} fontWeight={"thin"} color={"whiteAlpha.600"}>
              (length: {value.length})
            </Box>
          ) : null}
        </HStack>
      )}
      <Stack spacing={2}>{renderParamTypes(input, value)}</Stack>
    </Stack>
  );
};
