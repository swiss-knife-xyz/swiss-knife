import { useState, useEffect } from "react";
import { useSimulateContract } from "wagmi";
import { Address, parseUnits, zeroAddress, Hex, Chain } from "viem";
import { quoterAbi, quoterAddress } from "../lib/constants";

interface UseSwapQuoteProps {
  currency0: string;
  currency1: string;
  amount: string;
  zeroForOne: boolean;
  fee: number | undefined;
  tickSpacing: number | undefined;
  hookAddress: string;
  hookData: string;
  currency0Decimals: number | undefined;
  currency1Decimals: number | undefined;
  chain: Chain | undefined;
  isChainSupported: boolean;
}

export function useSwapQuote({
  currency0,
  currency1,
  amount,
  zeroForOne,
  fee,
  tickSpacing,
  hookAddress,
  hookData,
  currency0Decimals,
  currency1Decimals,
  chain,
  isChainSupported,
}: UseSwapQuoteProps) {
  // State for forced quote loading
  const [isForcedQuoteLoading, setIsForcedQuoteLoading] = useState(false);

  const decimals = zeroForOne
    ? currency0Decimals || 18
    : currency1Decimals || 18;

  const result = useSimulateContract({
    address: chain?.id ? quoterAddress[chain.id] : undefined,
    abi: quoterAbi,
    functionName: "quoteExactInputSingle",
    args: [
      {
        poolKey: {
          currency0: currency0 as Address,
          currency1: currency1 as Address,
          tickSpacing: tickSpacing!,
          fee: fee!,
          hooks: (hookAddress || zeroAddress) as Address,
        },
        zeroForOne,
        exactAmount: parseUnits(amount, decimals),
        hookData: (hookData || "0x") as Hex,
      },
    ],
    query: {
      enabled: false, // Disable auto-fetching
    },
  });

  // Combined loading state for quote
  const isQuoteLoading = result.isLoading || isForcedQuoteLoading;

  const fetchQuoteResult = async () => {
    if (
      currency0.length > 0 &&
      currency1.length > 0 &&
      amount &&
      isChainSupported
    ) {
      // Set forced loading state immediately
      setIsForcedQuoteLoading(true);

      // Add artificial delay to ensure loading state is visible
      await new Promise((resolve) => setTimeout(resolve, 300));

      try {
        // Force refetch with fresh data
        await result.refetch();
      } finally {
        // Clear forced loading state
        setIsForcedQuoteLoading(false);
      }
    }
  };

  // Auto-fetch quote result with debounce when amount changes
  useEffect(() => {
    // Only set up debounce if all conditions are met
    if (
      currency0.length > 0 &&
      currency1.length > 0 &&
      amount &&
      isChainSupported &&
      !isNaN(Number(amount)) &&
      Number(amount) > 0
    ) {
      const timeoutId = setTimeout(() => {
        result.refetch();
      }, 800); // 800ms debounce

      // Cleanup function to clear timeout on dependency change
      return () => clearTimeout(timeoutId);
    }
  }, [
    amount,
    currency0,
    currency1,
    zeroForOne,
    fee,
    tickSpacing,
    hookAddress,
    hookData,
    isChainSupported,
    result,
  ]);

  return {
    quoteData: result.data?.result as
      | readonly [bigint, bigint, number, bigint]
      | undefined,
    quoteError: result.error,
    isQuoteLoading,
    fetchQuoteResult,
  };
}
