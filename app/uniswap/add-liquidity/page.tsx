"use client";

import { useEffect, useState, useCallback } from "react";
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
  InputRightElement,
  Spacer,
  Spinner,
  Table,
  Tbody,
  Td,
  Tr,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  Address,
  zeroHash,
  erc20Abi,
  zeroAddress,
  parseUnits,
  formatUnits,
  encodeFunctionData,
  encodeAbiParameters,
  Hex,
  maxUint160,
  Call,
} from "viem";
import {
  useAccount,
  useWalletClient,
  useSwitchChain,
  useReadContract,
  usePublicClient,
  useBalance,
} from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { chainIdToChain } from "@/data/common";
import { TickMath } from "@uniswap/v3-sdk";
import { useTokenInfo } from "./hooks/useTokenInfo";
import { usePoolState } from "./hooks/usePoolState";
import { useApprovalStates } from "./hooks/useApprovalStates";
import { useLiquidityCalculations } from "./hooks/useLiquidityCalculations";
import { useAddLiquidityTransaction } from "./hooks/useAddLiquidityTransaction";
import { PoolInfoDisplay } from "./components/PoolInfoDisplay";
import { PoolInitializationForm } from "./components/PoolInitializationForm";
import { LiquidityAmountInput } from "./components/LiquidityAmountInput";
import { PositionRangeInput } from "./components/PositionRangeInput";
import { TokenApprovals } from "./components/TokenApprovals";

// Import constants
import {
  StateViewAbi,
  StateViewAddress,
  Permit2Address,
  UniV4PositionManagerAddress,
  Permit2Abi,
  UniV4PositionManagerAbi,
  UniV4PM_MintPositionAbi,
  UniV4PM_SettlePairAbi,
  V4PMActions,
  Q96,
  Q192,
  MIN_TICK,
  MAX_TICK,
} from "./lib/constants";

// Import utility functions
import {
  getNearestUsableTick,
  priceToSqrtPriceX96,
  getLiquidityFromAmounts,
  getAmountsForLiquidity,
  getPoolId,
  PoolKey,
  getTickFromPrice,
  priceRatioToTick,
  tickToPriceRatio,
  isValidNumericInput,
  formatBalance,
} from "./lib/utils";

const AddLiquidity = () => {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { chain, address } = useAccount();
  const { switchChain } = useSwitchChain();
  const { data: balanceData } = useBalance({ address });

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
    "uniswap-currency0",
    ""
  );
  const [currency1, setCurrency1] = useLocalStorage<string>(
    "uniswap-currency1",
    ""
  );
  const [tickSpacing, setTickSpacing] = useLocalStorage<number>(
    "uniswap-tickSpacing",
    60
  );
  const [fee, setFee] = useLocalStorage<number>("uniswap-fee", 3000);
  const [hookAddress, setHookAddress] = useLocalStorage<string>(
    "uniswap-hookAddress",
    zeroAddress
  );

  // Add hooksData state with localStorage
  const [hooksData, setHooksData] = useLocalStorage<string>(
    "uniswap-add-liquidity-hooksData",
    "0x"
  );

  // Liquidity provision state
  const [amount0, setAmount0] = useLocalStorage<string>(
    "uniswap-add-liquidity-amount0",
    "1"
  );
  const [amount1, setAmount1] = useLocalStorage<string>(
    "uniswap-add-liquidity-amount1",
    "1"
  );
  const [tickLower, setTickLower] = useLocalStorage<string>(
    "uniswap-add-liquidity-tickLower",
    "-887220"
  );
  const [tickUpper, setTickUpper] = useLocalStorage<string>(
    "uniswap-add-liquidity-tickUpper",
    "887220"
  );

  // Add new states for price mode inputs
  const [priceInputMode, setPriceInputMode] = useLocalStorage<boolean>(
    "uniswap-add-liquidity-priceInputMode",
    false // false = tick mode, true = price mode
  );
  const [lowerPrice, setLowerPrice] = useLocalStorage<string>(
    "uniswap-add-liquidity-lowerPrice",
    "0.5"
  );
  const [upperPrice, setUpperPrice] = useLocalStorage<string>(
    "uniswap-add-liquidity-upperPrice",
    "2"
  );
  const [priceDirection, setPriceDirection] = useLocalStorage<boolean>(
    "uniswap-add-liquidity-priceDirection",
    true // true = currency1 per currency0, false = currency0 per currency1
  );

  // Pool initialization state
  const [initialPrice, setInitialPrice] = useLocalStorage<string>(
    "uniswap-add-liquidity-initialPrice",
    "1"
  );
  const [initialPriceDirection, setInitialPriceDirection] =
    useLocalStorage<boolean>(
      "uniswap-add-liquidity-initialPriceDirection",
      true // true = currency1 per currency0, false = currency0 per currency1
    );

  // Fetch ETH balance for currency0 if it's zeroAddress
  const { data: currency0EthBalance } = useBalance({
    address,
    query: {
      enabled: currency0 === zeroAddress && !!address,
    },
  });

  // Fetch ETH balance for currency1 if it's zeroAddress
  const { data: currency1EthBalance } = useBalance({
    address,
    query: {
      enabled: currency1 === zeroAddress && !!address,
    },
  });

  // CORRECTLY Integrate the useTokenInfo hook HERE
  const {
    currency0Symbol,
    currency0Decimals,
    currency0Balance,
    currency1Symbol,
    currency1Decimals,
    currency1Balance,
  } = useTokenInfo(
    address,
    currency0 as Address, // Cast to Address
    currency1 as Address, // Cast to Address
    currency0EthBalance?.value,
    currency1EthBalance?.value
  );

  const poolKey: PoolKey = {
    currency0: currency0 as Address,
    currency1: currency1 as Address,
    fee: fee!,
    tickSpacing: tickSpacing!,
    hooks: (hookAddress || zeroAddress) as Address,
  };

  const poolId =
    currency0 && currency1 && tickSpacing ? getPoolId(poolKey) : null;

  // USE THE NEW usePoolState HOOK
  const {
    isPoolInitialized,
    currentSqrtPriceX96,
    currentTick,
    currentZeroForOnePrice,
    currentOneForZeroPrice,
    slot0Data, // Keep if needed by other logic, e.g. addLiquidity function
    isSlot0Loading,
    slot0Error,
    fetchPoolInfo, // This is the new fetch function from the hook
  } = usePoolState(
    poolId,
    chain,
    currency0Decimals,
    currency1Decimals,
    isChainSupported
  );

  // ADD useApprovalStates HOOK CALL HERE
  const {
    currency0Approval,
    currency1Approval,
    currency0Permit2Allowance,
    currency1Permit2Allowance,
    isCheckingApprovals,
    checkApprovals,
  } = useApprovalStates(
    publicClient,
    address,
    chain,
    currency0,
    currency1,
    isChainSupported
  );

  // USE THE NEW useLiquidityCalculations HOOK
  const {
    lastUpdatedField,
    setLastUpdatedField,
    isCalculating,
    calculatingField,
    setIsCalculating,
    setCalculatingField,
  } = useLiquidityCalculations({
    currency0Decimals,
    currency1Decimals,
    isPoolInitialized,
    initialPrice,
    initialPriceDirection,
    slot0Data,
    tickLower,
    tickUpper,
    amount0,
    setAmount0, // Pass down the setter from useLocalStorage
    amount1,
    setAmount1, // Pass down the setter from useLocalStorage
  });

  // USE THE NEW useAddLiquidityTransaction HOOK
  const {
    executeSendCalls,
    isLoading: isTransactionLoading,
    isTransactionComplete,
  } = useAddLiquidityTransaction({
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

  // Main add liquidity function
  const addLiquidity = useCallback(async () => {
    if (!address || !publicClient || !isChainSupported) return;

    try {
      const amount0Parsed = parseUnits(amount0, currency0Decimals || 18);
      const amount1Parsed = parseUnits(amount1, currency1Decimals || 18);
      const tickLowerNum = parseInt(tickLower);
      const tickUpperNum = parseInt(tickUpper);

      // Calculate liquidity first using user's input amounts
      const initialLiquidity = getLiquidityFromAmounts({
        currentTick: currentTick ?? (slot0Data ? Number(slot0Data[1]) : 0),
        tickLower: tickLowerNum,
        tickUpper: tickUpperNum,
        amount0: amount0Parsed,
        amount1: amount1Parsed,
      });

      // Calculate the actual amounts needed for this liquidity
      const actualAmounts = getAmountsForLiquidity({
        currentTick: currentTick ?? (slot0Data ? Number(slot0Data[1]) : 0),
        tickLower: tickLowerNum,
        tickUpper: tickUpperNum,
        liquidity: initialLiquidity,
      });

      // Check if actual amounts exceed user input - if so, constrain them
      let finalLiquidity = initialLiquidity;
      let finalAmount0 = actualAmounts.amount0;
      let finalAmount1 = actualAmounts.amount1;

      // If actual amounts exceed user input, we need to recalculate with constraints
      if (
        actualAmounts.amount0 > amount0Parsed ||
        actualAmounts.amount1 > amount1Parsed
      ) {
        console.log("Actual amounts exceed user input, constraining...");

        // Calculate liquidity constrained by each amount separately
        const liquidity0Constrained = getLiquidityFromAmounts({
          currentTick: currentTick ?? (slot0Data ? Number(slot0Data[1]) : 0),
          tickLower: tickLowerNum,
          tickUpper: tickUpperNum,
          amount0: amount0Parsed,
          amount1: 0n, // Only constrain by amount0
        });

        const liquidity1Constrained = getLiquidityFromAmounts({
          currentTick: currentTick ?? (slot0Data ? Number(slot0Data[1]) : 0),
          tickLower: tickLowerNum,
          tickUpper: tickUpperNum,
          amount0: 0n, // Only constrain by amount1
          amount1: amount1Parsed,
        });

        // Use the smaller liquidity to ensure we don't exceed either amount
        finalLiquidity =
          liquidity0Constrained < liquidity1Constrained
            ? liquidity0Constrained
            : liquidity1Constrained;

        // Recalculate amounts for the constrained liquidity
        const constrainedAmounts = getAmountsForLiquidity({
          currentTick: currentTick ?? (slot0Data ? Number(slot0Data[1]) : 0),
          tickLower: tickLowerNum,
          tickUpper: tickUpperNum,
          liquidity: finalLiquidity,
        });

        finalAmount0 = constrainedAmounts.amount0;
        finalAmount1 = constrainedAmounts.amount1;
      }

      // IMPORTANT: Add conservative buffer to account for contract rounding differences
      // Reduce liquidity by 0.1% to ensure contract calculations stay within user bounds
      const liquidityBuffer = finalLiquidity / 1000n; // 0.1%
      const conservativeLiquidity =
        finalLiquidity - (liquidityBuffer > 1n ? liquidityBuffer : 1n);

      // Use conservative liquidity but keep user's original amounts as maximums
      // The conservative liquidity ensures the contract won't need more than user provided
      finalLiquidity = conservativeLiquidity;
      finalAmount0 = amount0Parsed; // Use user's full amount as maximum
      finalAmount1 = amount1Parsed; // Use user's full amount as maximum

      console.log("Liquidity calculation debug:", {
        userAmount0: amount0Parsed.toString(),
        userAmount1: amount1Parsed.toString(),
        initialLiquidity: initialLiquidity.toString(),
        finalLiquidity: finalLiquidity.toString(),
        finalAmount0: finalAmount0.toString(),
        finalAmount1: finalAmount1.toString(),
        withinUserLimits:
          finalAmount0 <= amount0Parsed && finalAmount1 <= amount1Parsed,
        liquidityReduced: finalLiquidity < initialLiquidity,
      });

      let value = 0n;

      // Calculate ETH value if needed - use user's original amounts since that's the max we might send
      if (currency0 === zeroAddress) {
        value += amount0Parsed;
      }
      if (currency1 === zeroAddress) {
        value += amount1Parsed;
      }

      const calls: Call[] = [];

      // Add approval calls if needed - use user's original amounts for approvals
      // Check ERC20 approvals to Permit2
      if (
        currency0 !== zeroAddress &&
        currency0Approval !== undefined &&
        currency0Approval < amount0Parsed
      ) {
        calls.push({
          to: currency0 as Address,
          data: encodeFunctionData({
            abi: erc20Abi,
            functionName: "approve",
            args: [Permit2Address[chain!.id], maxUint160],
          }),
          value: 0n,
        });
      }

      if (
        currency1 !== zeroAddress &&
        currency1Approval !== undefined &&
        currency1Approval < amount1Parsed
      ) {
        calls.push({
          to: currency1 as Address,
          data: encodeFunctionData({
            abi: erc20Abi,
            functionName: "approve",
            args: [Permit2Address[chain!.id], maxUint160],
          }),
          value: 0n,
        });
      }

      // Check Permit2 allowances and approve Position Manager if needed
      const expiration = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      if (
        currency0 !== zeroAddress &&
        currency0Permit2Allowance !== undefined &&
        currency0Permit2Allowance < amount0Parsed
      ) {
        calls.push({
          to: Permit2Address[chain!.id],
          data: encodeFunctionData({
            abi: Permit2Abi,
            functionName: "approve",
            args: [
              currency0 as Address,
              UniV4PositionManagerAddress[chain!.id],
              amount0Parsed, // Use user's original amount for Permit2 approval
              expiration,
            ],
          }),
          value: 0n,
        });
      }

      if (
        currency1 !== zeroAddress &&
        currency1Permit2Allowance !== undefined &&
        currency1Permit2Allowance < amount1Parsed
      ) {
        calls.push({
          to: Permit2Address[chain!.id],
          data: encodeFunctionData({
            abi: Permit2Abi,
            functionName: "approve",
            args: [
              currency1 as Address,
              UniV4PositionManagerAddress[chain!.id],
              amount1Parsed, // Use user's original amount for Permit2 approval
              expiration,
            ],
          }),
          value: 0n,
        });
      }

      // Check if pool needs initialization
      if (!isPoolInitialized) {
        const initialSqrtPriceX96 = priceToSqrtPriceX96(
          Number(initialPrice),
          currency0Decimals || 18,
          currency1Decimals || 18
        );

        calls.push({
          to: UniV4PositionManagerAddress[chain!.id],
          data: encodeFunctionData({
            abi: UniV4PositionManagerAbi,
            functionName: "initializePool",
            args: [poolKey, initialSqrtPriceX96],
          }),
          value: 0n,
        });
      }

      // Prepare mint position parameters
      const v4Actions = ("0x" +
        V4PMActions.MINT_POSITION +
        V4PMActions.SETTLE_PAIR) as Hex;

      // Validate hooksData format
      const validHooksData = hooksData.startsWith("0x")
        ? (hooksData as Hex)
        : (`0x${hooksData}` as Hex);

      const mintPositionParams = encodeAbiParameters(UniV4PM_MintPositionAbi, [
        poolKey,
        tickLowerNum,
        tickUpperNum,
        finalLiquidity,
        finalAmount0,
        finalAmount1,
        address,
        validHooksData,
      ]);

      const settlePairParams = encodeAbiParameters(UniV4PM_SettlePairAbi, [
        {
          currency0: poolKey.currency0,
          currency1: poolKey.currency1,
        },
      ]);

      calls.push({
        to: UniV4PositionManagerAddress[chain!.id],
        data: encodeFunctionData({
          abi: UniV4PositionManagerAbi,
          functionName: "modifyLiquidities",
          args: [
            encodeAbiParameters(
              [
                { type: "bytes", name: "actions" },
                { type: "bytes[]", name: "params" },
              ],
              [v4Actions, [mintPositionParams, settlePairParams]]
            ),
            BigInt(Math.floor(Date.now() / 1000) + 3600), // 1 hour deadline
          ],
        }),
        value,
      });

      // Use the new transaction hook
      await executeSendCalls(calls);
    } catch (error) {
      console.error("Error preparing add liquidity transaction:", error);
    }
  }, [
    address,
    publicClient,
    isChainSupported,
    amount0,
    currency0Decimals,
    amount1,
    currency1Decimals,
    tickLower,
    tickUpper,
    currency0,
    currency1,
    currency0Approval,
    currency1Approval,
    currency0Permit2Allowance,
    currency1Permit2Allowance,
    chain,
    isPoolInitialized,
    initialPrice,
    currentTick,
    slot0Data,
    hooksData,
    poolKey,
    executeSendCalls,
  ]);

  // Refresh pool info and approvals after successful transaction
  useEffect(() => {
    if (isTransactionComplete) {
      // Refresh pool info after transaction
      setTimeout(fetchPoolInfo, 3000);
      // Refresh approvals after transaction
      setTimeout(checkApprovals, 3000);
    }
  }, [isTransactionComplete, fetchPoolInfo, checkApprovals]);

  return (
    <>
      <Heading color={"custom.pale"}>UniV4 Add Liquidity</Heading>
      <Flex w="100%" mt={4}>
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
        <Table variant={"unstyled"}>
          <Tbody>
            <Tr>
              <Td>currency0</Td>
              <Td>
                <InputGroup>
                  <Input
                    value={currency0}
                    onChange={(e) => setCurrency0(e.target.value)}
                    placeholder="Enter currency0 address"
                  />
                  {currency0Symbol && (
                    <InputRightAddon>
                      <Center flexDir={"column"}>
                        <Box>{currency0Symbol}</Box>
                        <Box fontSize={"xs"}>
                          ({currency0Decimals} decimals)
                        </Box>
                      </Center>
                    </InputRightAddon>
                  )}
                </InputGroup>
              </Td>
            </Tr>
            <Tr>
              <Td>currency1</Td>
              <Td>
                <InputGroup>
                  <Input
                    value={currency1}
                    onChange={(e) => setCurrency1(e.target.value)}
                    placeholder="Enter currency1 address"
                  />
                  {currency1Symbol && (
                    <InputRightAddon>
                      <Center flexDir={"column"}>
                        <Box>{currency1Symbol}</Box>
                        <Box fontSize={"xs"}>
                          ({currency1Decimals} decimals)
                        </Box>
                      </Center>
                    </InputRightAddon>
                  )}
                </InputGroup>
              </Td>
            </Tr>
            <Tr>
              <Td>fee</Td>
              <Td>
                <Input
                  value={fee}
                  onChange={(e) => {
                    if (isValidNumericInput(e.target.value)) {
                      setFee(Number(e.target.value) || 0);
                    }
                  }}
                  placeholder="Enter fee (e.g., 3000 for 0.3%)"
                />
              </Td>
            </Tr>
            <Tr>
              <Td>tickSpacing</Td>
              <Td>
                <Input
                  value={tickSpacing}
                  onChange={(e) => {
                    if (isValidNumericInput(e.target.value)) {
                      setTickSpacing(Number(e.target.value) || 0);
                    }
                  }}
                  placeholder="Enter tick spacing (e.g., 60)"
                />
              </Td>
            </Tr>
            <Tr>
              <Td>hookAddress</Td>
              <Td>
                <Input
                  value={hookAddress}
                  onChange={(e) => setHookAddress(e.target.value)}
                  placeholder="Enter hook address (optional)"
                />
              </Td>
            </Tr>
            <Tr>
              <Td>hooksData</Td>
              <Td>
                <Input
                  value={hooksData}
                  onChange={(e) => setHooksData(e.target.value)}
                  placeholder="Enter hooks data (defaults to 0x)"
                />
              </Td>
            </Tr>
            <Tr>
              <Td colSpan={2}>
                <Divider />
              </Td>
            </Tr>
            <PoolInfoDisplay
              isPoolInitialized={isPoolInitialized}
              currentSqrtPriceX96={currentSqrtPriceX96}
              currentTick={currentTick}
              currentZeroForOnePrice={currentZeroForOnePrice}
              currentOneForZeroPrice={currentOneForZeroPrice}
              currency0Symbol={currency0Symbol}
              currency1Symbol={currency1Symbol}
              fetchPoolInfo={fetchPoolInfo}
              isSlot0Loading={isSlot0Loading}
              poolId={poolId}
              isChainSupported={isChainSupported}
              currency0={currency0}
              currency1={currency1}
            />
            <PoolInitializationForm
              isPoolInitialized={isPoolInitialized}
              initialPrice={initialPrice}
              setInitialPrice={setInitialPrice}
              initialPriceDirection={initialPriceDirection}
              setInitialPriceDirection={setInitialPriceDirection}
              currency0Symbol={currency0Symbol}
              currency1Symbol={currency1Symbol}
            />
            <Tr>
              <Td colSpan={2}>
                <Divider />
              </Td>
            </Tr>
            <Tr>
              <Td colSpan={2}>
                <Heading size={"md"} mb={4}>
                  Liquidity Position:
                </Heading>
              </Td>
            </Tr>
            <Tr>
              <Td>Amount {currency0Symbol || "Currency0"}</Td>
              <LiquidityAmountInput
                labelSymbol={currency0Symbol || "Currency0"}
                value={amount0}
                onAmountChange={(val) => {
                  setAmount0(val);
                  setLastUpdatedField("amount0");
                  if (val === "" || val === "0") {
                    setAmount1("");
                    if (setIsCalculating) setIsCalculating(false);
                    if (setCalculatingField) setCalculatingField(null);
                  }
                }}
                balance={currency0Balance}
                decimals={currency0Decimals}
                isCalculatingField={
                  isCalculating && calculatingField === "amount0"
                }
                placeholder="Enter amount of currency0"
              />
            </Tr>
            <Tr>
              <Td>Amount {currency1Symbol || "Currency1"}</Td>
              <LiquidityAmountInput
                labelSymbol={currency1Symbol || "Currency1"}
                value={amount1}
                onAmountChange={(val) => {
                  setAmount1(val);
                  setLastUpdatedField("amount1");
                  if (val === "" || val === "0") {
                    setAmount0("");
                    if (setIsCalculating) setIsCalculating(false);
                    if (setCalculatingField) setCalculatingField(null);
                  }
                }}
                balance={currency1Balance}
                decimals={currency1Decimals}
                isCalculatingField={
                  isCalculating && calculatingField === "amount1"
                }
                placeholder="Enter amount of currency1"
              />
            </Tr>
            <Tr>
              <Td colSpan={2}>
                <PositionRangeInput
                  priceInputMode={priceInputMode}
                  setPriceInputMode={setPriceInputMode}
                  currency0Decimals={currency0Decimals}
                  currency1Decimals={currency1Decimals}
                  lowerPrice={lowerPrice}
                  setLowerPrice={setLowerPrice}
                  upperPrice={upperPrice}
                  setUpperPrice={setUpperPrice}
                  tickLower={tickLower}
                  setTickLower={setTickLower}
                  tickUpper={tickUpper}
                  setTickUpper={setTickUpper}
                  priceDirection={priceDirection}
                  setPriceDirection={setPriceDirection}
                  currency0Symbol={currency0Symbol}
                  currency1Symbol={currency1Symbol}
                  tickSpacing={tickSpacing}
                />
              </Td>
            </Tr>
            <TokenApprovals
              checkApprovals={checkApprovals}
              isCheckingApprovals={isCheckingApprovals}
              address={address}
              isChainSupported={isChainSupported}
              currency0={currency0}
              currency1={currency1}
              currency0Symbol={currency0Symbol}
              currency1Symbol={currency1Symbol}
              amount0={amount0}
              amount1={amount1}
              currency0Decimals={currency0Decimals}
              currency1Decimals={currency1Decimals}
              currency0Approval={currency0Approval}
              currency1Approval={currency1Approval}
              currency0Permit2Allowance={currency0Permit2Allowance}
              currency1Permit2Allowance={currency1Permit2Allowance}
            />
            <Tr>
              <Td colSpan={2}>
                <Box mt={6}>
                  <Button
                    colorScheme="green"
                    size="lg"
                    width="100%"
                    onClick={addLiquidity}
                    isLoading={isTransactionLoading}
                    loadingText={
                      !isPoolInitialized && isPoolInitialized !== undefined
                        ? "Initializing Pool & Adding Liquidity..."
                        : "Adding Liquidity..."
                    }
                    isDisabled={
                      !address ||
                      !currency0 ||
                      !currency1 ||
                      !amount0 ||
                      !amount1 ||
                      !isChainSupported ||
                      (!isPoolInitialized && !initialPrice) ||
                      isTransactionLoading
                    }
                  >
                    {!isPoolInitialized && isPoolInitialized !== undefined
                      ? "Initialize Pool & Add Liquidity"
                      : "Add Liquidity"}
                  </Button>

                  {!isPoolInitialized && isPoolInitialized !== undefined && (
                    <Text
                      fontSize="sm"
                      color="yellow.400"
                      mt={2}
                      textAlign="center"
                    >
                      Note: Pool initialization and liquidity provision will be
                      done in one transaction
                    </Text>
                  )}

                  {(currency0 !== zeroAddress || currency1 !== zeroAddress) && (
                    <Text
                      fontSize="sm"
                      color="blue.400"
                      mt={2}
                      textAlign="center"
                    >
                      💡 Any required approvals will be automatically included
                      in the transaction
                    </Text>
                  )}
                </Box>
              </Td>
            </Tr>
          </Tbody>
        </Table>
      )}
    </>
  );
};

export default AddLiquidity;
