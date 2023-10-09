import { useState } from "react";
import { Button, HStack, Text, ButtonProps } from "@chakra-ui/react";
import { CopyIcon, CheckCircleIcon } from "@chakra-ui/icons";

interface CopyToClipboardParams extends ButtonProps {
  textToCopy: string;
  labelText?: string;
}

export const CopyToClipboard = ({
  textToCopy,
  labelText,
  ...rest
}: CopyToClipboardParams) => {
  const [loading, setLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  return (
    <Button
      size="sm"
      onClick={async () => {
        setLoading(true);
        await navigator.clipboard.writeText(textToCopy);
        setLoading(false);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2_000);
      }}
      isLoading={loading}
      {...rest}
    >
      <HStack>
        {copySuccess ? <CheckCircleIcon color={"green.300"} /> : <CopyIcon />}
        {labelText ? (
          copySuccess ? (
            <Text>Copied</Text>
          ) : (
            <Text>{labelText}</Text>
          )
        ) : null}
      </HStack>
    </Button>
  );
};
