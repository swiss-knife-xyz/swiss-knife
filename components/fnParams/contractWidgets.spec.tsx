import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { Interface, type JsonFragment } from "ethers";
import { ReadWriteFunction } from "./ReadWriteFunction";

vi.mock("wagmi", () => ({
  useAccount: () => ({}),
  useWalletClient: () => ({ data: undefined }),
  useSwitchChain: () => ({ switchChain: vi.fn() }),
}));
vi.mock("@/app/providers", () => ({ config: {} }));
vi.mock("@/components/ConnectButton", () => ({ ConnectButton: () => null }));
vi.mock("@/components/AddressBook", () => ({ AddressBookButton: () => null }));
vi.mock("@/lib/publicClient", () => ({ getPublicClient: () => ({}) }));
vi.mock("@/lib/nameResolution", () => ({
  resolveNameToAddress: vi.fn(),
  resolveAddressToName: vi.fn(),
  getNameAvatar: vi.fn(),
  isResolvableName: () => false,
}));
vi.mock("@/utils/addressLabels", () => ({
  fetchAddressLabels: async () => [],
}));
const client = {
  readContract: vi.fn(),
  call: vi.fn(),
  simulateContract: vi.fn(),
};
const address = "0x0000000000000000000000000000000000000001";
function show(func: JsonFragment, type: "read" | "write" = "read") {
  return render(
    <ChakraProvider>
      <ReadWriteFunction
        client={client as any}
        func={func as any}
        index={0}
        type={type}
        address={address}
        chainId={1}
      />
    </ChakraProvider>
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  HTMLElement.prototype.scrollTo = vi.fn();
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: vi.fn() });
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addListener() {},
    removeListener() {},
  }));
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("Unexpected network request");
    })
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("real bytes4 widget receives a preset, permits manual replacement and encodes exactly", async () => {
  const func: JsonFragment = {
    type: "function",
    name: "supportsInterface",
    stateMutability: "view",
    inputs: [{ type: "bytes4", name: "interfaceId" }],
    outputs: [{ type: "bool" }],
  };
  show(func);
  fireEvent.change(
    screen.getByRole("combobox", { name: "ERC-165 interface preset" }),
    { target: { value: "0xd9b67a26" } }
  );
  const input = screen.getByRole("textbox") as HTMLInputElement;
  expect(input.value).toBe("0xd9b67a26");
  fireEvent.change(input, { target: { value: "0xffffffff" } });
  fireEvent.click(screen.getByRole("button", { name: "Encode Calldata" }));
  expect(
    await screen.findByText(
      new Interface([func]).encodeFunctionData("supportsInterface", [
        "0xffffffff",
      ])
    )
  ).toBeTruthy();
  expect(client.readContract).not.toHaveBeenCalled();
  expect(client.call).not.toHaveBeenCalled();
  expect(client.simulateContract).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});

it("real tuple text fields propagate into encoding in ABI order", async () => {
  const func: JsonFragment = {
    type: "function",
    name: "configure",
    stateMutability: "nonpayable",
    inputs: [
      {
        type: "tuple",
        name: "settings",
        components: [
          { type: "string", name: "name" },
          { type: "bytes4", name: "tag" },
        ],
      },
    ],
  };
  show(func, "write");
  fireEvent.click(screen.getByRole("button", { name: "Options" }));
  fireEvent.click(await screen.findByRole("menuitem", { name: "Encode Calldata" }));
  const fields = screen.getAllByRole("textbox");
  fireEvent.change(fields[0], { target: { value: "hello" } });
  fireEvent.change(fields[1], { target: { value: "0x12345678" } });
  const expected = new Interface([func]).encodeFunctionData("configure", [
    ["hello", "0x12345678"],
  ]);
  // Recursive tuple widgets debounce their propagation by 100ms.
  await waitFor(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Encode Calldata" }));
    expect(
      await screen.findByText(expected, {}, { timeout: 150 })
    ).toBeTruthy();
  });
  expect(client.call).not.toHaveBeenCalled();
  expect(client.simulateContract).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});

it("keeps a single encoding action when the existing write dropdown selects Encode Calldata", async () => {
  show(
    {
      type: "function",
      name: "ping",
      stateMutability: "nonpayable",
      inputs: [],
    },
    "write"
  );
  expect(screen.queryByRole("button", { name: "Encode Calldata" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Options" }));
  fireEvent.click(
    await screen.findByRole("menuitem", { name: "Encode Calldata" })
  );
  await waitFor(() =>
    expect(
      screen.getAllByRole("button", { name: "Encode Calldata" })
    ).toHaveLength(1)
  );
  fireEvent.click(screen.getByRole("button", { name: "Encode Calldata" }));
  expect(await screen.findByRole("dialog")).toBeTruthy();
  expect(client.call).not.toHaveBeenCalled();
  expect(client.simulateContract).not.toHaveBeenCalled();
});

it("zero-input write encodes selector-only without connection, signing or reads", async () => {
  const func: JsonFragment = {
    type: "function",
    name: "ping",
    stateMutability: "nonpayable",
    inputs: [],
  };
  show(func, "write");
  fireEvent.click(screen.getByRole("button", { name: "Options" }));
  fireEvent.click(await screen.findByRole("menuitem", { name: "Encode Calldata" }));
  fireEvent.click(screen.getByRole("button", { name: "Encode Calldata" }));
  expect(
    await screen.findByText(new Interface([func]).encodeFunctionData("ping"))
  ).toBeTruthy();
  expect(client.readContract).not.toHaveBeenCalled();
  expect(client.call).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});
