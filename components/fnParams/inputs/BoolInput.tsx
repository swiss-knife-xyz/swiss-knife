import { Box, InputProps } from "@chakra-ui/react";

import { InputInfo } from "./InputInfo";
import { JsonFragment } from "ethers";
import { useEffect } from "react";
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

export const BoolInput = ({
  input,
  value,
  onChange,
  ...props
}: InputFieldProps) => {
  const selectedBoolOption = boolOptions[value === "true" ? 1 : 0];

  // set initial value
  useEffect(() => {
    if (value !== undefined && value !== "") return;
    onChange({
      target: {
        value: boolOptions[0].value.toString(), // Convert boolean to string
      },
    } as React.ChangeEvent<HTMLInputElement>);
  }, [onChange, value]);

  return (
    <Box>
      <InputInfo input={input} />
      <DarkSelect
        boxProps={{
          w: "9rem",
        }}
        selectedOption={selectedBoolOption}
        setSelectedOption={(value) => {
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
