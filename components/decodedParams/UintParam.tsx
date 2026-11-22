import React, { useState } from "react";
import {
  Button,
  type ButtonProps,
  HStack,
  InputLeftElement,
  Skeleton,
  Text,
  Box,
  Flex,
  Tag,
} from "@chakra-ui/react";
import { ethFormatOptions, convertTo, ETHSelectedOptionState } from "@/utils";
import { InputField } from "../InputField";
import { DarkSelect, type FormatSelectProps } from "../DarkSelect";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

import { formatWithCommas } from "@/utils/formatWithCommas";

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
  formatSelectProps?: FormatSelectProps;
  formatting?: "compact" | "separators";
  formatButtonProps?: Pick<ButtonProps, "borderRadius" | "color" | "_hover">;
  value: any;
}

export const UintParam = ({
  value: _value,
  formatSelectProps,
  formatButtonProps,
  formatting = "compact",
}: Params) => {
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
  const unixDate = unixSelected ? new Date(Number(value) * 1_000) : null;
  const relativeTime =
    unixDate && !Number.isNaN(unixDate.getTime())
      ? formatDistanceToNow(unixDate, { addSuffix: true })
      : undefined;
  const isNumericFormat = numericFormats.includes(
    selectedEthFormatOption?.value
  );
  const hasCompactNotation =
    isNumericFormat && formatCompact(conversionValue) !== conversionValue;
  const canFormat =
    formatting === "separators"
      ? isNumericFormat && /^-?\d{4,}(?:\.\d+)?$/.test(conversionValue)
      : hasCompactNotation;

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
          alignItems="stretch"
        >
          <Box flex="1" minW="0" w="full" maxW="100%">
            <InputField
              InputLeftElement={
                <>
                  {unixSelected && (
                    <InputLeftElement width="auto" h="full" pl={2}>
                      <Button
                        size="xs"
                        px="2"
                        h="5"
                        onClick={() => setShowLocalTime((prev) => !prev)}
                      >
                        {showLocalTime ? "Local" : "UTC"}
                      </Button>
                    </InputLeftElement>
                  )}
                  {canFormat && formatting === "compact" && (
                    <InputLeftElement width="auto" h="full" pl={2}>
                      <Button
                        size="xs"
                        px="2"
                        h="5"
                        {...formatButtonProps}
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
                  : formatting === "compact" && canFormat && showFormatted
                    ? formatWithCommas(conversionValue)
                    : conversionValue
              }
              copyValue={
                formatting === "separators" && !unixSelected
                  ? conversionValue
                  : undefined
              }
              valueTooltip={
                unixSelected
                  ? relativeTime
                  : formatting === "separators" &&
                      canFormat &&
                      hasCompactNotation
                    ? `${formatWithCommas(conversionValue)} (${formatCompact(conversionValue)})`
                    : undefined
              }
              pl={
                unixSelected
                  ? showLocalTime
                    ? "3.75rem"
                    : "3.25rem"
                  : canFormat && formatting === "compact"
                    ? "5rem"
                    : undefined
              }
              placeholder=""
              isReadOnly
              onChange={() => {}}
              fontSize="sm"
              width="100%"
            />
          </Box>
          <Box
            width={
              formatSelectProps?.boxProps?.w ?? { base: "100%", md: "auto" }
            }
            position="relative"
          >
            <DarkSelect
              {...formatSelectProps}
              boxProps={{
                minW: { base: "100%", md: "8rem" },
                maxW: { base: "100%", md: "8rem" },
                fontSize: "xs",
                ...formatSelectProps?.boxProps,
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
        {formatting === "compact" &&
          hasCompactNotation &&
          showFormatted &&
          (() => {
            const compact = formatCompact(conversionValue);
            // Only show compact notation when it actually simplifies (K, M, B suffix)
            if (compact === conversionValue) return null;
            return (
              <Box ml={unixSelected || hasCompactNotation ? "5rem" : 0} mt={1}>
                <Tag
                  size="sm"
                  variant="subtle"
                  colorScheme="blue"
                  fontFamily="mono"
                  fontSize="xs"
                >
                  {compact}
                </Tag>
              </Box>
            );
          })()}
      </Box>
    </motion.div>
  );
};
