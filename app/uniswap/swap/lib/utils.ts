import { Address, zeroAddress } from "viem";
import { PoolWithHookData } from "@/lib/uniswap/types";

/**
 * Validates if a routing path exists between two currencies using the provided pools
 */
export const findRoutingPath = (
  fromCurrency: Address,
  toCurrency: Address,
  pools: PoolWithHookData[]
): PoolWithHookData[] | null => {
  if (!fromCurrency || !toCurrency || fromCurrency === toCurrency) {
    return null;
  }

  // Simple path finding - for now just check if pools can connect from->to
  // This could be enhanced with more sophisticated routing algorithms

  // Direct route check
  const directPool = pools.find(
    (pool) =>
      (pool.currency0 === fromCurrency && pool.currency1 === toCurrency) ||
      (pool.currency0 === toCurrency && pool.currency1 === fromCurrency)
  );

  if (directPool) {
    return [directPool];
  }

  // Multi-hop route - try to find a path through intermediate currencies
  for (const intermediatePool of pools) {
    let intermediate: Address | null = null;

    // Check if fromCurrency connects to this pool
    if (intermediatePool.currency0 === fromCurrency) {
      intermediate = intermediatePool.currency1;
    } else if (intermediatePool.currency1 === fromCurrency) {
      intermediate = intermediatePool.currency0;
    }

    if (intermediate) {
      // Now check if we can connect from intermediate to toCurrency
      const secondPool = pools.find(
        (pool) =>
          pool !== intermediatePool &&
          ((pool.currency0 === intermediate && pool.currency1 === toCurrency) ||
            (pool.currency0 === toCurrency && pool.currency1 === intermediate))
      );

      if (secondPool) {
        return [intermediatePool, secondPool];
      }
    }
  }

  return null;
};

/**
 * Gets all available currencies from the provided pools, excluding intermediate routing currencies
 * Returns both all currencies (for fetching token info) and endpoint currencies (for swap interface)
 */
export const getAvailableCurrencies = (
  pools: PoolWithHookData[]
): {
  allCurrencies: Address[];
  endpointCurrencies: Address[];
} => {
  const currencyConnections = new Map<Address, number>();
  const allCurrencies = new Set<Address>();

  // Count how many pools each currency appears in and collect all currencies
  pools.forEach((pool) => {
    if (pool.currency0 && isValidCurrency(pool.currency0)) {
      allCurrencies.add(pool.currency0);
      currencyConnections.set(
        pool.currency0,
        (currencyConnections.get(pool.currency0) || 0) + 1
      );
    }
    if (pool.currency1 && isValidCurrency(pool.currency1)) {
      allCurrencies.add(pool.currency1);
      currencyConnections.set(
        pool.currency1,
        (currencyConnections.get(pool.currency1) || 0) + 1
      );
    }
  });

  // Get currencies that appear in only 1 pool (endpoints of routing chains)
  const endpointCurrencies: Address[] = [];

  currencyConnections.forEach((connectionCount, currency) => {
    if (connectionCount === 1) {
      endpointCurrencies.push(currency);
    }
  });

  return {
    allCurrencies: Array.from(allCurrencies),
    endpointCurrencies,
  };
};

/**
 * Validates if a currency address is valid
 */
export const isValidCurrency = (currency: string): boolean => {
  if (!currency) return false;
  if (currency === zeroAddress) return true; // ETH

  // Basic address validation
  return /^0x[a-fA-F0-9]{40}$/.test(currency);
};

/**
 * Validates if a pool configuration is complete and valid
 */
export const isValidPool = (pool: PoolWithHookData): boolean => {
  return (
    isValidCurrency(pool.currency0) &&
    isValidCurrency(pool.currency1) &&
    pool.currency0 !== pool.currency1 &&
    pool.fee >= 0 &&
    pool.tickSpacing > 0 &&
    isValidCurrency(pool.hooks) &&
    pool.hookData !== undefined
  );
};

/**
 * Validates if the pools array has any valid routing configuration
 */
export const hasValidRoutingConfiguration = (
  pools: PoolWithHookData[]
): boolean => {
  return pools.some((pool) => isValidPool(pool));
};

/**
 * Formats a currency for display (ETH or shortened address)
 */
export const formatCurrencyDisplay = (currency: Address): string => {
  if (currency === zeroAddress) return "ETH";
  return `${currency.slice(0, 6)}...${currency.slice(-4)}`;
};

/**
 * Validates if a numeric string input is valid
 */
export const isValidNumericInput = (value: string): boolean => {
  if (value === "") return true; // Allow empty string

  // Allow decimal numbers with optional leading/trailing zeros
  const numericRegex = /^\d*\.?\d*$/;
  return numericRegex.test(value) && !isNaN(Number(value));
};

/**
 * Formats slippage percentage to basis points
 */
export const slippageToBasiPoints = (slippagePercent: string): number => {
  const percent = parseFloat(slippagePercent);
  if (isNaN(percent)) return 50; // Default 0.5%
  return Math.round(percent * 100); // Convert percentage to basis points
};

/**
 * Validates if two pools can be connected in sequence
 */
export const canPoolsConnect = (
  pool1: PoolWithHookData,
  pool2: PoolWithHookData
): boolean => {
  return (
    pool1.currency1 === pool2.currency0 ||
    pool1.currency1 === pool2.currency1 ||
    pool1.currency0 === pool2.currency0 ||
    pool1.currency0 === pool2.currency1
  );
};

/**
 * Formats token balance for display
 */
export const formatTokenBalance = (
  balance?: bigint,
  decimals?: number,
  symbol?: string
): string => {
  if (!balance || !decimals) return "0";

  const divisor = BigInt(10 ** decimals);
  const wholePart = balance / divisor;
  const fractionalPart = balance % divisor;

  if (fractionalPart === 0n) {
    return `${wholePart.toString()} ${symbol || ""}`.trim();
  }

  // Convert fractional part to decimal string
  const fractionalStr = fractionalPart.toString().padStart(decimals, "0");
  // Remove trailing zeros
  const trimmedFractional = fractionalStr.replace(/0+$/, "");

  if (trimmedFractional === "") {
    return `${wholePart.toString()} ${symbol || ""}`.trim();
  }

  const formattedBalance = `${wholePart.toString()}.${trimmedFractional}`;

  // If the number is very large, show shorter format
  const numericValue = parseFloat(formattedBalance);
  if (numericValue > 10000) {
    return `${numericValue.toLocaleString(undefined, {
      maximumFractionDigits: 2,
    })} ${symbol || ""}`.trim();
  } else if (numericValue > 1) {
    return `${numericValue.toLocaleString(undefined, {
      maximumFractionDigits: 4,
    })} ${symbol || ""}`.trim();
  } else {
    return `${numericValue.toLocaleString(undefined, {
      maximumFractionDigits: 6,
    })} ${symbol || ""}`.trim();
  }
};
