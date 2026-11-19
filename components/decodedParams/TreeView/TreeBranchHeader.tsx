"use client";
import { Box, Flex } from "@chakra-ui/react";
import { ChevronDownIcon, ChevronRightIcon } from "@chakra-ui/icons";
import type { ReactNode } from "react";

/** Shared sticky disclosure primitive for calldata parameters and executed frames.
 * Domain data deliberately stays outside this component: bytes are not traces.
 */
export function TreeBranchHeader({
  id,
  level,
  children,
  extra,
  label,
  open,
  onToggle,
}: {
  id: string;
  level: number;
  children: ReactNode;
  extra?: ReactNode;
  label: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <Box
      position="sticky"
      top={`${level * 28}px`}
      zIndex={100 - level}
      _before={
        level > 0
          ? {
              content: '\"\"',
              position: "absolute",
              left: { base: "-9px", md: "-13px" },
              top: "14px",
              width: { base: "9px", md: "13px" },
              borderTop: "1px solid",
              borderColor: "whiteAlpha.200",
              pointerEvents: "none",
            }
          : undefined
      }
    >
      <Flex
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-controls={`tree-children-${id}`}
        aria-label={label}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (
            event.target === event.currentTarget &&
            (event.key === "Enter" || event.key === " ")
          ) {
            event.preventDefault();
            onToggle();
          }
        }}
        bg="bg.subtle"
        minH="28px"
        h="28px"
        gap={{ base: 1, md: 2 }}
        align="center"
        px={1}
        overflowX="auto"
        overflowY="hidden"
        cursor="pointer"
        borderBottom="1px solid"
        borderColor="whiteAlpha.100"
        sx={{
          scrollbarWidth: "none",
          "& > *": { flexShrink: 0 },
          "&::-webkit-scrollbar": { display: "none" },
        }}
        _hover={{ bg: "bg.muted" }}
        _focusVisible={{
          outline: "2px solid",
          outlineColor: "blue.400",
          outlineOffset: "-2px",
        }}
        data-calldata-header={id}
      >
        {open ? (
          <ChevronDownIcon boxSize={4} color="text.tertiary" />
        ) : (
          <ChevronRightIcon boxSize={4} color="text.tertiary" />
        )}
        {children}
        {extra && (
          <Box ml="auto" onClick={(event) => event.stopPropagation()}>
            {extra}
          </Box>
        )}
      </Flex>
    </Box>
  );
}
