import { expect, it } from "vitest";
import { getDelegatedImplementation } from "./eip7702";

it("extracts only an exact EIP-7702 designator", () => {
  const address = "0x1234567890123456789012345678901234567890";
  expect(getDelegatedImplementation(`0xef0100${address.slice(2)}`)).toBe(address);
  expect(getDelegatedImplementation(`0xEF0100${address.slice(2)}`)).toBe(address);
  for (const code of [undefined, "0x", "0x6000", "0xef0100", `0xef0101${address.slice(2)}`, `0xef0100${address.slice(2)}00`, `0xef0100${"0".repeat(40)}`]) {
    expect(getDelegatedImplementation(code)).toBeNull();
  }
});
