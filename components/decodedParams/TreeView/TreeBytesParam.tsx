"use client";

import React, { useState, useMemo } from "react";
import { Box, Flex } from "@chakra-ui/react";
import { hexToBigInt, hexToString } from "viem";
import bigInt from "big-integer";
import { startHexWith0x } from "@/utils";
import { InputField } from "@/components/InputField";
import { DarkSelect, type FormatSelectProps } from "@/components/DarkSelect";
import { SelectedOptionState } from "@/types";

interface Params {
  formatSelectProps?: FormatSelectProps;
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
export const TreeBytesParam = ({
  arg: _arg,
  chainId,
  formatSelectProps,
}: Params) => {
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
  // Check if the rawValue is a valid hex string (some special decoders like
  // SafeMultiSend set rawValue to a summary string, not hex)
  const isValidHex = useMemo(() => {
    if (!arg.rawValue) return false;
    const stripped = arg.rawValue.startsWith("0x")
      ? arg.rawValue.slice(2)
      : arg.rawValue;
    return /^[0-9a-fA-F]*$/.test(stripped);
  }, [arg.rawValue]);

  // Derive conversions from the current bytes in the same render. Invalid or
  // empty input must not retain a previous parameter's converted value.
  const { decimal, binary, text } = useMemo(() => {
    if (isValidHex) {
      try {
        const hex = startHexWith0x(arg.rawValue);
        return {
          decimal: hexToBigInt(hex === "0x" ? "0x0" : hex).toString(),
          binary: bigInt(hex.slice(2) || "0", 16).toString(2),
          text: hexToString(hex),
        };
      } catch {}
    }
    return { decimal: "0", binary: "0", text: "" };
  }, [arg.rawValue, isValidHex]);

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
      {isValidHex && (
        <Box flexShrink={0}>
          <DarkSelect
            {...formatSelectProps}
            boxProps={{
              minW: "7rem",
              fontSize: "xs",
              ...formatSelectProps?.boxProps,
            }}
            selectedOption={selectedFormat}
            setSelectedOption={setSelectedFormat}
            options={formatOptions}
          />
        </Box>
      )}
    </Flex>
  );
};
