import assert from "node:assert/strict";
import test from "node:test";
import { createRpcHandler } from "./server";
import { RPC_LIMITS } from "./model";
test("oversize and HTTP rejection never wait for uncooperative response cancellation", async () => {
  for (const kind of ["stream", "header", "http"] as const) {
    const handler = createRpcHandler({
      timeoutMs: 20,
      fetch: async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              if (kind === "stream")
                controller.enqueue(
                  new Uint8Array(RPC_LIMITS.responseBytes + 1)
                );
            },
            cancel() {
              return new Promise(() => {});
            },
          }),
          {
            status: kind === "http" ? 429 : 200,
            headers:
              kind === "header"
                ? { "content-length": String(RPC_LIMITS.responseBytes + 1) }
                : {},
          }
        ),
    });
    const result = await Promise.race([
      handler(post()),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 150)),
    ]);
    assert.ok(
      result,
      `${kind} must settle without cancellation acknowledgement`
    );
    assert.equal(result.status, kind === "http" ? 429 : 413);
  }
});
const post = () =>
  new Request("https://eth.sh/api/rpc", {
    method: "POST",
    headers: {
      origin: "https://eth.sh",
      host: "eth.sh",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      chain: "1",
      request: { jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] },
    }),
  });
test("a stalled stream cancellation cannot outlive the total request deadline", async () => {
  const handler = createRpcHandler({
    timeoutMs: 20,
    fetch: async () =>
      new Response(
        new ReadableStream({
          start() {},
          cancel() {
            return new Promise(() => {});
          },
        })
      ),
  });
  const result = await Promise.race([
    handler(post()),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 150)),
  ]);
  assert.ok(
    result,
    "handler must settle even when cancellation never acknowledges"
  );
  assert.equal(result.status, 504);
});
