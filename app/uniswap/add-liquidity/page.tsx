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
  HStack,
  Icon,
  Badge,
  Collapse,
  useDisclosure,
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
import {
  FiAlertTriangle,
  FiDollarSign,
  FiSettings,
  FiShield,
  FiRefreshCw,
  FiPlus,
  FiChevronDown,
  FiChevronUp,
  FiDroplet,
} from "react-icons/fi";

// Import the PoolInfoForm from pool-price-to-target
import { PoolInfoForm } from "../pool-price-to-target/components/PoolInfoForm";

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

// Create ApprovalStatusRow component inline
const ApprovalStatusRow: React.FC<{
  label: string;
  approval?: bigint;
  requiredAmount: string;
  decimals: number;
  isPermit2?: boolean;
}> = ({ label, approval, requiredAmount, decimals, isPermit2 = false }) => {
  const getStatus = () => {
    if (!requiredAmount || requiredAmount === "" || requiredAmount === "0") {
      return { text: "-", color: "gray.400" };
    }
    try {
      const requiredAmountBigInt = parseUnits(requiredAmount, decimals);
      if (approval === undefined) return { text: "-", color: "gray.400" };
      if (approval >= requiredAmountBigInt) {
        return {
          text: isPermit2 ? "✅ Allowed" : "✅ Approved",
          color: "green.400",
        };
      }
      return {
        text: isPermit2 ? "⚠️ Permit2 approval needed" : "⚠️ Approval needed",
        color: isPermit2 ? "purple.400" : "orange.400",
      };
    } catch {
      return { text: "Invalid Amount", color: "red.400" };
    }
  };

  const status = getStatus();

  return (
    <Flex
      justify="space-between"
      align="center"
      bg="whiteAlpha.30"
      px={3}
      py={2}
      borderRadius="md"
      border="1px solid"
      borderColor="whiteAlpha.100"
    >
      <Text color="gray.300" fontSize="sm">
        {label}
      </Text>
      <Badge
        colorScheme={
          status.color.includes("green")
            ? "green"
            : status.color.includes("red")
            ? "red"
            : status.color.includes("purple")
            ? "purple"
            : status.color.includes("orange")
            ? "orange"
            : "gray"
        }
        fontSize="xs"
        px={2}
        py={0.5}
        rounded="md"
      >
        {status.text}
      </Badge>
    </Flex>
  );
};

const AddLiquidity = () => {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { chain, address } = useAccount();
  const { switchChain } = useSwitchChain();
  const { data: balanceData } = useBalance({ address });

  // Disclosure hook for Token Approvals section
  const { isOpen: isApprovalsOpen, onToggle: onToggleApprovals } =
    useDisclosure();

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

  // Add hookData state with localStorage (rename from hooksData to match PoolInfoForm interface)
  const [hookData, setHookData] = useLocalStorage<string>(
    "uniswap-add-liquidity-hookData",
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

  // Automatically check approvals when dependencies change
  useEffect(() => {
    if (
      address &&
      isChainSupported &&
      currency0 &&
      currency1 &&
      (amount0 || amount1) &&
      currency0Decimals &&
      currency1Decimals
    ) {
      // Small delay to avoid rapid consecutive calls
      const timeoutId = setTimeout(() => {
        checkApprovals();
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [
    address,
    isChainSupported,
    currency0,
    currency1,
    amount0,
    amount1,
    currency0Decimals,
    currency1Decimals,
    checkApprovals,
  ]);

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

      // Validate hookData format
      const validHookData = hookData.startsWith("0x")
        ? (hookData as Hex)
        : (`0x${hookData}` as Hex);

      const mintPositionParams = encodeAbiParameters(UniV4PM_MintPositionAbi, [
        poolKey,
        tickLowerNum,
        tickUpperNum,
        finalLiquidity,
        finalAmount0,
        finalAmount1,
        address,
        validHookData,
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
    hookData,
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

  // Helper function to get approval summary status
  const getApprovalSummary = () => {
    if (!address || !isChainSupported) return null;

    const needsApproval = [];

    // Check currency0 approvals
    if (currency0 !== zeroAddress && amount0 && currency0Decimals) {
      try {
        const requiredAmount = parseUnits(amount0, currency0Decimals);
        if (
          currency0Approval !== undefined &&
          currency0Approval < requiredAmount
        ) {
          needsApproval.push(`${currency0Symbol || "Currency0"} → Permit2`);
        }
        if (
          currency0Permit2Allowance !== undefined &&
          currency0Permit2Allowance < requiredAmount
        ) {
          needsApproval.push(
            `Permit2 → PM (${currency0Symbol || "Currency0"})`
          );
        }
      } catch {}
    }

    // Check currency1 approvals
    if (currency1 !== zeroAddress && amount1 && currency1Decimals) {
      try {
        const requiredAmount = parseUnits(amount1, currency1Decimals);
        if (
          currency1Approval !== undefined &&
          currency1Approval < requiredAmount
        ) {
          needsApproval.push(`${currency1Symbol || "Currency1"} → Permit2`);
        }
        if (
          currency1Permit2Allowance !== undefined &&
          currency1Permit2Allowance < requiredAmount
        ) {
          needsApproval.push(
            `Permit2 → PM (${currency1Symbol || "Currency1"})`
          );
        }
      } catch {}
    }

    return needsApproval;
  };

  const approvalSummary = getApprovalSummary();

  // Helper functions to check if amounts are valid (not exceeding balance)
  const isAmount0Valid = () => {
    if (!amount0 || amount0 === "" || amount0 === "0") return true;
    if (!currency0Balance || !currency0Decimals) return true;
    try {
      const enteredAmount = parseUnits(amount0, currency0Decimals);
      return enteredAmount <= currency0Balance;
    } catch {
      return false;
    }
  };

  const isAmount1Valid = () => {
    if (!amount1 || amount1 === "" || amount1 === "0") return true;
    if (!currency1Balance || !currency1Decimals) return true;
    try {
      const enteredAmount = parseUnits(amount1, currency1Decimals);
      return enteredAmount <= currency1Balance;
    } catch {
      return false;
    }
  };

  const hasInvalidAmounts = !isAmount0Valid() || !isAmount1Valid();

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
          <Icon as={FiDroplet} color="blue.400" boxSize={8} />
          <Heading
            size="xl"
            color="gray.100"
            fontWeight="bold"
            letterSpacing="tight"
          >
            Add Liquidity
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
          />

          <Divider my={4} />

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
                  </Box>
                </VStack>
              </Box>

              <Divider my={4} />
            </>
          )}

          {/* Liquidity Position Section */}
          <Box
            p={4}
            bg="whiteAlpha.50"
            borderRadius="lg"
            border="1px solid"
            borderColor="whiteAlpha.200"
          >
            <VStack spacing={6} align="stretch">
              <HStack spacing={2} align="center">
                <Icon as={FiDollarSign} color="green.400" boxSize={6} />
                <Heading size="md" color="gray.300">
                  Liquidity Position
                </Heading>
              </HStack>

              {/* Amount Inputs */}
              <VStack spacing={4} align="stretch">
                {/* Amount 0 */}
                <Box>
                  <HStack spacing={2} mb={2}>
                    <Icon as={FiDollarSign} color="blue.400" boxSize={4} />
                    <Text color="gray.300" fontSize="sm" fontWeight="medium">
                      Amount {currency0Symbol || "Currency0"}
                    </Text>
                  </HStack>
                  <Box position="relative">
                    <InputGroup>
                      <Input
                        bg="whiteAlpha.50"
                        border="1px solid"
                        borderColor={
                          !isAmount0Valid() ? "red.400" : "whiteAlpha.200"
                        }
                        _hover={{
                          borderColor: !isAmount0Valid()
                            ? "red.500"
                            : "whiteAlpha.300",
                        }}
                        _focus={{
                          borderColor: !isAmount0Valid()
                            ? "red.400"
                            : "blue.400",
                          boxShadow: !isAmount0Valid()
                            ? "0 0 0 1px var(--chakra-colors-red-400)"
                            : "0 0 0 1px var(--chakra-colors-blue-400)",
                        }}
                        color="gray.100"
                        _placeholder={{ color: "gray.500" }}
                        rounded="md"
                        value={amount0}
                        onChange={(e) => {
                          if (isValidNumericInput(e.target.value)) {
                            setAmount0(e.target.value);
                            setLastUpdatedField("amount0");
                            if (
                              e.target.value === "" ||
                              e.target.value === "0"
                            ) {
                              setAmount1("");
                              if (setIsCalculating) setIsCalculating(false);
                              if (setCalculatingField)
                                setCalculatingField(null);
                            }
                          }
                        }}
                        placeholder="Enter amount of currency0"
                        pr={
                          isCalculating && calculatingField === "amount0"
                            ? "40px"
                            : "16px"
                        }
                      />
                      {isCalculating && calculatingField === "amount0" && (
                        <InputRightElement>
                          <Spinner size="sm" color="blue.500" />
                        </InputRightElement>
                      )}
                    </InputGroup>
                    <Text
                      position="absolute"
                      top="-20px"
                      right="4px"
                      fontSize="xs"
                      color={!isAmount0Valid() ? "red.400" : "gray.400"}
                      cursor="pointer"
                      _hover={{
                        color: !isAmount0Valid() ? "red.300" : "blue.400",
                        textDecoration: "underline",
                      }}
                      onClick={() => {
                        if (currency0Balance && currency0Decimals) {
                          const maxBalance = formatUnits(
                            currency0Balance,
                            currency0Decimals
                          );
                          setAmount0(maxBalance);
                          setLastUpdatedField("amount0");
                          // Clear amount1 and stop calculating to let user manually adjust or let calculation happen
                          if (amount1) {
                            setAmount1("");
                          }
                          if (setIsCalculating) setIsCalculating(false);
                          if (setCalculatingField) setCalculatingField(null);
                        }
                      }}
                      title="Click to use max balance"
                    >
                      Balance:{" "}
                      {formatBalance(currency0Balance, currency0Decimals || 18)}
                    </Text>
                    {!isAmount0Valid() && amount0 && amount0 !== "0" && (
                      <Text
                        position="absolute"
                        bottom="-20px"
                        left="4px"
                        fontSize="xs"
                        color="red.400"
                      >
                        Insufficient balance
                      </Text>
                    )}
                  </Box>
                </Box>

                {/* Amount 1 */}
                <Box>
                  <HStack spacing={2} mb={2}>
                    <Icon as={FiDollarSign} color="green.400" boxSize={4} />
                    <Text color="gray.300" fontSize="sm" fontWeight="medium">
                      Amount {currency1Symbol || "Currency1"}
                    </Text>
                  </HStack>
                  <Box position="relative">
                    <InputGroup>
                      <Input
                        bg="whiteAlpha.50"
                        border="1px solid"
                        borderColor={
                          !isAmount1Valid() ? "red.400" : "whiteAlpha.200"
                        }
                        _hover={{
                          borderColor: !isAmount1Valid()
                            ? "red.500"
                            : "whiteAlpha.300",
                        }}
                        _focus={{
                          borderColor: !isAmount1Valid()
                            ? "red.400"
                            : "green.400",
                          boxShadow: !isAmount1Valid()
                            ? "0 0 0 1px var(--chakra-colors-red-400)"
                            : "0 0 0 1px var(--chakra-colors-green-400)",
                        }}
                        color="gray.100"
                        _placeholder={{ color: "gray.500" }}
                        rounded="md"
                        value={amount1}
                        onChange={(e) => {
                          if (isValidNumericInput(e.target.value)) {
                            setAmount1(e.target.value);
                            setLastUpdatedField("amount1");
                            if (
                              e.target.value === "" ||
                              e.target.value === "0"
                            ) {
                              setAmount0("");
                              if (setIsCalculating) setIsCalculating(false);
                              if (setCalculatingField)
                                setCalculatingField(null);
                            }
                          }
                        }}
                        placeholder="Enter amount of currency1"
                        pr={
                          isCalculating && calculatingField === "amount1"
                            ? "40px"
                            : "16px"
                        }
                      />
                      {isCalculating && calculatingField === "amount1" && (
                        <InputRightElement>
                          <Spinner size="sm" color="green.500" />
                        </InputRightElement>
                      )}
                    </InputGroup>
                    <Text
                      position="absolute"
                      top="-20px"
                      right="4px"
                      fontSize="xs"
                      color={!isAmount1Valid() ? "red.400" : "gray.400"}
                      cursor="pointer"
                      _hover={{
                        color: !isAmount1Valid() ? "red.300" : "green.400",
                        textDecoration: "underline",
                      }}
                      onClick={() => {
                        if (currency1Balance && currency1Decimals) {
                          const maxBalance = formatUnits(
                            currency1Balance,
                            currency1Decimals
                          );
                          setAmount1(maxBalance);
                          setLastUpdatedField("amount1");
                          // Clear amount0 and stop calculating to let user manually adjust or let calculation happen
                          if (amount0) {
                            setAmount0("");
                          }
                          if (setIsCalculating) setIsCalculating(false);
                          if (setCalculatingField) setCalculatingField(null);
                        }
                      }}
                      title="Click to use max balance"
                    >
                      Balance:{" "}
                      {formatBalance(currency1Balance, currency1Decimals || 18)}
                    </Text>
                    {!isAmount1Valid() && amount1 && amount1 !== "0" && (
                      <Text
                        position="absolute"
                        bottom="-20px"
                        left="4px"
                        fontSize="xs"
                        color="red.400"
                      >
                        Insufficient balance
                      </Text>
                    )}
                  </Box>
                </Box>
              </VStack>

              {/* Position Range Section */}
              <Box>
                <HStack spacing={2} mb={3}>
                  <Icon as={FiSettings} color="purple.400" boxSize={4} />
                  <Text color="gray.300" fontSize="sm" fontWeight="medium">
                    Position Range
                  </Text>
                </HStack>
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
              </Box>
            </VStack>
          </Box>

          <Divider my={4} />

          {/* Token Approvals Section */}
          <Box
            p={4}
            bg="whiteAlpha.50"
            borderRadius="lg"
            border="1px solid"
            borderColor="whiteAlpha.200"
          >
            <VStack spacing={4} align="stretch">
              <HStack spacing={4} align="center" justify="space-between">
                <HStack spacing={2} align="center">
                  <Icon as={FiShield} color="blue.400" boxSize={6} />
                  <Heading size="md" color="gray.300">
                    Token Approvals
                  </Heading>
                  {isCheckingApprovals && (
                    <Spinner size="sm" color="blue.400" />
                  )}
                  {/* Approval status summary */}
                  {approvalSummary && approvalSummary.length > 0 ? (
                    <Badge
                      colorScheme="orange"
                      fontSize="xs"
                      px={2}
                      rounded="md"
                    >
                      (auto batched)
                    </Badge>
                  ) : approvalSummary &&
                    approvalSummary.length === 0 &&
                    (currency0 !== zeroAddress || currency1 !== zeroAddress) ? (
                    <Badge colorScheme="green" fontSize="xs">
                      All approved
                    </Badge>
                  ) : null}
                </HStack>

                <Button
                  colorScheme="blue"
                  onClick={onToggleApprovals}
                  variant="ghost"
                  size="sm"
                  rightIcon={
                    <Icon
                      as={isApprovalsOpen ? FiChevronUp : FiChevronDown}
                      boxSize={4}
                    />
                  }
                >
                  {isApprovalsOpen ? "Hide" : "Show"} Details
                </Button>
              </HStack>

              <Collapse in={isApprovalsOpen} animateOpacity>
                <VStack spacing={4} align="stretch">
                  <Button
                    colorScheme="blue"
                    onClick={checkApprovals}
                    isLoading={isCheckingApprovals}
                    loadingText="Checking..."
                    isDisabled={!address || !isChainSupported}
                    leftIcon={<Icon as={FiRefreshCw} boxSize={3} />}
                    size="xs"
                    alignSelf="flex-end"
                  >
                    Refresh Approvals
                  </Button>

                  {/* Approval Status */}
                  {((currency0 !== zeroAddress &&
                    amount0 &&
                    currency0Decimals) ||
                    (currency1 !== zeroAddress &&
                      amount1 &&
                      currency1Decimals)) && (
                    <VStack spacing={3} align="stretch">
                      {currency0 !== zeroAddress &&
                        amount0 &&
                        currency0Decimals && (
                          <VStack spacing={2} align="stretch">
                            <ApprovalStatusRow
                              label={`${
                                currency0Symbol || "Currency0"
                              } → Permit2`}
                              approval={currency0Approval}
                              requiredAmount={amount0}
                              decimals={currency0Decimals}
                            />
                            <ApprovalStatusRow
                              label={`Permit2 → Position Manager (${
                                currency0Symbol || "Currency0"
                              })`}
                              approval={currency0Permit2Allowance}
                              requiredAmount={amount0}
                              decimals={currency0Decimals}
                              isPermit2={true}
                            />
                          </VStack>
                        )}
                      {currency1 !== zeroAddress &&
                        amount1 &&
                        currency1Decimals && (
                          <VStack spacing={2} align="stretch">
                            <ApprovalStatusRow
                              label={`${
                                currency1Symbol || "Currency1"
                              } → Permit2`}
                              approval={currency1Approval}
                              requiredAmount={amount1}
                              decimals={currency1Decimals}
                            />
                            <ApprovalStatusRow
                              label={`Permit2 → Position Manager (${
                                currency1Symbol || "Currency1"
                              })`}
                              approval={currency1Permit2Allowance}
                              requiredAmount={amount1}
                              decimals={currency1Decimals}
                              isPermit2={true}
                            />
                          </VStack>
                        )}
                    </VStack>
                  )}
                </VStack>
              </Collapse>
            </VStack>
          </Box>

          <Divider my={4} />

          {/* Add Liquidity Button Section */}
          <Box
            p={4}
            bg="whiteAlpha.50"
            borderRadius="lg"
            border="1px solid"
            borderColor="whiteAlpha.200"
          >
            <VStack spacing={4} align="stretch">
              <Button
                colorScheme="green"
                size="lg"
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
                  isTransactionLoading ||
                  hasInvalidAmounts
                }
                leftIcon={<Icon as={FiPlus} boxSize={4} />}
              >
                {hasInvalidAmounts
                  ? "Invalid Token Amounts"
                  : !isPoolInitialized && isPoolInitialized !== undefined
                  ? "Initialize Pool & Add Liquidity"
                  : "Add Liquidity"}
              </Button>

              {!isPoolInitialized && isPoolInitialized !== undefined && (
                <Text fontSize="sm" color="yellow.400" textAlign="center">
                  Note: Pool initialization and liquidity provision will be done
                  in one transaction
                </Text>
              )}

              {(currency0 !== zeroAddress || currency1 !== zeroAddress) && (
                <Text fontSize="sm" color="blue.400" textAlign="center">
                  💡 Any required approvals will be automatically included in
                  the transaction
                </Text>
              )}
            </VStack>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default AddLiquidity;
