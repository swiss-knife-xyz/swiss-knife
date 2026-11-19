import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { Interface } from "ethers";
import { ContractPage } from "./[chainId]/[address]/ContractPage";
const { fetchAbi, client, push, send } = vi.hoisted(() => ({
  fetchAbi: vi.fn(),
  push: vi.fn(),
  send: vi.fn(),
  client: {
    getCode: vi.fn(async () => "0x6000"),
    getBytecode: vi.fn(async () => "0x6000"),
    getBalance: vi.fn(async () => 1000000000000000000n),
    getTransactionCount: vi.fn(async () => 4),
    readContract: vi.fn(),
    simulateContract: vi.fn(),
    call: vi.fn(),
    chain: { id: 1 },
  },
}));
vi.mock("wagmi", () => ({
  useWalletClient: () => ({
    data: {
      sendTransaction: send,
      chain: { id: 1 },
      account: { address: "0x0000000000000000000000000000000000000001" },
    },
  }),
  useAccount: () => ({ chain: { id: 1 } }),
  useSwitchChain: () => ({ switchChain: vi.fn() }),
}));
vi.mock("wagmi/actions", () => ({ waitForTransactionReceipt: vi.fn() }));
vi.mock("@/app/providers", () => ({ config: {} }));
vi.mock("@/hooks/useTopLoaderRouter", () => ({
  useTopLoaderRouter: () => ({ push }),
}));
vi.mock("@/hooks/useAddressBook", () => ({
  useAddressBook: () => ({ isReady: true, getLabel: () => null }),
}));
vi.mock("@/components/AddressBook", () => ({
  AddressBookInlineButton: () => null,
  AddressBookButton: () => null,
  AddressLabelModal: () => null,
}));
vi.mock("@/components/ConnectButton", () => ({
  ConnectButton: () => <button>Wallet connected</button>,
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
vi.mock("@monaco-editor/react", () => ({ Editor: () => null }));
vi.mock("@/lib/publicClient", () => ({ getPublicClient: () => client }));
vi.mock("@/lib/decoder", () => ({ fetchFunctionInterface: vi.fn() }));
vi.mock("@shazow/whatsabi", () => ({ whatsabi: {} }));
vi.mock("evmole", () => ({}));
vi.mock("@/utils/addressLabels", () => ({
  fetchAddressLabels: vi.fn(async () => []),
}));
vi.mock("@/utils", () => ({
  fetchContractAbiRaw: fetchAbi,
  fetchContractAbi: vi.fn(async () => ({ name: "Linked contract", abi: [] })),
  resolveAddressToName: vi.fn(async () => null),
  resolveNameToAddress: vi.fn(async () => null),
  getNameAvatar: vi.fn(async () => null),
  isResolvableName: () => false,
  getImplementationFromBytecodeIfProxy: vi.fn(),
  processContractBytecode: vi.fn(),
  getPath: (s: string) => `/${s}/`,
  getSourceCode: vi.fn(async () => undefined),
  slicedText: (s: string) => s,
  startHexWith0x: (s: string) => s,
}));
vi.mock("@/components/DarkSelect", () => ({
  DarkSelect: ({
    selectedOption,
    setSelectedOption,
    options,
    ariaLabel,
  }: any) => (
    <select
      aria-label={ariaLabel || "Interact as"}
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
const address = "0x0000000000000000000000000000000000000010";
const first = "0x0000000000000000000000000000000000000001";
const second = "0x0000000000000000000000000000000000000002";
const iface = new Interface([
  "function setOwner(address next)",
  "function owner() view returns(address)",
]);
const abi = JSON.parse(iface.formatJson());
beforeEach(() => {
  vi.clearAllMocks();
  fetchAbi.mockResolvedValue({
    abi,
    name: "Original contract",
    implementation: { address: second, abi, name: "Implementation" },
  });
  client.readContract.mockResolvedValue(
    "0x0000000000000000000000000000000000000003"
  );
  window.history.replaceState(
    null,
    "",
    `/contract/1/${address}#call=1&data=${iface.encodeFunctionData("setOwner", [first])}&value=0&abi=implementation&function=setOwner(address)`
  );
  HTMLElement.prototype.scrollTo = vi.fn();
  window.scrollTo = vi.fn();
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: vi.fn() });
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addListener() {},
    removeListener() {},
  }));
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("Unexpected fetch");
    })
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("inspects a real form address and implementation on the loaded chain, preserving page, URL and unsaved drafts", async () => {
  render(
    <ChakraProvider>
      <ContractPage params={{ address, chainId: 1 }} />
    </ChakraProvider>
  );
  const draft = await screen.findByDisplayValue(first);
  expect((draft as HTMLInputElement).readOnly).toBe(false);
  const route = window.location.href;
  const header = screen.getByRole("textbox", { name: "Contract Address" });
  fireEvent.change(header, { target: { value: "unfinished contract draft" } });
  fireEvent.change(screen.getByRole("combobox", { name: "Network" }), {
    target: { value: "137" },
  });
  const trigger = await screen.findByRole("button", {
    name: `Inspect address ${first}`,
  });
  trigger.focus();
  fireEvent.click(trigger);
  let dialog = await screen.findByRole("dialog", { name: "Inspect address" });
  await waitFor(() => expect(within(dialog).getByText("1 ETH")).toBeTruthy());
  expect(within(dialog).getByText("Ethereum · Chain 1")).toBeTruthy();
  expect(client.getBalance).toHaveBeenLastCalledWith({ address: first });
  fireEvent.keyDown(dialog, { key: "Escape", code: "Escape" });
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await waitFor(() => expect(document.activeElement === trigger).toBe(true));
  expect(screen.getByDisplayValue(first) === draft).toBe(true);
  expect(screen.getByDisplayValue("unfinished contract draft") === header).toBe(
    true
  );
  expect(
    (screen.getByRole("combobox", { name: "Network" }) as HTMLSelectElement)
      .value
  ).toBe("137");
  fireEvent.click(
    screen.getByRole("button", { name: `Inspect address ${second}` })
  );
  dialog = await screen.findByRole("dialog", { name: "Inspect address" });
  await waitFor(() =>
    expect(client.getBalance).toHaveBeenLastCalledWith({ address: second })
  );
  expect(within(dialog).getByText(second)).toBeTruthy();
  fireEvent.click(
    within(dialog).getByRole("button", { name: "Close address inspector" })
  );
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  const output = "0x0000000000000000000000000000000000000003";
  fireEvent.click(
    await screen.findByRole("button", { name: `Inspect address ${output}` })
  );
  dialog = await screen.findByRole("dialog", { name: "Inspect address" });
  expect(within(dialog).getByText(output)).toBeTruthy();
  fireEvent.click(
    within(dialog).getByRole("button", { name: "Close address inspector" })
  );
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(window.location.href).toBe(route);
  expect(push).not.toHaveBeenCalled();
  expect(send).not.toHaveBeenCalled();
  expect(client.simulateContract).not.toHaveBeenCalled();
  expect(client.call).not.toHaveBeenCalled();
  expect(fetchAbi).toHaveBeenCalledTimes(1);
});

it("dismisses a pending inspector when the real loaded route changes", async () => {
  let finish!: (value: bigint) => void;
  client.getBalance.mockImplementationOnce(
    () =>
      new Promise<bigint>((resolve) => {
        finish = resolve;
      })
  );
  const { rerender } = render(
    <ChakraProvider>
      <ContractPage params={{ address, chainId: 1 }} />
    </ChakraProvider>
  );
  fireEvent.click(
    await screen.findByRole("button", { name: `Inspect address ${second}` })
  );
  const dialog = await screen.findByRole("dialog");
  await within(dialog).findByRole("status");
  rerender(
    <ChakraProvider>
      <ContractPage params={{ address, chainId: 137 }} />
    </ChakraProvider>
  );
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await waitFor(() =>
    expect(
      (screen.getByRole("combobox", { name: "Network" }) as HTMLSelectElement)
        .value
    ).toBe("137")
  );
  finish(999n);
  await act(async () => {
    await Promise.resolve();
  });
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(push).not.toHaveBeenCalled();
  expect(send).not.toHaveBeenCalled();
});
