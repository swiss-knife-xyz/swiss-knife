import { useState, useEffect } from "react";
import { useReadContracts } from "wagmi";
import { erc20Abi, zeroAddress, Address } from "viem";

interface UseCurrencyInfoProps {
  currency0: string;
  currency1: string;
  setCurrency0: (value: string) => void;
  setCurrency1: (value: string) => void;
}

export function useCurrencyInfo({
  currency0,
  currency1,
  setCurrency0,
  setCurrency1,
}: UseCurrencyInfoProps) {
  const [currency0Symbol, setCurrency0Symbol] = useState<string | undefined>();
  const [currency0Decimals, setCurrency0Decimals] = useState<
    number | undefined
  >();
  const [currency1Symbol, setCurrency1Symbol] = useState<string | undefined>();
  const [currency1Decimals, setCurrency1Decimals] = useState<
    number | undefined
  >();

  const { data: currencyInfo, refetch: refetchCurrencyInfo } = useReadContracts(
    {
      contracts: [
        ...(currency0 !== zeroAddress && currency0.length === 42 // Basic address check
          ? [
              {
                address: currency0 as Address,
                abi: erc20Abi,
                functionName: "symbol",
              },
              {
                address: currency0 as Address,
                abi: erc20Abi,
                functionName: "decimals",
              },
            ]
          : []),
        ...(currency1 !== zeroAddress && currency1.length === 42 // Basic address check
          ? [
              {
                address: currency1 as Address,
                abi: erc20Abi,
                functionName: "symbol",
              },
              {
                address: currency1 as Address,
                abi: erc20Abi,
                functionName: "decimals",
              },
            ]
          : []),
      ],
      query: {
        // Enable only if both currencies are set and are valid-looking addresses (or zeroAddress for native)
        enabled:
          currency0.length > 0 &&
          currency1.length > 0 &&
          (currency0 === zeroAddress || currency0.length === 42) &&
          (currency1 === zeroAddress || currency1.length === 42),
        // Do not refetch on window focus or mount, only when currencies change (handled by useEffect below)
        refetchOnWindowFocus: false,
        refetchOnMount: false,
      },
    }
  );

  useEffect(() => {
    if (
      currency0.length > 0 &&
      currency1.length > 0 &&
      (currency0 === zeroAddress || currency0.length === 42) &&
      (currency1 === zeroAddress || currency1.length === 42)
    ) {
      refetchCurrencyInfo();
    }
  }, [currency0, currency1, refetchCurrencyInfo]);

  useEffect(() => {
    // Handle currency0
    if (currency0 === zeroAddress) {
      setCurrency0Symbol("ETH");
      setCurrency0Decimals(18);
    } else if (currencyInfo && currency0.length === 42) {
      const currency0InfoIndex = 0;
      // Check if result exists for currency0
      if (currencyInfo[currency0InfoIndex]?.status === "success") {
        setCurrency0Symbol(currencyInfo[currency0InfoIndex]?.result as string);
        setCurrency0Decimals(
          currencyInfo[currency0InfoIndex + 1]?.result as number
        );
      } else {
        setCurrency0Symbol(undefined);
        setCurrency0Decimals(undefined);
      }
    } else {
      setCurrency0Symbol(undefined);
      setCurrency0Decimals(undefined);
    }

    // Handle currency1
    if (currency1 === zeroAddress) {
      setCurrency1Symbol("ETH");
      setCurrency1Decimals(18);
    } else if (currencyInfo && currency1.length === 42) {
      const currency1InfoIndex =
        currency0 !== zeroAddress && currency0.length === 42 ? 2 : 0;
      // Check if result exists for currency1
      if (currencyInfo[currency1InfoIndex]?.status === "success") {
        setCurrency1Symbol(currencyInfo[currency1InfoIndex]?.result as string);
        setCurrency1Decimals(
          currencyInfo[currency1InfoIndex + 1]?.result as number
        );
      } else {
        setCurrency1Symbol(undefined);
        setCurrency1Decimals(undefined);
      }
    } else {
      setCurrency1Symbol(undefined);
      setCurrency1Decimals(undefined);
    }
  }, [currencyInfo, currency0, currency1]);

  // Auto-swap currencies if currency1 < currency0 (Uniswap convention)
  useEffect(() => {
    if (
      currency0 &&
      currency1 &&
      currency0.length > 0 && // Ensure strings are not empty
      currency1.length > 0 &&
      currency0 !== currency1 &&
      currency0.startsWith("0x") &&
      currency1.startsWith("0x") // Ensure they are hex strings
    ) {
      try {
        if (BigInt(currency1) < BigInt(currency0)) {
          const temp = currency0;
          setCurrency0(currency1);
          setCurrency1(temp);
        }
      } catch (error) {
        // Invalid addresses for BigInt conversion, ignore or handle
        // console.error("Error auto-swapping currencies:", error);
      }
    }
  }, [currency0, currency1, setCurrency0, setCurrency1]);

  return {
    currency0Symbol,
    currency0Decimals,
    currency1Symbol,
    currency1Decimals,
    isLoadingCurrencyInfo: currencyInfo === undefined, // A simple loading state based on undefined data
    currencyInfoError: currencyInfo?.some((c) => c.status === "failure"), // Check if any contract call failed
  };
}
