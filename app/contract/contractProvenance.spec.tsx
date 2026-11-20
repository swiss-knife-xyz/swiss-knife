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
import { mainnet } from "viem/chains";
import { ContractPage } from "./[chainId]/[address]/ContractPage";

const m = vi.hoisted(() => ({
  fetchAbi: vi.fn(),
  proxy: vi.fn(),
  process: vi.fn(),
  simulate: vi.fn(),
  send: vi.fn(),
  receipt: vi.fn(),
  getCode: vi.fn(),
}));
const address = "0x0000000000000000000000000000000000000001";
const implementation = "0x0000000000000000000000000000000000000002";
vi.mock("@/hooks/useTopLoaderRouter", () => ({
  useTopLoaderRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/hooks/useAddressBook", () => ({
  useAddressBook: () => ({ isReady: true, getLabel: () => null }),
}));
vi.mock("@/components/AddressBook", () => ({
  AddressBookButton: () => null,
  AddressBookInlineButton: () => null,
}));
vi.mock("@/components/ConnectButton", () => ({ ConnectButton: () => null }));
vi.mock("@/components/CopyToClipboard", () => ({
  CopyToClipboard: () => null,
}));
vi.mock("@/components/SourceCodeExplorer", () => ({
  SourceCodeExplorer: () => null,
}));
vi.mock("@/components/fnParams/RawCalldata", () => ({
  RawCalldata: () => null,
}));
vi.mock("@/components/fnParams/StorageSlot", () => ({
  StorageSlot: () => null,
}));
vi.mock("@monaco-editor/react", () => ({ Editor: () => null }));
vi.mock("@shazow/whatsabi", () => ({ whatsabi: {} }));
vi.mock("evmole", () => ({}));
vi.mock("wagmi", () => ({
  useAccount: () => ({ address, chain: mainnet }),
  useWalletClient: () => ({
    data: {
      account: { address, type: "json-rpc" },
      chain: mainnet,
      sendTransaction: m.send,
    },
  }),
}));
vi.mock("wagmi/actions", () => ({ waitForTransactionReceipt: m.receipt }));
vi.mock("@/app/providers", () => ({ config: {} }));
vi.mock("@/lib/publicClient", () => ({
  getPublicClient: () => ({
    chain: mainnet,
    getCode: m.getCode,
    simulateContract: m.simulate,
  }),
}));
vi.mock("@/lib/nameResolution", () => ({
  resolveNameToAddress: vi.fn(),
  resolveAddressToName: vi.fn(),
  getNameAvatar: vi.fn(),
  isResolvableName: () => false,
}));
vi.mock("@/utils/addressLabels", () => ({
  fetchAddressLabels: async () => [],
}));
vi.mock("@/utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/utils")>()),
  fetchContractAbiRaw: m.fetchAbi,
  getImplementationFromBytecodeIfProxy: m.proxy,
  processContractBytecode: m.process,
  getSourceCode: async () => undefined,
}));
vi.mock("@/components/DarkSelect", () => ({
  DarkSelect: ({ selectedOption, setSelectedOption, options }: any) => (
    <select
      aria-label={
        typeof selectedOption?.value === "string" ? "Interact as" : "Network"
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
const verified = [
  {
    type: "function",
    name: "propose",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [{ type: "uint256", name: "proposalId" }],
  },
];
beforeEach(() => {
  vi.resetAllMocks();
  m.fetchAbi
    .mockRejectedValueOnce(new Error("Proxy ABI unverified"))
    .mockResolvedValue({ abi: verified, name: "Verified implementation" });
  m.proxy.mockResolvedValue({
    implementationAddress: implementation,
    proxyName: "Inferred proxy",
  });
  m.getCode.mockResolvedValue("0x6000");
  m.process.mockResolvedValue([
    {
      type: "function",
      name: "inferred",
      stateMutability: "nonpayable",
      inputs: [],
      outputs: [],
    },
  ]);
  m.simulate.mockResolvedValue({ result: 42n });
  m.send.mockResolvedValue("0x1234");
  m.receipt.mockResolvedValue({ status: "success" });
  HTMLElement.prototype.scrollTo = vi.fn();
  vi.stubGlobal("localStorage", { getItem: () => null, setItem() {} });
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addListener() {},
    removeListener() {},
  }));
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("Network forbidden");
    })
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("previews a verified implementation behind an unverified proxy before wallet send", async () => {
  render(
    <ChakraProvider>
      <ContractPage params={{ chainId: 1, address }} />
    </ChakraProvider>
  );
  await screen.findByText("Verified implementation");
  fireEvent.click(await screen.findByRole("button", { name: "Write" }));
  await waitFor(() => expect(m.simulate).toHaveBeenCalledOnce());
  expect(m.simulate.mock.calls[0][0]).toMatchObject({
    address,
    functionName: "propose",
    chain: mainnet,
  });
  expect((await screen.findByRole("dialog")).textContent).toContain(
    "Predicted return (simulation)"
  );
  expect(m.send).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(screen.queryByText(/Inferred ABI.*not verified/i)).toBeNull();
  fireEvent.change(screen.getByRole("combobox", { name: "Interact as" }), {
    target: { value: "contract" },
  });
  await screen.findByText(/Inferred ABI.*not verified/i);
  fireEvent.change(screen.getByRole("combobox", { name: "Interact as" }), {
    target: { value: "proxy" },
  });
  await screen.findByText("propose");
  expect(screen.queryByText(/Inferred ABI.*not verified/i)).toBeNull();
  fireEvent.click(await screen.findByRole("button", { name: "Write" }));
  await waitFor(() => expect(m.simulate).toHaveBeenCalledTimes(2));
  await screen.findByRole("dialog");
  expect(m.send).not.toHaveBeenCalled();
}, 15000);

it.each(["implementation", "non-proxy"])(
  "keeps inferred %s ABI provenance explicit without simulating or sending on load",
  async (mode) => {
    if (mode === "implementation") {
      m.fetchAbi.mockReset().mockRejectedValue(new Error("No verified ABI"));
    } else {
      m.proxy.mockResolvedValue(null);
    }
    render(
      <ChakraProvider>
        <ContractPage params={{ chainId: 1, address }} />
      </ChakraProvider>
    );
    await screen.findByText(/Inferred ABI.*not verified/i);
    await screen.findByText("inferred");
    expect(m.simulate).not.toHaveBeenCalled();
    expect(m.send).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  },
  15000
);
