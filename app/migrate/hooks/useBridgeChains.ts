"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BridgeChain, fetchBridgeChains } from "../lib/bridgeApi";

export interface UseBridgeChainsResult {
  chains: BridgeChain[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
}

export function useBridgeChains(enabled: boolean): UseBridgeChainsResult {
  const query = useQuery({
    queryKey: ["wallet-migrate-bridge-chains"],
    queryFn: ({ signal }) => fetchBridgeChains(signal),
    enabled,
    staleTime: 60 * 60 * 1000,
    gcTime: 6 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const chains = useMemo<BridgeChain[]>(() => {
    return (query.data ?? [])
      .filter((chain) => chain.receivingEnabled !== false)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [query.data]);

  return {
    chains,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: (query.error as Error) ?? null,
  };
}
