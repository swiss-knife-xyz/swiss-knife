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
