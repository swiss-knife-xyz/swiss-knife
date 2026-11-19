import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { GET } from "./route";
import { TRACE_ENDPOINT, TRACE_EXAMPLE } from "../../../lib/trace/model";
const fixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../lib/trace/fixtures/ethereum-execute.json",
      import.meta.url
    ),
    "utf8"
  )
);
test("API rejects unsupported chain and malformed hash before any outbound traffic", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("must not call network");
  };
  try {
    for (const [query, status] of [
      ["chain=137&hash=" + TRACE_EXAMPLE, 400],
      ["chain=1&hash=bad", 400],
    ]) {
      const response = await GET(
        new Request("https://explorer.eth.sh/api/trace?" + query)
      );
      assert.equal(response.status, status);
      assert.match(response.headers.get("cache-control")!, /no-store/);
      assert.ok((await response.json()).error.code);
    }
  } finally {
    globalThis.fetch = original;
  }
});
test("API uses real viem transport with exact pinned methods, no retry, and returns executed frames", async () => {
  const original = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = async (url, init) => {
    assert.equal(String(url), TRACE_ENDPOINT);
    const req = JSON.parse(String(init?.body));
    calls.push(req.method);
    const result =
      req.method === "eth_chainId"
        ? "0x1"
        : req.method === "debug_traceTransaction"
          ? fixture.result
          : {
              transactionHash: TRACE_EXAMPLE,
              blockNumber: "0x19392c3",
              blockHash: fixture.provenance.blockHash,
              status: "0x1",
              from: fixture.result.from,
              to: fixture.result.to,
            };
    return Response.json({ jsonrpc: "2.0", id: req.id, result });
  };
  try {
    const response = await GET(
      new Request(
        "https://explorer.eth.sh/api/trace?chain=1&hash=" +
          TRACE_EXAMPLE +
          "&rpc=https://evil.example"
      )
    );
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.root.children[0].children[0].error, "execution reverted");
    assert.equal(body.hash, TRACE_EXAMPLE);
    assert.deepEqual(calls, [
      "eth_chainId",
      "eth_getTransactionReceipt",
      "debug_traceTransaction",
      "eth_getTransactionReceipt",
    ]);
  } finally {
    globalThis.fetch = original;
  }
});
