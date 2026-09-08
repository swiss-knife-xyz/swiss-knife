import { Address, Hex, encodeAbiParameters, encodeFunctionData } from "viem";
import { getAmountsForLiquidity } from "../../add-liquidity/lib/utils";
import {
  DEFAULT_SLIPPAGE_BPS,
  DecreaseLiquidityParamsAbi,
  MAX_SLIPPAGE_BPS,
  TakePairParamsAbi,
  UniV4PositionManagerAbi,
  V4PMActions,
} from "../../lib/constants";
import type { PoolKey } from "../hooks/usePositionDetails";

export const MSG_SENDER =
  "0x0000000000000000000000000000000000000001" as Address;

export interface RemoveLiquidityParams {
  tokenId: bigint;
  liquidity: bigint;
  poolKey: PoolKey;
  tickLower: number;
  tickUpper: number;
  currentSqrtPriceX96: bigint;
  currentTick: number;
  deadline: bigint;
  slippageBps?: number;
  hookData?: Hex;
}

const assertRemoveLiquidityParams = ({
  tokenId,
  liquidity,
  poolKey,
  tickLower,
  tickUpper,
  currentSqrtPriceX96,
  deadline,
  slippageBps,
}: Required<RemoveLiquidityParams>) => {
  if (tokenId < 0n) throw new RangeError("Token ID must not be negative.");
  if (liquidity <= 0n) throw new RangeError("Liquidity must be positive.");
  if (currentSqrtPriceX96 <= 0n) {
    throw new RangeError("Current sqrt price must be positive.");
  }
  if (BigInt(poolKey.currency0) >= BigInt(poolKey.currency1)) {
    throw new RangeError("Pool currencies must be strictly sorted.");
  }
  if ((BigInt(poolKey.hooks) & 1n) !== 0n) {
    throw new RangeError(
      "Positions with after-remove return deltas require hook-specific output quoting."
    );
  }
  if (
    !Number.isInteger(poolKey.tickSpacing) ||
    poolKey.tickSpacing <= 0 ||
    tickLower >= tickUpper ||
    tickLower % poolKey.tickSpacing !== 0 ||
    tickUpper % poolKey.tickSpacing !== 0
  ) {
    throw new RangeError("Position ticks must be ordered and spacing-aligned.");
  }
  if (deadline <= 0n) throw new RangeError("Deadline must be positive.");
  if (
    !Number.isInteger(slippageBps) ||
    slippageBps < 0 ||
    slippageBps > MAX_SLIPPAGE_BPS
  ) {
    throw new RangeError(
      `Slippage must be an integer from 0 to ${MAX_SLIPPAGE_BPS} bps.`
    );
  }
};

export const calculateRemoveLiquidityMinimums = ({
  liquidity,
  currentSqrtPriceX96,
  currentTick,
  tickLower,
  tickUpper,
  slippageBps = DEFAULT_SLIPPAGE_BPS,
}: {
  liquidity: bigint;
  currentSqrtPriceX96: bigint;
  currentTick: number;
  tickLower: number;
  tickUpper: number;
  slippageBps?: number;
}) => {
  if (
    !Number.isInteger(slippageBps) ||
    slippageBps < 0 ||
    slippageBps > MAX_SLIPPAGE_BPS
  ) {
    throw new RangeError(
      `Slippage must be an integer from 0 to ${MAX_SLIPPAGE_BPS} bps.`
    );
  }

  const expected = getAmountsForLiquidity({
    currentTick,
    currentSqrtPriceX96,
    tickLower,
    tickUpper,
    liquidity,
  });
  const retainedBps = 10_000n - BigInt(slippageBps);

  return {
    expectedAmount0: expected.amount0,
    expectedAmount1: expected.amount1,
    amount0Min: (expected.amount0 * retainedBps) / 10_000n,
    amount1Min: (expected.amount1 * retainedBps) / 10_000n,
  };
};

export const buildRemoveLiquidityCalldata = (
  params: RemoveLiquidityParams
): Hex => {
  const normalized = {
    ...params,
    slippageBps: params.slippageBps ?? DEFAULT_SLIPPAGE_BPS,
    hookData: params.hookData ?? ("0x" as Hex),
  };
  assertRemoveLiquidityParams(normalized);

  const { amount0Min, amount1Min } = calculateRemoveLiquidityMinimums({
    liquidity: normalized.liquidity,
    currentSqrtPriceX96: normalized.currentSqrtPriceX96,
    currentTick: normalized.currentTick,
    tickLower: normalized.tickLower,
    tickUpper: normalized.tickUpper,
    slippageBps: normalized.slippageBps,
  });

  const decreaseLiquidityParams = encodeAbiParameters(
    DecreaseLiquidityParamsAbi,
    [
      normalized.tokenId,
      normalized.liquidity,
      amount0Min,
      amount1Min,
      normalized.hookData,
    ]
  );
  const takePairParams = encodeAbiParameters(TakePairParamsAbi, [
    normalized.poolKey.currency0,
    normalized.poolKey.currency1,
    MSG_SENDER,
  ]);
  const actions =
    `0x${V4PMActions.DECREASE_LIQUIDITY}${V4PMActions.TAKE_PAIR}` as Hex;
  const unlockData = encodeAbiParameters(
    [
      { type: "bytes", name: "actions" },
      { type: "bytes[]", name: "params" },
    ],
    [actions, [decreaseLiquidityParams, takePairParams]]
  );

  return encodeFunctionData({
    abi: UniV4PositionManagerAbi,
    functionName: "modifyLiquidities",
    args: [unlockData, normalized.deadline],
  });
};
