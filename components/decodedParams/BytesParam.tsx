import { useSearchParams } from "next/navigation";
import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Center,
  Collapse,
  HStack,
  Stack,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";
import { hexToBigInt, hexToString } from "viem";
import bigInt from "big-integer";
import { startHexWith0x } from "@/utils";
import { StringParam } from "./StringParam";
import { renderParams } from "../renderParams";
import { UintParam } from "./UintParam";
import TabsSelector from "../Tabs/TabsSelector";

interface Params {
  arg: {
    rawValue: string;
    value: {
      decoded: {
        functionName?: string;
        args: any[];
      } | null;
    };
  };
}

export const BytesParam = ({ arg }: Params) => {
  const { isOpen, onToggle } = useDisclosure();

  const BytesFormatOptions = useMemo(() => {
    const options = ["to Decimal", "to Binary", "to Text"];
    if (arg.value.decoded !== null) {
      options.unshift("Decode calldata");
    }
    return options;
  }, [arg.value.decoded]);

  const [selectedTabIndex, setSelectedTabIndex] = useState(0);

  const [decimal, setDecimal] = useState<string>("0");
  const [binary, setBinary] = useState<string>("0");
  const [text, setText] = useState<string>("");

  useEffect(() => {
    if (selectedTabIndex === 0 && arg.value.decoded !== null) {
      // Do nothing for "Decode calldata"
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
  }, [selectedTabIndex, arg.rawValue]);

  const renderConverted = () => {
    const index =
      arg.value.decoded !== null ? selectedTabIndex : selectedTabIndex + 1;
    switch (index) {
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
      <HStack w="full">
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
