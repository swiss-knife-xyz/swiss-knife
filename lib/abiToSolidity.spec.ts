// @vitest-environment node
import { createRequire } from "node:module";
import { expect, it } from "vitest";
import { Interface, type JsonFragment } from "ethers";
import { abiToSolidity } from "./abiToSolidity";

const solc = createRequire(import.meta.url)("solc");
function compile(source: string, name: string): JsonFragment[] {
  const result = JSON.parse(solc.compile(JSON.stringify({
    language: "Solidity",
    sources: { "Test.sol": { content: source } },
    settings: { outputSelection: { "*": { "*": ["abi"] } } },
  })));
  expect((result.errors || []).filter((error: { severity: string }) => error.severity === "error")).toEqual([]);
  return result.contracts["Test.sol"][name].abi;
}

function signatures(abi: JsonFragment[]) {
  return new Interface(abi).fragments
    .filter((fragment) => ["function", "event", "error"].includes(fragment.type))
    .map((fragment) => fragment.format("full")).sort();
}

it("round trips a compiled ABI including nested structs, arrays, overloads, events and errors", () => {
  const original = compile(`pragma solidity ^0.8.20;
    contract Original {
      struct Child { int128 value; bytes data; }
      struct Item { address owner; Child[] children; uint256[2][] weights; }
      enum Status { Open, Closed }
      type Amount is uint128;
      event Updated(address indexed owner, Item item);
      event Anonymous(bytes32 indexed id) anonymous;
      error Failed(Item[] items, string reason);
      constructor(uint256 seed) {}
      function read(Item[] calldata items) external pure returns (Item[] memory result, string memory text) {}
      function read(uint256 id) external view returns (uint256) {}
      function write(bytes calldata data, address to) external payable {}
      function status(Status value, Amount amount) external pure returns (Status, Amount) {}
      function callback(function() external cb) external pure returns (function() external) { return cb; }
      fallback() external payable {}
      receive() external payable {}
    }`, "Original");
  const generated = abiToSolidity(original, "Original");
  const result = compile(generated, "IOriginal");
  expect(signatures(result)).toEqual(signatures(original));
  expect(result.filter((entry) => ["fallback", "receive"].includes(entry.type!)))
    .toEqual(original.filter((entry) => ["fallback", "receive"].includes(entry.type!)));
  expect(generated.match(/struct Child /g)).toHaveLength(1);
  expect(generated).toContain("Constructors are omitted");
});

it("generates valid structs without internalType hints and resolves name collisions", () => {
  const generated = abiToSolidity([{
    type: "function", name: "Tuple1", stateMutability: "view",
    inputs: [{ name: "new", type: "tuple[][2]", components: [
      { name: "", type: "uint" }, { name: "new", type: "bytes32" },
      { name: "a", type: "string" }, { name: "a", type: "bool" },
    ] }],
    outputs: [{ type: "tuple", internalType: "struct A.Tuple1", components: [{ type: "address" }] }],
  }], "9 token");
  compile(generated, "I9_token");
  expect(generated).toContain("struct Tuple1_2");
  expect(generated).toContain("calldata param0");
  expect(generated).toContain("bool a_2");
});

it("supports legacy mutability flags and deduplicates identical entries", () => {
  const read = { type: "function", name: "read", constant: true, inputs: [], outputs: [{ type: "uint" }] };
  const generated = abiToSolidity([read, { ...read, outputs: [{ type: "uint256" }] }, { type: "function", name: "write", payable: true }]);
  compile(generated, "IContract");
  expect(generated.match(/function read/g)).toHaveLength(1);
  expect(generated).toContain("external view returns (uint256)");
  expect(generated).toContain("write() external payable");
});

it("allows contextual keywords and avoids interface/member name collisions", () => {
  const generated = abiToSolidity(["error", "from", "at", "fallback", "receive", "IContract"].map((name) => ({
    type: "function", name, stateMutability: "view", inputs: [], outputs: [],
  })));
  compile(generated, "IContract_2");
});

it("creates an empty interface and fails clearly for incomplete or unsupported ABI types", () => {
  compile(abiToSolidity([]), "IContract");
  for (const type of ["tuple", "uint7", "bytes33", "fixed128x18", "address[0]"]) {
    expect(() => abiToSolidity([{ type: "function", name: "test", inputs: [{ type }] }])).toThrow();
  }
  expect(() => abiToSolidity([{ type: "function", name: "selector:0x12345678" }])).toThrow(/ABI name/);
});
