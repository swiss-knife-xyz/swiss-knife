"use client";

import { useEffect, useCallback, useMemo } from "react";
import { useLocalStorage } from "usehooks-ts";
import {
  Box,
  Button,
  Center,
  Divider,
  Flex,
  Heading,
  Input,
  InputGroup,
  InputRightAddon,
  Spacer,
  Text,
  VStack,
  HStack,
  Icon,
} from "@chakra-ui/react";
import { FiAlertTriangle, FiZap } from "react-icons/fi";
import { Address, zeroAddress, encodeFunctionData, Call } from "viem";
import { useAccount, useSwitchChain, usePublicClient } from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { chainIdToChain } from "@/data/common";
import { useTokenInfo } from "../add-liquidity/hooks/useTokenInfo";
import { usePoolState } from "../add-liquidity/hooks/usePoolState";
import { useSendTransaction } from "./hooks/useSendTransaction";

// Import components from pool-price-to-target
import { PoolInfoForm } from "../pool-price-to-target/components/PoolInfoForm";
import { CurrentPoolPriceDisplay } from "../pool-price-to-target/components/CurrentPoolPriceDisplay";

// Import constants
import {
  StateViewAddress,
  Permit2Address,
  UniV4PositionManagerAddress,
  UniV4PositionManagerAbi,
} from "../add-liquidity/lib/constants";
import { PoolConfigLocalStorageKeys } from "../pool-price-to-target/lib/constants";
import { AddLiquidityLocalStorageKeys } from "../add-liquidity/lib/constants";

// Import utility functions
import {
  priceToSqrtPriceX96,
  getPoolId,
  PoolKey,
  isValidNumericInput,
  priceRatioToTick,
} from "../add-liquidity/lib/utils";

const InitializePool = () => {
  const publicClient = usePublicClient();
  const { chain, address } = useAccount();
  const { switchChain } = useSwitchChain();

  const chainNotSupported =
    chain &&
    (!StateViewAddress[chain.id] ||
      !Permit2Address[chain.id] ||
      !UniV4PositionManagerAddress[chain.id]);
  const isChainSupported = !!(
    chain &&
    StateViewAddress[chain.id] &&
    Permit2Address[chain.id] &&
    UniV4PositionManagerAddress[chain.id]
  );

  // Form state with shared localStorage keys (same as pool-price-to-target)
  const [currency0, setCurrency0] = useLocalStorage<string>(
    PoolConfigLocalStorageKeys.CURRENCY0,
    ""
  );
  const [currency1, setCurrency1] = useLocalStorage<string>(
    PoolConfigLocalStorageKeys.CURRENCY1,
    ""
  );
  const [tickSpacing, setTickSpacing] = useLocalStorage<number>(
    PoolConfigLocalStorageKeys.TICK_SPACING,
    60
  );
  const [fee, setFee] = useLocalStorage<number>(
    PoolConfigLocalStorageKeys.FEE,
    3000
  );
  const [hookAddress, setHookAddress] = useLocalStorage<string>(
    PoolConfigLocalStorageKeys.HOOK_ADDRESS,
    zeroAddress
  );

  // Add hookData state with localStorage (rename from hooksData to match PoolInfoForm interface)
  const [hookData, setHookData] = useLocalStorage<string>(
    AddLiquidityLocalStorageKeys.HOOK_DATA,
    "0x"
  );

  // Pool initialization state
  const [initialPrice, setInitialPrice] = useLocalStorage<string>(
    AddLiquidityLocalStorageKeys.INITIAL_PRICE,
    "1"
  );
  const [initialPriceDirection, setInitialPriceDirection] =
    useLocalStorage<boolean>(
      AddLiquidityLocalStorageKeys.INITIAL_PRICE_DIRECTION,
      true // true = currency1 per currency0, false = currency0 per currency1
    );

  // CORRECTLY Integrate the useTokenInfo hook HERE
  const {
    currency0Symbol,
    currency0Decimals,
    currency1Symbol,
    currency1Decimals,
  } = useTokenInfo(
    address,
    currency0 as Address, // Cast to Address
    currency1 as Address, // Cast to Address
    0n,
    0n
  );

  const poolKey: PoolKey = useMemo(
    () => ({
      currency0: currency0 as Address,
      currency1: currency1 as Address,
      fee: fee!,
      tickSpacing: tickSpacing!,
      hooks: (hookAddress || zeroAddress) as Address,
    }),
    [currency0, currency1, fee, tickSpacing, hookAddress]
  );

  const poolId =
    currency0 && currency1 && tickSpacing ? getPoolId(poolKey) : null;

  // USE THE NEW usePoolState HOOK
  const {
    isPoolInitialized,
    currentTick,
    currentZeroForOnePrice,
    currentOneForZeroPrice,
    isSlot0Loading,
    fetchPoolInfo, // This is the new fetch function from the hook
  } = usePoolState(
    poolId,
    chain,
    currency0Decimals,
    currency1Decimals,
    isChainSupported
  );

  // USE THE NEW useAddLiquidityTransaction HOOK
  const {
    executeSendTransaction,
    isLoading: isTransactionLoading,
    isTransactionComplete,
  } = useSendTransaction({
    isChainSupported,
  });

  // Auto-swap currencies if currency1 < currency0 (Uniswap convention)
  useEffect(() => {
    if (
      currency0 &&
      currency1 &&
      currency0.length > 0 &&
      currency1.length > 0 &&
      currency0 !== currency1
    ) {
      try {
        if (BigInt(currency1) < BigInt(currency0)) {
          // Swap them
          const temp = currency0;
          setCurrency0(currency1);
          setCurrency1(temp);
        }
      } catch (error) {
        // Invalid addresses, ignore
      }
    }
  }, [currency0, currency1, setCurrency0, setCurrency1]);

  // Main initialize pool function
  const initializePool = useCallback(async () => {
    if (!address || !publicClient || !isChainSupported) return;

    try {
      // Calculate the correct current tick for liquidity calculations
      let effectiveCurrentTick = priceRatioToTick(
        initialPrice,
        initialPriceDirection,
        currency0Decimals || 18,
        currency1Decimals || 18,
        tickSpacing,
        false // Don't snap to nearest usable tick for initialization
      );

      console.log({
        effectiveCurrentTick,
        initialPrice,
        initialPriceDirection,
      });

      // Check if pool needs initialization
      const initialSqrtPriceX96 = priceToSqrtPriceX96(
        Number(initialPrice),
        currency0Decimals || 18,
        currency1Decimals || 18,
        initialPriceDirection
      );

      // Use the new transaction hook
      await executeSendTransaction({
        to: UniV4PositionManagerAddress[chain!.id],
        data: encodeFunctionData({
          abi: UniV4PositionManagerAbi,
          functionName: "initializePool",
          args: [poolKey, initialSqrtPriceX96],
        }),
        value: 0n,
      });
    } catch (error) {
      console.error("Error preparing initialize pool transaction:", error);
    }
  }, [
    address,
    publicClient,
    isChainSupported,
    chain,
    initialPrice,
    initialPriceDirection,
    currency0Decimals,
    currency1Decimals,
    tickSpacing,
    poolKey,
    executeSendTransaction,
  ]);

  // Refresh pool info and approvals after successful transaction
  useEffect(() => {
    if (isTransactionComplete) {
      // Refresh pool info after transaction
      setTimeout(fetchPoolInfo, 3000);
    }
  }, [isTransactionComplete, fetchPoolInfo]);

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
          <Icon as={FiZap} color="blue.400" boxSize={8} />
          <Heading
            size="xl"
            color="gray.100"
            fontWeight="bold"
            letterSpacing="tight"
          >
            Initialize Pool
          </Heading>
        </HStack>
        <Text color="gray.400" fontSize="lg" maxW="600px" mx="auto">
          Provide liquidity to Uniswap V4 pools and earn fees from trades
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
            hideHookData={true}
          />

          <Divider my={4} />

          {/* Current Pool Price Section - Only show when pool is initialized */}
          {isPoolInitialized === true && (
            <>
              <Box>
                <CurrentPoolPriceDisplay
                  fetchCurrentPrices={fetchPoolInfo}
                  isSlot0Loading={isSlot0Loading}
                  poolInteractionDisabled={
                    !currency0 ||
                    !currency1 ||
                    !currency0Decimals ||
                    !currency1Decimals ||
                    !isChainSupported ||
                    !poolId
                  }
                  slot0Tick={currentTick}
                  currentZeroForOnePrice={currentZeroForOnePrice}
                  currentOneForZeroPrice={currentOneForZeroPrice}
                  currency0Symbol={currency0Symbol}
                  currency1Symbol={currency1Symbol}
                />
              </Box>

              <Divider my={4} />
            </>
          )}

          {/* Pool Initialization Section */}
          {isPoolInitialized === false && (
            <>
              <Box
                p={4}
                bg="yellow.900"
                borderRadius="lg"
                border="1px solid"
                borderColor="yellow.600"
              >
                <VStack spacing={4} align="stretch">
                  <HStack spacing={2} align="center">
                    <Icon as={FiAlertTriangle} color="yellow.400" boxSize={5} />
                    <Heading size="md" color="yellow.200">
                      Pool Initialization Required
                    </Heading>
                  </HStack>

                  <Text fontSize="sm" color="yellow.300">
                    This pool needs to be initialized. Please set the initial
                    price.
                  </Text>

                  <Box>
                    <Text
                      fontSize="sm"
                      fontWeight="medium"
                      color="yellow.200"
                      mb={2}
                    >
                      Initial Price
                    </Text>
                    <InputGroup>
                      <Input
                        value={initialPrice}
                        onChange={(e) => {
                          if (isValidNumericInput(e.target.value)) {
                            setInitialPrice(e.target.value);
                          }
                        }}
                        placeholder="Enter initial price (e.g., 1800)"
                        bg="yellow.800"
                        border="1px solid"
                        borderColor="yellow.600"
                        _hover={{ borderColor: "yellow.500" }}
                        _focus={{
                          borderColor: "yellow.400",
                          boxShadow:
                            "0 0 0 1px var(--chakra-colors-yellow-400)",
                        }}
                        color="yellow.100"
                        _placeholder={{ color: "yellow.500" }}
                      />
                      <InputRightAddon
                        bg="yellow.800"
                        borderColor="yellow.600"
                        px={3}
                        py={2}
                      >
                        <Button
                          colorScheme="yellow"
                          variant="ghost"
                          onClick={() =>
                            setInitialPriceDirection(!initialPriceDirection)
                          }
                          size="sm"
                          color="yellow.200"
                          _hover={{ bg: "yellow.700" }}
                        >
                          {initialPriceDirection
                            ? `${currency1Symbol || "Currency1"} per ${
                                currency0Symbol || "Currency0"
                              }`
                            : `${currency0Symbol || "Currency0"} per ${
                                currency1Symbol || "Currency1"
                              }`}
                        </Button>
                      </InputRightAddon>
                    </InputGroup>

                    {/* Show corresponding tick value and sqrt price */}
                    {initialPrice &&
                      currency0Decimals !== undefined &&
                      currency1Decimals !== undefined &&
                      parseFloat(initialPrice) > 0 && (
                        <VStack spacing={2} mt={2}>
                          <Box p={2} bg="yellow.800" borderRadius="md" w="full">
                            <Text fontSize="xs" color="yellow.300" mb={1}>
                              Corresponding Tick Value:
                            </Text>
                            <Text
                              fontSize="sm"
                              color="yellow.200"
                              fontWeight="medium"
                            >
                              {(() => {
                                try {
                                  if (!tickSpacing)
                                    return "Missing tick spacing";

                                  const tick = priceRatioToTick(
                                    initialPrice,
                                    initialPriceDirection,
                                    currency0Decimals,
                                    currency1Decimals,
                                    tickSpacing,
                                    false // Don't snap to nearest usable tick for display
                                  );

                                  return tick.toString();
                                } catch {
                                  return "Invalid price";
                                }
                              })()}
                            </Text>
                          </Box>

                          <Box p={2} bg="yellow.800" borderRadius="md" w="full">
                            <Text fontSize="xs" color="yellow.300" mb={1}>
                              Initial SqrtPriceX96:
                            </Text>
                            <Text
                              fontSize="sm"
                              color="yellow.200"
                              fontWeight="medium"
                              wordBreak="break-all"
                            >
                              {(() => {
                                try {
                                  const initialSqrtPriceX96 =
                                    priceToSqrtPriceX96(
                                      parseFloat(initialPrice),
                                      currency0Decimals,
                                      currency1Decimals,
                                      initialPriceDirection
                                    );

                                  return initialSqrtPriceX96.toString();
                                } catch {
                                  return "Invalid price";
                                }
                              })()}
                            </Text>
                          </Box>
                        </VStack>
                      )}
                  </Box>
                </VStack>
              </Box>
            </>
          )}

          <Divider my={4} />

          {/* Initialize Pool Button Section */}
          <VStack spacing={4} align="stretch">
            <Button
              colorScheme="green"
              size="lg"
              onClick={initializePool}
              isLoading={isTransactionLoading}
              loadingText={"Initializing Pool..."}
              isDisabled={
                !address ||
                !currency0 ||
                !currency1 ||
                !isChainSupported ||
                (isPoolInitialized ? true : !initialPrice) ||
                isTransactionLoading
              }
              leftIcon={<Icon as={FiZap} boxSize={4} />}
            >
              {!isPoolInitialized && isPoolInitialized !== undefined
                ? "Initialize Pool"
                : "Pool Already Initialized"}
            </Button>
          </VStack>
        </Box>
      )}
    </Box>
  );
};

export default InitializePool;
