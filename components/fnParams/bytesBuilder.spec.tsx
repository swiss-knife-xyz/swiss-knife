import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { Interface, AbiCoder, type JsonFragment } from "ethers";
import { CalldataEncoderPage } from "@/app/calldata/encoder/CalldataEncoderPage";
import { ReadWriteFunction } from "./ReadWriteFunction";

vi.mock("@monaco-editor/react", () => ({
  Editor: ({ value, onChange }: any) => (
    <textarea
      aria-label="ABI editor"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}));
vi.mock("wagmi", () => ({
  useAccount: () => ({}),
  useWalletClient: () => ({ data: undefined }),
  useSwitchChain: () => ({ switchChain: vi.fn() }),
}));
vi.mock("@/app/providers", () => ({ config: {} }));
vi.mock("@/components/ConnectButton", () => ({ ConnectButton: () => null }));
vi.mock("@/components/AddressBook", () => ({ AddressBookButton: () => null }));
vi.mock("@/lib/publicClient", () => ({ getPublicClient: () => ({}) }));
vi.mock("@/lib/nameResolution", () => ({
  resolveNameToAddress: vi.fn(),
  resolveAddressToName: vi.fn(),
  getNameAvatar: vi.fn(),
  isResolvableName: () => false,
}));
vi.mock("@/utils/addressLabels", () => ({
  fetchAddressLabels: async () => [],
}));
const client = {
  readContract: vi.fn(),
  call: vi.fn(),
  simulateContract: vi.fn(),
};
const address = "0x0000000000000000000000000000000000000001";
const clipboardWrite = vi.fn();
function show(
  func: JsonFragment,
  type: "read" | "write" = "read",
  initialCall?: { args: unknown[]; value: string }
) {
  return render(
    <ChakraProvider>
      <ReadWriteFunction
        client={client as any}
        func={func as any}
        index={0}
        type={type}
        address={address}
        chainId={1}
        initialCall={initialCall}
      />
    </ChakraProvider>
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: clipboardWrite },
  });
  HTMLElement.prototype.scrollTo = vi.fn();
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

it("builds standard ABI bytes and applies only to the originating contract field", async () => {
  show({
    type: "function",
    name: "run",
    stateMutability: "view",
    inputs: [
      { name: "payload", type: "bytes" },
      { name: "sibling", type: "bytes" },
      { name: "tag", type: "bytes4" },
    ],
  });
  const fields = screen.getAllByRole("textbox");
  fireEvent.change(fields[0], { target: { value: "0xaabb" } });
  fireEvent.change(fields[1], { target: { value: "0xccdd" } });
  expect(screen.getAllByRole("button", { name: /Build bytes/ })).toHaveLength(
    2
  );
  fireEvent.click(screen.getAllByRole("button", { name: /Build bytes/ })[0]);
  const dialog = within(await screen.findByRole("dialog"));
  fireEvent.change(dialog.getAllByRole("textbox")[1], {
    target: { value: "42" },
  });
  fireEvent.click(dialog.getByRole("button", { name: "Generate bytes" }));
  const expected = "0x" + "0".repeat(62) + "2a";
  expect(await dialog.findByText(expected)).toBeTruthy();
  expect((fields[0] as HTMLInputElement).value).toBe("0xaabb");
  fireEvent.click(dialog.getByRole("button", { name: "Set bytes value" }));
  await waitFor(() =>
    expect((fields[0] as HTMLInputElement).value).toBe(expected)
  );
  expect((fields[1] as HTMLInputElement).value).toBe("0xccdd");
  expect(client.readContract).not.toHaveBeenCalled();
  expect(client.simulateContract).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});

it("offers the builder on nested dynamic bytes and inner editor bytes, but not fixed bytes", async () => {
  const iface = new Interface([
    "function run((bytes payload,bytes4 tag)[] items) view",
  ]);
  show(JSON.parse(iface.fragments[0].format("json")), "read", {
    args: [
      [
        ["0x11", "0x12345678"],
        ["0x22", "0xabcdef01"],
      ],
    ],
    value: "0",
  });
  const fields = screen.getAllByRole("textbox");
  expect(screen.getAllByRole("button", { name: /Build bytes/ })).toHaveLength(
    2
  );
  fireEvent.click(screen.getAllByRole("button", { name: /Build bytes/ })[1]);
  const dialog = within(await screen.findByRole("dialog"));
  // Dynamic bytes inside the editor also offer a nested builder.
  const select = dialog.getByRole("combobox", { name: "Parameter 1 type" });
  fireEvent.keyDown(select, { key: "ArrowDown" });
  fireEvent.click(await dialog.findByRole("option", { name: "bytes" }));
  expect(dialog.getByRole("button", { name: "Build bytes" })).toBeTruthy();
  fireEvent.change(dialog.getAllByRole("textbox")[1], {
    target: { value: "0xabcd" },
  });
  fireEvent.click(dialog.getByRole("button", { name: "Generate bytes" }));
  const expected = new (await import("ethers")).AbiCoder().encode(
    ["bytes"],
    ["0xabcd"]
  );
  expect(await dialog.findByText(expected)).toBeTruthy();
  fireEvent.click(dialog.getByRole("button", { name: "Set bytes value" }));
  await waitFor(() =>
    expect((fields[2] as HTMLInputElement).value).toBe(expected)
  );
  expect((fields[0] as HTMLInputElement).value).toBe("0x11");
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  // Existing tuple propagation is debounced by 100ms before the parent form sees it.
  await act(() => new Promise((resolve) => setTimeout(resolve, 150)));
  fireEvent.click(screen.getByRole("button", { name: "Read options" }));
  fireEvent.click(await screen.findByRole("menuitem", { name: "Encode Calldata" }));
  fireEvent.click(screen.getByRole("button", { name: "Encode Calldata" }));
  expect(
    await screen.findByText(
      iface.encodeFunctionData("run", [
        [
          ["0x11", "0x12345678"],
          [expected, "0xabcdef01"],
        ],
      ])
    )
  ).toBeTruthy();
});

async function selectType(
  dialog: ReturnType<typeof within>,
  name: string,
  type: string
) {
  const select = dialog.getByRole("combobox", { name });
  fireEvent.keyDown(select, { key: "ArrowDown" });
  fireEvent.click(await dialog.findByRole("option", { name: type }));
}
async function openBuilder() {
  fireEvent.click(screen.getAllByRole("button", { name: /Build bytes/ })[0]);
  return within(await screen.findByRole("dialog"));
}
const outer = {
  type: "function",
  name: "run",
  stateMutability: "nonpayable",
  inputs: [
    { type: "bytes", name: "payload" },
    { type: "string", name: "note" },
  ],
} satisfies JsonFragment;

it("keeps raw hex and sibling drafts through cancel, error, Escape and a retained reopening", async () => {
  show(outer, "write");
  const fields = screen.getAllByRole("textbox");
  fireEvent.change(fields[0], { target: { value: "0xaabb" } });
  fireEvent.change(fields[1], { target: { value: "keep me" } });
  const firstNode = fields[0];
  let dialog = await openBuilder();
  expect(
    (
      dialog.getByRole("button", {
        name: "Set bytes value",
      }) as HTMLButtonElement
    ).disabled
  ).toBe(true);
  fireEvent.change(dialog.getAllByRole("textbox")[1], {
    target: { value: "not an integer" },
  });
  fireEvent.click(dialog.getByRole("button", { name: "Generate bytes" }));
  expect(await dialog.findByRole("alert")).toBeTruthy();
  expect(
    (
      dialog.getByRole("button", {
        name: "Set bytes value",
      }) as HTMLButtonElement
    ).disabled
  ).toBe(true);
  fireEvent.click(dialog.getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(screen.getAllByRole("textbox")[0] === firstNode).toBe(true);
  expect((fields[0] as HTMLInputElement).value).toBe("0xaabb");
  expect((fields[1] as HTMLInputElement).value).toBe("keep me");
  dialog = await openBuilder();
  fireEvent.change(dialog.getAllByRole("textbox")[1], {
    target: { value: "7" },
  });
  fireEvent.click(dialog.getByRole("button", { name: "Generate bytes" }));
  expect(
    await dialog.findByText(AbiCoder.defaultAbiCoder().encode(["uint256"], [7]))
  ).toBeTruthy();
  fireEvent.keyDown(dialog.getByRole("button", { name: "Cancel" }), {
    key: "Escape",
  });
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect((fields[0] as HTMLInputElement).value).toBe("0xaabb");
  fireEvent.click(screen.getByRole("button", { name: "Options" }));
  fireEvent.click(
    await screen.findByRole("menuitem", { name: "Encode Calldata" })
  );
  fireEvent.click(screen.getByRole("button", { name: "Encode Calldata" }));
  expect(
    await screen.findByText(
      new Interface([outer]).encodeFunctionData("run", ["0xaabb", "keep me"])
    )
  ).toBeTruthy();
  expect(client.call).not.toHaveBeenCalled();
  expect(client.simulateContract).not.toHaveBeenCalled();
});

it("invalidates generated output on edits, format changes and errors before allowing Apply", async () => {
  show(outer, "write");
  const dialog = await openBuilder();
  const field = dialog.getAllByRole("textbox")[1];
  fireEvent.change(field, { target: { value: "7" } });
  fireEvent.click(dialog.getByRole("button", { name: "Generate bytes" }));
  expect(
    (
      dialog.getByRole("button", {
        name: "Set bytes value",
      }) as HTMLButtonElement
    ).disabled
  ).toBe(false);
  fireEvent.change(field, { target: { value: "bad" } });
  expect(
    (
      dialog.getByRole("button", {
        name: "Set bytes value",
      }) as HTMLButtonElement
    ).disabled
  ).toBe(true);
  fireEvent.click(dialog.getByRole("button", { name: "Generate bytes" }));
  expect(await dialog.findByRole("alert")).toBeTruthy();
  await selectType(dialog, "Payload format", "Function calldata");
  expect(dialog.queryByRole("alert")).toBeNull();
  fireEvent.click(dialog.getByRole("button", { name: "Generate bytes" }));
  expect(await dialog.findByText(/Enter a function name/)).toBeTruthy();
});

it("builds exact ERC20 transfer function calldata with its selector, distinct from parameter-only bytes", async () => {
  show(outer, "write");
  const dialog = await openBuilder();
  await selectType(dialog, "Payload format", "Function calldata");
  fireEvent.change(dialog.getByRole("textbox", { name: "Function name" }), {
    target: { value: "transfer" },
  });
  await selectType(dialog, "Parameter 1 type", "address");
  fireEvent.change(dialog.getAllByRole("textbox")[2], {
    target: { value: "0x0000000000000000000000000000000000000001" },
  });
  fireEvent.click(dialog.getByRole("button", { name: "Add Parameter" }));
  fireEvent.change(dialog.getAllByRole("textbox")[4], {
    target: { value: "42" },
  });
  fireEvent.click(dialog.getByRole("button", { name: "Generate bytes" }));
  const args = "0".repeat(63) + "1" + "0".repeat(62) + "2a";
  const calldata = "0xa9059cbb" + args;
  expect(await dialog.findByText(calldata)).toBeTruthy();
  expect(calldata).toBe(
    new Interface(["function transfer(address,uint256)"]).encodeFunctionData(
      "transfer",
      [address, 42]
    )
  );
  await selectType(dialog, "Payload format", "ABI parameters");
  expect(
    (
      dialog.getByRole("button", {
        name: "Set bytes value",
      }) as HTMLButtonElement
    ).disabled
  ).toBe(true);
  fireEvent.click(dialog.getByRole("button", { name: "Generate bytes" }));
  expect(await dialog.findByText("0x" + args)).toBeTruthy();
  await selectType(dialog, "Payload format", "Function calldata");
  fireEvent.click(dialog.getByRole("button", { name: "Generate bytes" }));
  fireEvent.click(dialog.getByRole("button", { name: "Set bytes value" }));
  await waitFor(() =>
    expect((screen.getAllByRole("textbox")[0] as HTMLInputElement).value).toBe(
      calldata
    )
  );
  expect(fetch).not.toHaveBeenCalled();
  expect(client.simulateContract).not.toHaveBeenCalled();
});

it("builds tuple-array payloads with exact large integers and compares to the standalone encoder library and ethers", async () => {
  show(outer, "write");
  const dialog = await openBuilder();
  await selectType(dialog, "Parameter 1 type", "tuple[]");
  fireEvent.click(dialog.getByRole("button", { name: "Add Field" }));
  await selectType(dialog, "Parameter 1 field 2 type", "string");
  fireEvent.click(dialog.getByRole("button", { name: "+ Add" }));
  // Names in the schema precede the recursive tuple item's uint and string fields.
  const fields = dialog.getAllByRole("textbox");
  fireEvent.change(fields[3], { target: { value: "9007199254740993" } });
  fireEvent.change(fields[4], { target: { value: "hello" } });
  const expected = AbiCoder.defaultAbiCoder().encode(
    ["tuple(uint256,string)[]"],
    [[[9007199254740993n, "hello"]]]
  );
  const { encodeStandard } = await import("@/lib/encoder");
  expect(expected).toBe(
    encodeStandard(
      [
        {
          type: "tuple[]",
          components: [{ type: "uint256" }, { type: "string" }],
        },
      ],
      [[["9007199254740993", "hello"]]]
    )
  );
  await waitFor(() => {
    fireEvent.click(dialog.getByRole("button", { name: "Generate bytes" }));
    expect(dialog.getByText(expected)).toBeTruthy();
  });
  fireEvent.click(dialog.getByRole("button", { name: "Set bytes value" }));
  await waitFor(() =>
    expect((screen.getAllByRole("textbox")[0] as HTMLInputElement).value).toBe(
      expected
    )
  );
});

it("does not apply a stale tuple-array result while recursive edits propagate", async () => {
  show(outer, "write");
  const dialog = await openBuilder();
  await selectType(dialog, "Parameter 1 type", "tuple[]");
  fireEvent.click(dialog.getByRole("button", { name: "+ Add" }));
  const field = dialog.getAllByRole("textbox")[2];
  fireEvent.change(field, { target: { value: "7" } });
  await act(() => new Promise((resolve) => setTimeout(resolve, 150)));
  fireEvent.click(dialog.getByRole("button", { name: "Generate bytes" }));
  expect(
    (
      dialog.getByRole("button", {
        name: "Set bytes value",
      }) as HTMLButtonElement
    ).disabled
  ).toBe(false);
  fireEvent.change(field, { target: { value: "8" } });
  expect(
    (
      dialog.getByRole("button", {
        name: "Set bytes value",
      }) as HTMLButtonElement
    ).disabled
  ).toBe(true);
  fireEvent.click(dialog.getByRole("button", { name: "Generate bytes" }));
  expect(
    await dialog.findByText(
      AbiCoder.defaultAbiCoder().encode(["tuple(uint256)[]"], [[[8]]])
    )
  ).toBeTruthy();
});

it("preserves standalone manual standard/packed/function results with the shared parameter editor", async () => {
  render(
    <ChakraProvider>
      <CalldataEncoderPage />
    </ChakraProvider>
  );
  const page = within(document.body);
  expect(page.queryByRole("button", { name: /Build bytes/ })).toBeNull();
  await selectType(page, "Parameter 1 type", "uint8");
  fireEvent.change(
    page
      .getAllByRole("textbox")
      .find(
        (field) =>
          field.getAttribute("type") === "text" &&
          field.getAttribute("placeholder") === ""
      )!,
    { target: { value: "42" } }
  );
  fireEvent.click(page.getByRole("button", { name: "Encode" }));
  expect(
    await page.findByText(AbiCoder.defaultAbiCoder().encode(["uint8"], [42]))
  ).toBeTruthy();
  fireEvent.click(page.getByText("Packed (abi.encodePacked)"));
  expect(await page.findByText("0x2a")).toBeTruthy();
  fireEvent.change(page.getByPlaceholderText("e.g. transfer, approve, swap"), {
    target: { value: "set" },
  });
  expect(page.queryByText("Encoded Result")).toBeNull();
  fireEvent.click(page.getByRole("button", { name: "Encode" }));
  const expected = new Interface(["function set(uint8)"]).encodeFunctionData(
    "set",
    [42]
  );
  expect(await page.findByText(expected.slice(0, 10))).toBeTruthy();
  expect(page.getByText(expected.slice(10))).toBeTruthy();
  expect(fetch).not.toHaveBeenCalled();
});

it("keeps tuple schema name input focus and values while typing names", async () => {
  show(outer, "write");
  const dialog = await openBuilder();
  await selectType(dialog, "Parameter 1 type", "tuple");
  const names = dialog.getAllByPlaceholderText("name (optional)");
  const name = names[1];
  name.focus();
  fireEvent.change(name, { target: { value: "amount" } });
  expect(dialog.getAllByPlaceholderText("name (optional)")[1] === name).toBe(
    true
  );
  expect(document.activeElement === name).toBe(true);
});

it("uses exact raw integers in the builder, without hidden unit-conversion drafts", async () => {
  show(outer, "write");
  const dialog = await openBuilder();
  // Only the payload format and ABI type selectors: integer base units are explicit.
  expect(dialog.getAllByRole("combobox")).toHaveLength(2);
  fireEvent.change(dialog.getAllByRole("textbox")[1], {
    target: { value: "7" },
  });
  fireEvent.click(dialog.getByRole("button", { name: "Generate bytes" }));
  fireEvent.change(dialog.getAllByRole("textbox")[1], {
    target: { value: "invalid" },
  });
  expect(
    (
      dialog.getByRole("button", {
        name: "Set bytes value",
      }) as HTMLButtonElement
    ).disabled
  ).toBe(true);
  fireEvent.click(dialog.getByRole("button", { name: "Generate bytes" }));
  expect(await dialog.findByRole("alert")).toBeTruthy();
  expect(
    (
      dialog.getByRole("button", {
        name: "Set bytes value",
      }) as HTMLButtonElement
    ).disabled
  ).toBe(true);
});

it("removes a tuple-array schema column from every row without dropping rows", async () => {
  show(outer, "write");
  const dialog = await openBuilder();
  await selectType(dialog, "Parameter 1 type", "tuple[]");
  fireEvent.click(dialog.getByRole("button", { name: "Add Field" }));
  await selectType(dialog, "Parameter 1 field 2 type", "string");
  fireEvent.click(dialog.getByRole("button", { name: "+ Add" }));
  const fields = dialog.getAllByRole("textbox");
  fireEvent.change(fields[3], { target: { value: "7" } });
  fireEvent.change(fields[4], { target: { value: "keep row" } });
  fireEvent.click(dialog.getAllByRole("button", { name: "Remove field" })[0]);
  fireEvent.click(dialog.getByRole("button", { name: "Generate bytes" }));
  expect(
    await dialog.findByText(
      AbiCoder.defaultAbiCoder().encode(["tuple(string)[]"], [[["keep row"]]])
    )
  ).toBeTruthy();
  fireEvent.click(dialog.getByRole("button", { name: "Add Field" }));
  fireEvent.click(dialog.getByRole("button", { name: "Generate bytes" }));
  expect(await dialog.findByRole("alert")).toBeTruthy();
  const rowFields = dialog.getAllByRole("textbox");
  expect((rowFields[3] as HTMLInputElement).value).toBe("keep row");
  fireEvent.change(rowFields[4], { target: { value: "9" } });
  fireEvent.click(dialog.getByRole("button", { name: "Generate bytes" }));
  expect(
    await dialog.findByText(
      AbiCoder.defaultAbiCoder().encode(
        ["tuple(string,uint256)[]"],
        [[["keep row", 9]]]
      )
    )
  ).toBeTruthy();
});

it("rejects an empty integer rather than silently encoding zero; explicit zero and zero parameters work", async () => {
  show(outer, "write");
  const dialog = await openBuilder();
  fireEvent.click(dialog.getByRole("button", { name: "Generate bytes" }));
  expect(await dialog.findByRole("alert")).toBeTruthy();
  expect(
    (
      dialog.getByRole("button", {
        name: "Set bytes value",
      }) as HTMLButtonElement
    ).disabled
  ).toBe(true);
  fireEvent.change(dialog.getAllByRole("textbox")[1], {
    target: { value: "0" },
  });
  fireEvent.click(dialog.getByRole("button", { name: "Generate bytes" }));
  expect(await dialog.findByText("0x" + "0".repeat(64))).toBeTruthy();
  fireEvent.click(dialog.getByRole("button", { name: "Remove parameter" }));
  fireEvent.click(dialog.getByRole("button", { name: "Generate bytes" }));
  expect(await dialog.findByText("0x")).toBeTruthy();
});

it("rejects odd-length or non-hex inner bytes without changing the raw contract field", async () => {
  show(outer, "write", { args: ["0xcafe", "note"], value: "0" });
  const outerField = screen.getAllByRole("textbox")[0] as HTMLInputElement;
  const dialog = await openBuilder();
  await selectType(dialog, "Parameter 1 type", "bytes");
  for (const value of ["0x1", "no hex"]) {
    fireEvent.change(dialog.getAllByRole("textbox")[1], { target: { value } });
    fireEvent.click(dialog.getByRole("button", { name: "Generate bytes" }));
    expect(await dialog.findByRole("alert")).toBeTruthy();
    expect(
      (
        dialog.getByRole("button", {
          name: "Set bytes value",
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true);
    expect(outerField.value).toBe("0xcafe");
  }
});

it("keeps builder addresses local without background name or metadata lookups", async () => {
  show(outer, "write");
  const dialog = await openBuilder();
  await selectType(dialog, "Parameter 1 type", "address");
  fireEvent.change(dialog.getAllByRole("textbox")[1], {
    target: { value: address },
  });
  await act(() => new Promise((resolve) => setTimeout(resolve, 600)));
  const names = await import("@/lib/nameResolution");
  expect(names.resolveAddressToName).not.toHaveBeenCalled();
  expect(names.resolveNameToAddress).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});

it("retains builder format, names and parameter values after setting bytes and regenerates fresh output", async () => {
  show(outer, "write");
  let dialog = await openBuilder();
  await selectType(dialog, "Payload format", "Function calldata");
  fireEvent.change(dialog.getByRole("textbox", { name: "Function name" }), {
    target: { value: "innerCall" },
  });
  fireEvent.change(dialog.getByPlaceholderText("name (optional)"), {
    target: { value: "amount" },
  });
  fireEvent.change(dialog.getAllByRole("textbox")[2], {
    target: { value: "42" },
  });
  fireEvent.click(dialog.getByRole("button", { name: "Generate bytes" }));
  const iface = new Interface(["function innerCall(uint256 amount)"]);
  const first = iface.encodeFunctionData("innerCall", [42]);
  expect(await dialog.findByText(first)).toBeTruthy();
  fireEvent.click(dialog.getByRole("button", { name: "Set bytes value" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect((screen.getAllByRole("textbox")[0] as HTMLInputElement).value).toBe(
    first
  );
  dialog = await openBuilder();
  expect(
    (dialog.getByRole("textbox", { name: "Function name" }) as HTMLInputElement)
      .value
  ).toBe("innerCall");
  expect(
    (dialog.getByPlaceholderText("name (optional)") as HTMLInputElement).value
  ).toBe("amount");
  expect((dialog.getAllByRole("textbox")[2] as HTMLInputElement).value).toBe(
    "42"
  );
  fireEvent.change(dialog.getAllByRole("textbox")[2], {
    target: { value: "43" },
  });
  expect(
    (
      dialog.getByRole("button", {
        name: "Set bytes value",
      }) as HTMLButtonElement
    ).disabled
  ).toBe(true);
  fireEvent.click(dialog.getByRole("button", { name: "Generate bytes" }));
  const second = iface.encodeFunctionData("innerCall", [43]);
  expect(await dialog.findByText(second)).toBeTruthy();
  fireEvent.click(dialog.getByRole("button", { name: "Set bytes value" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect((screen.getAllByRole("textbox")[0] as HTMLInputElement).value).toBe(
    second
  );
});

it("builds nested bytes above the parent modal without applying the parent's draft to the contract", async () => {
  show(outer, "write");
  fireEvent.change(screen.getAllByRole("textbox")[0], {
    target: { value: "0xaabb" },
  });
  let parent = await openBuilder();
  await selectType(parent, "Parameter 1 type", "bytes");
  fireEvent.click(parent.getByRole("button", { name: "Build bytes" }));
  const childNode = await screen.findByRole("dialog", {
    name: "Build bytes for param_0",
  });
  const child = within(childNode);
  fireEvent.change(child.getAllByRole("textbox")[1], {
    target: { value: "42" },
  });
  fireEvent.click(child.getByRole("button", { name: "Generate bytes" }));
  const inner = AbiCoder.defaultAbiCoder().encode(["uint256"], [42]);
  expect(await child.findByText(inner)).toBeTruthy();
  fireEvent.click(child.getByRole("button", { name: "Set bytes value" }));
  await waitFor(() => expect(document.body.contains(childNode)).toBe(false));
  parent = within(
    screen.getByRole("dialog", { name: "Build bytes for payload" })
  );
  expect((parent.getAllByRole("textbox")[1] as HTMLInputElement).value).toBe(
    inner
  );
  // The outer contract input remains unchanged until its own builder is applied.
  expect(
    (screen.getAllByRole("textbox", { hidden: true })[0] as HTMLInputElement)
      .value
  ).toBe("0xaabb");
  fireEvent.click(parent.getByRole("button", { name: "Generate bytes" }));
  const encoded = AbiCoder.defaultAbiCoder().encode(["bytes"], [inner]);
  expect(await parent.findByText(encoded)).toBeTruthy();
  fireEvent.click(parent.getByRole("button", { name: "Set bytes value" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect((screen.getAllByRole("textbox")[0] as HTMLInputElement).value).toBe(
    encoded
  );
});

it("opens the bytes builder from the standalone encoder and preserves the generated bytes in encoding", async () => {
  render(
    <ChakraProvider>
      <CalldataEncoderPage />
    </ChakraProvider>
  );
  const page = within(document.body);
  await selectType(page, "Parameter 1 type", "bytes");
  fireEvent.click(page.getByRole("button", { name: "Build bytes" }));
  const dialog = within(await screen.findByRole("dialog"));
  fireEvent.change(dialog.getAllByRole("textbox")[1], {
    target: { value: "7" },
  });
  fireEvent.click(dialog.getByRole("button", { name: "Generate bytes" }));
  const inner = AbiCoder.defaultAbiCoder().encode(["uint256"], [7]);
  expect(await dialog.findByText(inner)).toBeTruthy();
  fireEvent.click(dialog.getByRole("button", { name: "Set bytes value" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  fireEvent.click(page.getByRole("button", { name: "Encode" }));
  expect(
    await page.findByText(AbiCoder.defaultAbiCoder().encode(["bytes"], [inner]))
  ).toBeTruthy();
});

it("focuses added array values in the encoder and its nested bytes builder", async () => {
  render(
    <ChakraProvider>
      <CalldataEncoderPage />
    </ChakraProvider>
  );
  const page = within(document.body);
  await selectType(page, "Parameter 1 type", "uint256[]");
  fireEvent.click(page.getByRole("button", { name: "+ Add" }));
  await waitFor(() =>
    expect(document.activeElement).toBe(
      page
        .getAllByRole("textbox")
        .find((field) => field.getAttribute("placeholder") === "")
    )
  );
  await selectType(page, "Parameter 1 type", "bytes");
  const parent = await openBuilder();
  await selectType(parent, "Parameter 1 type", "bytes");
  fireEvent.change(parent.getByPlaceholderText("name (optional)"), {
    target: { value: "innerPayload" },
  });
  fireEvent.click(parent.getByRole("button", { name: "Build bytes" }));
  const child = within(
    await screen.findByRole("dialog", { name: "Build bytes for innerPayload" })
  );
  await selectType(child, "Parameter 1 type", "uint256[]");
  fireEvent.click(child.getByRole("button", { name: "+ Add" }));
  await waitFor(() =>
    expect(document.activeElement).toBe(child.getAllByRole("textbox")[1])
  );
  fireEvent.change(child.getAllByRole("textbox")[1], {
    target: { value: "42" },
  });
  fireEvent.click(child.getByRole("button", { name: "+ Add" }));
  await waitFor(() =>
    expect(document.activeElement).toBe(child.getAllByRole("textbox")[2])
  );
  expect((child.getAllByRole("textbox")[1] as HTMLInputElement).value).toBe(
    "42"
  );
});
