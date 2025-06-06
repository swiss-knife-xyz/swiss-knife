import { Address, formatUnits, parseUnits } from "viem";
import { TickMath } from "@uniswap/v3-sdk";
import { MIN_TICK, MAX_TICK, Q96, Q192 } from "./constants";

export interface PoolKey {
  currency0: Address;
  currency1: Address;
  fee: number;
  tickSpacing: number;
  hooks: Address;
}

// Helper function to get nearest usable tick
export const getNearestUsableTick = (
  tick: number,
  tickSpacing: number
): number => {
  const rounded = Math.round(tick / tickSpacing) * tickSpacing;
  return Math.max(MIN_TICK, Math.min(MAX_TICK, rounded));
};

// Helper function to convert price to sqrtPriceX96
export const priceToSqrtPriceX96 = (
  price: number,
  decimals0: number,
  decimals1: number,
  isDirection1Per0: boolean = true
): bigint => {
  // Calculate the effective price considering direction
  let effectivePrice = price;

  // If direction is false (currency0 per currency1),
  // we need to invert for sqrtPriceX96 calculation
  if (!isDirection1Per0) {
    effectivePrice = 1 / effectivePrice;
  }

  const adjustedPrice = (effectivePrice * 10 ** decimals1) / 10 ** decimals0;
  const sqrtPrice = Math.sqrt(adjustedPrice);
  return BigInt(Math.round(sqrtPrice * Number(Q96)));
};

/**
 * Returns a precise maximum amount of liquidity received for a given amount of token 0 by dividing by Q64 instead of Q96 in the intermediate step,
 * and shifting the subtracted ratio left by 32 bits.
 * @param sqrtRatioAX96 The price at the lower boundary
 * @param sqrtRatioBX96 The price at the upper boundary
 * @param amount0 The token0 amount
 * @returns liquidity for amount0, precise
 */
export function maxLiquidityForAmount0Precise(
  sqrtRatioAX96: bigint,
  sqrtRatioBX96: bigint,
  amount0: bigint
): bigint {
  if (sqrtRatioAX96 > sqrtRatioBX96) {
    [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
  }

  const numerator = amount0 * sqrtRatioAX96 * sqrtRatioBX96;
  const denominator = Q96 * (sqrtRatioBX96 - sqrtRatioAX96);

  return numerator / denominator;
}

/**
 * Computes the maximum amount of liquidity received for a given amount of token1
 * @param sqrtRatioAX96 The price at the lower tick boundary
 * @param sqrtRatioBX96 The price at the upper tick boundary
 * @param amount1 The token1 amount
 * @returns liquidity for amount1
 */
export function maxLiquidityForAmount1(
  sqrtRatioAX96: bigint,
  sqrtRatioBX96: bigint,
  amount1: bigint
): bigint {
  if (sqrtRatioAX96 > sqrtRatioBX96) {
    [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
  }
  return (amount1 * Q96) / (sqrtRatioBX96 - sqrtRatioAX96);
}

// Accurate liquidity calculation using Uniswap v3 SDK
export const getLiquidityFromAmounts = (params: {
  currentTick: number;
  tickLower: number;
  tickUpper: number;
  amount0: bigint;
  amount1: bigint;
}) => {
  const sqrtRatioCurrentX96 = BigInt(
    TickMath.getSqrtRatioAtTick(params.currentTick).toString()
  );
  let sqrtRatioAX96 = BigInt(
    TickMath.getSqrtRatioAtTick(params.tickLower).toString()
  );
  let sqrtRatioBX96 = BigInt(
    TickMath.getSqrtRatioAtTick(params.tickUpper).toString()
  );

  if (sqrtRatioAX96 > sqrtRatioBX96) {
    [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
  }

  if (sqrtRatioCurrentX96 <= sqrtRatioAX96) {
    return maxLiquidityForAmount0Precise(
      sqrtRatioAX96,
      sqrtRatioBX96,
      params.amount0
    );
  } else if (sqrtRatioCurrentX96 < sqrtRatioBX96) {
    const liquidity0 = maxLiquidityForAmount0Precise(
      sqrtRatioCurrentX96,
      sqrtRatioBX96,
      params.amount0
    );
    const liquidity1 = maxLiquidityForAmount1(
      sqrtRatioAX96,
      sqrtRatioCurrentX96,
      params.amount1
    );
    return liquidity0 < liquidity1 ? liquidity0 : liquidity1;
  } else {
    return maxLiquidityForAmount1(sqrtRatioAX96, sqrtRatioBX96, params.amount1);
  }
};

export const getPoolId = (poolKey: PoolKey) => {
  const { keccak256, concat, pad, toHex } = require("viem");

  const packed = concat([
    pad(poolKey.currency0, { size: 32 }),
    pad(poolKey.currency1, { size: 32 }),
    pad(toHex(poolKey.fee), { size: 32 }),
    pad(toHex(poolKey.tickSpacing), { size: 32 }),
    pad(poolKey.hooks, { size: 32 }),
  ]);

  return keccak256(packed);
};

// Helper function to calculate tick from price
export const getTickFromPrice = (price: number): number => {
  // price = 1.0001^tick
  // tick = log(price) / log(1.0001)
  return Math.floor(Math.log(price) / Math.log(1.0001));
};

// Helper function to convert price ratio to tick with decimal handling using Uniswap SDK
export const priceRatioToTick = (
  priceInput: string,
  isDirection1Per0: boolean,
  decimals0: number,
  decimals1: number,
  spacing: number,
  shouldGetNearestUsableTick: boolean = true
): number => {
  if (!priceInput || isNaN(Number(priceInput))) return 0;

  const inputPrice = Number(priceInput);

  try {
    // For Uniswap v3/v4, the tick represents price as: price = 1.0001^tick
    // where price = amount1/amount0 in their raw decimal format

    let priceRatio: number;

    if (isDirection1Per0) {
      // Input is token1 per token0 (e.g., USDC per ETH)
      // Convert from human-readable to raw: divide by (10^decimals0 / 10^decimals1)
      priceRatio = inputPrice / Math.pow(10, decimals0 - decimals1);
    } else {
      // Input is token0 per token1 (e.g., ETH per USDC)
      // Invert to get token1 per token0, then convert to raw
      priceRatio = 1 / inputPrice / Math.pow(10, decimals0 - decimals1);
    }

    // Calculate tick: tick = log(price) / log(1.0001)
    const tick = Math.log(priceRatio) / Math.log(1.0001);

    if (shouldGetNearestUsableTick) {
      return getNearestUsableTick(Math.round(tick), spacing);
    } else {
      return Math.round(tick);
    }
  } catch (error) {
    console.error("Error converting price to tick:", error);
    // Fallback to basic calculation
    const rawTick = getTickFromPrice(inputPrice);
    if (shouldGetNearestUsableTick) {
      return getNearestUsableTick(rawTick, spacing);
    } else {
      return rawTick;
    }
  }
};

// Helper function to convert tick to price ratio with decimal handling using Uniswap SDK
export const tickToPriceRatio = (
  tick: number,
  isDirection1Per0: boolean,
  decimals0: number,
  decimals1: number
): number => {
  try {
    // Calculate price from tick: price = 1.0001^tick
    // This gives us the raw price (amount1/amount0 in their native decimal format)
    const rawPrice = Math.pow(1.0001, tick);

    // Convert from raw price to human-readable price
    if (isDirection1Per0) {
      // Return token1 per token0 (e.g., USDC per ETH)
      // Multiply by (10^decimals0 / 10^decimals1) to get human-readable
      return rawPrice * Math.pow(10, decimals0 - decimals1);
    } else {
      // Return token0 per token1 (e.g., ETH per USDC)
      // Invert and multiply by (10^decimals1 / 10^decimals0)
      return (1 / rawPrice) * Math.pow(10, decimals1 - decimals0);
    }
  } catch (error) {
    console.error("Error converting tick to price:", error);
    // Fallback to basic calculation
    const rawPrice = Math.pow(1.0001, tick);

    if (isDirection1Per0) {
      return rawPrice * Math.pow(10, decimals0 - decimals1);
    } else {
      return (1 / rawPrice) * Math.pow(10, decimals1 - decimals0);
    }
  }
};

// Helper function to validate numeric input
export const isValidNumericInput = (value: string): boolean => {
  if (value === "") return true;
  const num = Number(value);
  return !isNaN(num) && isFinite(num);
};

// Helper function to format balance display
export const formatBalance = (
  balance: bigint | undefined,
  decimals: number
): string => {
  if (balance === undefined) return "-";
  const formatted = formatUnits(balance, decimals);
  // Show up to 6 decimal places, removing trailing zeros
  const num = parseFloat(formatted);
  return num.toLocaleString(undefined, { maximumFractionDigits: 6 });
};

/**
 * Computes the amount of token0 for a given amount of liquidity and price range
 * @param sqrtRatioAX96 The price at the lower tick boundary
 * @param sqrtRatioBX96 The price at the upper tick boundary
 * @param liquidity The liquidity amount
 * @returns amount0 needed for the liquidity
 */
export function getAmount0ForLiquidity(
  sqrtRatioAX96: bigint,
  sqrtRatioBX96: bigint,
  liquidity: bigint
): bigint {
  if (sqrtRatioAX96 > sqrtRatioBX96) {
    [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
  }

  return (
    (liquidity * Q96 * (sqrtRatioBX96 - sqrtRatioAX96)) /
    sqrtRatioAX96 /
    sqrtRatioBX96
  );
}

/**
 * Computes the amount of token1 for a given amount of liquidity and price range
 * @param sqrtRatioAX96 The price at the lower tick boundary
 * @param sqrtRatioBX96 The price at the upper tick boundary
 * @param liquidity The liquidity amount
 * @returns amount1 needed for the liquidity
 */
export function getAmount1ForLiquidity(
  sqrtRatioAX96: bigint,
  sqrtRatioBX96: bigint,
  liquidity: bigint
): bigint {
  if (sqrtRatioAX96 > sqrtRatioBX96) {
    [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
  }

  return (liquidity * (sqrtRatioBX96 - sqrtRatioAX96)) / Q96;
}

/**
 * Calculate the actual amounts needed for a given liquidity
 * This prevents MaximumAmountExceeded errors by ensuring we provide sufficient maximums
 */
export const getAmountsForLiquidity = (params: {
  currentTick: number;
  tickLower: number;
  tickUpper: number;
  liquidity: bigint;
}): { amount0: bigint; amount1: bigint } => {
  // Handle zero liquidity case
  if (params.liquidity === 0n) {
    return { amount0: 0n, amount1: 0n };
  }

  const sqrtRatioCurrentX96 = BigInt(
    TickMath.getSqrtRatioAtTick(params.currentTick).toString()
  );
  let sqrtRatioAX96 = BigInt(
    TickMath.getSqrtRatioAtTick(params.tickLower).toString()
  );
  let sqrtRatioBX96 = BigInt(
    TickMath.getSqrtRatioAtTick(params.tickUpper).toString()
  );

  if (sqrtRatioAX96 > sqrtRatioBX96) {
    [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
  }

  let amount0 = 0n;
  let amount1 = 0n;

  if (sqrtRatioCurrentX96 <= sqrtRatioAX96) {
    // Current price is below the range, only token0 needed
    amount0 = getAmount0ForLiquidity(
      sqrtRatioAX96,
      sqrtRatioBX96,
      params.liquidity
    );
  } else if (sqrtRatioCurrentX96 < sqrtRatioBX96) {
    // Current price is within the range, need both tokens
    amount0 = getAmount0ForLiquidity(
      sqrtRatioCurrentX96,
      sqrtRatioBX96,
      params.liquidity
    );
    amount1 = getAmount1ForLiquidity(
      sqrtRatioAX96,
      sqrtRatioCurrentX96,
      params.liquidity
    );
  } else {
    // Current price is above the range, only token1 needed
    amount1 = getAmount1ForLiquidity(
      sqrtRatioAX96,
      sqrtRatioBX96,
      params.liquidity
    );
  }

  return { amount0, amount1 };
};
