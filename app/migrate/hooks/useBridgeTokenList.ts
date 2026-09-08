"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { bridgeTokenToTarget, fetchBridgeTokenList } from "../lib/bridgeApi";
import { TargetTokenEntry } from "../lib/swapTypes";

export interface UseBridgeTokenListResult {
  tokens: TargetTokenEntry[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
}

export function useBridgeTokenList(
  chainId?: number,
  enabled = true
): UseBridgeTokenListResult {
  const query = useQuery({
    queryKey: ["wallet-migrate-bridge-token-list", chainId],
    queryFn: ({ signal }) => fetchBridgeTokenList(chainId!, signal),
    enabled: enabled && chainId !== undefined,
    staleTime: 60 * 60 * 1000,
    gcTime: 6 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const tokens = useMemo<TargetTokenEntry[]>(() => {
    if (!query.data) return [];
    return query.data
      .map(bridgeTokenToTarget)
      .sort((a, b) => a.symbol.localeCompare(b.symbol));
  }, [query.data]);

  return {
    tokens,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: (query.error as Error) ?? null,
  };
}
