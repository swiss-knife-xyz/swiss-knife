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
import type { Arg, DecodeRecursiveResult } from "@/types";
import {
  createDecoderShareLink,
  parseDecoderShareFragment,
} from "@/lib/decoderShare";
import { EditableCalldata } from "./EditableCalldata";

const names = vi.hoisted(() => ({ resolve: vi.fn() }));
vi.mock("wagmi", () => ({ useAccount: () => ({}) }));
vi.mock("@/app/providers", () => ({ config: {} }));
vi.mock("@/components/AddressBook", () => ({ AddressBookButton: () => null }));
vi.mock("@/lib/publicClient", () => ({ getPublicClient: () => ({}) }));
vi.mock("@/lib/nameResolution", () => ({
  resolveNameToAddress: names.resolve,
  resolveAddressToName: vi.fn().mockResolvedValue(null),
  getNameAvatar: vi.fn().mockResolvedValue(null),
  isResolvableName: (value: string) => value.endsWith(".eth"),
}));
vi.mock("@/utils/addressLabels", () => ({
  fetchAddressLabels: async () => [],
}));
vi.mock("@/components/decodedParams/ParamValue", () => ({
  ParamValue: ({ arg }: { arg: Arg }) => <span>{String(arg.rawValue)}</span>,
}));
vi.mock("@/components/CopyToClipboard", () => ({
  CopyToClipboard: ({ textToCopy, labelText }: any) => (
    <button onClick={() => navigator.clipboard.writeText(textToCopy)}>
      {labelText ?? "Copy"}
    </button>
  ),
}));
const copy = vi.fn();
const scroll = vi.fn();
beforeEach(() => {
  HTMLElement.prototype.scrollIntoView = scroll;
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
  }));
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: copy },
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function fixture() {
  const iface = new Interface([
    "function run(uint256[] values,uint256[2] fixedValues,bytes payload)",
  ]);
  const child = new Interface(["function set(uint256 amount)"]);
  const payload = child.encodeFunctionData("set", [7]);
  const original = iface.encodeFunctionData("run", [[1, 2], [3, 4], payload]);
  const arg = (type: string, value: unknown): Arg => ({
    name: "",
    type,
    baseType: type,
    rawValue: value,
    value: String(value),
  });
  const result: NonNullable<DecodeRecursiveResult> = {
    functionName: "run",
    signature: "run(uint256[],uint256[2],bytes)",
    rawArgs: [[1n, 2n], [3n, 4n], payload],
    args: [
      {
        ...arg("uint256[]", [1, 2]),
        name: "values",
        baseType: "array",
        value: [arg("uint256", 1), arg("uint256", 2)],
      },
      {
        ...arg("uint256[2]", [3, 4]),
        name: "fixedValues",
        baseType: "array",
        value: [arg("uint256", 3), arg("uint256", 4)],
      },
      {
        ...arg("bytes", payload),
        name: "payload",
        value: {
          decoded: {
            functionName: "set",
            signature: "set(uint256)",
            rawArgs: [7n],
            args: [{ ...arg("uint256", 7), name: "amount" }],
          },
        },
      },
    ],
  };
  return { iface, child, result, original };
}
function show(f = fixture()) {
  const getDecodeHref = vi.fn(
    (calldata: string, definitions: string[]) =>
      createDecoderShareLink(
        "https://eth.sh/calldata/decoder",
        calldata,
        f.result,
        definitions
      )!
  );
  const props = {
    result: f.result,
    calldata: f.original,
    functionName: "run",
    getDecodeHref,
  };
  const ui = render(
    <ChakraProvider>
      <EditableCalldata {...props} />
    </ChakraProvider>
  );
  fireEvent.click(screen.getByRole("button", { name: "Edit calldata" }));
  return { ...f, ...ui, getDecodeHref, props };
}
const encode = () =>
  fireEvent.click(screen.getByRole("button", { name: "Encode new calldata" }));
const output = () =>
  (
    screen.getByRole("textbox", {
      name: "Encoded calldata",
    }) as HTMLTextAreaElement
  ).value;

it("edits nested calldata in the shared tree, copies and decodes with definitions", () => {
  const f = show();
  fireEvent.change(screen.getByRole("textbox", { name: "args.2.0 amount" }), {
    target: { value: "42" },
  });
  encode();
  const encoded = output();
  const payload = f.iface.decodeFunctionData("run", encoded)[2];
  expect(f.child.decodeFunctionData("set", payload)[0]).toBe(42n);
  fireEvent.click(screen.getByRole("button", { name: "Copy calldata" }));
  expect(copy).toHaveBeenCalledWith(encoded);
  const link = screen.getByRole("link", { name: "Decode result" });
  expect(link.getAttribute("target")).toBe("_blank");
  expect(link.getAttribute("rel")).toContain("noopener");
  const url = new URL(link.getAttribute("href")!);
  expect(url.searchParams.get("calldata")).toBe(encoded);
  expect(parseDecoderShareFragment(url.hash)).toEqual(
    expect.arrayContaining([
      expect.stringContaining("function run"),
      expect.stringContaining("function set"),
    ])
  );
  fireEvent.change(screen.getByRole("textbox", { name: "args.2.0 amount" }), {
    target: { value: "43" },
  });
  expect(
    screen.queryByRole("textbox", { name: "Encoded calldata" })
  ).toBeNull();
});

it("adds/removes dynamic array entries and keeps fixed arrays fixed", async () => {
  const f = show();
  expect(
    screen.queryByRole("button", { name: "Add item to args.1" })
  ).toBeNull();
  expect(screen.queryByRole("button", { name: "Remove args.1.0" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "values" }));
  fireEvent.click(screen.getByRole("button", { name: "Add item to args.0" }));
  await waitFor(() => expect(scroll).toHaveBeenCalled());
  const added = screen.getByRole("textbox", { name: "args.0.2 uint256" });
  expect(scroll.mock.contexts.at(-1)).toBe(
    added.closest("[data-calldata-path]")
  );
  expect(added.closest("[hidden]")).toBeNull();
  expect(scroll).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  fireEvent.change(screen.getByRole("textbox", { name: "args.0.2 uint256" }), {
    target: { value: "99" },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "args.0.0 uint256" }), {
    target: { value: "invalid" },
  });
  expect(
    (
      screen.getByRole("button", {
        name: "Encode new calldata",
      }) as HTMLButtonElement
    ).disabled
  ).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Remove args.0.0" }));
  encode();
  expect([...f.iface.decodeFunctionData("run", output())[0]]).toEqual([
    2n,
    99n,
  ]);
});

it("shows validation, resets drafts and cancels without changing original", () => {
  const f = show();
  fireEvent.change(screen.getByRole("textbox", { name: "args.2.0 amount" }), {
    target: { value: "" },
  });
  encode();
  expect(
    screen
      .getAllByRole("alert")
      .some((el) => el.textContent?.includes("explicit integer"))
  ).toBe(true);
  expect(
    screen.queryByRole("textbox", { name: "Encoded calldata" })
  ).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Reset changes" }));
  expect(
    (
      screen.getByRole("textbox", {
        name: "args.2.0 amount",
      }) as HTMLInputElement
    ).value
  ).toBe("7");
  encode();
  expect(output()).toBe(f.original);
  fireEvent.click(screen.getByRole("button", { name: "Cancel editing" }));
  expect(screen.getByRole("button", { name: "Edit calldata" })).toBeTruthy();
  expect(f.result.rawArgs[0]).toEqual([1n, 2n]);
});

it("replaces raw bytes and discards the nested decoded draft", () => {
  const f = show();
  fireEvent.click(
    screen.getByRole("button", { name: "Toggle raw bytes for args.2" })
  );
  fireEvent.change(screen.getByRole("textbox", { name: "args.2 payload" }), {
    target: { value: "0xabcdef" },
  });
  expect(screen.queryByRole("textbox", { name: "args.2.0 amount" })).toBeNull();
  encode();
  expect(f.iface.decodeFunctionData("run", output())[2]).toBe("0xabcdef");
});

it("resets the editing session when a new decode arrives", () => {
  const f = show();
  fireEvent.change(screen.getByRole("textbox", { name: "args.2.0 amount" }), {
    target: { value: "123" },
  });
  f.rerender(
    <ChakraProvider>
      <EditableCalldata {...f.props} result={{ ...f.result }} />
    </ChakraProvider>
  );
  expect(screen.getByRole("button", { name: "Edit calldata" })).toBeTruthy();
  expect(
    screen.queryByRole("button", { name: "Encode new calldata" })
  ).toBeNull();
});

it("uses the shared unit selector for nested integers and blocks invalid conversion drafts", async () => {
  const f = show();
  const amount = screen.getByRole("textbox", { name: "args.2.0 amount" });
  const field = within(amount.closest("[data-edit-field]") as HTMLElement);
  fireEvent.keyDown(field.getByRole("combobox"), { key: "ArrowDown" });
  fireEvent.click(screen.getByRole("option", { name: "ETH" }));
  fireEvent.change(amount, { target: { value: "1.5" } });
  encode();
  const encodedAmount = () =>
    f.child.decodeFunctionData(
      "set",
      f.iface.decodeFunctionData("run", output())[2]
    )[0];
  expect(encodedAmount()).toBe(1500000000000000000n);
  fireEvent.change(amount, { target: { value: "invalid" } });
  expect(
    (
      screen.getByRole("button", {
        name: "Encode new calldata",
      }) as HTMLButtonElement
    ).disabled
  ).toBe(true);
  expect(
    screen.queryByRole("textbox", { name: "Encoded calldata" })
  ).toBeNull();
  fireEvent.change(amount, { target: { value: "1.25" } });
  expect(
    (
      screen.getByRole("button", {
        name: "Encode new calldata",
      }) as HTMLButtonElement
    ).disabled
  ).toBe(false);
  encode();
  expect(encodedAmount()).toBe(1250000000000000000n);
});

it("resolves names using the shared address widget before encoding", async () => {
  const address = "0x0000000000000000000000000000000000001234";
  const iface = new Interface([
    "function configure(address recipient,uint256 amount)",
  ]);
  const original = iface.encodeFunctionData("configure", [address, 7]);
  const result: NonNullable<DecodeRecursiveResult> = {
    functionName: "configure",
    signature: "configure(address,uint256)",
    rawArgs: [address, 7n],
    args: [
      {
        name: "recipient",
        type: "address",
        baseType: "address",
        rawValue: address,
        value: address,
      },
      {
        name: "amount",
        type: "uint256",
        baseType: "uint256",
        rawValue: 7n,
        value: "7",
      },
    ],
  };
  let finishResolution!: (value: string) => void;
  names.resolve.mockReturnValue(
    new Promise<string>((resolve) => {
      finishResolution = resolve;
    })
  );
  show({ iface, child: iface, result, original });
  fireEvent.change(screen.getByRole("textbox", { name: "args.0 recipient" }), {
    target: { value: "alice.eth" },
  });
  await waitFor(() => expect(names.resolve).toHaveBeenCalledWith("alice.eth"));
  await waitFor(() => {
    expect(
      (
        screen.getByRole("button", {
          name: "Encode new calldata",
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true);
  });
  await act(async () => finishResolution(address));
  await waitFor(() =>
    expect(
      (
        screen.getByRole("textbox", {
          name: "args.0 recipient",
        }) as HTMLInputElement
      ).value
    ).toBe(address)
  );
  encode();
  expect(iface.decodeFunctionData("configure", output())[0].toLowerCase()).toBe(
    address
  );
});

it("reveals a newly added tuple row with reduced-motion scrolling", async () => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("prefers-reduced-motion"),
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
  }));
  const iface = new Interface(["function run((uint256,address)[] items)"]);
  const original = iface.encodeFunctionData("run", [[]]);
  const result: NonNullable<DecodeRecursiveResult> = {
    functionName: "run",
    signature: "run((uint256,address)[])",
    rawArgs: [[]],
    args: [
      {
        name: "items",
        type: "tuple(uint256,address)[]",
        baseType: "array",
        rawValue: [],
        value: [],
      },
    ],
  };
  const ui = show({ iface, child: iface, original, result });
  fireEvent.click(screen.getByRole("button", { name: "items" }));
  fireEvent.click(screen.getByRole("button", { name: "Add item to args.0" }));
  await waitFor(() => expect(scroll).toHaveBeenCalled());
  const row = ui.container.querySelector('[data-calldata-path="args.0.0"]');
  expect(scroll.mock.contexts.at(-1)).toBe(row);
  expect(row?.closest("[hidden]")).toBeNull();
  expect(
    row?.contains(screen.getByRole("textbox", { name: "args.0.0.0 uint256" }))
  ).toBe(true);
  expect(scroll).toHaveBeenCalledWith({ behavior: "auto", block: "start" });
});


it("preserves edited nested bytes across raw/decoded toggles and clears every stale result", () => {
  const f = show();
  const amount = () => screen.getByRole("textbox", { name: "args.2.0 amount" });
  fireEvent.change(amount(), { target: { value: "123456789012345678901234567890" } });
  encode();
  const expected = f.iface.encodeFunctionData("run", [
    [1, 2], [3, 4], f.child.encodeFunctionData("set", [123456789012345678901234567890n]),
  ]);
  expect(output()).toBe(expected);
  const toggle = () => fireEvent.click(screen.getByRole("button", { name: "Toggle raw bytes for args.2" }));
  toggle();
  expect(screen.queryByRole("textbox", { name: "Encoded calldata" })).toBeNull();
  expect((screen.getByRole("textbox", { name: "args.2 payload" }) as HTMLInputElement).value)
    .toBe(f.child.encodeFunctionData("set", [123456789012345678901234567890n]));
  encode();
  expect(output()).toBe(expected);
  toggle();
  encode();
  expect(output()).toBe(expected);
  fireEvent.change(amount(), { target: { value: "-1" } });
  expect(screen.queryByRole("textbox", { name: "Encoded calldata" })).toBeNull();
  encode();
  expect(screen.queryByRole("textbox", { name: "Encoded calldata" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Reset changes" }));
  encode();
  expect(output()).toBe(f.original);
});
