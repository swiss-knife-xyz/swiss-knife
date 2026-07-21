"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useLocalStorage } from "usehooks-ts";
import { Address, Hex, formatUnits } from "viem";
import { usePublicClient } from "wagmi";
import { multicall } from "@wagmi/core";
import { config } from "@/app/providers"; // Import wagmi config
import { quoterAbi, quoterAddress, PoolKey } from "../../lib/constants";
import type { PoolWithHookData } from "@/lib/uniswap/types";
import { assertValidRoutePool } from "@/lib/uniswap/quote";
import { sqrtPriceX96ToPrice } from "../../add-liquidity/lib/utils";
import {
  generateParallelSearchAmounts,
  getNextBinarySearchBounds,
  getTargetSwapDirection,
  parseTargetSearchParameters,
  priceDecreasesAsAmountIncreases,
} from "../lib/search";

interface UseTargetPriceCalculatorProps {
  poolKey: PoolKey | null;
  currency0Decimals?: number;
  currency1Decimals?: number;
  currency0Symbol?: string;
  currency1Symbol?: string;
  currentZeroForOnePrice?: string;
  currentOneForZeroPrice?: string;
  hookDataProp?: Hex; // Renamed to avoid conflict
  chain?: { id: number };
}

export interface SearchResult {
  amount: string;
  token: string;
  finalPrice: string;
  direction: string;
  zeroForOne: boolean;
  chainId: number;
  pool: PoolWithHookData;
  targetPrice?: string; // Add target price for deviation calculation
  priceDeviation?: string; // Add price deviation
  currentPrice?: string; // Add current price for reference
}

export const useTargetPriceCalculator = ({
  poolKey,
  currency0Decimals,
  currency1Decimals,
  currency0Symbol,
  currency1Symbol,
  currentZeroForOnePrice,
  currentOneForZeroPrice,
  hookDataProp,
  chain,
}: UseTargetPriceCalculatorProps) => {
  const publicClient = usePublicClient();

  const [targetPrice, setTargetPrice] = useLocalStorage<string>(
    "uniswap-targetPrice",
    ""
  );
  const [targetPriceDirection, setTargetPriceDirection] =
    useLocalStorage<boolean>("uniswap-targetPriceDirection", true);
  const [threshold, setThreshold] = useLocalStorage<string>(
    "uniswap-threshold",
    "0.5"
  );
  const [searchLow, setSearchLow] = useLocalStorage<string>(
    "uniswap-searchLow",
    "0.001"
  );
  const [searchHigh, setSearchHigh] = useLocalStorage<string>(
    "uniswap-searchHigh",
    "1000"
  );
  const [maxIterations, setMaxIterations] = useLocalStorage<number>(
    "uniswap-maxIterations",
    50
  );
  const [searchProgress, setSearchProgress] = useState<string>("");
  const [isBinarySearching, setIsBinarySearching] = useState<boolean>(false);
  const [isParallelSearching, setIsParallelSearching] =
    useState<boolean>(false);
  const shouldStopSearch = useRef<boolean>(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);

  useEffect(() => {
    shouldStopSearch.current = true;
    setSearchResult(null);
    setSearchProgress("");
  }, [
    chain?.id,
    currentOneForZeroPrice,
    currentZeroForOnePrice,
    hookDataProp,
    poolKey?.currency0,
    poolKey?.currency1,
    poolKey?.fee,
    poolKey?.hooks,
    poolKey?.tickSpacing,
    searchHigh,
    searchLow,
    targetPrice,
    targetPriceDirection,
    threshold,
  ]);

  const performBinarySearch = useCallback(async () => {
    if (
      !targetPrice ||
      !currentZeroForOnePrice ||
      !currentOneForZeroPrice ||
      currency0Decimals === undefined ||
      currency1Decimals === undefined ||
      !chain?.id ||
      !quoterAddress[chain.id] ||
      !publicClient ||
      !poolKey ||
      !poolKey.currency0 ||
      !poolKey.currency1 ||
      poolKey.fee === undefined || // Check for undefined explicitly
      poolKey.tickSpacing === undefined // Check for undefined explicitly
    ) {
      setSearchProgress(
        "❌ Missing required parameters for binary search. Check pool details, target price, and current prices."
      );
      console.error(
        "Binary search pre-flight check failed: Missing parameters",
        {
          targetPrice,
          currentZeroForOnePrice,
          currentOneForZeroPrice,
          currency0Decimals,
          currency1Decimals,
          chainId: chain?.id,
          poolKey,
        }
      );
      return;
    }

    setIsBinarySearching(true);
    shouldStopSearch.current = false;
    setSearchProgress("Initializing binary search...");
    setSearchResult(null);

    try {
      const selectedCurrentPrice = targetPriceDirection
        ? currentZeroForOnePrice
        : currentOneForZeroPrice;
      const targetPriceNum = Number(targetPrice);
      const currentPriceNum = Number(selectedCurrentPrice);
      const swapZeroForOne = getTargetSwapDirection(
        targetPriceNum,
        currentPriceNum,
        targetPriceDirection
      );
      if (swapZeroForOne === null) {
        setSearchProgress("✅ Pool is already at the target price");
        return;
      }

      const swapTokenSymbolToUse = swapZeroForOne
        ? currency0Symbol
        : currency1Symbol;
      const swapTokenDecimals = swapZeroForOne
        ? currency0Decimals
        : currency1Decimals;
      const poolSnapshot: PoolWithHookData = {
        ...poolKey,
        hookData: (hookDataProp || "0x") as Hex,
      };
      assertValidRoutePool(poolSnapshot);
      const parsed = parseTargetSearchParameters({
        targetPrice,
        currentPrice: selectedCurrentPrice,
        thresholdPercent: threshold,
        searchLow,
        searchHigh,
        tokenDecimals: swapTokenDecimals,
        maxIterations,
      });
      const tolerance = parsed.tolerance;
      let low = parsed.low;
      let high = parsed.high;
      let iterations = 0;
      let foundResult = false;
      const priceDecreases = priceDecreasesAsAmountIncreases(
        swapZeroForOne,
        targetPriceDirection
      );

      console.log("🚀 Starting binary search for optimal swap amount");
      console.log("Target Price:", targetPriceNum);
      console.log("Current Price:", currentPriceNum);
      console.log(
        "Swap Direction:",
        swapZeroForOne ? "Currency0 → Currency1" : "Currency1 → Currency0"
      );
      console.log("Swap Token:", swapTokenSymbolToUse);
      console.log("Max Iterations:", maxIterations);
      console.log(
        "Search Range:",
        formatUnits(low, swapTokenDecimals),
        "to",
        formatUnits(high, swapTokenDecimals),
        swapTokenSymbolToUse
      );

      while (
        low <= high &&
        iterations < maxIterations &&
        !shouldStopSearch.current
      ) {
        iterations++;
        const mid = (low + high) / 2n;
        const swapAmountFormatted = formatUnits(mid, swapTokenDecimals);

        setSearchProgress(
          `Iteration ${iterations}: Testing ${swapAmountFormatted} ${swapTokenSymbolToUse}...`
        );

        try {
          const simulationResult = await publicClient.simulateContract({
            address: quoterAddress[chain.id] as Address,
            abi: quoterAbi,
            functionName: "quoteExactInputSingle",
            args: [
              {
                poolKey: {
                  currency0: poolSnapshot.currency0,
                  currency1: poolSnapshot.currency1,
                  tickSpacing: poolSnapshot.tickSpacing,
                  fee: poolSnapshot.fee,
                  hooks: poolSnapshot.hooks,
                },
                zeroForOne: swapZeroForOne,
                exactAmount: mid,
                hookData: poolSnapshot.hookData,
              },
            ],
          });

          const [, sqrtPriceX96After] = simulationResult.result as [
            bigint,
            bigint,
            number,
            bigint,
          ];
          if (shouldStopSearch.current) return;

          const priceAfter = sqrtPriceX96ToPrice(
            sqrtPriceX96After,
            currency0Decimals,
            currency1Decimals
          );
          const adjustedPriceAfter = targetPriceDirection
            ? priceAfter
            : 1 / priceAfter;

          console.log(
            `➡️ ${swapAmountFormatted} ${swapTokenSymbolToUse} → Price: ${adjustedPriceAfter.toFixed(
              6
            )}`
          );
          setSearchProgress(
            `Iteration ${iterations}: ${swapAmountFormatted} ${swapTokenSymbolToUse} → Price: ${adjustedPriceAfter.toFixed(
              6
            )}`
          );

          if (Math.abs(adjustedPriceAfter - targetPriceNum) <= tolerance) {
            console.log("✅ Found optimal swap amount!");
            console.log(
              "Final swap amount:",
              swapAmountFormatted,
              swapTokenSymbolToUse
            );
            console.log(
              "Final price after swap:",
              adjustedPriceAfter.toFixed(6)
            );

            foundResult = true;
            setSearchResult({
              amount: swapAmountFormatted,
              token:
                swapTokenSymbolToUse ||
                (swapZeroForOne ? "Currency0" : "Currency1"),
              finalPrice: adjustedPriceAfter.toFixed(6),
              direction: swapZeroForOne
                ? "Sell Currency0 for Currency1"
                : "Sell Currency1 for Currency0",
              zeroForOne: swapZeroForOne,
              chainId: chain.id,
              pool: poolSnapshot,
              targetPrice: targetPrice,
              priceDeviation: (
                (Math.abs(adjustedPriceAfter - targetPriceNum) /
                  targetPriceNum) *
                100
              ).toFixed(2),
              currentPrice: currentPriceNum.toFixed(6),
            });
            setSearchProgress(
              `✅ Found optimal amount: ${swapAmountFormatted} ${swapTokenSymbolToUse}`
            );
            break;
          } else {
            ({ low, high } = getNextBinarySearchBounds({
              low,
              high,
              mid,
              quotedPrice: adjustedPriceAfter,
              targetPrice: targetPriceNum,
              priceDecreases,
            }));
          }
          await new Promise((resolve) => setTimeout(resolve, 200));
        } catch (error: any) {
          const errorMsg = error.shortMessage || error.message || String(error);
          console.log(
            `❌ ${swapAmountFormatted} ${swapTokenSymbolToUse} → Error: ${errorMsg}`
          );
          if (
            errorMsg.includes("NotEnoughLiquidity") ||
            errorMsg.includes("insufficient") ||
            errorMsg.includes("exceeds")
          ) {
            high = mid - 1n;
          } else {
            throw error;
          }
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      if (shouldStopSearch.current) {
        console.log("🛑 Binary search stopped by user");
        setSearchProgress("🛑 Search stopped by user");
      } else if (iterations >= maxIterations && !foundResult) {
        console.log("⚠️ Search reached maximum iterations");
        setSearchProgress(
          "❌ Search reached maximum iterations without finding exact match"
        );
      } else if (!foundResult) {
        console.log("❌ No suitable swap amount found");
        setSearchProgress(
          "❌ No suitable swap amount found within the given range"
        );
      }
    } catch (error: any) {
      console.log("💥 Binary search failed:", error);
      setSearchProgress(
        `❌ Search failed: ${error.shortMessage || error.message || error}`
      );
    } finally {
      setIsBinarySearching(false);
      shouldStopSearch.current = false;
    }
  }, [
    targetPrice,
    currentZeroForOnePrice,
    currentOneForZeroPrice,
    currency0Decimals,
    currency1Decimals,
    chain,
    publicClient,
    poolKey,
    targetPriceDirection,
    threshold,
    searchLow,
    searchHigh,
    maxIterations,
    currency0Symbol,
    currency1Symbol,
    hookDataProp, // Added hookDataProp
    // setSearchProgress, setIsSearching, setSearchResult, shouldStopSearch // these are state setters, not dependencies for useCallback's logic usually
  ]);

  const performOptimizedParallelSearch = useCallback(async () => {
    if (
      !targetPrice ||
      !currentZeroForOnePrice ||
      !currentOneForZeroPrice ||
      currency0Decimals === undefined ||
      currency1Decimals === undefined ||
      !chain?.id ||
      !quoterAddress[chain.id] ||
      !publicClient ||
      !poolKey ||
      !poolKey.currency0 ||
      !poolKey.currency1 ||
      poolKey.fee === undefined ||
      poolKey.tickSpacing === undefined
    ) {
      setSearchProgress(
        "❌ Missing required parameters for parallel search. Check pool details, target price, and current prices."
      );
      return;
    }

    setIsParallelSearching(true);
    shouldStopSearch.current = false;
    setSearchProgress("Initializing parallel search...");
    setSearchResult(null);

    try {
      const selectedCurrentPrice = targetPriceDirection
        ? currentZeroForOnePrice
        : currentOneForZeroPrice;
      const targetPriceNum = Number(targetPrice);
      const currentPriceNum = Number(selectedCurrentPrice);
      const swapZeroForOne = getTargetSwapDirection(
        targetPriceNum,
        currentPriceNum,
        targetPriceDirection
      );
      if (swapZeroForOne === null) {
        setSearchProgress("✅ Pool is already at the target price");
        return;
      }

      const swapTokenSymbolToUse = swapZeroForOne
        ? currency0Symbol
        : currency1Symbol;
      const swapTokenDecimals = swapZeroForOne
        ? currency0Decimals
        : currency1Decimals;
      const poolSnapshot: PoolWithHookData = {
        ...poolKey,
        hookData: (hookDataProp || "0x") as Hex,
      };
      assertValidRoutePool(poolSnapshot);
      const parsed = parseTargetSearchParameters({
        targetPrice,
        currentPrice: selectedCurrentPrice,
        thresholdPercent: threshold,
        searchLow,
        searchHigh,
        tokenDecimals: swapTokenDecimals,
        maxIterations,
        minimumIterations: 2,
      });
      const tolerance = parsed.tolerance;
      const testAmounts = generateParallelSearchAmounts(
        parsed.low,
        parsed.high,
        parsed.maxIterations
      );

      console.log(
        "🚀 Starting optimized parallel search for optimal swap amount"
      );
      console.log("Target Price:", targetPriceNum);
      console.log("Current Price:", currentPriceNum);
      console.log(
        "Swap Direction:",
        swapZeroForOne ? "Currency0 → Currency1" : "Currency1 → Currency0"
      );

      setSearchProgress(`Testing ${testAmounts.length} amounts in parallel...`);

      // Prepare multicall contracts
      const contracts = testAmounts.map((amount) => ({
        address: quoterAddress[chain.id] as Address,
        abi: quoterAbi,
        functionName: "quoteExactInputSingle" as const,
        args: [
          {
            poolKey: {
              currency0: poolSnapshot.currency0,
              currency1: poolSnapshot.currency1,
              tickSpacing: poolSnapshot.tickSpacing,
              fee: poolSnapshot.fee,
              hooks: poolSnapshot.hooks,
            },
            zeroForOne: swapZeroForOne,
            exactAmount: amount,
            hookData: poolSnapshot.hookData,
          },
        ],
        chainId: chain.id,
      }));

      // Execute all calls in parallel
      const results = await multicall(config, {
        contracts,
        allowFailure: true,
        batchSize: 1024,
      });

      setSearchProgress("Processing parallel results...");

      // Process results and find the best match
      let bestMatch: {
        amount: bigint;
        price: number;
        distance: number;
        index: number;
      } | null = null;

      for (let i = 0; i < results.length; i++) {
        if (shouldStopSearch.current) break;

        const result = results[i];
        const amount = testAmounts[i];

        if (result.status === "success" && result.result) {
          try {
            const [, sqrtPriceX96After] = result.result as [
              bigint,
              bigint,
              number,
              bigint,
            ];

            const priceAfter = sqrtPriceX96ToPrice(
              sqrtPriceX96After,
              currency0Decimals,
              currency1Decimals
            );
            const adjustedPriceAfter = targetPriceDirection
              ? priceAfter
              : 1 / priceAfter;
            const distance = Math.abs(adjustedPriceAfter - targetPriceNum);

            console.log(
              `✅ ${formatUnits(
                amount,
                swapTokenDecimals
              )} ${swapTokenSymbolToUse} → Price: ${adjustedPriceAfter.toFixed(
                6
              )} (distance: ${distance.toFixed(6)})`
            );

            if (!bestMatch || distance < bestMatch.distance) {
              bestMatch = {
                amount,
                price: adjustedPriceAfter,
                distance,
                index: i,
              };
            }
          } catch (error) {
            console.log(`❌ Error processing result ${i}:`, error);
          }
        } else {
          const amountFormatted = formatUnits(amount, swapTokenDecimals);
          console.log(
            `❌ ${amountFormatted} ${swapTokenSymbolToUse} → Failed:`,
            result.error?.message
          );
        }
      }

      if (shouldStopSearch.current) {
        console.log("🛑 Parallel search stopped by user");
        setSearchProgress("🛑 Search stopped by user");
        return;
      }

      if (bestMatch) {
        const finalAmountFormatted = formatUnits(
          bestMatch.amount,
          swapTokenDecimals
        );

        // Check if we found a good enough match
        if (bestMatch.distance <= tolerance) {
          console.log("✅ Found optimal swap amount!");
          setSearchResult({
            amount: finalAmountFormatted,
            token:
              swapTokenSymbolToUse ||
              (swapZeroForOne ? "Currency0" : "Currency1"),
            finalPrice: bestMatch.price.toFixed(6),
            direction: swapZeroForOne
              ? "Sell Currency0 for Currency1"
              : "Sell Currency1 for Currency0",
            zeroForOne: swapZeroForOne,
            chainId: chain.id,
            pool: poolSnapshot,
            targetPrice: targetPrice,
            priceDeviation: (
              (Math.abs(bestMatch.price - targetPriceNum) / targetPriceNum) *
              100
            ).toFixed(2),
            currentPrice: currentPriceNum.toFixed(6),
          });
          setSearchProgress(
            `✅ Found optimal amount: ${finalAmountFormatted} ${swapTokenSymbolToUse}`
          );
        } else {
          // If not close enough, do a refined search around the best match
          await performRefinedSearch(
            bestMatch,
            testAmounts,
            swapZeroForOne,
            swapTokenDecimals,
            swapTokenSymbolToUse,
            targetPriceNum,
            tolerance
          );
        }
      } else {
        console.log("❌ No suitable swap amount found");
        setSearchProgress(
          "❌ No suitable swap amount found within the given range"
        );
      }
    } catch (error: any) {
      console.log("💥 Parallel search failed:", error);
      setSearchProgress(
        `❌ Search failed: ${error.shortMessage || error.message || error}`
      );
    } finally {
      setIsParallelSearching(false);
      shouldStopSearch.current = false;
    }
  }, [
    targetPrice,
    currentZeroForOnePrice,
    currentOneForZeroPrice,
    currency0Decimals,
    currency1Decimals,
    chain,
    publicClient,
    poolKey,
    targetPriceDirection,
    threshold,
    searchLow,
    searchHigh,
    currency0Symbol,
    currency1Symbol,
    hookDataProp,
  ]);

  const performRefinedSearch = useCallback(
    async (
      bestMatch: {
        amount: bigint;
        price: number;
        distance: number;
        index: number;
      },
      originalAmounts: bigint[],
      swapZeroForOne: boolean,
      swapTokenDecimals: number,
      swapTokenSymbolToUse: string | undefined,
      targetPriceNum: number,
      tolerance: number
    ) => {
      setSearchProgress("Performing refined search around best match...");
      const poolSnapshot: PoolWithHookData = {
        ...poolKey!,
        hookData: (hookDataProp || "0x") as Hex,
      };
      assertValidRoutePool(poolSnapshot);

      // Create a narrower range around the best match
      const bestAmount = bestMatch.amount;
      const prevAmount = originalAmounts[Math.max(0, bestMatch.index - 1)];
      const nextAmount =
        originalAmounts[
          Math.min(originalAmounts.length - 1, bestMatch.index + 1)
        ];

      const lowerBound =
        prevAmount < bestAmount
          ? prevAmount
          : bestAmount / 2n > 0n
            ? bestAmount / 2n
            : 1n;
      const upperBound = nextAmount > bestAmount ? nextAmount : bestAmount * 2n;

      // Generate 15 refined test points
      const refinedAmounts = new Set<bigint>();
      const numRefinedTests = 15;

      for (let i = 0; i < numRefinedTests; i++) {
        const amount =
          lowerBound +
          ((upperBound - lowerBound) * BigInt(i)) / BigInt(numRefinedTests - 1);
        refinedAmounts.add(amount);
      }

      const uniqueRefinedAmounts = [...refinedAmounts];

      // Prepare refined multicall contracts
      const contracts = uniqueRefinedAmounts.map((amount) => ({
        address: quoterAddress[chain!.id] as Address,
        abi: quoterAbi,
        functionName: "quoteExactInputSingle" as const,
        args: [
          {
            poolKey: {
              currency0: poolSnapshot.currency0,
              currency1: poolSnapshot.currency1,
              tickSpacing: poolSnapshot.tickSpacing,
              fee: poolSnapshot.fee,
              hooks: poolSnapshot.hooks,
            },
            zeroForOne: swapZeroForOne,
            exactAmount: amount,
            hookData: poolSnapshot.hookData,
          },
        ],
        chainId: chain!.id,
      }));

      try {
        const refinedResults = await multicall(config, {
          contracts,
          allowFailure: true,
          batchSize: 1024,
        });

        let refinedBestMatch = bestMatch;

        for (let i = 0; i < refinedResults.length; i++) {
          if (shouldStopSearch.current) break;

          const result = refinedResults[i];
          const amount = uniqueRefinedAmounts[i];

          if (result.status === "success" && result.result) {
            try {
              const [, sqrtPriceX96After] = result.result as [
                bigint,
                bigint,
                number,
                bigint,
              ];

              const priceAfter = sqrtPriceX96ToPrice(
                sqrtPriceX96After,
                currency0Decimals!,
                currency1Decimals!
              );
              const adjustedPriceAfter = targetPriceDirection
                ? priceAfter
                : 1 / priceAfter;
              const distance = Math.abs(adjustedPriceAfter - targetPriceNum);

              if (distance < refinedBestMatch.distance) {
                refinedBestMatch = {
                  amount,
                  price: adjustedPriceAfter,
                  distance,
                  index: i,
                };
              }
            } catch (error) {
              // Skip failed results
            }
          }
        }
        if (shouldStopSearch.current) return;

        // Set the final result
        const finalAmountFormatted = formatUnits(
          refinedBestMatch.amount,
          swapTokenDecimals
        );

        console.log("✅ Refined search completed!");
        setSearchResult({
          amount: finalAmountFormatted,
          token:
            swapTokenSymbolToUse ||
            (swapZeroForOne ? "Currency0" : "Currency1"),
          finalPrice: refinedBestMatch.price.toFixed(6),
          direction: swapZeroForOne
            ? "Sell Currency0 for Currency1"
            : "Sell Currency1 for Currency0",
          zeroForOne: swapZeroForOne,
          chainId: chain!.id,
          pool: poolSnapshot,
          targetPrice: targetPrice,
          priceDeviation: (
            (Math.abs(refinedBestMatch.price - targetPriceNum) /
              targetPriceNum) *
            100
          ).toFixed(2),
          currentPrice: targetPriceDirection
            ? currentZeroForOnePrice || "0"
            : currentOneForZeroPrice || "0",
        });

        const matchQuality =
          refinedBestMatch.distance <= tolerance
            ? "✅ Optimal"
            : "👉 Best available";
        setSearchProgress(
          `${matchQuality} amount: ${finalAmountFormatted} ${swapTokenSymbolToUse}`
        );
      } catch (error: any) {
        console.log("⚠️ Refined search failed, using initial best match");
        // Fall back to the original best match
        const finalAmountFormatted = formatUnits(
          bestMatch.amount,
          swapTokenDecimals
        );
        setSearchResult({
          amount: finalAmountFormatted,
          token:
            swapTokenSymbolToUse ||
            (swapZeroForOne ? "Currency0" : "Currency1"),
          finalPrice: bestMatch.price.toFixed(6),
          direction: swapZeroForOne
            ? "Sell Currency0 for Currency1"
            : "Sell Currency1 for Currency0",
          zeroForOne: swapZeroForOne,
          chainId: chain!.id,
          pool: poolSnapshot,
          targetPrice: targetPrice,
          priceDeviation: (
            (Math.abs(bestMatch.price - targetPriceNum) / targetPriceNum) *
            100
          ).toFixed(2),
          currentPrice: targetPriceDirection
            ? currentZeroForOnePrice || "0"
            : currentOneForZeroPrice || "0",
        });
        setSearchProgress(
          `✅ Found amount: ${finalAmountFormatted} ${swapTokenSymbolToUse}`
        );
      }
    },
    [
      currency0Decimals,
      currency1Decimals,
      targetPriceDirection,
      poolKey,
      chain,
      hookDataProp,
    ]
  );

  const stopBinarySearch = useCallback(() => {
    console.log("🛑 User requested to stop search");
    shouldStopSearch.current = true;
  }, []);

  // Computed state for when any search is active
  const isAnySearching = isBinarySearching || isParallelSearching;

  return {
    targetPrice,
    setTargetPrice,
    targetPriceDirection,
    setTargetPriceDirection,
    threshold,
    setThreshold,
    searchLow,
    setSearchLow,
    searchHigh,
    setSearchHigh,
    maxIterations,
    setMaxIterations,
    searchProgress,
    isSearching: isAnySearching, // Keep for backward compatibility
    isBinarySearching,
    isParallelSearching,
    searchResult,
    performOptimizedParallelSearch,
    performBinarySearch, // Add binary search method to return
    stopBinarySearch,
  };
};
