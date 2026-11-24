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
  severity = "error",
  hideCount = false,
}: {
  severity?: "error" | "warning";
  hideCount?: boolean;
  diagnostics?: CompilerError[];
  fallback: string;
  files: SolidityFile[];
  disabled: boolean;
  onSelect: (diagnostic: CompilerError) => void;
}) {
  const errors = diagnostics?.length
    ? diagnostics
    : [{ severity: "error", formattedMessage: fallback, message: fallback }];
  const tone = severity === "warning" ? "warning.text" : "error.text";
  const sources = new Map(files.map((file) => [file.name, file]));
  return (
    <Box
      as={hideCount ? "div" : "details"}
      {...(hideCount ? {} : { open: true })}
      role={severity === "error" ? "alert" : "region"}
      aria-label={`Compilation ${severity === "error" ? "errors" : "warnings"}`}
      p={3}
      maxH="min(60vh, 480px)"
      overflowY="auto"
      tabIndex={0}
    >
      {!hideCount && <Box as="summary" fontSize="sm" color={tone} mb={2} cursor="pointer">
        {errors.length} {errors.length === 1 ? "error" : "errors"}
      </Box>}
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
            (severity === "warning" ? "Warning" : "Error");
          const message = (
            error.message ?? error.formattedMessage.split(/\n\s*-->/)[0]
          )
            .replace(/^(?:[A-Za-z]+Error|Warning):\s*/, "")
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
                  ? { bg: "bg.muted", borderColor: tone }
                  : undefined
              }
              _focusVisible={{
                outline: "2px solid",
                outlineColor: "primary.400",
                outlineOffset: "2px",
              }}
              _disabled={{ opacity: 0.5, cursor: "not-allowed" }}
            >
              <HStack spacing={1.5} color={tone} mb={1.5}>
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
