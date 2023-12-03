import React, { useState } from "react";
import { HStack } from "@chakra-ui/react";
import { formatEther } from "viem";
import { ethFormatOptions } from "@/utils";
import { SelectedOptionState } from "@/types";
import { InputField } from "../InputField";
import { DarkSelect } from "../DarkSelect";

interface Params {
  value: string | number | bigint;
}

export const UintParam = ({ value }: Params) => {
  value = BigInt(value).toString();

  const [selectedEthFormatOption, setSelectedEthFormatOption] =
    useState<SelectedOptionState>({
      label: ethFormatOptions[1],
      value: ethFormatOptions[1],
    });

  return (
    <HStack>
      <InputField
        value={
          selectedEthFormatOption?.value === "Wei"
            ? value
            : formatEther(BigInt(value))
        }
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
        setSelectedOption={setSelectedEthFormatOption}
        options={ethFormatOptions.map((str) => ({
          label: str,
          value: str,
        }))}
      />
    </HStack>
  );
};
