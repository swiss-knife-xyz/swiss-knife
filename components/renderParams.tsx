import React, { useState, useEffect } from "react";
import { Box, HStack, Stack, Text } from "@chakra-ui/react";
import { ParamType } from "ethers";
import {
  UintParam,
  StringParam,
  AddressParam,
  TupleParam,
  ArrayParam,
} from "@/components/fnParams";

// TODO: add int256
export const renderParamTypes = (input: ParamType, value: any) => {
  if (input.baseType.includes("uint")) {
    return <UintParam value={value} />;
  } else if (input.baseType === "address") {
    return <AddressParam value={value} />;
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
          <Box fontSize={"xs"} fontWeight={"thin"} color={"whiteAlpha.600"}>
            {type}
          </Box>
          <HStack>
            <Box>{input.name}</Box>
            {input.baseType === "array" ? (
              <Box fontSize={"xs"} fontWeight={"thin"} color={"whiteAlpha.600"}>
                (length: {value.length})
              </Box>
            ) : null}
          </HStack>
        </Box>
      ) : (
        <Text fontSize={"sm"}>{type}</Text>
      )}
      <Stack spacing={2}>{renderParamTypes(input, value)}</Stack>
    </Stack>
  );
};
