import { TickMath } from "@uniswap/v3-sdk";
import {
  getAmount0ForLiquidity,
  getAmount1ForLiquidity,
  maxLiquidityForAmount0Precise,
  maxLiquidityForAmount1,
  priceToSqrtPriceX96,
  tickToPriceRatio,
} from "@/app/uniswap/add-liquidity/lib/utils";
import { MAX_TICK, MIN_TICK, Q96 } from "@/app/uniswap/lib/constants";

export const ROBIN_LP_FEE = 10_000;
export const ROBIN_LP_TICK_SPACING = 200;

export type RobinMarketData = {
  baseToken: string;
  baseDecimals: number;
  totalSupply: string;
  ethUsd: number;
  tokenUsd: number | null;
  fdvUsd: number | null;
  updatedAt: string;
  referencePool: {
    address: string;
    name: string;
    dex: string;
    reserveUsd: number | null;
    tokenEth: number;
  } | null;
  poolLookupError?: string;
};

export type RequiredLiquiditySides = "eth" | "token" | "both";

const LOG_TICK_BASE = Math.log(1.0001);
const MIN_SQRT_PRICE_X96 = BigInt(TickMath.MIN_SQRT_RATIO.toString());
const MAX_SQRT_PRICE_X96 = BigInt(TickMath.MAX_SQRT_RATIO.toString());

const assertTokenDecimals = (tokenDecimals: number) => {
  if (
    !Number.isInteger(tokenDecimals) ||
    tokenDecimals < 0 ||
    tokenDecimals > 255
  ) {
    throw new RangeError(
      "Token decimals must be an integer between 0 and 255."
    );
  }
};

const fdvToRawTick = (
  fdvUsd: number,
  totalSupply: number,
  ethUsd: number,
  tokenDecimals: number
) => {
  assertTokenDecimals(tokenDecimals);
  const tokenPerEth = fdvToTokenPerEth(fdvUsd, totalSupply, ethUsd);
  const rawTokenPerEth = tokenPerEth * 10 ** (tokenDecimals - 18);
  const tick = Math.log(rawTokenPerEth) / LOG_TICK_BASE;
  if (!Number.isFinite(tick)) {
    throw new RangeError("FDV is outside the supported Uniswap price range.");
  }
  return tick;
};

export const getFullRangeTicks = (spacing = ROBIN_LP_TICK_SPACING) => ({
  tickLower: Math.ceil(MIN_TICK / spacing) * spacing,
  tickUpper: Math.floor(MAX_TICK / spacing) * spacing,
});

export const fdvToTokenPerEth = (
  fdvUsd: number,
  totalSupply: number,
  ethUsd: number
) => {
  if (fdvUsd <= 0 || totalSupply <= 0 || ethUsd <= 0) return 0;
  const tokenUsd = fdvUsd / totalSupply;
  return ethUsd / tokenUsd;
};

export const fdvToTick = (
  fdvUsd: number,
  totalSupply: number,
  ethUsd: number,
  tokenDecimals = 18
) =>
  sqrtPriceX96ToTick(
    fdvToSqrtPriceX96(fdvUsd, totalSupply, ethUsd, tokenDecimals)
  );

export const fdvToSqrtPriceX96 = (
  fdvUsd: number,
  totalSupply: number,
  ethUsd: number,
  tokenDecimals = 18
) => {
  assertTokenDecimals(tokenDecimals);
  const tokenPerEth = fdvToTokenPerEth(fdvUsd, totalSupply, ethUsd);
  if (!tokenPerEth) {
    throw new RangeError("FDV, total supply, and ETH price must be positive.");
  }
  const sqrtPriceX96 = priceToSqrtPriceX96(
    tokenPerEth,
    18,
    tokenDecimals,
    true
  );
  if (sqrtPriceX96 < MIN_SQRT_PRICE_X96 || sqrtPriceX96 >= MAX_SQRT_PRICE_X96) {
    throw new RangeError("FDV is outside the supported Uniswap price range.");
  }
  return sqrtPriceX96;
};

/** Matches Uniswap's greatest-tick-at-or-below-sqrt-price definition. */
export const sqrtPriceX96ToTick = (sqrtPriceX96: bigint) => {
  if (sqrtPriceX96 < MIN_SQRT_PRICE_X96 || sqrtPriceX96 >= MAX_SQRT_PRICE_X96) {
    throw new RangeError(
      "sqrtPriceX96 is outside the supported Uniswap range."
    );
  }

  const sqrtPrice = Number(sqrtPriceX96) / Number(Q96);
  let tick = Math.max(
    MIN_TICK,
    Math.min(
      MAX_TICK - 1,
      Math.floor((2 * Math.log(sqrtPrice)) / LOG_TICK_BASE)
    )
  );

  // Correct the floating-point estimate against the exact TickMath boundaries.
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

export const tickToFdv = (
  tick: number,
  totalSupply: number,
  ethUsd: number,
  tokenDecimals = 18
) => {
  const tokensPerEth = tickToPriceRatio(tick, true, 18, tokenDecimals);
  return tokensPerEth > 0 ? (ethUsd / tokensPerEth) * totalSupply : 0;
};

export const sqrtPriceX96ToFdv = (
  sqrtPriceX96: bigint,
  totalSupply: number,
  ethUsd: number,
  tokenDecimals = 18
) => {
  assertTokenDecimals(tokenDecimals);
  if (sqrtPriceX96 <= 0n || totalSupply <= 0 || ethUsd <= 0) return 0;
  const sqrtPrice = Number(sqrtPriceX96) / Number(Q96);
  const rawTokenPerEth = sqrtPrice * sqrtPrice;
  const tokensPerEth = rawTokenPerEth * 10 ** (18 - tokenDecimals);
  return tokensPerEth > 0 ? (ethUsd / tokensPerEth) * totalSupply : 0;
};

export const fdvRangeToTicks = (
  minFdvUsd: number,
  maxFdvUsd: number,
  totalSupply: number,
  ethUsd: number,
  tokenDecimals = 18
) => {
  const fullRange = getFullRangeTicks(ROBIN_LP_TICK_SPACING);
  const tickAtMinFdv =
    minFdvUsd <= 0
      ? fullRange.tickUpper
      : fdvToRawTick(minFdvUsd, totalSupply, ethUsd, tokenDecimals);
  const tickAtMaxFdv = fdvToRawTick(
    maxFdvUsd,
    totalSupply,
    ethUsd,
    tokenDecimals
  );
  // FDV falls as token1-per-token0 and tick rise. Round both boundaries
  // outward so tick spacing never makes the effective range narrower than
  // the range the user requested.
  const tickLower = Math.max(
    fullRange.tickLower,
    Math.floor(Math.min(tickAtMinFdv, tickAtMaxFdv) / ROBIN_LP_TICK_SPACING) *
      ROBIN_LP_TICK_SPACING
  );
  const tickUpper = Math.min(
    fullRange.tickUpper,
    Math.ceil(Math.max(tickAtMinFdv, tickAtMaxFdv) / ROBIN_LP_TICK_SPACING) *
      ROBIN_LP_TICK_SPACING
  );
  if (tickLower >= tickUpper) return null;

  return {
    tickLower,
    tickUpper,
    effectiveMinFdvUsd: tickToFdv(
      tickUpper,
      totalSupply,
      ethUsd,
      tokenDecimals
    ),
    effectiveMaxFdvUsd: tickToFdv(
      tickLower,
      totalSupply,
      ethUsd,
      tokenDecimals
    ),
  };
};

export const getRequiredLiquiditySides = (
  sqrtPriceX96: bigint,
  tickLower: number,
  tickUpper: number
): RequiredLiquiditySides => {
  const sqrtLower = BigInt(TickMath.getSqrtRatioAtTick(tickLower).toString());
  const sqrtUpper = BigInt(TickMath.getSqrtRatioAtTick(tickUpper).toString());
  if (sqrtPriceX96 <= sqrtLower) return "eth";
  if (sqrtPriceX96 >= sqrtUpper) return "token";
  return "both";
};

export const getAmountsForAnchor = ({
  sqrtPriceX96,
  tickLower,
  tickUpper,
  anchor,
  amount,
}: {
  sqrtPriceX96: bigint;
  tickLower: number;
  tickUpper: number;
  anchor: "eth" | "token";
  amount: bigint;
}) => {
  if (amount <= 0n || tickLower >= tickUpper) {
    return { amountEth: 0n, amountToken: 0n, liquidity: 0n };
  }

  const sqrtCurrent = sqrtPriceX96;
  const sqrtLower = BigInt(TickMath.getSqrtRatioAtTick(tickLower).toString());
  const sqrtUpper = BigInt(TickMath.getSqrtRatioAtTick(tickUpper).toString());

  let liquidity = 0n;
  if (anchor === "eth") {
    if (sqrtCurrent < sqrtUpper) {
      liquidity = maxLiquidityForAmount0Precise(
        sqrtCurrent > sqrtLower ? sqrtCurrent : sqrtLower,
        sqrtUpper,
        amount
      );
    }
  } else if (sqrtCurrent > sqrtLower) {
    liquidity = maxLiquidityForAmount1(
      sqrtLower,
      sqrtCurrent < sqrtUpper ? sqrtCurrent : sqrtUpper,
      amount
    );
  }

  if (liquidity <= 0n) {
    return { amountEth: 0n, amountToken: 0n, liquidity: 0n };
  }

  let amountEth = 0n;
  let amountToken = 0n;
  if (sqrtCurrent <= sqrtLower) {
    amountEth = getAmount0ForLiquidity(sqrtLower, sqrtUpper, liquidity);
  } else if (sqrtCurrent < sqrtUpper) {
    amountEth = getAmount0ForLiquidity(sqrtCurrent, sqrtUpper, liquidity);
    amountToken = getAmount1ForLiquidity(sqrtLower, sqrtCurrent, liquidity);
  } else {
    amountToken = getAmount1ForLiquidity(sqrtLower, sqrtUpper, liquidity);
  }

  return { amountEth, amountToken, liquidity };
};
