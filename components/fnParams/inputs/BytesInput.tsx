import { Box, InputProps } from "@chakra-ui/react";
import { InputField } from "@/components/InputField";
import { InputInfo } from "./InputInfo";
import { JsonFragment } from "ethers";

interface InputFieldProps extends InputProps {
  input: JsonFragment;
  value?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const BytesInput = ({
  input,
  value,
  onChange,
  ...props
}: InputFieldProps) => {
  return (
    <Box>
      <InputInfo input={input} />
      <InputField value={value} placeholder="" onChange={onChange} {...props} />
    </Box>
  );
};
