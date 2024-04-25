import React, { useState } from "react";
import { HStack } from "@chakra-ui/react";
import { ethFormatOptions, getConvertion } from "@/utils";
import { SelectedOptionState } from "@/types";
import { InputField } from "../InputField";
import { DarkSelect } from "../DarkSelect";

interface Params {
  value: any;
}

export const UintParam = ({ value }: Params) => {
  const [selectedEthFormatOption, setSelectedEthFormatOption] =
    useState<SelectedOptionState>({
      label: ethFormatOptions[1],
      value: ethFormatOptions[1],
    });

  return (
    <HStack>
      <InputField
        value={getConvertion(selectedEthFormatOption, value)}
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
