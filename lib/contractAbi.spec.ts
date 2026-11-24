import { expect, it } from "vitest";
import {
  parseAdditionalFunctions,
  parseContractAbi,
  mergeContractAbi,
  compareContractFunctions,
} from "./contractAbi";

it("compiles human-readable function declarations including tuples and return types", () => {
  const abi = parseAdditionalFunctions(
    "function hello(uint256 count) view returns (address owner)\nfunction set((address who,uint256 value)[] items);"
  );
  expect(abi[0]).toMatchObject({
    name: "hello",
    stateMutability: "view",
    inputs: [{ type: "uint256", name: "count" }],
    outputs: [{ type: "address", name: "owner" }],
  });
  expect(abi[1]).toMatchObject({
    name: "set",
    inputs: [
      {
        type: "tuple[]",
        components: [
          { type: "address", name: "who" },
          { type: "uint256", name: "value" },
        ],
      },
    ],
  });
});
it("accepts JSON arrays, artifacts, and human-readable ABI arrays", () => {
  const abi = parseContractAbi("function hello(uint256) returns (address)");
  expect(parseContractAbi(JSON.stringify(abi))).toEqual(abi);
  expect(parseContractAbi(JSON.stringify({ abi, bytecode: "0x1234" }))).toEqual(
    abi
  );
  expect(
    parseContractAbi(
      JSON.stringify(["function hello(uint256) returns (address)"])
    )
  ).toEqual(abi);
});
it("merges by signature, retaining overloads and updating outputs and mutability", () => {
  const original = parseContractAbi(
    "function hello(uint256)\nfunction hello(address)\nevent Seen(address who)"
  );
  const additions = parseAdditionalFunctions(
    "function hello(uint256) view returns (address)\nfunction added() pure returns (bool)"
  );
  const merged = mergeContractAbi(original, additions);
  expect(merged).toHaveLength(4);
  expect(merged[0]).toMatchObject({
    stateMutability: "view",
    outputs: [{ type: "address" }],
  });
  expect(merged[1].inputs?.[0].type).toBe("address");
  expect(merged[2].type).toBe("event");
  expect(original[0].stateMutability).toBe("nonpayable");
});
it.each([
  "",
  "{}",
  '[{"type":"function","name":"bad","inputs":[{"type":"wrong"}]}]',
  '[{"type":"invalid"}]',
  "[null]",
  "function broken(",
])("rejects malformed ABI %s", (input) => {
  expect(() => parseContractAbi(input)).toThrow();
});
it("rejects event-only or empty function additions", () => {
  expect(() => parseAdditionalFunctions("event Seen(address)")).toThrow();
  expect(() => parseAdditionalFunctions("[]")).toThrow();
});

it("replaces an inferred selector placeholder with a supplied declaration", () => {
  const placeholder = {
    type: "function",
    name: "selector: 0x70a08231",
    selector: "0x70a08231",
    inputs: [{ type: "address" }],
    stateMutability: "view",
  };
  const supplied = parseAdditionalFunctions(
    "function balanceOf(address owner) view returns (uint256)"
  );
  const merged = mergeContractAbi([placeholder], supplied);
  expect(merged).toHaveLength(1);
  expect(merged[0]).toMatchObject({
    name: "balanceOf",
    outputs: [{ type: "uint256" }],
  });
});


it("sorts named functions alphabetically before unresolved selector placeholders", () => {
  const functions = [
    { type: "function", name: "selector: 0xffffffff" },
    { type: "function", name: "zebra" },
    { type: "function", name: "selector: 0x00000001" },
    { type: "function", name: "Alpha" },
    { type: "function", name: "balanceOf" },
  ];
  expect(functions.sort(compareContractFunctions).map(entry => entry.name)).toEqual([
    "Alpha",
    "balanceOf",
    "zebra",
    "selector: 0x00000001",
    "selector: 0xffffffff",
  ]);
});
