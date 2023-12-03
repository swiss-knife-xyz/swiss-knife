import React, { useState, useEffect } from "react";
import { Box, Stack, Text } from "@chakra-ui/react";
import { ParamType } from "ethers";
import {
  UintParam,
  StringParam,
  AddressParam,
  TupleParam,
} from "@/components/fnParams";

// TODO: handle uint256[] and other arrays. In case of empty array, the value is "" so show "[]" instead
const renderParamTypes = (input: ParamType, value: any) => {
  switch (input.baseType) {
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
          <Box fontSize={"xs"} fontWeight={"thin"}>
            {type}
          </Box>
          <Box>{input.name}</Box>
        </Box>
      ) : (
        <Text fontSize={"sm"}>{type}</Text>
      )}
      <Stack spacing={2}>{renderParamTypes(input, value)}</Stack>
    </Stack>
  );
};
