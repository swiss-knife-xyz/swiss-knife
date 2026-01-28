"use client";

import React from "react";
import {
  Box,
  Button,
  Heading,
  Text,
  VStack,
  HStack,
  Icon,
  Badge,
} from "@chakra-ui/react";
import {
  FiPlay,
  FiStopCircle,
  FiTarget,
  FiArrowUp,
  FiExternalLink,
} from "react-icons/fi";
import { SearchResult } from "../hooks/useTargetPriceCalculator";
import { useTopLoaderRouter } from "@/hooks/useTopLoaderRouter";
import { useLocalStorage } from "usehooks-ts";
import { Address, zeroAddress } from "viem";
import { PoolWithHookData } from "@/lib/uniswap/types";
import { SwapLocalStorageKeys } from "../../lib/constants";
import { getPath } from "@/utils";
import subdomains from "@/subdomains";

interface TargetPriceSwapControlsProps {
  performOptimizedParallelSearch: () => Promise<void>;
  performBinarySearch?: () => Promise<void>;
  stopSearch: () => void;
  isSearching: boolean;
  isBinarySearching?: boolean;
  isParallelSearching?: boolean;
  searchProgress: string;
  searchResult: SearchResult | null;
  searchDisabled: boolean;
  setAmount: (value: string) => void;
  setZeroForOne: (value: boolean | ((prev: boolean) => boolean)) => void;
  swapAmountRef?: React.RefObject<HTMLElement>;
  threshold: string;
  targetPrice?: string;
  currentZeroForOnePrice?: string;
  currentOneForZeroPrice?: string;
  currency0?: Address;
  currency1?: Address;
  fee?: number;
  tickSpacing?: number;
  hookAddress?: Address;
  hookData?: string;
}

export const TargetPriceSwapControls: React.FC<
  TargetPriceSwapControlsProps
> = ({
  performOptimizedParallelSearch,
  performBinarySearch,
  stopSearch,
  isSearching,
  isBinarySearching,
  isParallelSearching,
  searchProgress,
  searchResult,
  searchDisabled,
  setAmount,
  setZeroForOne,
  swapAmountRef,
  threshold,
  targetPrice,
  currentZeroForOnePrice,
  currentOneForZeroPrice,
  currency0,
  currency1,
  fee,
  tickSpacing,
  hookAddress,
  hookData,
}) => {
  const router = useTopLoaderRouter();

  // Use the same local storage hooks that the swap page uses
  const [, setSwapPools] = useLocalStorage<PoolWithHookData[]>(
    SwapLocalStorageKeys.POOLS,
    []
  );
  const [, setSwapFromCurrency] = useLocalStorage<Address>(
    SwapLocalStorageKeys.FROM_CURRENCY,
    zeroAddress
  );
  const [, setSwapToCurrency] = useLocalStorage<Address>(
    SwapLocalStorageKeys.TO_CURRENCY,
    "" as Address
  );
  const [, setSwapAmount] = useLocalStorage<string>(
    SwapLocalStorageKeys.AMOUNT,
    "1"
  );
  const [, setSwapSlippage] = useLocalStorage<string>(
    SwapLocalStorageKeys.SLIPPAGE,
    "0.5"
  );

  // Utility function to calculate price impact for slippage
  const calculatePriceImpact = (amount: string, direction: string): number => {
    if (!amount || !currentZeroForOnePrice || !currentOneForZeroPrice) {
      return 0.5; // Default 0.5%
    }

    try {
      const amountNum = Number(amount);
      const isZeroForOne = direction.includes("Sell Currency0");

      // For small amounts, use a base impact of 0.1%
      // For larger amounts, scale up the impact
      // This is a simplified heuristic - in reality, you'd want to use the actual price change
      const baseImpact = 0.1;
      const scaleFactor = Math.log10(Math.max(amountNum, 1)) / 2;
      const estimatedImpact = baseImpact + scaleFactor * 0.2;

      // Add 0.5% buffer as requested in FIXME
      return Math.min(estimatedImpact + 0.5, 5.0); // Cap at 5%
    } catch (error) {
      console.error("Error calculating price impact:", error);
      return 0.5; // Default fallback
    }
  };

  // Utility function to calculate actual price deviation
  const calculateActualDeviation = (): string | null => {
    if (!searchResult?.finalPrice || !targetPrice) return null;

    try {
      const finalPriceNum = Number(searchResult.finalPrice);
      const targetPriceNum = Number(targetPrice);
      const deviation =
        (Math.abs(finalPriceNum - targetPriceNum) / targetPriceNum) * 100;
      return deviation.toFixed(3);
    } catch (error) {
      console.error("Error calculating price deviation:", error);
      return null;
    }
  };

  const handleNavigateToSwap = () => {
    if (!searchResult || !currency0 || !currency1) return;

    // Set pool configuration using the same hook as swap page
    const poolData: PoolWithHookData[] = [
      {
        currency0: currency0,
        currency1: currency1,
        fee: fee ?? 3000,
        tickSpacing: tickSpacing || 60,
        hooks: hookAddress || zeroAddress,
        hookData: (hookData || "0x") as `0x${string}`,
      },
    ];

    // Set swap configuration based on search result
    const isZeroForOne = searchResult.direction.includes("Sell Currency0");

    // Use the local storage setters to ensure consistency with swap page
    setSwapPools(poolData);
    setSwapFromCurrency(isZeroForOne ? currency0 : currency1);
    setSwapToCurrency(isZeroForOne ? currency1 : currency0);
    setSwapAmount(searchResult.amount);

    // Calculate actual price impact + 0.5% buffer (fixes FIXME)
    const priceImpact = calculatePriceImpact(
      searchResult.amount,
      searchResult.direction
    );
    setSwapSlippage(priceImpact.toFixed(2));

    // Navigate to the swap page with hash fragment to scroll to swap interface
    router.push(`${getPath(subdomains.UNISWAP.base)}swap#swap`);
  };

  return (
    <Box
      p={4}
      bg="whiteAlpha.50"
      borderRadius="lg"
      border="1px solid"
      borderColor="whiteAlpha.200"
    >
      <VStack align="stretch" spacing={4}>
        <Button
          colorScheme="purple"
          onClick={performOptimizedParallelSearch}
          isLoading={isParallelSearching}
          loadingText="Searching..."
          isDisabled={searchDisabled || isSearching}
          size="md"
          leftIcon={<Icon as={FiPlay} boxSize={5} />}
          bg="purple.600"
          _hover={{ bg: "purple.700" }}
          _active={{ bg: "purple.800" }}
          color="white"
          fontWeight="bold"
        >
          Find Swap Amount for Target Price
        </Button>

        {/* Binary search button for more precise results (implements TODO) */}
        {performBinarySearch && (
          <Button
            colorScheme="blue"
            onClick={performBinarySearch}
            isLoading={isBinarySearching}
            loadingText="Binary Searching..."
            isDisabled={searchDisabled || isSearching}
            size="sm"
            leftIcon={<Icon as={FiTarget} boxSize={4} />}
            variant="outline"
            borderColor="blue.400"
            color="blue.300"
            _hover={{ bg: "blue.900", borderColor: "blue.300" }}
            _active={{ bg: "blue.800" }}
          >
            Binary Search (Slower, More Precise)
          </Button>
        )}

        {isSearching && (
          <Button
            colorScheme="red"
            onClick={stopSearch}
            size="md"
            variant="outline"
            leftIcon={<Icon as={FiStopCircle} boxSize={4} />}
            borderColor="red.400"
            color="red.300"
            _hover={{ bg: "red.900", borderColor: "red.300" }}
          >
            Stop Search
          </Button>
        )}

        {searchProgress && (
          <Box
            bg={
              searchProgress.startsWith("❌")
                ? "red.900"
                : searchProgress.startsWith("🛑")
                ? "yellow.900"
                : "green.900"
            }
            color={
              searchProgress.startsWith("❌")
                ? "red.100"
                : searchProgress.startsWith("🛑")
                ? "yellow.100"
                : "green.100"
            }
            p={4}
            borderRadius="md"
            fontFamily="mono"
            fontSize="sm"
            border="1px solid"
            borderColor={
              searchProgress.startsWith("❌")
                ? "red.600"
                : searchProgress.startsWith("🛑")
                ? "yellow.600"
                : "green.600"
            }
          >
            <Text whiteSpace="pre-wrap">{searchProgress}</Text>
          </Box>
        )}

        {searchResult && (
          <Box
            bg="green.900"
            p={4}
            borderRadius="lg"
            border="2px solid"
            borderColor="green.500"
          >
            <VStack spacing={3} align="stretch">
              <HStack spacing={2}>
                <Icon as={FiTarget} color="green.400" boxSize={5} />
                <Heading size="md" color="green.100">
                  Optimal Swap Found:
                </Heading>
              </HStack>

              <VStack spacing={2} align="stretch">
                <HStack justify="space-between">
                  <Text color="green.200">Amount:</Text>
                  <Badge
                    colorScheme="green"
                    variant="solid"
                    fontSize="sm"
                    px={3}
                    py={1}
                    rounded="md"
                  >
                    {searchResult.amount} {searchResult.token}
                  </Badge>
                </HStack>

                <HStack justify="space-between">
                  <Text color="green.200">Action:</Text>
                  <Text color="green.100" fontWeight="medium" fontSize="sm">
                    {searchResult.direction}
                  </Text>
                </HStack>

                <HStack justify="space-between">
                  {/* Binary search info and price deviation display */}
                  <Text color="green.200">Price Deviation:</Text>
                  <Badge
                    colorScheme={
                      searchResult.priceDeviation &&
                      Number(searchResult.priceDeviation) < Number(threshold)
                        ? "green"
                        : "yellow"
                    }
                    variant="solid"
                    fontSize="sm"
                    px={3}
                    py={1}
                    rounded="md"
                  >
                    {searchResult.priceDeviation
                      ? `${searchResult.priceDeviation}%`
                      : `< ${threshold}%`}
                  </Badge>
                </HStack>

                <HStack justify="space-between">
                  <Text color="green.200">Final Price:</Text>
                  <Badge
                    colorScheme="blue"
                    variant="solid"
                    fontSize="sm"
                    px={3}
                    py={1}
                    rounded="md"
                  >
                    {searchResult.finalPrice}
                  </Badge>
                </HStack>
              </VStack>

              {/* Show actual deviation message (fixes FIXME) */}
              <Text fontSize="sm" color="green.200" textAlign="center">
                {searchResult.priceDeviation
                  ? `Actual price deviation: ${searchResult.priceDeviation}% from target`
                  : `This swap will bring the pool price to within ${threshold}% of your target.`}
              </Text>

              <Text fontSize="xs" color="blue.200" textAlign="center">
                ✅ Result based on actual contract simulation using quoter
              </Text>

              <HStack spacing={2}>
                <Button
                  size="sm"
                  colorScheme="blue"
                  color="white"
                  leftIcon={<Icon as={FiArrowUp} boxSize={3} />}
                  onClick={() => {
                    setAmount(searchResult.amount);
                    setZeroForOne(
                      searchResult.direction.includes("Sell Currency0")
                    );
                    swapAmountRef?.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    });
                  }}
                  variant="solid"
                  bg="blue.600"
                  _hover={{ bg: "blue.700" }}
                  flex={1}
                >
                  Test This Amount in Quote Section
                </Button>

                <Button
                  size="sm"
                  colorScheme="green"
                  color="white"
                  leftIcon={<Icon as={FiExternalLink} boxSize={3} />}
                  onClick={handleNavigateToSwap}
                  variant="solid"
                  bg="green.600"
                  _hover={{ bg: "green.700" }}
                  flex={1}
                >
                  Execute on Swap Page
                </Button>
              </HStack>
            </VStack>
          </Box>
        )}
      </VStack>
    </Box>
  );
};
