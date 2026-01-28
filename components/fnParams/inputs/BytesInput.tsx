import { Box, Button, HStack, InputProps, Spacer } from "@chakra-ui/react";
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
  // Parse fixed size from type (e.g. "bytes32" → 32, "bytes" → null)
  const fixedMatch = input.type?.match(/^bytes(\d+)$/);
  const fixedSize = fixedMatch ? parseInt(fixedMatch[1]) : null;

  const fillZero = (byteCount: number) => {
    onChange({
      target: { value: "0x" + "00".repeat(byteCount) },
    } as any);
  };

  return (
    <Box>
      <InputInfo input={input} />
      <InputField value={value} placeholder="" onChange={onChange} {...props} />
      <HStack my={2}>
        <Spacer />
        {fixedSize ? (
          <Button
            onClick={() => fillZero(fixedSize)}
            size={"sx"}
            fontWeight={"thin"}
            variant={"ghost"}
            color="whiteAlpha.300"
          >
            [zero]
          </Button>
        ) : (
          <Button
            onClick={() => fillZero(32)}
            size={"sx"}
            fontWeight={"thin"}
            variant={"ghost"}
            color="whiteAlpha.300"
          >
            [zero-32]
          </Button>
        )}
      </HStack>
    </Box>
  );
};
