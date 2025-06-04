import React from "react";
import {
  Box,
  Button,
  Heading,
  HStack,
  Icon,
  IconButton,
  Input,
  Select,
  Text,
  VStack,
  Spinner,
} from "@chakra-ui/react";
import { Address, formatUnits, parseUnits } from "viem";
import { FiArrowRight } from "react-icons/fi";
import { HiArrowsUpDown } from "react-icons/hi2";
import {
  formatCurrencyDisplay,
  isValidNumericInput,
  formatTokenBalance,
} from "../lib/utils";
import { useTokenBalances } from "../hooks/useTokenBalances";

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
  userAddress?: Address;
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
  userAddress,
}) => {
  // Fetch token balances using the new hook
  const {
    fromBalance,
    toBalance,
    isLoading: isLoadingBalances,
  } = useTokenBalances(userAddress, fromCurrency, toCurrency);

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

  const getFormattedBalance = (
    balance?: bigint,
    currency?: Address
  ): string => {
    if (!currency) return "0";
    const info = currencyInfoMap.get(currency);
    return formatTokenBalance(balance, info?.decimals, info?.symbol);
  };

  // Check if the entered amount exceeds the user's balance
  const checkBalanceExceeded = (): boolean => {
    if (!swapAmount || !fromBalance || !fromCurrency) return false;

    try {
      const info = currencyInfoMap.get(fromCurrency);
      const decimals = info?.decimals || 18;
      const amountInWei = parseUnits(swapAmount, decimals);
      return amountInWei > fromBalance;
    } catch {
      // If parsing fails, don't show balance exceeded error
      return false;
    }
  };

  const isBalanceExceeded = checkBalanceExceeded();

  // Helper function to get max available balance as string
  const getMaxBalance = (): string => {
    if (!fromBalance || !fromCurrency) return "0";
    const info = currencyInfoMap.get(fromCurrency);
    const decimals = info?.decimals || 18;
    const maxAmount = formatUnits(fromBalance, decimals);
    return maxAmount;
  };

  const handleMaxClick = () => {
    const maxAmount = getMaxBalance();
    setSwapAmount(maxAmount);
  };

  // Check if we have exactly 2 currencies for simplified UI
  const hasExactlyTwoCurrencies = availableCurrencies.length === 2;

  return (
    <Box
      p={3}
      bg="whiteAlpha.50"
      borderRadius="xl"
      border="1px solid"
      borderColor="whiteAlpha.200"
      maxW="480px"
      mx="auto"
    >
      <VStack spacing={1} align="stretch">
        <HStack spacing={2} align="center" mb={3}>
          <Icon as={FiArrowRight} color="blue.400" boxSize={5} />
          <Heading size="md" color="gray.300">
            Swap Interface
          </Heading>
        </HStack>

        {hasExactlyTwoCurrencies ? (
          // Simplified UI for exactly 2 currencies
          <>
            {/* From Token - Compact */}
            <Box
              p={4}
              bg="whiteAlpha.30"
              borderRadius="lg"
              border="1px solid"
              borderColor="whiteAlpha.100"
            >
              <HStack justify="space-between" align="start" mb={2}>
                <Text color="gray.400" fontSize="sm" fontWeight="medium">
                  Sell
                </Text>
                <HStack spacing={2}>
                  <Text
                    color="gray.400"
                    fontSize="sm"
                    fontWeight="medium"
                    cursor="pointer"
                    _hover={{ color: "blue.400" }}
                    onClick={handleMaxClick}
                  >
                    {isLoadingBalances ? (
                      <Spinner size="xs" />
                    ) : (
                      `${getFormattedBalance(fromBalance, fromCurrency)} (Max)`
                    )}
                  </Text>
                </HStack>
              </HStack>
              <HStack spacing={3} align="center">
                <Box flex={1}>
                  <Input
                    placeholder="0.01"
                    value={swapAmount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    variant="unstyled"
                    color={isBalanceExceeded ? "red.300" : "gray.100"}
                    _placeholder={{ color: "gray.500" }}
                    fontSize="2xl"
                    fontWeight="medium"
                    borderBottom={isBalanceExceeded ? "2px solid" : "none"}
                    borderColor={isBalanceExceeded ? "red.400" : "transparent"}
                  />
                  {isBalanceExceeded && (
                    <Text color="red.400" fontSize="xs" mt={1}>
                      Insufficient balance
                    </Text>
                  )}
                </Box>
                <Box
                  px={3}
                  py={2}
                  bg="whiteAlpha.100"
                  borderRadius="full"
                  border="1px solid"
                  borderColor="whiteAlpha.200"
                >
                  <Text color="blue.400" fontWeight="bold" fontSize="sm">
                    {getCurrencyDisplayName(fromCurrency)}
                  </Text>
                </Box>
              </HStack>
            </Box>

            {/* Swap Button - More Integrated */}
            <Box position="relative" py={1}>
              <Box
                position="absolute"
                left="50%"
                top="50%"
                transform="translate(-50%, -50%)"
                zIndex={2}
              >
                <IconButton
                  aria-label="Swap currencies"
                  icon={<HiArrowsUpDown />}
                  size="sm"
                  bg="gray.800"
                  border="2px solid"
                  borderColor="whiteAlpha.200"
                  borderRadius="lg"
                  color="gray.300"
                  _hover={{
                    bg: "gray.700",
                    transform: "rotate(180deg)",
                    borderColor: "blue.400",
                  }}
                  transition="all 0.2s ease"
                  onClick={onSwapCurrencies}
                />
              </Box>
            </Box>

            {/* To Token - Compact */}
            <Box
              p={4}
              bg="whiteAlpha.30"
              borderRadius="lg"
              border="1px solid"
              borderColor="whiteAlpha.100"
            >
              <HStack justify="space-between" align="start" mb={2}>
                <Text color="gray.400" fontSize="sm" fontWeight="medium">
                  Buy
                </Text>
                <Text color="gray.400" fontSize="sm">
                  {isLoadingBalances ? (
                    <Spinner size="xs" />
                  ) : (
                    getFormattedBalance(toBalance, toCurrency)
                  )}
                </Text>
              </HStack>
              <HStack spacing={3} align="center">
                <Box flex={1} position="relative">
                  <Input
                    placeholder="26.2125"
                    value={quotedAmount || ""}
                    readOnly
                    variant="unstyled"
                    color="gray.100"
                    _placeholder={{ color: "gray.500" }}
                    fontSize="2xl"
                    fontWeight="medium"
                  />
                  {isQuoting && (
                    <Box
                      position="absolute"
                      top="50%"
                      left="0"
                      transform="translateY(-50%)"
                    >
                      <Spinner size="md" color="blue.400" />
                    </Box>
                  )}
                </Box>
                <Box
                  px={3}
                  py={2}
                  bg="whiteAlpha.100"
                  borderRadius="full"
                  border="1px solid"
                  borderColor="whiteAlpha.200"
                >
                  <Text color="green.400" fontWeight="bold" fontSize="sm">
                    {getCurrencyDisplayName(toCurrency)}
                  </Text>
                </Box>
              </HStack>
            </Box>
          </>
        ) : (
          // Original dropdown UI but more compact
          <>
            {/* From Token - Compact */}
            <Box
              p={4}
              bg="whiteAlpha.30"
              borderRadius="lg"
              border="1px solid"
              borderColor="whiteAlpha.100"
            >
              <HStack justify="space-between" align="start" mb={2}>
                <Text color="gray.400" fontSize="sm" fontWeight="medium">
                  Sell
                </Text>
                <HStack spacing={2}>
                  <Text
                    color="gray.400"
                    fontSize="sm"
                    fontWeight="medium"
                    cursor="pointer"
                    _hover={{ color: "blue.400" }}
                    onClick={handleMaxClick}
                  >
                    {isLoadingBalances ? (
                      <Spinner size="xs" />
                    ) : (
                      `${getFormattedBalance(fromBalance, fromCurrency)} (Max)`
                    )}
                  </Text>
                </HStack>
              </HStack>
              <HStack spacing={3} align="center">
                <Box flex={1}>
                  <Input
                    placeholder="0.0"
                    value={swapAmount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    variant="unstyled"
                    color={isBalanceExceeded ? "red.300" : "gray.100"}
                    _placeholder={{ color: "gray.500" }}
                    fontSize="xl"
                    fontWeight="medium"
                    borderBottom={isBalanceExceeded ? "2px solid" : "none"}
                    borderColor={isBalanceExceeded ? "red.400" : "transparent"}
                  />
                  {isBalanceExceeded && (
                    <Text color="red.400" fontSize="xs" mt={1}>
                      Insufficient balance
                    </Text>
                  )}
                </Box>
                <Select
                  value={fromCurrency}
                  onChange={(e) => setFromCurrency(e.target.value as Address)}
                  bg="whiteAlpha.100"
                  border="1px solid"
                  borderColor="whiteAlpha.200"
                  borderRadius="full"
                  _hover={{ borderColor: "whiteAlpha.300" }}
                  _focus={{
                    borderColor: "blue.400",
                    boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
                  }}
                  color="gray.100"
                  fontSize="sm"
                  fontWeight="bold"
                  minW="120px"
                >
                  <option value="">Select</option>
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
              </HStack>
            </Box>

            {/* Swap Button - More Integrated */}
            <Box position="relative" py={1}>
              <Box
                position="absolute"
                left="50%"
                top="50%"
                transform="translate(-50%, -50%)"
                zIndex={2}
              >
                <IconButton
                  aria-label="Swap currencies"
                  icon={<HiArrowsUpDown />}
                  size="sm"
                  bg="gray.800"
                  border="2px solid"
                  borderColor="whiteAlpha.200"
                  borderRadius="lg"
                  color="gray.300"
                  _hover={{
                    bg: "gray.700",
                    transform: "rotate(180deg)",
                    borderColor: "blue.400",
                  }}
                  transition="all 0.2s ease"
                  onClick={onSwapCurrencies}
                  isDisabled={!fromCurrency || !toCurrency}
                />
              </Box>
            </Box>

            {/* To Token - Compact */}
            <Box
              p={4}
              bg="whiteAlpha.30"
              borderRadius="lg"
              border="1px solid"
              borderColor="whiteAlpha.100"
            >
              <HStack justify="space-between" align="start" mb={2}>
                <Text color="gray.400" fontSize="sm" fontWeight="medium">
                  Buy
                </Text>
                <Text color="gray.400" fontSize="sm">
                  {isLoadingBalances ? (
                    <Spinner size="xs" />
                  ) : (
                    getFormattedBalance(toBalance, toCurrency)
                  )}
                </Text>
              </HStack>
              <HStack spacing={3}>
                <Box flex={1} position="relative">
                  <Input
                    placeholder={isQuoting ? "" : "0.0"}
                    value={quotedAmount || ""}
                    readOnly
                    variant="unstyled"
                    color="gray.100"
                    _placeholder={{ color: "gray.500" }}
                    fontSize="xl"
                    fontWeight="medium"
                  />
                  {isQuoting && (
                    <Box
                      position="absolute"
                      top="50%"
                      left="0"
                      transform="translateY(-50%)"
                    >
                      <Spinner size="md" color="blue.400" />
                    </Box>
                  )}
                </Box>
                <Select
                  value={toCurrency}
                  onChange={(e) => setToCurrency(e.target.value as Address)}
                  bg="whiteAlpha.100"
                  border="1px solid"
                  borderColor="whiteAlpha.200"
                  borderRadius="full"
                  _hover={{ borderColor: "whiteAlpha.300" }}
                  _focus={{
                    borderColor: "blue.400",
                    boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
                  }}
                  color="gray.100"
                  fontSize="sm"
                  fontWeight="bold"
                  minW="120px"
                >
                  <option value="">Select</option>
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
              </HStack>
            </Box>
          </>
        )}

        {/* Slippage Settings - More Compact */}
        <HStack
          spacing={2}
          justify="space-between"
          align="center"
          px={2}
          py={2}
        >
          <Text color="gray.400" fontSize="xs" fontWeight="medium">
            Slippage Tolerance (%)
          </Text>
          <Input
            placeholder="0.60"
            value={slippage}
            onChange={(e) => handleSlippageChange(e.target.value)}
            bg="whiteAlpha.100"
            border="1px solid"
            borderColor="whiteAlpha.200"
            borderRadius="md"
            _hover={{ borderColor: "whiteAlpha.300" }}
            _focus={{
              borderColor: "blue.400",
              boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
            }}
            color="gray.100"
            _placeholder={{ color: "gray.500" }}
            w="80px"
            h="32px"
            fontSize="sm"
            textAlign="center"
          />
        </HStack>

        {/* Execute Swap Button - More Prominent */}
        <Button
          colorScheme="blue"
          size="lg"
          width="full"
          onClick={onExecuteSwap}
          isDisabled={isSwapDisabled || isBalanceExceeded}
          isLoading={isSwapLoading}
          loadingText="Swapping..."
          leftIcon={<Icon as={FiArrowRight} boxSize={4} />}
          borderRadius="xl"
          py={6}
          fontSize="md"
          fontWeight="bold"
          mt={2}
          _hover={{
            transform: "translateY(-1px)",
            boxShadow: "0 4px 12px rgba(66, 153, 225, 0.3)",
          }}
          transition="all 0.2s ease"
        >
          {!fromCurrency || !toCurrency
            ? "Select Tokens"
            : !swapAmount || swapAmount === "0"
            ? "Enter Amount"
            : fromCurrency === toCurrency
            ? "Select Different Tokens"
            : isBalanceExceeded
            ? "Insufficient Balance"
            : "Swap Tokens"}
        </Button>
      </VStack>
    </Box>
  );
};
