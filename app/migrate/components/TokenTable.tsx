"use client";

import { useMemo } from "react";
import { Box, Text, VStack } from "@chakra-ui/react";
import { ChainGroupData } from "../hooks/usePortfolio";
import { SelectionMap } from "../types";
import { ChainGroup } from "./ChainGroup";

interface TokenTableProps {
  chainGroups: ChainGroupData[];
  currentChainId?: number;
  allowCrossChainSelection?: boolean;
  selection: SelectionMap;
  onToggle: (key: string) => void;
  onAmountOverride: (key: string, wei: bigint | undefined) => void;
  onSelectAll: (chainId: number, value: boolean) => void;
  onSwitchChain: (chainId: number) => void;
  switchingToChainId?: number;
  showDustByChain: Map<number, boolean>;
  onToggleDustForChain: (chainId: number, value: boolean) => void;
  dustThresholdUsd: number;
  dustCountByChain: Map<number, number>;
}

export function TokenTable({
  chainGroups,
  currentChainId,
  allowCrossChainSelection = false,
  selection,
  onToggle,
  onAmountOverride,
  onSelectAll,
  onSwitchChain,
  switchingToChainId,
  showDustByChain,
  onToggleDustForChain,
  dustThresholdUsd,
  dustCountByChain,
}: TokenTableProps) {
  // Pin the connected chain to the top; everything else sorted by USD desc.
  const ordered = useMemo(() => {
    if (currentChainId === undefined) return chainGroups;
    const idx = chainGroups.findIndex((g) => g.chainId === currentChainId);
    if (idx === -1) return chainGroups;
    const reordered = [...chainGroups];
    const [current] = reordered.splice(idx, 1);
    return [current, ...reordered];
  }, [chainGroups, currentChainId]);

  if (ordered.length === 0) {
    return (
      <Box
        bg="whiteAlpha.50"
        border="1px solid"
        borderColor="whiteAlpha.200"
        borderRadius="lg"
        p={8}
        textAlign="center"
      >
        <Text color="whiteAlpha.700">No tokens to display.</Text>
      </Box>
    );
  }

  return (
    <VStack spacing={3} align="stretch">
      {ordered.map((g) => (
        <ChainGroup
          key={g.chainId}
          group={g}
          isCurrent={g.chainId === currentChainId}
          allowCrossChainSelection={allowCrossChainSelection}
          selection={selection}
          onToggle={onToggle}
          onAmountOverride={onAmountOverride}
          onSelectAll={onSelectAll}
          onSwitchChain={onSwitchChain}
          isSwitchingChain={switchingToChainId === g.chainId}
          showDust={showDustByChain.get(g.chainId) ?? false}
          onToggleDust={(value) => onToggleDustForChain(g.chainId, value)}
          dustThresholdUsd={dustThresholdUsd}
          dustCount={dustCountByChain.get(g.chainId) ?? 0}
        />
      ))}
    </VStack>
  );
}
