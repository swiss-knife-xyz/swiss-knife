import assert from "node:assert/strict";
import test from "node:test";
import {
  formatHistoryDate,
  parseHistoryTimestamp,
  relativeHistoryDate,
  readHistoryTimestamp,
} from "./dates";

test("missing, malformed and out-of-range dates never reach date-fns", () => {
  for (const value of [
    undefined,
    null,
    "",
    " ",
    false,
    {},
    0,
    "0",
    -1,
    NaN,
    Infinity,
    "invalid",
    "1700000000oops",
    "1e9",
    1.5,
    "18446744073709551615",
    8_640_000_000_001,
  ]) {
    assert.equal(parseHistoryTimestamp(value), null);
    assert.equal(formatHistoryDate(value), "Date unavailable");
    assert.equal(relativeHistoryDate(value), "Date unavailable");
  }
});

test("valid indexed strings and RPC bigint timestamps produce readable dates", () => {
  for (const value of [1700000000, "1700000000", 1700000000n]) {
    assert.equal(parseHistoryTimestamp(value), 1700000000);
    assert.notEqual(formatHistoryDate(value), "Date unavailable");
    assert.notEqual(relativeHistoryDate(value), "Date unavailable");
  }
  assert.equal(parseHistoryTimestamp(8_640_000_000_000), 8_640_000_000_000);
  assert.doesNotThrow(() => formatHistoryDate(8_640_000_000_000));
});

test("failed or missing block dates remain unavailable without failing the event stream", async () => {
  assert.equal(
    await readHistoryTimestamp(async () => {
      throw new Error("RPC unavailable");
    }),
    null
  );
  assert.equal(await readHistoryTimestamp(async () => undefined), null);
  assert.equal(
    await readHistoryTimestamp(async () => 18446744073709551615n),
    null
  );
  assert.equal(await readHistoryTimestamp(async () => 1700000000n), 1700000000);
});
