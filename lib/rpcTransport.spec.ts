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
it("uses the direct trace endpoint and falls back within the trace policy on provider failure", async () => {
  const { getPublicClient } = await import("./publicClient");
  const urls = getRpcUrlsForChain(369, "trace").map((url) => new URL(url).href);
  const requested: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      requested.push(url);
      if (url === urls[0]) return new Response("unavailable", { status: 503 });
      const request = JSON.parse(String(init?.body));
      return Response.json({ jsonrpc: "2.0", id: request.id, result: "0x171" });
    })
  );
  const client = getPublicClient(369, { rpcPolicy: "trace", timeout: 100 });
  expect(await client.getChainId()).toBe(369);
  expect(requested[0]).toBe("https://rpc.degenprotocol.io/");
  expect(requested).toContain(urls[1]);
  expect(requested.every((url) => urls.includes(url))).toBe(true);
});
it("falls back to the racer when the direct Kaia tracing endpoint is rate-limited", async () => {
  const { getPublicClient } = await import("./publicClient");
  const urls = getRpcUrlsForChain(8217, "trace").map(
    (url) => new URL(url).href
  );
  const requested: string[] = [];
  const call = {
    type: "CALL",
    from: "0x" + "11".repeat(20),
    input: "0x",
    output: "0x",
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      requested.push(url);
      if (url === urls[0]) return new Response("rate limited", { status: 429 });
      const rpc = JSON.parse(String(init?.body));
      expect(rpc.method).toBe("debug_traceTransaction");
      return Response.json({ jsonrpc: "2.0", id: rpc.id, result: call });
    })
  );
  const client = getPublicClient(8217, { rpcPolicy: "trace", timeout: 100 });
  const result = await client.request<{
    Method: "debug_traceTransaction";
    Parameters: [string, { tracer: "callTracer" }];
    ReturnType: unknown;
  }>(
    {
      method: "debug_traceTransaction",
      params: ["0x" + "ab".repeat(32), { tracer: "callTracer" }],
    },
    { retryCount: 0 }
  );
  expect(result).toEqual(call);
  expect(requested).toEqual([
    urls[0],
    "https://evm.stupidtech.net/v1/8217?timeoutMs=10000",
  ]);
});
