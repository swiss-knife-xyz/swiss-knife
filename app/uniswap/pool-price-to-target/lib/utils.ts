import { concat, pad, toHex, keccak256 } from "viem";
import { PoolKey } from "./constants";

export const getPoolId = (poolKey: PoolKey) => {
  // Pack the data in the same order as Solidity struct
  const packed = concat([
    pad(poolKey.currency0, { size: 32 }), // address padded to 32 bytes
    pad(poolKey.currency1, { size: 32 }), // address padded to 32 bytes
    pad(toHex(poolKey.fee), { size: 32 }), // uint24 padded to 32 bytes
    pad(toHex(poolKey.tickSpacing), { size: 32 }), // int24 padded to 32 bytes
    pad(poolKey.hooks, { size: 32 }), // address padded to 32 bytes
  ]);

  return keccak256(packed);
};

// Helper function to convert price to tick
export const priceToTick = (price: number): number => {
  return Math.round(Math.log(price) / Math.log(1.0001));
};

// Helper function to convert tick to price
export const tickToPrice = (tick: number): number => {
  return Math.pow(1.0001, tick);
};

// Helper function to convert sqrtPriceX96 to price
export const sqrtPriceX96ToPrice = (
  sqrtPriceX96: bigint,
  decimals0: number,
  decimals1: number
): number => {
  const Q96 = 2n ** 96n;
  const price = (Number(sqrtPriceX96) / Number(Q96)) ** 2;
  return (price * 10 ** decimals0) / 10 ** decimals1;
};

// Helper function to convert price to sqrtPriceX96
export const priceToSqrtPriceX96 = (
  price: number,
  decimals0: number,
  decimals1: number
): bigint => {
  const adjustedPrice = (price * 10 ** decimals1) / 10 ** decimals0;
  const sqrtPrice = Math.sqrt(adjustedPrice);
  const Q96 = 2n ** 96n;
  return BigInt(Math.round(sqrtPrice * Number(Q96)));
};

// Helper function to validate numeric input
export const isValidNumericInput = (value: string): boolean => {
  // Allow empty string (so users can clear the input)
  if (value === "") return true;

  // Check if it's a valid number (including decimals)
  const num = Number(value);
  return !isNaN(num) && isFinite(num);
};

export const getSearchRangeTokenSymbol = (
  targetPrice?: string,
  currentZeroForOnePrice?: string,
  currentOneForZeroPrice?: string,
  targetPriceDirection?: boolean,
  currency0Symbol?: string,
  currency1Symbol?: string
): string => {
  if (
    !targetPrice ||
    !currentZeroForOnePrice ||
    !currentOneForZeroPrice ||
    targetPriceDirection === undefined
  ) {
    return "";
  }

  const targetPriceNum = Number(targetPrice);
  const currentPriceNum = targetPriceDirection
    ? Number(currentZeroForOnePrice)
    : Number(currentOneForZeroPrice);

  let swapZeroForOne: boolean;

  if (targetPriceDirection) {
    if (targetPriceNum > currentPriceNum) {
      swapZeroForOne = false;
    } else {
      swapZeroForOne = true;
    }
  } else {
    if (targetPriceNum > currentPriceNum) {
      swapZeroForOne = false;
    } else {
      swapZeroForOne = true;
    }
  }

  return swapZeroForOne
    ? currency0Symbol || "Currency0"
    : currency1Symbol || "Currency1";
};

export const calculateEffectivePrice = (
  amount: string,
  quoteAmountOut: bigint,
  zeroForOne: boolean,
  currency0Decimals: number,
  currency1Decimals: number,
  effectivePriceDirection: boolean
): string => {
  if (
    !amount ||
    Number(amount) <= 0 ||
    !currency0Decimals ||
    !currency1Decimals
  ) {
    return "N/A";
  }

  const inputAmount = Number(amount);
  const outputAmount = Math.abs(
    Number(quoteAmountOut) /
      Math.pow(10, zeroForOne ? currency1Decimals : currency0Decimals)
  );

  let effectivePrice: number;
  if (zeroForOne) {
    effectivePrice = outputAmount / inputAmount; // currency1 per currency0
  } else {
    effectivePrice = outputAmount / inputAmount; // currency0 per currency1
  }

  const displayPrice = effectivePriceDirection
    ? zeroForOne
      ? effectivePrice
      : 1 / effectivePrice
    : zeroForOne
    ? 1 / effectivePrice
    : effectivePrice;

  return displayPrice.toFixed(8);
};

export const calculatePriceImpact = (
  amount: string,
  quoteAmountOut: bigint,
  zeroForOne: boolean,
  currency0Decimals: number,
  currency1Decimals: number,
  currentZeroForOnePriceStr: string | undefined,
  currentOneForZeroPriceStr: string | undefined
): { value: string; color: string } | null => {
  if (
    !amount ||
    Number(amount) <= 0 ||
    !currency0Decimals ||
    !currency1Decimals ||
    !currentZeroForOnePriceStr ||
    !currentOneForZeroPriceStr
  ) {
    return null;
  }

  const inputAmount = Number(amount);
  const outputAmount = Math.abs(
    Number(quoteAmountOut) /
      Math.pow(10, zeroForOne ? currency1Decimals : currency0Decimals)
  );

  let effectivePrice: number;
  let currentPrice: number;

  if (zeroForOne) {
    effectivePrice = outputAmount / inputAmount; // currency1 per currency0
    currentPrice = Number(currentZeroForOnePriceStr);
  } else {
    effectivePrice = outputAmount / inputAmount; // currency0 per currency1
    currentPrice = Number(currentOneForZeroPriceStr);
  }

  if (currentPrice === 0)
    return { value: "N/A (curr price 0)", color: "gray.500" };

  const priceImpact = ((effectivePrice - currentPrice) / currentPrice) * 100;
  const absImpact = Math.abs(priceImpact);

  const color =
    absImpact > 5 ? "red.400" : absImpact > 1 ? "yellow.400" : "green.400";

  return {
    value: `${priceImpact > 0 ? "+" : ""}${priceImpact.toFixed(3)}%`,
    color,
  };
};

export const calculatePriceAfterSwap = (
  sqrtPriceX96After: bigint,
  currency0Decimals: number,
  currency1Decimals: number,
  priceAfterSwapDirection: boolean
): string => {
  if (!currency0Decimals || !currency1Decimals) {
    return "Loading decimals...";
  }
  const directPrice = sqrtPriceX96ToPrice(
    sqrtPriceX96After,
    currency0Decimals,
    currency1Decimals
  );
  const displayPrice = priceAfterSwapDirection ? directPrice : 1 / directPrice;
  return displayPrice.toFixed(8);
};

export const calculatePriceChangePercentage = (
  sqrtPriceX96After: bigint,
  currency0Decimals: number,
  currency1Decimals: number,
  priceAfterSwapDirection: boolean,
  currentZeroForOnePriceStr: string | undefined,
  currentOneForZeroPriceStr: string | undefined
): { value: string; color: string } | null => {
  if (
    !currency0Decimals ||
    !currency1Decimals ||
    !currentZeroForOnePriceStr ||
    !currentOneForZeroPriceStr
  ) {
    return null;
  }

  const directPrice = sqrtPriceX96ToPrice(
    sqrtPriceX96After,
    currency0Decimals,
    currency1Decimals
  );
  const priceAfterSwap = priceAfterSwapDirection
    ? directPrice
    : 1 / directPrice;

  const currentPrice = priceAfterSwapDirection
    ? Number(currentZeroForOnePriceStr)
    : Number(currentOneForZeroPriceStr);

  if (currentPrice === 0)
    return { value: "N/A (curr price 0)", color: "gray.500" };

  const priceChange = ((priceAfterSwap - currentPrice) / currentPrice) * 100;
  const absChange = Math.abs(priceChange);

  const color =
    absChange > 5 ? "red.400" : absChange > 1 ? "yellow.400" : "green.400";

  return {
    value: `${priceChange > 0 ? "+" : ""}${priceChange.toFixed(3)}%`,
    color,
  };
};
