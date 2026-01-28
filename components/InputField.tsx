import {
  Input,
  InputGroup,
  InputRightElement,
  InputProps,
  InputLeftElement,
} from "@chakra-ui/react";
import { AlertCircle } from "lucide-react";
import { CopyToClipboard } from "@/components/CopyToClipboard";

interface InputFieldProps extends InputProps {
  placeholder: string;
  value?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  InputLeftElement?: React.ReactNode;
}

export const InputField = ({
  type,
  placeholder,
  value,
  onChange,
  isInvalid,
  InputLeftElement: LeftElement,
  ...rest
}: InputFieldProps) => (
  <InputGroup>
    {LeftElement}
    <Input
      type={type ?? "text"}
      placeholder={placeholder}
      value={value ?? ""}
      onChange={onChange}
      isInvalid={isInvalid}
      pr="3rem"
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor={isInvalid ? "red.500" : "whiteAlpha.200"}
      borderRadius="lg"
      _hover={{
        borderColor: isInvalid ? "red.500" : "whiteAlpha.400",
      }}
      _focus={{
        borderColor: isInvalid ? "red.500" : "blue.400",
        boxShadow: isInvalid
          ? "0 0 0 1px var(--chakra-colors-red-500)"
          : "0 0 0 1px var(--chakra-colors-blue-400)",
      }}
      color="white"
      _placeholder={{ color: "whiteAlpha.500" }}
      fontSize="md"
      py={3}
      transition="all 0.2s"
      {...rest}
    />
    <InputRightElement pr={1} h="full">
      {!isInvalid ? (
        <CopyToClipboard textToCopy={value ?? ""} />
      ) : (
        <AlertCircle size={18} color="var(--chakra-colors-red-400)" />
      )}
    </InputRightElement>
  </InputGroup>
);
