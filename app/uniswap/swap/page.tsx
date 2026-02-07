"use client";

import { useEffect, useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import {
  Box,
  Button,
  Center,
  Divider,
  Flex,
  Heading,
  HStack,
  Icon,
  Spacer,
  Text,
  VStack,
} from "@chakra-ui/react";
import { Address, parseUnits, zeroAddress } from "viem";
import { useAccount, useSwitchChain } from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { chainIdToChain } from "@/data/common";
import { FiRefreshCw } from "react-icons/fi";

// Import components and hooks
import { PoolConfiguration } from "./components/PoolConfiguration";
import { SwapInterface } from "./components/SwapInterface";
import { useSwapQuote } from "./hooks/useSwapQuote";
import { useSwapTransaction } from "./hooks/useSwapTransaction";
import { useCurrencyInfo } from "./hooks/useCurrencyInfo";

// Import utilities and types
import { PoolWithHookData } from "@/lib/uniswap/types";
import { getAvailableCurrencies } from "./lib/utils";
import { StateViewAddress, Permit2Address } from "../lib/constants";
import { SwapLocalStorageKeys } from "../lib/constants";

const SwapPage = () => {
  const { chain, address } = useAccount();
  const { switchChain } = useSwitchChain();

  const chainNotSupported =
    chain && (!StateViewAddress[chain.id] || !Permit2Address[chain.id]);
  const isChainSupported = !!(
    chain &&
    StateViewAddress[chain.id] &&
    Permit2Address[chain.id]
  );

  // Pool configuration state
  const [pools, setPools] = useLocalStorage<PoolWithHookData[]>(
    SwapLocalStorageKeys.POOLS,
    [
      {
        currency0: zeroAddress,
        currency1: "" as Address,
        fee: 3000,
        tickSpacing: 60,
        hooks: zeroAddress,
        hookData: "0x",
      },
    ]
  );

  // Swap state
  const [fromCurrency, setFromCurrency] = useLocalStorage<Address>(
    SwapLocalStorageKeys.FROM_CURRENCY,
    zeroAddress
  );
  const [toCurrency, setToCurrency] = useLocalStorage<Address>(
    SwapLocalStorageKeys.TO_CURRENCY,
    "" as Address
  );
  const [swapAmount, setSwapAmount] = useLocalStorage<string>(
    SwapLocalStorageKeys.AMOUNT,
    "1"
  );
  const [slippage, setSlippage] = useLocalStorage<string>(
    SwapLocalStorageKeys.SLIPPAGE,
    "0.5"
  );

  // Available currencies based on pools
  const [availableCurrencies, setAvailableCurrencies] = useState<Address[]>([]);
  const [endpointCurrencies, setEndpointCurrencies] = useState<Address[]>([]);

  // Extract available currencies from pools
  useEffect(() => {
    const { allCurrencies, endpointCurrencies } = getAvailableCurrencies(pools);
    setAvailableCurrencies(allCurrencies);
    setEndpointCurrencies(endpointCurrencies);

    // Auto-set currencies if we have exactly 2 endpoint currencies
    if (endpointCurrencies.length === 2) {
      // Only set if not already set or if current selection is not in available currencies
      if (!fromCurrency || !endpointCurrencies.includes(fromCurrency)) {
        setFromCurrency(endpointCurrencies[0]);
      }
      if (!toCurrency || !endpointCurrencies.includes(toCurrency)) {
        setToCurrency(endpointCurrencies[1]);
      }

      // Ensure we don't have the same currency selected for both
      if (fromCurrency === toCurrency && fromCurrency && toCurrency) {
        setFromCurrency(endpointCurrencies[0]);
        setToCurrency(endpointCurrencies[1]);
      }
    }
  }, [pools]);

  // Currency info hook
  const { fromCurrencyInfo, toCurrencyInfo, currencyInfoMap } = useCurrencyInfo(
    {
      fromCurrency,
      toCurrency,
      availableCurrencies,
    }
  );

  // Swap quote hook
  const { quotedAmount, amountOut, isQuoting, quoteError, routingPath } =
    useSwapQuote({
      fromCurrency,
      toCurrency,
      swapAmount,
      pools,
      chainId: chain?.id,
      enabled: isChainSupported && !!address,
      fromDecimals: fromCurrencyInfo.decimals || 18,
      toDecimals: toCurrencyInfo.decimals || 18,
    });

  // Swap transaction hook
  const { executeSwap, isLoading: isSwapLoading } = useSwapTransaction({
    isChainSupported,
  });

  // Swap currencies function
  const swapCurrencies = () => {
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);
  };

  // Execute swap function
  const handleExecuteSwap = async () => {
    if (!routingPath || !amountOut) {
      return;
    }

    const fromDecimals = fromCurrencyInfo.decimals || 18;
    const quoteParams = {
      exactAmount: parseUnits(swapAmount, fromDecimals),
      exactCurrency: fromCurrency,
      path: routingPath.map((pool) => ({
        fee: pool.fee,
        tickSpacing: pool.tickSpacing,
        hookData: pool.hookData,
        hooks: pool.hooks,
        intermediateCurrency:
          pool.currency0 === fromCurrency ? pool.currency1 : pool.currency0,
      })),
    };

    await executeSwap({
      quoteParams,
      amountOut,
      slippage,
      fromCurrency,
      toCurrency,
      swapAmount,
      fromDecimals,
    });
  };

  // Check if swap is disabled
  const isSwapDisabled =
    !fromCurrency ||
    !toCurrency ||
    !swapAmount ||
    fromCurrency === toCurrency ||
    !amountOut ||
    !!quoteError;

  return (
    <Box
      p={6}
      bg="rgba(0, 0, 0, 0.05)"
      backdropFilter="blur(5px)"
      borderRadius="xl"
      border="1px solid"
      borderColor="whiteAlpha.50"
      maxW="1400px"
      mx="auto"
    >
      {/* Page Header */}
      <Box mb={8} textAlign="center">
        <HStack justify="center" spacing={3} mb={4}>
          <Icon as={FiRefreshCw} color="blue.400" boxSize={8} />
          <Heading
            size="xl"
            color="gray.100"
            fontWeight="bold"
            letterSpacing="tight"
          >
            Uniswap V4 Swap
          </Heading>
        </HStack>
        <Text color="gray.400" fontSize="lg" maxW="600px" mx="auto">
          Provide pools to route from & swap tokens using Uniswap V4
        </Text>
      </Box>

      <Flex w="100%" mb={6}>
        <Spacer />
        <ConnectButton />
      </Flex>

      {!address ? (
        <Center mt={8}>
          <Box textAlign="center">
            <Text mt={4} color="gray.400">
              Please connect your wallet to use this tool
            </Text>
          </Box>
        </Center>
      ) : chainNotSupported ? (
        <Center mt={8}>
          <Box textAlign="center">
            <Text fontSize="lg" mb={4} color="red.400">
              Chain not supported. Please switch to a supported chain:
            </Text>
            <VStack spacing={2}>
              {Object.keys(StateViewAddress)
                .map((chainId) => parseInt(chainId))
                .map((chainId) => (
                  <Button
                    key={chainId}
                    onClick={() => switchChain?.({ chainId })}
                    colorScheme="blue"
                  >
                    {chainIdToChain[chainId].name}
                  </Button>
                ))}
            </VStack>
          </Box>
        </Center>
      ) : (
        <Box w="full" px={8}>
          {/* Pool Configuration Section */}
          <PoolConfiguration
            pools={pools}
            onUpdatePools={setPools}
            currencyInfoMap={currencyInfoMap}
          />

          <Divider my={6} />

          {/* Swap Interface Section */}
          <Box id="swap">
            <SwapInterface
              fromCurrency={fromCurrency}
              setFromCurrency={setFromCurrency}
              toCurrency={toCurrency}
              setToCurrency={setToCurrency}
              swapAmount={swapAmount}
              setSwapAmount={setSwapAmount}
              slippage={slippage}
              setSlippage={setSlippage}
              availableCurrencies={endpointCurrencies}
              quotedAmount={quotedAmount || undefined}
              isQuoting={isQuoting}
              onSwapCurrencies={swapCurrencies}
              onExecuteSwap={handleExecuteSwap}
              isSwapDisabled={isSwapDisabled}
              isSwapLoading={isSwapLoading}
              currencyInfoMap={currencyInfoMap}
              userAddress={address}
            />
          </Box>

          {/* Quote Error Display */}
          {quoteError && (
            <>
              <Divider my={4} />
              <Box
                p={4}
                bg="red.900"
                borderRadius="lg"
                border="1px solid"
                borderColor="red.600"
              >
                <Text color="red.200" fontSize="sm">
                  Error Fetching Quote
                </Text>
              </Box>
            </>
          )}
        </Box>
      )}
    </Box>
  );
};

export default SwapPage;
