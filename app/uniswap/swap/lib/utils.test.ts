import assert from "node:assert/strict";
import test from "node:test";
import { Address, getAddress, zeroAddress } from "viem";
import { base, baseSepolia } from "viem/chains";
import { robinhood } from "@/data/common";
import { PoolWithHookData } from "@/lib/uniswap/types";
import {
  findRoutingPath,
  formatTokenBalance,
  getAvailableCurrencies,
  getSpendableNativeBalance,
  getSupportedSwapChainIds,
  getSwapChainConfig,
  isValidPool,
  parseTokenAmount,
  slippageToBasiPoints,
} from "./utils";

const A = zeroAddress;
const B = "0x1000000000000000000000000000000000000000" as Address;
const C = "0x2000000000000000000000000000000000000000" as Address;
const pool = (currency0: Address, currency1: Address): PoolWithHookData => ({
  currency0,
  currency1,
  fee: 3_000,
  tickSpacing: 60,
  hooks: zeroAddress,
  hookData: "0x",
});

test("routing finds sorted direct and two-hop paths in both directions", () => {
  assert.deepEqual(findRoutingPath(B, A, [pool(A, B)]), [pool(A, B)]);
  assert.deepEqual(findRoutingPath(A, C, [pool(A, B), pool(B, C)]), [
    pool(A, B),
    pool(B, C),
  ]);
  assert.deepEqual(findRoutingPath(C, A, [pool(A, B), pool(B, C)]), [
    pool(B, C),
    pool(A, B),
  ]);
  assert.equal(findRoutingPath(A, C, [pool(A, B)]), null);
});

test("routing and currency discovery normalize address casing", () => {
  const lower = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as Address;
  const checksum = getAddress(lower);
  const route = pool(A, checksum);

  assert.deepEqual(findRoutingPath(A, lower, [route]), [route]);
  const currencies = getAvailableCurrencies([route, pool(lower, C)]);
  assert.equal(
    currencies.allCurrencies.filter(
      (currency) => currency.toLowerCase() === lower.toLowerCase()
    ).length,
    1
  );
});

test("pool validation enforces v4 fee, tick-spacing, and hook-data bounds", () => {
  assert.equal(isValidPool(pool(A, B)), true);
  assert.equal(isValidPool(pool(B, A)), false);
  assert.equal(isValidPool({ ...pool(A, B), tickSpacing: 0 }), false);
  assert.equal(isValidPool({ ...pool(A, B), tickSpacing: 32_768 }), false);
  assert.equal(isValidPool({ ...pool(A, B), fee: 1_000_000 }), false);
  assert.equal(isValidPool({ ...pool(A, B), fee: 0x800000 }), true);
  assert.equal(isValidPool({ ...pool(A, B), hookData: "0x1" }), false);
});

test("token amounts preserve zero decimals and reject implicit rounding", () => {
  assert.equal(parseTokenAmount("123", 0), 123n);
  assert.equal(parseTokenAmount("1.25", 6), 1_250_000n);
  assert.throws(() => parseTokenAmount("1.5", 0), /too many/);
  assert.throws(() => parseTokenAmount("1.0000001", 6), /too many/);
});

test("balance formatting supports 0, 6, 18, and 30 decimals", () => {
  assert.equal(formatTokenBalance(123n, 0, "ZERO"), "123 ZERO");
  assert.equal(formatTokenBalance(1_250_000n, 6, "SIX"), "1.25 SIX");
  assert.equal(formatTokenBalance(10n ** 18n, 18, "ETH"), "1 ETH");
  assert.equal(formatTokenBalance(10n ** 30n, 30, "THIRTY"), "1 THIRTY");
});

test("native maximum reserves gas and never becomes negative", () => {
  assert.equal(getSpendableNativeBalance(10n, 3n), 7n);
  assert.equal(getSpendableNativeBalance(3n, 3n), 0n);
  assert.equal(getSpendableNativeBalance(2n, 3n), 0n);
});

test("swap support requires Quoter, Universal Router, and Permit2", () => {
  assert.ok(getSwapChainConfig(base.id));
  assert.ok(getSwapChainConfig(baseSepolia.id));
  assert.equal(getSwapChainConfig(robinhood.id), null);
  assert.deepEqual(
    getSupportedSwapChainIds().sort(),
    [base.id, baseSepolia.id].sort()
  );
});

test("swap slippage keeps explicit zero and rejects unsafe values", () => {
  assert.equal(slippageToBasiPoints("0"), 0);
  assert.equal(slippageToBasiPoints("0.5"), 50);
  assert.throws(() => slippageToBasiPoints("10.01"));
  assert.throws(() => slippageToBasiPoints("-1"));
});
