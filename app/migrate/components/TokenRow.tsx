"use client";

import { memo, useCallback } from "react";
import {
  Box,
  Checkbox,
  HStack,
  Image,
  Text,
  VStack,
  Tooltip,
} from "@chakra-ui/react";
import { formatUnits } from "viem";
import { PortfolioToken } from "../lib/portfolioApi";
import { SelectionEntry } from "../types";
import { formatUsdCompact } from "../lib/format";
import { EditAmountPopover } from "./EditAmountPopover";

interface TokenRowProps {
  token: PortfolioToken;
  entryKey: string;
  entry?: SelectionEntry;
  disabled: boolean;
  disabledReason?: string;
  onToggle: (key: string) => void;
  onAmountOverride: (key: string, wei: bigint | undefined) => void;
}

function shortBalance(formatted: string): string {
  // Trim trailing zeros after decimal but keep small numbers readable.
  if (!formatted.includes(".")) return formatted;
  return formatted.replace(/\.?0+$/, "");
}

function TokenRowImpl({
  token,
  entryKey,
  entry,
  disabled,
  disabledReason,
  onToggle,
  onAmountOverride,
}: TokenRowProps) {
  const selected = !!entry?.selected;
  const override = entry?.amountOverrideWei;

  // Stable per-row handlers so EditAmountPopover (which is memoized) doesn't
  // remount on every parent render.
  const handleToggle = useCallback(
    () => onToggle(entryKey),
    [onToggle, entryKey]
  );
  const handleAmountOverride = useCallback(
    (wei: bigint | undefined) => onAmountOverride(entryKey, wei),
    [onAmountOverride, entryKey]
  );

  const overrideDisplay =
    override !== undefined
      ? shortBalance(formatUnits(override, token.decimals))
      : null;

  const row = (
    <HStack
      role="group"
      spacing={3}
      py={2.5}
      px={3}
      bg={selected ? "whiteAlpha.100" : "transparent"}
      borderRadius="md"
      _hover={{ bg: disabled ? "transparent" : "whiteAlpha.100" }}
      opacity={disabled ? 0.45 : 1}
      transition="background 0.12s ease"
      cursor={disabled ? "default" : "pointer"}
      onClick={disabled ? undefined : handleToggle}
    >
      <Checkbox
        isChecked={selected}
        onChange={handleToggle}
        // Swallow the click so it doesn't bubble to the row's onClick — otherwise
        // we'd fire handleToggle twice (once via onChange, once via the row) and
        // net out to no change.
        onClick={(e) => e.stopPropagation()}
        colorScheme="blue"
        sx={{
          "& .chakra-checkbox__control": {
            borderColor: "whiteAlpha.400",
          },
        }}
      />

      {token.logoUrl ? (
        <Image
          src={token.logoUrl}
          alt={token.symbol}
          boxSize="28px"
          borderRadius="full"
          fallbackSrc="/icon.png"
        />
      ) : (
        <Box
          boxSize="28px"
          bg="whiteAlpha.200"
          borderRadius="full"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Text fontSize="xs" color="whiteAlpha.700" fontWeight="600">
            ?
          </Text>
        </Box>
      )}

      <VStack spacing={0} align="flex-start" flex={1} minW={0}>
        <Text fontWeight="600" color="white" fontSize="sm" noOfLines={1}>
          {token.symbol.toUpperCase()}
        </Text>
        <Text fontSize="xs" color="whiteAlpha.600" noOfLines={1}>
          {token.name}
        </Text>
      </VStack>

      <VStack spacing={0} align="flex-end" minW="120px">
        <HStack spacing={1}>
          {!disabled && (
            // The pencil opens a popover for amount overrides — clicks here
            // must not bubble up to toggle the row's checkbox.
            <Box onClick={(e) => e.stopPropagation()}>
              <EditAmountPopover
                token={token}
                currentOverrideWei={override}
                onCommit={handleAmountOverride}
              />
            </Box>
          )}
          <Text fontSize="sm" color="white" fontFamily="mono">
            {shortBalance(token.balanceFormatted)}
          </Text>
        </HStack>
        {overrideDisplay !== null && (
          <Text fontSize="xs" color="primary.400" fontFamily="mono">
            → {overrideDisplay} (custom)
          </Text>
        )}
        <Text fontSize="xs" color="whiteAlpha.700">
          {formatUsdCompact(token.valueUsd)}
        </Text>
      </VStack>
    </HStack>
  );

  if (disabled && disabledReason) {
    return (
      <Tooltip label={disabledReason} placement="top" hasArrow openDelay={300}>
        <Box>{row}</Box>
      </Tooltip>
    );
  }
  return row;
}

export const TokenRow = memo(TokenRowImpl);
