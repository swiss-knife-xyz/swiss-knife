import { TickMath } from "@uniswap/v3-sdk";
import { Hex, encodeFunctionData } from "viem";
import { assertValidRoutePool } from "@/lib/uniswap/quote";
import { UniV4PositionManagerAbi } from "../../lib/constants";
import type { PoolKey } from "../../add-liquidity/lib/utils";

const MIN_SQRT_PRICE_X96 = BigInt(TickMath.MIN_SQRT_RATIO.toString());
const MAX_SQRT_PRICE_X96 = BigInt(TickMath.MAX_SQRT_RATIO.toString());

export const buildInitializePoolCalldata = ({
  poolKey,
  sqrtPriceX96,
}: {
  poolKey: PoolKey;
  sqrtPriceX96: bigint;
}): Hex => {
  assertValidRoutePool({ ...poolKey, hookData: "0x" });
  if (sqrtPriceX96 < MIN_SQRT_PRICE_X96 || sqrtPriceX96 >= MAX_SQRT_PRICE_X96) {
    throw new RangeError(
      "Initial square-root price is outside the supported range."
    );
  }

  return encodeFunctionData({
    abi: UniV4PositionManagerAbi,
    functionName: "initializePool",
    args: [poolKey, sqrtPriceX96],
  });
};
