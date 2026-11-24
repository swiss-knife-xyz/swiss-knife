import assert from "node:assert/strict";
import test from "node:test";
import { estimateGasCost } from "./gasCostEstimate";

test("same gas used times current gas price, denominated in destination native currency", () => {
  const estimate = estimateGasCost({
    gasUsed: 21000n,
    gasPrice: 30000000000n,
    decimals: 18,
    usdPrice: 600,
  });
  assert.equal(estimate.baseUnits, 630000000000000n);
  assert.equal(estimate.nativeAmount, "0.00063");
  assert.equal(estimate.usd, "$0.378000");
});

test("keeps large quantities exact and uses the configured native decimals", () => {
  assert.equal(
    estimateGasCost({ gasUsed: 9007199254740993n, gasPrice: 7n, decimals: 6 })
      .nativeAmount,
    "63050394783.186951"
  );
  assert.equal(
    estimateGasCost({ gasUsed: 1n, gasPrice: 1n, decimals: 0 }).nativeAmount,
    "1"
  );
});

test("rejects missing/invalid gas or decimals rather than showing a zero estimate", () => {
  for (const gasUsed of [undefined, null, 21000, -1n, 0n]) {
    assert.throws(
      () =>
        estimateGasCost({
          gasUsed: gasUsed as bigint,
          gasPrice: 1n,
          decimals: 18,
        }),
      /gas used/i
    );
  }
  for (const gasPrice of [undefined, null, 1, -1n]) {
    assert.throws(
      () =>
        estimateGasCost({
          gasUsed: 1n,
          gasPrice: gasPrice as bigint,
          decimals: 18,
        }),
      /gas price/i
    );
  }
  for (const decimals of [-1, 256, 1.2, NaN, undefined]) {
    assert.throws(
      () =>
        estimateGasCost({
          gasUsed: 1n,
          gasPrice: 1n,
          decimals: decimals as number,
        }),
      /decimals/i
    );
  }
  assert.equal(
    estimateGasCost({ gasUsed: 21000n, gasPrice: 0n, decimals: 18 })
      .nativeAmount,
    "0"
  );
});

test("unavailable or invalid USD never hides native costs or invents dollar values", () => {
  for (const usdPrice of [undefined, NaN, Infinity, -1, 0]) {
    const result = estimateGasCost({
      gasUsed: 21000n,
      gasPrice: 1n,
      decimals: 18,
      usdPrice,
    });
    assert.equal(result.nativeAmount, "0.000000000000021");
    assert.equal(result.usd, undefined);
  }
  assert.equal(
    estimateGasCost({ gasUsed: 1n, gasPrice: 1n, decimals: 18, usdPrice: 3000 })
      .usd,
    "< $0.000001"
  );
  assert.equal(
    estimateGasCost({ gasUsed: 1n, gasPrice: 0n, decimals: 18, usdPrice: 3000 })
      .usd,
    "$0.000000"
  );
  assert.equal(
    estimateGasCost({
      gasUsed: 10n ** 400n,
      gasPrice: 1n,
      decimals: 18,
      usdPrice: 3000,
    }).usd,
    undefined
  );
});
