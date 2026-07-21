import assert from "node:assert/strict";
import test from "node:test";
import { TickMath } from "@uniswap/v3-sdk";
import {
  Address,
  encodeAbiParameters,
  keccak256,
  maxUint128,
  zeroAddress,
} from "viem";
import {
  getAmountsForLiquidity,
  getLiquidityFromAmounts,
  getNearestUsableTick,
  getPoolId,
  getUsableTickBounds,
  priceRangeToTicksOutward,
  priceRatioToTick,
  priceToSqrtPriceX96,
  snapTickRangeOutward,
  sqrtPriceX96ToPrice,
  sqrtPriceX96ToTick,
  tickToPriceRatio,
} from "./utils";

const TOKEN = "0x1000000000000000000000000000000000000000" as Address;
const sqrtAtTick = (tick: number) =>
  BigInt(TickMath.getSqrtRatioAtTick(tick).toString());

test("usable tick extrema are spacing-aligned and inside global bounds", () => {
  for (const spacing of [1, 10, 60, 200, 32_767]) {
    const { minTick, maxTick } = getUsableTickBounds(spacing);
    assert.ok(minTick % spacing === 0);
    assert.equal(maxTick % spacing, 0);
    assert.ok(minTick >= -887272);
    assert.ok(maxTick <= 887272);
    const nearMax = getNearestUsableTick(887270, spacing);
    const nearMin = getNearestUsableTick(-887270, spacing);
    assert.ok(nearMax <= maxTick && nearMax % spacing === 0);
    assert.ok(nearMin >= minTick && nearMin % spacing === 0);
  }
  assert.equal(getNearestUsableTick(887270, 60), 887220);
  assert.equal(getNearestUsableTick(-887270, 60), -887220);
});

test("invalid tick spacing is rejected", () => {
  for (const spacing of [0, -60, 1.5, 32_768, Number.NaN]) {
    assert.throws(() => getUsableTickBounds(spacing), /Tick spacing/);
  }
});

test("range endpoints snap outward instead of collapsing", () => {
  assert.deepEqual(snapTickRangeOutward(31, 89, 60), {
    tickLower: 0,
    tickUpper: 120,
  });

  const lowerPrice = tickToPriceRatio(31, true, 18, 18).toString();
  const upperPrice = tickToPriceRatio(89, true, 18, 18).toString();
  assert.deepEqual(
    priceRangeToTicksOutward(lowerPrice, upperPrice, true, 18, 18, 60),
    { tickLower: 0, tickUpper: 120 }
  );
});

test("direct and inverse prices produce the same sqrt price", () => {
  const direct = priceToSqrtPriceX96(2_000, 18, 6, true);
  const inverse = priceToSqrtPriceX96(1 / 2_000, 18, 6, false);
  assert.equal(direct, inverse);
  assert.equal(priceToSqrtPriceX96(1, 0, 0, true), 2n ** 96n);
  assert.ok(Math.abs(sqrtPriceX96ToPrice(direct, 18, 6, true) - 2_000) < 1e-9);
});

test("price-to-tick follows Uniswap's greatest-tick-at-or-below invariant", () => {
  const sqrtPriceX96 = priceToSqrtPriceX96(2_000, 18, 6, true);
  const tick = priceRatioToTick("2000", true, 18, 6, 60, false);

  assert.equal(tick, -200312);
  assert.equal(tick, sqrtPriceX96ToTick(sqrtPriceX96));
  assert.ok(sqrtAtTick(tick) <= sqrtPriceX96);
  assert.ok(sqrtAtTick(tick + 1) > sqrtPriceX96);
});

test("exact sqrt-price liquidity never exceeds the submitted maxima", () => {
  const currentSqrtPriceX96 = priceToSqrtPriceX96(2_000, 18, 6, true);
  const currentTick = sqrtPriceX96ToTick(currentSqrtPriceX96);
  const amount0 = 10n ** 18n;
  const amount1 = 2_000_000_000n;
  const common = {
    currentTick,
    tickLower: -200340,
    tickUpper: -200280,
    amount0,
    amount1,
  };

  const exactLiquidity = getLiquidityFromAmounts({
    ...common,
    currentSqrtPriceX96,
  });
  const exactRequirements = getAmountsForLiquidity({
    ...common,
    currentSqrtPriceX96,
    liquidity: exactLiquidity,
    roundUp: true,
  });
  assert.ok(exactRequirements.amount0 <= amount0);
  assert.ok(exactRequirements.amount1 <= amount1);

  const oldTickLiquidity = getLiquidityFromAmounts({
    ...common,
    currentTick: -200311,
  });
  const oldRequirementsAtLivePrice = getAmountsForLiquidity({
    ...common,
    currentSqrtPriceX96,
    liquidity: oldTickLiquidity,
    roundUp: true,
  });
  assert.ok(oldRequirementsAtLivePrice.amount0 > amount0);
});

test("amount composition is one-sided below/above and two-sided inside", () => {
  const liquidity = 1_000_000n;
  const common = { currentTick: 0, tickLower: -60, tickUpper: 60, liquidity };
  const below = getAmountsForLiquidity({
    ...common,
    currentTick: -60,
    currentSqrtPriceX96: sqrtAtTick(-60),
  });
  const inside = getAmountsForLiquidity({
    ...common,
    currentSqrtPriceX96: sqrtAtTick(0),
  });
  const above = getAmountsForLiquidity({
    ...common,
    currentTick: 60,
    currentSqrtPriceX96: sqrtAtTick(60),
  });
  assert.ok(below.amount0 > 0n && below.amount1 === 0n);
  assert.ok(inside.amount0 > 0n && inside.amount1 > 0n);
  assert.ok(above.amount0 === 0n && above.amount1 > 0n);
});

test("pool IDs match keccak256(abi.encode(PoolKey))", () => {
  const key = {
    currency0: zeroAddress,
    currency1: TOKEN,
    fee: 3_000,
    tickSpacing: 60,
    hooks: zeroAddress,
  };
  const encoded = encodeAbiParameters(
    [
      {
        type: "tuple",
        components: [
          { type: "address", name: "currency0" },
          { type: "address", name: "currency1" },
          { type: "uint24", name: "fee" },
          { type: "int24", name: "tickSpacing" },
          { type: "address", name: "hooks" },
        ],
      },
    ],
    [key]
  );
  assert.equal(getPoolId(key), keccak256(encoded));
});

test("liquidity helpers reject malformed or ABI-overflowing states", () => {
  assert.throws(() =>
    getLiquidityFromAmounts({
      currentTick: 0,
      tickLower: 0,
      tickUpper: 0,
      amount0: 1n,
      amount1: 1n,
    })
  );
  assert.throws(() =>
    getLiquidityFromAmounts({
      currentTick: 0,
      tickLower: -60,
      tickUpper: 60,
      amount0: -1n,
      amount1: 1n,
    })
  );
  assert.throws(() =>
    getAmountsForLiquidity({
      currentTick: 0,
      tickLower: -60,
      tickUpper: 60,
      liquidity: maxUint128 + 1n,
    })
  );
  assert.throws(() => priceToSqrtPriceX96(0, 18, 18, true));
});

test("deterministic varied exact-sqrt cases respect both maxima", () => {
  for (let index = 0; index < 100; index += 1) {
    const baseTick = -60_000 + index * 1_200;
    const currentTick = Math.floor(baseTick / 60) * 60;
    const lower = currentTick - 120;
    const upper = currentTick + 120;
    const sqrtCurrent =
      sqrtAtTick(currentTick) +
      (sqrtAtTick(currentTick + 1) - sqrtAtTick(currentTick)) / 2n;
    const amount0 = 10n ** 12n + BigInt(index * 1_003);
    const amount1 = 10n ** 12n + BigInt(index * 2_009);
    const liquidity = getLiquidityFromAmounts({
      currentTick,
      currentSqrtPriceX96: sqrtCurrent,
      tickLower: lower,
      tickUpper: upper,
      amount0,
      amount1,
    });
    const requirements = getAmountsForLiquidity({
      currentTick,
      currentSqrtPriceX96: sqrtCurrent,
      tickLower: lower,
      tickUpper: upper,
      liquidity,
      roundUp: true,
    });
    assert.ok(requirements.amount0 <= amount0);
    assert.ok(requirements.amount1 <= amount1);
  }
});
