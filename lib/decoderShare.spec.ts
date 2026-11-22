import { expect, it, vi } from "vitest";
import { Interface } from "ethers";
import {
  createDecoderShareLink,
  parseDecoderShareFragment,
} from "./decoderShare";
import { decodeRecursive } from "./decoder";

it("shares only used functions and preserves tuple names and nested calls", async () => {
  const abi = [
    "function batch((address target,bytes data)[] calls)",
    "function privateAction(uint256 amount) returns (bool success)",
    "function unused(address owner)",
    "event UnusedEvent(uint256 value)",
  ];
  const iface = new Interface(abi);
  const nested = iface.encodeFunctionData("privateAction", [123n]);
  const calldata = iface.encodeFunctionData("batch", [
    [
      ["0x0000000000000000000000000000000000000001", nested],
      ["0x0000000000000000000000000000000000000001", nested],
    ],
  ]);
  const fetchSpy = vi
    .spyOn(globalThis, "fetch")
    .mockRejectedValue(new Error("Unexpected lookup"));
  try {
    const result = await decodeRecursive({ calldata, abi });
    const link = createDecoderShareLink(
      "https://calldata.eth.sh/decoder?old=value#old",
      calldata,
      result,
      JSON.stringify(abi)
    );
    expect(link).toBeTruthy();
    const url = new URL(link!);
    expect([...url.searchParams.keys()]).toEqual(["calldata"]);
    const shared = parseDecoderShareFragment(url.hash)!;
    expect(shared).toHaveLength(2);
    expect(shared.join(" ")).toContain("target");
    expect(shared.join(" ")).toContain("amount");
    expect(shared.join(" ")).not.toContain("unused");
    expect(shared.join(" ")).not.toContain("returns");
    expect(url.searchParams.get("calldata")).toBe(calldata);
    const restored = await decodeRecursive({ calldata, abi: shared });
    expect(restored).toEqual(result);
    expect(fetchSpy).not.toHaveBeenCalled();
  } finally {
    fetchSpy.mockRestore();
  }
});

it("preserves overloaded function identity", async () => {
  const abi = [
    "function action(uint256 value)",
    "function action(address account)",
  ];
  const calldata = new Interface(abi).encodeFunctionData("action(uint256)", [
    42n,
  ]);
  const result = await decodeRecursive({ calldata, abi });
  const link = createDecoderShareLink(
    "http://localhost:3210/calldata/decoder",
    calldata,
    result,
    abi
  )!;
  const shared = parseDecoderShareFragment(new URL(link).hash)!;
  expect(shared).toEqual(["function action(uint256 value)"]);
});

it.each([
  "#decode=2&functions=[]",
  "#decode=1&functions=not-json",
  "#decode=1&functions=%5B%5D",
  "#decode=1&functions=%5B123%5D",
  `#decode=1&functions=${encodeURIComponent(JSON.stringify(["event Transfer(address)"]))}`,
  `#decode=1&functions=${encodeURIComponent(JSON.stringify(["function bad("]))}`,
  "#decode=1&decode=1&functions=[]",
  "#decode=1&functions=[]&other=value",
  `#decode=1&functions=${"x".repeat(100_000)}`,
])("rejects invalid shared definitions", (hash) => {
  expect(() => parseDecoderShareFragment(hash)).toThrow();
});

it("ignores unrelated fragments and does not share heuristic guesses", () => {
  expect(parseDecoderShareFragment("#section")).toBeNull();
  expect(
    createDecoderShareLink("https://calldata.eth.sh/decoder", "0x", {
      signature: "abi.encode",
      functionName: "",
      args: [],
      rawArgs: [],
      decoding: "heuristic",
    })
  ).toBeNull();
});
