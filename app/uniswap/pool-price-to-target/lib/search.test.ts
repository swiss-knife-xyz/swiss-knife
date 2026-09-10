import assert from "node:assert/strict";
import test from "node:test";
import {
  generateParallelSearchAmounts,
  getNextBinarySearchBounds,
  getTargetSwapDirection,
  parseTargetSearchParameters,
  priceDecreasesAsAmountIncreases,
} from "./search";

test("target direction handles direct and inverse prices on both sides", () => {
  assert.equal(getTargetSwapDirection(90, 100, true), true);
  assert.equal(getTargetSwapDirection(110, 100, true), false);
  assert.equal(getTargetSwapDirection(0.011, 0.01, false), true);
  assert.equal(getTargetSwapDirection(0.009, 0.01, false), false);
  assert.equal(getTargetSwapDirection(100, 100, true), null);
});

test("binary bounds follow whether the displayed price rises or falls", () => {
  for (const targetIsDirect of [true, false]) {
    for (const zeroForOne of [true, false]) {
      const decreases = priceDecreasesAsAmountIncreases(
        zeroForOne,
        targetIsDirect
      );
      assert.deepEqual(
        getNextBinarySearchBounds({
          low: 1n,
          high: 100n,
          mid: 50n,
          quotedPrice: decreases ? 110 : 90,
          targetPrice: 100,
          priceDecreases: decreases,
        }),
        { low: 51n, high: 100n }
      );
      assert.deepEqual(
        getNextBinarySearchBounds({
          low: 1n,
          high: 100n,
          mid: 50n,
          quotedPrice: decreases ? 90 : 110,
          targetPrice: 100,
          priceDecreases: decreases,
        }),
        { low: 1n, high: 49n }
      );
    }
  }
});

test("search parsing supports zero-decimal tokens and rejects unsafe inputs", () => {
  assert.deepEqual(
    parseTargetSearchParameters({
      targetPrice: "2",
      currentPrice: "1",
      thresholdPercent: "0",
      searchLow: "1",
      searchHigh: "10",
      tokenDecimals: 0,
      maxIterations: 2,
      minimumIterations: 2,
    }),
    {
      targetPrice: 2,
      currentPrice: 1,
      tolerance: 0,
      low: 1n,
      high: 10n,
      maxIterations: 2,
    }
  );

  const valid = {
    targetPrice: "2",
    currentPrice: "1",
    thresholdPercent: "0.5",
    searchLow: "1",
    searchHigh: "10",
    tokenDecimals: 18,
    maxIterations: 10,
  };
  assert.throws(() =>
    parseTargetSearchParameters({ ...valid, searchLow: "0" })
  );
  assert.throws(() =>
    parseTargetSearchParameters({ ...valid, searchLow: "11" })
  );
  assert.throws(() =>
    parseTargetSearchParameters({ ...valid, thresholdPercent: "101" })
  );
  assert.throws(() =>
    parseTargetSearchParameters({
      ...valid,
      maxIterations: 1,
      minimumIterations: 2,
    })
  );
  assert.throws(() =>
    parseTargetSearchParameters({ ...valid, targetPrice: "Infinity" })
  );
});

test("parallel amount generation never loses bigint precision", () => {
  const low = 10n ** 80n;
  const high = 10n ** 100n;
  const amounts = generateParallelSearchAmounts(low, high, 100);

  assert.equal(amounts[0], low);
  assert.equal(amounts.at(-1), high);
  assert.ok(
    amounts.every((amount, index) => index === 0 || amount > amounts[index - 1])
  );
  assert.throws(() => generateParallelSearchAmounts(0n, high, 10));
  assert.throws(() => generateParallelSearchAmounts(low, high, 1));
});
