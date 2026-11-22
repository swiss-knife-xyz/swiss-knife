import {
  Address,
  getAddress,
  isAddress,
  isAddressEqual,
  maxUint128,
} from "viem";
import { PoolWithHookData, PoolKey, QuoteExactInputParams } from "./types";

const DYNAMIC_FEE_FLAG = 0x800000;
const MAX_STATIC_FEE = 1_000_000;
const MAX_TICK_SPACING = 32_767;

const isValidFee = (fee: number) =>
  Number.isInteger(fee) &&
  fee >= 0 &&
  fee <= 0xffffff &&
  (fee < MAX_STATIC_FEE || fee === DYNAMIC_FEE_FLAG);

export const assertValidRoutePool = (pool: PoolWithHookData) => {
  if (
    !isAddress(pool.currency0) ||
    !isAddress(pool.currency1) ||
    isAddressEqual(pool.currency0, pool.currency1) ||
    BigInt(pool.currency0) >= BigInt(pool.currency1)
  ) {
    throw new RangeError(
      "Pool currencies must be valid, distinct, and strictly sorted."
    );
  }
  if (!isAddress(pool.hooks)) {
    throw new RangeError("Pool hooks must be a valid address.");
  }
  if (!isValidFee(pool.fee)) {
    throw new RangeError("Pool fee is not valid for Uniswap v4.");
  }
  if (
    !Number.isInteger(pool.tickSpacing) ||
    pool.tickSpacing <= 0 ||
    pool.tickSpacing > MAX_TICK_SPACING
  ) {
    throw new RangeError("Pool tick spacing must be from 1 to 32767.");
  }
  if (!/^0x(?:[0-9a-fA-F]{2})*$/.test(pool.hookData)) {
    throw new RangeError("Pool hook data must be valid bytes.");
  }
};

/**
 * Returns the other currency in a pool given one of the currencies
 */
const getOtherCurrency = (
  pool: PoolKey,
  currency: `0x${string}`
): `0x${string}` => {
  if (isAddressEqual(currency, pool.currency0)) {
    return getAddress(pool.currency1);
  }
  if (isAddressEqual(currency, pool.currency1)) {
    return getAddress(pool.currency0);
  }
  throw new RangeError("Routing path contains disconnected pools.");
};

const getPathSegment = (
  pool: PoolWithHookData,
  intermediateCurrency: `0x${string}`
) => ({
  fee: pool.fee,
  tickSpacing: pool.tickSpacing,
  hookData: pool.hookData,
  hooks: pool.hooks,
  intermediateCurrency,
});

export const getExactInputParams = ({
  amountIn,
  tokenIn,
  tokenOut,
  pools,
}: {
  amountIn: bigint;
  tokenIn: `0x${string}`;
  tokenOut?: Address;
  pools: PoolWithHookData[];
}): QuoteExactInputParams => {
  if (amountIn <= 0n || amountIn > maxUint128) {
    throw new RangeError(
      "Exact input amount must fit uint128 and be positive."
    );
  }
  if (!isAddress(tokenIn)) {
    throw new RangeError("Input currency must be a valid address.");
  }
  if (pools.length === 0) {
    throw new RangeError("Routing path must contain at least one pool.");
  }

  const path = pools.reduce<ReturnType<typeof getPathSegment>[]>(
    (path, pool, index) => {
      assertValidRoutePool(pool);
      const sourceCurrency =
        index === 0 ? tokenIn : path[index - 1].intermediateCurrency;

      const intermediateCurrency = getOtherCurrency(pool, sourceCurrency);

      return [...path, getPathSegment(pool, intermediateCurrency)];
    },
    []
  );

  if (
    tokenOut &&
    !isAddressEqual(path[path.length - 1].intermediateCurrency, tokenOut)
  ) {
    throw new RangeError("Routing path does not end at the output currency.");
  }

  return {
    exactAmount: amountIn,
    exactCurrency: getAddress(tokenIn),
    path,
  };
};
