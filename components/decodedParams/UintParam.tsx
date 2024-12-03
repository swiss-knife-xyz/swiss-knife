import React, { useState } from "react";
import {
  Button,
  HStack,
  InputLeftElement,
  Skeleton,
  Text,
  Box,
} from "@chakra-ui/react";
import { ethFormatOptions, convertTo, ETHSelectedOptionState } from "@/utils";
import { InputField } from "../InputField";
import { DarkSelect } from "../DarkSelect";
import { motion } from "framer-motion";

// Add helper functions for number formatting
const formatWithCommas = (value: string) => {
  const parts = value.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
};

const formatCompact = (value: string) => {
  const num = parseFloat(value);
  if (num >= 1e9) return (num / 1e9).toFixed(3) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(3) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(3) + "K";
  return value;
};

const numericFormats = [
  "Wei",
  "ETH",
  "Gwei",
  "10^6",
  "Minutes",
  "Hours",
  "Days",
  "Bps ↔️ %",
];

interface Params {
  value: any;
}

export const UintParam = ({ value: _value }: Params) => {
  // for skeleton loading
  const showSkeleton = _value === undefined || _value === null;
  const value = !showSkeleton ? (_value as BigInt).toString() : "1234";

  const [selectedEthFormatOption, setSelectedEthFormatOption] =
    useState<ETHSelectedOptionState>({
      label: ethFormatOptions[0],
      value: ethFormatOptions[0],
    });

  const [showLocalTime, setShowLocalTime] = useState(false);
  const [showFormatted, setShowFormatted] = useState(false);

  const conversionValue = convertTo(selectedEthFormatOption, value);
  const unixSelected =
    selectedEthFormatOption && selectedEthFormatOption.value === "Unix Time";
  const isNumericFormat = numericFormats.includes(
    selectedEthFormatOption?.value
  );

  return showSkeleton ? (
    <HStack w="full">
      <Skeleton
        height="2rem"
        width="20rem"
        rounded="md"
        startColor="whiteAlpha.50"
        endColor="whiteAlpha.400"
      />
      <Skeleton
        flexGrow={1}
        height="2rem"
        rounded="md"
        startColor="whiteAlpha.50"
        endColor="whiteAlpha.400"
      />
    </HStack>
  ) : (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Box>
        <HStack>
          <InputField
            InputLeftElement={
              <>
                {unixSelected && (
                  <InputLeftElement>
                    <Button
                      px="2rem"
                      ml="2rem"
                      size="sm"
                      onClick={() => setShowLocalTime((prev) => !prev)}
                    >
                      {showLocalTime ? "Local" : "UTC"}
                    </Button>
                  </InputLeftElement>
                )}
                {isNumericFormat && (
                  <InputLeftElement>
                    <Button
                      px="2rem"
                      ml="2rem"
                      size="sm"
                      onClick={() => setShowFormatted((prev) => !prev)}
                    >
                      {showFormatted ? "Raw" : "Format"}
                    </Button>
                  </InputLeftElement>
                )}
              </>
            }
            value={
              unixSelected
                ? showLocalTime
                  ? new Date(Number(value) * 1_000).toString()
                  : conversionValue
                : isNumericFormat && showFormatted
                ? formatWithCommas(conversionValue)
                : conversionValue
            }
            pl={unixSelected || isNumericFormat ? "5rem" : undefined}
            w={unixSelected || isNumericFormat ? "25rem" : undefined}
            placeholder=""
            isReadOnly
            onChange={() => {}}
          />
          <DarkSelect
            boxProps={{
              minW: "9rem",
              fontSize: "small",
            }}
            selectedOption={selectedEthFormatOption}
            setSelectedOption={(value) =>
              setSelectedEthFormatOption(value as ETHSelectedOptionState)
            }
            options={ethFormatOptions.map((str) => ({
              label: str,
              value: str,
            }))}
          />
        </HStack>
        {isNumericFormat && showFormatted && (
          <Text fontSize="sm" color="gray.500" ml="5rem" mt={1}>
            ({formatCompact(conversionValue)})
          </Text>
        )}
      </Box>
    </motion.div>
  );
};
