import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { Interface } from "ethers";
import { ContractPage } from "./[chainId]/[address]/ContractPage";
import { createContractCallLink } from "@/lib/contractCall";

const { fetchAbi, client, wallet, copied } = vi.hoisted(() => ({
  fetchAbi: vi.fn(),
  copied: vi.fn(),
  client: {
    getCode: vi.fn(),
    readContract: vi.fn(),
    call: vi.fn(),
    simulateContract: vi.fn(),
    chain: { id: 1 },
  },
  wallet: {
    sendTransaction: vi.fn(),
    account: { address: "0x0000000000000000000000000000000000000001" },
    chain: { id: 1 },
  },
}));
vi.mock("wagmi", () => ({
  useWalletClient: () => ({ data: wallet }),
  useAccount: () => ({ address: wallet.account.address, chain: wallet.chain }),
  useSwitchChain: () => ({ switchChain: vi.fn() }),
}));
vi.mock("wagmi/actions", () => ({ waitForTransactionReceipt: vi.fn() }));
vi.mock("@/app/providers", () => ({ config: {} }));
vi.mock("@/hooks/useTopLoaderRouter", () => ({
  useTopLoaderRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/hooks/useAddressBook", () => ({
  useAddressBook: () => ({ isReady: true, getLabel: () => null }),
}));
vi.mock("@/components/AddressBook", () => ({
  AddressBookInlineButton: () => null,
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
vi.mock("@/components/CopyToClipboard", () => ({
  CopyToClipboard: ({ textToCopy, labelText }: any) => (
    <button onClick={() => copied(textToCopy)}>{labelText}</button>
  ),
}));
vi.mock("@monaco-editor/react", () => ({ Editor: () => null }));
vi.mock("@/lib/publicClient", () => ({ getPublicClient: () => client }));
vi.mock("@/lib/decoder", () => ({ fetchFunctionInterface: vi.fn() }));
vi.mock("@shazow/whatsabi", () => ({ whatsabi: {} }));
vi.mock("evmole", () => ({}));
vi.mock("@/utils", () => ({
  fetchContractAbi: vi.fn(),
  fetchContractAbiRaw: fetchAbi,
  getImplementationFromBytecodeIfProxy: vi.fn(),
  processContractBytecode: vi.fn(),
  getPath: (s: string) => `/${s}/`,
  getSourceCode: vi.fn(async () => undefined),
  slicedText: (s: string) => s,
  startHexWith0x: (s: string) => s,
}));
vi.mock("@/components/fnParams/Renderer", () => ({
  renderInputFields: ({ input, value, onChange }: any) => (
    <input
      aria-label={input.name || input.type}
      value={value}
      onChange={onChange}
    />
  ),
  renderParamTypes: () => null,
}));
vi.mock("@/components/fnParams/inputs", () => ({
  InputInfo: () => null,
  AddressInput: () => null,
  IntInput: ({ value, onChange }: any) => (
    <input aria-label="Payable wei" value={value} onChange={onChange} />
  ),
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

const address = "0x0000000000000000000000000000000000000001";
const implementation = "0x0000000000000000000000000000000000000002";
const iface = new Interface([
  "function transfer(uint256 amount) payable",
  "function transfer(address to,uint256 tokens)",
]);
const abi = JSON.parse(iface.formatJson());
function page(chainId = 1, target = address) {
  return (
    <ChakraProvider>
      <ContractPage params={{ address: target, chainId }} />
    </ChakraProvider>
  );
}
function shared(
  mode: "implementation" | "contract" = "contract",
  signature = "transfer(uint256)",
  value = "23"
) {
  return createContractCallLink(
    window.location.origin + "/contract/",
    1,
    address,
    {
      data: iface.encodeFunctionData("transfer(uint256)", [9007199254740993n]),
      value,
      abiMode: mode,
      signature,
    }
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  fetchAbi.mockResolvedValue({ abi, name: "Verified contract" });
  window.history.replaceState(null, "", `/contract/1/${address}`);
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
      throw new Error("Unexpected network request");
    })
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("restores a payable overload into the actual page/form and generates the same review link without signing or simulation", async () => {
  const url = shared();
  window.history.replaceState(null, "", url);
  render(page());
  const amount = await screen.findByRole("textbox", { name: "amount" });
  await waitFor(() =>
    expect((amount as HTMLInputElement).value).toBe("9007199254740993")
  );
  expect(
    (screen.getByRole("textbox", { name: "Payable wei" }) as HTMLInputElement)
      .value
  ).toBe("23");
  expect(
    (
      screen.getByRole("textbox", {
        name: "tokens",
        hidden: true,
      }) as HTMLInputElement
    ).value
  ).toBe("");
  fireEvent.click(screen.getAllByRole("button", { name: "Options" })[0]);
  fireEvent.click(await screen.findByRole("menuitem", { name: "Encode Calldata" }));
  fireEvent.click(screen.getByRole("button", { name: "Encode Calldata" }));
  fireEvent.click(
    await screen.findByRole("button", { name: "Copy Review Link" })
  );
  expect(copied).toHaveBeenLastCalledWith(url);
  expect(wallet.sendTransaction).not.toHaveBeenCalled();
  expect(client.simulateContract).not.toHaveBeenCalled();
  expect(client.call).not.toHaveBeenCalled();
  expect(client.readContract).not.toHaveBeenCalled();
});
it("restores the proxy's own ABI context rather than silently using its implementation", async () => {
  fetchAbi.mockResolvedValue({
    abi,
    name: "Proxy",
    implementation: {
      address: implementation,
      abi: [
        { type: "function", name: "different", inputs: [{ type: "bytes" }] },
      ],
      name: "Implementation",
    },
  });
  window.history.replaceState(null, "", shared("contract"));
  render(page());
  await waitFor(() =>
    expect(
      (screen.getByRole("textbox", { name: "amount" }) as HTMLInputElement)
        .value
    ).toBe("9007199254740993")
  );
  expect(
    (screen.getByRole("combobox", { name: "Interact as" }) as HTMLSelectElement)
      .value
  ).toBe("contract");
  expect(wallet.sendTransaction).not.toHaveBeenCalled();
});
it("clears imported context on explicit ABI switching and never reapplies it when switching back", async () => {
  fetchAbi.mockResolvedValue({
    abi,
    name: "Proxy",
    implementation: { address: implementation, abi, name: "Implementation" },
  });
  window.history.replaceState(null, "", shared("implementation"));
  render(page());
  await screen.findByText(/Review only/);
  fireEvent.change(screen.getByRole("combobox", { name: "Interact as" }), {
    target: { value: "contract" },
  });
  await waitFor(() => expect(screen.queryByText(/Review only/)).toBeNull());
  fireEvent.change(screen.getByRole("combobox", { name: "Interact as" }), {
    target: { value: "proxy" },
  });
  await waitFor(() => expect(screen.queryByText(/Review only/)).toBeNull());
  expect(
    (
      screen.getByRole("textbox", {
        name: "amount",
        hidden: true,
      }) as HTMLInputElement
    ).value
  ).toBe("");
  expect(wallet.sendTransaction).not.toHaveBeenCalled();
});
it("editing pasted calldata invalidates the imported form and its warning before another Decode", async () => {
  window.history.replaceState(null, "", shared());
  render(page());
  await screen.findByText(/Review only/);
  fireEvent.change(
    screen.getByRole("textbox", { name: "Calldata to decode" }),
    { target: { value: "0xdeadbeef" } }
  );
  await waitFor(() =>
    expect(
      (
        screen.getByRole("textbox", {
          name: "amount",
          hidden: true,
        }) as HTMLInputElement
      ).value
    ).toBe("")
  );
  expect(screen.queryByText(/Review only/)).toBeNull();
  expect(
    (
      screen.getByRole("textbox", {
        name: "Payable wei",
        hidden: true,
      }) as HTMLInputElement
    ).value
  ).toBe("0");
  expect(wallet.sendTransaction).not.toHaveBeenCalled();
});

it("invalidating imported data discards a pending simulation without a second wallet request", async () => {
  wallet.sendTransaction.mockImplementationOnce(() => new Promise(() => {}));
  fetchAbi.mockResolvedValue({
    abi: abi.map((f: any) => ({ ...f, outputs: [{ type: "uint256" }] })),
    name: "Verified contract",
  });
  let resolve!: (result: any) => void;
  client.simulateContract.mockImplementationOnce(
    () =>
      new Promise((r) => {
        resolve = r;
      })
  );
  window.history.replaceState(null, "", shared());
  render(page());
  await screen.findByText(/Review only/);
  fireEvent.click(screen.getAllByRole("button", { name: /^Write$/ })[0]);
  await waitFor(() => expect(client.simulateContract).toHaveBeenCalledOnce());
  fireEvent.change(
    screen.getByRole("textbox", { name: "Calldata to decode" }),
    { target: { value: "0xdeadbeef" } }
  );
  await act(async () => {
    resolve({ result: 42n });
  });
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(
    screen.queryByRole("button", { name: "Continue to wallet" })
  ).toBeNull();
  expect(screen.queryByRole("region", { name: "Transaction status" })).toBeNull();
  expect(wallet.sendTransaction).toHaveBeenCalledOnce();
});

it("fragment back/forward invalidates old prefill without a wallet request", async () => {
  window.history.replaceState(null, "", shared());
  render(page());
  await screen.findByText(/Review only/);
  window.history.replaceState(null, "", `/contract/1/${address}`);
  window.dispatchEvent(new PopStateEvent("popstate"));
  await waitFor(() =>
    expect(
      (
        screen.getByRole("textbox", {
          name: "amount",
          hidden: true,
        }) as HTMLInputElement
      ).value
    ).toBe("")
  );
  expect(screen.queryByText(/Review only/)).toBeNull();
  expect(wallet.sendTransaction).not.toHaveBeenCalled();
});
it("route changes do not render the previous ABI while the new destination loads", async () => {
  window.history.replaceState(null, "", shared());
  const view = render(page());
  await screen.findByText(/Review only/);
  fetchAbi.mockImplementation(() => new Promise(() => {}));
  window.history.replaceState(null, "", `/contract/8453/${implementation}`);
  view.rerender(page(8453, implementation));
  expect(
    screen.queryByRole("textbox", { name: "amount", hidden: true })
  ).toBeNull();
  expect(screen.queryByText(/Review only/)).toBeNull();
  expect(wallet.sendTransaction).not.toHaveBeenCalled();
});

it("decodes pasted calldata only on explicit action and clears stale prefill on invalid decode", async () => {
  render(page());
  await screen.findByRole("textbox", { name: "amount", hidden: true });
  const input = screen.getByRole("textbox", { name: "Calldata to decode" });
  fireEvent.change(input, {
    target: { value: iface.encodeFunctionData("transfer(uint256)", [42]) },
  });
  expect(
    (
      screen.getByRole("textbox", {
        name: "amount",
        hidden: true,
      }) as HTMLInputElement
    ).value
  ).toBe("");
  fireEvent.click(screen.getByRole("button", { name: "Decode into form" }));
  await waitFor(() =>
    expect(
      (screen.getByRole("textbox", { name: "amount" }) as HTMLInputElement)
        .value
    ).toBe("42")
  );
  fireEvent.change(input, { target: { value: "0xdeadbeef" } });
  fireEvent.click(screen.getByRole("button", { name: "Decode into form" }));
  await waitFor(() =>
    expect(
      (
        screen.getByRole("textbox", {
          name: "amount",
          hidden: true,
        }) as HTMLInputElement
      ).value
    ).toBe("")
  );
  expect(wallet.sendTransaction).not.toHaveBeenCalled();
});
