"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Box, Flex } from "@chakra-ui/react";
import { hexToBigInt, hexToString } from "viem";
import bigInt from "big-integer";
import { startHexWith0x } from "@/utils";
import { InputField } from "@/components/InputField";
import { DarkSelect } from "@/components/DarkSelect";
import { SelectedOptionState } from "@/types";

interface Params {
  arg: {
    rawValue: string;
    value: {
      decoded: null;
    };
  } | null;
  chainId?: number;
}

/**
 * A simplified bytes param component for the tree view.
 * Uses a dropdown for format selection like UintParam.
 */
export const TreeBytesParam = ({ arg: _arg, chainId }: Params) => {
  const arg = _arg ?? {
    rawValue: "0x",
    value: { decoded: null },
  };

  const formatOptions = useMemo(
    () => [
      { label: "Hex", value: "hex" },
      { label: "Decimal", value: "decimal" },
      { label: "Binary", value: "binary" },
      { label: "Text", value: "text" },
    ],
    []
  );

  const [selectedFormat, setSelectedFormat] = useState<SelectedOptionState>(
    formatOptions[0]
  );
  const [decimal, setDecimal] = useState<string>("0");
  const [binary, setBinary] = useState<string>("0");
  const [text, setText] = useState<string>("");

  useEffect(() => {
    if (arg.rawValue) {
      const hexStartWith0x = startHexWith0x(arg.rawValue);
      setDecimal(
        hexToBigInt(hexStartWith0x === "0x" ? "0x0" : hexStartWith0x).toString()
      );
      setBinary(
        bigInt(
          arg.rawValue.startsWith("0x") ? arg.rawValue.slice(2) : arg.rawValue,
          16
        ).toString(2)
      );
      setText(hexToString(startHexWith0x(arg.rawValue)));
    }
  }, [arg.rawValue]);

  const getDisplayValue = () => {
    switch (selectedFormat?.value) {
      case "hex":
        return arg.rawValue;
      case "decimal":
        return decimal;
      case "binary":
        return binary;
      case "text":
        return text;
      default:
        return arg.rawValue;
    }
  };

  return (
    <Flex gap={2} align="flex-start" width="100%">
      <Box flex="1" minW="0">
        <InputField
          value={getDisplayValue()}
          placeholder=""
          isReadOnly
          onChange={() => {}}
        />
      </Box>
      <Box flexShrink={0}>
        <DarkSelect
          boxProps={{
            minW: "7rem",
            fontSize: "xs",
          }}
          selectedOption={selectedFormat}
          setSelectedOption={setSelectedFormat}
          options={formatOptions}
        />
      </Box>
    </Flex>
  );
};
