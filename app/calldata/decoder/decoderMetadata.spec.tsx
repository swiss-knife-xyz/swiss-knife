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
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { CalldataDecoderPage } from "./CalldataDecoderPage";
import { AddressParam } from "@/components/decodedParams/AddressParam";

const mocks = vi.hoisted(() => ({
  decode: vi.fn(),
  getClient: vi.fn(),
  abi: vi.fn(),
  labels: vi.fn(),
  resolve: vi.fn(),
  avatar: vi.fn(),
  url: vi.fn(),
  query: "",
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mocks.query),
}));
vi.mock("@/lib/decoder", () => ({
  decodeRecursive: mocks.decode,
  decodeEvents: vi.fn(),
}));
vi.mock("@/lib/publicClient", () => ({ getPublicClient: mocks.getClient }));
vi.mock("@/utils", () => ({
  startHexWith0x: (s: string) => (s.startsWith("0x") ? s : `0x${s}`),
  resolveERC3770Address: (s: string) => ({ address: s }),
  fetchContractAbi: mocks.abi,
  resolveAddressToName: mocks.resolve,
  getNameAvatar: mocks.avatar,
  getPath: () => "/",
}));
vi.mock("@/utils/addressLabels", () => ({ fetchAddressLabels: mocks.labels }));
vi.mock("@/hooks/useAddressBook", () => ({
  useAddressBook: () => ({ isReady: true, getLabel: () => null }),
}));
vi.mock("@/components/AddressBook", () => ({ AddressLabelModal: () => null }));
vi.mock("@monaco-editor/react", () => ({ Editor: () => null }));
vi.mock("@/components/InputField", () => ({
  InputField: (p: any) => <input {...p} />,
}));
vi.mock("@/components/CopyToClipboard", () => ({
  CopyToClipboard: ({ textToCopy, labelText }: any) => (
    <button data-copy={textToCopy}>{labelText ?? "Copy"}</button>
  ),
}));
vi.mock("@/components/decodedParams", async () => ({
  AddressParam: (await import("@/components/decodedParams/AddressParam"))
    .AddressParam,
  UintParam: () => null,
  IntParam: () => null,
  StringParam: () => null,
}));
vi.mock("@/components/decodedParams/TreeView/TreeBytesParam", () => ({
  TreeBytesParam: () => null,
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
          options.find((o: any) => String(o.value) === e.target.value) ?? null
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
const arg = {
  name: "token",
  baseType: "address",
  type: "address",
  value: address,
};
function page(query = "") {
  mocks.query = query;
  return (
    <ChakraProvider>
      <NuqsTestingAdapter
        searchParams={query}
        hasMemory
        onUrlUpdate={mocks.url}
      >
        <CalldataDecoderPage />
      </NuqsTestingAdapter>
    </ChakraProvider>
  );
}
function param(chainId?: number, a = address) {
  return (
    <ChakraProvider>
      <AddressParam address={a} chainId={chainId} showLink />
    </ChakraProvider>
  );
}
async function decode() {
  fireEvent.change(screen.getByRole("textbox", { name: "Calldata" }), {
    target: { value: "0x12345678" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Decode" }));
  await screen.findByText("Decoded calldata");
}
const lookupName = "Network lookup";
const gearName = "Network lookup settings";
// The optional metadata network is only reachable through the gear panel.
async function openLookup() {
  if (!screen.queryByRole("combobox", { name: lookupName })) {
    fireEvent.click(screen.getByRole("button", { name: gearName }));
  }
  return (await screen.findByRole("combobox", {
    name: lookupName,
  })) as HTMLSelectElement;
}
async function selectChain(value: string) {
  fireEvent.change(await openLookup(), { target: { value } });
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.query = "";
  mocks.decode.mockResolvedValue({
    args: [arg],
    rawArgs: [address],
    functionName: "transfer",
    signature: "transfer(address)",
  });
  mocks.getClient.mockImplementation((chain: number) => ({
    getBytecode: vi.fn().mockResolvedValue("0x01"),
    readContract: vi
      .fn()
      .mockResolvedValue(chain === 1 ? "ETH-TOKEN" : "BASE-TOKEN"),
  }));
  mocks.abi.mockResolvedValue(null);
  mocks.labels.mockResolvedValue([]);
  mocks.resolve.mockResolvedValue(null);
  mocks.avatar.mockResolvedValue(null);
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addListener() {},
    removeListener() {},
  }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("decodes manually without a network and keeps the raw address without chain RPCs", async () => {
  render(page());
  await decode();
  expect(screen.getByDisplayValue(address)).toBeTruthy();
  expect(mocks.getClient).not.toHaveBeenCalled();
  expect(mocks.decode).toHaveBeenCalledWith(
    expect.objectContaining({ address: undefined, abi: undefined })
  );
  expect((await openLookup()).value).toBe("0");
});

it("keeps calldata as the only inline field and hides network lookup behind an accessible gear", async () => {
  render(page());
  expect(screen.queryByRole("combobox")).toBeNull();
  expect(screen.queryByText(/Optionally select a network/)).toBeNull();
  const gear = screen.getByRole("button", { name: gearName });
  expect(gear.getAttribute("aria-expanded")).toBe("false");

  fireEvent.click(gear);
  expect(gear.getAttribute("aria-expanded")).toBe("true");
  const dialog = await screen.findByRole("dialog", { name: lookupName });
  expect(gear.getAttribute("aria-controls")).toBe(dialog.id);
  const select = (await screen.findByRole("combobox", {
    name: lookupName,
  })) as HTMLSelectElement;
  // Opening moves focus into the panel.
  await waitFor(() => expect(document.activeElement).toBe(select));
  expect(select.value).toBe("0");
  expect(select.selectedOptions[0].textContent).toBe("None");

  fireEvent.change(select, { target: { value: "8453" } });
  fireEvent.keyDown(select, { key: "Escape" });
  await waitFor(() =>
    expect(screen.queryByRole("combobox", { name: lookupName })).toBeNull()
  );
  expect(screen.queryByRole("dialog", { name: lookupName })).toBeNull();
  expect(gear.getAttribute("aria-expanded")).toBe("false");
  await waitFor(() => expect(document.activeElement).toBe(gear));

  // The selection survives close/reopen and still drives decoding metadata + URL.
  expect((await openLookup()).value).toBe("8453");
  await decode();
  await screen.findByText("BASE-TOKEN");
  expect(mocks.decode).toHaveBeenCalledWith(
    expect.objectContaining({ chainId: undefined, address: undefined })
  );
  await waitFor(() =>
    expect(mocks.url.mock.lastCall![0].searchParams.get("chainId")).toBe(
      "8453"
    )
  );
});

it("closes the network panel with Escape on the gear and returns focus to it", async () => {
  render(page());
  const gear = screen.getByRole("button", { name: gearName });
  gear.focus();
  fireEvent.click(gear);
  const select = await screen.findByRole("combobox", { name: lookupName });
  await waitFor(() => expect(document.activeElement).toBe(select));
  gear.focus();
  fireEvent.keyDown(gear, { key: "Escape" });
  expect(screen.queryByRole("dialog", { name: lookupName })).toBeNull();
  expect(gear.getAttribute("aria-expanded")).toBe("false");
  expect(document.activeElement).toBe(gear);
  // Clicking the gear again toggles it closed as well.
  fireEvent.click(gear);
  await screen.findByRole("dialog", { name: lookupName });
  fireEvent.click(gear);
  expect(screen.queryByRole("dialog", { name: lookupName })).toBeNull();
});

it("lets an open nested select list consume Escape before the panel closes", async () => {
  render(page());
  const select = await openLookup();
  // react-select marks its input aria-expanded while its list is open.
  select.setAttribute("aria-expanded", "true");
  fireEvent.keyDown(select, { key: "Escape" });
  expect(screen.getByRole("dialog", { name: lookupName })).toBeTruthy();
  select.setAttribute("aria-expanded", "false");
  fireEvent.keyDown(select, { key: "Escape" });
  expect(screen.queryByRole("dialog", { name: lookupName })).toBeNull();
});

it("dismisses the network panel on an outside press or when focus leaves it", async () => {
  render(page());
  await openLookup();
  fireEvent.mouseDown(screen.getByRole("dialog", { name: lookupName }));
  expect(screen.getByRole("dialog", { name: lookupName })).toBeTruthy();
  fireEvent.mouseDown(screen.getByRole("button", { name: "Decode" }));
  expect(screen.queryByRole("dialog", { name: lookupName })).toBeNull();

  const select = await openLookup();
  // React's onBlur listens to the bubbling focusout event.
  fireEvent.focusOut(select, {
    relatedTarget: screen.getByRole("button", { name: "Decode" }),
  });
  expect(screen.queryByRole("dialog", { name: lookupName })).toBeNull();
});

it("keeps the required Chain selector inline for the address mode", () => {
  render(page());
  fireEvent.click(screen.getByText("from Address"));
  expect(screen.queryByRole("button", { name: gearName })).toBeNull();
  expect(screen.getByRole("combobox", { name: "Network" })).toBeTruthy();
});

it("refreshes metadata on chain changes without decoding again or replacing the address", async () => {
  render(page());
  await selectChain("1");
  await decode();
  await screen.findByText("ETH-TOKEN");
  await selectChain("8453");
  await screen.findByText("BASE-TOKEN");
  expect(screen.queryByText("ETH-TOKEN")).toBeNull();
  expect(screen.getByDisplayValue(address)).toBeTruthy();
  expect(mocks.decode).toHaveBeenCalledTimes(1);
  await selectChain("0");
  await waitFor(() => expect(screen.queryByText("BASE-TOKEN")).toBeNull());
  expect(screen.getByDisplayValue(address)).toBeTruthy();
});

it("ignores an old chain's slow symbol response", async () => {
  const slow = deferred<string>();
  mocks.getClient.mockImplementation((chain: number) => ({
    getBytecode: vi.fn().mockResolvedValue("0x01"),
    readContract: vi
      .fn()
      .mockReturnValue(
        chain === 1 ? slow.promise : Promise.resolve("BASE-TOKEN")
      ),
  }));
  const view = render(param(1));
  await waitFor(() => expect(mocks.getClient).toHaveBeenCalledWith(1));
  view.rerender(param(8453));
  await screen.findByText("BASE-TOKEN");
  await act(async () => {
    slow.resolve("STALE-ETH");
    await slow.promise;
  });
  expect(screen.queryByText("STALE-ETH")).toBeNull();
  expect(screen.getByText("BASE-TOKEN")).toBeTruthy();
});

it.each(["1", "8453"])(
  "honors an explicit no-ABI metadata network in a deep link: %s",
  async (chain) => {
    render(page(`?calldata=0x12345678&chainId=${chain}`));
    await screen.findByText(chain === "1" ? "ETH-TOKEN" : "BASE-TOKEN");
    expect((await openLookup()).value).toBe(chain);
    expect(mocks.getClient).toHaveBeenCalledWith(Number(chain));
    expect(mocks.getClient).not.toHaveBeenCalledWith(chain === "1" ? 8453 : 1);
    expect(mocks.decode).toHaveBeenCalledTimes(1);
  }
);

it("keeps the selected network when editing or pasting calldata and serializes Ethereum explicitly", async () => {
  render(page());
  await selectChain("1");
  await decode();
  await screen.findByText("ETH-TOKEN");
  await waitFor(() =>
    expect(mocks.url).toHaveBeenLastCalledWith(
      expect.objectContaining({
        searchParams: expect.any(URLSearchParams),
      })
    )
  );
  expect(mocks.url.mock.lastCall![0].searchParams.get("chainId")).toBe("1");
  fireEvent.paste(screen.getByRole("textbox", { name: "Calldata" }), {
    clipboardData: { getData: () => "0xabcdef01" },
  });
  await waitFor(() => expect(mocks.decode).toHaveBeenCalledTimes(2));
  expect(screen.getByText("ETH-TOKEN")).toBeTruthy();
  await waitFor(() =>
    expect(mocks.url.mock.lastCall![0].searchParams.get("calldata")).toBe(
      "0xabcdef01"
    )
  );
  expect(mocks.url.mock.lastCall![0].searchParams.get("chainId")).toBe("1");
  await selectChain("0");
  await waitFor(() =>
    expect(mocks.url.mock.lastCall![0].searchParams.has("chainId")).toBe(false)
  );
});

it("treats an unsupported URL chain as no network while retaining manual decoding", async () => {
  render(page("?calldata=0x12345678&chainId=999999999"));
  await screen.findByText("Decoded calldata");
  expect(screen.getByDisplayValue(address)).toBeTruthy();
  expect(mocks.getClient).not.toHaveBeenCalled();
  expect((await openLookup()).value).toBe("0");
});

it("passes the metadata chain to addresses nested in arrays, tuples and decoded bytes", async () => {
  const args = [
    {
      ...arg,
      name: "tokens",
      type: "address[]",
      baseType: "array",
      value: [arg],
    },
    { ...arg, name: "pair", type: "tuple", baseType: "tuple", value: [arg] },
    {
      ...arg,
      name: "data",
      type: "bytes",
      baseType: "bytes",
      value: { decoded: { args: [arg], functionName: "inner" } },
    },
  ];
  mocks.decode.mockResolvedValue({ args, rawArgs: [], functionName: "batch" });
  render(page());
  await selectChain("8453");
  await decode();
  await waitFor(() =>
    expect(screen.getAllByText("BASE-TOKEN")).toHaveLength(3)
  );
  expect(screen.getAllByDisplayValue(address)).toHaveLength(3);
});

it("falls back to a verified contract name when the token symbol is unavailable", async () => {
  mocks.getClient.mockReturnValue({
    getBytecode: vi.fn().mockResolvedValue("0x01"),
    readContract: vi.fn().mockRejectedValue(new Error("No symbol")),
  });
  mocks.abi.mockResolvedValue({ name: "Verified Contract", abi: [] });
  render(param(8453));
  await screen.findByText("Verified Contract");
  expect(mocks.abi).toHaveBeenCalledWith({ address, chainId: 8453 });
  expect(screen.getByDisplayValue(address)).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Copy" }).getAttribute("data-copy")
  ).toBe(address);
});

it("uses existing address labels when the chain RPC is unavailable", async () => {
  mocks.getClient.mockReturnValue({
    getBytecode: vi.fn().mockRejectedValue(new Error("RPC down")),
  });
  mocks.labels.mockResolvedValue(["Known token"]);
  render(param(8453));
  await screen.findByText("Known token");
  expect(mocks.labels).toHaveBeenCalledWith(address, 8453);
  expect(screen.getByDisplayValue(address)).toBeTruthy();
});

it("keeps manual decoding, copy and explorer access when metadata is unavailable", async () => {
  mocks.getClient.mockReturnValue({
    getBytecode: vi.fn().mockRejectedValue(new Error("RPC down")),
  });
  mocks.labels.mockRejectedValue(new Error("Metadata down"));
  render(page());
  await selectChain("8453");
  await decode();
  await waitFor(() => expect(mocks.labels).toHaveBeenCalledWith(address, 8453));
  expect(screen.getByDisplayValue(address)).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Copy" }).getAttribute("data-copy")
  ).toBe(address);
  expect(
    document.querySelector(`a[href*="${address}?chainId=8453"]`)
  ).toBeTruthy();
  expect(mocks.decode).toHaveBeenCalledTimes(1);
});

it.each(["abi", "labels"] as const)(
  "ignores a stale %s response after a network change",
  async (kind) => {
    const slow = deferred<any>();
    mocks.getClient.mockImplementation((chain: number) => ({
      getBytecode:
        chain === 1 && kind === "labels"
          ? vi.fn().mockRejectedValue(new Error("RPC down"))
          : vi.fn().mockResolvedValue("0x01"),
      readContract:
        chain === 1
          ? vi.fn().mockRejectedValue(new Error("No symbol"))
          : vi.fn().mockResolvedValue("BASE-TOKEN"),
    }));
    mocks[kind].mockReturnValue(slow.promise);
    const view = render(param(1));
    await waitFor(() => expect(mocks[kind]).toHaveBeenCalled());
    view.rerender(param(8453));
    await screen.findByText("BASE-TOKEN");
    await act(async () => {
      slow.resolve(kind === "abi" ? { name: "STALE" } : ["STALE"]);
      await slow.promise;
    });
    expect(screen.queryByText("STALE")).toBeNull();
    expect(screen.getByText("BASE-TOKEN")).toBeTruthy();
  }
);

it("does not let a late rejection clear the next chain's metadata", async () => {
  const slow = deferred<string>();
  mocks.getClient.mockImplementation((chain: number) => ({
    getBytecode: vi.fn().mockResolvedValue("0x01"),
    readContract:
      chain === 1
        ? vi.fn().mockReturnValue(slow.promise)
        : vi.fn().mockResolvedValue("BASE-TOKEN"),
  }));
  const view = render(param(1));
  await waitFor(() => expect(mocks.getClient).toHaveBeenCalledWith(1));
  view.rerender(param(8453));
  await screen.findByText("BASE-TOKEN");
  await act(async () => {
    slow.reject(new Error("late failure"));
    await slow.promise.catch(() => {});
  });
  expect(screen.getByText("BASE-TOKEN")).toBeTruthy();
  expect(mocks.abi).not.toHaveBeenCalled();
});

it("hides old labels immediately while the new network lookup is pending", async () => {
  const slow = deferred<string>();
  const view = render(param(1));
  await screen.findByText("ETH-TOKEN");
  mocks.getClient.mockReturnValue({
    getBytecode: vi.fn().mockResolvedValue("0x01"),
    readContract: vi.fn().mockReturnValue(slow.promise),
  });
  view.rerender(param(8453));
  expect(screen.queryByText("ETH-TOKEN")).toBeNull();
  expect(screen.getByDisplayValue(address)).toBeTruthy();
  await act(async () => {
    slow.resolve("BASE-TOKEN");
  });
  await screen.findByText("BASE-TOKEN");
});

it("does not restore token labels after opting out of chain metadata", async () => {
  const slow = deferred<string>();
  mocks.getClient.mockReturnValue({
    getBytecode: vi.fn().mockResolvedValue("0x01"),
    readContract: vi.fn().mockReturnValue(slow.promise),
  });
  const view = render(param(1));
  await waitFor(() => expect(mocks.getClient).toHaveBeenCalled());
  view.rerender(param());
  await act(async () => {
    slow.resolve("STALE");
  });
  expect(screen.queryByText("STALE")).toBeNull();
  expect(screen.getByDisplayValue(address)).toBeTruthy();
});

it("preserves the address-and-network deep-link decoding path", async () => {
  render(page(`?calldata=0x12345678&address=${address}&chainId=8453`));
  await screen.findByText("Decoded calldata");
  expect(mocks.decode).toHaveBeenCalledWith(
    expect.objectContaining({ address, chainId: 8453 })
  );
  expect(screen.queryByRole("combobox", { name: lookupName })).toBeNull();
  expect(screen.queryByRole("button", { name: gearName })).toBeNull();
});

it("restores the optional metadata network when returning from manual ABI mode", async () => {
  render(page());
  await selectChain("8453");
  await decode();
  await screen.findByText("BASE-TOKEN");
  fireEvent.click(screen.getByText("from ABI"));
  expect(screen.getByText("Input ABI")).toBeTruthy();
  expect(screen.queryByRole("combobox", { name: lookupName })).toBeNull();
  expect(screen.queryByRole("button", { name: gearName })).toBeNull();
  fireEvent.click(screen.getByText("No ABI"));
  expect((await openLookup()).value).toBe("8453");
  await screen.findByText("BASE-TOKEN");
  expect(mocks.decode).toHaveBeenCalledTimes(1);
});

it("ignores metadata from a previous address on the same chain", async () => {
  const slow = deferred<string>();
  mocks.getClient.mockReturnValueOnce({
    getBytecode: vi.fn().mockResolvedValue("0x01"),
    readContract: vi.fn().mockReturnValue(slow.promise),
  });
  const view = render(param(1));
  await waitFor(() => expect(mocks.getClient).toHaveBeenCalled());
  const nextAddress = "0x0000000000000000000000000000000000000002";
  view.rerender(param(1, nextAddress));
  await screen.findByText("ETH-TOKEN");
  await act(async () => {
    slow.resolve("STALE");
  });
  expect(screen.queryByText("STALE")).toBeNull();
  expect(screen.getByDisplayValue(nextAddress)).toBeTruthy();
});
