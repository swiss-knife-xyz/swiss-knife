import { Box, InputProps } from "@chakra-ui/react";
import { InputField } from "@/components/InputField";
import { InputInfo } from "./InputInfo";
import { JsonFragment } from "ethers";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    // Convert the string value to a proper numeric boolean representation
    onChange({
      target: {
        value: selectedBoolOption.value, // Will be "0" or "1"
      },
    } as any);
  }, [selectedBoolOption, onChange]);

  return (
    <Box>
      <InputInfo input={input} />
      <DarkSelect
        boxProps={{
          w: "9rem",
        }}
        selectedOption={selectedBoolOption}
        setSelectedOption={(value) =>
          setSelectedBoolOption(value as SelectedBoolOptionState)
        }
        options={boolOptions}
      />
    </Box>
  );
};
