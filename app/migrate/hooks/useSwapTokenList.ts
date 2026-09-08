"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchSwapTokenList,
  tokenListEntryToTarget,
} from "../lib/swapTokenList";
import { TargetTokenEntry } from "../lib/swapTypes";

export interface UseSwapTokenListResult {
  tokens: TargetTokenEntry[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
}

/**
 * Live swap token list for a single chain. Returned in the same
 * `TargetTokenEntry` shape the picker consumes so callers can hand the array
 * straight to the dropdown's `rest` prop. Sorted by symbol.
 */
export function useSwapTokenList(chainId?: number): UseSwapTokenListResult {
  const query = useQuery({
    queryKey: ["wallet-migrate-token-list", chainId],
    queryFn: ({ signal }) => fetchSwapTokenList(chainId!, signal),
    enabled: chainId !== undefined,
    // Token lists update at most a couple of times per day upstream — cache
    // aggressively in-memory to keep dropdown opens snappy after the first hit.
    staleTime: 60 * 60 * 1000, // 1h
    gcTime: 6 * 60 * 60 * 1000, // 6h
    refetchOnWindowFocus: false,
  });

  const tokens = useMemo<TargetTokenEntry[]>(() => {
    if (!query.data) return [];
    return query.data
      .map(tokenListEntryToTarget)
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
