import assert from "node:assert/strict";
import test from "node:test";
import { parseSlippageBps, tryParseSlippageBps } from "./validation";

test("percentage slippage parses deterministically into basis points", () => {
  assert.equal(parseSlippageBps("0"), 0);
  assert.equal(parseSlippageBps(".5"), 50);
  assert.equal(parseSlippageBps("0.07"), 7);
  assert.equal(parseSlippageBps("0.28"), 28);
  assert.equal(parseSlippageBps("0.29"), 29);
  assert.equal(parseSlippageBps("0.57"), 57);
  assert.equal(parseSlippageBps("1.13"), 113);
  assert.equal(parseSlippageBps("10.00"), 1_000);
});

test("slippage rejects negatives, excess precision, and values above the cap", () => {
  for (const value of ["", "-1", "0.001", "10.01", "100.01", "NaN"])
    assert.throws(() => parseSlippageBps(value));
  assert.equal(tryParseSlippageBps("10.01"), null);
});
