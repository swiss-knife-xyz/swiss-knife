import React from "react";
import {
  Box,
  Collapse,
  HStack,
  Stack,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";
import { ParamType } from "ethers";
import { StringParam } from "./StringParam";
import { renderParamTypes } from "../renderParams";

interface Params {
  input: ParamType;
  value: any;
}

export const ArrayParam = ({ input, value }: Params) => {
  const { isOpen, onToggle } = useDisclosure();

  if (value.length === 0) {
    return <StringParam value={"[ ]"} />;
  } else {
    return (
      <>
        <HStack my={isOpen ? -3 : 0}>
          <Text
            fontSize={"xl"}
            fontWeight={"bold"}
            cursor={"pointer"}
            onClick={onToggle}
          >
            {isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </Text>
          {!isOpen && <StringParam value={value} />}
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
            {value.map((v: any, i: number) => {
              return (
                <Box p={4} bg={"whiteAlpha.50"} rounded={"lg"}>
                  <HStack mt={-2}>
                    <Text fontSize={"sm"}>{input.arrayChildren!.baseType}</Text>
                    <Text
                      fontSize={"xs"}
                      fontWeight={"thin"}
                      color={"whiteAlpha.600"}
                    >
                      (index: {i})
                    </Text>
                  </HStack>
                  <Box mt={2}>{renderParamTypes(input.arrayChildren!, v)}</Box>
                </Box>
              );
            })}
          </Stack>
        </Collapse>
      </>
    );
  }
};
