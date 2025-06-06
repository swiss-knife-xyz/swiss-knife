"use client";

import React from "react";
import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Icon,
  Badge,
} from "@chakra-ui/react";
import { FiTrendingUp, FiTrendingDown, FiBarChart } from "react-icons/fi";

interface PriceAnalysisDisplayProps {
  targetPrice?: string;
  currentZeroForOnePrice?: string;
  currentOneForZeroPrice?: string;
  targetPriceDirection: boolean;
  currency0Symbol?: string;
  currency1Symbol?: string;
}

export const PriceAnalysisDisplay: React.FC<PriceAnalysisDisplayProps> = ({
  targetPrice,
  currentZeroForOnePrice,
  currentOneForZeroPrice,
  targetPriceDirection,
  currency0Symbol,
  currency1Symbol,
}) => {
  if (
    !targetPrice ||
    !currentZeroForOnePrice ||
    !currentOneForZeroPrice ||
    isNaN(Number(targetPrice)) ||
    isNaN(Number(currentZeroForOnePrice)) ||
    isNaN(Number(currentOneForZeroPrice))
  ) {
    return null; // Don't render if essential data is missing or invalid
  }

  const currentPriceForDirection = targetPriceDirection
    ? Number(currentZeroForOnePrice)
    : Number(currentOneForZeroPrice);
  const targetPriceNum = Number(targetPrice);

  const priceChangeNeededPercent = (
    ((targetPriceNum - currentPriceForDirection) / currentPriceForDirection) *
    100
  ).toFixed(2);

  const priceIncrease = targetPriceNum > currentPriceForDirection;
  const directionText = priceIncrease
    ? "Price needs to increase"
    : "Price needs to decrease";
  const directionColor = priceIncrease ? "green.400" : "red.400";
  const directionIcon = priceIncrease ? FiTrendingUp : FiTrendingDown;

  const pairLabel = targetPriceDirection
    ? `${currency1Symbol || "Currency1"} per ${currency0Symbol || "Currency0"}`
    : `${currency0Symbol || "Currency0"} per ${currency1Symbol || "Currency1"}`;

  return (
    <Box
      p={4}
      bg="whiteAlpha.50"
      borderRadius="lg"
      border="1px solid"
      borderColor="whiteAlpha.200"
    >
      <VStack spacing={4} align="stretch">
        {/* Header */}
        <HStack spacing={2}>
          <Icon as={FiBarChart} color="purple.400" boxSize={5} />
          <Heading size="md" color="gray.200">
            Target Price Analysis:
          </Heading>
        </HStack>

        <VStack spacing={3} align="stretch">
          {/* Current Price */}
          <HStack justify="space-between" spacing={4}>
            <Text color="gray.300" fontSize="sm">
              Current Price ({pairLabel}):
            </Text>
            <Badge
              colorScheme="blue"
              variant="solid"
              fontSize="sm"
              px={3}
              py={1}
              rounded="md"
            >
              {currentPriceForDirection}
            </Badge>
          </HStack>

          {/* Target Price */}
          <HStack justify="space-between" spacing={4}>
            <Text color="gray.300" fontSize="sm">
              Target Price ({pairLabel}):
            </Text>
            <Badge
              colorScheme="purple"
              variant="solid"
              fontSize="sm"
              px={3}
              py={1}
              rounded="md"
            >
              {targetPriceNum}
            </Badge>
          </HStack>

          {/* Price Change Needed */}
          <HStack justify="space-between" spacing={4}>
            <Text color="gray.300" fontSize="sm">
              Price Change Needed:
            </Text>
            <Badge
              colorScheme={priceIncrease ? "green" : "red"}
              variant="solid"
              fontSize="sm"
              px={3}
              py={1}
              rounded="md"
            >
              {priceChangeNeededPercent}%
            </Badge>
          </HStack>

          {/* Direction */}
          <HStack justify="space-between" spacing={4}>
            <HStack spacing={2}>
              <Icon as={directionIcon} color={directionColor} boxSize={4} />
              <Text color="gray.300" fontSize="sm">
                Direction:
              </Text>
            </HStack>
            <Text color={directionColor} fontWeight="medium" fontSize="sm">
              {directionText}
            </Text>
          </HStack>
        </VStack>
      </VStack>
    </Box>
  );
};
