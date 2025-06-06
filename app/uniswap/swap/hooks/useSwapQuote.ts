import { useState, useEffect, useCallback, useMemo } from "react";
import { Address, parseUnits, formatUnits } from "viem";
import { useAccount, useSimulateContract } from "wagmi";
import { PoolWithHookData } from "@/lib/uniswap/types";
import { getExactInputParams } from "@/lib/uniswap/quote";
import { findRoutingPath } from "../lib/utils";
import {
  quoterAbi,
  quoterAddress,
} from "../../pool-price-to-target/lib/constants";

interface UseSwapQuoteParams {
  fromCurrency: Address;
  toCurrency: Address;
  swapAmount: string;
  pools: PoolWithHookData[];
  chainId?: number;
  enabled: boolean;
  fromDecimals: number;
  toDecimals: number;
}

interface SwapQuoteResult {
  quotedAmount: string | null;
  amountOut: bigint | null;
  isQuoting: boolean;
  quoteError: string | null;
  routingPath: PoolWithHookData[] | null;
  fetchQuote: () => void;
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
  const { chain } = useAccount();
  const [quotedAmount, setQuotedAmount] = useState<string | null>(null);
  const [amountOut, setAmountOut] = useState<bigint | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [routingPath, setRoutingPath] = useState<PoolWithHookData[] | null>(
    null
  );

  // Memoize routing path to prevent recalculation on every render
  const path = useMemo(() => {
    return enabled ? findRoutingPath(fromCurrency, toCurrency, pools) : null;
  }, [enabled, fromCurrency, toCurrency, pools]);

  // Memoize quote params to prevent recalculation on every render
  const quoteParams = useMemo(() => {
    return path && swapAmount && swapAmount !== "0"
      ? getExactInputParams({
          amountIn: parseUnits(swapAmount, fromDecimals),
          tokenIn: fromCurrency,
          pools: path,
        })
      : null;
  }, [path, swapAmount, fromDecimals, fromCurrency]);

  const result = useSimulateContract({
    address: chain?.id ? quoterAddress[chain.id] : undefined,
    abi: quoterAbi,
    functionName: "quoteExactInput",
    args: quoteParams
      ? [
          {
            exactCurrency: quoteParams.exactCurrency,
            path: quoteParams.path,
            exactAmount: quoteParams.exactAmount,
          },
        ]
      : undefined,
    query: {
      enabled: false, // Disable auto-fetching
    },
  });

  const fetchQuote = useCallback(() => {
    if (
      !enabled ||
      !chain ||
      !quoterAddress[chain.id] ||
      !fromCurrency ||
      !toCurrency ||
      !swapAmount ||
      swapAmount === "0" ||
      fromCurrency === toCurrency ||
      !path
    ) {
      setQuotedAmount(null);
      setAmountOut(null);
      setQuoteError(null);
      setRoutingPath(null);
      return;
    }

    setRoutingPath(path);
    result.refetch();
  }, [enabled, chain, fromCurrency, toCurrency, swapAmount, path]);

  // Process the result when it changes
  useEffect(() => {
    if (result.data?.result) {
      try {
        const [amountOutResult] = result.data.result as readonly [
          bigint,
          bigint[],
          number[],
          bigint
        ];
        setAmountOut(amountOutResult);

        // Format the output amount using correct decimals
        const formattedAmount = formatUnits(amountOutResult, toDecimals);
        setQuotedAmount(formattedAmount);
        setQuoteError(null);
      } catch (error) {
        console.error("Error processing quote result:", error);
        setQuoteError("Failed to process quote result");
        setQuotedAmount(null);
        setAmountOut(null);
      }
    } else if (result.error) {
      console.error("Quote error:", result.error);
      setQuoteError(
        result.error instanceof Error
          ? result.error.message
          : "Failed to get quote"
      );
      setQuotedAmount(null);
      setAmountOut(null);
    } else if (!result.isLoading && !result.data && !result.error) {
      // Reset state when no result
      setQuotedAmount(null);
      setAmountOut(null);
      setQuoteError(null);
    }
  }, [result.data, result.error, result.isLoading, toDecimals]);

  // Auto-fetch quote when dependencies change
  useEffect(() => {
    const timeoutId = setTimeout(fetchQuote, 500); // Debounce quotes
    return () => clearTimeout(timeoutId);
  }, [fetchQuote]);

  return {
    quotedAmount,
    amountOut,
    isQuoting: result.isLoading,
    quoteError,
    routingPath,
    fetchQuote,
  };
};
