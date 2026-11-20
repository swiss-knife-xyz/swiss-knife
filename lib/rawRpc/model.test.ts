import assert from "node:assert/strict";
import test from "node:test";
import { parseRpcInput } from "./model";
const raw = (
  method = "eth_chainId",
  params: unknown[] = [],
  id: string | number = 1
) => ({ jsonrpc: "2.0", id, method, params });
const input = (request: unknown, chain = "1") => ({ chain, request });
test("accepts exact raw chain read and preserves ID", () => {
  const value = input(raw("eth_chainId", [], "read"));
  assert.deepEqual(parseRpcInput(value), value);
});
test("positive allowlist rejects writes, signing, admin, filters, trace and unknown methods including mixed batch", () => {
  for (const method of [
    "eth_sendRawTransaction",
    "eth_sendTransaction",
    "eth_sign",
    "personal_sign",
    "eth_signTypedData_v4",
    "wallet_sendCalls",
    "admin_peers",
    "debug_setHead",
    "debug_traceCall",
    "eth_newFilter",
    "eth_uninstallFilter",
    "evm_mine",
    "anvil_setBalance",
    "eth_getLogs",
    "eth_estimateGas",
    "unknown",
    "ETH_CHAINID",
    " eth_chainId",
    "__proto__",
    "toString",
  ]) {
    assert.throws(() => parseRpcInput(input(raw(method))), Error, method);
    assert.throws(
      () => parseRpcInput(input([raw(), raw(method, [], 2)])),
      Error,
      `mixed ${method}`
    );
  }
});
test("requires an exact envelope, allowed chain, JSON-RPC2, unique non-null safe IDs and positional params", () => {
  for (const value of [
    null,
    {},
    [],
    input(raw(), "https://evil.test"),
    input(raw(), "01"),
    { ...input(raw()), url: "https://evil.test" },
    input({ ...raw(), jsonrpc: "1.0" }),
    input({ ...raw(), id: null }),
    input({ ...raw(), id: 1.1 }),
    input({ ...raw(), id: Number.MAX_SAFE_INTEGER + 1 }),
    input({ ...raw(), id: "x".repeat(65) }),
    input({ jsonrpc: "2.0", method: "eth_chainId", params: [] }),
    input({ ...raw(), params: {} }),
    input({ ...raw(), extra: true }),
    input([]),
    input(Array.from({ length: 11 }, (_, i) => raw("eth_chainId", [], i))),
    input([raw(), raw()]),
  ])
    assert.throws(() => parseRpcInput(value), Error, JSON.stringify(value));
  assert.deepEqual(
    parseRpcInput(
      input([raw("eth_chainId", [], 1), raw("eth_blockNumber", [], "1")])
    ),
    input([raw("eth_chainId", [], 1), raw("eth_blockNumber", [], "1")])
  );
});
const address = `0x${"ab".repeat(20)}`;
const hash = `0x${"cd".repeat(32)}`;
test("validates each method's count and exact parameter shapes without number conversion", () => {
  const fixtures: [string, unknown[]][] = [
    ...[
      "eth_chainId",
      "eth_blockNumber",
      "eth_gasPrice",
      "eth_maxPriorityFeePerGas",
    ].map((m): [string, unknown[]] => [m, []]),
    ["eth_getBalance", [address, "latest"]],
    ["eth_getTransactionCount", [address, "pending"]],
    [
      "eth_getCode",
      [
        address,
        "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
      ],
    ],
    ["eth_getStorageAt", [address, "0x0", "safe"]],
    ["eth_getBlockByNumber", ["finalized", false]],
    ["eth_getBlockByHash", [hash, true]],
    ["eth_getTransactionByHash", [hash]],
    ["eth_getTransactionReceipt", [hash]],
    ["eth_getBlockTransactionCountByNumber", ["0x0"]],
    ["eth_getBlockTransactionCountByHash", [hash]],
    [
      "eth_call",
      [
        {
          to: address,
          from: address,
          data: "0x12345678",
          gas: "0x186a0",
          value: "0x0",
        },
        "latest",
      ],
    ],
  ];
  for (const [method, params] of fixtures) {
    assert.deepEqual(
      parseRpcInput(input(raw(method, params))),
      input(raw(method, params))
    );
    assert.throws(
      () => parseRpcInput(input(raw(method, [...params, "extra"]))),
      Error,
      method
    );
  }
  for (const [method, params] of [
    ["eth_getBalance", [address, "0x00"]],
    ["eth_getBalance", ["alice.eth", "latest"]],
    ["eth_getBalance", [address, { blockHash: hash }]],
    ["eth_getStorageAt", [address, -1, "latest"]],
    ["eth_getBlockByNumber", ["latest", "false"]],
    ["eth_getTransactionByHash", [address]],
    ["eth_call", [{ to: address, data: "0x1" }, "latest"]],
    ["eth_call", [{ data: "0x" }, "latest"]],
    ["eth_call", [{ to: address, gas: "0x1e8481" }, "latest"]],
    ["eth_call", [{ to: address, nonce: "0x0" }, "latest"]],
    [
      "eth_call",
      [{ to: address }, "latest", { [address]: { balance: "0x1" } }],
    ],
    ["eth_call", [{ to: address, data: `0x${"aa".repeat(8193)}` }, "latest"]],
  ] as [string, unknown[]][])
    assert.throws(
      () => parseRpcInput(input(raw(method, params))),
      Error,
      `${method} ${JSON.stringify(params).slice(0, 120)}`
    );
});
