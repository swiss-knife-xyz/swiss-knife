"use client";

import React from "react";
import {
  Box,
  Button,
  Heading,
  HStack,
  Input,
  Text,
  VStack,
  Icon,
} from "@chakra-ui/react";
import { FiRefreshCw, FiTrendingUp } from "react-icons/fi";
import { isValidNumericInput } from "../lib/utils";

interface SwapQuoteFormProps {
  amount: string;
  setAmount: (value: string) => void;
  zeroForOne: boolean;
  setZeroForOne: (value: boolean | ((prev: boolean) => boolean)) => void;
  currency0Symbol?: string;
  currency1Symbol?: string;
  fetchQuoteResult: () => void;
  isQuoteLoading: boolean;
  quoteDisabled: boolean;
  swapAmountRef?: React.RefObject<HTMLDivElement>;
}

export const SwapQuoteForm: React.FC<SwapQuoteFormProps> = ({
  amount,
  setAmount,
  zeroForOne,
  setZeroForOne,
  currency0Symbol,
  currency1Symbol,
  fetchQuoteResult,
  isQuoteLoading,
  quoteDisabled,
  swapAmountRef,
}) => {
  return (
    <VStack spacing={4} align="stretch">
      {/* Swap Amount Section */}
      <Box ref={swapAmountRef}>
        <Text color="gray.400" mb={2}>
          Swap Amount:
        </Text>
        <HStack spacing={2}>
          <Input
            value={amount}
            onChange={(e) => {
              if (isValidNumericInput(e.target.value)) {
                setAmount(e.target.value);
              }
            }}
            placeholder="Enter amount to quote"
            bg="whiteAlpha.50"
            border="1px solid"
            borderColor="whiteAlpha.200"
            _hover={{ borderColor: "whiteAlpha.300" }}
            _focus={{
              borderColor: "blue.400",
              boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
            }}
            color="gray.100"
            _placeholder={{ color: "gray.500" }}
            rounded="md"
          />
          <Button
            colorScheme="blue"
            variant="outline"
            onClick={() => setZeroForOne((prev) => !prev)}
            minW="80px"
            borderColor="blue.400"
            color="blue.300"
            _hover={{ bg: "blue.900", borderColor: "blue.300" }}
          >
            {zeroForOne
              ? currency0Symbol || "Currency0"
              : currency1Symbol || "Currency1"}
          </Button>
        </HStack>
      </Box>

      {/* Quote Result Section */}
      <Box mt={3}>
        <HStack spacing={4} align="center" mb={3}>
          <HStack spacing={2} align="center">
            <Icon as={FiTrendingUp} color="green.400" boxSize={6} />
            <Heading size="md" color="gray.300">
              Quote Result
            </Heading>
          </HStack>

          <Button
            colorScheme="green"
            onClick={fetchQuoteResult}
            isLoading={isQuoteLoading}
            loadingText="Fetching..."
            isDisabled={quoteDisabled}
            leftIcon={<Icon as={FiRefreshCw} boxSize={3} />}
            size="xs"
          >
            Fetch Quote Result
          </Button>
        </HStack>
      </Box>
    </VStack>
  );
};
