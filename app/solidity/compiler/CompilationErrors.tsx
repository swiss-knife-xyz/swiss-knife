"use client";
import { Box, HStack, Stack, Text } from "@chakra-ui/react";
import { ArrowUpRight, CircleAlert, FileCode2 } from "lucide-react";
import { diagnosticPosition } from "@/lib/solidity/compilation";
import type { SolidityFile } from "@/lib/solidity/workspace";
import type { CompilerError } from "./types";

export function CompilationErrors({
  diagnostics,
  fallback,
  files,
  disabled,
  onSelect,
}: {
  diagnostics?: CompilerError[];
  fallback: string;
  files: SolidityFile[];
  disabled: boolean;
  onSelect: (diagnostic: CompilerError) => void;
}) {
  const errors = diagnostics?.length
    ? diagnostics
    : [{ severity: "error", formattedMessage: fallback, message: fallback }];
  const sources = new Map(files.map((file) => [file.name, file]));
  return (
    <Box
      role="alert"
      aria-label="Compilation errors"
      p={3}
      maxH="min(60vh, 480px)"
      overflowY="auto"
      tabIndex={0}
    >
      <Text fontSize="xs" color="text.tertiary" mb={2}>
        {errors.length} {errors.length === 1 ? "error" : "errors"}
      </Text>
      <Stack spacing={2}>
        {errors.map((error, index) => {
          const location = error.sourceLocation;
          const file = location ? sources.get(location.file) : undefined;
          const point =
            file && location
              ? diagnosticPosition(file.content, Math.max(0, location.start))
              : null;
          const target = location
            ? `${location.file}${point ? `:${point.lineNumber}:${point.column}` : ""}`
            : "";
          const category =
            error.type ??
            error.formattedMessage.match(/^([A-Za-z]+Error):/)?.[1] ??
            "Error";
          const message = (
            error.message ?? error.formattedMessage.split(/\n\s*-->/)[0]
          )
            .replace(/^[A-Za-z]+Error:\s*/, "")
            .trim();
          return (
            <Box
              key={index}
              as={file ? "button" : "div"}
              {...(file ? { type: "button" as const, disabled } : {})}
              aria-label={file ? `Open ${target}` : undefined}
              onClick={file ? () => onSelect(error) : undefined}
              display="block"
              w="full"
              minW={0}
              textAlign="left"
              p={3}
              borderWidth="1px"
              borderColor="border.default"
              rounded="lg"
              bg="bg.subtle"
              cursor={file && !disabled ? "pointer" : undefined}
              _hover={
                file && !disabled
                  ? { bg: "bg.muted", borderColor: "error.text" }
                  : undefined
              }
              _focusVisible={{
                outline: "2px solid",
                outlineColor: "primary.400",
                outlineOffset: "2px",
              }}
              _disabled={{ opacity: 0.5, cursor: "not-allowed" }}
            >
              <HStack spacing={1.5} color="error.text" mb={1.5}>
                <CircleAlert size={13} style={{ flexShrink: 0 }} />
                <Text fontSize="xs" fontWeight="semibold">
                  {category}
                </Text>
                {error.errorCode && (
                  <Text fontSize="xs" color="text.tertiary">
                    #{error.errorCode}
                  </Text>
                )}
              </HStack>
              <Text
                fontSize="13px"
                lineHeight="1.5"
                color="text.primary"
                whiteSpace="pre-wrap"
                overflowWrap="anywhere"
              >
                {message}
              </Text>
              {target && (
                <HStack spacing={1.5} mt={2} color="text.secondary" minW={0}>
                  <FileCode2 size={12} style={{ flexShrink: 0 }} />
                  <Text
                    fontSize="xs"
                    fontFamily="mono"
                    minW={0}
                    flex={1}
                    isTruncated
                    title={target}
                  >
                    {location!.file}
                  </Text>
                  {point && (
                    <Text fontSize="xs" fontFamily="mono" flexShrink={0}>
                      {point.lineNumber}:{point.column}
                    </Text>
                  )}
                  {file && <ArrowUpRight size={13} style={{ flexShrink: 0 }} />}
                </HStack>
              )}
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
