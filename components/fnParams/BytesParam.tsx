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
import { hexToBigInt } from "viem";
import { guessAbiEncodedData } from "@openchainxyz/abi-guesser";
import bigInt from "big-integer";
import axios from "axios";
import { fetchFunctionInterface, startHexWith0x } from "@/utils";
import { StringParam } from "./StringParam";
import { renderParams } from "../renderParams";
import { UintParam } from "./UintParam";
import TabsSelector from "../Tabs/TabsSelector";

const BytesFormatOptions = ["Decode calldata", "to Decimal", "to Binary"];

interface Params {
  value: string;
}

export const BytesParam = ({ value }: Params) => {
  const { isOpen, onToggle } = useDisclosure();
  const searchParams = useSearchParams();

  const addressFromURL = searchParams.get("address");
  const chainIdFromURL = searchParams.get("chainId");

  const [selectedTabIndex, setSelectedTabIndex] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [fnDescription, setFnDescription] = useState<TransactionDescription>();
  const [decodedStatus, setDecodedStatus] = useState(true);

  const [decimal, setDecimal] = useState<string>("0");
  const [binary, setBinary] = useState<string>("0");

  useEffect(() => {
    if (selectedTabIndex === 0) {
      decodeCalldata();
    } else {
      setDecimal(hexToBigInt(startHexWith0x(value)).toString());
      setBinary(
        bigInt(value.startsWith("0x") ? value.slice(2) : value, 16).toString(2)
      );
    }
  }, [selectedTabIndex]);

  // TODO: the following functions are duplicated from app/calldata/decoder/page.tsx and can be put into separate hooks
  const _decodeWithABI = (_abi: any, _calldata?: string) => {
    let decodedStatus = false;

    const iface = new Interface(_abi);
    if (!_calldata) return decodedStatus;

    let res = iface.parseTransaction({ data: _calldata });
    if (res === null) {
      return decodedStatus;
    }

    console.log(res);
    setFnDescription(res);

    decodedStatus = true;
    return decodedStatus;
  };

  const _getAllPossibleDecoded = (functionsArr: string[]) => {
    let _decodedStatus = false;
    for (var i = 0; i < functionsArr.length; i++) {
      const fn = functionsArr[i];
      const _abi = [`function ${fn}`];

      try {
        _decodedStatus = _decodeWithABI(_abi, value);
      } catch {
        continue;
      }
    }

    setDecodedStatus(_decodedStatus);
  };

  const decodeWithSelector = async () => {
    if (!(value.length >= 10)) {
      setDecodedStatus(false);
      return;
    }
    setIsLoading(true);

    const selector = value.slice(0, 10);
    try {
      const results = await fetchFunctionInterface(selector);

      if (results.length > 0) {
        // can have multiple entries with the same selector
        _getAllPossibleDecoded(results);
      } else {
        setDecodedStatus(false);
      }

      setIsLoading(false);
    } catch {
      try {
        // try decoding the `abi.encode` custom bytes
        const paramTypes: ParamType[] = guessAbiEncodedData(value)!;
        console.log({ paramTypes });

        const abiCoder = AbiCoder.defaultAbiCoder();
        const decoded = abiCoder.decode(paramTypes, value);

        console.log({ decoded });

        const _fnDescription: TransactionDescription = {
          name: "",
          args: decoded,
          signature: "abi.encode",
          selector: "",
          value: BigInt(0),
          fragment: FunctionFragment.from({
            inputs: paramTypes,
            name: "test",
            outputs: [],
            type: "function",
            stateMutability: "nonpayable",
          }),
        };

        setFnDescription(_fnDescription);

        if (!decoded || decoded.length === 0) {
          setDecodedStatus(false);
        }
      } catch (e) {
        console.error(e);

        setDecodedStatus(false);
      }

      setIsLoading(false);
    }
  };

  const fetchContractABI = async (): Promise<any> => {
    if (!addressFromURL && !chainIdFromURL) return {};

    try {
      const response = await axios.get(
        `https://anyabi.xyz/api/get-abi/${chainIdFromURL}/${addressFromURL}`
      );
      return JSON.stringify(response.data.abi);
    } catch {
      return {};
    }
  };

  const decodeCalldata = async () => {
    setIsLoading(true);

    console.log({
      addressFromURL,
      chainIdFromURL,
    });

    if (addressFromURL && chainIdFromURL) {
      try {
        const fetchedABI = await fetchContractABI();
        const status = _decodeWithABI(fetchedABI, value);

        if (status === false) {
          decodeWithSelector();
        }
      } catch {
        decodeWithSelector();
      }
    } else {
      decodeWithSelector();
    }

    setIsLoading(false);
  };

  const renderConverted = () => {
    switch (selectedTabIndex) {
      case 0:
        return fnDescription ? (
          <Box minW={"80%"}>
            {fnDescription.name ? (
              <Box>
                <Box fontSize={"xs"} color={"whiteAlpha.600"}>
                  function
                </Box>
                <Box>{fnDescription.name}</Box>
              </Box>
            ) : null}
            <Stack
              mt={2}
              p={4}
              spacing={4}
              border="1px"
              borderStyle={"dashed"}
              borderColor={"whiteAlpha.500"}
              rounded={"lg"}
            >
              {fnDescription.fragment.inputs.map((input, i) => {
                const value = fnDescription.args[i];
                return renderParams(i, input, value);
              })}
            </Stack>
          </Box>
        ) : decodedStatus === false ? (
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
      default:
        return null;
    }
  };

  return (
    <Stack
      mt={2}
      p={4}
      spacing={4}
      border="2px"
      borderColor={"whiteAlpha.500"}
      rounded={"lg"}
    >
      <HStack>
        <StringParam value={value} />
        <Text
          fontSize={"xl"}
          fontWeight={"bold"}
          cursor={"pointer"}
          onClick={onToggle}
        >
          {isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </Text>
      </HStack>
      <Collapse in={isOpen} animateOpacity>
        <Box pb={4} fontSize={"sm"}>
          <TabsSelector
            tabs={BytesFormatOptions}
            selectedTabIndex={selectedTabIndex}
            setSelectedTabIndex={setSelectedTabIndex}
          />
        </Box>
        {isLoading ? (
          <Center mt={4}>
            <Spinner />
          </Center>
        ) : (
          renderConverted()
        )}
      </Collapse>
    </Stack>
  );
};
