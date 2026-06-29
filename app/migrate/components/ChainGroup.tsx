"use client";

import { forwardRef, useMemo, useState } from "react";
import {
  Box,
  Checkbox,
  Collapse,
  HStack,
  Image,
  Text,
  IconButton,
  Button,
  VStack,
  Tooltip,
  Switch,
} from "@chakra-ui/react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { ChainGroupData } from "../hooks/usePortfolio";
import { SelectionMap } from "../types";
import { tokenKey } from "../lib/portfolioApi";
import { getChainInfo } from "../lib/chains";
import { formatUsd } from "../lib/format";
import { TokenRow } from "./TokenRow";

interface ChainGroupProps {
  group: ChainGroupData;
  isCurrent: boolean;
  allowCrossChainSelection?: boolean;
  selection: SelectionMap;
  onToggle: (key: string) => void;
  onAmountOverride: (key: string, wei: bigint | undefined) => void;
  onSelectAll: (chainId: number, value: boolean) => void;
  onSwitchChain: (chainId: number) => void;
  isSwitchingChain?: boolean;
  showDust: boolean;
  onToggleDust: (value: boolean) => void;
  dustThresholdUsd: number;
  dustCount: number;
}

export const ChainGroup = forwardRef<HTMLDivElement, ChainGroupProps>(
  function ChainGroup(
    {
      group,
      isCurrent,
      allowCrossChainSelection = false,
      selection,
      onToggle,
      onAmountOverride,
      onSelectAll,
      onSwitchChain,
      isSwitchingChain,
      showDust,
      onToggleDust,
      dustThresholdUsd,
      dustCount,
    },
    ref
  ) {
    const [expanded, setExpanded] = useState(true);
    const info = getChainInfo(group.chainId);

    const selectedCount = useMemo(() => {
      let n = 0;
      for (const t of group.tokens) {
        if (selection.get(tokenKey(t))?.selected) n += 1;
      }
      return n;
    }, [group.tokens, selection]);

    const allSelected =
      selectedCount > 0 && selectedCount === group.tokens.length;
    const someSelected = selectedCount > 0 && !allSelected;
    const canSelect = isCurrent || (allowCrossChainSelection && info.supported);

    return (
      <Box
        ref={ref}
        id={`migrate-chain-${group.chainId}`}
        bg="whiteAlpha.50"
        borderRadius="lg"
        border="1px solid"
        borderColor={isCurrent ? "primary.500" : "whiteAlpha.200"}
        overflow="hidden"
      >
        <HStack px={4} py={3} bg="whiteAlpha.100" spacing={3} align="center">
          <IconButton
            aria-label="Toggle"
            icon={
              expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
            }
            size="xs"
            variant="ghost"
            color="whiteAlpha.700"
            onClick={() => setExpanded((v) => !v)}
          />
          {info.logo ? (
            <Image
              src={info.logo}
              alt={info.name}
              boxSize="22px"
              borderRadius="full"
              bg="white"
              fallbackSrc="/icon.png"
            />
          ) : (
            <Box boxSize="22px" bg="whiteAlpha.300" borderRadius="full" />
          )}
          <VStack spacing={0} align="flex-start" flex={1}>
            <HStack spacing={2}>
              <Text fontWeight="600" color="white">
                {info.name}
              </Text>
              {isCurrent && (
                <Text
                  fontSize="2xs"
                  bg="primary.500"
                  color="white"
                  px={1.5}
                  py={0.5}
                  borderRadius="sm"
                  fontWeight="600"
                  letterSpacing="wider"
                >
                  CURRENT
                </Text>
              )}
              {!isCurrent && !info.supported && (
                <Tooltip
                  label="Not in this app's wallet config — view-only"
                  hasArrow
                  placement="top"
                >
                  <Text
                    fontSize="2xs"
                    bg="whiteAlpha.300"
                    color="whiteAlpha.800"
                    px={1.5}
                    py={0.5}
                    borderRadius="sm"
                    fontWeight="600"
                    letterSpacing="wider"
                  >
                    UNSUPPORTED
                  </Text>
                </Tooltip>
              )}
            </HStack>
            <Text fontSize="xs" color="whiteAlpha.700">
              {group.tokens.length} token
              {group.tokens.length === 1 ? "" : "s"} ·{" "}
              {formatUsd(group.totalValueUsd)}
            </Text>
          </VStack>

          {dustCount > 0 && (
            <VStack spacing={0.5} align="flex-end">
              <Tooltip
                label={`Show tokens worth less than $${dustThresholdUsd}`}
                placement="top"
                hasArrow
                openDelay={300}
              >
                <HStack spacing={1.5}>
                  <Text fontSize="xs" color="whiteAlpha.700">
                    Show &lt;${dustThresholdUsd}
                  </Text>
                  <Switch
                    size="sm"
                    colorScheme="blue"
                    isChecked={showDust}
                    onChange={(e) => onToggleDust(e.target.checked)}
                    sx={{
                      "& .chakra-switch__track:not([data-checked])": {
                        bg: "whiteAlpha.200",
                      },
                      "& .chakra-switch__thumb:not([data-checked])": {
                        bg: "whiteAlpha.500",
                      },
                    }}
                  />
                </HStack>
              </Tooltip>
              {!showDust && (
                <Text fontSize="2xs" color="whiteAlpha.500">
                  ({dustCount} token{dustCount === 1 ? "" : "s"} hidden)
                </Text>
              )}
            </VStack>
          )}

          {canSelect ? (
            <HStack spacing={2} flexShrink={0}>
              {!isCurrent && info.supported && (
                <Button
                  size="xs"
                  variant="ghost"
                  color="whiteAlpha.700"
                  _hover={{ bg: "whiteAlpha.100", color: "white" }}
                  isLoading={isSwitchingChain}
                  onClick={() => onSwitchChain(group.chainId)}
                >
                  Switch
                </Button>
              )}
              <Checkbox
                isChecked={allSelected}
                isIndeterminate={someSelected}
                onChange={(e) => onSelectAll(group.chainId, e.target.checked)}
                colorScheme="blue"
              >
                <Text fontSize="xs" color="whiteAlpha.800">
                  Select all
                </Text>
              </Checkbox>
            </HStack>
          ) : info.supported ? (
            <Button
              size="xs"
              variant="outline"
              colorScheme="blue"
              borderColor="primary.400"
              color="primary.400"
              _hover={{ bg: "whiteAlpha.100", borderColor: "primary.300" }}
              isLoading={isSwitchingChain}
              onClick={() => onSwitchChain(group.chainId)}
            >
              Switch chain
            </Button>
          ) : null}
        </HStack>

        <Collapse in={expanded} animateOpacity>
          <VStack spacing={1} align="stretch" px={2} py={2}>
            {group.tokens.map((t) => {
              const key = tokenKey(t);
              const entry = selection.get(key);
              return (
                <TokenRow
                  key={key}
                  token={t}
                  entryKey={key}
                  entry={entry}
                  disabled={!canSelect}
                  disabledReason={
                    !canSelect
                      ? info.supported
                        ? `Switch to ${info.name} to migrate these tokens`
                        : `${info.name} is not configured for transactions in this app`
                      : undefined
                  }
                  onToggle={onToggle}
                  onAmountOverride={onAmountOverride}
                />
              );
            })}
          </VStack>
        </Collapse>
      </Box>
    );
  }
);
