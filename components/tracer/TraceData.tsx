"use client";
import { Box, Button, Flex, Text, useClipboard } from "@chakra-ui/react";
import { CheckIcon, CopyIcon } from "@chakra-ui/icons";

export function TraceData({
  label,
  value,
  color = "text.primary",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  const { onCopy, hasCopied } = useClipboard(value);
  return (
    <Box minW={0}>
      <Flex align="center" justify="space-between" mb={1}>
        <Text fontSize="xs" color="text.secondary">
          {label}
        </Text>
        <Button
          variant="ghost"
          size="xs"
          minW="24px"
          h="24px"
          px={1}
          aria-label={`Copy ${label}`}
          onClick={onCopy}
          color={hasCopied ? "green.300" : "text.secondary"}
        >
          {hasCopied ? <CheckIcon boxSize={3} /> : <CopyIcon boxSize={3} />}
        </Button>
      </Flex>
      <Box
        as="pre"
        fontSize="xs"
        fontFamily="mono"
        p={2.5}
        bg="bg.base"
        border="1px solid"
        borderColor="border.subtle"
        borderRadius="md"
        whiteSpace="pre-wrap"
        overflowWrap="anywhere"
        maxH="200px"
        overflowY="auto"
        tabIndex={0}
        color={color}
      >
        {value}
      </Box>
    </Box>
  );
}
