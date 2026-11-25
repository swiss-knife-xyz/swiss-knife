import { expect, it } from "vitest";
import { getTraceExplorerLinks } from "./links";

const hash = `0x${"ab".repeat(32)}`;
it.each([
  [1, "mainnet", "eth"],
  [8453, "base", "base"],
  [10, "optimistic", "optimism"],
])(
  "uses each provider's network slug for chain %s",
  (chainId, tenderly, phalcon) => {
    expect(getTraceExplorerLinks(Number(chainId), hash)).toEqual([
      {
        name: "Tenderly",
        href: `https://dashboard.tenderly.co/tx/${tenderly}/${hash}`,
      },
      {
        name: "Phalcon",
        href: `https://app.blocksec.com/phalcon/explorer/tx/${phalcon}/${hash}`,
      },
    ]);
  }
);
it("omits unsupported providers instead of guessing a chain", () => {
  expect(getTraceExplorerLinks(100, hash).map((link) => link.name)).toEqual([
    "Tenderly",
  ]);
  expect(getTraceExplorerLinks(987654321, hash)).toEqual([]);
  expect(getTraceExplorerLinks(8453, "bad hash")).toEqual([]);
});
