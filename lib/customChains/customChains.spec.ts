import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  CUSTOM_CHAINS_KEY,
  CUSTOM_CHAINS_NAMESPACE,
  handleCustomChainRequest,
  isStorageOriginAllowed,
  parseCustomChain,
  parseCustomChains,
  verifyCustomChain,
  type CustomChain,
} from "./model";
import {
  applyCustomNetworks,
  builtinNetworks,
  chainIdToChain,
  getNetworkOptions,
  getRpcUrlsForChain,
} from "@/data/networks";
import { initializeCustomChains } from "./store";
import { getPublicClient } from "@/lib/publicClient";
import { getLiveRpcTransport } from "@/lib/rpcTransport";
import { parseRpcInput } from "@/lib/rawRpc/model";
import { readCustomRpc } from "./rpc";
import { RPC_ENDPOINTS } from "@/lib/rawRpc/chains";
const chain: CustomChain = {
  id: 31337,
  name: "Local fork",
  rpcUrl: "http://127.0.0.1:8545/",
  symbol: "ETH",
  decimals: 18,
  testnet: true,
};
beforeEach(async () => {
  await initializeCustomChains();
});
afterEach(() => {
  applyCustomNetworks([]);
  localStorage.clear();
  vi.unstubAllGlobals();
});
it("validates chain configuration without excluding loopback or private RPCs", () => {
  expect(parseCustomChain(chain)).toEqual(chain);
  expect(
    parseCustomChain({ ...chain, rpcUrl: "http://192.168.1.2:8545" }).rpcUrl
  ).toBe("http://192.168.1.2:8545/");
  for (const value of [
    { ...chain, id: 0 },
    { ...chain, id: Number.MAX_SAFE_INTEGER + 1 },
    { ...chain, rpcUrl: "file:///etc/hosts" },
    { ...chain, decimals: 256 },
    { ...chain, explorerUrl: "javascript:alert(1)" },
  ])
    expect(() => parseCustomChain(value)).toThrow();
  expect(() => parseCustomChains([chain, chain])).toThrow("Duplicate");
});
it("uses a separate versioned namespace and merges writes against the latest shared state", () => {
  localStorage.setItem("global-address-book", '["untouched"]');
  const request = (
    action: "UPSERT" | "REMOVE" | "GET_ALL",
    payload?: unknown
  ) =>
    handleCustomChainRequest(localStorage, {
      namespace: CUSTOM_CHAINS_NAMESPACE,
      id: "test",
      action,
      payload,
    });
  expect(request("UPSERT", chain).success).toBe(true);
  expect(request("UPSERT", { ...chain, id: 31338 }).data).toHaveLength(2);
  expect(
    request("UPSERT", { ...chain, name: "Edited fork" }).data?.find(
      (item) => item.id === 31337
    )?.name
  ).toBe("Edited fork");
  expect(request("REMOVE", 31338).data).toHaveLength(1);
  expect(localStorage.getItem("global-address-book")).toBe('["untouched"]');
  expect(JSON.parse(localStorage.getItem(CUSTOM_CHAINS_KEY)!)).toHaveLength(1);
});
it("only trusts ETH.sh origins or local development siblings at the shared hub", () => {
  for (const origin of [
    "https://eth.sh",
    "https://explorer.eth.sh",
    "https://calldata.eth.sh",
  ])
    expect(isStorageOriginAllowed(origin, "eth.sh")).toBe(true);
  for (const origin of [
    "https://eth.sh.evil.test",
    "https://evil-eth.sh",
    "https://example.com",
    "null",
    "http://explorer.eth.sh",
  ])
    expect(isStorageOriginAllowed(origin, "eth.sh")).toBe(false);
  expect(
    isStorageOriginAllowed("http://explorer.localhost:3210", "localhost")
  ).toBe(true);
  expect(isStorageOriginAllowed("http://localhost:3210", "eth.sh")).toBe(false);
});
it("verifies the endpoint's chain ID before accepting it", async () => {
  const fetcher = vi
    .fn()
    .mockImplementation(async () =>
      Response.json({ jsonrpc: "2.0", id: 1, result: "0x7a69" })
    );
  await verifyCustomChain(chain, undefined, fetcher);
  expect(fetcher.mock.calls[0][0]).toBe(chain.rpcUrl);
  expect(fetcher.mock.calls[0][1].credentials).toBe("omit");
  await expect(
    verifyCustomChain({ ...chain, id: 1 }, undefined, fetcher)
  ).rejects.toThrow("31337");
});
it("replaces cached clients and disables every public fallback for an existing-ID fork", () => {
  const original = getPublicClient(1);
  applyCustomNetworks([{ ...chain, id: 1 }]);
  const fork = getPublicClient(1);
  expect(fork).not.toBe(original);
  expect(fork.chain.name).toBe("Local fork");
  expect(getPublicClient(1)).toBe(fork);
  expect(getRpcUrlsForChain(1)).toEqual([chain.rpcUrl]);
  expect(getRpcUrlsForChain(1, "public")).not.toContain(chain.rpcUrl);
  expect(Object.values(RPC_ENDPOINTS)).not.toContain(chain.rpcUrl);
  applyCustomNetworks([]);
  expect(chainIdToChain[1]).toBe(builtinNetworks[1]);
  expect(getPublicClient(1)).not.toBe(fork);
  expect(getRpcUrlsForChain(1)).not.toContain(chain.rpcUrl);
});
it("adds custom identities to the selector catalog and removes them cleanly", () => {
  applyCustomNetworks([chain]);
  expect(getNetworkOptions().some((option) => option.value === 31337)).toBe(
    true
  );
  expect(getPublicClient(31337).chain.id).toBe(31337);
  applyCustomNetworks([]);
  expect(chainIdToChain[31337]).toBeUndefined();
  expect(() => getPublicClient(31337)).toThrow("unsupported");
});
it("existing wagmi transports follow RPC overrides without ever contacting the old endpoint", async () => {
  const fetcher = vi.fn(async (_input: unknown, init?: RequestInit) => {
    const request = JSON.parse(String(init?.body));
    return Response.json({ jsonrpc: "2.0", id: request.id, result: "0x1" });
  });
  vi.stubGlobal("fetch", fetcher);
  const transport = getLiveRpcTransport(1)({ chain: builtinNetworks[1] });
  applyCustomNetworks([{ ...chain, id: 1 }]);
  await transport.request({ method: "eth_blockNumber", params: [] });
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(new URL(String(fetcher.mock.calls[0][0])).href).toBe(chain.rpcUrl);
});
it("allows custom RPC reads directly in the browser while keeping the server allowlist fixed", async () => {
  const request = {
    jsonrpc: "2.0",
    id: 2,
    method: "eth_blockNumber",
    params: [],
  };
  expect(() => parseRpcInput({ chain: "31337", request })).toThrow();
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ result: "0x7a69" }))
    .mockResolvedValueOnce(
      Response.json({ jsonrpc: "2.0", id: 2, result: "0x2a" })
    );
  expect(
    await readCustomRpc(chain, request, new AbortController().signal, fetcher)
  ).toEqual({ jsonrpc: "2.0", id: 2, result: "0x2a" });
  expect(fetcher.mock.calls.every((call) => call[0] === chain.rpcUrl)).toBe(
    true
  );
  await expect(
    readCustomRpc(
      chain,
      { ...request, method: "eth_sendTransaction" },
      new AbortController().signal,
      fetcher
    )
  ).rejects.toThrow();
});
