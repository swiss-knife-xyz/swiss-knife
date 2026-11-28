import { describe, expect, it } from "vitest";
import {
  flattenCalls,
  normalizeTrace,
  parseTraceJson,
  MAX_TRACE_BYTES,
} from "./model";

const from = `0x${"11".repeat(20)}`;
const to = `0x${"22".repeat(20)}`;
const call = (extra = {}) => ({
  type: "CALL",
  from,
  to,
  input: "0x",
  output: "0x",
  ...extra,
});
describe("call trace normalization", () => {
  it("accepts a reverted root and preserves a caught child failure without failing its parent", () => {
    const root = normalizeTrace(
      call({ calls: [call({ error: "execution reverted" })] })
    ).call;
    expect(root.error).toBeUndefined();
    expect(root.calls[0].error).toBe("execution reverted");
    expect(root.calls[0].id).toBe("0.0");
    expect(
      normalizeTrace(call({ error: "execution reverted" })).call.error
    ).toBe("execution reverted");
  });
  it("round trips context, large quantities and log positions", () => {
    const document = {
      version: 1,
      chainId: 1,
      transactionHash: `0x${"ff".repeat(32)}`,
      call: call({
        value: "0xffffffffffffffffffff",
        calls: [call()],
        logs: [{ address: to, topics: [], data: "0x", position: 1 }],
      }),
    };
    const parsed = parseTraceJson(JSON.stringify(document));
    expect(parsed.chainId).toBe(1);
    expect(parsed.transactionHash).toBe(document.transactionHash);
    expect(parsed.call.value).toBe("0xffffffffffffffffffff");
    expect(parsed.call.logs[0].position).toBe(1);
    expect(parseTraceJson(JSON.stringify(parsed))).toEqual(parsed);
    expect(flattenCalls(parsed.call)).toHaveLength(2);
  });
  it("accepts JSON-RPC result envelopes and creation without a target", () => {
    expect(
      normalizeTrace({
        jsonrpc: "2.0",
        result: call({ type: "CREATE", to: null }),
      }).call.to
    ).toBeUndefined();
    expect(() =>
      normalizeTrace({ jsonrpc: "2.0", error: { code: -32601 } })
    ).toThrow("JSON-RPC");
    expect(() => normalizeTrace({ structLogs: [] })).toThrow(
      "Unsupported trace format"
    );
    expect(() => normalizeTrace([])).toThrow();
  });
  it.each([
    { from: "garbage" },
    { to: "0x1234" },
    { input: "0x1" },
    { output: "abc" },
    { value: 123 },
    { gas: "-1" },
    { logs: [{ address: to, topics: ["0x1234"], data: "0x" }] },
    { logs: [{ address: to, topics: [], data: "0x", position: 1 }] },
    { calls: {} },
    { type: "NOTACALL" },
  ])("rejects malformed fields %j", (extra) =>
    expect(() => normalizeTrace(call(extra))).toThrow()
  );
  it("bounds depth, call count, input bytes and total log count", () => {
    let nested = call();
    for (let i = 0; i < 66; i++) nested = call({ calls: [nested] });
    expect(() => normalizeTrace(nested)).toThrow("64 levels");
    expect(() =>
      normalizeTrace(
        call({ calls: Array.from({ length: 5000 }, () => call()) })
      )
    ).toThrow("5,000 calls");
    expect(() => parseTraceJson(" ".repeat(MAX_TRACE_BYTES + 1))).toThrow(
      "8 MiB"
    );
    expect(() =>
      normalizeTrace(call({ logs: new Array(10001).fill({}) }))
    ).toThrow("10,000 logs");
  });
  it("validates exported network and transaction context", () => {
    expect(() =>
      normalizeTrace({ version: 1, chainId: -1, call: call() })
    ).toThrow("chain ID");
    expect(() =>
      normalizeTrace({ version: 1, transactionHash: "wrong", call: call() })
    ).toThrow("transaction hash");
  });
  it("accepts Anvil hex log positions without accepting arbitrary numeric strings", () => {
    expect(
      normalizeTrace(
        call({
          logs: [{ address: to, topics: [], data: "0x", position: "0x0" }],
        })
      ).call.logs[0].position
    ).toBe(0);
    expect(() =>
      normalizeTrace(
        call({ logs: [{ address: to, topics: [], data: "0x", position: "0" }] })
      )
    ).toThrow("log position");
  });
});

it("accepts zkSync null optional errors without marking successful calls failed", () => {
  const document = normalizeTrace({ type: "call", from: "0x" + "11".repeat(20), error: null, revertReason: null });
  expect(document.call.type).toBe("CALL");
  expect(document.call).not.toHaveProperty("error");
  expect(document.call).not.toHaveProperty("revertReason");
});
