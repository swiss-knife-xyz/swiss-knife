"use client";

import { useCallback, useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { PortfolioToken } from "../lib/portfolioApi";
import {
  fetchSwapQuote,
  NATIVE_TOKEN_ADDRESS_0X,
  SwapQuoteParams,
  SwapQuoteResponse,
} from "../lib/swapQuoteApi";
import {
  BridgeQuoteParams,
  BridgeQuoteResponse,
  fetchBridgeQuote,
} from "../lib/bridgeApi";
import { detectWrapUnwrap } from "../lib/wrapUnwrap";

export interface MigrateRouteQuoteRequest {
  id: string;
  routeKind: "swap" | "bridge";
  source: PortfolioToken;
  sourceAmountWei: bigint;
  destinationChainId: number;
}

type MigrateRouteQuoteData =
  | { routeKind: "swap"; data: SwapQuoteResponse }
  | { routeKind: "bridge"; data: BridgeQuoteResponse };

export interface MigrateRouteQuoteResult {
  request: MigrateRouteQuoteRequest;
  data: MigrateRouteQuoteData | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

interface UseMigrateRouteQuotesArgs {
  taker?: string;
  receiverAddress?: string;
  targetToken?: string;
  requests: MigrateRouteQuoteRequest[];
  slippageBps: number;
  enabled: boolean;
}

export interface UseMigrateRouteQuotesResult {
  results: MigrateRouteQuoteResult[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  isSettled: boolean;
  refetchAll: () => void;
}

function quoteAddress(address: string): string {
  return address.toLowerCase() === "native" ? "native" : address;
}

export function useMigrateRouteQuotes({
  taker,
  receiverAddress,
  targetToken,
  requests,
  slippageBps,
  enabled,
}: UseMigrateRouteQuotesArgs): UseMigrateRouteQuotesResult {
  const queries = useMemo(() => {
    const safeTaker = taker ?? "0x0";
    const safeReceiver = receiverAddress || safeTaker;
    const safeTarget = targetToken ?? "";
    const everyEnabled =
      enabled && !!taker && !!targetToken && requests.length > 0;

    return requests.map((req) => {
      const sellToken = quoteAddress(req.source.contractAddress);
      const commonKey = [
        "wallet-migrate-route-quote",
        req.id,
        req.routeKind,
        String(req.source.chainId),
        String(req.destinationChainId),
        safeTaker.toLowerCase(),
        safeReceiver.toLowerCase(),
        sellToken.toLowerCase(),
        safeTarget.toLowerCase(),
        req.sourceAmountWei.toString(),
        String(slippageBps),
      ];

      return {
        queryKey: commonKey,
        queryFn: async ({
          signal,
        }: {
          signal?: AbortSignal;
        }): Promise<MigrateRouteQuoteData> => {
          if (req.routeKind === "bridge") {
            const params: BridgeQuoteParams = {
              userAddress: safeTaker,
              receiverAddress: safeReceiver,
              originChainId: req.source.chainId,
              destinationChainId: req.destinationChainId,
              inputToken: sellToken,
              outputToken: safeTarget,
              inputAmountWei: req.sourceAmountWei,
              slippageBps,
            };
            const data = await fetchBridgeQuote(params, signal);
            return { routeKind: "bridge", data };
          }

          const params: SwapQuoteParams = {
            chainId: req.source.chainId,
            taker: safeTaker,
            sellToken,
            buyToken: safeTarget,
            sellAmountWei: req.sourceAmountWei,
            slippageBps,
            recipient: receiverAddress || undefined,
          };
          const wrapDirection = detectWrapUnwrap(
            req.source.chainId,
            sellToken,
            safeTarget
          );
          if (wrapDirection) {
            const amountStr = req.sourceAmountWei.toString();
            const synthetic: SwapQuoteResponse = {
              buyAmount: amountStr,
              sellAmount: amountStr,
              minBuyAmount: amountStr,
              buyToken:
                params.buyToken === "native"
                  ? NATIVE_TOKEN_ADDRESS_0X
                  : params.buyToken,
              sellToken:
                params.sellToken === "native"
                  ? NATIVE_TOKEN_ADDRESS_0X
                  : params.sellToken,
              liquidityAvailable: true,
            };
            return { routeKind: "swap", data: synthetic };
          }

          const data = await fetchSwapQuote(params, signal);
          return { routeKind: "swap", data };
        },
        enabled: everyEnabled && req.sourceAmountWei > 0n,
        staleTime: 30_000,
        gcTime: 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      };
    });
  }, [enabled, taker, receiverAddress, targetToken, requests, slippageBps]);

  const queryResults = useQueries({ queries });

  const results = useMemo<MigrateRouteQuoteResult[]>(() => {
    return queryResults.map((q, i) => ({
      request: requests[i],
      data: q.data as MigrateRouteQuoteData | undefined,
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
