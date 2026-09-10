"use client";

import { useCallback, useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { PortfolioToken } from "../lib/portfolioApi";
import {
  fetchSwapQuote,
  SwapQuoteResponse,
  SwapQuoteParams,
  NATIVE_TOKEN_ADDRESS_0X,
} from "../lib/swapQuoteApi";
import { detectWrapUnwrap } from "../lib/wrapUnwrap";

export interface QuoteRequest {
  /** Source token being sold (we read chainId + contractAddress + decimals). */
  source: PortfolioToken;
  /** Amount of source to sell, in source-token raw units. */
  sourceAmountWei: bigint;
}

export interface QuoteResult {
  request: QuoteRequest;
  data: SwapQuoteResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

interface UseSwapQuotesArgs {
  chainId?: number;
  /** Connected wallet address ("taker" in 0x parlance). */
  taker?: string;
  /** Target token contract address (use "native" for chain native). */
  buyToken?: string;
  /** Source rows to quote. Order is preserved in the result. */
  requests: QuoteRequest[];
  slippageBps: number;
  /** Optional explicit recipient for the bought tokens. When set, must be a
   *  valid checksum/lowercase address. Empty/undefined → defaults to taker. */
  recipient?: string;
  /** Hard gate — when false, no fetches run. */
  enabled: boolean;
}

export interface UseSwapQuotesResult {
  results: QuoteResult[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  /** True only when every request finished (either OK or errored). */
  isSettled: boolean;
  /** Force-refetch every row's quote, bypassing the 30s staleTime. */
  refetchAll: () => void;
}

/**
 * Fire one quote per source row in parallel. We deliberately model each row
 * as its own react-query so a single failure doesn't block the rest — and so
 * the cache key (taker + chain + token pair + amount + slippage) lets us
 * reuse quotes verbatim when the user tweaks unrelated state.
 */
export function useSwapQuotes({
  chainId,
  taker,
  buyToken,
  requests,
  slippageBps,
  recipient,
  enabled,
}: UseSwapQuotesArgs): UseSwapQuotesResult {
  // Stabilise the query list — array identity changes don't matter, key
  // identity does. react-query will dedupe by queryKey. We build the params
  // unconditionally and gate via per-query `enabled`, so the union type of
  // each entry stays consistent across the disabled/enabled paths.
  const queries = useMemo(() => {
    const everyEnabled =
      enabled && !!chainId && !!taker && !!buyToken && requests.length > 0;
    const safeChain = chainId ?? 0;
    const safeTaker = taker ?? "0x0";
    const safeBuy = buyToken ?? "";
    return requests.map((req) => {
      const sellToken =
        req.source.contractAddress === "native"
          ? "native"
          : req.source.contractAddress;
      const params: SwapQuoteParams = {
        chainId: safeChain,
        taker: safeTaker,
        sellToken,
        buyToken: safeBuy,
        sellAmountWei: req.sourceAmountWei,
        slippageBps,
        recipient: recipient || undefined,
      };
      // WETH ↔ ETH (and equivalents on other chains) is a 1:1 wrap/unwrap
      // with no DEX involved. Skip the 0x round-trip entirely and synthesize
      // the quote here so (a) the user gets an instant result, (b) we
      // sidestep 0x's "recipient not supported for wrap/unwrap" rejection
      // when the user has set an explicit recipient.
      const wrapDirection = detectWrapUnwrap(safeChain, sellToken, safeBuy);
      return {
        queryKey: [
          "wallet-migrate-swap-quote",
          String(safeChain),
          safeTaker.toLowerCase(),
          sellToken.toLowerCase(),
          safeBuy.toLowerCase(),
          req.sourceAmountWei.toString(),
          String(slippageBps),
          (recipient || "").toLowerCase(),
          wrapDirection ?? "swap",
        ],
        queryFn: ({ signal }: { signal?: AbortSignal }) => {
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
            return Promise.resolve(synthetic);
          }
          return fetchSwapQuote(params, signal);
        },
        enabled: everyEnabled,
        // Quotes go stale fast — but within a short window the user clicking
        // around shouldn't trigger refetches. 30s matches portfolio cadence.
        staleTime: 30_000,
        gcTime: 60_000,
        refetchOnWindowFocus: false,
        // One retry handles a single flaky upstream; more would just waste time.
        retry: 1,
      };
    });
  }, [enabled, chainId, taker, buyToken, requests, slippageBps, recipient]);

  const queryResults = useQueries({ queries });

  const results = useMemo<QuoteResult[]>(() => {
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
  const isError = queryResults.every((q) => q.isError) && queryResults.length > 0;
  const isSettled =
    queryResults.length > 0 &&
    queryResults.every((q) => !q.isLoading && !q.isFetching);

  // Fire every row's refetch in parallel. Wrap-unwrap rows resolve their
  // synthetic quotes instantly so this is effectively a no-op for them.
  const refetchAll = useCallback(() => {
    for (const q of queryResults) q.refetch();
  }, [queryResults]);

  return { results, isLoading, isFetching, isError, isSettled, refetchAll };
}
