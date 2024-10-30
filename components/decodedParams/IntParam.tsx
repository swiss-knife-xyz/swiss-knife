import React, { useState } from "react";
import { HStack, Skeleton } from "@chakra-ui/react";
import { ethFormatOptions, ETHSelectedOptionState, convertTo } from "@/utils";
import { InputField } from "../InputField";
import { DarkSelect } from "../DarkSelect";
import { motion } from "framer-motion";

interface Params {
  value: any;
}

export const IntParam = ({ value: _value }: Params) => {
  // for skeleton loading
  const showSkeleton = _value === undefined || _value === null;
  const value = !showSkeleton ? (_value as BigInt).toString() : "1234";

  const [selectedEthFormatOption, setSelectedEthFormatOption] =
    useState<ETHSelectedOptionState>({
      label: ethFormatOptions[0],
      value: ethFormatOptions[0],
    });

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
          value={convertTo(selectedEthFormatOption, value)}
          placeholder=""
          isReadOnly
          onChange={() => {}}
        />
        <DarkSelect
          boxProps={{
            w: "9rem",
            fontSize: "small",
          }}
          selectedOption={selectedEthFormatOption}
          setSelectedOption={(option) =>
            setSelectedEthFormatOption(option as ETHSelectedOptionState)
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
