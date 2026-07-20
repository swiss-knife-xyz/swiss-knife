import { TickMath } from "@uniswap/v3-sdk";
import {
  getAmount0ForLiquidity,
  getAmount1ForLiquidity,
  getNearestUsableTick,
  maxLiquidityForAmount0Precise,
  maxLiquidityForAmount1,
  priceRatioToTick,
  tickToPriceRatio,
} from "@/app/uniswap/add-liquidity/lib/utils";
import { MAX_TICK, MIN_TICK } from "@/app/uniswap/lib/constants";

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
  ethUsd: number
) =>
  priceRatioToTick(
    String(fdvToTokenPerEth(fdvUsd, totalSupply, ethUsd)),
    true,
    18,
    18,
    ROBIN_LP_TICK_SPACING,
    false
  );

export const tickToFdv = (
  tick: number,
  totalSupply: number,
  ethUsd: number
) => {
  const tokensPerEth = tickToPriceRatio(tick, true, 18, 18);
  return tokensPerEth > 0 ? (ethUsd / tokensPerEth) * totalSupply : 0;
};

export const fdvRangeToTicks = (
  minFdvUsd: number,
  maxFdvUsd: number,
  totalSupply: number,
  ethUsd: number
) => {
  const tickAtMinFdv =
    minFdvUsd <= 0
      ? getFullRangeTicks(ROBIN_LP_TICK_SPACING).tickUpper
      : fdvToTick(minFdvUsd, totalSupply, ethUsd);
  const tickAtMaxFdv = fdvToTick(maxFdvUsd, totalSupply, ethUsd);
  const tickLower = getNearestUsableTick(
    Math.min(tickAtMinFdv, tickAtMaxFdv),
    ROBIN_LP_TICK_SPACING
  );
  const tickUpper = getNearestUsableTick(
    Math.max(tickAtMinFdv, tickAtMaxFdv),
    ROBIN_LP_TICK_SPACING
  );
  return {
    tickLower,
    tickUpper,
    effectiveMinFdvUsd: tickToFdv(tickUpper, totalSupply, ethUsd),
    effectiveMaxFdvUsd: tickToFdv(tickLower, totalSupply, ethUsd),
  };
};

export const getRequiredLiquiditySides = (
  minFdvUsd: number,
  maxFdvUsd: number,
  executableFdvUsd: number
): RequiredLiquiditySides => {
  if (executableFdvUsd > maxFdvUsd) return "eth";
  if (executableFdvUsd < minFdvUsd) return "token";
  return "both";
};

export const currentTickToFdv = (
  tick: number,
  totalSupply: number,
  ethUsd: number
) => tickToFdv(tick, totalSupply, ethUsd);

export const getAmountsForAnchor = ({
  currentTick,
  tickLower,
  tickUpper,
  anchor,
  amount,
}: {
  currentTick: number;
  tickLower: number;
  tickUpper: number;
  anchor: "eth" | "token";
  amount: bigint;
}) => {
  if (amount <= 0n || tickLower >= tickUpper) {
    return { amountEth: 0n, amountToken: 0n, liquidity: 0n };
  }

  const sqrtCurrent = BigInt(
    TickMath.getSqrtRatioAtTick(currentTick).toString()
  );
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
