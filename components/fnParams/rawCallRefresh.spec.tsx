import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { RawCalldata } from "./RawCalldata";

const mocks = vi.hoisted(() => ({ decode: vi.fn(), call: vi.fn() }));
vi.mock("wagmi", () => ({ useAccount: () => ({}), useWalletClient: () => ({ data: undefined }), useSwitchChain: () => ({ switchChain: vi.fn() }) }));
vi.mock("@/app/providers", () => ({ config: {} }));
vi.mock("@/components/ConnectButton", () => ({ ConnectButton: () => null }));
vi.mock("@/lib/decoder", () => ({ decodeRecursive: mocks.decode }));
vi.mock("@/lib/publicClient", () => ({ getPublicClient: () => ({}) }));
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
async function start() {
  render(<ChakraProvider><RawCalldata address="0x0000000000000000000000000000000000000001" chainId={1} client={{ call: mocks.call } as any} /></ChakraProvider>);
  fireEvent.click(screen.getByText("Raw Calldata", { exact: true }));
  fireEvent.change(screen.getByRole("textbox", { name: "Raw calldata" }), { target: { value: "0x12345678" } });
  fireEvent.click(screen.getByRole("button", { name: "Options" }));
  fireEvent.click(await screen.findByRole("menuitem", { name: "Call as View Fn" }));
  fireEvent.click(screen.getByRole("button", { name: "Call as View Fn" }));
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.call.mockReset();
  mocks.decode.mockReset();
  HTMLElement.prototype.scrollTo = vi.fn();
  vi.stubGlobal("matchMedia", () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
  mocks.decode.mockImplementation(async ({ calldata }) => {
    const value = calldata === "0x01" ? 2000000n : 3000000n;
    return { functionName: "__abi_decoded__", rawArgs: [value], signature: "abi.encode", args: [{ name: "amount", type: "uint256", baseType: "uint256", rawValue: value, value }] };
  });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it.each([false, true])("retains raw-call units and collapsed branches across refresh (failure: %s)", async fail => {
  const refresh = deferred<{ data: string }>();
  mocks.call.mockResolvedValueOnce({ data: "0x01" }).mockReturnValueOnce(refresh.promise).mockResolvedValue({ data: "0x02" });
  await start();
  await screen.findByDisplayValue("2000000");
  fireEvent.keyDown(within(await screen.findByRole("group", { name: "amount, uint256" })).getByRole("combobox"), { key: "ArrowDown" });
  fireEvent.click(await screen.findByRole("option", { name: "10^6" }));
  const input = screen.getByDisplayValue("2");
  fireEvent.click(screen.getByRole("button", { name: "data", expanded: true }));
  fireEvent.click(screen.getByRole("button", { name: "Call as View Fn" }));
  expect(input.isConnected).toBe(true);
  expect(screen.queryByRole("group", { name: "amount, uint256" })).toBeNull();
  expect(screen.getByRole("status", { name: "Decoding output" })).toBeTruthy();
  if (fail) {
    await act(async () => refresh.reject(new Error("RPC unavailable")));
    await screen.findByText("An unknown error occurred");
    expect(input.isConnected).toBe(true);
    expect(screen.queryByRole("group", { name: "amount, uint256" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Call as View Fn" }));
  } else await act(async () => refresh.resolve({ data: "0x02" }));
  await screen.findByDisplayValue("3");
  expect(screen.getByRole("button", { name: "data", expanded: false })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "data" }));
  expect(screen.getByText("10^6", { exact: true })).toBeTruthy();
  expect(screen.getByDisplayValue("3")).toBeTruthy();
});

it("treats an empty RPC response as empty bytes rather than leaving the decoder loading", async () => {
  mocks.call.mockResolvedValueOnce({ data: undefined });
  await start();
  await screen.findByDisplayValue("0x");
  expect(screen.queryByRole("status", { name: "Decoding output" })).toBeNull();
  expect(mocks.decode).not.toHaveBeenCalled();
});
