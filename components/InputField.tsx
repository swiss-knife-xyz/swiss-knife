import {
  Input,
  InputGroup,
  InputRightElement,
  InputProps,
} from "@chakra-ui/react";
import { WarningIcon } from "@chakra-ui/icons";
import { CopyToClipboard } from "@/components/CopyToClipboard";

interface InputFieldProps extends InputProps {
  placeholder: string;
  value?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const InputField = ({
  type,
  placeholder,
  value,
  onChange,
  isInvalid,
  ...rest
}: InputFieldProps) => (
  <InputGroup>
    <Input
      type={type ?? "text"}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
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
