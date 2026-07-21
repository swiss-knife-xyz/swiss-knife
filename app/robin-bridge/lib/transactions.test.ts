import assert from "node:assert/strict";
import test from "node:test";
import { Address, decodeFunctionData, zeroAddress } from "viem";
import {
  buildAddLiquidityPositionCalldata,
  buildMintPositionActionPlan,
} from "@/app/uniswap/add-liquidity/lib/transactions";
import { UniV4PositionManagerAbi } from "@/app/uniswap/lib/constants";
import {
  ROBIN_LP_FEE,
  ROBIN_LP_TICK_SPACING,
  fdvRangeToTicks,
  fdvToSqrtPriceX96,
  getAmountsForAnchor,
} from "./liquidity";

const TOKEN = "0x1000000000000000000000000000000000000000" as Address;
const OWNER = "0x2000000000000000000000000000000000000000" as Address;

test("Robin first liquidity uses sorted ETH/token key and atomic native sweep", () => {
  const totalSupply = 1_000_000_000;
  const ethUsd = 2_000;
  const fdvUsd = 2_000_000;
  const sqrtPriceX96 = fdvToSqrtPriceX96(fdvUsd, totalSupply, ethUsd, 18);
  const range = fdvRangeToTicks(
    fdvUsd / 2,
    fdvUsd * 2,
    totalSupply,
    ethUsd,
    18
  );
  assert.ok(range);
  const amounts = getAmountsForAnchor({
    sqrtPriceX96,
    tickLower: range.tickLower,
    tickUpper: range.tickUpper,
    anchor: "eth",
    amount: 10n ** 18n,
  });
  assert.ok(amounts.liquidity > 0n);

  const params = {
    poolKey: {
      currency0: zeroAddress,
      currency1: TOKEN,
      fee: ROBIN_LP_FEE,
      tickSpacing: ROBIN_LP_TICK_SPACING,
      hooks: zeroAddress,
    },
    tickLower: range.tickLower,
    tickUpper: range.tickUpper,
    liquidity: amounts.liquidity,
    amount0Max: 10n ** 18n,
    amount1Max: amounts.amountToken + 1n,
    owner: OWNER,
    hookData: "0x" as const,
  };

  assert.equal(buildMintPositionActionPlan(params).actions, "0x020d14");
  const decoded = decodeFunctionData({
    abi: UniV4PositionManagerAbi,
    data: buildAddLiquidityPositionCalldata({
      ...params,
      deadline: 10_000n,
      initializeSqrtPriceX96: sqrtPriceX96,
    }),
  });
  assert.equal(decoded.functionName, "multicall");
});
