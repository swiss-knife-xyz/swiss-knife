import assert from "node:assert/strict";
import { test } from "node:test";
import { Interface, type JsonFragment } from "ethers";
import * as calls from "./contractCall";

const abi: JsonFragment[] = [
  {
    type: "function",
    name: "transfer",
    inputs: [{ type: "address" }, { type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "transfer",
    inputs: [{ type: "uint256" }],
    stateMutability: "nonpayable",
  },
];
const address = "0x0000000000000000000000000000000000000001";

test("share link restores chain/address route and versioned review-only fragment context", () => {
  const data = new Interface(abi).encodeFunctionData("transfer(uint256)", [42]);
  const payload = {
    data,
    value: "9007199254740993",
    abiMode: "implementation" as const,
    signature: "transfer(uint256)",
  };
  const url = calls.createContractCallLink(
    "https://explorer.eth.sh/",
    8453,
    address,
    payload
  );
  const parsed = new URL(url);
  assert.equal(parsed.pathname, `/8453/${address}`);
  assert.equal(parsed.search, "");
  assert.deepEqual(calls.parseContractCallFragment(parsed.hash), payload);
  assert.equal(calls.parseContractCallFragment("#other"), null);
});
test("rejects invalid or oversized link payloads, duplicate fields and unsupported versions", () => {
  const data = new Interface(abi).encodeFunctionData("transfer(uint256)", [0]);
  const good = new URL(
    calls.createContractCallLink("https://explorer.eth.sh/", 1, address, {
      data,
      value: "0",
      abiMode: "contract",
      signature: "transfer(uint256)",
    })
  ).hash;
  for (const hash of [
    good.replace("call=1", "call=2"),
    `${good}&value=1`,
    good.replace("value=0", "value=-1"),
    good.replace("abi=contract", "abi=evil"),
    good.replace("value=0", `value=${2n ** 256n}`),
    `${good}&send=true`,
  ]) {
    assert.throws(() => calls.parseContractCallFragment(hash));
  }
  assert.throws(() =>
    calls.decodeContractCall(
      abi,
      `0x${"00".repeat(calls.MAX_CALLDATA_BYTES + 1)}`
    )
  );
  assert.throws(() =>
    calls.createContractCallLink("https://explorer.eth.sh/", 0, address, {
      data,
      value: "0",
      abiMode: "contract",
      signature: "transfer(uint256)",
    })
  );
});
test("decodes the matching overload and preserves exact integers as form strings", () => {
  const data = new Interface(abi).encodeFunctionData(
    "transfer(address,uint256)",
    [address, 9007199254740993n]
  );
  const result = calls.decodeContractCall(abi, data);
  assert.equal(result.signature, "transfer(address,uint256)");
  assert.deepEqual(result.args, [address, "9007199254740993"]);
});

test("rejects malformed, unknown, truncated and noncanonical calldata", () => {
  const valid = new Interface(abi).encodeFunctionData("transfer(uint256)", [
    1n,
  ]);
  for (const data of [
    "",
    "0x",
    "1234",
    "0x123",
    "0xzzzzzzzz",
    "0xdeadbeef",
    valid.slice(0, -2),
    `${valid}00`,
    ` ${valid}`,
  ]) {
    assert.throws(() => calls.decodeContractCall(abi, data), Error, data);
  }
});
test("rejects ambiguous selector collisions rather than using ABI order", () => {
  const collision: JsonFragment[] = [
    { type: "function", name: "burn", inputs: [{ type: "uint256" }] },
    {
      type: "function",
      name: "collate_propagate_storage",
      inputs: [{ type: "bytes16" }],
    },
  ];
  const data = new Interface([collision[0]]).encodeFunctionData("burn", [0]);
  assert.throws(() => calls.decodeContractCall(collision, data), /ambiguous/i);
});
test("deduplicates identical ABI entries but rejects unknown input types", () => {
  const data = new Interface(abi).encodeFunctionData("transfer(uint256)", [0]);
  assert.deepEqual(calls.decodeContractCall([...abi, abi[1]], data).args, [
    "0",
  ]);
  assert.throws(() =>
    calls.decodeContractCall(
      [{ ...abi[1], inputInference: { source: "unknown" } } as any],
      data
    )
  );
});
test("roundtrips nested tuples, dynamic/fixed arrays, false, empty bytes/string and selector-only calls", () => {
  const iface = new Interface([
    "function configure((bool enabled,uint256[2] limits,string note)[] settings,bytes data)",
    "function ping()",
  ]);
  const nested = iface.fragments.map((f) =>
    JSON.parse(f.format("json"))
  ) as JsonFragment[];
  const values = [
    [
      [true, [0n, 9007199254740993n], ""],
      [false, [1n, 2n], "hello"],
    ],
    "0x",
  ];
  const data = iface.encodeFunctionData("configure", values);
  const decoded = calls.decodeContractCall(nested, data);
  assert.deepEqual(decoded.args, [
    [
      ["true", ["0", "9007199254740993"], ""],
      ["false", ["1", "2"], "hello"],
    ],
    "0x",
  ]);
  // Booleans are form strings; the existing form conversion is tested in UI.
  assert.deepEqual(
    calls.decodeContractCall(nested, iface.encodeFunctionData("ping")).args,
    []
  );
});

test("decodes named inferred functions with complete input types", () => {
  const func = {
    ...abi[1],
    selector: new Interface(abi).getFunction("transfer(uint256)")!.selector,
    inputInference: { source: "signature", message: "Inferred" },
  };
  const data = new Interface(abi).encodeFunctionData("transfer(uint256)", [17]);
  assert.deepEqual(calls.decodeContractCall([func], data), {
    signature: "transfer(uint256)",
    args: ["17"],
  });
});

test("nameless inferred functions use distinct on-chain selectors and roundtrip their arguments", () => {
  const functions = ["0x12345678", "0x87654321"].map((selector) => ({
    type: "function",
    name: `selector: ${selector}`,
    selector,
    inputs: [{ name: "arg0", type: "uint256" }],
    inputInference: { source: "bytecode", message: "Inferred" },
  }));
  const encoded = new Interface([
    "function inferred(uint256)",
  ]).encodeFunctionData("inferred", [17]);
  const data = functions[0].selector + encoded.slice(10);
  assert.deepEqual(calls.decodeContractCall(functions, data), {
    signature: "0x12345678(uint256)",
    args: ["17"],
  });
  assert.notEqual(
    calls.contractFunctionSignature(functions[0]),
    calls.contractFunctionSignature(functions[1])
  );
  assert.throws(() => calls.decodeContractCall(functions, data + "00"));
  assert.throws(() =>
    calls.decodeContractCall(
      [{ ...functions[0], inputInference: { source: "unknown" } } as any],
      data
    )
  );
});

test("rejects ambiguous inferred input shapes for the same selector", () => {
  const functions = ["uint256", "bytes32"].map((type) => ({
    type: "function",
    name: "selector: 0x12345678",
    selector: "0x12345678",
    inputs: [{ name: "arg0", type }],
    inputInference: { source: "bytecode", message: "Inferred" },
  }));
  const data = "0x12345678" + "0".repeat(63) + "1";
  assert.throws(() => calls.decodeContractCall(functions, data), /ambiguous/i);
});

test("unfinished form links preserve blanks and validate the selected function shape", () => {
  for (const args of [[null, null], [address, null]]) {
    const payload = { args, signature: "transfer(address,uint256)", value: "0", abiMode: "contract" as const };
    const link = calls.createContractCallLink("https://explorer.eth.sh/", 1, address, payload);
    const restored = calls.parseContractCallFragment(new URL(link).hash)!;
    assert.deepEqual(restored, payload);
    assert.ok("args" in restored);
    assert.deepEqual(calls.restoreSharedFunctionForm(abi, restored).args, args);
    assert.throws(() => calls.restoreSharedFunctionForm(abi, { ...payload, args: [] }));
    assert.throws(() => calls.restoreSharedFunctionForm(abi, { ...payload, args: [[], null] }));
  }
});

test("raw transaction links preserve bytes/value without preselecting an ABI or signature", () => {
  const review = { data: "0xd0e30db0", value: "10000000000000000" };
  const url = new URL(calls.createContractCallLink("https://explorer.eth.sh/", 1, address, review));
  assert.equal(url.pathname, `/1/${address}`);
  assert.deepEqual(calls.parseContractCallFragment(url.hash), review);
  for (const hash of ["#call=3&data=0xzz&value=0", "#call=3&data=0xd0e30db0&value=-1", "#call=3&data=0xd0e30db0&value=0&value=1", "#call=3&data=0xd0e30db0&value=0&abi=implementation"]) {
    assert.throws(() => calls.parseContractCallFragment(hash));
  }
});
