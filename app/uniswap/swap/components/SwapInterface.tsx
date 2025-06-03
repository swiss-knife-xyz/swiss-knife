import React from "react";
import {
  Box,
  Button,
  Heading,
  HStack,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputRightAddon,
  Select,
  Text,
  VStack,
} from "@chakra-ui/react";
import { Address } from "viem";
import { FiArrowRight, FiArrowDown } from "react-icons/fi";
import { formatCurrencyDisplay, isValidNumericInput } from "../lib/utils";

interface SwapInterfaceProps {
  fromCurrency: Address;
  setFromCurrency: (currency: Address) => void;
  toCurrency: Address;
  setToCurrency: (currency: Address) => void;
  swapAmount: string;
  setSwapAmount: (amount: string) => void;
  slippage: string;
  setSlippage: (slippage: string) => void;
  availableCurrencies: Address[];
  quotedAmount?: string;
  isQuoting?: boolean;
  onSwapCurrencies: () => void;
  onExecuteSwap: () => void;
  isSwapDisabled: boolean;
  isSwapLoading?: boolean;
  currencyInfoMap: Map<Address, { symbol?: string; decimals?: number }>;
}

export const SwapInterface: React.FC<SwapInterfaceProps> = ({
  fromCurrency,
  setFromCurrency,
  toCurrency,
  setToCurrency,
  swapAmount,
  setSwapAmount,
  slippage,
  setSlippage,
  availableCurrencies,
  quotedAmount,
  isQuoting,
  onSwapCurrencies,
  onExecuteSwap,
  isSwapDisabled,
  isSwapLoading,
  currencyInfoMap,
}) => {
  const handleAmountChange = (value: string) => {
    if (isValidNumericInput(value)) {
      setSwapAmount(value);
    }
  };

  const handleSlippageChange = (value: string) => {
    if (isValidNumericInput(value)) {
      setSlippage(value);
    }
  };

  const getCurrencyDisplayName = (currency: Address): string => {
    const info = currencyInfoMap.get(currency);
    if (info?.symbol) {
      return info.symbol;
    }
    return formatCurrencyDisplay(currency);
  };

  // Check if we have exactly 2 currencies for simplified UI
  const hasExactlyTwoCurrencies = availableCurrencies.length === 2;

  return (
    <Box
      p={4}
      bg="whiteAlpha.50"
      borderRadius="lg"
      border="1px solid"
      borderColor="whiteAlpha.200"
    >
      <VStack spacing={6} align="stretch">
        <HStack spacing={2} align="center">
          <Icon as={FiArrowRight} color="blue.400" boxSize={6} />
          <Heading size="md" color="gray.300">
            Swap Interface
          </Heading>
        </HStack>

        {hasExactlyTwoCurrencies ? (
          // Simplified UI for exactly 2 currencies
          <>
            {/* From Token - Simplified */}
            <Box>
              <Text color="gray.400" fontSize="sm" fontWeight="medium" mb={2}>
                From
              </Text>
              <InputGroup>
                <Input
                  placeholder="0.0"
                  value={swapAmount}
                  onChange={(e) => handleAmountChange(e.target.value)}
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
                  fontSize="lg"
                  py={3}
                />
                <InputRightAddon
                  bg="whiteAlpha.100"
                  borderColor="whiteAlpha.200"
                  color="blue.400"
                  fontWeight="bold"
                  fontSize="sm"
                >
                  {getCurrencyDisplayName(fromCurrency)}
                </InputRightAddon>
              </InputGroup>
            </Box>

            {/* Swap Button */}
            <HStack justify="center">
              <IconButton
                aria-label="Swap currencies"
                icon={<FiArrowDown />}
                colorScheme="blue"
                onClick={onSwapCurrencies}
                size="lg"
                borderRadius="full"
              />
            </HStack>

            {/* To Token - Simplified */}
            <Box>
              <Text color="gray.400" fontSize="sm" fontWeight="medium" mb={2}>
                To
              </Text>
              <InputGroup>
                <Input
                  placeholder={isQuoting ? "Getting quote..." : "0.0"}
                  value={quotedAmount || ""}
                  readOnly
                  bg="whiteAlpha.30"
                  border="1px solid"
                  borderColor="whiteAlpha.200"
                  color="gray.100"
                  _placeholder={{ color: "gray.500" }}
                  fontSize="lg"
                  py={3}
                />
                <InputRightAddon
                  bg="whiteAlpha.100"
                  borderColor="whiteAlpha.200"
                  color="green.400"
                  fontWeight="bold"
                  fontSize="sm"
                >
                  {getCurrencyDisplayName(toCurrency)}
                </InputRightAddon>
              </InputGroup>
            </Box>
          </>
        ) : (
          // Original dropdown UI for other cases
          <>
            {/* From Token */}
            <Box>
              <Text color="gray.400" fontSize="sm" fontWeight="medium" mb={2}>
                From
              </Text>
              <HStack spacing={4}>
                <Box flex={1}>
                  <Input
                    placeholder="0.0"
                    value={swapAmount}
                    onChange={(e) => handleAmountChange(e.target.value)}
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
                    fontSize="lg"
                    py={3}
                  />
                </Box>
                <Box minW="200px">
                  <Select
                    value={fromCurrency}
                    onChange={(e) => setFromCurrency(e.target.value as Address)}
                    bg="whiteAlpha.50"
                    border="1px solid"
                    borderColor="whiteAlpha.200"
                    _hover={{ borderColor: "whiteAlpha.300" }}
                    _focus={{
                      borderColor: "blue.400",
                      boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
                    }}
                    color="gray.100"
                  >
                    <option value="">Select token</option>
                    {availableCurrencies.map((currency) => (
                      <option
                        key={currency}
                        value={currency}
                        style={{ backgroundColor: "#2D3748" }}
                      >
                        {getCurrencyDisplayName(currency)}
                      </option>
                    ))}
                  </Select>
                </Box>
              </HStack>
            </Box>

            {/* Swap Button */}
            <HStack justify="center">
              <IconButton
                aria-label="Swap currencies"
                icon={<FiArrowDown />}
                colorScheme="blue"
                onClick={onSwapCurrencies}
                size="lg"
                borderRadius="full"
                isDisabled={!fromCurrency || !toCurrency}
              />
            </HStack>

            {/* To Token */}
            <Box>
              <Text color="gray.400" fontSize="sm" fontWeight="medium" mb={2}>
                To
              </Text>
              <HStack spacing={4}>
                <Box flex={1}>
                  <Input
                    placeholder={isQuoting ? "Getting quote..." : "0.0"}
                    value={quotedAmount || ""}
                    readOnly
                    bg="whiteAlpha.30"
                    border="1px solid"
                    borderColor="whiteAlpha.200"
                    color="gray.100"
                    _placeholder={{ color: "gray.500" }}
                    fontSize="lg"
                    py={3}
                  />
                </Box>
                <Box minW="200px">
                  <Select
                    value={toCurrency}
                    onChange={(e) => setToCurrency(e.target.value as Address)}
                    bg="whiteAlpha.50"
                    border="1px solid"
                    borderColor="whiteAlpha.200"
                    _hover={{ borderColor: "whiteAlpha.300" }}
                    _focus={{
                      borderColor: "blue.400",
                      boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
                    }}
                    color="gray.100"
                  >
                    <option value="">Select token</option>
                    {availableCurrencies.map((currency) => (
                      <option
                        key={currency}
                        value={currency}
                        style={{ backgroundColor: "#2D3748" }}
                      >
                        {getCurrencyDisplayName(currency)}
                      </option>
                    ))}
                  </Select>
                </Box>
              </HStack>
            </Box>
          </>
        )}

        {/* Slippage Settings */}
        <Box>
          <Text color="gray.400" fontSize="sm" fontWeight="medium" mb={2}>
            Slippage Tolerance (%)
          </Text>
          <Input
            placeholder="0.5"
            value={slippage}
            onChange={(e) => handleSlippageChange(e.target.value)}
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
            maxW="200px"
          />
        </Box>

        {/* Execute Swap Button */}
        <Button
          colorScheme="blue"
          size="lg"
          width="full"
          onClick={onExecuteSwap}
          isDisabled={isSwapDisabled}
          isLoading={isSwapLoading}
          loadingText="Swapping..."
          leftIcon={<Icon as={FiArrowRight} boxSize={4} />}
        >
          {!fromCurrency || !toCurrency
            ? "Select Tokens"
            : !swapAmount || swapAmount === "0"
            ? "Enter Amount"
            : fromCurrency === toCurrency
            ? "Select Different Tokens"
            : "Swap Tokens"}
        </Button>
      </VStack>
    </Box>
  );
};
