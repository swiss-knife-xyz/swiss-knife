"use client";
import { Box, Button, Flex, Text, useClipboard } from "@chakra-ui/react";
import { CheckIcon, CopyIcon, ExternalLinkIcon } from "@chakra-ui/icons";
import { getPath } from "@/utils";
import { useMemo } from "react";
import hljs from "highlight.js/lib/core";
import json from "highlight.js/lib/languages/json";
import "highlight.js/styles/atom-one-dark.css";

hljs.registerLanguage("json", json);

export const traceFieldLabelProps = {
  fontSize: "xs",
  minH: "24px",
  display: "flex",
  alignItems: "center",
} as const;

export function TraceData({
  label,
  value,
  color = "text.primary",
  language,
  address = false,
  chainId,
  hideLabel = false,
}: {
  label: string;
  value: string;
  color?: string;
  language?: "json";
  address?: boolean;
  chainId?: number;
  hideLabel?: boolean;
}) {
  const { onCopy, hasCopied } = useClipboard(value);
  const validAddress = /^0x[\da-f]{40}$/i.test(value);
  const explorerHref =
    address &&
    validAddress &&
    chainId !== undefined &&
    Number.isSafeInteger(chainId) &&
    chainId > 0
      ? `${getPath("explorer")}${chainId}/${value}`
      : undefined;
  const copy = (!address || validAddress) && (
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
  );
  const highlighted = useMemo(
    () => (language ? hljs.highlight(value, { language }).value : undefined),
    [language, value]
  );
  return (
    <Box minW={0}>
      {!hideLabel && <Flex align="center" justify="space-between" mb={1} minH="24px">
        <Text {...traceFieldLabelProps} color="text.secondary">
          {label}
        </Text>
        {address
          ? explorerHref && (
              <Button
                as="a"
                href={explorerHref}
                target="_blank"
                rel="noopener noreferrer"
                variant="ghost"
                size="xs"
                minW="24px"
                h="24px"
                px={1}
                color="text.secondary"
                aria-label={`Open ${label} in Explorer`}
                title="Open in Explorer"
              >
                <ExternalLinkIcon boxSize={3} />
              </Button>
            )
          : copy}
      </Flex>}
      <Box position="relative">
        <Box
          as="pre"
          fontSize="xs"
          fontFamily="mono"
          p={2.5}
          pr={address || hideLabel ? 10 : 2.5}
          bg="bg.base"
          border="1px solid"
          borderColor="border.subtle"
          borderRadius="md"
          whiteSpace="pre-wrap"
          overflowWrap="anywhere"
          maxH="200px"
          overflowY="auto"
          tabIndex={0}
          color={address ? "white" : color}
        >
          {highlighted === undefined ? (
            value
          ) : (
            <code
              className="language-json"
              dangerouslySetInnerHTML={{ __html: highlighted }}
            />
          )}
        </Box>
        {(address || hideLabel) && (
          <Box
            position="absolute"
            right={1.5}
            top={hideLabel ? 2 : "50%"}
            transform={hideLabel ? undefined : "translateY(-50%)"}
          >
            {copy}
          </Box>
        )}
      </Box>
    </Box>
  );
}
