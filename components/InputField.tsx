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
