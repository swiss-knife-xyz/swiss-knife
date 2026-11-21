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

const { fetchAbi, detectProxy, processCode, client } = vi.hoisted(() => ({
  fetchAbi: vi.fn(),
  detectProxy: vi.fn(),
  processCode: vi.fn(),
  client: { getCode: vi.fn() },
}));
const router = { push: vi.fn() };
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
// Assert the production page's selected ABI provenance at the form boundary;
// contractForm.spec separately exercises actual warning and encoding behavior.
vi.mock("@/components/fnParams/ReadWriteFunction", () => ({
  ReadWriteFunction: ({ func, isAbiDecoded }: any) => (
    <div data-testid="function-provenance" data-inferred={String(isAbiDecoded)}>
      {typeof func.name === "string"
        ? func.name
        : func.name.map((x: any) => x.text).join("")}
    </div>
  ),
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
vi.mock("@monaco-editor/react", () => ({
  Editor: ({ value }: any) => <pre>{value}</pre>,
}));
vi.mock("@/lib/publicClient", () => ({ getPublicClient: () => client }));
vi.mock("@/lib/decoder", () => ({ fetchFunctionInterface: vi.fn() }));
vi.mock("@shazow/whatsabi", () => ({ whatsabi: {} }));
vi.mock("evmole", () => ({}));
vi.mock("@/utils", () => ({
  fetchContractAbi: vi.fn(),
  fetchContractAbiRaw: fetchAbi,
  getImplementationFromBytecodeIfProxy: detectProxy,
  processContractBytecode: processCode,
  getPath: (s: string) => `/${s}/`,
  getSourceCode: vi.fn(async () => undefined),
  slicedText: (s: string) => s,
  startHexWith0x: (s: string) => s,
}));
vi.mock("@/components/DarkSelect", () => ({
  DarkSelect: ({ selectedOption, setSelectedOption, options }: any) => (
    <select
      aria-label={
        options.some((o: any) => o.value === "proxy")
          ? "Interact as"
          : "Network"
      }
      value={selectedOption?.value ?? ""}
      onChange={(e) =>
        setSelectedOption(
          options.find((o: any) => String(o.value) === e.target.value)
        )
      }
    >
      {options.map((o: any) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));

const address = "0x0000000000000000000000000000000000000001";
const implementationAddress = "0x0000000000000000000000000000000000000002";
const abi = [
  {
    type: "function",
    name: "candidate",
    inputs: [{ name: "arg0", type: "uint256" }],
    outputs: [],
    stateMutability: "view",
  },
];
function page() {
  return (
    <ChakraProvider>
      <ContractPage params={{ address, chainId: 1 }} />
    </ChakraProvider>
  );
}
async function inferred(value: boolean) {
  await waitFor(() => {
    const functions = screen.getAllByTestId("function-provenance");
    expect(functions.length).toBe(1);
    expect(functions[0].getAttribute("data-inferred")).toBe(String(value));
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  fetchAbi.mockReset();
  detectProxy.mockReset();
  processCode.mockReset();
  fetchAbi.mockResolvedValue({ abi, name: "Explorer ABI" });
  detectProxy.mockResolvedValue(null);
  processCode.mockResolvedValue(abi);
  client.getCode.mockResolvedValue("0x6000");
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addListener() {},
    removeListener() {},
  }));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("marks reconstructed non-proxy ABI names and parameters as uncertain", async () => {
  fetchAbi.mockRejectedValue(new Error("Not verified"));
  render(page());
  await inferred(true);
  expect(screen.getByText(/This contract isn’t verified/i)).toBeTruthy();
});

it("does not mark an explorer ABI as inferred", async () => {
  render(page());
  await inferred(false);
  expect(screen.queryByText(/This contract isn’t verified/i)).toBeNull();
});

it("tracks a verified implementation separately from its reconstructed proxy ABI", async () => {
  fetchAbi
    .mockRejectedValueOnce(new Error("Proxy not verified"))
    .mockResolvedValueOnce({ abi, name: "Verified implementation" });
  detectProxy.mockResolvedValue({
    implementationAddress,
    proxyName: "Inferred proxy",
  });
  render(page());
  await inferred(false);
  fireEvent.change(screen.getByRole("combobox", { name: "Interact as" }), {
    target: { value: "contract" },
  });
  await inferred(true);
  fireEvent.change(screen.getByRole("combobox", { name: "Interact as" }), {
    target: { value: "proxy" },
  });
  await inferred(false);
  fireEvent.click(screen.getByRole("button", { name: "ABI & Source Code" }));
  fireEvent.click(screen.getByText("ABI", { exact: true }));
  expect(screen.queryByText(/This contract isn’t verified/i)).toBeNull();
  fireEvent.click(screen.getByText("Proxy", { exact: true, selector: "div" }));
  expect(screen.getByText(/This contract isn’t verified/i)).toBeTruthy();
});

it("keeps both reconstructed proxy and implementation ABIs uncertain", async () => {
  fetchAbi.mockRejectedValue(new Error("Not verified"));
  detectProxy.mockResolvedValue({
    implementationAddress,
    proxyName: "Inferred proxy",
  });
  render(page());
  await inferred(true);
  fireEvent.change(screen.getByRole("combobox", { name: "Interact as" }), {
    target: { value: "contract" },
  });
  await inferred(true);
});
