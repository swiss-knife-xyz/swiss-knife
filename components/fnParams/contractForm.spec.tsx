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

const { wallet, copied } = vi.hoisted(() => ({
  wallet: { sendTransaction: vi.fn() },
  copied: vi.fn(),
}));
vi.mock("wagmi", () => ({
  useWalletClient: () => ({ data: wallet }),
  useAccount: () => ({}),
  useSwitchChain: () => ({ switchChain: vi.fn() }),
}));
vi.mock("@/components/ConnectButton", () => ({
  ConnectButton: () => <button>Connect wallet</button>,
}));
vi.mock("wagmi/actions", () => ({ waitForTransactionReceipt: vi.fn() }));
vi.mock("@/app/providers", () => ({ config: {} }));
vi.mock("@/utils", () => ({
  generateTenderlyUrl: vi.fn(),
  slicedText: (s: string) => s,
  getPath: (s: string) => `/${s}/`,
}));
// Keep the real form, ABI conversion, encoding and modal. Isolate the recursive
// field widgets so fixtures can supply already-parsed tuples/arrays as they do.
vi.mock("./Renderer", () => ({
  renderInputFields: ({ input, value, onChange }: any) => (
    <input
      aria-label={input.name || input.type}
      value={Array.isArray(value) ? JSON.stringify(value) : value}
      onChange={(e) =>
        onChange({
          target: {
            value:
              input.type.includes("[") || input.type === "tuple"
                ? JSON.parse(e.target.value)
                : e.target.value,
          },
        })
      }
    />
  ),
  renderParamTypes: () => null,
}));
vi.mock("@/components/fnParams/inputs", () => ({
  AddressInput: () => null,
  IntInput: () => null,
  InputInfo: () => null,
}));
vi.mock("@/components/CopyToClipboard", () => ({
  CopyToClipboard: ({ textToCopy, labelText }: any) => (
    <button onClick={() => copied(textToCopy)}>{labelText}</button>
  ),
}));

const address = "0x0000000000000000000000000000000000000001";
const client = {
  readContract: vi.fn(),
  call: vi.fn(),
  simulateContract: vi.fn(),
};
const transfer: JsonFragment = {
  type: "function",
  name: "transfer",
  stateMutability: "view",
  inputs: [
    { name: "to", type: "address" },
    { name: "amount", type: "uint256" },
  ],
  outputs: [],
};
function form(
  func: JsonFragment = transfer,
  type: "read" | "write" = "read",
  inferred = false,
  collapsed = false,
  abiMode: "contract" | "implementation" = "contract"
) {
  return (
    <ChakraProvider>
      <ReadWriteFunction
        client={client as any}
        index={1}
        type={type}
        func={func as any}
        address={address}
        chainId={1}
        isAbiDecoded={inferred}
        readAllCollapsed={collapsed}
        abiMode={abiMode}
      />
    </ChakraProvider>
  );
}
function fill(name: string, value: string) {
  fireEvent.change(screen.getByRole("textbox", { name }), {
    target: { value },
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("localStorage", {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
  });
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

it("encodes the current read ABI/arguments locally, offers exact copy and a decoder link", async () => {
  render(form());
  fill("to", address);
  fill("amount", "9007199254740993");
  fireEvent.click(screen.getByRole("button", { name: "Encode Calldata" }));
  const expected = new Interface([transfer]).encodeFunctionData("transfer", [
    address,
    9007199254740993n,
  ]);
  expect(await screen.findByText(expected)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Copy Calldata" }));
  expect(copied).toHaveBeenCalledWith(expected);
  const link = screen.getByRole("link", { name: /Open in decoder/ });
  expect(link.getAttribute("href")).toBe(
    `/calldata/decoder?calldata=${expected}`
  );
  expect(client.readContract).not.toHaveBeenCalled();
  expect(client.call).not.toHaveBeenCalled();
  expect(client.simulateContract).not.toHaveBeenCalled();
  expect(wallet.sendTransaction).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});

it("shares current calldata, loaded route, ABI mode and wei value as a review-only fragment", async () => {
  render(form(transfer, "read", false, false, "implementation"));
  fill("to", address);
  fill("amount", "9007199254740993");
  fireEvent.click(screen.getByRole("button", { name: "Encode Calldata" }));
  fireEvent.click(
    await screen.findByRole("button", { name: "Copy Review Link" })
  );
  const url = new URL(copied.mock.lastCall![0]);
  expect(url.pathname).toBe(`/contract/1/${address}`);
  const params = new URLSearchParams(url.hash.slice(1));
  expect(params.get("data")).toBe(
    new Interface([transfer]).encodeFunctionData("transfer", [
      address,
      9007199254740993n,
    ])
  );
  expect(params.get("abi")).toBe("implementation");
  expect(params.get("value")).toBe("0");
  expect(params.get("function")).toBe("transfer(address,uint256)");
  expect(wallet.sendTransaction).not.toHaveBeenCalled();
});

it("removes old calldata when arguments or the selected function change", async () => {
  const view = render(form());
  fill("to", address);
  fill("amount", "1");
  fireEvent.click(screen.getByRole("button", { name: "Encode Calldata" }));
  const expected = new Interface([transfer]).encodeFunctionData("transfer", [
    address,
    1n,
  ]);
  await screen.findByText(expected);
  view.rerender(form({ ...transfer, name: "other" }));
  await waitFor(() => expect(screen.queryByText(expected)).toBeNull());
});

it("encodes nested tuple/array booleans for writes without a connected wallet action", async () => {
  const func: JsonFragment = {
    type: "function",
    name: "configure",
    stateMutability: "payable",
    inputs: [
      {
        name: "settings",
        type: "tuple",
        components: [
          { name: "enabled", type: "bool" },
          { name: "flags", type: "bool[]" },
        ],
      },
    ],
  };
  render(form(func, "write"));
  fill("settings", '["false",["true","false"]]');
  fireEvent.click(screen.getByRole("button", { name: "Encode Calldata" }));
  const expected = new Interface([func]).encodeFunctionData("configure", [
    [false, [true, false]],
  ]);
  expect(await screen.findByText(expected)).toBeTruthy();
  expect(wallet.sendTransaction).not.toHaveBeenCalled();
  expect(client.call).not.toHaveBeenCalled();
  expect(client.simulateContract).not.toHaveBeenCalled();
});

const supportsInterface: JsonFragment = {
  type: "function",
  name: "supportsInterface",
  stateMutability: "view",
  inputs: [{ name: "interfaceId", type: "bytes4" }],
  outputs: [{ type: "bool" }],
};

it("offers sourced interface IDs only for supportsInterface(bytes4), retaining manual entry without calling", async () => {
  render(form(supportsInterface));
  const preset = screen.getByRole("combobox", {
    name: "ERC-165 interface preset",
  });
  fireEvent.change(preset, { target: { value: "0x80ac58cd" } });
  expect(
    (screen.getByRole("textbox", { name: "interfaceId" }) as HTMLInputElement)
      .value
  ).toBe("0x80ac58cd");
  expect(
    screen
      .getByRole("link", { name: /Interface specification/ })
      .getAttribute("href")
  ).toBe("https://eips.ethereum.org/EIPS/eip-721");
  expect(screen.getByText(/ERC-20 does not require ERC-165/)).toBeTruthy();
  expect(screen.queryByRole("option", { name: /^ERC-20 / })).toBeNull();
  fill("interfaceId", "0x12345678");
  expect((preset as HTMLSelectElement).value).toBe("");
  fireEvent.click(screen.getByRole("button", { name: "Encode Calldata" }));
  expect(
    await screen.findByText(
      "0x01ffc9a71234567800000000000000000000000000000000000000000000000000000000"
    )
  ).toBeTruthy();
  expect(client.readContract).not.toHaveBeenCalled();
  expect(client.call).not.toHaveBeenCalled();
  expect(wallet.sendTransaction).not.toHaveBeenCalled();
});

it.each([
  { ...supportsInterface, name: "other" },
  { ...supportsInterface, inputs: [{ name: "interfaceId", type: "bytes32" }] },
  {
    ...supportsInterface,
    inputs: [...supportsInterface.inputs!, { type: "uint256", name: "other" }],
  },
])("does not offer presets on unrelated signatures: %j", (func) => {
  render(form(func));
  expect(
    screen.queryByRole("combobox", { name: "ERC-165 interface preset" })
  ).toBeNull();
});

it("warns about inferred names/parameters even when collapsed and repeats the caveat in encoded output", async () => {
  render(form(transfer, "read", true, true));
  const warning = screen.getByText(/Inferred signature.*not verified/i);
  expect(warning.closest('[style*="display: none"]')).toBeNull();
  fireEvent.click(screen.getByText("transfer"));
  fill("to", address);
  fill("amount", "1");
  fireEvent.click(screen.getByRole("button", { name: "Encode Calldata" }));
  expect(await screen.findByRole("dialog")).toBeTruthy();
  expect(screen.getByRole("dialog").textContent).toMatch(
    /inferred.*not verified/i
  );
  expect(client.readContract).not.toHaveBeenCalled();
  expect(wallet.sendTransaction).not.toHaveBeenCalled();
});

it("does not invent inferred or verified labels for an explorer ABI", () => {
  render(form());
  expect(screen.queryByText(/Inferred signature.*not verified/i)).toBeNull();
  expect(screen.queryByText(/Verified signature/i)).toBeNull();
});

it("rejects invalid current parameters rather than exposing previous calldata", async () => {
  render(form());
  fill("to", address);
  fill("amount", "1");
  fireEvent.click(screen.getByRole("button", { name: "Encode Calldata" }));
  await screen.findByRole("dialog");
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  fill("amount", "not-an-integer");
  fireEvent.click(screen.getByRole("button", { name: "Encode Calldata" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByRole("alert").textContent).toMatch(
    /encode|integer|BigInt/i
  );
  expect(wallet.sendTransaction).not.toHaveBeenCalled();
  expect(client.readContract).not.toHaveBeenCalled();
});
