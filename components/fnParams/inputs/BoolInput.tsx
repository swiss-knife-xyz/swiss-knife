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

const boolOptions = ["false", "true"] as const;
type BoolOption = (typeof boolOptions)[number];
interface SelectedBoolOptionState {
  label: BoolOption;
  value: BoolOption;
}

export const BoolInput = ({
  input,
  value,
  onChange,
  ...props
}: InputFieldProps) => {
  const [selectedBoolOption, setSelectedBoolOption] =
    useState<SelectedBoolOptionState>({
      label: boolOptions[0],
      value: boolOptions[0],
    });

  useEffect(() => {
    onChange({
      target: {
        value: selectedBoolOption.value,
      },
    } as any);
  }, [selectedBoolOption]);

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
        options={boolOptions.map((str) => ({
          label: str,
          value: str,
        }))}
      />
    </Box>
  );
};
