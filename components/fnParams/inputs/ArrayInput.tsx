import { InputProps } from "@chakra-ui/react";
import { JsonFragment } from "ethers";

interface InputFieldProps extends InputProps {
  input: JsonFragment;
  value?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ArrayInput = ({ input, value, onChange }: InputFieldProps) => {
  return (
    <>
      ArrayInput
      {JSON.stringify({
        input,
        value,
      })}
    </>
  );
};
