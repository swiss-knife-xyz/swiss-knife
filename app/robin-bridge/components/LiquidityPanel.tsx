"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getWalletClient } from "@wagmi/core";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Grid,
  Heading,
  HStack,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Link,
  RangeSlider,
  RangeSliderFilledTrack,
  RangeSliderThumb,
  RangeSliderTrack,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Info,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import {
  encodeAbiParameters,
  encodeFunctionData,
  erc20Abi,
  formatEther,
  formatUnits,
  parseUnits,
  zeroAddress,
  type Address,
  type Call,
  type Hex,
} from "viem";
import {
  useAccount,
  useConfig,
  useSendCalls,
  useSwitchChain,
  useWaitForCallsStatus,
} from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { useBatchSupport } from "@/app/migrate/hooks/useBatchSupport";
import { getPublicClient } from "@/lib/publicClient";
import { robinhood } from "@/data/common";
import {
  Permit2Abi,
  Permit2Address,
  StateViewAbi,
  StateViewAddress,
  UniV4PM_MintPositionAbi,
  UniV4PM_SettlePairAbi,
  UniV4PositionManagerAbi,
  UniV4PositionManagerAddress,
  V4PMActions,
} from "@/app/uniswap/lib/constants";
import {
  getLiquidityFromAmounts,
  getPoolId,
  priceToSqrtPriceX96,
  type PoolKey,
} from "@/app/uniswap/add-liquidity/lib/utils";
import { ROBINHOOD_CHAIN_ID, type OftDeployment } from "../lib/oft";
import { RegisteredTokenList, TokenLogo } from "./RegisteredTokenList";
import { findRegisteredDeployment, WCHAN_BASE_TOKEN } from "../lib/registry";
import {
  ROBIN_LP_FEE,
  ROBIN_LP_TICK_SPACING,
  currentTickToFdv,
  fdvRangeToTicks,
  fdvToTick,
  fdvToTokenPerEth,
  getAmountsForAnchor,
  getFullRangeTicks,
  getRequiredLiquiditySides,
  type RequiredLiquiditySides,
  type RobinMarketData,
} from "../lib/liquidity";

const MULTICALL3 = "0xcA11bde05977b3631167028862bE2a173976CA11" as Address;
const BALANCE_REFRESH_INTERVAL_MS = 10_000;
const BALANCE_PERCENTAGES = [25, 50, 75, 100] as const;
const REVIEW_PRICE_TOLERANCE = 0.01;
const DRIFT_WARNING_THRESHOLD = 0.02;
const LOW_LIQUIDITY_USD = 50_000;

type RangeMode = "full" | "concentrated";
type ExecutionStatus =
  | "idle"
  | "preparing"
  | "submitting"
  | "confirming"
  | "success";
type ExecutionMode = "batch" | "sequential" | null;
type SequentialStepPhase = "wallet" | "confirming";
type LiquidityAction = {
  label: string;
  call: Call;
};

type RobinState = {
  initialized: boolean;
  sqrtPriceX96: bigint;
  tick: number;
  tokenDecimals: number;
  ethBalance: bigint;
  tokenBalance: bigint;
  tokenAllowance: bigint;
  permit2Allowance: bigint;
  permit2Expiration: number;
};

const emptyRobinState: RobinState = {
  initialized: false,
  sqrtPriceX96: 0n,
  tick: 0,
  tokenDecimals: 18,
  ethBalance: 0n,
  tokenBalance: 0n,
  tokenAllowance: 0n,
  permit2Allowance: 0n,
  permit2Expiration: 0,
};

const parsePositiveNumber = (value: string) => {
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const getFdvSliderMax = (currentFdv: number) => {
  const target = Math.max(currentFdv * 3, 1);
  const magnitude = 10 ** Math.floor(Math.log10(target));
  return Math.ceil(target / magnitude) * magnitude;
};

const getFdvSliderStep = (sliderMax: number) =>
  Math.max(1, 10 ** Math.max(0, Math.floor(Math.log10(sliderMax)) - 2));

const formatFdvInput = (value: string) => {
  if (!value) return "";
  const [whole = "", fraction] = value.split(".");
  const formattedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction === undefined
    ? formattedWhole
    : `${formattedWhole}.${fraction}`;
};

const sanitizeFdvInput = (value: string) => {
  const cleaned = value.replace(/[^\d.]/g, "");
  const [whole = "", ...fractionParts] = cleaned.split(".");
  return fractionParts.length > 0
    ? `${whole}.${fractionParts.join("")}`
    : whole;
};

const formatFdvDelta = (value: number, currentFdv: number) => {
  if (!Number.isFinite(value) || !Number.isFinite(currentFdv) || !currentFdv)
    return null;
  const delta = ((value - currentFdv) / currentFdv) * 100;
  const rounded =
    Math.abs(delta) >= 10 ? Math.round(delta) : Math.round(delta * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
};

const cleanLiquidityError = (error: unknown) => {
  if (!(error instanceof Error)) return "Something went wrong.";
  const message =
    (error as Error & { shortMessage?: string }).shortMessage ?? error.message;
  if (/rejected|denied/i.test(message)) return "Transaction rejected.";
  if (/insufficient funds/i.test(message))
    return "Not enough ETH for the deposit and network fee.";
  return message.split("\n")[0].replace("ContractFunctionExecutionError: ", "");
};

const formatUsd = (value: number | null | undefined, compact = false) => {
  if (value === null || value === undefined || !Number.isFinite(value))
    return "—";
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: value < 1 && !compact ? 6 : 2,
  });
};

const formatTokenAmount = (value: bigint, decimals: number) =>
  Number(formatUnits(value, decimals)).toLocaleString(undefined, {
    maximumFractionDigits: 5,
  });

const getMintedTokenId = (receipts: readonly { logs?: readonly any[] }[]) => {
  const positionManager =
    UniV4PositionManagerAddress[ROBINHOOD_CHAIN_ID].toLowerCase();
  const transferTopic =
    "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
  for (const receipt of receipts) {
    for (const log of receipt.logs ?? []) {
      if (
        String(log.address).toLowerCase() === positionManager &&
        log.topics?.[0]?.toLowerCase() === transferTopic &&
        log.topics?.[1] === `0x${"0".repeat(64)}` &&
        log.topics?.[3]
      ) {
        return BigInt(log.topics[3]).toString();
      }
    }
  }
  return null;
};

export function LiquidityPanel({
  deployment,
  onSelectDeployment,
  onOpenBridge,
}: {
  deployment: OftDeployment;
  onSelectDeployment: (deployment: OftDeployment) => void;
  onOpenBridge: () => void;
}) {
  const { address, chainId, isConnected } = useAccount();
  const config = useConfig();
  const { switchChainAsync } = useSwitchChain();
  const { supports: supportsBatch, isLoading: batchSupportLoading } =
    useBatchSupport(ROBINHOOD_CHAIN_ID);
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<RangeMode>("full");
  const [market, setMarket] = useState<RobinMarketData | null>(null);
  const [marketLoading, setMarketLoading] = useState(true);
  const [marketError, setMarketError] = useState("");
  const [manualFdv, setManualFdv] = useState("");
  const [minFdv, setMinFdv] = useState("");
  const [maxFdv, setMaxFdv] = useState("");
  const [ethAmount, setEthAmount] = useState("");
  const [tokenAmount, setTokenAmount] = useState("");
  const [lastEdited, setLastEdited] = useState<"eth" | "token">("eth");
  const [robinState, setRobinState] = useState<RobinState>(emptyRobinState);
  const [stateLoading, setStateLoading] = useState(true);
  const [reviewed, setReviewed] = useState(false);
  const [status, setStatus] = useState<ExecutionStatus>("idle");
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState<Hex | null>(null);
  const [positionTokenId, setPositionTokenId] = useState<string | null>(null);
  const [activeBatchId, setActiveBatchId] = useState<string | undefined>();
  const [executionMode, setExecutionMode] = useState<ExecutionMode>(null);
  const [executionSteps, setExecutionSteps] = useState<string[]>([]);
  const [completedStepCount, setCompletedStepCount] = useState(0);
  const [sequentialStepPhase, setSequentialStepPhase] =
    useState<SequentialStepPhase>("wallet");
  const rangeSelectorRef = useRef<HTMLDivElement>(null);
  const tokenLogo = useMemo(
    () =>
      deployment.logo ??
      findRegisteredDeployment(deployment.baseToken, deployment.robinToken)
        ?.logo,
    [deployment.baseToken, deployment.logo, deployment.robinToken]
  );

  const poolKey = useMemo<PoolKey>(
    () => ({
      currency0: zeroAddress,
      currency1: deployment.robinToken,
      fee: ROBIN_LP_FEE,
      tickSpacing: ROBIN_LP_TICK_SPACING,
      hooks: zeroAddress,
    }),
    [deployment.robinToken]
  );
  const poolId = useMemo(() => getPoolId(poolKey), [poolKey]);

  const fetchMarket = useCallback(
    async (fresh = false) => {
      setMarketLoading(true);
      setMarketError("");
      try {
        const response = await fetch(
          `/api/robin-bridge/market-data?baseToken=${deployment.baseToken}${fresh ? "&fresh=1" : ""}`,
          { cache: fresh ? "no-store" : "default" }
        );
        const result = (await response.json()) as RobinMarketData & {
          error?: string;
        };
        if (!response.ok)
          throw new Error(result.error ?? "Market data unavailable.");
        setMarket(result);
        return result;
      } catch (fetchError) {
        setMarketError(cleanLiquidityError(fetchError));
        return null;
      } finally {
        setMarketLoading(false);
      }
    },
    [deployment.baseToken]
  );

  const refreshRobinState = useCallback(
    async (showLoading = true) => {
      if (showLoading) setStateLoading(true);
      try {
        const client = getPublicClient(ROBINHOOD_CHAIN_ID);
        const owner = address ?? zeroAddress;
        const [reads, ethBalance] = await Promise.all([
          client.multicall({
            allowFailure: false,
            multicallAddress: MULTICALL3,
            contracts: [
              {
                address: StateViewAddress[ROBINHOOD_CHAIN_ID],
                abi: StateViewAbi,
                functionName: "getSlot0",
                args: [poolId],
              },
              {
                address: deployment.robinToken,
                abi: erc20Abi,
                functionName: "decimals",
              },
              {
                address: deployment.robinToken,
                abi: erc20Abi,
                functionName: "balanceOf",
                args: [owner],
              },
              {
                address: deployment.robinToken,
                abi: erc20Abi,
                functionName: "allowance",
                args: [owner, Permit2Address[ROBINHOOD_CHAIN_ID]],
              },
              {
                address: Permit2Address[ROBINHOOD_CHAIN_ID],
                abi: Permit2Abi,
                functionName: "allowance",
                args: [
                  owner,
                  deployment.robinToken,
                  UniV4PositionManagerAddress[ROBINHOOD_CHAIN_ID],
                ],
              },
            ],
          }),
          client.getBalance({ address: owner }),
        ]);
        const slot0 = reads[0] as readonly [bigint, number, number, number];
        const nextState: RobinState = {
          initialized: slot0[0] !== 0n,
          sqrtPriceX96: slot0[0],
          tick: Number(slot0[1]),
          tokenDecimals: Number(reads[1]),
          tokenBalance: reads[2] as bigint,
          tokenAllowance: reads[3] as bigint,
          permit2Allowance: (reads[4] as readonly [bigint, number, number])[0],
          permit2Expiration: Number(
            (reads[4] as readonly [bigint, number, number])[1]
          ),
          ethBalance,
        };
        setRobinState(nextState);
        return nextState;
      } catch (stateError) {
        setError(cleanLiquidityError(stateError));
        return null;
      } finally {
        if (showLoading) setStateLoading(false);
      }
    },
    [address, deployment.robinToken, poolId]
  );

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setMarket(null);
    setManualFdv("");
    setMinFdv("");
    setMaxFdv("");
    setEthAmount("");
    setTokenAmount("");
    setReviewed(false);
    void fetchMarket();
  }, [fetchMarket]);

  useEffect(() => {
    void refreshRobinState();
  }, [refreshRobinState]);

  useEffect(() => {
    if (!address) return;
    let refreshPending = false;
    const intervalId = window.setInterval(() => {
      if (refreshPending) return;
      refreshPending = true;
      void refreshRobinState(false).finally(() => {
        refreshPending = false;
      });
    }, BALANCE_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [address, refreshRobinState]);

  const totalSupply = parsePositiveNumber(market?.totalSupply ?? "");
  const referenceFdv = market?.fdvUsd ?? parsePositiveNumber(manualFdv);
  const tokenUsd =
    market?.tokenUsd ??
    (referenceFdv > 0 && totalSupply > 0 ? referenceFdv / totalSupply : 0);
  const initialTick =
    referenceFdv > 0 && totalSupply > 0 && market?.ethUsd
      ? fdvToTick(referenceFdv, totalSupply, market.ethUsd)
      : 0;
  const executableTick = robinState.initialized ? robinState.tick : initialTick;
  const executableFdv =
    referenceFdv > 0 && totalSupply > 0 && market?.ethUsd
      ? currentTickToFdv(executableTick, totalSupply, market.ethUsd)
      : referenceFdv;

  useEffect(() => {
    if (!referenceFdv || minFdv || maxFdv) return;
    setMinFdv(String(Math.round(referenceFdv * 0.5)));
    setMaxFdv(String(Math.round(referenceFdv * 2)));
  }, [maxFdv, minFdv, referenceFdv]);

  const parsedMinFdv = Number(minFdv.replace(/,/g, ""));
  const hasMinFdv =
    minFdv.trim() !== "" && Number.isFinite(parsedMinFdv) && parsedMinFdv >= 0;
  const minFdvNumber = hasMinFdv ? parsedMinFdv : 0;
  const maxFdvNumber = parsePositiveNumber(maxFdv);
  const concentratedRange = useMemo(() => {
    if (
      !market?.ethUsd ||
      !totalSupply ||
      !hasMinFdv ||
      !maxFdvNumber ||
      minFdvNumber >= maxFdvNumber
    ) {
      return null;
    }
    return fdvRangeToTicks(
      minFdvNumber,
      maxFdvNumber,
      totalSupply,
      market.ethUsd
    );
  }, [hasMinFdv, market?.ethUsd, maxFdvNumber, minFdvNumber, totalSupply]);
  const fullRange = useMemo(() => getFullRangeTicks(), []);
  const ticks = mode === "full" ? fullRange : concentratedRange;
  const requiredSides: RequiredLiquiditySides =
    mode === "full" || !executableFdv || !hasMinFdv || !maxFdvNumber
      ? "both"
      : getRequiredLiquiditySides(minFdvNumber, maxFdvNumber, executableFdv);

  const fdvSliderMax = getFdvSliderMax(referenceFdv);
  const fdvSliderStep = getFdvSliderStep(fdvSliderMax);
  const sliderMax = Math.min(fdvSliderMax, maxFdvNumber || fdvSliderMax);
  const sliderMin = Math.min(
    Math.max(0, sliderMax - fdvSliderStep),
    Math.max(0, hasMinFdv ? minFdvNumber : 0)
  );

  const calculatePair = useCallback(
    (anchor: "eth" | "token", value: string) => {
      if (!ticks || !referenceFdv || !market?.ethUsd) return null;
      try {
        const amount = parseUnits(
          value || "0",
          anchor === "eth" ? 18 : robinState.tokenDecimals
        );
        return getAmountsForAnchor({
          currentTick: executableTick,
          tickLower: ticks.tickLower,
          tickUpper: ticks.tickUpper,
          anchor,
          amount,
        });
      } catch {
        return null;
      }
    },
    [
      executableTick,
      market?.ethUsd,
      referenceFdv,
      robinState.tokenDecimals,
      ticks,
    ]
  );

  const markFormEdited = () => {
    setReviewed(false);
    setError("");
    if (status === "success") {
      setStatus("idle");
      setTxHash(null);
      setPositionTokenId(null);
    }
  };

  const updateEthAmount = (value: string) => {
    setLastEdited("eth");
    setEthAmount(value);
    markFormEdited();
    if (requiredSides === "both") {
      const paired = calculatePair("eth", value);
      setTokenAmount(
        paired ? formatUnits(paired.amountToken, robinState.tokenDecimals) : ""
      );
    }
  };

  const updateTokenAmount = (value: string) => {
    setLastEdited("token");
    setTokenAmount(value);
    markFormEdited();
    if (requiredSides === "both") {
      const paired = calculatePair("token", value);
      setEthAmount(paired ? formatEther(paired.amountEth) : "");
    }
  };

  useEffect(() => {
    setReviewed(false);
    if (requiredSides === "eth") {
      setTokenAmount("");
      return;
    }
    if (requiredSides === "token") {
      setEthAmount("");
      return;
    }
    const anchorValue = lastEdited === "eth" ? ethAmount : tokenAmount;
    const paired = calculatePair(lastEdited, anchorValue);
    if (!paired) return;
    if (lastEdited === "eth") {
      setTokenAmount(formatUnits(paired.amountToken, robinState.tokenDecimals));
    } else {
      setEthAmount(formatEther(paired.amountEth));
    }
    // Recalculate only when the price or range changes, not when the paired field updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculatePair, mode, requiredSides]);

  const parsedEthAmount = useMemo(() => {
    try {
      return parseUnits(ethAmount || "0", 18);
    } catch {
      return 0n;
    }
  }, [ethAmount]);
  const parsedTokenAmount = useMemo(() => {
    try {
      return parseUnits(tokenAmount || "0", robinState.tokenDecimals);
    } catch {
      return 0n;
    }
  }, [robinState.tokenDecimals, tokenAmount]);

  const rangeIsValid = mode === "full" || Boolean(concentratedRange);
  const amountsAreValid =
    (requiredSides === "eth" ? parsedEthAmount > 0n : true) &&
    (requiredSides === "token" ? parsedTokenAmount > 0n : true) &&
    (requiredSides === "both"
      ? parsedEthAmount > 0n && parsedTokenAmount > 0n
      : true);
  const exceedsEthBalance = parsedEthAmount > robinState.ethBalance;
  const exceedsTokenBalance = parsedTokenAmount > robinState.tokenBalance;
  const canReview =
    Boolean(referenceFdv && market?.ethUsd && ticks) &&
    rangeIsValid &&
    amountsAreValid &&
    !exceedsEthBalance &&
    !exceedsTokenBalance &&
    !marketLoading &&
    !stateLoading &&
    !batchSupportLoading;

  const drift =
    referenceFdv > 0 && executableFdv > 0
      ? (executableFdv - referenceFdv) / referenceFdv
      : 0;
  const hasPriceDrift =
    robinState.initialized && Math.abs(drift) > DRIFT_WARNING_THRESHOLD;
  const lowLiquidity =
    deployment.baseToken.toLowerCase() !== WCHAN_BASE_TOKEN.toLowerCase() &&
    market?.referencePool?.reserveUsd !== null &&
    market?.referencePool?.reserveUsd !== undefined &&
    market.referencePool.reserveUsd < LOW_LIQUIDITY_USD;

  const buildCalls = (latestState: RobinState) => {
    if (!address || !ticks || !market?.ethUsd || !referenceFdv) {
      throw new Error("Liquidity details are incomplete.");
    }
    const initialLiquidity = getLiquidityFromAmounts({
      currentTick: latestState.initialized ? latestState.tick : initialTick,
      tickLower: ticks.tickLower,
      tickUpper: ticks.tickUpper,
      amount0: parsedEthAmount,
      amount1: parsedTokenAmount,
    });
    const buffer = initialLiquidity / 2_000n;
    const liquidity = initialLiquidity - (buffer > 1n ? buffer : 1n);
    if (liquidity <= 0n)
      throw new Error("The deposit is too small for this range.");

    const calls: LiquidityAction[] = [];
    if (
      parsedTokenAmount > 0n &&
      latestState.tokenAllowance < parsedTokenAmount
    ) {
      calls.push({
        label: `Approve ${deployment.symbol}`,
        call: {
          to: deployment.robinToken,
          data: encodeFunctionData({
            abi: erc20Abi,
            functionName: "approve",
            args: [Permit2Address[ROBINHOOD_CHAIN_ID], parsedTokenAmount],
          }),
        },
      });
    }
    const now = Math.floor(Date.now() / 1_000);
    const expiration = now + 3_600;
    if (
      parsedTokenAmount > 0n &&
      (latestState.permit2Allowance < parsedTokenAmount ||
        latestState.permit2Expiration < now + 1_200)
    ) {
      calls.push({
        label: "Authorize Uniswap",
        call: {
          to: Permit2Address[ROBINHOOD_CHAIN_ID],
          data: encodeFunctionData({
            abi: Permit2Abi,
            functionName: "approve",
            args: [
              deployment.robinToken,
              UniV4PositionManagerAddress[ROBINHOOD_CHAIN_ID],
              parsedTokenAmount,
              expiration,
            ],
          }),
        },
      });
    }
    if (!latestState.initialized) {
      const tokenPerEth = fdvToTokenPerEth(
        referenceFdv,
        totalSupply,
        market.ethUsd
      );
      calls.push({
        label: "Create 1% pool",
        call: {
          to: UniV4PositionManagerAddress[ROBINHOOD_CHAIN_ID],
          data: encodeFunctionData({
            abi: UniV4PositionManagerAbi,
            functionName: "initializePool",
            args: [
              poolKey,
              priceToSqrtPriceX96(
                tokenPerEth,
                18,
                latestState.tokenDecimals,
                true
              ),
            ],
          }),
        },
      });
    }

    const actions =
      `0x${V4PMActions.MINT_POSITION}${V4PMActions.SETTLE_PAIR}` as Hex;
    const mintParams = encodeAbiParameters(UniV4PM_MintPositionAbi, [
      poolKey,
      ticks.tickLower,
      ticks.tickUpper,
      liquidity,
      parsedEthAmount,
      parsedTokenAmount,
      address,
      "0x",
    ]);
    const settleParams = encodeAbiParameters(UniV4PM_SettlePairAbi, [
      { currency0: poolKey.currency0, currency1: poolKey.currency1 },
    ]);
    calls.push({
      label: "Add liquidity",
      call: {
        to: UniV4PositionManagerAddress[ROBINHOOD_CHAIN_ID],
        value: parsedEthAmount,
        data: encodeFunctionData({
          abi: UniV4PositionManagerAbi,
          functionName: "modifyLiquidities",
          args: [
            encodeAbiParameters(
              [
                { type: "bytes", name: "actions" },
                { type: "bytes[]", name: "params" },
              ],
              [actions, [mintParams, settleParams]]
            ),
            BigInt(Math.floor(Date.now() / 1_000) + 1_200),
          ],
        }),
      },
    });
    return calls;
  };

  const {
    sendCallsAsync,
    error: sendCallsError,
    reset: resetSendCalls,
  } = useSendCalls();
  const { data: callsStatus, error: callsStatusError } = useWaitForCallsStatus({
    id: activeBatchId,
    query: { enabled: Boolean(activeBatchId) },
  });

  useEffect(() => {
    if (!sendCallsError || status !== "submitting") return;
    setStatus("idle");
    setError(cleanLiquidityError(sendCallsError));
  }, [sendCallsError, status]);

  useEffect(() => {
    if (!activeBatchId || status !== "confirming") return;
    if (callsStatusError) {
      setActiveBatchId(undefined);
      setStatus("idle");
      setError(cleanLiquidityError(callsStatusError));
      return;
    }
    if (!callsStatus) return;
    if (callsStatus.status === "failure") {
      setActiveBatchId(undefined);
      setStatus("idle");
      setError("The liquidity batch failed or reverted.");
      return;
    }
    const receipts = callsStatus.receipts ?? [];
    if (
      callsStatus.status !== "success" ||
      !receipts.length ||
      receipts.some((receipt) => receipt.status !== "success")
    ) {
      return;
    }
    const finalHash = [...receipts]
      .reverse()
      .find((receipt) => receipt.transactionHash)?.transactionHash;
    setActiveBatchId(undefined);
    setTxHash(finalHash ?? null);
    setPositionTokenId(getMintedTokenId(receipts));
    setEthAmount("");
    setTokenAmount("");
    setStatus("success");
    void refreshRobinState();
  }, [activeBatchId, callsStatus, callsStatusError, refreshRobinState, status]);

  useEffect(() => {
    if (status === "idle" || status === "success") return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = true;
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [status]);

  const submitLiquidity = async () => {
    if (!address || !canReview) return;
    setStatus("preparing");
    setError("");
    setTxHash(null);
    setPositionTokenId(null);
    setExecutionMode(null);
    setExecutionSteps([]);
    setCompletedStepCount(0);
    setSequentialStepPhase("wallet");
    try {
      const [latestMarket, latestState] = await Promise.all([
        fetchMarket(true),
        refreshRobinState(),
      ]);
      if (!latestMarket || !latestState)
        throw new Error("Could not refresh liquidity data.");
      const latestFdv = latestMarket.fdvUsd ?? referenceFdv;
      if (
        market?.fdvUsd &&
        latestFdv &&
        Math.abs(latestFdv - market.fdvUsd) / market.fdvUsd >
          REVIEW_PRICE_TOLERANCE
      ) {
        setReviewed(false);
        setStatus("idle");
        setError(
          "The Base reference price moved by more than 1%. Review the updated amounts."
        );
        return;
      }
      const liquidityActions = buildCalls(latestState);
      if (supportsBatch) {
        // `wallet_sendCalls` carries its own chain id. Let a capable wallet
        // handle the Robinhood chain and the complete approval / initialize /
        // mint sequence in one atomic request instead of showing a separate
        // network-switch prompt before the batch confirmation.
        resetSendCalls();
        setActiveBatchId(undefined);
        setExecutionMode("batch");
        setStatus("submitting");
        const result = await sendCallsAsync({
          chainId: ROBINHOOD_CHAIN_ID,
          forceAtomic: true,
          calls: liquidityActions.map(({ call }) => call),
        });
        setActiveBatchId(result.id);
        setStatus("confirming");
        return;
      }

      const needsChainSwitch = chainId !== ROBINHOOD_CHAIN_ID;
      const sequentialSteps = [
        ...(needsChainSwitch ? ["Switch to Robinhood Chain"] : []),
        ...liquidityActions.map(({ label }) => label),
      ];
      setExecutionMode("sequential");
      setExecutionSteps(sequentialSteps);
      setCompletedStepCount(0);
      setStatus("confirming");

      let stepOffset = 0;
      if (needsChainSwitch) {
        setSequentialStepPhase("wallet");
        await switchChainAsync({ chainId: ROBINHOOD_CHAIN_ID });
        stepOffset = 1;
        setCompletedStepCount(stepOffset);
      }
      const walletClient = await getWalletClient(config, {
        chainId: ROBINHOOD_CHAIN_ID,
      });
      const client = getPublicClient(ROBINHOOD_CHAIN_ID);
      const receipts = [];
      for (let index = 0; index < liquidityActions.length; index += 1) {
        const { call } = liquidityActions[index];
        setCompletedStepCount(stepOffset + index);
        setSequentialStepPhase("wallet");
        const hash = await walletClient.sendTransaction({
          account: address,
          chain: robinhood,
          to: call.to,
          data: call.data,
          value: call.value,
        });
        setSequentialStepPhase("confirming");
        receipts.push(await client.waitForTransactionReceipt({ hash }));
        setCompletedStepCount(stepOffset + index + 1);
      }
      const finalReceipt = receipts.at(-1);
      setTxHash(finalReceipt?.transactionHash ?? null);
      setPositionTokenId(getMintedTokenId(receipts));
      setEthAmount("");
      setTokenAmount("");
      setStatus("success");
      await refreshRobinState();
    } catch (submitError) {
      setStatus("idle");
      setError(cleanLiquidityError(submitError));
    }
  };

  const openReview = () => {
    setReviewed(true);
    setError("");
    window.requestAnimationFrame(() => {
      rangeSelectorRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
    });
  };

  const setBalancePercentage = (side: "eth" | "token", percentage: number) => {
    const reserve = 2_000_000_000_000_000n;
    const availableEth =
      robinState.ethBalance > reserve ? robinState.ethBalance - reserve : 0n;
    const anchorBalance =
      side === "eth"
        ? percentage === 100
          ? availableEth
          : robinState.ethBalance
        : robinState.tokenBalance;
    const anchorAmount = (anchorBalance * BigInt(percentage)) / 100n;
    if (requiredSides === "both" && ticks) {
      let paired = getAmountsForAnchor({
        currentTick: executableTick,
        tickLower: ticks.tickLower,
        tickUpper: ticks.tickUpper,
        anchor: side,
        amount: anchorAmount,
      });
      if (side === "eth" && paired.amountToken > robinState.tokenBalance) {
        paired = getAmountsForAnchor({
          currentTick: executableTick,
          tickLower: ticks.tickLower,
          tickUpper: ticks.tickUpper,
          anchor: "token",
          amount: robinState.tokenBalance,
        });
      } else if (side === "token" && paired.amountEth > availableEth) {
        paired = getAmountsForAnchor({
          currentTick: executableTick,
          tickLower: ticks.tickLower,
          tickUpper: ticks.tickUpper,
          anchor: "eth",
          amount: availableEth,
        });
      }
      setEthAmount(formatEther(paired.amountEth));
      setTokenAmount(formatUnits(paired.amountToken, robinState.tokenDecimals));
      setLastEdited(side);
      markFormEdited();
      return;
    }
    if (side === "eth") {
      updateEthAmount(formatEther(anchorAmount));
    } else {
      updateTokenAmount(formatUnits(anchorAmount, robinState.tokenDecimals));
    }
  };

  const liveFdvMarker = Math.max(
    0,
    Math.min(100, (executableFdv / fdvSliderMax) * 100)
  );
  const liveFdvLabelMarker = Math.max(8, Math.min(92, liveFdvMarker));
  const fdvTrackGradient = `linear-gradient(90deg,
    #9F5157 0%,
    #B86668 ${Math.max(0, liveFdvMarker - 1)}%,
    #767A77 ${liveFdvMarker}%,
    #61966B ${Math.min(100, liveFdvMarker + 1)}%,
    #73AD78 100%)`;
  const activeExecutionStep = executionSteps[completedStepCount];
  const activeExecutionStepNumber = Math.min(
    completedStepCount + 1,
    executionSteps.length
  );

  return (
    <Box
      role="tabpanel"
      id="workflow-panel-liquidity"
      aria-labelledby="workflow-tab-liquidity"
      maxW="container.lg"
      mx="auto"
    >
      <Box
        bg="bg.subtle"
        border="1px solid"
        borderColor="border.default"
        borderRadius="xl"
        overflow="hidden"
      >
        <Box
          p={{ base: 5, md: 7 }}
          borderBottom="1px solid"
          borderColor="border.default"
        >
          <Box>
            <Flex
              justify="space-between"
              align="center"
              flexWrap="wrap"
              columnGap={8}
              rowGap={4}
              mb={5}
            >
              <Flex
                align="center"
                flex="1 1 320px"
                minW={0}
                gap={2}
                flexWrap="wrap"
              >
                <Heading
                  as="h1"
                  fontSize={{ base: "2xl", md: "3xl" }}
                  color="text.primary"
                  lineHeight="1.15"
                >
                  Seed {deployment.symbol} liquidity
                </Heading>
              </Flex>
              {mounted ? (
                <Box flexShrink={0} maxW="100%" ml="auto">
                  <ConnectButton expectedChainId={ROBINHOOD_CHAIN_ID} />
                </Box>
              ) : null}
            </Flex>
            <Flex
              justify="space-between"
              align="flex-end"
              flexWrap="wrap"
              columnGap={8}
              rowGap={5}
            >
              <Box minW={0} flex="1 1 520px">
                <Text color="text.secondary">
                  A canonical ETH / {deployment.symbol} market on Robinhood
                  Chain.
                </Text>
                <RegisteredTokenList
                  deployment={deployment}
                  onSelect={onSelectDeployment}
                />
              </Box>
              <Stack align="center" spacing={2} flexShrink={0} ml="auto" pb={1}>
                <HStack>
                  <TokenLogo
                    src="/tokenIcons/eth.png"
                    alt="Ethereum"
                    size="32px"
                  />
                  <Text color="text.tertiary">/</Text>
                  {tokenLogo ? (
                    <TokenLogo
                      src={tokenLogo}
                      alt={deployment.symbol}
                      size="32px"
                    />
                  ) : (
                    <Box
                      boxSize="32px"
                      borderRadius="full"
                      bg="#C8FF3D"
                      color="black"
                      display="grid"
                      placeItems="center"
                      fontWeight="800"
                    >
                      {deployment.symbol.slice(0, 1)}
                    </Box>
                  )}
                </HStack>
                <Badge colorScheme="green">1% fee tier pool</Badge>
              </Stack>
            </Flex>
          </Box>
        </Box>

        <Stack p={{ base: 5, md: 7 }} spacing={6}>
          <MarketReference
            market={market}
            loading={marketLoading}
            error={marketError}
            manualFdv={manualFdv}
            onManualFdv={(value) => {
              setManualFdv(value);
              markFormEdited();
            }}
            onRefresh={() => void fetchMarket(true)}
            symbol={deployment.symbol}
            referenceFdv={referenceFdv}
          />

          {lowLiquidity ? (
            <Alert
              status="warning"
              bg="rgba(245,158,11,.10)"
              border="1px solid"
              borderColor="rgba(251,191,36,.30)"
              color="text.primary"
              borderRadius="lg"
            >
              <AlertIcon color="#FBBF24" />
              <Text fontSize="sm">
                The Base reference pool has less than{" "}
                {formatUsd(LOW_LIQUIDITY_USD, true)} of liquidity. Review the
                source price carefully.
              </Text>
            </Alert>
          ) : null}
          {hasPriceDrift ? (
            <Alert
              status="warning"
              bg="rgba(245,158,11,.10)"
              border="1px solid"
              borderColor="rgba(251,191,36,.30)"
              color="text.primary"
              borderRadius="lg"
            >
              <AlertIcon color="#FBBF24" />
              <Box>
                <Text fontWeight="600">
                  Robinhood price differs by {Math.abs(drift * 100).toFixed(1)}%
                </Text>
                <Text fontSize="sm">
                  Deposits use the live Robinhood price. FDV labels remain based
                  on Base total supply.
                </Text>
              </Box>
            </Alert>
          ) : null}
          {requiredSides !== "eth" &&
          robinState.tokenBalance === 0n &&
          address ? (
            <Alert
              status="info"
              bg="rgba(59,130,246,.10)"
              border="1px solid"
              borderColor="rgba(96,165,250,.30)"
              borderRadius="lg"
            >
              <AlertIcon color="#60A5FA" />
              <Box flex={1}>
                <Text color="text.primary" fontWeight="600">
                  Bridge {deployment.symbol} first
                </Text>
                <Text color="text.secondary" fontSize="sm">
                  This position needs {deployment.symbol} on Robinhood Chain.
                </Text>
              </Box>
              <Button size="sm" variant="secondary" onClick={onOpenBridge}>
                Open bridge
              </Button>
            </Alert>
          ) : null}

          <Box ref={rangeSelectorRef} scrollMarginTop={{ base: 4, md: 6 }}>
            <Flex
              role="tablist"
              aria-label="Position range"
              p="3px"
              bg="blackAlpha.300"
              border="1px solid"
              borderColor="border.default"
              borderRadius="lg"
            >
              {(["full", "concentrated"] as const).map((item) => (
                <Button
                  key={item}
                  role="tab"
                  aria-selected={mode === item}
                  variant="ghost"
                  flex={1}
                  h="42px"
                  bg={mode === item ? "whiteAlpha.100" : "transparent"}
                  color={mode === item ? "text.primary" : "text.secondary"}
                  onClick={() => {
                    setMode(item);
                    markFormEdited();
                  }}
                >
                  {item === "full" ? "Full range" : "Concentrated range"}
                </Button>
              ))}
            </Flex>
          </Box>

          {mode === "concentrated" ? (
            <Box
              p={5}
              bg="whiteAlpha.50"
              border="1px solid"
              borderColor="whiteAlpha.200"
              borderRadius="lg"
            >
              <Flex justify="space-between" align="center" mb={4}>
                <Box>
                  <Text color="text.primary" fontWeight="600">
                    Market-cap range
                  </Text>
                  <Text color="text.secondary" fontSize="sm">
                    FDV uses the full Base token supply.
                  </Text>
                </Box>
                <Badge
                  colorScheme={requiredSides === "both" ? "green" : "blue"}
                >
                  {requiredSides === "both"
                    ? "Two-sided"
                    : requiredSides === "eth"
                      ? "ETH only"
                      : `${deployment.symbol} only`}
                </Badge>
              </Flex>
              <Grid templateColumns={{ base: "1fr", sm: "1fr 1fr" }} gap={3}>
                <FdvInput
                  label="Minimum FDV"
                  value={minFdv}
                  currentFdv={executableFdv}
                  onChange={(value) => {
                    setMinFdv(value);
                    markFormEdited();
                  }}
                />
                <FdvInput
                  label="Maximum FDV"
                  value={maxFdv}
                  currentFdv={executableFdv}
                  onChange={(value) => {
                    setMaxFdv(value);
                    markFormEdited();
                  }}
                />
              </Grid>
              <Box mt={7} px={1}>
                <Box
                  position="relative"
                  h="28px"
                  display="flex"
                  alignItems="center"
                >
                  <RangeSlider
                    aria-label={["Minimum FDV", "Maximum FDV"]}
                    min={0}
                    max={fdvSliderMax}
                    step={fdvSliderStep}
                    minStepsBetweenThumbs={1}
                    value={[sliderMin, sliderMax]}
                    onChange={([nextMin, nextMax]) => {
                      setMinFdv(String(nextMin));
                      setMaxFdv(String(nextMax));
                      markFormEdited();
                    }}
                    position="relative"
                    zIndex={2}
                  >
                    <RangeSliderTrack h="8px" bg={fdvTrackGradient}>
                      <RangeSliderFilledTrack bg="rgba(255,255,255,.13)" />
                    </RangeSliderTrack>
                    <RangeSliderThumb
                      index={0}
                      boxSize="20px"
                      bg="#C56B6E"
                      border="3px solid"
                      borderColor="bg.subtle"
                      boxShadow="0 0 0 1px rgba(255,255,255,.28)"
                    />
                    <RangeSliderThumb
                      index={1}
                      boxSize="20px"
                      bg="#73AD78"
                      border="3px solid"
                      borderColor="bg.subtle"
                      boxShadow="0 0 0 1px rgba(255,255,255,.28)"
                    />
                  </RangeSlider>
                  <Box
                    aria-hidden="true"
                    position="absolute"
                    zIndex={3}
                    left={`${liveFdvMarker}%`}
                    top="50%"
                    transform="translate(-50%, -50%)"
                    w="2px"
                    h="28px"
                    bg="white"
                    borderRadius="full"
                    boxShadow="0 0 0 1px rgba(0,0,0,.45), 0 0 10px rgba(255,255,255,.25)"
                    pointerEvents="none"
                  />
                </Box>
                <Box
                  position="relative"
                  h="22px"
                  mt={1}
                  color="text.tertiary"
                  fontSize="xs"
                >
                  <Text position="absolute" left={0}>
                    $0
                  </Text>
                  <Text
                    position="absolute"
                    left={`${liveFdvLabelMarker}%`}
                    transform="translateX(-50%)"
                    color="text.secondary"
                    whiteSpace="nowrap"
                  >
                    Current {formatUsd(executableFdv, true)}
                  </Text>
                  <Text position="absolute" right={0}>
                    {formatUsd(fdvSliderMax, true)}
                  </Text>
                </Box>
                <Flex justify="space-between" mt={1} fontSize="xs">
                  <Text color="#D17A7D">
                    Min {formatUsd(minFdvNumber, true)}
                  </Text>
                  <Text color="#82BE87">
                    Max {formatUsd(maxFdvNumber, true)}
                  </Text>
                </Flex>
              </Box>
              {minFdvNumber && maxFdvNumber && minFdvNumber >= maxFdvNumber ? (
                <Text color="error.text" fontSize="sm" mt={3}>
                  Maximum FDV must be greater than minimum FDV.
                </Text>
              ) : null}
            </Box>
          ) : (
            <HStack
              p={4}
              bg="whiteAlpha.50"
              border="1px solid"
              borderColor="whiteAlpha.200"
              borderRadius="lg"
              color="text.secondary"
            >
              <TrendingUp size={18} />
              <Text fontSize="sm">
                Your position stays active across the entire possible price
                range.
              </Text>
            </HStack>
          )}

          <Box>
            <Flex justify="space-between" mb={3}>
              <Text color="text.primary" fontWeight="600">
                Deposit amounts
              </Text>
              <Text color="text.tertiary" fontSize="sm">
                1 ETH ={" "}
                {tokenUsd > 0
                  ? (market!.ethUsd / tokenUsd).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })
                  : "—"}{" "}
                {deployment.symbol}
              </Text>
            </Flex>
            <Stack spacing={3}>
              {requiredSides !== "token" ? (
                <AmountInput
                  label="ETH"
                  value={ethAmount}
                  balance={formatTokenAmount(robinState.ethBalance, 18)}
                  usdValue={
                    parsePositiveNumber(ethAmount) * (market?.ethUsd ?? 0)
                  }
                  onChange={updateEthAmount}
                  onPercentage={(percentage) =>
                    setBalancePercentage("eth", percentage)
                  }
                  isInvalid={exceedsEthBalance}
                  icon="/tokenIcons/eth.png"
                />
              ) : null}
              {requiredSides !== "eth" ? (
                <AmountInput
                  label={deployment.symbol}
                  value={tokenAmount}
                  balance={formatTokenAmount(
                    robinState.tokenBalance,
                    robinState.tokenDecimals
                  )}
                  usdValue={parsePositiveNumber(tokenAmount) * tokenUsd}
                  onChange={updateTokenAmount}
                  onPercentage={(percentage) =>
                    setBalancePercentage("token", percentage)
                  }
                  isInvalid={exceedsTokenBalance}
                  icon={tokenLogo}
                />
              ) : null}
            </Stack>
          </Box>

          {error ? (
            <Alert
              status="error"
              bg="rgba(239,68,68,.10)"
              border="1px solid"
              borderColor="rgba(248,113,113,.34)"
              color="#FECACA"
              borderRadius="lg"
            >
              <AlertIcon color="#F87171" />
              <Text fontSize="sm" overflowWrap="anywhere">
                {error}
              </Text>
            </Alert>
          ) : null}

          {reviewed && status !== "success" ? (
            <Box
              p={5}
              border="1px solid"
              borderColor="whiteAlpha.200"
              borderRadius="lg"
              bg="blackAlpha.200"
            >
              <Text color="text.primary" fontWeight="700" mb={3}>
                Review position
              </Text>
              <SummaryRow
                label="Pool"
                value={`ETH / ${deployment.symbol} · 1%`}
              />
              <SummaryRow
                label="Pool state"
                value={
                  robinState.initialized
                    ? "Existing pool"
                    : "Create at Base price"
                }
              />
              <SummaryRow
                label="Range"
                value={
                  mode === "full"
                    ? "Full range"
                    : `${formatUsd(concentratedRange?.effectiveMinFdvUsd, true)} – ${formatUsd(concentratedRange?.effectiveMaxFdvUsd, true)} FDV`
                }
              />
              <SummaryRow
                label="Deposit"
                value={`${ethAmount || "0"} ETH + ${tokenAmount || "0"} ${deployment.symbol}`}
              />
              <Divider my={4} borderColor="whiteAlpha.200" />
              <HStack color="text.tertiary" fontSize="xs">
                <ShieldCheck size={14} />
                <Text>
                  {supportsBatch
                    ? "Approvals and mint will be submitted atomically."
                    : "Each required transaction will be confirmed in order."}
                </Text>
              </HStack>
            </Box>
          ) : null}

          {executionMode === "sequential" &&
          status === "confirming" &&
          executionSteps.length > 0 ? (
            <Box
              p={5}
              border="1px solid"
              borderColor="rgba(96,165,250,.30)"
              borderRadius="lg"
              bg="rgba(59,130,246,.07)"
              aria-live="polite"
            >
              <Flex justify="space-between" align="center" gap={4} mb={4}>
                <Box>
                  <Text color="text.primary" fontWeight="700">
                    Transaction progress
                  </Text>
                  <Text color="text.secondary" fontSize="sm" mt={1}>
                    Confirm each request in your wallet. Keep this tab open.
                  </Text>
                </Box>
                <Text color="primary.300" fontSize="sm" whiteSpace="nowrap">
                  {Math.min(completedStepCount, executionSteps.length)} of{" "}
                  {executionSteps.length} complete
                </Text>
              </Flex>
              <Stack spacing={2}>
                {executionSteps.map((step, index) => {
                  const isComplete = index < completedStepCount;
                  const isActive = index === completedStepCount;
                  return (
                    <Flex
                      key={`${index}-${step}`}
                      align="center"
                      gap={3}
                      px={3}
                      py={2.5}
                      borderRadius="md"
                      bg={isActive ? "whiteAlpha.100" : "transparent"}
                      color={
                        isComplete || isActive
                          ? "text.primary"
                          : "text.tertiary"
                      }
                    >
                      <Flex
                        w="24px"
                        h="24px"
                        align="center"
                        justify="center"
                        flexShrink={0}
                        borderRadius="full"
                        bg={
                          isComplete ? "rgba(74,222,128,.16)" : "blackAlpha.300"
                        }
                        color={isComplete ? "#4ADE80" : "primary.300"}
                        fontSize="xs"
                        fontWeight="700"
                      >
                        {isComplete ? (
                          <CheckCircle2 size={16} />
                        ) : isActive ? (
                          <Spinner size="xs" thickness="2px" />
                        ) : (
                          index + 1
                        )}
                      </Flex>
                      <Text fontSize="sm" fontWeight={isActive ? "700" : "500"}>
                        {step}
                      </Text>
                      {isActive ? (
                        <Text ml="auto" color="primary.300" fontSize="xs">
                          {sequentialStepPhase === "wallet"
                            ? "Confirm in wallet"
                            : "Confirming onchain"}
                        </Text>
                      ) : null}
                    </Flex>
                  );
                })}
              </Stack>
            </Box>
          ) : null}

          {status === "success" && txHash ? (
            <Alert
              status="success"
              bg="rgba(34,197,94,.10)"
              border="1px solid"
              borderColor="rgba(74,222,128,.34)"
              borderRadius="lg"
              color="text.primary"
            >
              <CheckCircle2 size={20} color="#4ADE80" />
              <Box ml={3}>
                <Text color="#86EFAC" fontWeight="700">
                  Liquidity position created
                  {positionTokenId ? ` · #${positionTokenId}` : ""}
                </Text>
                <Link
                  href={`https://robinhoodchain.blockscout.com/tx/${txHash}`}
                  isExternal
                  color="primary.300"
                  fontSize="sm"
                >
                  View transaction{" "}
                  <ExternalLink size={12} style={{ display: "inline" }} />
                </Link>
              </Box>
            </Alert>
          ) : null}

          {!isConnected || !address ? (
            <Box
              display="flex"
              justifyContent="center"
              p={3}
              bg="whiteAlpha.50"
              border="1px solid"
              borderColor="whiteAlpha.200"
              borderRadius="lg"
            >
              <ConnectButton expectedChainId={ROBINHOOD_CHAIN_ID} hideChain />
            </Box>
          ) : reviewed ? (
            <Button
              variant="primary"
              size="lg"
              w="full"
              isDisabled={!canReview || status !== "idle"}
              onClick={() => void submitLiquidity()}
              rightIcon={
                status === "idle" ? (
                  <ArrowRight size={18} />
                ) : (
                  <Spinner size="sm" />
                )
              }
            >
              {status === "preparing"
                ? "Refreshing prices…"
                : status === "submitting"
                  ? "Confirm batch…"
                  : status === "confirming"
                    ? executionMode === "sequential" && activeExecutionStep
                      ? `${
                          sequentialStepPhase === "wallet"
                            ? activeExecutionStep
                            : `Confirming ${activeExecutionStep.toLowerCase()}`
                        } · ${activeExecutionStepNumber} of ${executionSteps.length}`
                      : "Creating position…"
                    : status === "success"
                      ? "Position created"
                      : robinState.initialized
                        ? "Confirm liquidity"
                        : "Create pool & add liquidity"}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              w="full"
              isDisabled={!canReview}
              onClick={openReview}
              rightIcon={<ArrowRight size={18} />}
            >
              Review liquidity
            </Button>
          )}

          <HStack justify="center" color="text.tertiary" fontSize="xs">
            <Info size={13} />
            <Text>
              Uniswap v4 · Native ETH settlement · Position NFT sent to your
              wallet
            </Text>
          </HStack>
        </Stack>
      </Box>
    </Box>
  );
}

function MarketReference({
  market,
  loading,
  error,
  manualFdv,
  onManualFdv,
  onRefresh,
  symbol,
  referenceFdv,
}: {
  market: RobinMarketData | null;
  loading: boolean;
  error: string;
  manualFdv: string;
  onManualFdv: (value: string) => void;
  onRefresh: () => void;
  symbol: string;
  referenceFdv: number;
}) {
  return (
    <Box
      p={5}
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="border.default"
      borderRadius="lg"
    >
      <Flex justify="space-between" align="flex-start" gap={4}>
        <Box>
          <HStack spacing={2}>
            <Text color="text.primary" fontWeight="700">
              Base price reference
            </Text>
            <Badge variant="subtle" bg="whiteAlpha.100" color="text.secondary">
              FDV
            </Badge>
          </HStack>
          <Text color="text.secondary" fontSize="sm" mt={1}>
            Full Base supply × {symbol} price
          </Text>
        </Box>
        <Button
          variant="ghost"
          size="sm"
          p={1}
          minW={8}
          onClick={onRefresh}
          isDisabled={loading}
          aria-label="Refresh market data"
        >
          <RefreshCw size={15} />
        </Button>
      </Flex>
      {loading && !market ? (
        <Flex py={5} justify="center">
          <Spinner size="sm" />
        </Flex>
      ) : error && !market ? (
        <Text color="error.text" fontSize="sm" mt={4}>
          {error}
        </Text>
      ) : (
        <>
          <Grid
            templateColumns={{ base: "1fr 1fr", md: "repeat(3, 1fr)" }}
            gap={4}
            mt={5}
          >
            <Box>
              <Text color="text.tertiary" fontSize="xs">
                Current FDV
              </Text>
              <Text color="text.primary" fontSize="xl" fontWeight="700">
                {referenceFdv
                  ? formatUsd(referenceFdv, true)
                  : "Needs a reference"}
              </Text>
            </Box>
            <Box>
              <Text color="text.tertiary" fontSize="xs">
                {symbol} price
              </Text>
              <Text color="text.primary" fontWeight="600">
                {formatUsd(
                  market?.tokenUsd ??
                    (referenceFdv && market
                      ? referenceFdv / Number(market.totalSupply)
                      : null)
                )}
              </Text>
            </Box>
            <Box>
              <Text color="text.tertiary" fontSize="xs">
                ETH price
              </Text>
              <Text color="text.primary" fontWeight="600">
                {formatUsd(market?.ethUsd)}
              </Text>
            </Box>
          </Grid>
          {market && !market.referencePool ? (
            <FormControl mt={5} isRequired>
              <FormLabel color="text.secondary" fontSize="sm">
                Current FDV
              </FormLabel>
              <Input
                value={manualFdv}
                onChange={(event) =>
                  onManualFdv(event.target.value.replace(/[^\d.]/g, ""))
                }
                inputMode="decimal"
                autoComplete="off"
                placeholder="e.g. 25000000"
                bg="blackAlpha.200"
                borderColor="whiteAlpha.200"
              />
              <Text color="text.tertiary" fontSize="xs" mt={2}>
                No Base ETH/WETH pool was found. Enter the current fully diluted
                valuation manually.
              </Text>
            </FormControl>
          ) : null}
          {market?.referencePool ? (
            <Link
              href={`https://www.geckoterminal.com/base/pools/${market.referencePool.address}`}
              isExternal
              display="inline-flex"
              alignItems="center"
              gap={1}
              color="primary.300"
              fontSize="xs"
              mt={4}
            >
              {market.referencePool.name} ·{" "}
              {formatUsd(market.referencePool.reserveUsd, true)} liquidity{" "}
              <ExternalLink size={11} />
            </Link>
          ) : null}
        </>
      )}
    </Box>
  );
}

function FdvInput({
  label,
  value,
  currentFdv,
  onChange,
}: {
  label: string;
  value: string;
  currentFdv: number;
  onChange: (value: string) => void;
}) {
  const numericValue = Number(value.replace(/,/g, ""));
  const delta = value.trim() ? formatFdvDelta(numericValue, currentFdv) : null;
  const deltaColor =
    numericValue < currentFdv
      ? "#D17A7D"
      : numericValue > currentFdv
        ? "#82BE87"
        : "text.secondary";

  return (
    <FormControl>
      <FormLabel color="text.secondary" fontSize="xs">
        {label}
      </FormLabel>
      <InputGroup
        bg="blackAlpha.200"
        border="1px solid"
        borderColor="whiteAlpha.200"
        borderRadius="md"
        overflow="hidden"
      >
        <InputLeftElement h="44px" color="text.tertiary" pointerEvents="none">
          $
        </InputLeftElement>
        <Input
          value={formatFdvInput(value)}
          onChange={(event) => onChange(sanitizeFdvInput(event.target.value))}
          inputMode="decimal"
          autoComplete="off"
          variant="unstyled"
          h="44px"
          pl={10}
          pr={delta ? 20 : 3}
          fontFamily="mono"
        />
        {delta ? (
          <InputRightElement
            h="44px"
            w="72px"
            color={deltaColor}
            pointerEvents="none"
          >
            <Text fontSize="xs" fontWeight="700" fontFamily="mono">
              {delta}
            </Text>
          </InputRightElement>
        ) : null}
      </InputGroup>
    </FormControl>
  );
}

function AmountInput({
  label,
  value,
  balance,
  usdValue,
  onChange,
  onPercentage,
  isInvalid,
  icon,
}: {
  label: string;
  value: string;
  balance: string;
  usdValue: number;
  onChange: (value: string) => void;
  onPercentage: (percentage: number) => void;
  isInvalid: boolean;
  icon?: string;
}) {
  return (
    <FormControl
      isInvalid={isInvalid}
      p={4}
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor={isInvalid ? "red.400" : "whiteAlpha.200"}
      borderRadius="lg"
    >
      <Flex
        justify="space-between"
        align="center"
        gap={2}
        flexWrap="wrap"
        mb={2}
      >
        <HStack>
          {icon ? (
            <TokenLogo src={icon} size="26px" />
          ) : (
            <Box
              boxSize="26px"
              display="grid"
              placeItems="center"
              bg="#C8FF3D"
              color="black"
              borderRadius="full"
              fontWeight="800"
            >
              {label.slice(0, 1)}
            </Box>
          )}
          <Text color="text.primary" fontWeight="600">
            {label}
          </Text>
        </HStack>
        <HStack spacing={1} ml="auto" flexWrap="wrap" justify="flex-end">
          {BALANCE_PERCENTAGES.map((percentage) => (
            <Button
              key={percentage}
              variant="ghost"
              size="xs"
              minW="auto"
              px={1.5}
              color="primary.300"
              aria-label={`Use ${percentage}% of ${label} balance`}
              onClick={() => onPercentage(percentage)}
            >
              {percentage}%
            </Button>
          ))}
          <Button
            variant="ghost"
            size="xs"
            color="text.secondary"
            onClick={() => onPercentage(100)}
          >
            Balance {balance}
          </Button>
        </HStack>
      </Flex>
      <Flex align="flex-end" gap={3}>
        <Input
          value={value}
          onChange={(event) =>
            onChange(event.target.value.replace(/[^\d.]/g, ""))
          }
          placeholder="0.00"
          inputMode="decimal"
          autoComplete="off"
          variant="unstyled"
          fontFamily="mono"
          fontSize="2xl"
          fontWeight="600"
        />
        <Text color="text.tertiary" fontSize="sm" pb={1}>
          {formatUsd(usdValue)}
        </Text>
      </Flex>
      <FormErrorMessage>Amount exceeds wallet balance.</FormErrorMessage>
    </FormControl>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <Flex justify="space-between" gap={4} py={1.5} fontSize="sm">
      <Text color="text.secondary">{label}</Text>
      <Text color="text.primary" textAlign="right" fontWeight="500">
        {value}
      </Text>
    </Flex>
  );
}
