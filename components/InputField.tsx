import {
  Input,
  InputGroup,
  InputRightElement,
  InputProps,
  InputLeftElement,
  Button,
} from "@chakra-ui/react";
import { WarningIcon } from "@chakra-ui/icons";
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
  InputLeftElement,
  ...rest
}: InputFieldProps) => (
  <InputGroup>
    {InputLeftElement}
    <Input
      type={type ?? "text"}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      isInvalid={isInvalid}
      pr="3rem"
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor={isInvalid ? "red.400" : "whiteAlpha.200"}
      _hover={{ borderColor: isInvalid ? "red.300" : "whiteAlpha.300" }}
      _focus={{
        borderColor: isInvalid ? "red.400" : "blue.400",
        boxShadow: isInvalid
          ? "0 0 0 1px var(--chakra-colors-red-400)"
          : "0 0 0 1px var(--chakra-colors-blue-400)",
      }}
      color="gray.100"
      _placeholder={{ color: "gray.500" }}
      fontSize="lg"
      py={3}
      {...rest}
    />
    <InputRightElement pr={1}>
      {!isInvalid ? (
        <CopyToClipboard textToCopy={value ?? ""} />
      ) : (
        <WarningIcon color={"red.300"} />
      )}
    </InputRightElement>
  </InputGroup>
);
