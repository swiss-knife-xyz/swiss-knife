import React, { useState, useEffect } from "react";
import { Box, Button, HStack, Link, Stack, Text } from "@chakra-ui/react";
import { isAddress } from "viem";
import {
  UintParam,
  StringParam,
  AddressParam,
  TupleParam,
  ArrayParam,
  IntParam,
  BytesParam,
} from "@/components/decodedParams";
import { getPath } from "@/utils";
import subdomains from "@/subdomains";
import { ExternalLinkIcon } from "@chakra-ui/icons";

export const renderParamTypes = (arg: any) => {
  if (arg.baseType.includes("uint")) {
    return <UintParam value={arg.value} />;
  } else if (arg.baseType.includes("int")) {
    return <IntParam value={arg.value} />;
  } else if (arg.baseType === "address") {
    return <AddressParam address={arg.value} />;
  } else if (arg.baseType.includes("bytes")) {
    // account for cases where the bytes value is just an address
    if (isAddress(arg.rawValue)) {
      return <AddressParam address={arg.rawValue} />;
    } else {
      return <BytesParam arg={arg} />;
    }
  } else if (arg.baseType === "tuple") {
    return <TupleParam arg={arg} />;
  } else if (arg.baseType === "array") {
    return <ArrayParam arg={arg} />;
  } else {
    return <StringParam value={arg.value} />;
  }
};

export const renderParams = (key: number, arg: any) => {
  const type = arg.type.includes("tuple") ? "tuple" : arg.type;

  return (
    <Stack key={key} p={4} bg={"whiteAlpha.50"} rounded={"lg"}>
      {arg.name ? (
        <Box>
          <HStack>
            <Box fontSize={"xs"} fontWeight={"thin"} color={"whiteAlpha.600"}>
              {type}
            </Box>
            {arg.baseType === "address" ||
            (arg.baseType === "bytes" && isAddress(arg.rawValue)) ? (
              <Link
                href={`${getPath(subdomains.EXPLORER.base)}address/${
                  arg.baseType === "address" ? arg.value : arg.rawValue
                }`}
                title="View on explorer"
                isExternal
              >
                <Button size={"xs"}>
                  <HStack>
                    <ExternalLinkIcon />
                  </HStack>
                </Button>
              </Link>
            ) : null}
          </HStack>
          <HStack>
            <Box>
              {arg.name}
              {arg.baseType === "array" ? "[]" : ""}
            </Box>
            {arg.baseType === "array" ? (
              <Box fontSize={"xs"} fontWeight={"thin"} color={"whiteAlpha.600"}>
                (length: {arg.value.length})
              </Box>
            ) : null}
          </HStack>
        </Box>
      ) : (
        <HStack>
          <Text fontSize={"sm"}>
            {type}
            {arg.baseType === "array" ? (type.includes("[]") ? "" : "[]") : ""}
          </Text>
          {arg.baseType === "array" ? (
            <Box fontSize={"xs"} fontWeight={"thin"} color={"whiteAlpha.600"}>
              (length: {arg.value.length})
            </Box>
          ) : null}
          {arg.baseType === "address" ||
          (arg.baseType === "bytes" && isAddress(arg.rawValue)) ? (
            <Link
              href={`${getPath(subdomains.EXPLORER.base)}address/${
                arg.baseType === "address" ? arg.value : arg.rawValue
              }`}
              title="View on explorer"
              isExternal
            >
              <Button size={"xs"}>
                <HStack>
                  <ExternalLinkIcon />
                </HStack>
              </Button>
            </Link>
          ) : null}
        </HStack>
      )}
      <Stack spacing={2}>{renderParamTypes(arg)}</Stack>
    </Stack>
  );
};
