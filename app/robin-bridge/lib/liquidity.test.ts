import assert from "node:assert/strict";
import test from "node:test";
import { TickMath } from "@uniswap/v3-sdk";
import {
  ROBIN_LP_TICK_SPACING,
  fdvRangeToTicks,
  fdvToSqrtPriceX96,
  fdvToTick,
  fdvToTokenPerEth,
  getAmountsForAnchor,
  getFullRangeTicks,
  getRequiredLiquiditySides,
  sqrtPriceX96ToFdv,
} from "./liquidity";

const TOTAL_SUPPLY = 1_000_000_000;
const ETH_USD = 3_000;
const FDV_USD = 3_000_000;

const sqrtAtTick = (tick: number) =>
  BigInt(TickMath.getSqrtRatioAtTick(tick).toString());

const assertRelativeClose = (
  actual: number,
  expected: number,
  tolerance: number
) => {
  assert.ok(
    Math.abs(actual - expected) / expected <= tolerance,
    `expected ${actual} to be within ${tolerance * 100}% of ${expected}`
  );
};

test("FDV converts to the ETH/token pool price in the correct direction", () => {
  assert.equal(fdvToTokenPerEth(FDV_USD, TOTAL_SUPPLY, ETH_USD), 1_000_000);

  const sqrtPriceX96 = fdvToSqrtPriceX96(FDV_USD, TOTAL_SUPPLY, ETH_USD, 18);
  assertRelativeClose(
    sqrtPriceX96ToFdv(sqrtPriceX96, TOTAL_SUPPLY, ETH_USD, 18),
    FDV_USD,
    1e-12
  );

  // A higher token-per-ETH quote means a cheaper token and therefore lower FDV.
  const cheaperTokenSqrt = fdvToSqrtPriceX96(
    FDV_USD / 2,
    TOTAL_SUPPLY,
    ETH_USD,
    18
  );
  assert.ok(cheaperTokenSqrt > sqrtPriceX96);
});

test("tick conversion includes token decimals and matches TickMath flooring", () => {
  const sqrt18 = fdvToSqrtPriceX96(FDV_USD, TOTAL_SUPPLY, ETH_USD, 18);
  const tick18 = fdvToTick(FDV_USD, TOTAL_SUPPLY, ETH_USD, 18);
  assert.ok(sqrtAtTick(tick18) <= sqrt18);
  assert.ok(sqrtAtTick(tick18 + 1) > sqrt18);

  const sqrt6 = fdvToSqrtPriceX96(FDV_USD, TOTAL_SUPPLY, ETH_USD, 6);
  const tick6 = fdvToTick(FDV_USD, TOTAL_SUPPLY, ETH_USD, 6);
  assert.ok(tick18 > 0);
  assert.ok(tick6 < 0);
  assert.ok(sqrtAtTick(tick6) <= sqrt6);
  assert.ok(sqrtAtTick(tick6 + 1) > sqrt6);
  assertRelativeClose(
    sqrtPriceX96ToFdv(sqrt6, TOTAL_SUPPLY, ETH_USD, 6),
    FDV_USD,
    1e-12
  );
});

test("FDV ranges round outward to valid tick-spacing boundaries", () => {
  const requestedMin = FDV_USD / 2;
  const requestedMax = FDV_USD * 2;
  const range = fdvRangeToTicks(
    requestedMin,
    requestedMax,
    TOTAL_SUPPLY,
    ETH_USD,
    18
  );
  assert.ok(range);
  assert.equal(range.tickLower % ROBIN_LP_TICK_SPACING, 0);
  assert.equal(range.tickUpper % ROBIN_LP_TICK_SPACING, 0);
  assert.ok(range.tickLower < range.tickUpper);
  assert.ok(range.effectiveMinFdvUsd <= requestedMin);
  assert.ok(range.effectiveMaxFdvUsd >= requestedMax);

  const zeroMinRange = fdvRangeToTicks(
    0,
    requestedMax,
    TOTAL_SUPPLY,
    ETH_USD,
    18
  );
  assert.ok(zeroMinRange);
  assert.equal(zeroMinRange.tickUpper, getFullRangeTicks().tickUpper);
});

test("required sides follow the actual snapped sqrt-price boundaries", () => {
  const range = fdvRangeToTicks(
    FDV_USD / 2,
    FDV_USD * 2,
    TOTAL_SUPPLY,
    ETH_USD,
    18
  );
  assert.ok(range);
  const sqrtLower = sqrtAtTick(range.tickLower);
  const sqrtUpper = sqrtAtTick(range.tickUpper);

  assert.equal(
    getRequiredLiquiditySides(sqrtLower, range.tickLower, range.tickUpper),
    "eth"
  );
  assert.equal(
    getRequiredLiquiditySides(sqrtLower + 1n, range.tickLower, range.tickUpper),
    "both"
  );
  assert.equal(
    getRequiredLiquiditySides(sqrtUpper, range.tickLower, range.tickUpper),
    "token"
  );
});

test("anchored amount math respects ETH as token0 and token as token1", () => {
  const range = fdvRangeToTicks(
    FDV_USD / 2,
    FDV_USD * 2,
    TOTAL_SUPPLY,
    ETH_USD,
    18
  );
  assert.ok(range);
  const sqrtLower = sqrtAtTick(range.tickLower);
  const sqrtUpper = sqrtAtTick(range.tickUpper);
  const sqrtCurrent = (sqrtLower + sqrtUpper) / 2n;
  const ethAnchor = 10n ** 18n;

  const paired = getAmountsForAnchor({
    sqrtPriceX96: sqrtCurrent,
    tickLower: range.tickLower,
    tickUpper: range.tickUpper,
    anchor: "eth",
    amount: ethAnchor,
  });
  assert.ok(paired.liquidity > 0n);
  assert.ok(paired.amountEth <= ethAnchor);
  assert.ok(paired.amountToken > 0n);

  const belowRange = getAmountsForAnchor({
    sqrtPriceX96: sqrtLower,
    tickLower: range.tickLower,
    tickUpper: range.tickUpper,
    anchor: "eth",
    amount: ethAnchor,
  });
  assert.ok(belowRange.amountEth > 0n);
  assert.equal(belowRange.amountToken, 0n);

  const aboveRange = getAmountsForAnchor({
    sqrtPriceX96: sqrtUpper,
    tickLower: range.tickLower,
    tickUpper: range.tickUpper,
    anchor: "token",
    amount: 10n ** 24n,
  });
  assert.equal(aboveRange.amountEth, 0n);
  assert.ok(aboveRange.amountToken > 0n);
});

test("FDV round-trips across representative token decimals", () => {
  for (const decimals of [0, 6, 18, 24]) {
    const sqrtPriceX96 = fdvToSqrtPriceX96(
      FDV_USD,
      TOTAL_SUPPLY,
      ETH_USD,
      decimals
    );
    assertRelativeClose(
      sqrtPriceX96ToFdv(sqrtPriceX96, TOTAL_SUPPLY, ETH_USD, decimals),
      FDV_USD,
      1e-12
    );
  }
});

test("varied supported FDV ranges remain outward and spacing-aligned", () => {
  for (const decimals of [0, 6, 8, 18, 24, 36]) {
    for (let index = 1; index <= 100; index += 1) {
      const center = 100_000 + index * 50_000;
      const requestedMin = center / (1.1 + (index % 7) / 10);
      const requestedMax = center * (1.2 + (index % 5) / 10);
      const range = fdvRangeToTicks(
        requestedMin,
        requestedMax,
        TOTAL_SUPPLY,
        ETH_USD,
        decimals
      );
      assert.ok(range);
      assert.ok(range.tickLower % ROBIN_LP_TICK_SPACING === 0);
      assert.ok(range.tickUpper % ROBIN_LP_TICK_SPACING === 0);
      assert.ok(range.effectiveMinFdvUsd <= requestedMin);
      assert.ok(range.effectiveMaxFdvUsd >= requestedMax);
    }
  }
});

test("Robin liquidity helpers reject malformed market and range inputs", () => {
  for (const spacing of [0, -200, 1.5, 32_768]) {
    assert.throws(() => getFullRangeTicks(spacing), /Tick spacing/);
  }
  assert.throws(() =>
    fdvRangeToTicks(FDV_USD * 2, FDV_USD, TOTAL_SUPPLY, ETH_USD, 18)
  );
  assert.throws(() => fdvToSqrtPriceX96(Number.NaN, TOTAL_SUPPLY, ETH_USD, 18));
  assert.throws(() =>
    sqrtPriceX96ToFdv(2n ** 1024n, TOTAL_SUPPLY, ETH_USD, 18)
  );
  assert.throws(() =>
    getAmountsForAnchor({
      sqrtPriceX96: sqrtAtTick(0),
      tickLower: 200,
      tickUpper: -200,
      anchor: "eth",
      amount: 1n,
    })
  );
});
