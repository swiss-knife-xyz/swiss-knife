import { useState, useRef, useCallback } from "react";
import { useLocalStorage } from "usehooks-ts";
import { Address, parseUnits, zeroAddress, Hex, formatUnits } from "viem";
import { usePublicClient } from "wagmi";
import { quoterAbi, quoterAddress, PoolKey } from "../../lib/constants";
import { sqrtPriceX96ToPrice } from "../lib/utils";

interface UseBinarySearchProps {
  targetPrice?: string;
  currentZeroForOnePrice?: string;
  currentOneForZeroPrice?: string;
  currency0Decimals?: number;
  currency1Decimals?: number;
  chain?: { id: number };
  poolKey: PoolKey;
  currency0Symbol?: string;
  currency1Symbol?: string;
  targetPriceDirection: boolean;
  hookData?: string;
}

export const useBinarySearch = ({
  targetPrice,
  currentZeroForOnePrice,
  currentOneForZeroPrice,
  currency0Decimals,
  currency1Decimals,
  chain,
  poolKey,
  currency0Symbol,
  currency1Symbol,
  targetPriceDirection,
  hookData,
}: UseBinarySearchProps) => {
  const publicClient = usePublicClient();

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
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const shouldStopSearch = useRef<boolean>(false);
  const [searchResult, setSearchResult] = useState<{
    amount: string;
    token: string;
    finalPrice: string;
    direction: string;
  } | null>(null);

  const performBinarySearch = useCallback(async () => {
    if (
      !targetPrice ||
      !currentZeroForOnePrice ||
      !currentOneForZeroPrice ||
      !currency0Decimals ||
      !currency1Decimals ||
      !chain?.id ||
      !quoterAddress[chain.id] ||
      !publicClient
    ) {
      return;
    }

    setIsSearching(true);
    shouldStopSearch.current = false;
    setSearchProgress("Initializing binary search...");
    setSearchResult(null);

    const targetPriceNum = Number(targetPrice);
    const currentPriceNum = targetPriceDirection
      ? Number(currentZeroForOnePrice)
      : Number(currentOneForZeroPrice);

    const thresholdNum = Number(threshold) / 100; // Convert percentage to decimal
    const tolerance = targetPriceNum * thresholdNum;

    let swapZeroForOne: boolean;

    if (targetPriceDirection) {
      if (targetPriceNum > currentPriceNum) {
        swapZeroForOne = false;
      } else {
        swapZeroForOne = true;
      }
    } else {
      if (targetPriceNum > currentPriceNum) {
        swapZeroForOne = false;
      } else {
        swapZeroForOne = true;
      }
    }

    const swapTokenSymbol = swapZeroForOne ? currency0Symbol : currency1Symbol;
    const swapTokenDecimals = swapZeroForOne
      ? currency0Decimals
      : currency1Decimals;

    console.log("🚀 Starting binary search for optimal swap amount");
    console.log("Target Price:", targetPriceNum);
    console.log("Current Price:", currentPriceNum);
    console.log(
      "Swap Direction:",
      swapZeroForOne ? "Currency0 → Currency1" : "Currency1 → Currency0"
    );
    console.log("Swap Token:", swapTokenSymbol);
    console.log("Max Iterations:", maxIterations);
    console.log(
      "Search Range:",
      formatUnits(parseUnits(searchLow, swapTokenDecimals), swapTokenDecimals),
      "to",
      formatUnits(parseUnits(searchHigh, swapTokenDecimals), swapTokenDecimals),
      swapTokenSymbol
    );

    let low = parseUnits(searchLow, swapTokenDecimals);
    let high = parseUnits(searchHigh, swapTokenDecimals);
    let iterations = 0;
    let foundResult = false;

    try {
      while (
        low <= high &&
        iterations < maxIterations &&
        !shouldStopSearch.current
      ) {
        iterations++;
        const mid = (low + high) / 2n;
        const swapAmountFormatted = formatUnits(mid, swapTokenDecimals);

        setSearchProgress(
          `Iteration ${iterations}: Testing ${swapAmountFormatted} ${swapTokenSymbol}...`
        );

        try {
          const simulationResult = await publicClient.simulateContract({
            address: quoterAddress[chain.id],
            abi: quoterAbi,
            functionName: "quoteExactInputSingle",
            args: [
              {
                poolKey: {
                  ...poolKey,
                  currency0: poolKey.currency0 as Address,
                  currency1: poolKey.currency1 as Address,
                  hooks: (poolKey.hooks || zeroAddress) as Address,
                },
                zeroForOne: swapZeroForOne,
                exactAmount: mid,
                hookData: (hookData || "0x") as Hex,
              },
            ],
          });

          const [_amountOut, sqrtPriceX96After, _tickAfter, _gasEstimate] =
            simulationResult.result;

          const priceAfter = sqrtPriceX96ToPrice(
            sqrtPriceX96After,
            currency0Decimals,
            currency1Decimals
          );
          const adjustedPriceAfter = targetPriceDirection
            ? priceAfter
            : 1 / priceAfter;

          console.log(
            `➡️ ${swapAmountFormatted} ${swapTokenSymbol} → Price: ${adjustedPriceAfter.toFixed(
              6
            )}`
          );

          setSearchProgress(
            `Iteration ${iterations}: ${swapAmountFormatted} ${swapTokenSymbol} → Price: ${adjustedPriceAfter.toFixed(
              6
            )}`
          );

          if (Math.abs(adjustedPriceAfter - targetPriceNum) <= tolerance) {
            console.log("✅ Found optimal swap amount!");
            console.log(
              "Final swap amount:",
              swapAmountFormatted,
              swapTokenSymbol
            );
            console.log(
              "Final price after swap:",
              adjustedPriceAfter.toFixed(6)
            );

            foundResult = true;
            setSearchResult({
              amount: swapAmountFormatted,
              token:
                swapTokenSymbol || (swapZeroForOne ? "Currency0" : "Currency1"),
              finalPrice: adjustedPriceAfter.toFixed(6),
              direction: swapZeroForOne
                ? "Sell Currency0 for Currency1"
                : "Sell Currency1 for Currency0",
            });
            setSearchProgress(
              `✅ Found optimal amount: ${swapAmountFormatted} ${swapTokenSymbol}`
            );
            break;
          } else if (adjustedPriceAfter < targetPriceNum) {
            high = mid - 1n;
          } else {
            low = mid + 1n;
          }
          await new Promise((resolve) => setTimeout(resolve, 200));
        } catch (error: any) {
          const errorMsg = error.shortMessage || error.message || String(error);
          console.log(
            `❌ ${swapAmountFormatted} ${swapTokenSymbol} → Error: ${errorMsg}`
          );
          if (
            errorMsg.includes("NotEnoughLiquidity") ||
            errorMsg.includes("insufficient") ||
            errorMsg.includes("exceeds")
          ) {
            high = mid - 1n;
          } else {
            high = mid - 1n;
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
      setIsSearching(false);
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
    targetPriceDirection,
    threshold,
    searchLow,
    searchHigh,
    maxIterations,
    poolKey,
    currency0Symbol,
    currency1Symbol,
    hookData,
  ]);

  const stopBinarySearch = useCallback(() => {
    console.log("🛑 User requested to stop binary search");
    shouldStopSearch.current = true;
  }, []);

  return {
    threshold,
    setThreshold,
    searchLow,
    setSearchLow,
    searchHigh,
    setSearchHigh,
    maxIterations,
    setMaxIterations,
    searchProgress,
    isSearching,
    searchResult,
    performBinarySearch,
    stopBinarySearch,
  };
};
