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
import { FiPlay, FiStopCircle, FiTarget, FiArrowUp } from "react-icons/fi";
import { SearchResult } from "../hooks/useTargetPriceCalculator"; // Assuming SearchResult type is exported

interface TargetPriceSwapControlsProps {
  performOptimizedParallelSearch: () => Promise<void>;
  stopSearch: () => void;
  isSearching: boolean;
  searchProgress: string;
  searchResult: SearchResult | null;
  searchDisabled: boolean;
  setAmount: (value: string) => void;
  setZeroForOne: (value: boolean | ((prev: boolean) => boolean)) => void;
  swapAmountRef?: React.RefObject<HTMLElement>; // Generic ref for flexibility
  threshold: string; // For displaying in the result message
}

export const TargetPriceSwapControls: React.FC<
  TargetPriceSwapControlsProps
> = ({
  performOptimizedParallelSearch,
  stopSearch,
  isSearching,
  searchProgress,
  searchResult,
  searchDisabled,
  setAmount,
  setZeroForOne,
  swapAmountRef,
  threshold,
}) => {
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
          isLoading={isSearching}
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

              <Text fontSize="sm" color="green.200" textAlign="center">
                This swap will bring the pool price to within {threshold}% of
                your target.
              </Text>

              <Text fontSize="xs" color="blue.200" textAlign="center">
                ✅ Result based on actual contract simulation using quoter
              </Text>

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
              >
                Test This Amount in Quote Section
              </Button>
            </VStack>
          </Box>
        )}
      </VStack>
    </Box>
  );
};
