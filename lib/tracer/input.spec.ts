import { expect, it } from "vitest";
import { parseTraceInput } from "./input";
const hash = `0x${"ab".repeat(32)}`;
it.each([
  ["https://etherscan.io", 1],
  ["https://basescan.org", 8453],
  ["https://arbiscan.io", 42161],
  ["https://optimistic.etherscan.io", 10],
  ["https://sepolia.etherscan.io", 11155111],
  ["https://eth.blockscout.com", 1],
  ["https://base.blockscout.com", 8453],
])(
  "detects the network from %s, including query and fragment",
  (base, chainId) => {
    expect(
      parseTraceInput(` ${base}/tx/${hash}?source=share#eventlog `, 137)
    ).toEqual({ hash, chainId });
  }
);
it("keeps the selected network for a hash and accepts links without a scheme", () => {
  expect(parseTraceInput(hash, 8453)).toEqual({ hash, chainId: 8453 });
  expect(parseTraceInput(`basescan.org/tx/${hash}`, 1)).toEqual({
    hash,
    chainId: 8453,
  });
});
it.each([
  `https://basescan.org.attacker.test/tx/${hash}`,
  `https://basescan.org@attacker.test/tx/${hash}`,
  `https://unknown.test/tx/${hash}`,
  "not-a-transaction",
  `https://arkm.com/explorer/tx/${hash}`,
])("rejects unknown or deceptive input %s", (value) => {
  expect(() => parseTraceInput(value, 1)).toThrow();
});
