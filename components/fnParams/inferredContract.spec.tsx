import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { encodeFunctionData, parseAbi, type PublicClient } from "viem";
import { processContractBytecode, getImplementationFromBytecodeIfProxy } from "@/utils";
import { ReadWriteFunction } from "./ReadWriteFunction";

// No connected wallet, signing, real RPCs, address resolution or production APIs.
vi.mock("wagmi", () => ({
  useAccount: () => ({}),
  useWalletClient: () => ({ data: undefined }),
}));
vi.mock("@/app/providers", () => ({ config: {} }));
vi.mock("@/components/ConnectButton", () => ({ ConnectButton: () => null }));
vi.mock("@/components/AddressBook", () => ({ AddressBookButton: () => null }));
vi.mock("@/lib/publicClient", () => ({ getPublicClient: () => ({}) }));
vi.mock("@/lib/nameResolution", () => ({
  resolveNameToAddress: vi.fn(), resolveAddressToName: vi.fn(),
  getNameAvatar: vi.fn(), isResolvableName: () => false,
}));
vi.mock("@/utils/addressLabels", () => ({ fetchAddressLabels: async () => [] }));

const selector = "0xa9059cbb";
let signatures: string[];
const call = vi.fn(async (_request: { data: string }) => ({ data: "0x" }));
const readContract = vi.fn(async () => 42n);
const client = { call, readContract } as unknown as PublicClient;

beforeEach(() => {
  signatures = ["transfer(address,uint256)"];
  vi.clearAllMocks();
  HTMLElement.prototype.scrollTo = vi.fn();
  vi.stubGlobal("localStorage", { getItem: () => null, setItem() {} });
  vi.stubGlobal("matchMedia", () => ({ matches: false, addListener() {}, removeListener() {} }));
  vi.stubGlobal("fetch", vi.fn(async (url: URL | string) => {
    if (!String(url).startsWith("https://api.4byte.sourcify.dev/")) {
      throw new Error(`Unexpected network request: ${url}`);
    }
    return new Response(JSON.stringify({
      ok: true,
      result: { function: { [selector]: signatures.map(name => ({ name, filtered: false })) }, event: {} },
    }));
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function inferred(args: string | undefined) {
  const [func] = await processContractBytecode({
    contractCode: "0x00",
    evmole: { contractInfo: () => ({ functions: [{ selector: selector.slice(2), arguments: args, stateMutability: "view" }] }) },
  });
  return func;
}
function show(func: React.ComponentProps<typeof ReadWriteFunction>["func"], decoded = true, type: "read" | "write" = "read") {
  const highlighted = { ...func, name: typeof func.name === "string" ? [{ text: func.name, isHighlighted: false, isCurrentResult: false }] : func.name };
  return render(<ChakraProvider><ReadWriteFunction index={0} type={type} client={client} address="0x0000000000000000000000000000000000000001" chainId={1} func={highlighted} isAbiDecoded={decoded} /></ChakraProvider>);
}

describe("inferred contract actual form path", () => {
  it.each(["address,uint256", undefined])("renders every inferred input and submits values in order (%s)", async args => {
    const func = await inferred(args);
    show(func);
    const fields = screen.getAllByRole("textbox");
    expect(fields).toHaveLength(2);
    fireEvent.change(fields[0], { target: { value: "0x0000000000000000000000000000000000000002" } });
    fireEvent.change(fields[1], { target: { value: "17" } });
    fireEvent.click(screen.getByRole("button", { name: "Read" }));
    await waitFor(() => expect(call).toHaveBeenCalledOnce());
    expect(call.mock.calls[0][0].data).toBe(encodeFunctionData({ abi: parseAbi(["function transfer(address,uint256)"]), functionName: "transfer", args: ["0x0000000000000000000000000000000000000002", 17n] }));
  });

  it("uses every parameter of a unique selector-matching signature when bytecode types are unavailable", async () => {
    show(await inferred(undefined));
    expect(screen.getAllByRole("textbox")).toHaveLength(2);
    expect(screen.queryByRole("note")).toBeNull();
    expect(call).not.toHaveBeenCalled();
  });

  it.each([
    ["unknown", []],
    ["ambiguous", ["transfer(address,uint256)", "many_msg_babbage(bytes1)"]],
    ["unknown", ["balanceOf(address)", "not ABI"]],
  ])("makes %s types explicit without inventing inputs or auto-calling", async (message, candidates) => {
    signatures = candidates as string[];
    show(await inferred(undefined));
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
    expect(screen.getByRole("note").textContent).toMatch(new RegExp(message));
    const read = screen.getByRole("button", { name: "Read" }) as HTMLButtonElement;
    expect(read.disabled).toBe(true);
    fireEvent.click(read);
    await new Promise(resolve => setTimeout(resolve, 30));
    expect(call).not.toHaveBeenCalled();
    expect(readContract).not.toHaveBeenCalled();
  });

  it("keeps the bytecode selector when its function name is unknown", async () => {
    signatures = [];
    show(await inferred("address,uint256"));
    const fields = screen.getAllByRole("textbox");
    fireEvent.change(fields[0], { target: { value: "0x0000000000000000000000000000000000000002" } });
    fireEvent.change(fields[1], { target: { value: "17" } });
    fireEvent.click(screen.getByRole("button", { name: "Read" }));
    await waitFor(() => expect(call).toHaveBeenCalledOnce());
    expect(call.mock.calls[0][0].data).toBe(encodeFunctionData({ abi: parseAbi(["function transfer(address,uint256)"]), functionName: "transfer", args: ["0x0000000000000000000000000000000000000002", 17n] }));
  });

  it.each(["", "uint256"])("preserves known zero/single bytecode inputs: %s", async args => {
    signatures = [];
    show(await inferred(args));
    expect(screen.queryAllByRole("textbox")).toHaveLength(args ? 1 : 0);
    expect(screen.queryByRole("note")).toBeNull();
    if (!args) {
      await waitFor(() => expect(call).toHaveBeenCalledOnce());
      expect(call.mock.calls[0][0].data).toBe(selector);
    }
  });

  it.each(["address,uint256", undefined])("keeps inferred write encoding safe without a wallet (%s)", async args => {
    show(await inferred(args), true, "write");
    const fields = screen.getAllByRole("textbox");
    fireEvent.change(fields[0], { target: { value: "0x0000000000000000000000000000000000000002" } });
    fireEvent.change(fields[1], { target: { value: "17" } });
    fireEvent.click(screen.getByRole("button", { name: "Options" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Encode Calldata" }));
    fireEvent.click(screen.getByRole("button", { name: "Encode Calldata" }));
    await waitFor(() => expect(screen.getByRole("dialog").textContent).toContain(encodeFunctionData({ abi: parseAbi(["function transfer(address,uint256)"]), functionName: "transfer", args: ["0x0000000000000000000000000000000000000002", 17n] })));
    expect(call).not.toHaveBeenCalled();
  });

  it("disables write encoding for ambiguous inputs", async () => {
    signatures = ["transfer(address,uint256)", "many_msg_babbage(bytes1)"];
    show(await inferred(undefined), true, "write");
    fireEvent.click(screen.getByRole("button", { name: "Options" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Encode Calldata" }));
    const encode = screen.getByRole("button", { name: "Encode Calldata" }) as HTMLButtonElement;
    expect(encode.disabled).toBe(true);
    fireEvent.click(encode);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(call).not.toHaveBeenCalled();
  });

  it("preserves the verified ABI path without an inference warning", async () => {
    show({ type: "function", name: "balanceOf", inputs: [{ name: "owner", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" }, false);
    expect(screen.queryByRole("note")).toBeNull();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "0x0000000000000000000000000000000000000002" } });
    fireEvent.click(screen.getByRole("button", { name: "Read" }));
    await waitFor(() => expect(readContract).toHaveBeenCalledOnce());
    expect(call).not.toHaveBeenCalled();
  });
});


describe("proxy discovery without external ABI services", () => {
  const address = "0x0000000000000000000000000000000000000001";
  const implementation = "0x0000000000000000000000000000000000000002";

  it("checks non-proxy bytecode without calling ABI or signature services", async () => {
    const request = vi.fn(async ({ method }: { method: string }) => {
      if (method === "eth_getCode") return "0x60006000f3";
      throw new Error(`Unexpected RPC: ${method}`);
    });
    const result = await getImplementationFromBytecodeIfProxy({
      client: { request } as unknown as PublicClient, address,
    });
    expect(result).toBeUndefined();
    expect(request).toHaveBeenCalledOnce();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("resolves an EIP-1167 implementation while external services are unavailable", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("Failed to fetch"));
    const proxyCode = `0x363d3d373d3d3d363d73${implementation.slice(2)}5af43d82803e903d91602b57fd5bf3`;
    const request = vi.fn(async ({ method, params }: { method: string; params: string[] }) => {
      if (method !== "eth_getCode") throw new Error(`Unexpected RPC: ${method}`);
      return params[0].toLowerCase() === address ? proxyCode : "0x60006000f3";
    });
    const result = await getImplementationFromBytecodeIfProxy({
      client: { request } as unknown as PublicClient, address,
    });
    expect(result?.implementationAddress.toLowerCase()).toBe(implementation);
    expect(result?.proxyName).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });
});
