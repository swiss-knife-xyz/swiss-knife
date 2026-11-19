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
import { ContractPage } from "./[chainId]/[address]/ContractPage";

const { push, fetchAbi, source, getClient } = vi.hoisted(() => ({
  push: vi.fn(),
  fetchAbi: vi.fn(),
  source: vi.fn(),
  getClient: vi.fn(),
}));
const router = { push };
vi.mock("@/hooks/useTopLoaderRouter", () => ({
  useTopLoaderRouter: () => router,
}));
vi.mock("@/hooks/useAddressBook", () => ({
  useAddressBook: () => ({ isReady: true, getLabel: () => null }),
}));
vi.mock("@/components/AddressBook", () => ({
  AddressBookInlineButton: ({ address }: any) => (
    <span data-testid="saved-address">{address}</span>
  ),
}));
vi.mock("@/components/ConnectButton", () => ({
  ConnectButton: ({ expectedChainId }: any) => (
    <span data-testid="wallet-chain">{expectedChainId}</span>
  ),
}));
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
vi.mock("@/lib/publicClient", () => ({ getPublicClient: getClient }));
vi.mock("@/lib/decoder", () => ({ fetchFunctionInterface: vi.fn() }));
vi.mock("@shazow/whatsabi", () => ({ whatsabi: {} }));
vi.mock("evmole", () => ({}));
// Real component effects; only external ABI/source/router/RPC boundaries are mocked.
vi.mock("@/utils", () => ({
  fetchContractAbi: vi.fn(),
  fetchContractAbiRaw: fetchAbi,
  getImplementationFromBytecodeIfProxy: vi.fn(),
  getPath: (path: string) => `/${path}/`,
  getSourceCode: source,
  slicedText: (text: string) => text,
  startHexWith0x: (text: string) => text,
  processContractBytecode: vi.fn(),
}));
vi.mock("@/components/DarkSelect", () => ({
  DarkSelect: ({
    ariaLabel,
    selectedOption,
    setSelectedOption,
    options,
  }: any) => (
    <select
      aria-label={ariaLabel ?? "Network"}
      value={selectedOption?.value ?? ""}
      onChange={(e) =>
        setSelectedOption(
          options.find((o: any) => String(o.value) === e.target.value)
        )
      }
    >
      <option value="">Select network</option>
      {options.map((o: any) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));

const address = "0x0000000000000000000000000000000000000001";
const draft = "0x0000000000000000000000000000000000000002";
function page(chainId = 1, loadedAddress = address) {
  return (
    <ChakraProvider>
      <ContractPage params={{ chainId, address: loadedAddress }} />
    </ChakraProvider>
  );
}
async function loaded() {
  await screen.findByText("Loaded contract");
  expect(fetchAbi).toHaveBeenCalledTimes(1);
  fetchAbi.mockClear();
  source.mockClear();
  getClient.mockClear();
}
function stage() {
  const input = screen.getByPlaceholderText("0x...");
  fireEvent.change(input, { target: { value: draft } });
  fireEvent.blur(input);
  fireEvent.change(screen.getByRole("combobox", { name: "Network" }), {
    target: { value: "8453" },
  });
  return input;
}
beforeEach(() => {
  vi.clearAllMocks();
  getClient.mockReturnValue({});
  fetchAbi.mockResolvedValue({ abi: [], name: "Loaded contract" });
  source.mockResolvedValue(undefined);
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

it("stages address and network through blur/tab without navigating, fetching or changing the loaded record", async () => {
  render(page());
  await loaded();
  const input = stage();
  fireEvent.keyDown(input, { key: "Tab" });
  expect(push).not.toHaveBeenCalled();
  expect(fetchAbi).not.toHaveBeenCalled();
  expect(source).not.toHaveBeenCalled();
  expect(getClient).not.toHaveBeenCalled();
  expect(screen.getByText("Loaded contract")).toBeTruthy();
  expect(screen.getByTestId("saved-address").textContent).toBe(address);
  expect(screen.getByTestId("wallet-chain").textContent).toBe("1");
});

it.each(["Load", "Enter"])(
  "applies both drafts once with %s, then fetches the routed contract once",
  async (action) => {
    const { rerender } = render(page());
    await loaded();
    const input = stage();
    if (action === "Load") {
      fireEvent.click(screen.getByRole("button", { name: "Load" }));
      fireEvent.click(screen.getByRole("button", { name: "Load" }));
    } else {
      fireEvent.keyDown(input, { key: "Enter" });
      fireEvent.blur(input);
      fireEvent.keyDown(input, { key: "Enter", repeat: true });
    }
    expect(push).toHaveBeenCalledExactlyOnceWith(`/contract/8453/${draft}`);
    expect(fetchAbi).not.toHaveBeenCalled();
    rerender(page(8453, draft));
    await waitFor(() =>
      expect(fetchAbi).toHaveBeenCalledExactlyOnceWith({
        address: draft,
        chainId: 8453,
      })
    );
    expect(push).toHaveBeenCalledTimes(1);
    expect(source).toHaveBeenCalledExactlyOnceWith(8453, draft);
    expect(getClient).toHaveBeenCalledExactlyOnceWith(8453);
    expect(
      (screen.getByRole("combobox", { name: "Network" }) as HTMLSelectElement)
        .value
    ).toBe("8453");
  }
);

it.each(["", "0x1234", "vitalik.eth", `0x${"z".repeat(40)}`])(
  "rejects invalid draft %j without replacing the loaded record",
  async (invalid) => {
    render(page());
    await loaded();
    const input = screen.getByRole("textbox", { name: "Contract Address" });
    fireEvent.change(input, { target: { value: invalid } });
    fireEvent.click(screen.getByRole("button", { name: "Load" }));
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(
      screen
        .getByText("Please enter a valid contract address")
        .getAttribute("role")
    ).toBe("alert");
    expect(push).not.toHaveBeenCalled();
    expect(fetchAbi).not.toHaveBeenCalled();
    expect(screen.getByText("Loaded contract")).toBeTruthy();
  }
);

it("loads a valid non-mainnet deep link immediately without any submit or navigation", async () => {
  render(page(8453, draft));
  await screen.findByText("Loaded contract");
  expect(fetchAbi).toHaveBeenCalledExactlyOnceWith({
    address: draft,
    chainId: 8453,
  });
  expect(source).toHaveBeenCalledExactlyOnceWith(8453, draft);
  expect(push).not.toHaveBeenCalled();
});

it.each(["address", "network"])(
  "explicitly applies a %s-only edit",
  async (field) => {
    render(page());
    await loaded();
    if (field === "address") {
      fireEvent.change(screen.getByPlaceholderText("0x..."), {
        target: { value: `  ${draft}  ` },
      });
    } else {
      fireEvent.change(screen.getByRole("combobox", { name: "Network" }), {
        target: { value: "8453" },
      });
    }
    fireEvent.click(screen.getByRole("button", { name: "Load" }));
    expect(push).toHaveBeenCalledExactlyOnceWith(
      `/contract/${field === "network" ? 8453 : 1}/${field === "address" ? draft : address}`
    );
  }
);

it("does not navigate or refetch an unchanged pair", async () => {
  render(page());
  await loaded();
  fireEvent.click(screen.getByRole("button", { name: "Load" }));
  fireEvent.keyDown(screen.getByPlaceholderText("0x..."), { key: "Enter" });
  expect(push).not.toHaveBeenCalled();
  expect(fetchAbi).not.toHaveBeenCalled();
});

it("rejects a missing network and clears the validation error when corrected", async () => {
  render(page());
  await loaded();
  const network = screen.getByRole("combobox", { name: "Network" });
  fireEvent.change(network, { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "Load" }));
  expect(screen.getByText("Please select a valid network")).toBeTruthy();
  expect(push).not.toHaveBeenCalled();
  expect(fetchAbi).not.toHaveBeenCalled();
  fireEvent.change(network, { target: { value: "8453" } });
  expect(screen.queryByText("Please select a valid network")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Load" }));
  expect(push).toHaveBeenCalledExactlyOnceWith(`/contract/8453/${address}`);
});

it("replaces both dirty drafts on address-only history navigation without redirecting", async () => {
  const { rerender } = render(page());
  await loaded();
  stage();
  rerender(page(1, draft));
  await waitFor(() =>
    expect(fetchAbi).toHaveBeenCalledExactlyOnceWith({
      address: draft,
      chainId: 1,
    })
  );
  expect((screen.getByPlaceholderText("0x...") as HTMLInputElement).value).toBe(
    draft
  );
  expect(
    (screen.getByRole("combobox", { name: "Network" }) as HTMLSelectElement)
      .value
  ).toBe("1");
  expect(push).not.toHaveBeenCalled();
});

it("replaces both dirty drafts on chain-only history navigation without redirecting", async () => {
  const { rerender } = render(page());
  await loaded();
  stage();
  rerender(page(8453));
  await waitFor(() =>
    expect(fetchAbi).toHaveBeenCalledExactlyOnceWith({ address, chainId: 8453 })
  );
  expect((screen.getByPlaceholderText("0x...") as HTMLInputElement).value).toBe(
    address
  );
  expect(
    (screen.getByRole("combobox", { name: "Network" }) as HTMLSelectElement)
      .value
  ).toBe("8453");
  expect(push).not.toHaveBeenCalled();
});

it("does not submit an IME composition or a repeating Enter key", async () => {
  render(page());
  await loaded();
  const input = stage();
  fireEvent.keyDown(input, { key: "Enter", isComposing: true });
  fireEvent.keyDown(input, { key: "Enter", repeat: true });
  expect(push).not.toHaveBeenCalled();
  expect(fetchAbi).not.toHaveBeenCalled();
  fireEvent.keyDown(input, { key: "Enter" });
  expect(push).toHaveBeenCalledExactlyOnceWith(`/contract/8453/${draft}`);
});
