import { Box, HStack, Textarea } from "@chakra-ui/react";
import { InputField } from "../InputField";
import { CopyToClipboard } from "../CopyToClipboard";
import { decodedValueFieldProps } from "./paramStyles";

export function PlainStringValue({ value }: { value: string }) {
  return (
    <HStack w="full" minW={0} align="start">
      {value.length > 200 || value.includes("\n") ? (
        <Box w="full" minW={0}>
          <HStack justify="flex-end" mb={1}>
            <CopyToClipboard
              textToCopy={value}
              size="xs"
              aria-label="Copy string"
            />
          </HStack>
          <Textarea
            {...decodedValueFieldProps}
            h="auto"
            minH="64px"
            rows={3}
            value={value}
            isReadOnly
            resize="vertical"
            bg="whiteAlpha.50"
            borderColor="border.default"
            aria-label="String value"
          />
        </Box>
      ) : (
        <InputField
          {...decodedValueFieldProps}
          value={value}
          placeholder=""
          isReadOnly
          onChange={() => {}}
        />
      )}
    </HStack>
  );
}
