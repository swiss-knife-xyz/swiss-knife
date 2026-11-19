import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fetchTrace, boundedFetch, TraceGate, publicTraceError } from "./rpc";
import { TRACE_ENDPOINT, TRACE_LIMITS } from "./model";
const hash =
  "0xe5182dd515bf1e872376372ef0c3a0996102e49f6a8195489598931ed9171893";
const fixture = JSON.parse(
  readFileSync(
    new URL("./fixtures/ethereum-execute.json", import.meta.url),
    "utf8"
  )
);
const receipt = {
  transactionHash: hash,
  blockNumber: "0x19392c3",
  blockHash: fixture.provenance.blockHash,
  status: "0x1",
  from: fixture.result.from,
  to: fixture.result.to,
};
test("confirmed transaction flows through allowlisted chain check, callTracer and receipt recheck", async () => {
  const calls: { method: string; params?: unknown[] }[] = [];
  const result = await fetchTrace("1", hash, async (req) => {
    calls.push(req);
    if (req.method === "eth_chainId") return "0x1";
    if (req.method === "eth_getTransactionReceipt") return receipt;
    return fixture.result;
  });
  assert.equal(result.root.children[0].children.length, 2);
  assert.equal(result.status, "success");
  assert.equal(result.blockNumber, "26448579");
  assert.deepEqual(
    calls.map((c) => c.method),
    [
      "eth_chainId",
      "eth_getTransactionReceipt",
      "debug_traceTransaction",
      "eth_getTransactionReceipt",
    ]
  );
  assert.deepEqual(calls[2].params, [
    hash,
    {
      tracer: "callTracer",
      timeout: "8s",
      tracerConfig: { onlyTopCall: false, withLog: false },
    },
  ]);
});

test("transport pins endpoint, forbids redirects, cookies and oversized streaming responses", async () => {
  let cancelled = false;
  let options: RequestInit | undefined;
  const f = boundedFetch(async (_url, init) => {
    options = init;
    return new Response(
      new ReadableStream({
        start(c) {
          c.enqueue(new Uint8Array(TRACE_LIMITS.bytes + 1));
        },
        cancel() {
          cancelled = true;
        },
      })
    );
  });
  await assert.rejects(f(TRACE_ENDPOINT, { method: "POST" }), {
    code: "LIMIT",
  });
  assert.equal(cancelled, true);
  assert.equal(options?.redirect, "error");
  assert.equal(options?.credentials, "omit");
  await assert.rejects(f("https://evil.example", {}), { code: "UNAVAILABLE" });
});
test("transport bounds advertised length and preserves valid JSON body", async () => {
  const over = boundedFetch(
    async () =>
      new Response("{}", {
        headers: { "content-length": String(TRACE_LIMITS.bytes + 1) },
      })
  );
  await assert.rejects(over(TRACE_ENDPOINT), { code: "LIMIT" });
  const valid = boundedFetch(async () => Response.json({ result: "0x1" }));
  assert.deepEqual(await (await valid(TRACE_ENDPOINT)).json(), {
    result: "0x1",
  });
});
test("transport categorizes access and rate limits without exposing provider response bodies", async () => {
  for (const [status, code] of [
    [403, "UNAVAILABLE"],
    [429, "RATE_LIMITED"],
    [500, "UNAVAILABLE"],
  ] as const) {
    const f = boundedFetch(
      async () => new Response("secret-key-never-display", { status })
    );
    await assert.rejects(
      f(TRACE_ENDPOINT),
      (e: any) => e.code === code && !e.message.includes("secret")
    );
  }
});
test("transport deadline also covers stalled body reads", async () => {
  const f = boundedFetch(
    async () => new Response(new ReadableStream({ start() {} })),
    AbortSignal.timeout(20)
  );
  await assert.rejects(f(TRACE_ENDPOINT), { code: "TIMEOUT" });
});
test("shared per-process gate rejects parallel and excessive trace workloads and recovers", async () => {
  const gate = new TraceGate();
  const release = gate.acquire(0);
  assert.throws(() => gate.acquire(0), { code: "RATE_LIMITED" });
  release();
  release();
  for (let i = 0; i < 5; i++) gate.acquire(0)();
  assert.throws(() => gate.acquire(0), { code: "RATE_LIMITED" });
  gate.acquire(60_001)();
});
test("RPC errors have visible safe unsupported, pruned, limit and timeout categories", () => {
  for (const [error, code] of [
    [{ code: -32601, message: "unsupported method" }, "UNSUPPORTED"],
    [{ message: "missing trie node secret-key" }, "PRUNED"],
    [{ message: "429 too many requests" }, "RATE_LIMITED"],
    [{ name: "TimeoutError" }, "TIMEOUT"],
    [{ message: "secret-key" }, "UNAVAILABLE"],
  ] as const) {
    const safe = publicTraceError({ cause: error });
    assert.equal(safe.code, code);
    assert.ok(!safe.message.includes("secret"));
  }
});
test("never traces unconfirmed, invalid input or the wrong network", async () => {
  let traces = 0;
  const request = async (req: any) => {
    if (req.method === "debug_traceTransaction") traces++;
    return req.method === "eth_chainId" ? "0x1" : null;
  };
  await assert.rejects(fetchTrace("1", hash, request), {
    code: "NOT_CONFIRMED",
  });
  await assert.rejects(fetchTrace("137", hash, request), {
    code: "UNSUPPORTED",
  });
  await assert.rejects(fetchTrace("1", "0xno", request), {
    code: "INVALID_INPUT",
  });
  await assert.rejects(
    fetchTrace("1", hash, async () => "0x89"),
    { code: "UNAVAILABLE" }
  );
  assert.equal(traces, 0);
});
test("rejects a trace whose root or rechecked receipt does not match", async () => {
  for (const scenario of ["root", "reorg"]) {
    let n = 0;
    await assert.rejects(
      fetchTrace("1", hash, async (req) => {
        if (req.method === "eth_chainId") return "0x1";
        if (req.method === "debug_traceTransaction")
          return scenario === "root"
            ? { ...fixture.result, from: "0x" + "11".repeat(20) }
            : fixture.result;
        return ++n === 1
          ? receipt
          : { ...receipt, blockHash: "0x" + "11".repeat(32) };
      }),
      { code: scenario === "root" ? "INVALID_TRACE" : "REORG" }
    );
  }
});
test("rejects contradictory transaction status rather than calling a reverted root successful", async () => {
  await assert.rejects(
    fetchTrace("1", hash, async (req) => {
      if (req.method === "eth_chainId") return "0x1";
      if (req.method === "debug_traceTransaction") return fixture.result;
      return { ...receipt, status: "0x0" };
    }),
    { code: "INVALID_TRACE" }
  );
});
