import { useState } from "react";
import { Button, HStack, Text, ButtonProps } from "@chakra-ui/react";
import { Copy, CheckCircle } from "lucide-react";

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
      variant="ghost"
      color="whiteAlpha.700"
      _hover={{ color: "white", bg: "whiteAlpha.200" }}
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
      <HStack spacing={2}>
        {copySuccess ? (
          <CheckCircle size={16} color="var(--chakra-colors-success-text)" />
        ) : (
          <Copy size={16} />
        )}
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
