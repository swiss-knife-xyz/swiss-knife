import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { chainIdToChain } from "@/data/common";
import { ContractPage } from "./[chainId]/[address]/ContractPage";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
const router = { push };
vi.mock("@/hooks/useTopLoaderRouter", () => ({
  useTopLoaderRouter: () => router,
}));
vi.mock("@/hooks/useAddressBook", () => ({
  useAddressBook: () => ({ isReady: true, getLabel: () => null }),
}));
vi.mock("@/components/AddressBook", () => ({
  AddressBookInlineButton: () => null,
}));
vi.mock("@/components/ConnectButton", () => ({ ConnectButton: () => null }));
vi.mock("@/components/fnParams/ReadWriteFunction", () => ({
  ReadWriteFunction: () => null,
}));
vi.mock("@/components/fnParams/RawCalldata", () => ({
  RawCalldata: () => null,
}));
vi.mock("@/components/fnParams/StorageSlot", () => ({
  StorageSlot: () => null,
}));
vi.mock("@/components/SourceCodeExplorer", () => ({
  SourceCodeExplorer: () => null,
}));
vi.mock("@/components/CopyToClipboard", () => ({
  CopyToClipboard: () => null,
}));
vi.mock("@monaco-editor/react", () => ({ Editor: () => null }));
vi.mock("@/lib/publicClient", () => ({ getPublicClient: () => ({}) }));
vi.mock("@/lib/decoder", () => ({ fetchFunctionInterface: vi.fn() }));
vi.mock("@shazow/whatsabi", () => ({ whatsabi: {} }));
vi.mock("evmole", () => ({}));
// Keep the real chain configuration, but never fetch ABI/source/RPC data.
vi.mock("@/utils", () => ({
  fetchContractAbi: vi.fn(),
  fetchContractAbiRaw: () => new Promise(() => {}),
  getImplementationFromBytecodeIfProxy: vi.fn(),
  getPath: (path: string) => `/${path}/`,
  getSourceCode: async () => undefined,
  slicedText: (text: string) => text,
  startHexWith0x: (text: string) => text,
  processContractBytecode: vi.fn(),
}));
vi.mock("@/components/DarkSelect", () => ({
  DarkSelect: ({ selectedOption, setSelectedOption, options }: any) => (
    <select
      aria-label="Network"
      value={selectedOption?.value}
      onChange={(e) =>
        setSelectedOption(
          options.flatMap((entry: any) => entry.options ?? [entry]).find((o: any) => String(o.value) === e.target.value)
        )
      }
    >
      {options.flatMap((entry: any) => entry.options ?? [entry]).map((o: any) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));

const address = "0x0000000000000000000000000000000000000001";
const draft = "0x0000000000000000000000000000000000000002";
const linkName = /view contract on .*opens in a new tab/i;
function page(chainId = 1, loadedAddress = address) {
  return (
    <ChakraProvider>
      <ContractPage params={{ chainId, address: loadedAddress }} />
    </ChakraProvider>
  );
}
beforeEach(() => {
  vi.clearAllMocks();
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

it("links the loaded address beside its label using the configured explorer, with safe new-tab semantics", () => {
  render(page());
  const link = screen.getByRole("link", { name: linkName });
  expect(link.getAttribute("href")).toBe(
    `${chainIdToChain[1].blockExplorers!.default.url}/address/${address}`
  );
  expect(link.getAttribute("target")).toBe("_blank");
  expect(link.getAttribute("rel")).toContain("noopener");
  expect(link.getAttribute("rel")).toContain("noreferrer");
  expect(link.parentElement).toBe(
    screen.getByText("Contract Address").parentElement
  );
  link.focus();
  expect(document.activeElement).toBe(link);
});

it("keeps the loaded address while editing and preserves Enter navigation", () => {
  const { rerender } = render(page());
  const input = screen.getByPlaceholderText("0x...");
  fireEvent.change(input, { target: { value: draft } });
  expect(
    screen.getByRole("link", { name: linkName }).getAttribute("href")
  ).toBe(`https://etherscan.io/address/${address}`);
  expect(push).not.toHaveBeenCalled();
  fireEvent.keyDown(input, { key: "Enter" });
  expect(push).toHaveBeenCalledOnce();
  expect(push.mock.calls[0][0]).toMatch(new RegExp(`/explorer/1/${draft}$`));
  expect(
    screen.getByRole("link", { name: linkName }).getAttribute("href")
  ).toContain(address);
  rerender(page(1, draft));
  expect(
    screen.getByRole("link", { name: linkName }).getAttribute("href")
  ).toBe(`https://etherscan.io/address/${draft}`);
});

it("keeps blur local without linking the uncommitted input", () => {
  render(page());
  const input = screen.getByPlaceholderText("0x...");
  fireEvent.change(input, { target: { value: draft } });
  fireEvent.blur(input);
  expect(push).not.toHaveBeenCalled();
  expect(
    screen.getByRole("link", { name: linkName }).getAttribute("href")
  ).toBe(`https://etherscan.io/address/${address}`);
});

it("switches explorer only after loading the selected network", () => {
  const { rerender } = render(page());
  fireEvent.change(screen.getByRole("combobox", { name: "Network" }), {
    target: { value: "8453" },
  });
  expect(push).not.toHaveBeenCalled();
  expect(
    screen.getByRole("link", { name: linkName }).getAttribute("href")
  ).toBe(`https://etherscan.io/address/${address}`);
  fireEvent.click(screen.getByRole("button", { name: /^Load/ }));
  expect(push).toHaveBeenCalledOnce();
  expect(push.mock.calls[0][0]).toMatch(
    new RegExp(`/explorer/8453/${address}$`)
  );
  expect(
    screen.getByRole("link", { name: linkName }).getAttribute("href")
  ).toBe(`https://etherscan.io/address/${address}`);
  rerender(page(8453));
  expect(
    screen
      .getByRole("link", { name: /view contract on basescan/i })
      .getAttribute("href")
  ).toBe(
    `${chainIdToChain[8453].blockExplorers!.default.url}/address/${address}`
  );
});

it("omits the link for a configured chain without an explorer", () => {
  const originalChain = chainIdToChain[1];
  try {
    chainIdToChain[1] = { ...originalChain, blockExplorers: undefined };
    render(page());
    expect(screen.queryByRole("link", { name: linkName })).toBeNull();
  } finally {
    chainIdToChain[1] = originalChain;
  }
});

it("never falls back to Ethereum for an unknown chain", () => {
  render(page(9007199254740991));
  expect(screen.queryByRole("link", { name: linkName })).toBeNull();
});

it.each(["", "0x1234", "vitalik.eth", `0x${"z".repeat(40)}`])(
  "omits the link for invalid loaded address %j",
  (loadedAddress) => {
    render(page(1, loadedAddress));
    expect(screen.queryByRole("link", { name: linkName })).toBeNull();
  }
);
