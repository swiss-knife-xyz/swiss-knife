import React, { useState } from "react";
import {
  Button,
  HStack,
  InputLeftElement,
  Skeleton,
  Box,
} from "@chakra-ui/react";
import { ethFormatOptions, convertTo, ETHSelectedOptionState } from "@/utils";
import { InputField } from "../InputField";
import { DarkSelect } from "../DarkSelect";
import { motion } from "framer-motion";

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

  const conversionValue = convertTo(selectedEthFormatOption, value);
  const unixSelected =
    selectedEthFormatOption && selectedEthFormatOption.value === "Unix Time";

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
      <HStack>
        <InputField
          InputLeftElement={
            unixSelected && (
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
            )
          }
          value={
            unixSelected
              ? showLocalTime
                ? new Date(Number(value) * 1_000).toString()
                : conversionValue
              : conversionValue
          }
          pl={unixSelected ? "5rem" : undefined}
          w={unixSelected ? "25rem" : undefined}
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
    </motion.div>
  );
};
