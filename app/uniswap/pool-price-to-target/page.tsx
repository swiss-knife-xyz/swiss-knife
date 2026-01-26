"use client";

import { useEffect, useState, useRef } from "react";
import { useLocalStorage } from "usehooks-ts";
import {
  Box,
  Button,
  Center,
  Divider,
  Flex,
  Heading,
  Spacer,
  Text,
  VStack,
  HStack,
  Icon,
} from "@chakra-ui/react";
import { Address, zeroAddress, Hex } from "viem";
import { useAccount, useSwitchChain } from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { FiTarget, FiTrendingUp } from "react-icons/fi";

import { chainIdToChain } from "@/data/common";
import { quoterAddress, PoolKey } from "../lib/constants";
import { getPoolId, getSearchRangeTokenSymbol } from "./lib/utils";
import { usePoolFormState } from "./hooks/usePoolFormState";
import { useCurrencyInfo } from "./hooks/useCurrencyInfo";
import { useCurrentPoolPrices } from "./hooks/useCurrentPoolPrices";
import { useTargetPriceCalculator } from "./hooks/useTargetPriceCalculator";
import { useSwapQuote } from "./hooks/useSwapQuote";

// Import new components
import { PoolInfoForm } from "./components/PoolInfoForm";
import { CurrentPoolPriceDisplay } from "./components/CurrentPoolPriceDisplay";
import { SwapQuoteForm } from "./components/SwapQuoteForm";
import { QuoteResultDetails } from "./components/QuoteResultDetails";
import { TargetPriceCalculatorForm } from "./components/TargetPriceCalculatorForm";
import { TargetPriceSwapControls } from "./components/TargetPriceSwapControls";
import { PriceAnalysisDisplay } from "./components/PriceAnalysisDisplay";

const PoolPriceToTarget = () => {
  const { chain } = useAccount();
  const { switchChain } = useSwitchChain();

  const {
    currency0,
    setCurrency0,
    currency1,
    setCurrency1,
    tickSpacing,
    setTickSpacing,
    fee,
    setFee,
    hookAddress,
    setHookAddress,
    hookData,
    setHookData,
  } = usePoolFormState();

  const {
    currency0Symbol,
    currency0Decimals,
    currency1Symbol,
    currency1Decimals,
  } = useCurrencyInfo({ currency0, currency1, setCurrency0, setCurrency1 });

  const chainNotSupported = !!(chain && !quoterAddress[chain.id]);
  const isChainSupported = !!(chain && quoterAddress[chain.id]);

  // State for price after swap direction toggle (Used by QuoteResultDetails)
  const [priceAfterSwapDirection, setPriceAfterSwapDirection] =
    useLocalStorage<boolean>(
      "uniswap-priceAfterSwapDirection",
      true // true = currency1 per currency0, false = currency0 per currency1
    );

  // State for effective price direction toggle (Used by QuoteResultDetails)
  const [effectivePriceDirection, setEffectivePriceDirection] =
    useLocalStorage<boolean>(
      "uniswap-effectivePriceDirection",
      true // true = currency1 per currency0, false = currency0 per currency1
    );

  const [amount, setAmount] = useLocalStorage<string>("uniswap-amount", "1");
  const [zeroForOne, setZeroForOne] = useLocalStorage<boolean>(
    "uniswap-zeroForOne",
    true
  );

  // Add ref for scroll target
  const swapAmountRef = useRef<HTMLElement | null>(null);

  const poolKey: PoolKey = {
    currency0: currency0 as Address,
    currency1: currency1 as Address,
    fee: fee!,
    tickSpacing: tickSpacing!,
    hooks: (hookAddress || zeroAddress) as Address,
  };

  const poolId =
    currency0 && currency1 && tickSpacing ? getPoolId(poolKey) : null;

  // Use the new current pool prices hook
  const {
    currentZeroForOnePrice,
    currentOneForZeroPrice,
    slot0Tick,
    isSlot0Loading,
    fetchCurrentPrices,
  } = useCurrentPoolPrices({
    poolId,
    chain,
    currency0Decimals,
    currency1Decimals,
  });

  // Use the new swap quote hook
  const { quoteData, quoteError, isQuoteLoading, fetchQuoteResult } =
    useSwapQuote({
      currency0,
      currency1,
      amount,
      zeroForOne,
      fee,
      tickSpacing,
      hookAddress,
      hookData,
      currency0Decimals,
      currency1Decimals,
      chain,
      isChainSupported,
    });

  // useTargetPriceCalculator hook
  const {
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
    searchProgress,
    isSearching,
    isBinarySearching,
    isParallelSearching,
    searchResult,
    performOptimizedParallelSearch,
    performBinarySearch,
    stopBinarySearch,
  } = useTargetPriceCalculator({
    poolKey,
    currency0Decimals,
    currency1Decimals,
    currency0Symbol,
    currency1Symbol,
    currentZeroForOnePrice,
    currentOneForZeroPrice,
    hookDataProp: (hookData || "0x") as Hex, // Pass hookData from usePoolFormState
    chain,
  });

  // Helper function to get the token symbol for search ranges
  const searchRangeTokenSymbol = getSearchRangeTokenSymbol(
    targetPrice,
    currentZeroForOnePrice,
    currentOneForZeroPrice,
    targetPriceDirection,
    currency0Symbol,
    currency1Symbol
  );

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
      {/* Modern Page Header */}
      <Box mb={8} textAlign="center">
        <HStack justify="center" spacing={3} mb={4}>
          <Icon as={FiTarget} color="orange.400" boxSize={8} />
          <Heading
            size="xl"
            color="gray.100"
            fontWeight="bold"
            letterSpacing="tight"
          >
            Pool Price to Target
          </Heading>
        </HStack>
        <Text color="gray.400" fontSize="lg" maxW="600px" mx="auto">
          Calculate swap amount to bring Uniswap V4 pool price to target price
        </Text>
      </Box>

      <Flex w="100%" mb={6}>
        <Spacer />
        <ConnectButton />
      </Flex>

      {!chain ? (
        <Center mt={8}>
          <Box textAlign="center">
            <Text fontSize="lg" mb={4}>
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
              {Object.keys(quoterAddress)
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
          <PoolInfoForm
            currency0={currency0}
            setCurrency0={setCurrency0}
            currency0Symbol={currency0Symbol}
            currency0Decimals={currency0Decimals}
            currency1={currency1}
            setCurrency1={setCurrency1}
            currency1Symbol={currency1Symbol}
            currency1Decimals={currency1Decimals}
            fee={fee}
            setFee={setFee}
            tickSpacing={tickSpacing}
            setTickSpacing={setTickSpacing}
            hookAddress={hookAddress}
            setHookAddress={setHookAddress}
            hookData={hookData}
            setHookData={setHookData}
          />

          <Divider my={4} />

          <Box>
            <CurrentPoolPriceDisplay
              fetchCurrentPrices={fetchCurrentPrices}
              isSlot0Loading={isSlot0Loading}
              poolInteractionDisabled={
                !currency0.length ||
                !currency1.length ||
                !currency0Decimals ||
                !currency1Decimals ||
                !isChainSupported ||
                !poolId
              }
              slot0Tick={slot0Tick}
              currentZeroForOnePrice={currentZeroForOnePrice}
              currentOneForZeroPrice={currentOneForZeroPrice}
              currency0Symbol={currency0Symbol}
              currency1Symbol={currency1Symbol}
            />
          </Box>

          <Divider my={4} />

          <Box
            p={4}
            bg="whiteAlpha.50"
            borderRadius="lg"
            border="1px solid"
            borderColor="whiteAlpha.200"
          >
            <SwapQuoteForm
              amount={amount}
              setAmount={setAmount}
              zeroForOne={zeroForOne}
              setZeroForOne={setZeroForOne}
              currency0Symbol={currency0Symbol}
              currency1Symbol={currency1Symbol}
              fetchQuoteResult={fetchQuoteResult}
              isQuoteLoading={isQuoteLoading}
              quoteDisabled={
                !currency0.length ||
                !currency1.length ||
                !amount ||
                !isChainSupported ||
                !poolKey
              }
              swapAmountRef={swapAmountRef}
            />

            {(quoteData || quoteError) && (
              <QuoteResultDetails
                quoteResultData={quoteData}
                quoteError={quoteError}
                amount={amount}
                zeroForOne={zeroForOne}
                currency0Symbol={currency0Symbol}
                currency1Symbol={currency1Symbol}
                currency0Decimals={currency0Decimals}
                currency1Decimals={currency1Decimals}
                effectivePriceDirection={effectivePriceDirection}
                setEffectivePriceDirection={setEffectivePriceDirection}
                priceAfterSwapDirection={priceAfterSwapDirection}
                setPriceAfterSwapDirection={setPriceAfterSwapDirection}
                currentZeroForOnePrice={currentZeroForOnePrice}
                currentOneForZeroPrice={currentOneForZeroPrice}
              />
            )}
          </Box>

          <Divider my={4} />

          <Box my={2}>
            <TargetPriceCalculatorForm
              targetPrice={targetPrice}
              setTargetPrice={setTargetPrice}
              targetPriceDirection={targetPriceDirection}
              setTargetPriceDirection={setTargetPriceDirection}
              threshold={threshold}
              setThreshold={setThreshold}
              searchLow={searchLow}
              setSearchLow={setSearchLow}
              searchHigh={searchHigh}
              setSearchHigh={setSearchHigh}
              maxIterations={maxIterations}
              setMaxIterations={setMaxIterations}
              currency0Symbol={currency0Symbol}
              currency1Symbol={currency1Symbol}
              searchRangeTokenSymbol={searchRangeTokenSymbol}
            />
          </Box>

          <Box>
            <PriceAnalysisDisplay
              targetPrice={targetPrice}
              currentZeroForOnePrice={currentZeroForOnePrice}
              currentOneForZeroPrice={currentOneForZeroPrice}
              targetPriceDirection={targetPriceDirection}
              currency0Symbol={currency0Symbol}
              currency1Symbol={currency1Symbol}
            />
          </Box>

          <Box my={2}>
            <TargetPriceSwapControls
              performOptimizedParallelSearch={performOptimizedParallelSearch}
              performBinarySearch={performBinarySearch}
              stopSearch={stopBinarySearch}
              isSearching={isSearching}
              isBinarySearching={isBinarySearching}
              isParallelSearching={isParallelSearching}
              searchProgress={searchProgress}
              searchResult={searchResult}
              searchDisabled={
                !targetPrice ||
                !currentZeroForOnePrice ||
                !currentOneForZeroPrice ||
                !threshold ||
                !searchLow ||
                !searchHigh ||
                !isChainSupported ||
                !poolKey
              }
              setAmount={setAmount}
              setZeroForOne={setZeroForOne}
              swapAmountRef={swapAmountRef as React.RefObject<HTMLElement>}
              threshold={threshold}
              targetPrice={targetPrice}
              currentZeroForOnePrice={currentZeroForOnePrice}
              currentOneForZeroPrice={currentOneForZeroPrice}
              currency0={currency0 as Address}
              currency1={currency1 as Address}
              fee={fee}
              tickSpacing={tickSpacing}
              hookAddress={hookAddress as Address}
              hookData={hookData}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default PoolPriceToTarget;
