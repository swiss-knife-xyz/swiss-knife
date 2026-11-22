import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CUSTOM_CHAINS_KEY } from "./model";
beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
});
it("honors a persisted existing-ID fork on the first request before application providers finish initializing", async () => {
  localStorage.setItem(
    CUSTOM_CHAINS_KEY,
    JSON.stringify([
      {
        id: 1,
        name: "Persisted Ethereum fork",
        rpcUrl: "http://127.0.0.1:18545/",
        symbol: "ETH",
        decimals: 18,
        testnet: true,
      },
    ])
  );
  const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
    const input = JSON.parse(String(init?.body));
    return Response.json({ jsonrpc: "2.0", id: input.id, result: "0x2a" });
  });
  vi.stubGlobal("fetch", fetcher);
  const { getPublicClient } = await import("@/lib/publicClient");
  const earlyClient = getPublicClient(1);
  expect(await earlyClient.request({ method: "eth_blockNumber" })).toBe("0x2a");
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(String(fetcher.mock.calls[0][0])).toBe("http://127.0.0.1:18545/");
  expect(getPublicClient(1).chain.name).toBe("Persisted Ethereum fork");
});
it("makes no RPC request when saved configuration cannot be loaded", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("Storage blocked");
  });
  const { getPublicClient } = await import("@/lib/publicClient");
  await expect(
    getPublicClient(1).request({ method: "eth_blockNumber" })
  ).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
});
