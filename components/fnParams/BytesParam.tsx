import { useSearchParams } from "next/navigation";
import React, { useState, useEffect } from "react";
import {
  Box,
  Center,
  Collapse,
  HStack,
  Spinner,
  Stack,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";
import {
  AbiCoder,
  FunctionFragment,
  Interface,
  ParamType,
  TransactionDescription,
} from "ethers";
import { hexToBigInt, hexToString } from "viem";
import { guessAbiEncodedData } from "@openchainxyz/abi-guesser";
import bigInt from "big-integer";
import axios from "axios";
import { fetchFunctionInterface, startHexWith0x } from "@/utils";
import { StringParam } from "./StringParam";
import { renderParams } from "../renderParams";
import { UintParam } from "./UintParam";
import TabsSelector from "../Tabs/TabsSelector";

const BytesFormatOptions = [
  "Decode calldata",
  "to Decimal",
  "to Binary",
  "to Text",
];

interface Params {
  arg: any;
}

export const BytesParam = ({ arg }: Params) => {
  const { isOpen, onToggle } = useDisclosure();

  const [selectedTabIndex, setSelectedTabIndex] = useState(0);

  const [decimal, setDecimal] = useState<string>("0");
  const [binary, setBinary] = useState<string>("0");
  const [text, setText] = useState<string>("");

  useEffect(() => {
    if (selectedTabIndex === 0) {
    } else {
      setDecimal(hexToBigInt(startHexWith0x(arg.rawValue)).toString());
      setBinary(
        bigInt(
          arg.rawValue.startsWith("0x") ? arg.rawValue.slice(2) : arg.rawValue,
          16
        ).toString(2)
      );
      setText(hexToString(startHexWith0x(arg.rawValue)));
    }
  }, [selectedTabIndex]);

  const renderConverted = () => {
    switch (selectedTabIndex) {
      case 0:
        return arg.value.decoded ? (
          <Box minW={"80%"}>
            {arg.value.decoded.functionName &&
            arg.value.decoded.functionName !== "__abi_decoded__" ? (
              <>
                <Box>
                  <Box fontSize={"xs"} color={"whiteAlpha.600"}>
                    function
                  </Box>
                  <Box>{arg.value.decoded.functionName}</Box>
                </Box>
                <Stack
                  mt={2}
                  p={4}
                  spacing={2}
                  bg={"whiteAlpha.50"}
                  rounded={"lg"}
                >
                  {arg.value.decoded.args.map((ar: any, i: number) => {
                    return renderParams(i, ar);
                  })}
                </Stack>
              </>
            ) : (
              <Stack spacing={2}>
                {arg.value.decoded.args.map((ar: any, i: number) => {
                  return renderParams(i, ar);
                })}
              </Stack>
            )}
          </Box>
        ) : arg.value.decoded === undefined ? (
          <Center color="red.300">Unable to decode calldata</Center>
        ) : null;
      case 1:
        return (
          <Box mt={4}>
            <UintParam value={decimal} />
          </Box>
        );
      case 2:
        return (
          <Box mt={4}>
            <StringParam value={binary} />
          </Box>
        );
      case 3:
        return (
          <Box mt={4}>
            <StringParam value={text} />
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Stack mt={2} p={4} bg={"whiteAlpha.50"} rounded={"lg"}>
      <HStack>
        <Text
          fontSize={"xl"}
          fontWeight={"bold"}
          cursor={"pointer"}
          onClick={onToggle}
        >
          {isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </Text>
        <StringParam value={arg.rawValue} />
      </HStack>
      <Collapse in={isOpen} animateOpacity>
        <Stack
          ml={2}
          px={4}
          pb={4}
          borderLeft="1px"
          borderBottom="1px"
          borderStyle={"dashed"}
          borderColor={"whiteAlpha.300"}
          roundedBottom={"lg"}
        >
          <Box fontSize={"sm"}>
            <TabsSelector
              mt={0}
              tabs={BytesFormatOptions}
              selectedTabIndex={selectedTabIndex}
              setSelectedTabIndex={setSelectedTabIndex}
            />
          </Box>
          {renderConverted()}
        </Stack>
      </Collapse>
    </Stack>
  );
};
