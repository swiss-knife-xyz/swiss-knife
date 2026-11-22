import assert from "node:assert/strict";
import test from "node:test";
import { createRpcHandler } from "./server";
const rpc = { jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] };
const post = (request: unknown = rpc, chain = "1", headers = {}) =>
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
test("server validates before fixed upstream, checks chain, preserves raw result and hardens fetch", async () => {
  const calls: { url: string; init: RequestInit; body: any }[] = [];
  const handler = createRpcHandler({
    fetch: async (url, init) => {
      const body = JSON.parse(String(init?.body));
      calls.push({ url: String(url), init: init!, body });
      return Response.json({
        jsonrpc: "2.0",
        id: body.id,
        result: body.method === "eth_chainId" ? "0x1" : "0x1234567890abcdef",
      });
    },
  });
  const response = await handler(post());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    jsonrpc: "2.0",
    id: 1,
    result: "0x1234567890abcdef",
  });
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(calls.length, 2);
  for (const c of calls) {
    assert.equal(c.url, "https://eth.drpc.org");
    assert.equal(c.init.redirect, "error");
    assert.equal(c.init.credentials, "omit");
    assert.equal(c.init.cache, "no-store");
    assert.deepEqual(c.init.headers, { "Content-Type": "application/json" });
  }
  assert.deepEqual(calls[1].body, rpc);
});
test("mixed/invalid/writing/URL inputs never reach provider", async () => {
  let count = 0;
  const handler = createRpcHandler({
    fetch: async () => {
      count++;
      throw new Error("unexpected upstream");
    },
  });
  for (const request of [
    [rpc, { ...rpc, id: 2, method: "eth_sendRawTransaction", params: ["0x"] }],
    { ...rpc, method: "admin_peers" },
    [],
    { ...rpc, params: ["https://evil.test"] },
  ])
    assert.equal((await handler(post(request))).status, 400);
  assert.equal((await handler(post(rpc, "https://evil.test"))).status, 400);
  assert.equal(count, 0);
});
