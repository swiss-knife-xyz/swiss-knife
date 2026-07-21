import assert from "node:assert/strict";
import test from "node:test";
import { calculatePriceRange, isInRange, parsePositionInfo } from "./utils";

const encodeSigned24 = (value: number) =>
  BigInt(value < 0 ? value + 0x1000000 : value);

test("packed position info decodes signed ticks in their correct fields", () => {
  const poolIdUpper200 = (1n << 200n) - 1n;
  const packed =
    (poolIdUpper200 << 56n) |
    (encodeSigned24(-120) << 8n) |
    (encodeSigned24(240) << 32n) |
    1n;

  assert.deepEqual(parsePositionInfo(packed), {
    poolId: `0x${"f".repeat(50)}`,
    tickLower: -120,
    tickUpper: 240,
    hasSubscriber: true,
  });
});

test("position range prices are token1 per token0 and include decimals", () => {
  const range = calculatePriceRange(-200_400, -200_280, 18, 6);
  assert.ok(range.priceLower < range.priceUpper);
  assert.ok(range.priceLower > 1_900);
  assert.ok(range.priceUpper < 2_100);
  assert.throws(() => calculatePriceRange(120, -120, 18, 6));
});

test("concentrated-liquidity ranges are upper-bound exclusive", () => {
  assert.equal(isInRange(-120, -120, 120), true);
  assert.equal(isInRange(119, -120, 120), true);
  assert.equal(isInRange(120, -120, 120), false);
});
