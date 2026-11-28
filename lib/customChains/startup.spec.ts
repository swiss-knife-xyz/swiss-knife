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
it("reports a failed saved fork without public fallback, then restores a cached client after explicit reset", async () => {
  const rpcUrl = "http://127.0.0.1:18545/";
  localStorage.setItem(
    CUSTOM_CHAINS_KEY,
    JSON.stringify([
      {
        id: 8453,
        name: "Base fork",
        rpcUrl,
        symbol: "ETH",
        decimals: 18,
        testnet: true,
      },
    ])
  );
  const urls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: unknown, init?: RequestInit) => {
      urls.push(String(url));
      if (String(url) === rpcUrl) throw new TypeError("Failed to fetch");
      const request = JSON.parse(String(init?.body));
      return Response.json({ jsonrpc: "2.0", id: request.id, result: "0x2a" });
    })
  );
  const { getPublicClient } = await import("@/lib/publicClient");
  const { getCustomRpcFailures } = await import("./failures");
  const { removeCustomChain } = await import("./store");
  const client = getPublicClient(8453);
  await expect(client.request({ method: "eth_blockNumber" })).rejects.toThrow();
  expect(urls.length).toBeGreaterThan(0);
  expect(urls.every((url) => url === rpcUrl)).toBe(true);
  expect(getCustomRpcFailures()[0]).toMatchObject({
    chainId: 8453,
    reason: "unreachable",
  });
  await removeCustomChain(8453);
  expect(getCustomRpcFailures()).toEqual([]);
  expect(await client.request({ method: "eth_blockNumber" })).toBe("0x2a");
  expect(urls.at(-1)).not.toBe(rpcUrl);
});
it("reports connection failures from the RPC Console's direct saved-chain requests", async () => {
  const chain = {
    id: 8453,
    name: "Base fork",
    rpcUrl: "http://127.0.0.1:18545/",
    symbol: "ETH",
    decimals: 18,
    testnet: true,
  };
  localStorage.setItem(CUSTOM_CHAINS_KEY, JSON.stringify([chain]));
  const { initializeCustomChains } = await import("./store");
  await initializeCustomChains();
  const { readCustomRpc } = await import("./rpc");
  const { getCustomRpcFailures } = await import("./failures");
  const fetcher = vi.fn(async () => {
    throw new TypeError("Failed to fetch");
  });
  await expect(
    readCustomRpc(
      chain,
      { jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] },
      new AbortController().signal,
      fetcher
    )
  ).rejects.toThrow();
  expect(getCustomRpcFailures()[0]).toMatchObject({
    chainId: 8453,
    reason: "unreachable",
  });
});
it("keeps the trace policy on a saved fork without trying the public trace endpoint", async () => {
  const rpcUrl = "http://127.0.0.1:18545/";
  localStorage.setItem(
    CUSTOM_CHAINS_KEY,
    JSON.stringify([
      {
        id: 369,
        name: "PulseChain fork",
        rpcUrl,
        symbol: "PLS",
        decimals: 18,
        testnet: true,
      },
    ])
  );
  const requested: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: unknown) => {
      requested.push(String(url));
      throw new TypeError("Failed to fetch");
    })
  );
  const { getPublicClient } = await import("@/lib/publicClient");
  const client = getPublicClient(369, { rpcPolicy: "trace", timeout: 100 });
  await expect(client.request({ method: "eth_blockNumber" })).rejects.toThrow();
  expect(requested.length).toBeGreaterThan(0);
  expect(requested.every((url) => url === rpcUrl)).toBe(true);
  const { getRpcUrlsForChain } = await import("@/data/networks");
  expect(getRpcUrlsForChain(369, "trace")).toEqual([rpcUrl]);
});
