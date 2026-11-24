"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchPortfolio,
  PortfolioResponse,
  PortfolioToken,
} from "../lib/portfolioApi";

export interface ChainGroupData {
  chainId: number;
  tokens: PortfolioToken[];
  totalValueUsd: number;
}

export interface UsePortfolioResult {
  data: PortfolioResponse | undefined;
  tokens: PortfolioToken[];
  chainGroups: ChainGroupData[];
  totalValueUsd: number;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function usePortfolio(address?: string): UsePortfolioResult {
  const query = useQuery({
    queryKey: ["wallet-migrate-portfolio", address?.toLowerCase()],
    queryFn: ({ signal }) => fetchPortfolio(address!, signal),
    enabled: !!address,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const tokens = useMemo(() => {
    if (!query.data) return [];
    // Sort descending by valueUsd (API already does this, kept defensive).
    return [...query.data.tokens].sort((a, b) => b.valueUsd - a.valueUsd);
  }, [query.data]);

  const chainGroups = useMemo<ChainGroupData[]>(() => {
    if (!tokens.length) return [];
    const byChain = new Map<number, PortfolioToken[]>();
    for (const t of tokens) {
      const list = byChain.get(t.chainId);
      if (list) list.push(t);
      else byChain.set(t.chainId, [t]);
    }
    const groups: ChainGroupData[] = [];
    for (const [chainId, list] of byChain) {
      const totalValueUsd = list.reduce((s, t) => s + t.valueUsd, 0);
      groups.push({ chainId, tokens: list, totalValueUsd });
    }
    // Default sort: highest USD total first.
    groups.sort((a, b) => b.totalValueUsd - a.totalValueUsd);
    return groups;
  }, [tokens]);

  return {
    data: query.data,
    tokens,
    chainGroups,
    totalValueUsd: query.data?.totalValueUsd ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: (query.error as Error) ?? null,
    refetch: query.refetch,
  };
}
