import React from "react";
import {
  Box,
  Button,
  Collapse,
  HStack,
  Link,
  Skeleton,
  Stack,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ExternalLinkIcon,
} from "@chakra-ui/icons";
import { StringParam } from "./StringParam";
import { renderParamTypes } from "../renderParams";
import { isAddress, stringify } from "viem";
import { getPath } from "@/utils";
import subdomains from "@/subdomains";
import { motion } from "framer-motion";
import { Arg, DecodeArrayParamResult } from "@/types";

interface Params {
  arg: Omit<Arg, "value"> & {
    value: DecodeArrayParamResult;
  };
  chainId?: number;
}

export const ArrayParam = ({ arg: _arg, chainId }: Params) => {
  const showSkeleton =
    _arg === undefined ||
    _arg === null ||
    _arg.value === undefined ||
    _arg.rawValue === undefined ||
    _arg.value === null ||
    _arg.rawValue === null;

  const arg = !showSkeleton
    ? _arg
    : {
        name: "",
        baseType: "",
        type: "",
        rawValue: [],
        value: [],
      };

  console.log("ARRAY_ARG", arg);

  const { isOpen, onToggle } = useDisclosure();

  if (showSkeleton) {
    return (
      <HStack w="full">
        <Skeleton
          flexGrow={1}
          height="4rem"
          rounded="md"
          startColor="whiteAlpha.50"
          endColor="whiteAlpha.400"
        />
      </HStack>
    );
  } else if (Array.isArray(arg.value) && arg.value.length === 0) {
    return <StringParam value={"[ ]"} />;
  } else {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <HStack my={isOpen ? -3 : 0}>
          <Text
            fontSize={"xl"}
            fontWeight={"bold"}
            cursor={"pointer"}
            onClick={onToggle}
          >
            {isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </Text>
          {!isOpen && (
            <StringParam value={stringify(arg.rawValue)} disableRich />
          )}
        </HStack>
        <Collapse in={isOpen} animateOpacity>
          <Stack
            ml={2}
            px={4}
            pb={4}
            spacing={4}
            borderLeft="1px"
            borderBottom="1px"
            borderStyle={"dashed"}
            borderColor={"whiteAlpha.300"}
            roundedBottom={"lg"}
          >
            {Array.isArray(arg.value) &&
              arg.value.map((ar, i: number) => {
                return (
                  <Box key={i} p={4} bg={"whiteAlpha.50"} rounded={"lg"}>
                    <HStack mt={-2}>
                      <Text fontSize={"sm"}>{ar.baseType}</Text>
                      <Text
                        fontSize={"xs"}
                        fontWeight={"thin"}
                        color={"whiteAlpha.600"}
                      >
                        (index: {i})
                      </Text>
                      {ar.baseType === "address" ||
                      (ar.baseType === "bytes" && isAddress(ar.rawValue)) ? (
                        <Link
                          href={`${getPath(subdomains.EXPLORER.base)}address/${
                            ar.baseType === "address" ? ar.value : ar.rawValue
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
                    <Box mt={2}>{renderParamTypes(ar, chainId)}</Box>
                  </Box>
                );
              })}
          </Stack>
        </Collapse>
      </motion.div>
    );
  }
};
