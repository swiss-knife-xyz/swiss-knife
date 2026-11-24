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
import { ContractPage } from "./[chainId]/[address]/ContractPage";

const { readVerifiedCache, readCache, writeCache, clearCache, fetchAbi, detectProxy, processCode, sourceCode, client } = vi.hoisted(() => ({
  readVerifiedCache: vi.fn(),
  readCache: vi.fn(),
  writeCache: vi.fn(),
  clearCache: vi.fn(),
  fetchAbi: vi.fn(),
  sourceCode: vi.fn(async () => undefined),
  detectProxy: vi.fn(),
  processCode: vi.fn(),
  client: { getCode: vi.fn() },
}));
vi.mock("@/lib/contractMetadataCache", () => ({
  readVerifiedContractMetadata: readVerifiedCache,
  readDecompiledContractAbi: readCache,
  cacheDecompiledContractAbi: writeCache,
  clearDecompiledContractAbi: clearCache,
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
  ReadWriteFunction: ({ func, isAbiDecoded, isCustomAdded, address, chainId }: any) => (
    <div data-testid="function-provenance" data-inferred={String(isAbiDecoded)} data-custom-added={String(Boolean(isCustomAdded))} data-address={address} data-chain={chainId}>
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
  Editor: ({ value, onChange, options }: any) => options?.ariaLabel ? <textarea aria-label={options.ariaLabel} readOnly={options.readOnly} value={value} onChange={event => onChange?.(event.target.value)} /> : <pre>{value}</pre>,
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
  getSourceCode: sourceCode,
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
  readVerifiedCache.mockReset().mockResolvedValue(undefined);
  readCache.mockReset().mockResolvedValue(undefined);
  writeCache.mockReset().mockResolvedValue(undefined);
  clearCache.mockReset().mockResolvedValue(undefined);
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

it("generates the interface for the selected implementation or proxy ABI", async () => {
  fetchAbi.mockResolvedValue({ abi, name: "Proxy", implementation: {
    address: implementationAddress,
    abi: [{ type: "function", name: "implementationRead", stateMutability: "view", outputs: [{ type: "bool" }] }],
    name: "Implementation",
  } });
  render(page());
  await screen.findByText("implementationRead");
  fireEvent.click(screen.getByRole("button", { name: "ABI & Source Code" }));
  fireEvent.click(screen.getByText("Interface", { exact: true }));
  expect(screen.getByText(/interface IImplementation/).textContent).toContain("function implementationRead() external view returns (bool)");
  fireEvent.click(screen.getByText("Proxy", { exact: true, selector: "div" }));
  expect(screen.getByText(/interface IProxy/).textContent).toContain("function candidate(uint256 arg0) external view");
  fireEvent.click(screen.getByText("ABI", { exact: true }));
  expect(screen.queryByText(/pragma solidity/)).toBeNull();
  fireEvent.click(screen.getByText("Interface", { exact: true }));
  expect(screen.getByText(/interface IProxy/)).toBeTruthy();
});

it("regenerates the interface after custom ABI edits", async () => {
  render(page());
  await inferred(false);
  fireEvent.click(screen.getByRole("button", { name: "ABI & Source Code" }));
  fireEvent.click(screen.getByText("Interface", { exact: true }));
  await addFunction();
  fireEvent.click(screen.getByRole("button", { name: "ABI & Source Code" }));
  expect(screen.getByText(/pragma solidity/).textContent).toContain("function added(uint256 value) external view returns (address)");
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


async function addFunction(declaration = "function added(uint256 value) view returns (address)") {
  if (!screen.queryByRole("button", {name:"Modify ABI"})) {
    fireEvent.click(screen.getByRole("button", {name:"ABI & Source Code"}));
  }
  fireEvent.click(screen.getByRole("button", {name:"Modify ABI"}));
  await screen.findByRole("dialog");
  fireEvent.click(screen.getByText("Add functions", {exact:true}));
  fireEvent.change(screen.getByRole("textbox", {name:"Function declarations"}), {target:{value:declaration}});
  fireEvent.click(screen.getByRole("button", {name:"Apply ABI"}));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
}

it("applies and resets a custom ABI without changing the loaded address or fetching again", async () => {
  render(page()); await inferred(false);
  await addFunction();
  await waitFor(() => expect(screen.getAllByTestId("function-provenance")).toHaveLength(2));
  expect(screen.getByRole("button", { name: "ABI & Source Code" }).getAttribute("data-custom-abi")).toBe("true");
  for (const func of screen.getAllByTestId("function-provenance")) {
    expect(func.getAttribute("data-address")).toBe(address);
    expect(func.getAttribute("data-chain")).toBe("1");
  }
  expect(fetchAbi).toHaveBeenCalledTimes(1);
  if (!screen.queryByRole("button", {name:"Modify ABI"})) {
    fireEvent.click(screen.getByRole("button", {name:"ABI & Source Code"}));
  }
  fireEvent.click(screen.getByRole("button", {name:"Modify ABI"}));
  await screen.findByRole("dialog");
  fireEvent.click(screen.getByRole("button", {name:"Reset ABI"}));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(screen.getByRole("button", { name: "ABI & Source Code" }).getAttribute("aria-expanded")).toBe("false");
  await inferred(false);
  expect(screen.getByRole("button", { name: "ABI & Source Code" }).getAttribute("data-custom-abi")).toBe("false");
  expect(screen.getByTestId("function-provenance").textContent).toBe("candidate");
});

it("keeps proxy and implementation custom ABIs separate", async () => {
  fetchAbi.mockResolvedValue({abi, name:"Proxy", implementation:{address:implementationAddress, abi:[{...abi[0], name:"implementationFunction"}], name:"Implementation"}});
  render(page()); await inferred(false);
  await addFunction();
  await waitFor(() => expect(screen.getAllByTestId("function-provenance")).toHaveLength(2));
  fireEvent.change(screen.getByRole("combobox", {name:"Interact as"}), {target:{value:"contract"}});
  await inferred(false);
  expect(screen.getByTestId("function-provenance").textContent).toBe("candidate");
  expect(screen.getByRole("button", { name: "ABI & Source Code" }).getAttribute("data-custom-abi")).toBe("false");
  fireEvent.change(screen.getByRole("combobox", {name:"Interact as"}), {target:{value:"proxy"}});
  await waitFor(() => expect(screen.getAllByTestId("function-provenance")).toHaveLength(2));
  expect(screen.getByRole("button", { name: "ABI & Source Code" }).getAttribute("data-custom-abi")).toBe("true");
});

it("preserves inferred ABI warnings when adding functions", async () => {
  fetchAbi.mockRejectedValue(new Error("Not verified"));
  render(page()); await inferred(true);
  await addFunction();
  await waitFor(() => expect(screen.getAllByTestId("function-provenance")).toHaveLength(2));
  const functions = screen.getAllByTestId("function-provenance");
  expect(functions.find(func => func.textContent === "candidate")?.getAttribute("data-inferred")).toBe("true");
  expect(functions.find(func => func.textContent === "added")?.getAttribute("data-inferred")).toBe("false");
});

it("can import a replacement when no ABI could be fetched", async () => {
  fetchAbi.mockRejectedValue(new Error("Not verified"));
  processCode.mockRejectedValue(new Error("No bytecode"));
  render(page());
  await screen.findByText(/Unable to fetch ABI for this address/);
  if (!screen.queryByRole("button", {name:"Modify ABI"})) {
    fireEvent.click(screen.getByRole("button", {name:"ABI & Source Code"}));
  }
  fireEvent.click(screen.getByRole("button", {name:"Modify ABI"}));
  await screen.findByRole("dialog");
  fireEvent.click(screen.getByRole("tab", { name: "ABI" }));
  fireEvent.change(screen.getByRole("textbox", {name:"ABI"}), {target:{value:'["function replacement() view returns (bool)"]'}});
  fireEvent.click(screen.getByRole("button", {name:"Apply ABI"}));
  await inferred(false);
  expect(screen.getByTestId("function-provenance").textContent).toBe("replacement");
  expect(screen.getByRole("button", { name: "ABI & Source Code" }).getAttribute("data-custom-abi")).toBe("true");
});


it("sorts additions, highlights only added functions, and scrolls to the first alphabetically after closing", async () => {
  const scroll = vi.fn(function(this: HTMLElement) {
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  const originalScroll = HTMLElement.prototype.scrollIntoView;
  HTMLElement.prototype.scrollIntoView = scroll;
  try {
    render(page()); await inferred(false);
    await addFunction("function zebra(uint256) view returns (bool)\nfunction Banana(uint256)\nfunction alpha(uint256) view returns (address)");
    await waitFor(() => expect(scroll).toHaveBeenCalledTimes(1));
    const functions = screen.getAllByTestId("function-provenance");
    expect(functions.map(func => func.textContent)).toEqual(["alpha", "candidate", "zebra", "Banana"]);
    expect(functions.map(func => func.getAttribute("data-custom-added"))).toEqual(["true", "false", "true", "true"]);
    const target = scroll.mock.contexts[0] as HTMLElement;
    expect(target.getAttribute("data-custom-added")).toBe("true");
    expect(target.textContent).toBe("alpha");
    expect(scroll).toHaveBeenCalledWith({behavior:"smooth", block:"start"});
    await addFunction("function aardvark(uint256) view returns (bool)\nfunction zebra(uint256) view returns (bool)\nfunction Banana(uint256)\nfunction alpha(uint256) view returns (address)");
    await waitFor(() => expect(scroll).toHaveBeenCalledTimes(2));
    expect((scroll.mock.contexts[1] as HTMLElement).textContent).toBe("aardvark");
    expect(screen.getAllByTestId("function-provenance").find(func => func.textContent === "alpha")?.getAttribute("data-custom-added")).toBe("true");
  } finally { HTMLElement.prototype.scrollIntoView = originalScroll; }
});

it("reveals the Write tab when the alphabetically first addition is a write function", async () => {
  const scroll = vi.fn();
  const originalScroll = HTMLElement.prototype.scrollIntoView;
  HTMLElement.prototype.scrollIntoView = scroll;
  try {
    render(page()); await inferred(false);
    await addFunction("function Zulu(uint256) view returns (bool)\nfunction Aardvark(uint256)");
    await waitFor(() => expect(scroll).toHaveBeenCalledOnce());
    expect((scroll.mock.contexts[0] as HTMLElement).textContent).toBe("Aardvark");
    expect(document.getElementById(`contract-1-${address.toLowerCase()}-write-tab`)?.getAttribute("aria-selected")).toBe("true");
  } finally { HTMLElement.prototype.scrollIntoView = originalScroll; }
});

it("keeps custom declarations editable on reopen, replacing renamed functions and restoring the base when cleared", async () => {
  render(page()); await inferred(false);
  const declaration = "function added(uint256 value) view returns (address)";
  await addFunction(declaration);
  expect(screen.queryByText("Custom ABI")).toBeNull();
  expect(screen.getByRole("button", { name: "Modify ABI", hidden: true }).getAttribute("data-custom-abi")).toBe("true");
  if (!screen.queryByRole("button", { name: "Modify ABI" })) {
    fireEvent.click(screen.getByRole("button", { name: "ABI & Source Code" }));
  }
  fireEvent.click(screen.getByRole("button", { name: "Modify ABI" }));
  await screen.findByRole("dialog");
  fireEvent.click(screen.getByText("Add functions", { exact: true }));
  expect((screen.getByRole("textbox", { name: "Function declarations" }) as HTMLTextAreaElement).value).toBe(declaration);
  const baseline = screen.getByRole("textbox", { name: "Existing contract functions" }) as HTMLTextAreaElement;
  expect(baseline.value).toContain("function candidate(");
  expect(baseline.value).not.toContain("function added(");
  expect(baseline.readOnly).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await addFunction("function renamed(address owner) view returns (bool)");
  expect(screen.getAllByTestId("function-provenance").map(func => func.textContent)).toEqual(["candidate", "renamed"]);
  await addFunction("");
  expect(screen.getAllByTestId("function-provenance").map(func => func.textContent)).toEqual(["candidate"]);
  expect(screen.getByRole("button", { name: "ABI & Source Code" }).getAttribute("data-custom-abi")).toBe("false");
});

it("restores an original function after removing a custom override", async () => {
  render(page()); await inferred(false);
  await addFunction("function candidate(uint256) view returns (address)");
  await addFunction("");
  expect(screen.getAllByTestId("function-provenance").map(func => func.textContent)).toEqual(["candidate"]);
  expect(screen.getByRole("button", { name: "ABI & Source Code" }).getAttribute("data-custom-abi")).toBe("false");
  if (!screen.queryByRole("button", { name: "Modify ABI" })) {
    fireEvent.click(screen.getByRole("button", { name: "ABI & Source Code" }));
  }
  fireEvent.click(screen.getByRole("button", { name: "Modify ABI" }));
  await screen.findByRole("dialog");
  fireEvent.click(screen.getByRole("tab", { name: "ABI" }));
  const replacement = screen.getByRole("textbox", { name: "ABI" }) as HTMLTextAreaElement;
  expect(JSON.parse(replacement.value)).toEqual(abi);
});

it("collapses ABI & Source Code after a successful submission, but keeps it open on validation errors or Cancel", async () => {
  render(page()); await inferred(false);
  fireEvent.click(screen.getByRole("button", { name: "ABI & Source Code" }));
  fireEvent.click(screen.getByRole("button", { name: "Modify ABI" }));
  await screen.findByRole("dialog");
  fireEvent.change(screen.getByRole("textbox", { name: "Function declarations" }), { target: { value: "invalid(" } });
  fireEvent.click(screen.getByRole("button", { name: "Apply ABI" }));
  expect(await screen.findByRole("alert")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(screen.getByRole("button", { name: "ABI & Source Code" }).getAttribute("aria-expanded")).toBe("true");
  await addFunction();
  await waitFor(() => expect(screen.getByRole("button", { name: "ABI & Source Code" }).getAttribute("aria-expanded")).toBe("false"));
  expect(screen.queryByRole("button", { name: "Modify ABI" })).toBeNull();
});


it("resolves a 7702 authorization on-chain, fetches the target ABI, and calls the EOA", async () => {
  client.getCode.mockResolvedValue(`0xef0100${implementationAddress.slice(2)}`);
  fetchAbi.mockResolvedValue({ abi, name: "Delegated wallet" });
  render(page());
  await inferred(false);
  expect(screen.getByText("EIP-7702 delegated implementation:")).toBeTruthy();
  expect(screen.queryByRole("combobox", { name: "Interact as" })).toBeNull();
  expect(fetchAbi).toHaveBeenCalledExactlyOnceWith({ address: implementationAddress, chainId: 1 });
  await waitFor(() => expect(sourceCode).toHaveBeenCalledWith(1, implementationAddress));
  expect(detectProxy).not.toHaveBeenCalled();
  expect(processCode).not.toHaveBeenCalled();
  expect(screen.getByTestId("function-provenance").getAttribute("data-address")).toBe(address);
  fireEvent.click(screen.getByRole("button", { name: "ABI & Source Code" }));
  expect(screen.getByText("EOA", { exact: true })).toBeTruthy();
});

it("infers unverified 7702 implementation functions from target code, never the marker", async () => {
  client.getCode.mockImplementation(async ({ address: target }: any) =>
    target === address ? `0xef0100${implementationAddress.slice(2)}` : "0x6001600055"
  );
  fetchAbi.mockRejectedValue(new Error("Unverified delegate"));
  render(page());
  await inferred(true);
  expect(processCode).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ contractCode: "0x6001600055" }));
  expect(screen.getByTestId("function-provenance").getAttribute("data-address")).toBe(address);
});

it("does not infer functions from an empty or chained delegation target", async () => {
  client.getCode.mockResolvedValue(`0xef0100${implementationAddress.slice(2)}`);
  fetchAbi.mockRejectedValue(new Error("Unverified delegate"));
  render(page());
  await screen.findByText(/Unable to fetch ABI for this address/);
  expect(processCode).not.toHaveBeenCalled();
  expect(detectProxy).not.toHaveBeenCalled();
});

it("renders cached inferred functions while RPC and verification are pending, then replaces them with verified functions", async () => {
  readCache.mockResolvedValue({ abi, name: "Cached", isDecoded: true });
  let resolveCode!: (code: string) => void;
  client.getCode.mockImplementationOnce(() => new Promise(resolve => { resolveCode = resolve; }));
  let resolveVerified!: (value: unknown) => void;
  fetchAbi.mockImplementationOnce(() => new Promise(resolve => { resolveVerified = resolve; }));
  render(page());
  await inferred(true);
  expect(fetchAbi).not.toHaveBeenCalled();
  expect(screen.queryByRole("status", { name: "Loading contract functions" })).toBeNull();
  await act(async () => resolveCode("0x6000"));
  await waitFor(() => expect(fetchAbi).toHaveBeenCalledTimes(1));
  await inferred(true);
  await act(async () => resolveVerified({ abi: [{ ...abi[0], name: "verifiedFunction" }], name: "Verified" }));
  await inferred(false);
  expect(screen.getByTestId("function-provenance").textContent).toBe("verifiedFunction");
  expect(screen.queryByText(/This contract isn’t verified/i)).toBeNull();
  expect(processCode).not.toHaveBeenCalled();
});

it("rechecks verification but reuses an inferred regular ABI without decompiling again", async () => {
  readCache.mockResolvedValue({ abi, name: "Cached", isDecoded: true });
  fetchAbi.mockRejectedValue(new Error("Not verified"));
  render(page());
  await inferred(true);
  await waitFor(() => expect(detectProxy).toHaveBeenCalled());
  expect(fetchAbi).toHaveBeenCalledTimes(1);
  expect(processCode).not.toHaveBeenCalled();
  expect(writeCache).not.toHaveBeenCalled();
});

it("persists a newly reconstructed regular ABI with inferred provenance", async () => {
  fetchAbi.mockRejectedValue(new Error("Not verified"));
  render(page());
  await inferred(true);
  await waitFor(() => expect(writeCache).toHaveBeenCalledWith(1, address, { abi, name: address, isDecoded: true }));
});

it("does not persist reconstructed proxies or delegated accounts", async () => {
  fetchAbi.mockRejectedValue(new Error("Not verified"));
  detectProxy.mockResolvedValue({ implementationAddress, proxyName: "Proxy" });
  render(page());
  await inferred(true);
  expect(writeCache).not.toHaveBeenCalled();
  expect(clearCache).toHaveBeenCalledWith(1, address);
});

it("prefers the current on-chain implementation over lagging explorer metadata", async () => {
  const latestAddress = "0x0000000000000000000000000000000000000003";
  fetchAbi.mockResolvedValueOnce({ abi, name: "Proxy", implementation: { address: implementationAddress, abi, name: "Old" } })
    .mockResolvedValueOnce({ abi: [{ ...abi[0], name: "latestFunction" }], name: "Latest" });
  detectProxy.mockResolvedValue({ implementationAddress: latestAddress, proxyName: "Proxy" });
  render(page());
  await inferred(false);
  expect(screen.getByTestId("function-provenance").textContent).toBe("latestFunction");
  expect(fetchAbi).toHaveBeenLastCalledWith({ chainId: 1, address: latestAddress });
  expect(writeCache).not.toHaveBeenCalled();
});

it("renders permanently cached verified functions before RPC responds", async () => {
  readVerifiedCache.mockResolvedValue({ status: "1", result: [{ ABI: JSON.stringify(abi), ContractName: "Verified", SourceCode: "contract Verified {}", Implementation: "" }] });
  client.getCode.mockImplementationOnce(() => new Promise(() => {}));
  render(page());
  await inferred(false);
  expect(fetchAbi).not.toHaveBeenCalled();
  expect(screen.queryByRole("status", { name: "Loading contract functions" })).toBeNull();
});

it("keeps cached inferred functions available if the refresh fails", async () => {
  readCache.mockResolvedValue({ abi, name: "Cached", isDecoded: true });
  fetchAbi.mockRejectedValue(new Error("Offline"));
  detectProxy.mockRejectedValue(new Error("RPC unavailable"));
  render(page());
  await inferred(true);
  await waitFor(() => expect(detectProxy).toHaveBeenCalled());
  expect(processCode).not.toHaveBeenCalled();
  expect(screen.queryByRole("status", { name: "Loading contract functions" })).toBeNull();
});

it("does not cache a delegated account's reconstructed functions", async () => {
  client.getCode.mockResolvedValueOnce(`0xef0100${implementationAddress.slice(2)}`);
  fetchAbi.mockRejectedValue(new Error("Not verified"));
  render(page());
  await inferred(true);
  expect(writeCache).not.toHaveBeenCalled();
  expect(clearCache).toHaveBeenCalledWith(1, address);
});

it("does not flash the function skeleton before a verified cache hit is restored", async () => {
  let finishCache!: (value: unknown) => void;
  readVerifiedCache.mockImplementationOnce(() => new Promise(resolve => { finishCache = resolve; }));
  client.getCode.mockImplementationOnce(() => new Promise(() => {}));
  render(page());
  expect(screen.getByRole("textbox", { name: "Contract Address" })).toBeTruthy();
  expect(screen.queryByRole("status", { name: "Loading contract functions" })).toBeNull();
  await act(async () => finishCache({ status: "1", result: [{ ABI: JSON.stringify(abi), ContractName: "Cached", SourceCode: "contract Cached {}", Implementation: "" }] }));
  await inferred(false);
  expect(screen.queryByRole("status", { name: "Loading contract functions" })).toBeNull();
});

it("shows the existing function skeleton after a cache miss while RPC is pending", async () => {
  let finishCache!: (value: unknown) => void;
  readVerifiedCache.mockImplementationOnce(() => new Promise(resolve => { finishCache = resolve; }));
  client.getCode.mockImplementationOnce(() => new Promise(() => {}));
  render(page());
  expect(screen.queryByRole("status", { name: "Loading contract functions" })).toBeNull();
  await act(async () => finishCache(undefined));
  expect(await screen.findByRole("status", { name: "Loading contract functions" })).toBeTruthy();
  expect(screen.getByRole("textbox", { name: "Contract Address" })).toBeTruthy();
});
