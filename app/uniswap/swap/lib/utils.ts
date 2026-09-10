import {
  Address,
  formatUnits,
  getAddress,
  isAddress,
  isAddressEqual,
  parseUnits,
  zeroAddress,
} from "viem";
import { PoolWithHookData } from "@/lib/uniswap/types";
import { assertValidRoutePool } from "@/lib/uniswap/quote";
import {
  Permit2Address,
  UniversalRouterAddress,
  quoterAddress,
} from "../../lib/constants";
import { parseSlippageBps } from "../../lib/validation";

export const DEFAULT_NATIVE_GAS_RESERVE_WEI = 1_000_000_000_000_000n;

const addressesEqual = (left: Address, right: Address) =>
  isAddress(left) && isAddress(right) && isAddressEqual(left, right);

/**
 * Validates if a routing path exists between two currencies using the provided pools
 */
export const findRoutingPath = (
  fromCurrency: Address,
  toCurrency: Address,
  pools: PoolWithHookData[]
): PoolWithHookData[] | null => {
  if (
    !isAddress(fromCurrency) ||
    !isAddress(toCurrency) ||
    addressesEqual(fromCurrency, toCurrency)
  ) {
    return null;
  }

  // Simple path finding - for now just check if pools can connect from->to
  // This could be enhanced with more sophisticated routing algorithms

  // Direct route check
  const directPool = pools.find(
    (pool) =>
      (addressesEqual(pool.currency0, fromCurrency) &&
        addressesEqual(pool.currency1, toCurrency)) ||
      (addressesEqual(pool.currency0, toCurrency) &&
        addressesEqual(pool.currency1, fromCurrency))
  );

  if (directPool) {
    return [directPool];
  }

  // Multi-hop route - try to find a path through intermediate currencies
  for (const intermediatePool of pools) {
    let intermediate: Address | null = null;

    // Check if fromCurrency connects to this pool
    if (addressesEqual(intermediatePool.currency0, fromCurrency)) {
      intermediate = intermediatePool.currency1;
    } else if (addressesEqual(intermediatePool.currency1, fromCurrency)) {
      intermediate = intermediatePool.currency0;
    }

    if (intermediate) {
      // Now check if we can connect from intermediate to toCurrency
      const secondPool = pools.find(
        (pool) =>
          pool !== intermediatePool &&
          ((addressesEqual(pool.currency0, intermediate!) &&
            addressesEqual(pool.currency1, toCurrency)) ||
            (addressesEqual(pool.currency0, toCurrency) &&
              addressesEqual(pool.currency1, intermediate!)))
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
      const currency0 = getAddress(pool.currency0);
      allCurrencies.add(currency0);
      currencyConnections.set(
        currency0,
        (currencyConnections.get(currency0) || 0) + 1
      );
    }
    if (pool.currency1 && isValidCurrency(pool.currency1)) {
      const currency1 = getAddress(pool.currency1);
      allCurrencies.add(currency1);
      currencyConnections.set(
        currency1,
        (currencyConnections.get(currency1) || 0) + 1
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
  return isAddress(currency);
};

/**
 * Validates if a pool configuration is complete and valid
 */
export const isValidPool = (pool: PoolWithHookData): boolean => {
  try {
    assertValidRoutePool(pool);
    return true;
  } catch {
    return false;
  }
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
  return parseSlippageBps(slippagePercent);
};

/**
 * Validates if two pools can be connected in sequence
 */
export const canPoolsConnect = (
  pool1: PoolWithHookData,
  pool2: PoolWithHookData
): boolean => {
  return (
    addressesEqual(pool1.currency1, pool2.currency0) ||
    addressesEqual(pool1.currency1, pool2.currency1) ||
    addressesEqual(pool1.currency0, pool2.currency0) ||
    addressesEqual(pool1.currency0, pool2.currency1)
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
  if (balance === undefined || decimals === undefined) return "0";
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) return "0";

  const divisor = 10n ** BigInt(decimals);
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

export const parseTokenAmount = (value: string, decimals: number): bigint => {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) {
    throw new RangeError("Token decimals must be an integer from 0 to 255.");
  }
  const match = /^(?:\d+)(?:\.(\d*))?$/.exec(value.trim());
  if (!match) throw new RangeError("Token amount is not a valid decimal.");
  if ((match[1]?.length ?? 0) > decimals) {
    throw new RangeError("Token amount has too many decimal places.");
  }
  return parseUnits(value.trim(), decimals);
};

export const getSpendableNativeBalance = (
  balance: bigint,
  gasReserve = DEFAULT_NATIVE_GAS_RESERVE_WEI
): bigint => {
  if (balance <= 0n || gasReserve < 0n) return 0n;
  return balance > gasReserve ? balance - gasReserve : 0n;
};

export const formatSpendableBalance = (
  balance: bigint,
  decimals: number,
  isNative: boolean
) =>
  formatUnits(
    isNative ? getSpendableNativeBalance(balance) : balance,
    decimals
  );

export const getSwapChainConfig = (chainId: number) => {
  const quoter = quoterAddress[chainId];
  const universalRouter = UniversalRouterAddress[chainId];
  const permit2 = Permit2Address[chainId];
  return quoter && universalRouter && permit2
    ? { quoter, universalRouter, permit2 }
    : null;
};

export const getSupportedSwapChainIds = () =>
  Object.keys(quoterAddress)
    .map(Number)
    .filter((chainId) => getSwapChainConfig(chainId) !== null);
