import { Box, InputProps } from "@chakra-ui/react";
import { InputField } from "@/components/InputField";
import { InputInfo } from "./InputInfo";
import { JsonFragment } from "ethers";
import { useEffect, useState, useCallback } from "react";
import { DarkSelect } from "@/components/DarkSelect";

interface InputFieldProps extends InputProps {
  input: JsonFragment;
  value?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const boolOptions = [
  { label: "false", value: false },
  { label: "true", value: true },
] as const;

type BoolOption = (typeof boolOptions)[number];

interface SelectedBoolOptionState {
  label: string;
  value: boolean;
}

export const BoolInput = ({
  input,
  value,
  onChange,
  ...props
}: InputFieldProps) => {
  const [selectedBoolOption, setSelectedBoolOption] =
    useState<SelectedBoolOptionState>(boolOptions[0]);

  // set initial value
  useEffect(() => {
    onChange({
      target: {
        value: boolOptions[0].value.toString(), // Convert boolean to string
      },
    } as React.ChangeEvent<HTMLInputElement>);
  }, []);

  return (
    <Box>
      <InputInfo input={input} />
      <DarkSelect
        boxProps={{
          w: "9rem",
        }}
        selectedOption={selectedBoolOption}
        setSelectedOption={(value) => {
          setSelectedBoolOption(value as SelectedBoolOptionState);
          if (value) {
            onChange({
              target: {
                value: value.value.toString(), // Convert boolean to string
              },
            } as React.ChangeEvent<HTMLInputElement>);
          }
        }}
        options={boolOptions}
      />
    </Box>
  );
};
