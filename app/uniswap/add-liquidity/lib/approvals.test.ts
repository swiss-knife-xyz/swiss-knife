import assert from "node:assert/strict";
import test from "node:test";
import {
  getErc20ApprovalAmounts,
  isErc20AllowanceSufficient,
  isPermit2AllowanceSufficient,
} from "./approvals";

const allowance = {
  amount: 1_000n,
  expiration: 2_000,
  nonce: 7,
};

test("Permit2 allowance requires both enough amount and enough lifetime", () => {
  assert.equal(isPermit2AllowanceSufficient(allowance, 1_000n, 2_000), true);
  assert.equal(isPermit2AllowanceSufficient(allowance, 1_001n, 2_000), false);
  assert.equal(isPermit2AllowanceSufficient(allowance, 1_000n, 2_001), false);
});

test("expired nonzero Permit2 allowance is never treated as usable", () => {
  assert.equal(
    isPermit2AllowanceSufficient(
      { ...allowance, amount: 2n ** 160n - 1n, expiration: 999 },
      1n,
      1_000
    ),
    false
  );
  assert.equal(isPermit2AllowanceSufficient(undefined, 1n, 1_000), false);
});

test("unknown ERC20 approval state fails closed", () => {
  assert.equal(isErc20AllowanceSufficient(undefined, 1n), false);
  assert.equal(isErc20AllowanceSufficient(0n, 1n), false);
  assert.equal(isErc20AllowanceSufficient(1n, 1n), true);
});

test("ERC20 approval plans handle sufficient and zero-first tokens", () => {
  assert.deepEqual(getErc20ApprovalAmounts(1_000n, 1_000n, 5_000n), []);
  assert.deepEqual(getErc20ApprovalAmounts(0n, 1_000n, 5_000n), [5_000n]);
  assert.deepEqual(getErc20ApprovalAmounts(1n, 1_000n, 5_000n), [0n, 5_000n]);
  assert.deepEqual(getErc20ApprovalAmounts(undefined, 1_000n, 5_000n), [
    0n,
    5_000n,
  ]);
  assert.throws(() => getErc20ApprovalAmounts(0n, 2n, 1n));
});
