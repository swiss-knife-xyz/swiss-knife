import { expect, it } from "vitest";
import { getLikelyUnixTimestamp, parseUnixTimestamp } from "./unixTimestamp";

it("recognizes plausible seconds and milliseconds with exact millisecond precision", () => {
  expect(getLikelyUnixTimestamp("1700000000")).toEqual({ seconds: "1700000000", unit: "seconds" });
  expect(getLikelyUnixTimestamp("1700000000123")).toEqual({ seconds: "1700000000.123", unit: "milliseconds" });
  expect(getLikelyUnixTimestamp("1700000000000")).toEqual({ seconds: "1700000000", unit: "milliseconds" });
  expect(getLikelyUnixTimestamp("946684800")).toBeTruthy();
  expect(getLikelyUnixTimestamp("7258118399999")).toBeTruthy();
  expect(getLikelyUnixTimestamp("4102444800")).toBeTruthy();
});

it("leaves small amounts, large wei quantities, negatives and out-of-range dates alone", () => {
  for (const value of ["0", "123", "-1700000000", "946684799", "7258118400", "7258118400000", "1000000000000000000", "invalid"]) {
    expect(getLikelyUnixTimestamp(value)).toBeNull();
  }
});

it("validates timestamp deep links without applying the suggestion heuristic", () => {
  expect(parseUnixTimestamp("1700000000.123")).toBe(1700000000.123);
  expect(parseUnixTimestamp("0")).toBe(0);
  expect(parseUnixTimestamp("-1")).toBe(-1);
  for (const value of [null, "", "NaN", "Infinity", "1e12", "1700000000.1234", "8640000000001"]) {
    expect(parseUnixTimestamp(value)).toBeUndefined();
  }
});
