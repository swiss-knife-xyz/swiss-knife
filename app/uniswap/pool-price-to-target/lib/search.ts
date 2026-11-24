import { parseUnits } from "viem";

export const MAX_PARALLEL_SEARCH_POINTS = 100;

const parsePositivePrice = (value: string, label: string): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a finite positive number`);
  }
  return parsed;
};

export const getTargetSwapDirection = (
  targetPrice: number,
  currentPrice: number,
  targetIsToken1PerToken0: boolean
): boolean | null => {
  if (
    !Number.isFinite(targetPrice) ||
    targetPrice <= 0 ||
    !Number.isFinite(currentPrice) ||
    currentPrice <= 0
  ) {
    throw new Error("Target and current prices must be finite and positive");
  }

  if (targetPrice === currentPrice) return null;

  // token0 -> token1 lowers token1/token0 and raises its reciprocal.
  return targetIsToken1PerToken0
    ? targetPrice < currentPrice
    : targetPrice > currentPrice;
};

export const priceDecreasesAsAmountIncreases = (
  zeroForOne: boolean,
  targetIsToken1PerToken0: boolean
): boolean => targetIsToken1PerToken0 === zeroForOne;

export const getNextBinarySearchBounds = ({
  low,
  high,
  mid,
  quotedPrice,
  targetPrice,
  priceDecreases,
}: {
  low: bigint;
  high: bigint;
  mid: bigint;
  quotedPrice: number;
  targetPrice: number;
  priceDecreases: boolean;
}): { low: bigint; high: bigint } => {
  if (
    low < 0n ||
    high < low ||
    mid < low ||
    mid > high ||
    !Number.isFinite(quotedPrice) ||
    quotedPrice <= 0 ||
    !Number.isFinite(targetPrice) ||
    targetPrice <= 0
  ) {
    throw new Error("Invalid binary-search state");
  }

  if (quotedPrice === targetPrice) return { low: mid, high: mid };

  const needLargerAmount = priceDecreases
    ? quotedPrice > targetPrice
    : quotedPrice < targetPrice;

  return needLargerAmount ? { low: mid + 1n, high } : { low, high: mid - 1n };
};

export const parseTargetSearchParameters = ({
  targetPrice,
  currentPrice,
  thresholdPercent,
  searchLow,
  searchHigh,
  tokenDecimals,
  maxIterations,
  minimumIterations = 1,
}: {
  targetPrice: string;
  currentPrice: string;
  thresholdPercent: string;
  searchLow: string;
  searchHigh: string;
  tokenDecimals: number;
  maxIterations: number;
  minimumIterations?: number;
}) => {
  const parsedTargetPrice = parsePositivePrice(targetPrice, "Target price");
  const parsedCurrentPrice = parsePositivePrice(currentPrice, "Current price");
  const parsedThreshold = Number(thresholdPercent);

  if (
    !Number.isFinite(parsedThreshold) ||
    parsedThreshold < 0 ||
    parsedThreshold > 100
  ) {
    throw new Error("Threshold must be between 0 and 100 percent");
  }
  if (
    !Number.isInteger(tokenDecimals) ||
    tokenDecimals < 0 ||
    tokenDecimals > 255
  ) {
    throw new Error("Token decimals must be an integer between 0 and 255");
  }
  if (
    !Number.isInteger(maxIterations) ||
    maxIterations < minimumIterations ||
    maxIterations > MAX_PARALLEL_SEARCH_POINTS
  ) {
    throw new Error(
      `Iterations must be between ${minimumIterations} and ${MAX_PARALLEL_SEARCH_POINTS}`
    );
  }

  const low = parseUnits(searchLow, tokenDecimals);
  const high = parseUnits(searchHigh, tokenDecimals);
  if (low <= 0n || high < low) {
    throw new Error("Search range must satisfy 0 < low <= high");
  }

  return {
    targetPrice: parsedTargetPrice,
    currentPrice: parsedCurrentPrice,
    tolerance: parsedTargetPrice * (parsedThreshold / 100),
    low,
    high,
    maxIterations,
  };
};

export const generateParallelSearchAmounts = (
  low: bigint,
  high: bigint,
  count: number
): bigint[] => {
  if (
    low <= 0n ||
    high < low ||
    !Number.isInteger(count) ||
    count < 2 ||
    count > MAX_PARALLEL_SEARCH_POINTS
  ) {
    throw new Error("Invalid parallel-search range or point count");
  }
  if (low === high) return [low];

  const steps = BigInt(count - 1);
  const denominator = steps * steps;
  const span = high - low;
  const amounts = new Set<bigint>();

  // Quadratic integer interpolation concentrates samples near the low end
  // without ever converting token amounts to an unsafe JavaScript number.
  for (let index = 0n; index <= steps; index += 1n) {
    amounts.add(low + (span * index * index) / denominator);
  }

  return [...amounts];
};
