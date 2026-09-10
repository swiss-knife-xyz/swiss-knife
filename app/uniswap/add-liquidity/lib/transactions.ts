import {
  Address,
  Hex,
  encodeAbiParameters,
  encodeFunctionData,
  zeroAddress,
  isAddress,
  maxUint128,
} from "viem";
import { TickMath } from "@uniswap/v3-sdk";
import {
  UniV4PM_MintPositionAbi,
  UniV4PM_SettlePairAbi,
  UniV4PM_SweepAbi,
  UniV4PositionManagerAbi,
  V4PMActions,
} from "../../lib/constants";
import { PoolKey } from "./utils";
import { getUsableTickBounds } from "./utils";

const MIN_SQRT_PRICE_X96 = BigInt(TickMath.MIN_SQRT_RATIO.toString());
const MAX_SQRT_PRICE_X96 = BigInt(TickMath.MAX_SQRT_RATIO.toString());

const assertMintPositionParams = ({
  poolKey,
  tickLower,
  tickUpper,
  liquidity,
  amount0Max,
  amount1Max,
  owner,
  hookData,
}: MintPositionActionParams) => {
  if (
    !isAddress(poolKey.currency0) ||
    !isAddress(poolKey.currency1) ||
    BigInt(poolKey.currency0) >= BigInt(poolKey.currency1)
  ) {
    throw new RangeError("Pool currencies must be valid and strictly sorted.");
  }
  if (!isAddress(poolKey.hooks) || !isAddress(owner)) {
    throw new RangeError("Hooks and owner must be valid addresses.");
  }
  const validStaticFee = poolKey.fee >= 0 && poolKey.fee < 1_000_000;
  if (
    !Number.isInteger(poolKey.fee) ||
    (!validStaticFee && poolKey.fee !== 0x800000)
  ) {
    throw new RangeError("Pool fee is not valid for Uniswap v4.");
  }
  const { minTick, maxTick } = getUsableTickBounds(poolKey.tickSpacing);
  if (
    tickLower < minTick ||
    tickUpper > maxTick ||
    tickLower >= tickUpper ||
    tickLower % poolKey.tickSpacing !== 0 ||
    tickUpper % poolKey.tickSpacing !== 0
  ) {
    throw new RangeError("Position ticks must be ordered and spacing-aligned.");
  }
  if (liquidity <= 0n || liquidity > maxUint128) {
    throw new RangeError("Liquidity must be positive and fit uint128.");
  }
  if (
    amount0Max < 0n ||
    amount1Max < 0n ||
    amount0Max > maxUint128 ||
    amount1Max > maxUint128
  ) {
    throw new RangeError("Token maxima must fit uint128.");
  }
  if (!/^0x(?:[0-9a-fA-F]{2})*$/.test(hookData)) {
    throw new RangeError("Hook data must be valid bytes.");
  }
};

export interface MintPositionActionParams {
  poolKey: PoolKey;
  tickLower: number;
  tickUpper: number;
  liquidity: bigint;
  amount0Max: bigint;
  amount1Max: bigint;
  owner: Address;
  hookData: Hex;
}

export const buildMintPositionActionPlan = ({
  poolKey,
  tickLower,
  tickUpper,
  liquidity,
  amount0Max,
  amount1Max,
  owner,
  hookData,
}: MintPositionActionParams): { actions: Hex; params: Hex[] } => {
  assertMintPositionParams({
    poolKey,
    tickLower,
    tickUpper,
    liquidity,
    amount0Max,
    amount1Max,
    owner,
    hookData,
  });
  const actionCodes: string[] = [
    V4PMActions.MINT_POSITION,
    V4PMActions.SETTLE_PAIR,
  ];
  const params: Hex[] = [
    encodeAbiParameters(UniV4PM_MintPositionAbi, [
      poolKey,
      tickLower,
      tickUpper,
      liquidity,
      amount0Max,
      amount1Max,
      owner,
      hookData,
    ]),
    encodeAbiParameters(UniV4PM_SettlePairAbi, [
      {
        currency0: poolKey.currency0,
        currency1: poolKey.currency1,
      },
    ]),
  ];

  // Native currency is sent as msg.value. PositionManager only settles the
  // exact pool debt, so any unused maximum must be returned in the same call.
  if (poolKey.currency0 === zeroAddress || poolKey.currency1 === zeroAddress) {
    actionCodes.push(V4PMActions.SWEEP);
    params.push(encodeAbiParameters(UniV4PM_SweepAbi, [zeroAddress, owner]));
  }

  return {
    actions: `0x${actionCodes.join("")}`,
    params,
  };
};

export const buildAddLiquidityPositionCalldata = ({
  deadline,
  initializeSqrtPriceX96,
  ...mintParams
}: MintPositionActionParams & {
  deadline: bigint;
  initializeSqrtPriceX96?: bigint;
}): Hex => {
  if (deadline <= 0n) throw new RangeError("Deadline must be positive.");
  if (
    initializeSqrtPriceX96 !== undefined &&
    (initializeSqrtPriceX96 < MIN_SQRT_PRICE_X96 ||
      initializeSqrtPriceX96 >= MAX_SQRT_PRICE_X96)
  ) {
    throw new RangeError(
      "Initial square-root price is outside the supported range."
    );
  }
  const { actions, params } = buildMintPositionActionPlan(mintParams);
  const unlockData = encodeAbiParameters(
    [
      { type: "bytes", name: "actions" },
      { type: "bytes[]", name: "params" },
    ],
    [actions, params]
  );
  const modifyLiquiditiesCalldata = encodeFunctionData({
    abi: UniV4PositionManagerAbi,
    functionName: "modifyLiquidities",
    args: [unlockData, deadline],
  });

  if (initializeSqrtPriceX96 === undefined) {
    return modifyLiquiditiesCalldata;
  }

  const initializePoolCalldata = encodeFunctionData({
    abi: UniV4PositionManagerAbi,
    functionName: "initializePool",
    args: [mintParams.poolKey, initializeSqrtPriceX96],
  });

  // The on-chain multicall makes initial price selection and the first mint
  // atomic even when an EIP-5792 wallet executes top-level calls separately.
  return encodeFunctionData({
    abi: UniV4PositionManagerAbi,
    functionName: "multicall",
    args: [[initializePoolCalldata, modifyLiquiditiesCalldata]],
  });
};
