import test from "node:test";
import assert from "node:assert/strict";
import { gasCostDelta } from "./gasCostDelta";
import { estimateGasCost } from "./gasCostEstimate";
const cost = (gasPrice: bigint, decimals = 18, usdPrice?: number) =>
  estimateGasCost({ gasUsed: 1n, gasPrice, decimals, usdPrice });

test("same native asset compares exact fees without a USD feed", () => {
  assert.deepEqual(gasCostDelta(cost(100n), cost(25n), 18, 18, true), {
    direction: "saving",
    nativeAmount: "0.000000000000000075",
    usd: undefined,
    percent: "75.00",
  });
  assert.equal(
    gasCostDelta(cost(25n), cost(100n), 18, 18, true)?.direction,
    "extra"
  );
  assert.equal(
    gasCostDelta(cost(25n), cost(25n), 18, 18, true)?.direction,
    "equal"
  );
});

test("native comparisons normalize decimals without losing bigint precision", () => {
  assert.equal(
    gasCostDelta(cost(1000000n, 6), cost(10n ** 18n), 6, 18, true)?.direction,
    "equal"
  );
  const amount = 2n ** 200n;
  const result = gasCostDelta(cost(amount), cost(amount - 1n), 18, 18, true);
  assert.equal(result?.nativeAmount, "0.000000000000000001");
  assert.equal(result?.direction, "saving");
});

test("different native assets compare USD values, not token quantities or symbols", () => {
  const result = gasCostDelta(
    cost(10n ** 18n, 18, 3000),
    cost(100n * 10n ** 18n, 18, 0.5),
    18,
    18,
    false
  );
  assert.equal(result?.direction, "saving");
  assert.equal(result?.usd, "$2950.000000");
  assert.equal(result?.nativeAmount, undefined);
  assert.equal(gasCostDelta(cost(1n), cost(2n), 18, 18, false), undefined);
  assert.equal(
    gasCostDelta(cost(1n, 18, 3000), cost(2n), 18, 18, false),
    undefined
  );
});

test("a zero original cost has no percentage and near-total savings never round to 100%", () => {
  const result = gasCostDelta(cost(0n), cost(1n), 18, 18, true);
  assert.equal(result?.direction, "extra");
  assert.equal(result?.percent, undefined);
  assert.equal(
    gasCostDelta(cost(1000000n, 0, 1), cost(1n, 0, 1), 0, 0, false)?.percent,
    "99.99"
  );
});
