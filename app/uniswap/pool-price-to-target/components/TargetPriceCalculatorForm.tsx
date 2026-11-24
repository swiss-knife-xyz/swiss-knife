"use client";

import React from "react";
import {
  Box,
  Button,
  Heading,
  Input,
  InputGroup,
  InputRightAddon,
  VStack,
  HStack,
  Text,
  Icon,
  Badge,
} from "@chakra-ui/react";
import { FiTarget, FiPercent, FiSearch, FiSettings } from "react-icons/fi";
import { isValidNumericInput } from "../lib/utils";

interface TargetPriceCalculatorFormProps {
  targetPrice: string;
  setTargetPrice: (value: string) => void;
  targetPriceDirection: boolean;
  setTargetPriceDirection: (
    value: boolean | ((prev: boolean) => boolean)
  ) => void;
  threshold: string;
  setThreshold: (value: string) => void;
  searchLow: string;
  setSearchLow: (value: string) => void;
  searchHigh: string;
  setSearchHigh: (value: string) => void;
  maxIterations: number;
  setMaxIterations: (value: number | ((prev: number) => number)) => void;
  currency0Symbol?: string;
  currency1Symbol?: string;
  searchRangeTokenSymbol: string; // Calculated in parent and passed down
}

export const TargetPriceCalculatorForm: React.FC<
  TargetPriceCalculatorFormProps
> = ({
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
  currency0Symbol,
  currency1Symbol,
  searchRangeTokenSymbol,
}) => {
  const inputStyles = {
    bg: "whiteAlpha.50",
    border: "1px solid",
    borderColor: "whiteAlpha.200",
    _hover: { borderColor: "whiteAlpha.300" },
    _focus: {
      borderColor: "blue.400",
      boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
    },
    color: "gray.100",
    _placeholder: { color: "gray.500" },
    rounded: "md",
  };

  return (
    <Box
      p={4}
      bg="whiteAlpha.50"
      borderRadius="lg"
      border="1px solid"
      borderColor="whiteAlpha.200"
    >
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <HStack spacing={2}>
          <Icon as={FiTarget} color="purple.400" boxSize={5} />
          <Heading size="md" color="gray.200">
            Target Price Calculator:
          </Heading>
        </HStack>

        {/* Target Price */}
        <Box>
          <HStack spacing={2} mb={2}>
            <Icon as={FiTarget} color="blue.400" boxSize={4} />
            <Text color="gray.300" fontSize="sm" fontWeight="medium">
              Target Price
            </Text>
          </HStack>
          <InputGroup>
            <Input
              {...inputStyles}
              roundedRight={0}
              value={targetPrice}
              onChange={(e) => {
                if (isValidNumericInput(e.target.value)) {
                  setTargetPrice(e.target.value);
                }
              }}
              placeholder="Enter target price (e.g., 2500)"
            />
            <Button
              fontSize={"sm"}
              colorScheme="blue"
              variant="outline"
              onClick={() => setTargetPriceDirection((prev) => !prev)}
              borderLeftRadius={0}
              borderColor="blue.400"
              color="blue.300"
              _hover={{ bg: "blue.900", borderColor: "blue.300" }}
              px={4}
            >
              {targetPriceDirection
                ? `${currency1Symbol || "Curr1"} per ${
                    currency0Symbol || "Curr0"
                  }`
                : `${currency0Symbol || "Curr0"} per ${
                    currency1Symbol || "Curr1"
                  }`}
            </Button>
          </InputGroup>
        </Box>

        {/* Price Threshold */}
        <Box>
          <HStack spacing={2} mb={2}>
            <Icon as={FiPercent} color="green.400" boxSize={4} />
            <Text color="gray.300" fontSize="sm" fontWeight="medium">
              Price Threshold (%)
            </Text>
          </HStack>
          <Input
            {...inputStyles}
            value={threshold}
            onChange={(e) => {
              if (isValidNumericInput(e.target.value)) {
                setThreshold(e.target.value);
              }
            }}
            placeholder="e.g., 0.1 for 0.1% tolerance"
          />
        </Box>

        {/* Search Range */}
        <VStack spacing={4} align="stretch">
          <HStack spacing={4}>
            <Box flex={1}>
              <HStack spacing={2} mb={2}>
                <Icon as={FiSearch} color="orange.400" boxSize={4} />
                <Text color="gray.300" fontSize="sm" fontWeight="medium">
                  Search Range Low
                </Text>
              </HStack>
              <InputGroup>
                <Input
                  {...inputStyles}
                  value={searchLow}
                  onChange={(e) => {
                    if (isValidNumericInput(e.target.value)) {
                      setSearchLow(e.target.value);
                    }
                  }}
                  placeholder="e.g., 0.001"
                />
                {searchRangeTokenSymbol && (
                  <InputRightAddon
                    bg="orange.900"
                    borderColor="orange.600"
                    px={3}
                    py={2}
                  >
                    <Badge
                      colorScheme="orange"
                      variant="solid"
                      fontSize="xs"
                      fontWeight="bold"
                    >
                      {searchRangeTokenSymbol}
                    </Badge>
                  </InputRightAddon>
                )}
              </InputGroup>
            </Box>

            <Box flex={1}>
              <HStack spacing={2} mb={2}>
                <Icon as={FiSearch} color="cyan.400" boxSize={4} />
                <Text color="gray.300" fontSize="sm" fontWeight="medium">
                  Search Range High
                </Text>
              </HStack>
              <InputGroup>
                <Input
                  {...inputStyles}
                  value={searchHigh}
                  onChange={(e) => {
                    if (isValidNumericInput(e.target.value)) {
                      setSearchHigh(e.target.value);
                    }
                  }}
                  placeholder="e.g., 10"
                />
                {searchRangeTokenSymbol && (
                  <InputRightAddon
                    bg="cyan.900"
                    borderColor="cyan.600"
                    px={3}
                    py={2}
                  >
                    <Badge
                      colorScheme="cyan"
                      variant="solid"
                      fontSize="xs"
                      fontWeight="bold"
                    >
                      {searchRangeTokenSymbol}
                    </Badge>
                  </InputRightAddon>
                )}
              </InputGroup>
            </Box>
          </HStack>
        </VStack>

        {/* Max Iterations */}
        <Box>
          <HStack spacing={2} mb={2}>
            <Icon as={FiSettings} color="pink.400" boxSize={4} />
            <Text color="gray.300" fontSize="sm" fontWeight="medium">
              Max Iterations
            </Text>
          </HStack>
          <Input
            {...inputStyles}
            value={maxIterations}
            onChange={(e) => {
              if (isValidNumericInput(e.target.value)) {
                setMaxIterations(Number(e.target.value) || 50);
              }
            }}
            placeholder="e.g., 50"
            type="number"
          />
          <Text fontSize="xs" color="gray.400" mt={2}>
            Maximum number of binary search iterations (higher = more precise
            but slower)
          </Text>
        </Box>
      </VStack>
    </Box>
  );
};
