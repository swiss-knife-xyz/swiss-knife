"use client";

import {
  Box,
  Button,
  Heading,
  Text,
  HStack,
  Badge,
  Flex,
  Icon,
} from "@chakra-ui/react";
import { FiRefreshCw, FiTrendingUp, FiActivity } from "react-icons/fi";
import { formatNumberAvoidingScientificNotation } from "../lib/utils";

interface CurrentPoolPriceDisplayProps {
  fetchCurrentPrices: () => void;
  isSlot0Loading: boolean;
  poolInteractionDisabled: boolean;
  slot0Tick?: number;
  currentZeroForOnePrice?: string;
  currentOneForZeroPrice?: string;
  currency0Symbol?: string;
  currency1Symbol?: string;
}

export const CurrentPoolPriceDisplay: React.FC<
  CurrentPoolPriceDisplayProps
> = ({
  fetchCurrentPrices,
  isSlot0Loading,
  poolInteractionDisabled,
  slot0Tick,
  currentZeroForOnePrice,
  currentOneForZeroPrice,
  currency0Symbol,
  currency1Symbol,
}) => {
  return (
    <Box>
      {/* Header with Button */}
      <HStack spacing={4} align="center" mb={3}>
        <HStack spacing={2} align="center">
          <Icon as={FiTrendingUp} color="blue.400" boxSize={6} />
          <Heading size="md" color="gray.300">
            Current Pool Prices
          </Heading>
        </HStack>

        <Button
          colorScheme="blue"
          onClick={fetchCurrentPrices}
          isLoading={isSlot0Loading}
          loadingText="Fetching..."
          isDisabled={poolInteractionDisabled}
          leftIcon={<Icon as={FiRefreshCw} boxSize={3} />}
          size="xs"
        >
          Fetch
        </Button>
      </HStack>

      {/* Current Tick */}
      {slot0Tick !== undefined && (
        <HStack spacing={2} align="center" mb={3}>
          <Icon as={FiActivity} color="gray.400" boxSize={3} />
          <Text fontSize="sm" color="gray.400">
            Current Tick:
          </Text>
          <Badge colorScheme="blue" fontSize="xs" px={2} py={0.5}>
            {slot0Tick}
          </Badge>
        </HStack>
      )}

      {/* Price Display */}
      {(currentZeroForOnePrice || currentOneForZeroPrice) && (
        <HStack spacing={3} align="stretch" mt={2}>
          {currentZeroForOnePrice && (
            <Flex
              justify="space-between"
              align="center"
              bg="whiteAlpha.50"
              px={3}
              py={2}
              borderRadius="md"
              border="1px solid"
              borderColor="whiteAlpha.100"
              flex={1}
            >
              <Text color="gray.300">1 {currency0Symbol || "Currency0"} =</Text>
              <HStack spacing={1}>
                <Text fontWeight="bold" color="blue.300">
                  {formatNumberAvoidingScientificNotation(
                    currentZeroForOnePrice
                  )}
                </Text>
                <Text fontSize="sm" color="gray.400">
                  {currency1Symbol || "Currency1"}
                </Text>
              </HStack>
            </Flex>
          )}

          {currentOneForZeroPrice && (
            <Flex
              justify="space-between"
              align="center"
              bg="whiteAlpha.50"
              px={3}
              py={2}
              borderRadius="md"
              border="1px solid"
              borderColor="whiteAlpha.100"
              flex={1}
            >
              <Text color="gray.300">1 {currency1Symbol || "Currency1"} =</Text>
              <HStack spacing={1}>
                <Text fontWeight="bold" color="green.300">
                  {formatNumberAvoidingScientificNotation(
                    currentOneForZeroPrice
                  )}
                </Text>
                <Text fontSize="sm" color="gray.400">
                  {currency0Symbol || "Currency0"}
                </Text>
              </HStack>
            </Flex>
          )}
        </HStack>
      )}
    </Box>
  );
};
