import assert from "node:assert/strict";
import test from "node:test";
import { Address, Hex, maxUint128, zeroAddress } from "viem";
import { getExactInputParams } from "./quote";
import { PoolWithHookData } from "./types";

const A = zeroAddress;
const B = "0x1000000000000000000000000000000000000000" as Address;
const C = "0x2000000000000000000000000000000000000000" as Address;
const D = "0x3000000000000000000000000000000000000000" as Address;

const pool = (currency0: Address, currency1: Address): PoolWithHookData => ({
  currency0,
  currency1,
  fee: 3_000,
  tickSpacing: 60,
  hooks: zeroAddress,
  hookData: "0x" as Hex,
});

test("direct routes work in both swap directions with a sorted pool key", () => {
  for (const [tokenIn, tokenOut] of [
    [A, B],
    [B, A],
  ] as const) {
    const params = getExactInputParams({
      amountIn: 1n,
      tokenIn,
      tokenOut,
      pools: [pool(A, B)],
    });
    assert.deepEqual(
      params.path.map((segment) => segment.intermediateCurrency),
      [tokenOut]
    );
  }
});

test("two-hop routes preserve the carried currency in both directions", () => {
  for (const [tokenIn, tokenOut, pools, expected] of [
    [A, C, [pool(A, B), pool(B, C)], [B, C]],
    [C, A, [pool(B, C), pool(A, B)], [B, A]],
  ] as const) {
    const params = getExactInputParams({
      amountIn: 1n,
      tokenIn,
      tokenOut,
      pools: [...pools],
    });
    assert.deepEqual(
      params.path.map((segment) => segment.intermediateCurrency),
      expected
    );
  }
});

test("three-hop routes carry the previous hop currency forward", () => {
  const params = getExactInputParams({
    amountIn: 1n,
    tokenIn: A,
    tokenOut: D,
    pools: [pool(A, B), pool(B, C), pool(C, D)],
  });

  assert.deepEqual(
    params.path.map((segment) => segment.intermediateCurrency),
    [B, C, D]
  );
});

test("empty, disconnected, and wrong-output paths are rejected", () => {
  assert.throws(
    () => getExactInputParams({ amountIn: 1n, tokenIn: A, pools: [] }),
    /at least one/
  );
  assert.throws(
    () =>
      getExactInputParams({
        amountIn: 1n,
        tokenIn: A,
        pools: [pool(B, A)],
      }),
    /strictly sorted/
  );
  assert.throws(
    () =>
      getExactInputParams({
        amountIn: 1n,
        tokenIn: A,
        pools: [pool(A, B), pool(C, D)],
      }),
    /disconnected/
  );
  assert.throws(
    () =>
      getExactInputParams({
        amountIn: 1n,
        tokenIn: A,
        tokenOut: C,
        pools: [pool(A, B)],
      }),
    /does not end/
  );
});

test("route amount and pool-key bounds are enforced", () => {
  for (const amountIn of [0n, -1n, maxUint128 + 1n]) {
    assert.throws(
      () => getExactInputParams({ amountIn, tokenIn: A, pools: [pool(A, B)] }),
      /uint128/
    );
  }
  assert.throws(
    () =>
      getExactInputParams({
        amountIn: 1n,
        tokenIn: A,
        pools: [{ ...pool(A, B), tickSpacing: 0 }],
      }),
    /tick spacing/
  );
  assert.throws(
    () =>
      getExactInputParams({
        amountIn: 1n,
        tokenIn: A,
        pools: [{ ...pool(A, B), hookData: "0x1" }],
      }),
    /hook data/
  );
});
