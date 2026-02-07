import { PoolWithHookData, PoolKey, QuoteExactInputParams } from "./types";

/**
 * Returns the other currency in a pool given one of the currencies
 */
const getOtherCurrency = (
  pool: PoolKey,
  currency: `0x${string}`
): `0x${string}` =>
  currency === pool.currency0 ? pool.currency1 : pool.currency0;

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
  pools,
}: {
  amountIn: bigint;
  tokenIn: `0x${string}`;
  pools: PoolWithHookData[];
}): QuoteExactInputParams => {
  const path = pools.reduce<ReturnType<typeof getPathSegment>[]>(
    (path, pool, index) => {
      const sourceCurrency =
        index === 0 ? tokenIn : path[index - 1].intermediateCurrency;

      const intermediateCurrency = getOtherCurrency(pool, sourceCurrency);

      return [...path, getPathSegment(pool, intermediateCurrency)];
    },
    []
  );

  return {
    exactAmount: amountIn,
    exactCurrency: tokenIn,
    path,
  };
};
