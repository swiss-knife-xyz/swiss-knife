import React, { useState } from "react";
import {
  Button,
  HStack,
  InputLeftElement,
  Skeleton,
  Text,
  Box,
  Flex,
  Portal,
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
      style={{ width: "100%" }}
    >
      <Box width="100%">
        <Flex
          direction={{ base: "column", md: "row" }}
          width="100%"
          gap={2}
          alignItems="flex-start"
        >
          <Box flex="1" minW="0" maxW="100%">
            <InputField
              InputLeftElement={
                <>
                  {unixSelected && (
                    <InputLeftElement>
                      <Button
                        px="1rem"
                        ml="1rem"
                        size="xs"
                        onClick={() => setShowLocalTime((prev) => !prev)}
                      >
                        {showLocalTime ? "Local" : "UTC"}
                      </Button>
                    </InputLeftElement>
                  )}
                  {isNumericFormat && (
                    <InputLeftElement>
                      <Button
                        size="xs"
                        minW="14"
                        px="2"
                        py="4"
                        ml="1.5rem"
                        h="5"
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
              placeholder=""
              isReadOnly
              onChange={() => {}}
              fontSize="sm"
              width="100%"
            />
          </Box>
          <Box
            width={{ base: "100%", md: "auto" }}
            zIndex="9999"
            position="relative"
            className="uint-select-container"
            sx={{
              "& .chakra-react-select__menu": {
                zIndex: 9999,
                position: "absolute !important",
              },
            }}
          >
            <DarkSelect
              boxProps={{
                minW: { base: "100%", md: "8rem" },
                maxW: { base: "100%", md: "8rem" },
                fontSize: "xs",
                position: "static",
                zIndex: 9999,
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
          </Box>
        </Flex>
        {isNumericFormat && showFormatted && (
          <Text
            fontSize="xs"
            color="whiteAlpha.700"
            ml={unixSelected || isNumericFormat ? "5rem" : 0}
            mt={1}
          >
            ({formatCompact(conversionValue)})
          </Text>
        )}
      </Box>
    </motion.div>
  );
};
