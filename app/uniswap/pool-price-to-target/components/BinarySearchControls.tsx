"use client";

import React from "react";
import { Box, Button, Heading, Text, VStack } from "@chakra-ui/react";
import { SearchResult } from "../hooks/useTargetPriceCalculator";

interface BinarySearchControlsProps {
  performOptimizedParallelSearch: () => Promise<void>;
  stopBinarySearch: () => void;
  isSearching: boolean;
  searchProgress: string;
  searchResult: SearchResult | null;
  binarySearchDisabled: boolean;
  setAmount: (value: string) => void;
  setZeroForOne: (value: boolean | ((prev: boolean) => boolean)) => void;
  swapAmountRef?: React.RefObject<HTMLElement>; // Generic ref for flexibility
  threshold: string; // For displaying in the result message
}

export const BinarySearchControls: React.FC<BinarySearchControlsProps> = ({
  performOptimizedParallelSearch,
  stopBinarySearch,
  isSearching,
  searchProgress,
  searchResult,
  binarySearchDisabled,
  setAmount,
  setZeroForOne,
  swapAmountRef,
  threshold,
}) => {
  return (
    <VStack align="stretch" spacing={4} mt={4}>
      <Button
        colorScheme="purple"
        onClick={performOptimizedParallelSearch}
        isLoading={isSearching}
        loadingText="Searching..."
        isDisabled={binarySearchDisabled || isSearching}
        size="lg"
      >
        🚀 Find Optimal Swap Amount
      </Button>

      <Text fontSize="xs" color="gray.400" textAlign="center">
        💡 Uses parallel testing of multiple amounts for ultra-fast results
      </Text>

      {isSearching && (
        <Button
          colorScheme="red"
          onClick={stopBinarySearch}
          size="md"
          variant="outline"
        >
          🛑 Stop Search
        </Button>
      )}

      {searchProgress && (
        <Box
          bg={
            searchProgress.startsWith("❌")
              ? "red.900"
              : searchProgress.startsWith("🛑")
              ? "yellow.700"
              : "black"
          }
          color={
            searchProgress.startsWith("❌")
              ? "red.100"
              : searchProgress.startsWith("🛑")
              ? "yellow.100"
              : "green.400"
          }
          p={3}
          borderRadius="md"
          fontFamily="mono"
          fontSize="sm"
          border="1px solid"
          borderColor={
            searchProgress.startsWith("❌")
              ? "red.600"
              : searchProgress.startsWith("🛑")
              ? "yellow.500"
              : "green.400"
          }
        >
          <Text whiteSpace="pre-wrap">{searchProgress}</Text>
        </Box>
      )}

      {searchResult && (
        <Box
          bg="green.800"
          color="white"
          p={4}
          borderRadius="md"
          border="2px solid"
          borderColor="green.400"
        >
          <Heading size="sm" mb={2} color="green.100">
            🎯 Optimal Swap Found:
          </Heading>
          <Text>
            <strong>Amount:</strong> {searchResult.amount} {searchResult.token}
          </Text>
          <Text>
            <strong>Action:</strong> {searchResult.direction}
          </Text>
          <Text>
            <strong>Final Price:</strong> {searchResult.finalPrice}
          </Text>
          <Text fontSize="sm" color="green.200" mt={2}>
            This swap will bring the pool price to within {threshold}% of your
            target.
          </Text>
          <Text fontSize="xs" color="blue.200" mt={2}>
            ✅ This result is based on actual contract simulation using the
            quoter.
          </Text>
          <Button
            size="sm"
            mt={3}
            colorScheme="blue"
            onClick={() => {
              setAmount(searchResult.amount);
              setZeroForOne(searchResult.direction.includes("Sell Currency0"));
              swapAmountRef?.current?.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
            }}
          >
            Test This Amount in Quote Section
          </Button>
        </Box>
      )}
    </VStack>
  );
};
