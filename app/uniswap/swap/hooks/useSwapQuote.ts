import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Address, formatUnits } from "viem";
import { useSimulateContract } from "wagmi";
import { PoolWithHookData } from "@/lib/uniswap/types";
import { getExactInputParams } from "@/lib/uniswap/quote";
import { findRoutingPath, parseTokenAmount } from "../lib/utils";
import { quoterAbi, quoterAddress } from "../../lib/constants";
import { SwapQuoteSnapshot, createQuoteRequestKey } from "../lib/quoteState";

interface UseSwapQuoteParams {
  fromCurrency: Address;
  toCurrency: Address;
  swapAmount: string;
  pools: PoolWithHookData[];
  chainId?: number;
  enabled: boolean;
  fromDecimals?: number;
  toDecimals?: number;
}

interface SwapQuoteResult {
  quote: SwapQuoteSnapshot | null;
  quotedAmount: string | null;
  isQuoting: boolean;
  quoteError: string | null;
  fetchQuote: () => Promise<void>;
}

export const useSwapQuote = ({
  fromCurrency,
  toCurrency,
  swapAmount,
  pools,
  chainId,
  enabled,
  fromDecimals,
  toDecimals,
}: UseSwapQuoteParams): SwapQuoteResult => {
  const [quote, setQuote] = useState<SwapQuoteSnapshot | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [isQuotePending, setIsQuotePending] = useState(false);
  const activeRequestKeyRef = useRef<string | null>(null);

  const requestState = useMemo(() => {
    if (
      !enabled ||
      !chainId ||
      !quoterAddress[chainId] ||
      !fromCurrency ||
      !toCurrency ||
      !swapAmount ||
      swapAmount === "0" ||
      fromCurrency === toCurrency ||
      fromDecimals === undefined ||
      toDecimals === undefined
    ) {
      return { request: null, error: null };
    }

    try {
      const routingPath = findRoutingPath(fromCurrency, toCurrency, pools);
      if (!routingPath) {
        return { request: null, error: "No connected routing path found." };
      }
      const quoteParams = getExactInputParams({
        amountIn: parseTokenAmount(swapAmount, fromDecimals),
        tokenIn: fromCurrency,
        tokenOut: toCurrency,
        pools: routingPath,
      });
      return {
        request: {
          requestKey: createQuoteRequestKey({
            chainId,
            tokenOut: toCurrency,
            quoteParams,
          }),
          chainId,
          tokenOut: toCurrency,
          quoteParams,
          routingPath,
        },
        error: null,
      };
    } catch (error) {
      return {
        request: null,
        error: error instanceof Error ? error.message : "Invalid quote input.",
      };
    }
  }, [
    chainId,
    enabled,
    fromCurrency,
    fromDecimals,
    pools,
    swapAmount,
    toCurrency,
    toDecimals,
  ]);

  const request = requestState.request;
  const result = useSimulateContract({
    address: chainId ? quoterAddress[chainId] : undefined,
    abi: quoterAbi,
    functionName: "quoteExactInput",
    args: request
      ? [
          {
            exactCurrency: request.quoteParams.exactCurrency,
            path: request.quoteParams.path,
            exactAmount: request.quoteParams.exactAmount,
          },
        ]
      : undefined,
    query: { enabled: false },
  });

  const fetchQuote = useCallback(async () => {
    if (!request) return;
    const requestKey = request.requestKey;

    try {
      const response = await result.refetch();
      if (activeRequestKeyRef.current !== requestKey) return;
      if (response.error) throw response.error;
      if (!response.data?.result) throw new Error("Quoter returned no result.");

      const [amountOut] = response.data.result as readonly [
        bigint,
        bigint[],
        number[],
        bigint,
      ];
      setQuote({ ...request, amountOut });
      setQuoteError(null);
    } catch (error) {
      if (activeRequestKeyRef.current !== requestKey) return;
      setQuote(null);
      setQuoteError(
        error instanceof Error ? error.message : "Failed to get quote."
      );
    } finally {
      if (activeRequestKeyRef.current === requestKey) {
        setIsQuotePending(false);
      }
    }
  }, [request, result.refetch]);

  useEffect(() => {
    const requestKey = request?.requestKey ?? null;
    activeRequestKeyRef.current = requestKey;
    setQuote(null);
    setQuoteError(requestState.error);
    setIsQuotePending(request !== null);

    if (!request) return;
    const timeoutId = setTimeout(() => void fetchQuote(), 500);
    return () => clearTimeout(timeoutId);
  }, [fetchQuote, request, requestState.error]);

  const currentQuote =
    quote && request && quote.requestKey === request.requestKey ? quote : null;

  return {
    quote: currentQuote,
    quotedAmount:
      currentQuote && toDecimals !== undefined
        ? formatUnits(currentQuote.amountOut, toDecimals)
        : null,
    isQuoting:
      isQuotePending ||
      result.isFetching ||
      (request !== null && !currentQuote),
    quoteError,
    fetchQuote,
  };
};
