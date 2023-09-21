import { useState } from "react";
import { Button, HStack, Text } from "@chakra-ui/react";
import { CopyIcon, CheckCircleIcon } from "@chakra-ui/icons";

export const CopyToClipboard = ({
  textToCopy,
  labelText,
}: {
  textToCopy: string;
  labelText?: string;
}) => {
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
