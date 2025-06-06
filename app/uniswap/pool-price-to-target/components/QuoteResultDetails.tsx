"use client";

import React from "react";
import {
  Box,
  Button,
  HStack,
  Text,
  VStack,
  Flex,
  Badge,
  Icon,
} from "@chakra-ui/react";
import { FiArrowRight, FiTrendingUp, FiActivity } from "react-icons/fi";
import { BiGasPump } from "react-icons/bi";
import {
  calculateEffectivePrice,
  calculatePriceImpact,
  calculatePriceAfterSwap,
  calculatePriceChangePercentage,
  formatNumberAvoidingScientificNotation,
} from "../lib/utils";

interface QuoteResultDetailsProps {
  quoteResultData?: readonly [bigint, bigint, number, bigint];
  quoteError?: Error | null;
  amount: string;
  zeroForOne: boolean;
  currency0Symbol?: string;
  currency1Symbol?: string;
  currency0Decimals?: number;
  currency1Decimals?: number;
  effectivePriceDirection: boolean;
  setEffectivePriceDirection: (value: boolean) => void;
  priceAfterSwapDirection: boolean;
  setPriceAfterSwapDirection: (value: boolean) => void;
  currentZeroForOnePrice?: string;
  currentOneForZeroPrice?: string;
}

export const QuoteResultDetails: React.FC<QuoteResultDetailsProps> = ({
  quoteResultData,
  quoteError,
  amount,
  zeroForOne,
  currency0Symbol,
  currency1Symbol,
  currency0Decimals,
  currency1Decimals,
  effectivePriceDirection,
  setEffectivePriceDirection,
  priceAfterSwapDirection,
  setPriceAfterSwapDirection,
  currentZeroForOnePrice,
  currentOneForZeroPrice,
}) => {
  if (quoteError) {
    return (
      <Box
        mt={3}
        p={3}
        bg="red.900"
        borderRadius="md"
        border="1px solid"
        borderColor="red.600"
        maxW="400px"
        wordBreak="break-word"
      >
        <Text color="red.200" fontSize="sm">
          Error: {quoteError.message}
        </Text>
      </Box>
    );
  }

  if (!quoteResultData) {
    return null;
  }

  const [amountOut, sqrtPriceX96After, tickAfter, gasEstimate] =
    quoteResultData;

  const outputAmountFormatted =
    currency0Decimals && currency1Decimals
      ? Math.abs(
          Number(amountOut) /
            Math.pow(10, zeroForOne ? currency1Decimals : currency0Decimals)
        )
      : "N/A";

  const effectivePriceStr =
    currency0Decimals && currency1Decimals
      ? calculateEffectivePrice(
          amount,
          amountOut,
          zeroForOne,
          currency0Decimals,
          currency1Decimals,
          effectivePriceDirection
        )
      : "Loading...";

  const priceImpactResult =
    currency0Decimals &&
    currency1Decimals &&
    amount &&
    Number(amount) > 0 &&
    currentZeroForOnePrice &&
    currentOneForZeroPrice
      ? calculatePriceImpact(
          amount,
          amountOut,
          zeroForOne,
          currency0Decimals,
          currency1Decimals,
          currentZeroForOnePrice,
          currentOneForZeroPrice
        )
      : null;

  const priceAfterSwapStr =
    currency0Decimals && currency1Decimals
      ? calculatePriceAfterSwap(
          sqrtPriceX96After,
          currency0Decimals,
          currency1Decimals,
          priceAfterSwapDirection
        )
      : "Loading decimals...";

  const priceChangePercentageResult =
    currency0Decimals &&
    currency1Decimals &&
    currentZeroForOnePrice &&
    currentOneForZeroPrice
      ? calculatePriceChangePercentage(
          sqrtPriceX96After,
          currency0Decimals,
          currency1Decimals,
          priceAfterSwapDirection,
          currentZeroForOnePrice,
          currentOneForZeroPrice
        )
      : null;

  return (
    <VStack minW="40rem" spacing={3} align="stretch">
      {/* Input/Output Display */}
      <Flex
        justify="space-between"
        align="center"
        bg="whiteAlpha.50"
        px={3}
        py={2}
        borderRadius="md"
        border="1px solid"
        borderColor="whiteAlpha.100"
      >
        <HStack spacing={2}>
          <Text color="gray.300">
            {amount} {zeroForOne ? currency0Symbol : currency1Symbol}
          </Text>
          <Icon as={FiArrowRight} color="gray.400" boxSize={4} />
          <Text color="gray.300" fontWeight="bold">
            {outputAmountFormatted}{" "}
            {zeroForOne ? currency1Symbol : currency0Symbol}
          </Text>
        </HStack>
      </Flex>

      {/* Price Information */}
      <VStack spacing={2} align="stretch">
        {/* Effective Price */}
        <HStack justify="space-between" spacing={2}>
          <HStack spacing={2}>
            <Icon as={FiTrendingUp} color="blue.400" boxSize={4} />
            <Text color="blue.300">Effective Swap Price:</Text>
          </HStack>
          <HStack spacing={2}>
            <Text color="blue.300" fontWeight="bold">
              {effectivePriceStr === "N/A" || effectivePriceStr === "Loading..."
                ? effectivePriceStr
                : formatNumberAvoidingScientificNotation(effectivePriceStr)}
            </Text>
            {currency0Symbol && currency1Symbol && (
              <Button
                size="xs"
                variant="outline"
                colorScheme="blue"
                onClick={() =>
                  setEffectivePriceDirection(!effectivePriceDirection)
                }
                fontSize="xs"
                px={2}
                py={1}
                minH="auto"
                borderColor="blue.400"
                color="blue.300"
                _hover={{ bg: "blue.900" }}
              >
                {effectivePriceDirection
                  ? `${currency1Symbol} per ${currency0Symbol}`
                  : `${currency0Symbol} per ${currency1Symbol}`}
              </Button>
            )}
            {/* Price Impact */}
            {priceImpactResult && (
              <HStack justify="space-between" spacing={2}>
                <Text fontSize="xs" color="gray.400">
                  {"("}impact:
                </Text>
                <Badge
                  colorScheme={
                    priceImpactResult.color.includes("red")
                      ? "red"
                      : priceImpactResult.color.includes("yellow")
                      ? "yellow"
                      : "green"
                  }
                  fontSize="xs"
                >
                  {priceImpactResult.value}
                </Badge>
                <Text fontSize="xs" color="gray.400">
                  {")"}
                </Text>
              </HStack>
            )}
          </HStack>
        </HStack>

        {/* Price After Swap */}
        <HStack justify="space-between" spacing={2}>
          <HStack spacing={2}>
            <Icon as={FiActivity} color="purple.400" boxSize={4} />
            <Text color="purple.300">Price After Swap:</Text>
          </HStack>
          <HStack spacing={2}>
            <Text color="purple.300" fontWeight="bold">
              {priceAfterSwapStr === "Loading decimals..."
                ? priceAfterSwapStr
                : formatNumberAvoidingScientificNotation(priceAfterSwapStr)}
            </Text>
            {currency0Symbol && currency1Symbol && (
              <Button
                size="xs"
                variant="outline"
                colorScheme="purple"
                onClick={() =>
                  setPriceAfterSwapDirection(!priceAfterSwapDirection)
                }
                fontSize="xs"
                px={2}
                py={1}
                minH="auto"
                borderColor="purple.400"
                color="purple.300"
                _hover={{ bg: "purple.900" }}
              >
                {priceAfterSwapDirection
                  ? `${currency1Symbol} per ${currency0Symbol}`
                  : `${currency0Symbol} per ${currency1Symbol}`}
              </Button>
            )}
            {/* Price Change Percentage */}
            {priceChangePercentageResult && (
              <HStack justify="space-between" spacing={2}>
                <Text fontSize="xs" color="gray.400">
                  {"("}change:
                </Text>
                <Badge
                  colorScheme={
                    priceChangePercentageResult.value.startsWith("-")
                      ? "red"
                      : "green"
                  }
                  fontSize="xs"
                >
                  {priceChangePercentageResult.value}
                </Badge>
                <Text fontSize="xs" color="gray.400">
                  {")"}
                </Text>
              </HStack>
            )}
          </HStack>
        </HStack>
      </VStack>

      {/* Additional Info */}
      <HStack justify="space-between" spacing={4}>
        <HStack spacing={2}>
          <Icon as={FiActivity} color="gray.400" boxSize={4} />
          <Text color="gray.400">After Swap Tick:</Text>
          <Badge colorScheme="blue" fontSize="xs">
            {Number(tickAfter)}
          </Badge>
        </HStack>
        <HStack spacing={2}>
          <Icon as={BiGasPump} color="yellow.400" boxSize={4} />
          <Text color="gray.400">Gas:</Text>
          <Badge colorScheme="yellow" fontSize="xs">
            {Number(gasEstimate).toLocaleString()}
          </Badge>
        </HStack>
      </HStack>
    </VStack>
  );
};
