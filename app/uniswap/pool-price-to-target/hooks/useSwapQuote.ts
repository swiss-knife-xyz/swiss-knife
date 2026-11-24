import { useState, useEffect, useMemo } from "react";
import { useSimulateContract } from "wagmi";
import { Address, zeroAddress, Hex, Chain } from "viem";
import { quoterAbi, quoterAddress } from "../../lib/constants";
import { assertValidRoutePool } from "@/lib/uniswap/quote";
import { parseTokenAmount } from "../../swap/lib/utils";

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

  const quoteInput = useMemo(() => {
    const decimals = zeroForOne ? currency0Decimals : currency1Decimals;
    if (
      decimals === undefined ||
      !chain?.id ||
      !quoterAddress[chain.id] ||
      !isChainSupported
    ) {
      return null;
    }

    try {
      const poolKey = {
        currency0: currency0 as Address,
        currency1: currency1 as Address,
        tickSpacing: tickSpacing!,
        fee: fee!,
        hooks: (hookAddress || zeroAddress) as Address,
      };
      const normalizedHookData = (hookData || "0x") as Hex;
      assertValidRoutePool({ ...poolKey, hookData: normalizedHookData });
      return {
        poolKey,
        zeroForOne,
        exactAmount: parseTokenAmount(amount, decimals),
        hookData: normalizedHookData,
      };
    } catch {
      return null;
    }
  }, [
    amount,
    chain?.id,
    currency0,
    currency0Decimals,
    currency1,
    currency1Decimals,
    fee,
    hookAddress,
    hookData,
    isChainSupported,
    tickSpacing,
    zeroForOne,
  ]);

  const result = useSimulateContract({
    address: chain?.id ? quoterAddress[chain.id] : undefined,
    abi: quoterAbi,
    functionName: "quoteExactInputSingle",
    args: quoteInput ? [quoteInput] : undefined,
    query: {
      enabled: false, // Disable auto-fetching
    },
  });

  // Combined loading state for quote
  const isQuoteLoading = result.isLoading || isForcedQuoteLoading;

  const fetchQuoteResult = async () => {
    if (quoteInput) {
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
    if (quoteInput) {
      const timeoutId = setTimeout(() => {
        result.refetch();
      }, 800); // 800ms debounce

      // Cleanup function to clear timeout on dependency change
      return () => clearTimeout(timeoutId);
    }
  }, [quoteInput, result.refetch]);

  return {
    quoteData: quoteInput
      ? (result.data?.result as
          | readonly [bigint, bigint, number, bigint]
          | undefined)
      : undefined,
    quoteError: result.error,
    isQuoteLoading,
    fetchQuoteResult,
  };
}
