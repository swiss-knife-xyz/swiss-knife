import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import type { DecodeRecursiveResult } from "@/types";
import { CalldataParam } from "./CalldataParam";

const mocks = vi.hoisted(() => ({ decode: vi.fn() }));
vi.mock("@/lib/decoder", () => ({ decodeRecursive: mocks.decode }));
const wrap = (value: string | null) => (
  <ChakraProvider>
    <CalldataParam value={value} chainId={1} />
  </ChakraProvider>
);
const decoded = (amount: bigint): DecodeRecursiveResult => ({
  functionName: "__abi_decoded__",
  signature: "abi.encode",
  rawArgs: [amount],
  args: [
    {
      name: "amount",
      type: "uint256",
      baseType: "uint256",
      rawValue: amount,
      value: amount as any,
    },
  ],
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
beforeEach(() => {
  mocks.decode.mockReset();
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
  }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("renders decoded bytes and their nested arguments in the shared tree with raw bytes available", async () => {
  mocks.decode.mockResolvedValue({
    functionName: "__abi_decoded__",
    signature: "abi.encode",
    rawArgs: [],
    args: [
      {
        name: "payload",
        type: "bytes",
        baseType: "bytes",
        rawValue: "0x12345678",
        value: { decoded: { ...decoded(42n), functionName: "nestedCall" } },
      },
    ],
  });
  render(wrap("0xaabb"));
  await screen.findByRole("button", { name: "payload, nestedCall" });
  expect(screen.getByDisplayValue("42")).toBeTruthy();
  fireEvent.click(screen.getAllByRole("button", { name: "Raw bytes" })[0]);
  expect(screen.getByDisplayValue("0xaabb")).toBeTruthy();
  fireEvent.click(screen.getAllByRole("button", { name: "Raw bytes" }).at(-1)!);
  expect(screen.getByDisplayValue("0x12345678")).toBeTruthy();
  expect(screen.queryByText("to Decimal")).toBeNull();
});

it.each(["reject", "null"])(
  "uses the compact bytes fallback when decoding returns %s",
  async (outcome) => {
    if (outcome === "reject")
      mocks.decode.mockRejectedValue(new Error("Not decodable"));
    else mocks.decode.mockResolvedValue(null);
    render(wrap("0x6162"));
    await screen.findByDisplayValue("0x6162");
    expect(screen.getByRole("group", { name: "data, bytes" })).toBeTruthy();
    fireEvent.keyDown(await screen.findByRole("combobox"), { key: "ArrowDown" });
    fireEvent.click(await screen.findByRole("option", { name: "Text" }));
    expect(screen.getByDisplayValue("ab")).toBeTruthy();
  }
);

it("handles empty output without decoding and keeps unavailable output loading", async () => {
  const view = render(wrap(null));
  expect(screen.getByRole("status", { name: "Decoding output" })).toBeTruthy();
  view.rerender(wrap("0x"));
  await screen.findByDisplayValue("0x");
  expect(screen.queryByRole("status", { name: "Decoding output" })).toBeNull();
  expect(mocks.decode).not.toHaveBeenCalled();
});

it("hides previous responses while decoding, preserves units, and ignores stale completions", async () => {
  const old = deferred<DecodeRecursiveResult>();
  const current = deferred<DecodeRecursiveResult>();
  mocks.decode
    .mockResolvedValueOnce(decoded(2000000n))
    .mockReturnValueOnce(old.promise)
    .mockReturnValueOnce(current.promise);
  const view = render(wrap("0x01"));
  await screen.findByDisplayValue("2000000");
  fireEvent.keyDown(await screen.findByRole("combobox"), { key: "ArrowDown" });
  fireEvent.click(await screen.findByRole("option", { name: "10^6" }));
  expect(screen.getByDisplayValue("2")).toBeTruthy();
  view.rerender(wrap("0x02"));
  expect(screen.queryByRole("textbox")).toBeNull();
  expect(screen.getByRole("status", { name: "Decoding output" })).toBeTruthy();
  view.rerender(wrap("0x03"));
  await act(async () => current.resolve(decoded(3000000n)));
  await screen.findByDisplayValue("3");
  await act(async () => old.resolve(decoded(99000000n)));
  expect(screen.queryByDisplayValue("99")).toBeNull();
  expect(screen.getByDisplayValue("3")).toBeTruthy();
  expect(screen.getByText("10^6", { exact: true })).toBeTruthy();
});
