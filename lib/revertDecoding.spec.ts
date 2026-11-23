import { decoderRevertSample } from "@/app/calldata/decoder/samples";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Interface, id } from "ethers";
import { decodeRecursive } from "./decoder";
import { createDecoderShareLink, parseDecoderShareFragment } from "./decoderShare";

const mocks = vi.hoisted(() => ({ fetchAbi: vi.fn() }));
vi.mock("@/utils", async importOriginal => ({ ...await importOriginal<typeof import("@/utils")>(), fetchContractAbi: mocks.fetchAbi }));
const builtins = new Interface(["error Error(string reason)", "error Panic(uint256 code)"]);
afterEach(() => vi.restoreAllMocks());

function noNetwork() {
  return vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Unexpected network request"));
}

describe("revert decoding", () => {
  it("auto-detects standard reason strings offline", async () => {
    const fetch = noNetwork();
    const result = await decodeRecursive({ calldata: builtins.encodeErrorResult("Error", ["Insufficient balance"]) });
    expect(result).toMatchObject({ kind: "revert", functionName: "Error", signature: "Error(string)", decodeNote: "Insufficient balance", args: [{ name: "reason", type: "string", value: "Insufficient balance" }] });
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([[0x11, "overflow"], [0x12, "zero"], [0x32, "bounds"], [0xff, "Unknown panic"]])("explains panic %s", async (code, description) => {
    const fetch = noNetwork();
    const result = await decodeRecursive({ calldata: builtins.encodeErrorResult("Panic", [code]) });
    expect(result?.kind).toBe("revert");
    expect(result?.decodeNote).toContain(description);
    expect(result?.args[0].rawValue).toBe(BigInt(code));
    expect(fetch).not.toHaveBeenCalled();
  });

  it("uses ABI-defined errors absent from any registry, retaining nested component names", async () => {
    const fetch = noNetwork();
    const abi = ["error BatchFailed((uint256 amount,string reason)[] failures)"];
    const calldata = new Interface(abi).encodeErrorResult("BatchFailed", [[[12n, "Denied"]]]);
    const result = await decodeRecursive({ calldata, abi });
    expect(result?.kind).toBe("revert");
    expect(result?.args[0]).toMatchObject({ name: "failures", baseType: "array" });
    expect(JSON.stringify(result, (_, v) => typeof v === "bigint" ? String(v) : v)).toContain('"reason"');
    expect(fetch).not.toHaveBeenCalled();
  });

  it("decodes errors without arguments and empty tuple arrays", async () => {
    noNetwork();
    const abi = ["error Unauthorized()", "error BatchFailed((uint256 amount,string reason)[] failures)"];
    const iface = new Interface(abi);
    expect(await decodeRecursive({ calldata: iface.encodeErrorResult("Unauthorized", []), abi })).toMatchObject({ kind: "revert", args: [] });
    expect((await decodeRecursive({ calldata: iface.encodeErrorResult("BatchFailed", [[]]), abi }))?.args[0].value).toEqual([]);
  });

  it("resolves custom signatures only when explicitly decoding revert data", async () => {
    const signature = "Unauthorized(address)";
    const calldata = new Interface([`error ${signature}`]).encodeErrorResult("Unauthorized", ["0x0000000000000000000000000000000000000001"]);
    const selector = id(signature).slice(0, 10);
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ json: async () => ({ ok: true, result: { function: { [selector]: [{ name: signature, filtered: false }] }, event: {} } }) } as Response);
    expect(await decodeRecursive({ calldata, mode: "revert" })).toMatchObject({ kind: "revert", functionName: "Unauthorized", args: [{ type: "address" }] });
    expect((await decodeRecursive({ calldata }))?.kind).toBeUndefined();
  });

  it("rejects ambiguous registry matches rather than choosing an error arbitrarily", async () => {
    // These signatures have a real four-byte collision.
    const abi = ["error burn(uint256)"];
    const calldata = new Interface(abi).encodeErrorResult("burn", [1n]);
    const selector = calldata.slice(0, 10);
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ json: async () => ({ ok: true, result: { function: { [selector]: [{ name: "burn(uint256)", filtered: false }, { name: "collate_propagate_storage(bytes16)", filtered: false }] }, event: {} } }) } as Response);
    // bytes16 requires zero padding: zero is canonical for both colliding layouts.
    const zero = new Interface(abi).encodeErrorResult("burn", [0n]);
    await expect(decodeRecursive({ calldata: zero, mode: "revert" })).rejects.toThrow("Multiple error signatures");
    expect(await decodeRecursive({ calldata: zero, mode: "revert", abi })).toMatchObject({ kind: "revert", functionName: "burn" });
  });

  it("reports unknown selectors without heuristically inventing arguments", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Offline"));
    await expect(decodeRecursive({ calldata: "0xdeadbeef", mode: "revert" })).rejects.toThrow("Unknown revert selector");
  });

  it("rejects malformed built-ins and trailing bytes", async () => {
    const fetch = noNetwork();
    await expect(decodeRecursive({ calldata: "0x08c379a0" })).rejects.toThrow();
    await expect(decodeRecursive({ calldata: builtins.encodeErrorResult("Error", ["Denied"]) + "00" })).rejects.toThrow("Malformed revert");
    await expect(decodeRecursive({ calldata: "0xabc", mode: "revert" })).rejects.toThrow("hexadecimal");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("explains an empty revert without inventing a reason", async () => {
    const fetch = noNetwork();
    expect(await decodeRecursive({ calldata: "0x", mode: "revert" })).toMatchObject({ kind: "revert", args: [], decodeNote: expect.stringContaining("no reason") });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("retains ordinary function behavior and recursively identifies nested revert bytes", async () => {
    const fetch = noNetwork();
    const abi = ["function batch(bytes result)"];
    const calldata = new Interface(abi).encodeFunctionData("batch", [builtins.encodeErrorResult("Error", ["Denied"])]);
    const result = await decodeRecursive({ calldata, abi });
    expect(result?.kind).toBeUndefined();
    expect(result?.functionName).toBe("batch");
    expect(result?.args[0].value).toMatchObject({ decoded: { kind: "revert", functionName: "Error" } });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("shares custom errors with their ABI names and restores them offline", async () => {
    const fetch = noNetwork();
    const abi = ["error MissingPermission(uint256 permission)", "function unused()"];
    const calldata = new Interface(abi).encodeErrorResult("MissingPermission", [5n]);
    const result = await decodeRecursive({ calldata, abi });
    const link = createDecoderShareLink("https://calldata.eth.sh/decoder", calldata, result, abi);
    const url = new URL(link!);
    expect(url.searchParams.get("mode")).toBe("revert");
    const shared = parseDecoderShareFragment(url.hash)!;
    expect(shared).toHaveLength(1);
    expect(shared[0]).toContain("permission");
    expect(await decodeRecursive({ calldata, abi: shared, mode: "revert" })).toEqual(result);
    expect(fetch).not.toHaveBeenCalled();
  });
});

it("recognizes custom errors from the contract ABI in address mode", async () => {
  noNetwork();
  const abi = ["error NotAllowed(uint256 required)"];
  mocks.fetchAbi.mockResolvedValue({ abi });
  const result = await decodeRecursive({ calldata: new Interface(abi).encodeErrorResult("NotAllowed", [4n]), address: "0x0000000000000000000000000000000000000001", chainId: 1 });
  expect(result).toMatchObject({ kind: "revert", functionName: "NotAllowed", args: [{ name: "required", rawValue: 4n }] });
});
it("keeps ordinary ABI function calls unchanged", async () => {
  const abi = ["function transfer(address to,uint256 amount)"];
  const result = await decodeRecursive({ calldata: new Interface(abi).encodeFunctionData("transfer", ["0x0000000000000000000000000000000000000001", 5n]), abi });
  expect(result?.kind).toBeUndefined();
  expect(result?.signature).toBe("transfer(address,uint256)");
  expect(result?.args[1].rawValue).toBe(5n);
});
it("shares an error ABI and restores it without network lookup", async () => {
  const fetch = noNetwork();
  const abi = ["error NotAllowed(uint256 required)"];
  const calldata = new Interface(abi).encodeErrorResult("NotAllowed", [4n]);
  const result = await decodeRecursive({ calldata, abi });
  const link = createDecoderShareLink("https://calldata.eth.sh/decoder", calldata, result, abi)!;
  expect(new URL(link).searchParams.get("mode")).toBe("revert");
  const shared = parseDecoderShareFragment(new URL(link).hash)!;
  expect(shared[0]).toContain("error NotAllowed");
  expect(await decodeRecursive({ calldata, abi: shared })).toEqual(result);
  expect(fetch).not.toHaveBeenCalled();
});
it("uses 4byte candidates when Sourcify has no usable match", async () => {
  const signature = "MissingPermission(address,uint256)";
  const calldata = new Interface([`error ${signature}`]).encodeErrorResult("MissingPermission", ["0x0000000000000000000000000000000000000001", 42n]);
  vi.spyOn(globalThis, "fetch").mockImplementation(async input => ({ json: async () => String(input).includes("4byte.directory") ? {
    count: 2,
    results: [
      { id: 1, created_at: "2026-01-01", text_signature: "Wrong(uint256)", hex_signature: calldata.slice(0, 10) },
      { id: 2, created_at: "2026-01-01", text_signature: signature, hex_signature: calldata.slice(0, 10) },
    ],
  } : { ok: true, result: { function: { [calldata.slice(0, 10)]: [] }, event: {} } } }) as Response);
  expect(await decodeRecursive({ calldata, mode: "revert" })).toMatchObject({ kind: "revert", signature, args: [{ type: "address" }, { type: "uint256", rawValue: 42n }] });
});
it("recognizes an error nested inside a bytes argument", async () => {
  const fetch = noNetwork();
  const abi = ["error Wrapped(bytes cause)"];
  const cause = builtins.encodeErrorResult("Panic", [0x12]);
  const calldata = new Interface(abi).encodeErrorResult("Wrapped", [cause]);
  expect(await decodeRecursive({ calldata, abi })).toMatchObject({ kind: "revert", args: [{ name: "cause", value: { decoded: { kind: "revert", functionName: "Panic", decodeNote: expect.stringContaining("Division") } } }] });
  expect(fetch).not.toHaveBeenCalled();
});

it("decodes the captured Uniswap example offline with the real nested error", async () => {
  const fetch = noNetwork();
  const result = await decodeRecursive({ calldata: decoderRevertSample.calldata, abi: decoderRevertSample.abi, mode: "revert" });
  expect(result).toMatchObject({ kind: "revert", signature: "ExecutionFailed(uint256,bytes)", args: [{ name: "commandIndex", rawValue: 0n }, { name: "message", value: { decoded: { kind: "revert", signature: "InsufficientToken()", args: [] } } }] });
  expect(fetch).not.toHaveBeenCalled();
});
