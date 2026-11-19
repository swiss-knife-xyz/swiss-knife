import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { normalizeCallTrace, traceInput } from "./model";

const fixture = () =>
  JSON.parse(
    readFileSync(
      new URL("./fixtures/ethereum-execute.json", import.meta.url),
      "utf8"
    )
  );
test("preserves real executed ancestry, ordering and reverted internal frames", () => {
  const { result } = fixture();
  const root = normalizeCallTrace(result);
  assert.equal(root.type, "CALL");
  assert.equal(root.children[0].type, "DELEGATECALL");
  assert.deepEqual(
    root.children[0].children.map((c) => c.type),
    ["STATICCALL", "CALL"]
  );
  assert.equal(
    root.children[0].children[0].children[0].error,
    "execution reverted"
  );
  assert.equal(root.children[0].children[1].children[0].path, "0.0.1.0");
  assert.equal(root.children[0].children[1].input.slice(0, 10), "0xa9059cbb");
});

test("accepts native transfers, CREATE, failed CREATE2, CALLCODE and SELFDESTRUCT without inventing calldata", () => {
  const base = fixture().result;
  const transfer = { ...base, input: "0x", calls: [] };
  assert.equal(normalizeCallTrace(transfer).input, "0x");
  for (const type of ["CREATE", "CREATE2", "CALLCODE", "SELFDESTRUCT"]) {
    const node = normalizeCallTrace({
      ...transfer,
      type,
      ...(type === "CREATE2" ? { error: "out of gas", to: undefined } : {}),
    });
    assert.equal(node.type, type);
  }
  const selfdestruct = normalizeCallTrace({
    type: "SELFDESTRUCT",
    from: base.from,
    to: base.to,
    value: "0x1",
  });
  assert.equal(selfdestruct.gasUsed, undefined);
});
test("rejects partial, malformed and excessive trace trees rather than flattening them", () => {
  const base = fixture().result;
  for (const overrides of [
    { type: "LOG" },
    { from: "0x1" },
    { input: "0x1" },
    { output: "0xzz" },
    { gas: "-1" },
    { calls: {} },
    { to: undefined },
    { type: "CREATE", to: undefined },
    { error: {} },
  ]) {
    assert.throws(() => normalizeCallTrace({ ...base, ...overrides }), {
      code: "INVALID_TRACE",
    });
  }
  let deep: any = { ...base, calls: [] };
  for (let i = 0; i < 33; i++) deep = { ...base, calls: [deep] };
  assert.throws(() => normalizeCallTrace(deep), { code: "LIMIT" });
  assert.throws(
    () =>
      normalizeCallTrace({
        ...base,
        calls: Array.from({ length: 512 }, () => ({ ...base, calls: [] })),
      }),
    { code: "LIMIT" }
  );
  assert.throws(() => traceInput("1", "0x" + "a".repeat(65)), {
    code: "INVALID_INPUT",
  });
  assert.throws(() => traceInput("01", "0x" + "a".repeat(64)), {
    code: "UNSUPPORTED",
  });
});
