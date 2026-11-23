// @vitest-environment node
import { expect, it, vi } from "vitest";
import {
  historicalQueryError,
  parseHistoricalTarget,
  resolveHistoricalBlock,
} from "./historicalQuery";

function chain(timestamps: bigint[]) {
  const getBlock = vi.fn(
    async ({
      blockNumber,
      blockTag,
    }: {
      blockNumber?: bigint;
      blockTag?: string;
    }) => {
      const number =
        blockTag === "latest" ? BigInt(timestamps.length - 1) : blockNumber!;
      return { number, timestamp: timestamps[Number(number)] };
    }
  );
  return { getBlock };
}
it("parses bigint block numbers and UTC times independently of local timezone", () => {
  expect(parseHistoricalTarget("block", "9007199254740993")).toEqual({
    mode: "block",
    blockNumber: 9007199254740993n,
  });
  expect(parseHistoricalTarget("time", "2024-01-01T00:00:00.000")).toEqual({
    mode: "time",
    timestamp: 1704067200n,
  });
  expect(parseHistoricalTarget("block", "0")).toEqual({
    mode: "block",
    blockNumber: 0n,
  });
  expect(parseHistoricalTarget("time", "2024-01-01T00:00:00")).toEqual({
    mode: "time",
    timestamp: 1704067200n,
  });
  for (const value of ["-1", "1.5", "1e5", "", "0x123"])
    expect(() => parseHistoricalTarget("block", value)).toThrow();
  for (const value of ["2024-02-30T12:00", "2024-01-01", "invalid"])
    expect(() => parseHistoricalTarget("time", value)).toThrow();
  expect(() => parseHistoricalTarget("time", "2024-01-01T00:00", 0)).toThrow(
    "past"
  );
});
it("returns the last block at or before a time, including duplicate timestamps", async () => {
  const client = chain([100n, 110n, 110n, 110n, 150n, 200n]);
  expect(
    await resolveHistoricalBlock(client as any, {
      mode: "time",
      timestamp: 110n,
    })
  ).toEqual({ number: 3n, timestamp: 110n });
  expect(
    (
      await resolveHistoricalBlock(client as any, {
        mode: "time",
        timestamp: 149n,
      })
    ).number
  ).toBe(3n);
  expect(
    (
      await resolveHistoricalBlock(client as any, {
        mode: "time",
        timestamp: 200n,
      })
    ).number
  ).toBe(5n);
  await expect(
    resolveHistoricalBlock(client as any, { mode: "time", timestamp: 99n })
  ).rejects.toThrow("first block");
});
it("handles explicit genesis and rejects unmined blocks", async () => {
  const client = chain([10n, 20n]);
  expect(
    (
      await resolveHistoricalBlock(client as any, {
        mode: "block",
        blockNumber: 0n,
      })
    ).number
  ).toBe(0n);
  await expect(
    resolveHistoricalBlock(client as any, { mode: "block", blockNumber: 2n })
  ).rejects.toThrow("not been mined");
});
it("uses few requests on a large regular chain and caches old headers per RPC", async () => {
  const getBlock = vi.fn(async ({ blockTag, blockNumber }: any) => {
    const number: bigint = blockTag === "latest" ? 30_000_000n : blockNumber;
    return { number, timestamp: 1000n + number * 12n };
  });
  const client = { getBlock } as any;
  const target = {
    mode: "time" as const,
    timestamp: 1000n + 20_000_000n * 12n + 5n,
  };
  expect(
    (await resolveHistoricalBlock(client, target, { rpcKey: "A" })).number
  ).toBe(20_000_000n);
  expect(getBlock.mock.calls.length).toBeLessThan(12);
  const first = getBlock.mock.calls.length;
  await resolveHistoricalBlock(client, target, { rpcKey: "A" });
  expect(getBlock.mock.calls.length - first).toBe(1);
  await resolveHistoricalBlock(client, target, { rpcKey: "B" });
  expect(getBlock.mock.calls.length).toBeGreaterThan(first + 2);
});
it("re-reads recent headers after a reorg and handles irregular timestamps", async () => {
  const times = [1n, 2n, 100n, 101n, 10000n, 10001n];
  const client = chain(times);
  expect(
    (
      await resolveHistoricalBlock(client as any, {
        mode: "time",
        timestamp: 100n,
      })
    ).number
  ).toBe(2n);
  times[2] = 99n;
  times[3] = 100n;
  expect(
    (
      await resolveHistoricalBlock(client as any, {
        mode: "time",
        timestamp: 100n,
      })
    ).number
  ).toBe(3n);
});
it("cancels between RPC requests and rejects mismatched block responses", async () => {
  const controller = new AbortController();
  const client = {
    getBlock: vi.fn(async () => {
      controller.abort();
      return { number: 100n, timestamp: 100n };
    }),
  };
  await expect(
    resolveHistoricalBlock(
      client as any,
      { mode: "time", timestamp: 50n },
      { signal: controller.signal }
    )
  ).rejects.toMatchObject({ name: "AbortError" });
  expect(client.getBlock).toHaveBeenCalledOnce();
  const wrong = {
    getBlock: vi.fn(async () => ({ number: 10n, timestamp: 100n })),
  };
  await expect(
    resolveHistoricalBlock(wrong as any, { mode: "block", blockNumber: 5n })
  ).rejects.toThrow("different block");
});
it("reports archive errors through nested viem causes without treating contract reverts as RPC failures", () => {
  expect(
    historicalQueryError({
      shortMessage: "Contract call failed",
      cause: { message: "missing trie node" },
    }).needsArchiveRpc
  ).toBe(true);
  expect(
    historicalQueryError({ message: "execution reverted: NotOwner" })
  ).toEqual({
    message: "execution reverted: NotOwner",
    needsArchiveRpc: false,
  });
  expect(historicalQueryError(new Error("returned no data"))).toMatchObject({
    needsArchiveRpc: false,
    message: expect.stringContaining("historical interface"),
  });
});
