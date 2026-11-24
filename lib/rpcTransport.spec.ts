// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { createPublicClient } from "viem";
import { getRpcTransport } from "./rpcTransport";
import {
  networkRegistry,
  getRpcUrlsForChain,
  chainIdToCustomRpcUrl,
} from "@/data/networks";

afterEach(() => vi.unstubAllGlobals());
it("falls back from a failed configured endpoint using the selected chain's public RPC", async () => {
  const previous = chainIdToCustomRpcUrl[8453];
  chainIdToCustomRpcUrl[8453] = "https://configured.example/base";
  const urls = getRpcUrlsForChain(8453);
  const requested: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      requested.push(new URL(url).href);
      if (url === urls[0]) return new Response("unavailable", { status: 503 });
      const request = JSON.parse(String(init?.body));
      return new Response(
        JSON.stringify({ jsonrpc: "2.0", id: request.id, result: "0x2105" }),
        {
          headers: { "content-type": "application/json" },
        }
      );
    })
  );
  try {
    const client = createPublicClient({
      chain: networkRegistry[8453],
      transport: getRpcTransport(8453, 100),
    });
    expect(await client.getChainId()).toBe(8453);
    expect(requested[0]).toBe(new URL(urls[0]).href);
    expect(requested).toContain(new URL(urls[1]).href);
    expect(
      requested.every((url) =>
        urls.some((endpoint) => new URL(endpoint).href === url)
      )
    ).toBe(true);
  } finally {
    chainIdToCustomRpcUrl[8453] = previous;
  }
});
it("rejects unsupported networks instead of silently falling back to another chain", () => {
  expect(() => getRpcTransport(999999123)).toThrow("Unsupported RPC chain");
});
