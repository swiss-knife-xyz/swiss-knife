"use client";

import { Box, Flex } from "@chakra-ui/react";
import { ChevronDownIcon, ChevronRightIcon } from "@chakra-ui/icons";

/** Shared disclosure, connectors and sticky ancestry for parameter and call trees. */
export function TreeBranchHeader({
  id,
  level,
  children,
  extra,
  label,
  open,
  toggle,
  calldataId,
  rowHeight = 28,
  selected = false,
  expandable = true,
  onActivate,
  activationLabel,
}: {
  id: string;
  level: number;
  children: React.ReactNode;
  extra?: React.ReactNode;
  label: string;
  open: boolean;
  toggle: (id: string) => void;
  calldataId?: string;
  rowHeight?: number;
  selected?: boolean;
  expandable?: boolean;
  onActivate?: () => void;
  activationLabel?: string;
}) {
  return (
    <Box
      position="sticky"
      top={`${level * rowHeight}px`}
      zIndex={100 - level}
      _before={
        level > 0
          ? {
              content: '""',
              position: "absolute",
              left: { base: "-9px", md: "-13px" },
              top: `${rowHeight / 2}px`,
              width: { base: "9px", md: "13px" },
              borderTop: "1px solid",
              borderColor: "whiteAlpha.200",
              pointerEvents: "none",
            }
          : undefined
      }
    >
      <Flex
        role={onActivate ? "group" : "button"}
        tabIndex={onActivate ? undefined : 0}
        aria-expanded={!onActivate && expandable ? open : undefined}
        aria-label={`${label}`}
        onClick={() => (onActivate ? onActivate() : toggle(id))}
        onKeyDown={(event) => {
          if (
            !onActivate &&
            event.target === event.currentTarget &&
            (event.key === "Enter" || event.key === " ")
          ) {
            event.preventDefault();
            toggle(id);
          }
        }}
        bg={selected ? "#14243b" : "bg.subtle"}
        minH={`${rowHeight}px`}
        h={`${rowHeight}px`}
        gap={{ base: 1, md: 2 }}
        align="center"
        px={1}
        overflowX="auto"
        overflowY="hidden"
        sx={{
          scrollbarWidth: "none",
          "& > *": { flexShrink: 0 },
          "&::-webkit-scrollbar": { display: "none" },
        }}
        cursor="pointer"
        borderBottom="1px solid"
        borderColor="whiteAlpha.100"
        _hover={{ bg: selected ? "#14243b" : "bg.muted" }}
        _focusVisible={{
          outline: "2px solid",
          outlineColor: "blue.400",
          outlineOffset: "-2px",
        }}
        data-tree-header={id}
        data-calldata-header={calldataId}
      >
        {onActivate && expandable ? (
          <Box
            as="button"
            type="button"
            aria-label={`${open ? "Collapse" : "Expand"} call ${id}`}
            aria-expanded={open}
            display="flex"
            alignItems="center"
            justifyContent="center"
            w="24px"
            h="24px"
            flexShrink={0}
            borderRadius="sm"
            _hover={{ bg: "whiteAlpha.100" }}
            _focusVisible={{ outline: "2px solid", outlineColor: "blue.400" }}
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
              event.stopPropagation();
              toggle(id);
            }}
          >
            {open ? (
              <ChevronDownIcon boxSize={4} color="text.secondary" />
            ) : (
              <ChevronRightIcon boxSize={4} color="text.secondary" />
            )}
          </Box>
        ) : !expandable ? (
          <Box w={onActivate ? "24px" : 4} flexShrink={0} />
        ) : open ? (
          <ChevronDownIcon boxSize={4} color="text.tertiary" />
        ) : (
          <ChevronRightIcon boxSize={4} color="text.tertiary" />
        )}
        {onActivate ? (
          <Flex
            role="button"
            tabIndex={0}
            aria-label={activationLabel ?? label}
            aria-pressed={selected}
            flex="1"
            minW="max-content"
            h="full"
            align="center"
            gap={{ base: 1, md: 2 }}
            _focusVisible={{
              outline: "2px solid",
              outlineColor: "blue.400",
              outlineOffset: "-2px",
            }}
            onClick={(event) => {
              event.stopPropagation();
              onActivate();
            }}
            onKeyDown={(event) => {
              if (
                event.target === event.currentTarget &&
                (event.key === "Enter" || event.key === " ")
              ) {
                event.preventDefault();
                event.stopPropagation();
                onActivate();
              }
            }}
          >
            {children}
          </Flex>
        ) : (
          children
        )}
        {extra && (
          <Box ml="auto" onClick={(event) => event.stopPropagation()}>
            {extra}
          </Box>
        )}
      </Flex>
    </Box>
  );
}
