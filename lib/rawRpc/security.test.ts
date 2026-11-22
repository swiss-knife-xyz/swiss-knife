import assert from "node:assert/strict";
import test from "node:test";
import { createRpcHandler } from "./server";
import { RPC_LIMITS } from "./model";
import { RPC_ENDPOINTS } from "./chains";
const rpc = { jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] };
const post = (
  request: unknown = rpc,
  headers: Record<string, string> = {},
  chain = "1"
) =>
  new Request("https://eth.sh/api/rpc", {
    method: "POST",
    headers: {
      origin: "https://eth.sh",
      host: "eth.sh",
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify({ chain, request }),
  });
const reply = (body: any, result: unknown = "0x123") =>
  Response.json({
    jsonrpc: "2.0",
    id: body.id,
    result: body.method === "eth_chainId" ? "0x1" : result,
  });
test("origin/content gates reject cross-site, missing, forwarded and spoofed origins before fetch", async () => {
  let calls = 0;
  const handler = createRpcHandler({
    fetch: async () => {
      calls++;
      throw Error("unexpected");
    },
  });
  for (const headers of [
    { origin: "" },
    { origin: "https://evil.test" },
    { origin: "null" },
    { origin: "https://eth.sh/" },
    { origin: "http://eth.sh" },
    { "content-type": "text/plain" },
    {
      origin: "https://evil.test",
      "x-forwarded-host": "evil.test",
      "x-forwarded-proto": "https",
    },
  ] as Record<string, string>[])
    assert.equal((await handler(post(rpc, headers))).status, 403);
  assert.equal(calls, 0);
});
test("normalized internal URL uses actual host and allows healthy loopback origin only", async () => {
  const handler = createRpcHandler({
    fetch: async (_, init) => reply(JSON.parse(String(init?.body))),
  });
  const request = (origin: string) =>
    new Request("http://localhost:3153/api/rpc", {
      method: "POST",
      headers: {
        origin,
        host: "127.0.0.1:3153",
        "content-type": "application/json",
      },
      body: JSON.stringify({ chain: "1", request: rpc }),
    });
  assert.equal((await handler(request("http://127.0.0.1:3153"))).status, 200);
  assert.equal((await handler(request("http://localhost:3153"))).status, 403);
});
test("all fixed provider destinations match selected chain and never forward credentials", async () => {
  const endpoints = RPC_ENDPOINTS;
  for (const [chain, endpoint] of Object.entries(endpoints)) {
    const handler = createRpcHandler({
      fetch: async (url, init) => {
        assert.equal(url, endpoint);
        assert.deepEqual(init?.headers, { "Content-Type": "application/json" });
        const body = JSON.parse(String(init?.body));
        return Response.json({
          jsonrpc: "2.0",
          id: body.id,
          result:
            body.method === "eth_chainId"
              ? `0x${BigInt(chain).toString(16)}`
              : "0x0",
        });
      },
    });
    assert.equal(
      (
        await handler(
          post(
            rpc,
            { authorization: "Bearer sentinel", cookie: "secret=sentinel" },
            chain
          )
        )
      ).status,
      200
    );
  }
});
test("wrong-chain preflight stops user request", async () => {
  let calls = 0;
  const handler = createRpcHandler({
    fetch: async (_, init) => {
      calls++;
      const body = JSON.parse(String(init?.body));
      return Response.json({ jsonrpc: "2.0", id: body.id, result: "0x2" });
    },
  });
  assert.equal((await handler(post())).status, 502);
  assert.equal(calls, 1);
});
test("valid batches preserve out-of-order IDs, null results and redact provider diagnostics", async () => {
  const handler = createRpcHandler({
    fetch: async (_, init) => {
      const body = JSON.parse(String(init?.body));
      if (!Array.isArray(body)) return reply(body);
      return Response.json([
        {
          jsonrpc: "2.0",
          id: "two",
          error: {
            code: -32000,
            message: "PRIVATE_SENTINEL",
            data: "PRIVATE_SENTINEL",
          },
        },
        { jsonrpc: "2.0", id: 1, result: null },
      ]);
    },
  });
  const response = await handler(post([rpc, { ...rpc, id: "two" }]));
  assert.equal(response.status, 200);
  const text = await response.text();
  assert.ok(!text.includes("PRIVATE_SENTINEL"));
  const rows = JSON.parse(text);
  assert.equal(rows[0].id, "two");
  assert.equal(rows[0].error.code, -32000);
  assert.equal(rows[1].result, null);
});
test("invalid provider envelopes fail closed without leaking arbitrary body or exception text", async () => {
  for (const raw of [
    { jsonrpc: "1.0", id: 1, result: "PRIVATE_SENTINEL" },
    { jsonrpc: "2.0", id: 2, result: 0 },
    { jsonrpc: "2.0", id: 1, result: 0, error: { code: -1 } },
    { jsonrpc: "2.0", id: 1, error: { code: "-1" } },
    [],
    [{ jsonrpc: "2.0", id: 1, result: 0 }],
    "PRIVATE_SENTINEL",
  ]) {
    const handler = createRpcHandler({
      fetch: async (_, init) => {
        const body = JSON.parse(String(init?.body));
        return body.method === "eth_chainId" ? reply(body) : Response.json(raw);
      },
    });
    const response = await handler(post());
    assert.equal(response.status, 502);
    assert.ok(!(await response.text()).includes("PRIVATE_SENTINEL"));
  }
  const handler = createRpcHandler({
    fetch: async () => {
      throw Error("PRIVATE_SENTINEL");
    },
  });
  assert.ok(
    !(await (await handler(post())).text()).includes("PRIVATE_SENTINEL")
  );
});
test("eth_call gas is default-capped without modifying caller draft", async () => {
  const request = {
    ...rpc,
    method: "eth_call",
    params: [{ to: `0x${"ab".repeat(20)}`, data: "0x" }, "latest"],
  };
  const handler = createRpcHandler({
    fetch: async (_, init) => {
      const body = JSON.parse(String(init?.body));
      if (body.method === "eth_call")
        assert.equal(body.params[0].gas, "0x1e8480");
      return reply(body);
    },
  });
  assert.equal((await handler(post(request))).status, 200);
  assert.equal(Object.hasOwn(request.params[0] as object, "gas"), false);
});
test("request and decompressed response streams enforce byte limits", async () => {
  let count = 0;
  const handler = createRpcHandler({
    fetch: async (_, init) => {
      count++;
      const body = JSON.parse(String(init?.body));
      return body.method === "eth_chainId"
        ? reply(body)
        : new Response('"' + "x".repeat(RPC_LIMITS.responseBytes) + '"');
    },
  });
  assert.equal(
    (
      await handler(
        post(rpc, { "content-length": String(RPC_LIMITS.requestBytes + 1) })
      )
    ).status,
    413
  );
  assert.equal(count, 0);
  const huge = new Request("https://eth.sh/api/rpc", {
    method: "POST",
    headers: {
      origin: "https://eth.sh",
      host: "eth.sh",
      "content-type": "application/json",
    },
    body: " ".repeat(RPC_LIMITS.requestBytes + 1),
  });
  assert.equal((await handler(huge)).status, 413);
  assert.equal(count, 0);
  assert.equal((await handler(post())).status, 413);
  assert.equal(count, 2);
});
test("stalled inbound and upstream streams time out and release concurrency slots", async () => {
  const handler = createRpcHandler({
    timeoutMs: 30,
    fetch: async (_, init) => {
      const body = JSON.parse(String(init?.body));
      return body.method === "eth_chainId"
        ? reply(body)
        : new Response(new ReadableStream({ start() {} }));
    },
  });
  const stalled = new Request("https://eth.sh/api/rpc", {
    method: "POST",
    headers: {
      origin: "https://eth.sh",
      host: "eth.sh",
      "content-type": "application/json",
    },
    body: new ReadableStream({ start() {} }),
    duplex: "half",
  } as RequestInit);
  assert.equal((await handler(stalled)).status, 504);
  assert.equal((await handler(post())).status, 504);
  assert.equal((await handler(post())).status, 504);
});
test("concurrent gate and rolling rate window bound process work and recover", async () => {
  let now = 0;
  const pending: (() => void)[] = [];
  const handler = createRpcHandler({
    now: () => now,
    fetch: async (_, init) => {
      const body = JSON.parse(String(init?.body));
      await new Promise<void>((resolve) => pending.push(resolve));
      return reply(body);
    },
  });
  const a = handler(post());
  const b = handler(post());
  await new Promise((r) => setTimeout(r, 5));
  const busy = await handler(post());
  assert.equal(busy.status, 429);
  assert.equal(busy.headers.get("retry-after"), "60");
  pending.splice(0).forEach((r) => r());
  await new Promise((r) => setTimeout(r, 5));
  pending.splice(0).forEach((r) => r());
  assert.equal((await a).status, 200);
  assert.equal((await b).status, 200);
  const fast = createRpcHandler({
    now: () => now,
    fetch: async (_, init) => reply(JSON.parse(String(init?.body))),
  });
  for (let i = 0; i < 30; i++) assert.equal((await fast(post())).status, 200);
  assert.equal((await fast(post())).status, 429);
  now = 60_000;
  assert.equal((await fast(post())).status, 200);
});
