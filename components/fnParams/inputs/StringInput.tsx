import { Box, HStack, InputProps } from "@chakra-ui/react";
import { InputField } from "@/components/InputField";
import { InputInfo } from "./InputInfo";
import { JsonFragment } from "ethers";

interface InputFieldProps extends InputProps {
  input: JsonFragment;
  value?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  labelAction?: React.ReactNode;
}

export const StringInput = ({
  input,
  value,
  onChange,
  labelAction,
  ...props
}: InputFieldProps) => {
  return (
    <Box>
      {labelAction ? (
        <HStack justify="space-between" minW={0} mb={1.5} sx={{ "& .fn-input-info": { mb: 0 } }}>
          <InputInfo input={input} />
          {labelAction}
        </HStack>
      ) : (
        <InputInfo input={input} />
      )}
      <InputField value={value} placeholder="" onChange={onChange} {...props} />
    </Box>
  );
};
