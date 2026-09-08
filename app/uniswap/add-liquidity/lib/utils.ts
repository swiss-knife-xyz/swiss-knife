import {
  Address,
  encodeAbiParameters,
  formatUnits,
  keccak256,
  maxUint128,
} from "viem";
import { TickMath } from "@uniswap/v3-sdk";
import { MIN_TICK, MAX_TICK, Q96 } from "../../lib/constants";
import { assertValidRoutePool } from "@/lib/uniswap/quote";

export interface PoolKey {
  currency0: Address;
  currency1: Address;
  fee: number;
  tickSpacing: number;
  hooks: Address;
}

const MIN_SQRT_PRICE_X96 = BigInt(TickMath.MIN_SQRT_RATIO.toString());
const MAX_SQRT_PRICE_X96 = BigInt(TickMath.MAX_SQRT_RATIO.toString());
const LOG_TICK_BASE = Math.log(1.0001);

const assertDecimals = (decimals: number) => {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) {
    throw new RangeError("Token decimals must be an integer from 0 to 255.");
  }
};

const assertTick = (tick: number) => {
  if (!Number.isInteger(tick) || tick < MIN_TICK || tick > MAX_TICK) {
    throw new RangeError(
      `Tick must be an integer from ${MIN_TICK} to ${MAX_TICK}.`
    );
  }
};

const assertTickRange = (tickLower: number, tickUpper: number) => {
  assertTick(tickLower);
  assertTick(tickUpper);
  if (tickLower >= tickUpper) {
    throw new RangeError("Lower tick must be less than upper tick.");
  }
};

const assertSqrtRatioRange = (sqrtRatioAX96: bigint, sqrtRatioBX96: bigint) => {
  if (
    sqrtRatioAX96 < MIN_SQRT_PRICE_X96 ||
    sqrtRatioBX96 > MAX_SQRT_PRICE_X96 ||
    sqrtRatioAX96 >= sqrtRatioBX96
  ) {
    throw new RangeError("Square-root price bounds must be valid and ordered.");
  }
};

export const assertValidTickSpacing = (tickSpacing: number) => {
  if (
    !Number.isInteger(tickSpacing) ||
    tickSpacing <= 0 ||
    tickSpacing > 32_767
  ) {
    throw new RangeError("Tick spacing must be an integer from 1 to 32767.");
  }
};

export const getUsableTickBounds = (tickSpacing: number) => {
  assertValidTickSpacing(tickSpacing);
  return {
    minTick: Math.ceil(MIN_TICK / tickSpacing) * tickSpacing,
    maxTick: Math.floor(MAX_TICK / tickSpacing) * tickSpacing,
  };
};

// Helper function to get nearest usable tick
export const getNearestUsableTick = (
  tick: number,
  tickSpacing: number
): number => {
  if (!Number.isInteger(tick) || !Number.isFinite(tick)) {
    throw new RangeError("Tick must be a finite integer.");
  }
  assertValidTickSpacing(tickSpacing);
  const { minTick, maxTick } = getUsableTickBounds(tickSpacing);
  const boundedTick = Math.max(MIN_TICK, Math.min(MAX_TICK, tick));
  const rounded = Math.round(boundedTick / tickSpacing) * tickSpacing;
  return Math.max(minTick, Math.min(maxTick, rounded));
};

export const snapTickRangeOutward = (
  rawTickA: number,
  rawTickB: number,
  tickSpacing: number
) => {
  if (!Number.isFinite(rawTickA) || !Number.isFinite(rawTickB)) {
    throw new RangeError("Range ticks must be finite.");
  }
  assertValidTickSpacing(tickSpacing);
  const { minTick, maxTick } = getUsableTickBounds(tickSpacing);
  const tickLower = Math.max(
    minTick,
    Math.floor(Math.min(rawTickA, rawTickB) / tickSpacing) * tickSpacing
  );
  const tickUpper = Math.min(
    maxTick,
    Math.ceil(Math.max(rawTickA, rawTickB) / tickSpacing) * tickSpacing
  );
  if (tickLower >= tickUpper) {
    throw new RangeError(
      "Price range is narrower than one usable tick interval."
    );
  }
  return { tickLower, tickUpper };
};

// Helper function to convert price to sqrtPriceX96
export const priceToSqrtPriceX96 = (
  price: number,
  decimals0: number,
  decimals1: number,
  isDirection1Per0: boolean = true
): bigint => {
  assertDecimals(decimals0);
  assertDecimals(decimals1);
  if (!Number.isFinite(price) || price <= 0) {
    throw new RangeError("Price must be finite and positive.");
  }
  // Calculate the effective price considering direction
  let effectivePrice = price;

  // If direction is false (currency0 per currency1),
  // we need to invert for sqrtPriceX96 calculation
  if (!isDirection1Per0) {
    effectivePrice = 1 / effectivePrice;
  }

  const adjustedPrice = (effectivePrice * 10 ** decimals1) / 10 ** decimals0;
  const sqrtPrice = Math.sqrt(adjustedPrice);
  const scaledSqrtPrice = sqrtPrice * Number(Q96);
  if (!Number.isFinite(scaledSqrtPrice)) {
    throw new RangeError("Price is outside the supported Uniswap range.");
  }
  const sqrtPriceX96 = BigInt(Math.round(scaledSqrtPrice));
  if (sqrtPriceX96 < MIN_SQRT_PRICE_X96 || sqrtPriceX96 >= MAX_SQRT_PRICE_X96) {
    throw new RangeError("Price is outside the supported Uniswap range.");
  }
  return sqrtPriceX96;
};

export const sqrtPriceX96ToPrice = (
  sqrtPriceX96: bigint,
  decimals0: number,
  decimals1: number,
  isDirection1Per0 = true
): number => {
  assertDecimals(decimals0);
  assertDecimals(decimals1);
  if (sqrtPriceX96 < MIN_SQRT_PRICE_X96 || sqrtPriceX96 >= MAX_SQRT_PRICE_X96) {
    throw new RangeError("Square-root price is outside the supported range.");
  }
  const rawSqrtPrice = Number(sqrtPriceX96) / Number(Q96);
  const token1PerToken0 =
    rawSqrtPrice * rawSqrtPrice * 10 ** (decimals0 - decimals1);
  const price = isDirection1Per0 ? token1PerToken0 : 1 / token1PerToken0;
  if (!Number.isFinite(price) || price <= 0) {
    throw new RangeError("Price cannot be represented safely.");
  }
  return price;
};

export const sqrtPriceX96ToTick = (sqrtPriceX96: bigint): number => {
  if (sqrtPriceX96 < MIN_SQRT_PRICE_X96 || sqrtPriceX96 >= MAX_SQRT_PRICE_X96) {
    throw new RangeError("Square-root price is outside the supported range.");
  }
  const sqrtPrice = Number(sqrtPriceX96) / Number(Q96);
  let tick = Math.max(
    MIN_TICK,
    Math.min(
      MAX_TICK - 1,
      Math.floor((2 * Math.log(sqrtPrice)) / LOG_TICK_BASE)
    )
  );
  while (
    tick > MIN_TICK &&
    BigInt(TickMath.getSqrtRatioAtTick(tick).toString()) > sqrtPriceX96
  ) {
    tick -= 1;
  }
  while (
    tick < MAX_TICK - 1 &&
    BigInt(TickMath.getSqrtRatioAtTick(tick + 1).toString()) <= sqrtPriceX96
  ) {
    tick += 1;
  }
  return tick;
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
  assertSqrtRatioRange(sqrtRatioAX96, sqrtRatioBX96);
  if (amount0 < 0n) throw new RangeError("Token amount cannot be negative.");

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
  assertSqrtRatioRange(sqrtRatioAX96, sqrtRatioBX96);
  if (amount1 < 0n) throw new RangeError("Token amount cannot be negative.");
  return (amount1 * Q96) / (sqrtRatioBX96 - sqrtRatioAX96);
}

// Accurate liquidity calculation using Uniswap v3 SDK
export const getLiquidityFromAmounts = (params: {
  currentTick: number;
  currentSqrtPriceX96?: bigint;
  tickLower: number;
  tickUpper: number;
  amount0: bigint;
  amount1: bigint;
}) => {
  assertTick(params.currentTick);
  assertTickRange(params.tickLower, params.tickUpper);
  if (params.amount0 < 0n || params.amount1 < 0n) {
    throw new RangeError("Token amounts cannot be negative.");
  }
  const sqrtRatioCurrentX96 =
    params.currentSqrtPriceX96 ??
    BigInt(TickMath.getSqrtRatioAtTick(params.currentTick).toString());
  let sqrtRatioAX96 = BigInt(
    TickMath.getSqrtRatioAtTick(params.tickLower).toString()
  );
  let sqrtRatioBX96 = BigInt(
    TickMath.getSqrtRatioAtTick(params.tickUpper).toString()
  );

  if (
    sqrtRatioCurrentX96 < MIN_SQRT_PRICE_X96 ||
    sqrtRatioCurrentX96 >= MAX_SQRT_PRICE_X96
  ) {
    throw new RangeError(
      "Current square-root price is outside the supported range."
    );
  }

  let liquidity: bigint;
  if (sqrtRatioCurrentX96 <= sqrtRatioAX96) {
    liquidity = maxLiquidityForAmount0Precise(
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
    liquidity = liquidity0 < liquidity1 ? liquidity0 : liquidity1;
  } else {
    liquidity = maxLiquidityForAmount1(
      sqrtRatioAX96,
      sqrtRatioBX96,
      params.amount1
    );
  }
  if (liquidity > maxUint128) {
    throw new RangeError("Liquidity exceeds uint128.");
  }
  return liquidity;
};

export const getPoolId = (poolKey: PoolKey) => {
  assertValidRoutePool({ ...poolKey, hookData: "0x" });
  return keccak256(
    encodeAbiParameters(
      [
        {
          type: "tuple",
          components: [
            { type: "address", name: "currency0" },
            { type: "address", name: "currency1" },
            { type: "uint24", name: "fee" },
            { type: "int24", name: "tickSpacing" },
            { type: "address", name: "hooks" },
          ],
        },
      ],
      [poolKey]
    )
  );
};

export const tryGetPoolId = (poolKey: PoolKey) => {
  try {
    return getPoolId(poolKey);
  } catch {
    return null;
  }
};

// Helper function to calculate tick from price
export const getTickFromPrice = (price: number): number => {
  if (!Number.isFinite(price) || price <= 0) {
    throw new RangeError("Price must be finite and positive.");
  }
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
  if (!priceInput) throw new RangeError("Price is required.");
  const inputPrice = Number(priceInput);
  const tick = sqrtPriceX96ToTick(
    priceToSqrtPriceX96(inputPrice, decimals0, decimals1, isDirection1Per0)
  );
  return shouldGetNearestUsableTick
    ? getNearestUsableTick(tick, spacing)
    : tick;
};

export const priceRangeToTicksOutward = (
  priceA: string,
  priceB: string,
  isDirection1Per0: boolean,
  decimals0: number,
  decimals1: number,
  spacing: number
) => {
  const rawTickA = priceRatioToTick(
    priceA,
    isDirection1Per0,
    decimals0,
    decimals1,
    spacing,
    false
  );
  const rawTickB = priceRatioToTick(
    priceB,
    isDirection1Per0,
    decimals0,
    decimals1,
    spacing,
    false
  );
  return snapTickRangeOutward(rawTickA, rawTickB, spacing);
};

// Helper function to convert tick to price ratio with decimal handling using Uniswap SDK
export const tickToPriceRatio = (
  tick: number,
  isDirection1Per0: boolean,
  decimals0: number,
  decimals1: number
): number => {
  assertTick(tick);
  assertDecimals(decimals0);
  assertDecimals(decimals1);
  // Calculate price from tick: price = 1.0001^tick
  // This gives us the raw price (amount1/amount0 in their native decimal format)
  const rawPrice = Math.pow(1.0001, tick);

  // Convert from raw price to human-readable price
  let price: number;
  if (isDirection1Per0) {
    // Return token1 per token0 (e.g., USDC per ETH)
    // Multiply by (10^decimals0 / 10^decimals1) to get human-readable
    price = rawPrice * Math.pow(10, decimals0 - decimals1);
  } else {
    // Return token0 per token1 (e.g., ETH per USDC)
    // Invert and multiply by (10^decimals1 / 10^decimals0)
    price = (1 / rawPrice) * Math.pow(10, decimals1 - decimals0);
  }
  if (!Number.isFinite(price) || price <= 0) {
    throw new RangeError("Price cannot be represented safely.");
  }
  return price;
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
  liquidity: bigint,
  roundUp = false
): bigint {
  assertSqrtRatioRange(sqrtRatioAX96, sqrtRatioBX96);
  if (liquidity < 0n || liquidity > maxUint128) {
    throw new RangeError("Liquidity must fit uint128 and not be negative.");
  }

  const numerator = liquidity * Q96 * (sqrtRatioBX96 - sqrtRatioAX96);
  const denominator = sqrtRatioAX96 * sqrtRatioBX96;
  return roundUp
    ? (numerator + denominator - 1n) / denominator
    : numerator / denominator;
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
  liquidity: bigint,
  roundUp = false
): bigint {
  assertSqrtRatioRange(sqrtRatioAX96, sqrtRatioBX96);
  if (liquidity < 0n || liquidity > maxUint128) {
    throw new RangeError("Liquidity must fit uint128 and not be negative.");
  }

  const numerator = liquidity * (sqrtRatioBX96 - sqrtRatioAX96);
  return roundUp ? (numerator + Q96 - 1n) / Q96 : numerator / Q96;
}

/**
 * Calculate the actual amounts needed for a given liquidity
 * This prevents MaximumAmountExceeded errors by ensuring we provide sufficient maximums
 */
export const getAmountsForLiquidity = (params: {
  currentTick: number;
  currentSqrtPriceX96?: bigint;
  tickLower: number;
  tickUpper: number;
  liquidity: bigint;
  roundUp?: boolean;
}): { amount0: bigint; amount1: bigint } => {
  assertTick(params.currentTick);
  assertTickRange(params.tickLower, params.tickUpper);
  if (params.liquidity < 0n || params.liquidity > maxUint128) {
    throw new RangeError("Liquidity must fit uint128 and not be negative.");
  }
  // Handle zero liquidity case
  if (params.liquidity === 0n) {
    return { amount0: 0n, amount1: 0n };
  }

  const sqrtRatioCurrentX96 =
    params.currentSqrtPriceX96 ??
    BigInt(TickMath.getSqrtRatioAtTick(params.currentTick).toString());
  let sqrtRatioAX96 = BigInt(
    TickMath.getSqrtRatioAtTick(params.tickLower).toString()
  );
  let sqrtRatioBX96 = BigInt(
    TickMath.getSqrtRatioAtTick(params.tickUpper).toString()
  );

  if (
    sqrtRatioCurrentX96 < MIN_SQRT_PRICE_X96 ||
    sqrtRatioCurrentX96 >= MAX_SQRT_PRICE_X96
  ) {
    throw new RangeError(
      "Current square-root price is outside the supported range."
    );
  }

  let amount0 = 0n;
  let amount1 = 0n;

  if (sqrtRatioCurrentX96 <= sqrtRatioAX96) {
    // Current price is below the range, only token0 needed
    amount0 = getAmount0ForLiquidity(
      sqrtRatioAX96,
      sqrtRatioBX96,
      params.liquidity,
      params.roundUp
    );
  } else if (sqrtRatioCurrentX96 < sqrtRatioBX96) {
    // Current price is within the range, need both tokens
    amount0 = getAmount0ForLiquidity(
      sqrtRatioCurrentX96,
      sqrtRatioBX96,
      params.liquidity,
      params.roundUp
    );
    amount1 = getAmount1ForLiquidity(
      sqrtRatioAX96,
      sqrtRatioCurrentX96,
      params.liquidity,
      params.roundUp
    );
  } else {
    // Current price is above the range, only token1 needed
    amount1 = getAmount1ForLiquidity(
      sqrtRatioAX96,
      sqrtRatioBX96,
      params.liquidity,
      params.roundUp
    );
  }

  return { amount0, amount1 };
};

export const getPairedAmountForInput = ({
  anchor,
  amount,
  currentTick,
  currentSqrtPriceX96,
  tickLower,
  tickUpper,
}: {
  anchor: "amount0" | "amount1";
  amount: bigint;
  currentTick: number;
  currentSqrtPriceX96: bigint;
  tickLower: number;
  tickUpper: number;
}): bigint => {
  if (amount < 0n) throw new RangeError("Token amount cannot be negative.");
  if (amount === 0n) return 0n;
  assertTickRange(tickLower, tickUpper);
  const sqrtLower = BigInt(TickMath.getSqrtRatioAtTick(tickLower).toString());
  const sqrtUpper = BigInt(TickMath.getSqrtRatioAtTick(tickUpper).toString());
  if (
    (anchor === "amount0" && currentSqrtPriceX96 >= sqrtUpper) ||
    (anchor === "amount1" && currentSqrtPriceX96 <= sqrtLower)
  ) {
    return 0n;
  }
  const amount0 = anchor === "amount0" ? amount : maxUint128;
  const amount1 = anchor === "amount1" ? amount : maxUint128;
  const liquidity = getLiquidityFromAmounts({
    currentTick,
    currentSqrtPriceX96,
    tickLower,
    tickUpper,
    amount0,
    amount1,
  });
  if (liquidity === 0n) return 0n;
  const paired = getAmountsForLiquidity({
    currentTick,
    currentSqrtPriceX96,
    tickLower,
    tickUpper,
    liquidity,
    roundUp: true,
  });
  return anchor === "amount0" ? paired.amount1 : paired.amount0;
};
