import React from "react";
import {
  Box,
  Button,
  Collapse,
  HStack,
  Link,
  Stack,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ExternalLinkIcon,
} from "@chakra-ui/icons";
import { ParamType } from "ethers";
import { StringParam } from "./StringParam";
import { renderParamTypes } from "../renderParams";
import { isAddress } from "viem";
import { getPath } from "@/utils";
import subdomains from "@/subdomains";

interface Params {
  arg: any;
}

export const ArrayParam = ({ arg }: Params) => {
  const { isOpen, onToggle } = useDisclosure();

  if (arg.value.length === 0) {
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
          {!isOpen && <StringParam value={arg.rawValue.join(",")} />}
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
            {arg.value.map((ar: any, i: number) => {
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
                  <Box mt={2}>{renderParamTypes(ar)}</Box>
                </Box>
              );
            })}
          </Stack>
        </Collapse>
      </>
    );
  }
};
