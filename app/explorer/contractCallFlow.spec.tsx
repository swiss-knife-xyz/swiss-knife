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
import { getSourceCode } from "@/utils";
import { buildFunctionLocations } from "@/components/SourceCodeExplorer/functionLocations";

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
vi.mock("@/components/ContractAddressExplorer", () => ({ default: () => null }));
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
  SourceCodeExplorer: ({ navigation, sourceCode, callableFunctions, onCallFunction }: any) => <>
    <output data-testid="source-target">{JSON.stringify({ navigation, files: Object.keys(sourceCode) })}</output>
    {callableFunctions?.map((item: any) => <button key={item.signature} onClick={() => onCallFunction(item.signature)}>Call source {item.signature}</button>)}
  </>,
}));
vi.mock("@/components/CopyToClipboard", () => ({
  CopyToClipboard: ({ textToCopy, labelText, "aria-label": ariaLabel }: any) => (
    <button aria-label={ariaLabel} onClick={() => copied(textToCopy)}>{labelText}</button>
  ),
}));
vi.mock("@monaco-editor/react", () => ({
  Editor: ({ value, onChange, options }: any) => options?.ariaLabel ? <textarea aria-label={options.ariaLabel} readOnly={options.readOnly} value={value} onChange={event => onChange?.(event.target.value)} /> : null,
}));
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
  renderParamTypes: ({ value }: any) => value === null || value === undefined ? null : <output data-testid="read-result">{String(value)}</output>,
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
    window.location.origin + "/explorer/",
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
async function waitForPrefill() {
  await waitFor(() => expect(
    (screen.getByRole("textbox", { name: "amount", hidden: true }) as HTMLInputElement).value
  ).toBe("9007199254740993"));
}

async function openRawCalldata() {
  if (!screen.queryByRole("dialog", { name: "Fill from tx or calldata" })) {
    fireEvent.click(await screen.findByRole("button", { name: "Fill from tx or calldata" }));
  }
  return screen.findByRole("textbox", { name: "Calldata to decode" });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getSourceCode).mockResolvedValue(undefined as any);
  client.getCode.mockResolvedValue("0x6000");
  fetchAbi.mockResolvedValue({ abi, name: "Verified contract" });
  window.history.replaceState(null, "", `/explorer/1/${address}`);
  HTMLElement.prototype.scrollTo = vi.fn();
  HTMLElement.prototype.scrollIntoView = vi.fn();
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
  expect(screen.getByRole("tab", { name: "Write" }).getAttribute("aria-selected")).toBe("true");
  expect(screen.getByRole("tabpanel", { name: "Write" })).toBeTruthy();
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
  fireEvent.click(screen.getAllByRole("button", { name: "Share transfer function call" })[0]);
  fireEvent.click(
    await screen.findByRole("button", { name: "Copy function call link" })
  );
  expect(copied).toHaveBeenLastCalledWith(url);
  await waitFor(() => expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled());
  const scrolled = vi.mocked(HTMLElement.prototype.scrollIntoView).mock.contexts.at(-1) as HTMLElement;
  expect(scrolled.dataset.prefilled).toBe("true");
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
  await waitForPrefill();
  fireEvent.change(screen.getByRole("combobox", { name: "Interact as" }), {
    target: { value: "contract" },
  });
  await waitFor(() => expect(document.querySelector('[data-prefilled="true"]')).toBeNull());
  fireEvent.change(screen.getByRole("combobox", { name: "Interact as" }), {
    target: { value: "proxy" },
  });
  await waitFor(() => expect(document.querySelector('[data-prefilled="true"]')).toBeNull());
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
  await waitForPrefill();
  fireEvent.change(
    await openRawCalldata(),
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
  expect(document.querySelector('[data-prefilled="true"]')).toBeNull();
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
  await waitForPrefill();
  fireEvent.click(screen.getAllByRole("button", { name: /^Write$/ })[0]);
  await waitFor(() => expect(client.simulateContract).toHaveBeenCalledOnce());
  fireEvent.change(
    await openRawCalldata(),
    { target: { value: "0xdeadbeef" } }
  );
  await act(async () => {
    resolve({ result: 42n });
  });
  expect(screen.getByRole("dialog", { name: "Fill from tx or calldata" })).toBeTruthy();
  expect(
    screen.queryByRole("button", { name: "Continue to wallet" })
  ).toBeNull();
  expect(screen.queryByRole("region", { name: "Transaction status" })).toBeNull();
  expect(wallet.sendTransaction).toHaveBeenCalledOnce();
});

it("fragment back/forward invalidates old prefill without a wallet request", async () => {
  window.history.replaceState(null, "", shared());
  render(page());
  await waitForPrefill();
  window.history.replaceState(null, "", `/explorer/1/${address}`);
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
  expect(document.querySelector('[data-prefilled="true"]')).toBeNull();
  expect(wallet.sendTransaction).not.toHaveBeenCalled();
});
it("route changes do not render the previous ABI while the new destination loads", async () => {
  window.history.replaceState(null, "", shared());
  const view = render(page());
  await waitForPrefill();
  fetchAbi.mockImplementation(() => new Promise(() => {}));
  window.history.replaceState(null, "", `/explorer/8453/${implementation}`);
  view.rerender(page(8453, implementation));
  expect(
    screen.queryByRole("textbox", { name: "amount", hidden: true })
  ).toBeNull();
  expect(document.querySelector('[data-prefilled="true"]')).toBeNull();
  expect(wallet.sendTransaction).not.toHaveBeenCalled();
});

it("decodes pasted calldata only on explicit action and clears stale prefill on invalid decode", async () => {
  render(page());
  await screen.findByRole("textbox", { name: "amount", hidden: true });
  let input = await openRawCalldata();
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
  fireEvent.click(screen.getByRole("button", { name: "Fill parameters" }));
  await waitFor(() =>
    expect(
      (screen.getByRole("textbox", { name: "amount" }) as HTMLInputElement)
        .value
    ).toBe("42")
  );
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Fill from tx or calldata" })).toBeNull());
  input = await openRawCalldata();
  fireEvent.change(input, { target: { value: "0xdeadbeef" } });
  fireEvent.click(screen.getByRole("button", { name: "Fill parameters" }));
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

it("decodes an inferred ABI and prefills only the function with the matching on-chain selector", async () => {
  const utils = await import("@/utils");
  fetchAbi.mockRejectedValue(new Error("Not verified"));
  client.getCode.mockResolvedValue("0x60006000f3");
  vi.mocked(utils.processContractBytecode).mockResolvedValue([
    "0x12345678", "0x87654321",
  ].map(selector => ({
    type: "function", name: `selector: ${selector}`, selector,
    stateMutability: "nonpayable", inputs: [{ name: "arg0", type: "uint256" }],
    inputInference: { source: "bytecode", message: "Inferred" },
  })) as any);
  render(page());
  const data = "0x12345678" + new Interface(["function inferred(uint256)"]).encodeFunctionData("inferred", [17]).slice(10);
  let input = await openRawCalldata();
  fireEvent.change(input, { target: { value: data } });
  fireEvent.click(screen.getByRole("button", { name: "Fill parameters" }));
  await waitFor(() => expect(screen.getAllByRole("textbox", { name: "arg0", hidden: true }).map(field => (field as HTMLInputElement).value)).toEqual(["17", ""]));
  await waitFor(() => expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled());
  const scrolled = vi.mocked(HTMLElement.prototype.scrollIntoView).mock.contexts.at(-1) as HTMLElement;
  expect(scrolled.dataset.prefilled).toBe("true");
  expect(scrolled.querySelector('input')?.value).toBe("17");
  expect(wallet.sendTransaction).not.toHaveBeenCalled();
  expect(client.simulateContract).not.toHaveBeenCalled();
});

it.each([[null, null], [address, null]])("restores an unfinished function form %j without executing it", async (first, second) => {
  const url = createContractCallLink(window.location.origin + "/explorer/", 1, address, {
    args: [first, second], value: "0", abiMode: "contract", signature: "transfer(address,uint256)",
  });
  window.history.replaceState(null, "", url);
  render(page());
  const amount = await screen.findByRole("textbox", { name: "tokens" });
  await waitFor(() => expect((amount as HTMLInputElement).value).toBe(""));
  expect((screen.getByRole("textbox", { name: "to" }) as HTMLInputElement).value).toBe(first ?? "");
  await waitFor(() => expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled());
  expect(wallet.sendTransaction).not.toHaveBeenCalled();
  expect(client.simulateContract).not.toHaveBeenCalled();
  expect(client.readContract).not.toHaveBeenCalled();
});

it("switches mobile Read/Write tabs without losing edited function inputs", async () => {
  render(page());
  const read = await screen.findByRole("tab", { name: "Read" });
  const write = screen.getByRole("tab", { name: "Write" });
  expect(read.getAttribute("aria-selected")).toBe("true");
  expect(screen.queryByRole("tabpanel", { name: "Write" })).toBeNull();
  fireEvent.keyDown(read, { key: "ArrowRight" });
  expect(write.getAttribute("aria-selected")).toBe("true");
  fireEvent.click((await screen.findAllByRole("button", { name: "Toggle transfer" }))[0]);
  const amount = await screen.findByRole("textbox", { name: "amount" });
  fireEvent.change(amount, { target: { value: "123456789" } });
  fireEvent.click(read);
  expect(screen.queryByRole("textbox", { name: "amount" })).toBeNull();
  fireEvent.click(write);
  expect((screen.getByRole("textbox", { name: "amount" }) as HTMLInputElement).value).toBe("123456789");
  expect(wallet.sendTransaction).not.toHaveBeenCalled();
});

it("preserves read results and edited inputs across ABI additions, reordering and replacements", async () => {
  const base = [
    "function middle() view returns (uint256)",
    "function zebra() view returns (uint256)",
    "function lookup(uint256 amount) view returns (uint256)",
  ];
  fetchAbi.mockResolvedValue({ abi: JSON.parse(new Interface(base).formatJson()), name: "Test reads" });
  client.readContract.mockImplementation(async ({ functionName, abi }: any) => {
    if (functionName === "middle") return 223n;
    if (functionName === "lookup") return 445n;
    if (functionName === "alpha") return 334n;
    return abi[0].outputs[0].type === "string" ? "updated zebra" : 112n;
  });
  render(page());
  await screen.findByText("112");
  await screen.findByText("223");
  fireEvent.click(screen.getByRole("button", { name: "Toggle lookup" }));
  const input = screen.getByRole("textbox", { name: "amount" }) as HTMLInputElement;
  fireEvent.change(input, { target: { value: "19" } });
  const card = screen.getByRole("button", { name: "Toggle lookup" }).closest("[data-function-selector]") as HTMLElement;
  fireEvent.click(Array.from(card.querySelectorAll("button")).find(button => button.textContent === "Read")!);
  await screen.findByText("445");
  const zebraResult = screen.getByText("112");
  const middleResult = screen.getByText("223");
  const lookupResult = screen.getByText("445");
  const calls = (name: string) => client.readContract.mock.calls.filter(([request]) => request.functionName === name).length;
  expect(client.readContract).toHaveBeenCalledTimes(3);

  fireEvent.click(screen.getByRole("button", { name: "ABI & Source Code" }));
  if (!screen.queryByRole("button", { name: "Modify ABI" })) {
    fireEvent.click(screen.getByRole("button", { name: "ABI & Source Code" }));
  }
  fireEvent.click(screen.getByRole("button", { name: "Modify ABI" }));
  await screen.findByRole("dialog");
  fireEvent.change(screen.getByRole("textbox", { name: "Function declarations" }), {
    target: { value: "function alpha() view returns (uint256)" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Apply ABI" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await screen.findByText("334");
  expect(calls("alpha")).toBe(1);
  expect(calls("middle")).toBe(1);
  expect(calls("zebra")).toBe(1);
  expect(calls("lookup")).toBe(1);
  expect(screen.getByText("112")).toBe(zebraResult);
  expect(screen.getByText("223")).toBe(middleResult);
  expect(screen.getByText("445")).toBe(lookupResult);
  expect(screen.getByRole("textbox", { name: "amount" })).toBe(input);
  expect(input.value).toBe("19");

  // Equivalent definitions with reordered JSON and changed output types reset only the changed card.
  if (!screen.queryByRole("button", { name: "Modify ABI" })) {
    fireEvent.click(screen.getByRole("button", { name: "ABI & Source Code" }));
  }
  fireEvent.click(screen.getByRole("button", { name: "Modify ABI" }));
  await screen.findByRole("dialog");
  fireEvent.click(screen.getByRole("tab", { name: "ABI" }));
  const replacement = new Interface([
    "function zebra() view returns (string)",
    "function alpha() view returns (uint256)",
    "function lookup(uint256 amount) view returns (uint256)",
    "function middle() view returns (uint256)",
  ]);
  fireEvent.change(screen.getByRole("textbox", { name: "ABI" }), { target: { value: replacement.formatJson() } });
  fireEvent.click(screen.getByRole("button", { name: "Apply ABI" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await screen.findByText("updated zebra");
  expect(calls("zebra")).toBe(2);
  expect(calls("alpha")).toBe(1);
  expect(calls("middle")).toBe(1);
  expect(calls("lookup")).toBe(1);
  expect(screen.getByText("223")).toBe(middleResult);
  expect(screen.getByText("445")).toBe(lookupResult);
  expect(input.value).toBe("19");
  expect(wallet.sendTransaction).not.toHaveBeenCalled();
});


it("jumps from read/write tools to inherited source, reopens a collapsed section and selects Source Code", async () => {
  const sources = { "Main.sol": 'import "./Base.sol"; contract Main is Base {}', "Base.sol": "contract Base { uint public count;\n function transfer(uint amount) public payable {}\n function transfer(address to, uint tokens) public {}\n}" };
  fetchAbi.mockResolvedValue({ abi: [...abi, { type: "function", name: "count", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" }], name: "Main" });
  vi.mocked(getSourceCode).mockResolvedValue(sources);
  vi.stubGlobal("Worker", class {
    onmessage: any;
    onerror: any;
    terminate() {}
    postMessage(data: any) { queueMicrotask(() => this.onmessage?.({ data: buildFunctionLocations(data.sources, data.contractName) })); }
  });
  render(page());
  const readJump = await screen.findByRole("button", { name: "Go to source for count" });
  await waitFor(() => expect((readJump as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(readJump);
  await waitFor(() => expect(JSON.parse(screen.getByTestId("source-target").textContent!).navigation).toMatchObject({ path: "Base.sol", line: 1 }));
  fireEvent.click(screen.getByRole("button", { name: "ABI & Source Code" }));
  fireEvent.click(await screen.findByRole("tab", { name: "Write" }));
  const buttons = ["transfer(uint256)", "transfer(address,uint256)"].map(signature => document.querySelector(`[data-function-selector="${iface.getFunction(signature)!.selector}"] button[aria-label="Go to source for transfer"]`) as HTMLButtonElement);
  await waitFor(() => expect((buttons[0] as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(buttons[0]);
  await waitFor(() => expect(screen.getByRole("button", { name: "ABI & Source Code" }).getAttribute("aria-expanded")).toBe("true"));
  expect(JSON.parse(screen.getByTestId("source-target").textContent!).navigation).toMatchObject({ path: "Base.sol", line: 2, mode: "contract" });
  fireEvent.click(screen.getByText("ABI", { exact: true }));
  fireEvent.click(screen.getByRole("button", { name: "ABI & Source Code" }));
  fireEvent.click(buttons[1]);
  await waitFor(() => expect(screen.getByTestId("source-target")).toBeTruthy());
  expect(JSON.parse(screen.getByTestId("source-target").textContent!).navigation).toMatchObject({ path: "Base.sol", line: 3 });
  expect(wallet.sendTransaction).not.toHaveBeenCalled();
});

it("selects the correct implementation or proxy source tab and reuses the cached index when switching back", async () => {
  const proxy = { "Proxy.sol": "contract Proxy { function transfer(uint amount) public payable {} function transfer(address to, uint tokens) public {} }" };
  const impl = { "Impl.sol": "contract Impl { function transfer(uint amount) public payable {} function transfer(address to, uint tokens) public {} }" };
  fetchAbi.mockResolvedValue({ abi, name: "Proxy", implementation: { address: implementation, abi, name: "Impl" } });
  vi.mocked(getSourceCode).mockImplementation(async (_chain, target) => target === implementation ? impl : proxy);
  const posted = vi.fn();
  vi.stubGlobal("Worker", class {
    onmessage: any;
    onerror: any;
    terminate() {}
    postMessage(data: any) { posted(data); queueMicrotask(() => this.onmessage?.({ data: buildFunctionLocations(data.sources, data.contractName) })); }
  });
  render(page());
  fireEvent.click(await screen.findByRole("tab", { name: "Write" }));
  const jump = () => screen.getAllByRole("button", { name: "Go to source for transfer" })[0] as HTMLButtonElement;
  await waitFor(() => expect(jump().disabled).toBe(false));
  fireEvent.click(jump());
  await waitFor(() => expect(JSON.parse(screen.getByTestId("source-target").textContent!).navigation).toMatchObject({ path: "Impl.sol", mode: "implementation" }));
  fireEvent.change(screen.getByRole("combobox", { name: "Interact as" }), { target: { value: "contract" } });
  await waitFor(() => expect(jump().disabled).toBe(false));
  fireEvent.click(jump());
  await waitFor(() => expect(JSON.parse(screen.getByTestId("source-target").textContent!).navigation).toMatchObject({ path: "Proxy.sol", mode: "contract" }));
  fireEvent.change(screen.getByRole("combobox", { name: "Interact as" }), { target: { value: "proxy" } });
  await waitFor(() => expect(jump().disabled).toBe(false));
  fireEvent.click(jump());
  await waitFor(() => expect(JSON.parse(screen.getByTestId("source-target").textContent!).navigation).toMatchObject({ path: "Impl.sol" }));
  expect(posted).toHaveBeenCalledTimes(2);
});


it("jumps back from source to the exact read/write overload, expands and highlights it, and preserves arguments on repeated jumps", async () => {
  const sources = { "Main.sol": "contract Main { function count(uint slot) public view returns(uint) {} function transfer(uint amount) public payable {} function transfer(address to, uint tokens) public {} }" };
  const read = { type: "function", name: "count", inputs: [{ type: "uint256", name: "slot" }], outputs: [{ type: "uint256" }], stateMutability: "view" };
  fetchAbi.mockResolvedValue({ abi: [...abi, read], name: "Main" });
  vi.mocked(getSourceCode).mockResolvedValue(sources);
  vi.stubGlobal("Worker", class {
    onmessage: any;
    onerror: any;
    terminate() {}
    postMessage(data: any) { queueMicrotask(() => this.onmessage?.({ data: buildFunctionLocations(data.sources, data.contractName) })); }
  });
  render(page());
  fireEvent.click(await screen.findByRole("button", { name: "ABI & Source Code" }));
  fireEvent.click(await screen.findByRole("button", { name: "Call source transfer(uint256)" }));
  expect(screen.getByRole("tab", { name: "Write" }).getAttribute("aria-selected")).toBe("true");
  const target = document.querySelector(`[data-function-selector="${iface.getFunction("transfer(uint256)")!.selector}"]`)!;
  await waitFor(() => expect(target.querySelector('[data-source-highlighted="true"]')).toBeTruthy());
  expect(target.querySelector('[aria-label="Collapse transfer"]')?.getAttribute("aria-expanded")).toBe("true");
  expect(target.scrollIntoView).toHaveBeenCalled();
  expect(document.activeElement).toBe(target);
  fireEvent.change(screen.getByRole("textbox", { name: "amount" }), { target: { value: "42" } });
  fireEvent.click(target.querySelector('[aria-label="Collapse transfer"]')!);
  fireEvent.click(screen.getByRole("button", { name: "Call source transfer(uint256)" }));
  await waitFor(() => expect(target.querySelector('[aria-label="Collapse transfer"]')).toBeTruthy());
  expect((screen.getByRole("textbox", { name: "amount" }) as HTMLInputElement).value).toBe("42");
  fireEvent.click(screen.getByRole("button", { name: "Call source count(uint256)" }));
  expect(screen.getByRole("tab", { name: "Read" }).getAttribute("aria-selected")).toBe("true");
  expect(screen.getByRole("button", { name: "Collapse count" }).getAttribute("aria-expanded")).toBe("true");
  expect(document.querySelectorAll('[data-source-highlighted="true"]')).toHaveLength(1);
  expect(wallet.sendTransaction).not.toHaveBeenCalled();
  expect(client.simulateContract).not.toHaveBeenCalled();
});

it("calls from the displayed proxy source tab, switches ABI mode, and exits fullscreen", async () => {
  const proxy = { "Proxy.sol": "contract Proxy { function transfer(uint amount) public payable {} function transfer(address to, uint tokens) public {} }" };
  const impl = { "Impl.sol": "contract Impl { function transfer(uint amount) public payable {} function transfer(address to, uint tokens) public {} }" };
  fetchAbi.mockResolvedValue({ abi, name: "Proxy", implementation: { address: implementation, abi, name: "Impl" } });
  vi.mocked(getSourceCode).mockImplementation(async (_chain, target) => target === implementation ? impl : proxy);
  vi.stubGlobal("Worker", class {
    onmessage: any;
    onerror: any;
    terminate() {}
    postMessage(data: any) { queueMicrotask(() => this.onmessage?.({ data: buildFunctionLocations(data.sources, data.contractName) })); }
  });
  render(page());
  await screen.findByRole("button", { name: "ABI & Source Code" });
  await waitFor(() => expect(screen.getByRole("combobox", { name: "Interact as" })).toBeTruthy());
  fireEvent.click(screen.getByRole("button", { name: "ABI & Source Code" }));
  fireEvent.click(await screen.findByText("Proxy", { exact: true, selector: "div" }));
  await waitFor(() => expect(JSON.parse(screen.getByTestId("source-target").textContent!).files).toEqual(["Proxy.sol"]));
  fireEvent.click(screen.getByRole("button", { name: "Enter fullscreen" }));
  fireEvent.click(await screen.findByRole("button", { name: "Call source transfer(address,uint256)" }));
  await waitFor(() => expect((screen.getByRole("combobox", { name: "Interact as" }) as HTMLSelectElement).value).toBe("contract"));
  expect(screen.getByRole("button", { name: "Enter fullscreen" })).toBeTruthy();
  const target = document.querySelector(`[data-function-selector="${iface.getFunction("transfer(address,uint256)")!.selector}"]`)!;
  expect(target.querySelector('[data-source-highlighted="true"]')).toBeTruthy();
  expect(target.querySelector('[aria-label="Collapse transfer"]')).toBeTruthy();
  expect(document.body.style.overflow).toBe("");
  expect(wallet.sendTransaction).not.toHaveBeenCalled();
});
