import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { encodeFunctionData, parseAbi } from "viem";
import { renderParamTypes } from "../fnParams/Renderer";
import type { DecodeRecursiveResult } from "@/types";
import { serializeContractOutput } from "@/lib/contractOutput";

const mocks = vi.hoisted(() => ({ decode: vi.fn(), tree: vi.fn() }));
vi.mock("@/lib/decoder", () => ({ decodeRecursive: mocks.decode }));
vi.mock("./CalldataTree", async importOriginal => {
  const actual = await importOriginal<typeof import("./CalldataTree")>();
  const Tree = actual.CalldataTree;
  return { ...actual, CalldataTree: (props: React.ComponentProps<typeof Tree>) => {
    // Reproduce the development logger's plain JSON inspection of tree props.
    JSON.stringify(props.args);
    mocks.tree(props.args);
    return <Tree {...props} />;
  } };
});
const calldata = encodeFunctionData({
  abi: parseAbi(["function setAmount(uint256 amount)"]),
  functionName: "setAmount",
  args: [42n],
});
const decoded = (amount = 42n): DecodeRecursiveResult => ({
  functionName: "setAmount",
  signature: "setAmount(uint256)",
  rawArgs: [amount],
  args: [{ name: "amount", type: "uint256", baseType: "uint256", rawValue: amount, value: amount as any }],
});
const view = (props: Partial<Parameters<typeof renderParamTypes>[0]> = {}) => (
  <ChakraProvider>{renderParamTypes({ chainId: 8453, type: "bytes", name: "payload", value: calldata, ...props })}</ChakraProvider>
);
beforeEach(() => {
  mocks.decode.mockReset().mockResolvedValue(decoded());
  mocks.tree.mockClear();
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addListener() {}, removeListener() {},
    addEventListener() {}, removeEventListener() {},
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("automatically nests decoded function return bytes, with the original bytes still available", async () => {
  render(view());
  await screen.findByRole("button", { name: "payload, setAmount" });
  expect(screen.getByDisplayValue("42")).toBeTruthy();
  expect(mocks.decode).toHaveBeenCalledExactlyOnceWith({ calldata, chainId: 8453 });
  fireEvent.click(screen.getByRole("button", { name: "Raw bytes" }));
  expect(screen.getByDisplayValue(calldata)).toBeTruthy();
});

it.each(["null", "reject"])("keeps opaque bytes readable when decoding returns %s", async outcome => {
  if (outcome === "null") mocks.decode.mockResolvedValue(null);
  else mocks.decode.mockRejectedValue(new Error("Unknown selector"));
  render(view());
  await waitFor(() => expect(mocks.decode).toHaveBeenCalledTimes(1));
  expect(screen.getByDisplayValue(calldata)).toBeTruthy();
  expect(screen.queryByRole("button", { name: "payload, setAmount" })).toBeNull();
});

it.each([
  { functionName: "__abi_decoded__", signature: "abi.encode", decoding: "heuristic" },
  { functionName: "UTF-8 Text Message", signature: "text(string)" },
  { functionName: "differentCall", signature: "differentCall(uint256)" },
])("keeps bytes opaque for a non-calldata decode ($signature)", async result => {
  mocks.decode.mockResolvedValue({ ...decoded(), ...result });
  render(view());
  await waitFor(() => expect(mocks.decode).toHaveBeenCalledTimes(1));
  expect(screen.getByDisplayValue(calldata)).toBeTruthy();
  expect(screen.getByRole("combobox")).toBeTruthy();
  expect(screen.queryByDisplayValue("42")).toBeNull();
});

it.each([null, "0x", "0x1234", "0x123456789", "not hex"])(
  "does not request decoding for unavailable or non-calldata bytes %s",
  async value => {
    render(view({ value }));
    await act(async () => {});
    expect(mocks.decode).not.toHaveBeenCalled();
    if (value !== null) expect(screen.getByDisplayValue(value)).toBeTruthy();
  }
);

it("finds bytes in tuple arrays and deduplicates repeated payloads while preserving other fields", async () => {
  render(view({
    type: "tuple[]",
    name: "responses",
    components: [{ name: "success", type: "bool" }, { name: "payloads", type: "bytes[]" }],
    value: [{ success: true, payloads: [calldata, calldata] }],
  }));
  await screen.findAllByDisplayValue("42");
  expect(screen.getAllByDisplayValue("42")).toHaveLength(2);
  expect(screen.getByDisplayValue("true")).toBeTruthy();
  expect(mocks.decode).toHaveBeenCalledExactlyOnceWith({ calldata, chainId: 8453 });
});

it("decodes fixed bytes that can contain a full call selector", async () => {
  mocks.decode.mockResolvedValue({ functionName: "totalSupply", signature: "totalSupply()", args: [], rawArgs: [] });
  render(view({ type: "bytes4", value: "0x18160ddd" }));
  await screen.findByRole("button", { name: "payload, totalSupply" });
});

it("lets nested uint units change independently of the outer tuple value", async () => {
  mocks.decode.mockResolvedValue(decoded(2500000000000000000n));
  render(view({
    type: "tuple[]",
    components: [{ name: "data", type: "bytes" }, { name: "value", type: "uint256" }],
    value: [{ data: calldata, value: 0n }],
  }));
  const nested = within(await screen.findByRole("group", { name: "amount, uint256" }));
  const selector = await nested.findByRole("combobox");
  expect((selector as HTMLInputElement).disabled).toBe(false);
  fireEvent.keyDown(selector, { key: "ArrowDown" });
  fireEvent.click(await screen.findByRole("option", { name: /^ETH$/ }));
  expect(nested.getByDisplayValue("2.5")).toBeTruthy();
  expect(screen.getByDisplayValue("0")).toBeTruthy();
});

it("keeps presentation records JSON-safe without losing BigInt precision or mutating RPC values", async () => {
  const amount = 2500000000000000000000000n;
  const response = [amount, 0n];
  const serialized = serializeContractOutput({ type: "uint256[]" }, response);
  expect(JSON.parse(serialized).rawValue).toEqual([amount.toString(), "0"]);
  expect(JSON.parse(serialized).value[0].value).toBe(amount.toString());
  expect(response).toEqual([amount, 0n]);
  mocks.decode.mockResolvedValue(decoded(amount));
  render(view());
  await screen.findByDisplayValue(amount.toString());
  expect(mocks.tree).toHaveBeenCalledWith([expect.objectContaining({
    value: { decoded: expect.objectContaining({ rawArgs: [amount.toString()] }) },
  })]);
  await expect(mocks.decode.mock.results[0].value).resolves.toMatchObject({ rawArgs: [amount] });
});

it("hides stale decodes immediately and ignores completions after the response or chain changes", async () => {
  let finish!: (result: DecodeRecursiveResult) => void;
  mocks.decode.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const ui = render(view());
  ui.rerender(view({ value: "0x1234" }));
  await act(async () => finish(decoded(99n)));
  expect(screen.queryByDisplayValue("99")).toBeNull();
  expect(screen.getByDisplayValue("0x1234")).toBeTruthy();
  ui.rerender(view());
  await screen.findByDisplayValue("42");
  mocks.decode.mockReturnValue(new Promise(() => {}));
  ui.rerender(view({ chainId: 1 }));
  expect(screen.queryByDisplayValue("42")).toBeNull();
  expect(screen.getByDisplayValue(calldata)).toBeTruthy();
  expect(mocks.decode).toHaveBeenLastCalledWith({ calldata, chainId: 1 });
});
