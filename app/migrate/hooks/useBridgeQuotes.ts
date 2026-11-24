"use client";

import { useCallback, useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { PortfolioToken } from "../lib/portfolioApi";
import {
  BridgeQuoteParams,
  BridgeQuoteResponse,
  fetchBridgeQuote,
} from "../lib/bridgeApi";

export interface BridgeQuoteRequest {
  source: PortfolioToken;
  sourceAmountWei: bigint;
}

export interface BridgeQuoteResult {
  request: BridgeQuoteRequest;
  data: BridgeQuoteResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

interface UseBridgeQuotesArgs {
  originChainId?: number;
  destinationChainId?: number;
  userAddress?: string;
  receiverAddress?: string;
  outputToken?: string;
  requests: BridgeQuoteRequest[];
  slippageBps: number;
  enabled: boolean;
}

export interface UseBridgeQuotesResult {
  results: BridgeQuoteResult[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  isSettled: boolean;
  refetchAll: () => void;
}

export function useBridgeQuotes({
  originChainId,
  destinationChainId,
  userAddress,
  receiverAddress,
  outputToken,
  requests,
  slippageBps,
  enabled,
}: UseBridgeQuotesArgs): UseBridgeQuotesResult {
  const queries = useMemo(() => {
    const everyEnabled =
      enabled &&
      !!originChainId &&
      !!destinationChainId &&
      !!userAddress &&
      !!outputToken &&
      requests.length > 0;
    const safeOrigin = originChainId ?? 0;
    const safeDestination = destinationChainId ?? 0;
    const safeUser = userAddress ?? "0x0";
    const safeReceiver = receiverAddress || safeUser;
    const safeOutput = outputToken ?? "";

    return requests.map((req) => {
      const inputToken =
        req.source.contractAddress === "native"
          ? "native"
          : req.source.contractAddress;
      const params: BridgeQuoteParams = {
        userAddress: safeUser,
        receiverAddress: safeReceiver,
        originChainId: safeOrigin,
        destinationChainId: safeDestination,
        inputToken,
        outputToken: safeOutput,
        inputAmountWei: req.sourceAmountWei,
        slippageBps,
      };
      return {
        queryKey: [
          "wallet-migrate-bridge-quote",
          String(safeOrigin),
          String(safeDestination),
          safeUser.toLowerCase(),
          safeReceiver.toLowerCase(),
          inputToken.toLowerCase(),
          safeOutput.toLowerCase(),
          req.sourceAmountWei.toString(),
          String(slippageBps),
        ],
        queryFn: ({ signal }: { signal?: AbortSignal }) =>
          fetchBridgeQuote(params, signal),
        enabled: everyEnabled,
        staleTime: 30_000,
        gcTime: 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      };
    });
  }, [
    enabled,
    originChainId,
    destinationChainId,
    userAddress,
    receiverAddress,
    outputToken,
    requests,
    slippageBps,
  ]);

  const queryResults = useQueries({ queries });

  const results = useMemo<BridgeQuoteResult[]>(() => {
    return queryResults.map((q, i) => ({
      request: requests[i],
      data: q.data,
      isLoading: q.isLoading,
      isError: q.isError,
      error: (q.error as Error) ?? null,
    }));
  }, [queryResults, requests]);

  const isLoading = queryResults.some((q) => q.isLoading);
  const isFetching = queryResults.some((q) => q.isFetching);
  const isError =
    queryResults.every((q) => q.isError) && queryResults.length > 0;
  const isSettled =
    queryResults.length > 0 &&
    queryResults.every((q) => !q.isLoading && !q.isFetching);

  const refetchAll = useCallback(() => {
    for (const q of queryResults) q.refetch();
  }, [queryResults]);

  return { results, isLoading, isFetching, isError, isSettled, refetchAll };
}
