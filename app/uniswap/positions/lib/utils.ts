import { Address } from "viem";

// PositionInfo packing/unpacking utilities based on the contract
export interface ParsedPositionInfo {
  poolId: string;
  tickLower: number;
  tickUpper: number;
  hasSubscriber: boolean;
}

export const parsePositionInfo = (packedInfo: bigint): ParsedPositionInfo => {
  // Extract fields from packed uint256
  // Layout: 200 bits poolId | 24 bits tickUpper | 24 bits tickLower | 8 bits hasSubscriber

  const hasSubscriber = (packedInfo & BigInt(0xff)) > 0n;
  const tickLower = Number((packedInfo >> 8n) & BigInt(0xffffff));
  const tickUpper = Number((packedInfo >> 32n) & BigInt(0xffffff));
  const poolId = (packedInfo >> 56n).toString(16).padStart(50, "0"); // 200 bits = 25 bytes = 50 hex chars

  // Handle signed ticks (convert from unsigned to signed)
  const signedTickLower =
    tickLower > 0x7fffff ? tickLower - 0x1000000 : tickLower;
  const signedTickUpper =
    tickUpper > 0x7fffff ? tickUpper - 0x1000000 : tickUpper;

  return {
    poolId: `0x${poolId}`,
    tickLower: signedTickLower,
    tickUpper: signedTickUpper,
    hasSubscriber,
  };
};

// Tick to price conversion utilities
export const tickToPrice = (tick: number): number => {
  return Math.pow(1.0001, tick);
};

export const calculatePriceRange = (
  tickLower: number,
  tickUpper: number,
  token0Decimals: number,
  token1Decimals: number,
  isToken0Base: boolean = true
) => {
  const priceLower = tickToPrice(tickLower);
  const priceUpper = tickToPrice(tickUpper);

  // Adjust for token decimals
  const decimalAdjustment = Math.pow(10, token0Decimals - token1Decimals);

  return {
    priceLower: priceLower * decimalAdjustment,
    priceUpper: priceUpper * decimalAdjustment,
    currentPrice: undefined, // Will be set separately if needed
  };
};

export const formatPrice = (price: number, decimals: number = 6): string => {
  if (price === 0) return "0";
  if (price < 0.000001) return `< 0.${"0".repeat(Math.max(0, decimals - 1))}1`;
  if (price > 1000000) return price.toExponential(3);

  // For very small decimals, use more precision
  if (price < 0.01 && decimals < 8) {
    return price.toFixed(8);
  }

  return price.toFixed(decimals);
};

export const isInRange = (
  currentTick: number,
  tickLower: number,
  tickUpper: number
): boolean => {
  return currentTick >= tickLower && currentTick <= tickUpper;
};
