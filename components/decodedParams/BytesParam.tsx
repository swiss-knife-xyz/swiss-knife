import React, { useState, useEffect, useMemo } from "react";
import {
  Badge,
  Box,
  Collapse,
  HStack,
  Skeleton,
  Stack,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";
import { hexToBigInt, hexToString, zeroHash } from "viem";
import bigInt from "big-integer";
import { startHexWith0x } from "@/utils";
import { StringParam } from "./StringParam";
import { renderParams } from "../renderParams";
import { UintParam } from "./UintParam";
import TabsSelector from "../Tabs/TabsSelector";
import { getDisplayFunctionName } from "@/utils/functionNames";

interface Params {
  arg: {
    rawValue: string;
    value: {
      decoded: {
        functionName?: string;
        args: any[];
      } | null;
    };
  } | null;
  chainId?: number;
}

export const BytesParam = ({ arg: _arg, chainId }: Params) => {
  const showSkeleton = _arg === undefined || _arg === null;
  const arg = !showSkeleton
    ? _arg
    : {
        rawValue: zeroHash,
        value: {
          decoded: null,
        },
      };

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
    if (!showSkeleton) {
      if (selectedTabIndex === 0 && arg.value.decoded !== null) {
        // Do nothing for "Decode calldata"
      } else {
        const hexStartWith0x = startHexWith0x(arg.rawValue);
        setDecimal(
          hexToBigInt(
            hexStartWith0x === "0x" ? "0x0" : hexStartWith0x
          ).toString()
        );
        setBinary(
          bigInt(
            arg.rawValue.startsWith("0x")
              ? arg.rawValue.slice(2)
              : arg.rawValue,
            16
          ).toString(2)
        );
        setText(hexToString(startHexWith0x(arg.rawValue)));
      }
    }
  }, [selectedTabIndex, arg]);

  const renderConverted = () => {
    const index =
      arg.value.decoded !== null ? selectedTabIndex : selectedTabIndex + 1;
    switch (index) {
      case 0: {
        if (!arg.value.decoded) {
          return null;
        }
        const decodedFn = getDisplayFunctionName(
          arg.value.decoded.functionName,
          arg.value.decoded.guessedFunctionName
        );
        return (
          <Box minW={"80%"}>
            {decodedFn.name ? (
              <HStack alignItems={"flex-start"}>
                <Box>
                  <Box fontSize={"xs"} color={"whiteAlpha.600"}>
                    {`function${decodedFn.isGuessed ? " (guessed)" : ""}`}
                  </Box>
                  <Box>{decodedFn.name}</Box>
                </Box>
                {decodedFn.isGuessed ? (
                  <Badge colorScheme="purple" variant="outline">
                    guessed
                  </Badge>
                ) : null}
              </HStack>
            ) : null}
            <Stack
              mt={decodedFn.name ? 2 : 0}
              p={4}
              spacing={2}
              bg={"whiteAlpha.50"}
              rounded={"lg"}
            >
              {arg.value.decoded.args.map((ar: any, i: number) => {
                return renderParams(i, ar, chainId);
              })}
            </Stack>
          </Box>
        );
      }
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

  return showSkeleton ? (
    <HStack w="full">
      <Skeleton
        flexGrow={1}
        height="4rem"
        rounded="md"
        startColor="whiteAlpha.50"
        endColor="whiteAlpha.400"
      />
    </HStack>
  ) : (
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
        <Box flex="1">
          <StringParam value={arg.rawValue} />
        </Box>
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
