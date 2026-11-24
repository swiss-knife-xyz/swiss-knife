import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
import { Interface, type JsonFragment } from "ethers";
import { useInvalidInputReveal } from "./useInvalidInputReveal";
import { CompactParameterInputs } from "./ParameterInputStyle";
import { renderInputFields } from "./Renderer";
import { ReadWriteFunction } from "./ReadWriteFunction";

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
  initialCall?: { args: unknown[]; value: string },
  isAbiDecoded = false
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
        isAbiDecoded={isAbiDecoded}
      />
    </ChakraProvider>
  );
}
async function encodeCurrent() {
  if (!screen.queryByRole("button", { name: "Encode Calldata" })) {
    fireEvent.click(screen.getByRole("button", { name: "Read options" }));
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Encode Calldata" })
    );
  }
  fireEvent.click(screen.getByRole("button", { name: "Encode Calldata" }));
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

it("real bytes4 widget receives a preset, permits manual replacement and encodes exactly", async () => {
  const func: JsonFragment = {
    type: "function",
    name: "supportsInterface",
    stateMutability: "view",
    inputs: [{ type: "bytes4", name: "interfaceId" }],
    outputs: [{ type: "bool" }],
  };
  show(func);
  const preset = await screen.findByRole("combobox", { name: "interfaceId" });
  fireEvent.focus(preset);
  fireEvent.click(
    await screen.findByRole("option", { name: /ERC-1155.*0xd9b67a26/ })
  );
  const input = preset as HTMLInputElement;
  expect(input.value).toBe("0xd9b67a26");
  fireEvent.blur(input);
  expect(getComputedStyle(input).opacity).toBe("1");
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: "0xffffffff" } });
  fireEvent.blur(input);
  expect(input.value).toBe("0xffffffff");
  fireEvent.focus(input);
  expect(
    await screen.findByRole("option", { name: /ERC-721.*0x80ac58cd/ })
  ).toBeTruthy();
  fireEvent.blur(input);
  expect(
    screen.queryByRole("link", { name: /Interface specification/ })
  ).toBeNull();
  await encodeCurrent();
  expect(
    await screen.findByText(
      new Interface([func]).encodeFunctionData("supportsInterface", [
        "0xffffffff",
      ])
    )
  ).toBeTruthy();
  expect(client.readContract).not.toHaveBeenCalled();
  expect(client.call).not.toHaveBeenCalled();
  expect(client.simulateContract).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});

it("real tuple text fields propagate into encoding in ABI order", async () => {
  const func: JsonFragment = {
    type: "function",
    name: "configure",
    stateMutability: "nonpayable",
    inputs: [
      {
        type: "tuple",
        name: "settings",
        components: [
          { type: "string", name: "name" },
          { type: "bytes4", name: "tag" },
        ],
      },
    ],
  };
  show(func, "write");
  fireEvent.click(screen.getByRole("button", { name: "Options" }));
  fireEvent.click(
    await screen.findByRole("menuitem", { name: "Encode Calldata" })
  );
  const fields = screen.getAllByRole("textbox");
  fireEvent.change(fields[0], { target: { value: "hello" } });
  fireEvent.change(fields[1], { target: { value: "0x12345678" } });
  const expected = new Interface([func]).encodeFunctionData("configure", [
    ["hello", "0x12345678"],
  ]);
  // Recursive tuple widgets debounce their propagation by 100ms.
  await waitFor(async () => {
    await encodeCurrent();
    expect(
      await screen.findByText(expected, {}, { timeout: 150 })
    ).toBeTruthy();
  });
  expect(client.call).not.toHaveBeenCalled();
  expect(client.simulateContract).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});

it("keeps a single encoding action when the existing write dropdown selects Encode Calldata", async () => {
  show(
    {
      type: "function",
      name: "ping",
      stateMutability: "nonpayable",
      inputs: [],
    },
    "write"
  );
  expect(screen.queryByRole("button", { name: "Encode Calldata" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Options" }));
  fireEvent.click(
    await screen.findByRole("menuitem", { name: "Encode Calldata" })
  );
  await waitFor(() =>
    expect(
      screen.getAllByRole("button", { name: "Encode Calldata" })
    ).toHaveLength(1)
  );
  await encodeCurrent();
  expect(await screen.findByRole("dialog")).toBeTruthy();
  expect(client.call).not.toHaveBeenCalled();
  expect(client.simulateContract).not.toHaveBeenCalled();
});

it("prefills real nested tuple/array/bool/fixed-array widgets and re-encodes without a wallet call", async () => {
  const iface = new Interface([
    "function configure((bool enabled,uint256[2] limits,string note)[] settings,bytes data) payable",
  ]);
  const func = JSON.parse(iface.fragments[0].format("json"));
  show(func, "write", {
    args: [
      [
        ["true", ["0", "9007199254740993"], "hello"],
        ["false", ["1", "2"], ""],
      ],
      "0x",
    ],
    value: "23",
  });
  expect(screen.getByDisplayValue("9007199254740993")).toBeTruthy();
  expect(screen.getByDisplayValue("hello")).toBeTruthy();
  const expected = iface.encodeFunctionData("configure", [
    [
      [true, [0n, 9007199254740993n], "hello"],
      [false, [1n, 2n], ""],
    ],
    "0x",
  ]);
  fireEvent.click(screen.getByRole("button", { name: "Options" }));
  fireEvent.click(
    await screen.findByRole("menuitem", { name: "Encode Calldata" })
  );
  await encodeCurrent();
  expect(await screen.findByText(expected)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  fireEvent.click(
    screen.getByRole("button", { name: "Share configure function call" })
  );
  fireEvent.click(
    await screen.findByRole("button", { name: "Copy function call link" })
  );
  const shared = new URL(clipboardWrite.mock.lastCall![0]);
  expect(new URLSearchParams(shared.hash.slice(1)).get("value")).toBe("23");
  expect(client.call).not.toHaveBeenCalled();
  expect(client.simulateContract).not.toHaveBeenCalled();
});

it("zero-input write encodes selector-only without connection, signing or reads", async () => {
  const func: JsonFragment = {
    type: "function",
    name: "ping",
    stateMutability: "nonpayable",
    inputs: [],
  };
  show(func, "write");
  fireEvent.click(screen.getByRole("button", { name: "Options" }));
  fireEvent.click(
    await screen.findByRole("menuitem", { name: "Encode Calldata" })
  );
  await encodeCurrent();
  expect(
    within(
      await screen.findByRole("dialog", { name: "Encoded Calldata" })
    ).getByText(new Interface([func]).encodeFunctionData("ping"))
  ).toBeTruthy();
  expect(client.readContract).not.toHaveBeenCalled();
  expect(client.call).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});

it("opens interface suggestions on focus and selects with Enter without reading", async () => {
  show({
    type: "function",
    name: "supportsInterface",
    stateMutability: "view",
    inputs: [{ type: "bytes4", name: "interfaceId" }],
    outputs: [{ type: "bool" }],
  });
  const input = await screen.findByRole("combobox", { name: "interfaceId" });
  fireEvent.focus(input);
  await screen.findByRole("option", { name: /ERC-721.*0x80ac58cd/ });
  fireEvent.keyDown(input, { key: "ArrowDown", code: "ArrowDown" });
  fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
  expect((input as HTMLInputElement).value).toBe("0x80ac58cd");
  expect(client.readContract).not.toHaveBeenCalled();
  expect(client.call).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "[zero]" }));
  expect((input as HTMLInputElement).value).toBe("0x00000000");
});

it("allows replacing a known hex value directly and rejects invalid hex on encoding", async () => {
  show({
    type: "function",
    name: "supportsInterface",
    stateMutability: "view",
    inputs: [{ type: "bytes4", name: "interfaceId" }],
    outputs: [{ type: "bool" }],
  });
  const input = await screen.findByRole("combobox", { name: "interfaceId" });
  fireEvent.focus(input);
  fireEvent.click(
    await screen.findByRole("option", { name: /ERC-721.*0x80ac58cd/ })
  );
  expect((input as HTMLInputElement).value).toBe("0x80ac58cd");
  fireEvent.focus(input);
  // Focusing a selected preset still offers all other known interfaces.
  expect(
    await screen.findByRole("option", { name: /ERC-1155.*0xd9b67a26/ })
  ).toBeTruthy();
  fireEvent.change(input, { target: { value: "not hex" } });
  fireEvent.blur(input);
  await encodeCurrent();
  await screen.findByRole("alert");
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(client.readContract).not.toHaveBeenCalled();
});

it.each([
  { name: "other", type: "bytes4" },
  { name: "supportsInterface", type: "bytes32" },
])(
  "keeps ordinary bytes fields unchanged for $name($type)",
  async ({ name, type }) => {
    show({
      type: "function",
      name,
      stateMutability: "view",
      inputs: [{ type, name: "interfaceId" }],
      outputs: [{ type: "bool" }],
    });
    expect(screen.queryByRole("combobox", { name: "interfaceId" })).toBeNull();
    expect(screen.getByRole("textbox")).toBeTruthy();
  }
);

it("keeps Read and reload mounted and disabled while each request is pending", async () => {
  let finish!: (value: bigint) => void;
  client.readContract.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  show({
    type: "function",
    name: "getValue",
    stateMutability: "view",
    inputs: [{ type: "uint256", name: "value" }],
    outputs: [{ type: "uint256" }],
  });
  const input = screen.getAllByRole("textbox")[0];
  fireEvent.change(input, { target: { value: "1" } });
  const button = screen.getByRole("button", {
    name: "Read",
  }) as HTMLButtonElement;
  fireEvent.click(button);
  expect(button.isConnected).toBe(true);
  expect(button.disabled).toBe(true);
  expect(button.querySelector(".chakra-spinner")).toBeTruthy();
  await act(async () => finish(42n));
  await waitFor(() => expect(button.disabled).toBe(false));
  expect(button.textContent).toBe("Read");
  fireEvent.change(input, { target: { value: "2" } });
  fireEvent.click(button);
  expect(button.isConnected).toBe(true);
  expect(button.disabled).toBe(true);
  expect(button.querySelector(".chakra-spinner")).toBeTruthy();
  fireEvent.click(button);
  expect(client.readContract).toHaveBeenCalledTimes(2);
  await act(async () => finish(43n));
  await waitFor(() => expect(button.disabled).toBe(false));
});

it("does not auto-read a selector-only call restored into a zero-input form", async () => {
  vi.useFakeTimers();
  try {
    show(
      {
        type: "function",
        name: "ping",
        stateMutability: "view",
        inputs: [],
        outputs: [],
      },
      "read",
      { args: [], value: "0" }
    );
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(client.readContract).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Read" }));
    expect(client.readContract).toHaveBeenCalledOnce();
  } finally {
    vi.useRealTimers();
  }
});

it("focuses the newly added array input without stealing focus on later edits", async () => {
  show({
    type: "function",
    name: "items",
    stateMutability: "view",
    inputs: [{ name: "values", type: "string[]" }],
  });
  const add = screen.getByRole("button", { name: "+ Add" });
  fireEvent.click(add);
  await waitFor(() =>
    expect(document.activeElement).toBe(screen.getByRole("textbox"))
  );
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "first" } });
  fireEvent.click(add);
  await waitFor(() =>
    expect(document.activeElement).toBe(screen.getAllByRole("textbox")[1])
  );
  expect((screen.getAllByRole("textbox")[0] as HTMLInputElement).value).toBe(
    "first"
  );
  screen.getAllByRole("textbox")[0].focus();
  fireEvent.change(screen.getAllByRole("textbox")[0], {
    target: { value: "edited first" },
  });
  expect(document.activeElement).toBe(screen.getAllByRole("textbox")[0]);
});

it("focuses the first tuple field when adding an array row and keeps rapid additions distinct", async () => {
  vi.spyOn(Date, "now").mockReturnValue(123);
  show({
    type: "function",
    name: "rows",
    stateMutability: "view",
    inputs: [
      {
        name: "rows",
        type: "tuple[]",
        components: [
          { name: "name", type: "string" },
          { name: "count", type: "uint256" },
        ],
      },
    ],
  });
  const add = screen.getByRole("button", { name: "+ Add" });
  fireEvent.click(add);
  await waitFor(() =>
    expect(document.activeElement).toBe(screen.getAllByRole("textbox")[0])
  );
  fireEvent.click(add);
  await waitFor(() =>
    expect(document.activeElement).toBe(screen.getAllByRole("textbox")[2])
  );
  expect(screen.getAllByRole("textbox")).toHaveLength(4);
});

it("opens the shared Sourcify modal beside an unresolved selector warning with that selector prefilled", async () => {
  show(
    {
      type: "function",
      name: "selector: 0x40c10f19",
      selector: "0x40c10f19",
      inputInference: { source: "unknown", message: "Unknown input types" },
      stateMutability: "nonpayable",
      inputs: [],
      outputs: [],
    } as any,
    "write",
    undefined,
    true
  );
  const action = await screen.findByRole("button", {
    name: "Submit function signature to Sourcify",
  });
  expect(
    screen.getByLabelText("Inferred signature, not verified")
  ).toBeTruthy();
  fireEvent.click(action);
  await screen.findByRole("dialog", { name: "Add a missing signature" });
  expect(
    (screen.getByLabelText("4-byte selector") as HTMLInputElement).value
  ).toBe("0x40c10f19");
  expect(
    (screen.getByLabelText("Canonical function signature") as HTMLInputElement)
      .value
  ).toBe("");
});

it.each(["imported", "duplicated"])(
  "updates the current unresolved function immediately after a %s Sourcify response",
  async (status) => {
    const selector = "0x40c10f19";
    const signature = "mint(address,uint256)";
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ ok: true, result: { function: { [selector]: [] } } })
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            result: {
              function: {
                imported:
                  status === "imported" ? { [signature]: selector } : {},
                duplicated:
                  status === "duplicated" ? { [signature]: selector } : {},
                invalid: [],
              },
            },
          })
        )
      );
    vi.stubGlobal("fetch", fetcher);
    show(
      {
        type: "function",
        name: `selector: ${selector}`,
        selector,
        inputInference: { source: "unknown", message: "Unknown input types" },
        stateMutability: "nonpayable",
        inputs: [],
        outputs: [],
      } as any,
      "write",
      undefined,
      true
    );
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Submit function signature to Sourcify",
      })
    );
    fireEvent.change(screen.getByLabelText("Canonical function signature"), {
      target: { value: "mint(address to, uint256 amount)" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit to Sourcify" }));
    await screen.findByText("mint", { exact: true });
    expect(screen.getByText("arg0", { exact: true })).toBeTruthy();
    expect(screen.getByText("arg1", { exact: true })).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(
      screen.getByLabelText("Inferred signature, not verified")
    ).toBeTruthy();
    expect(fetcher).toHaveBeenCalledTimes(2);
  }
);

it("does not rename the function when a Sourcify submission is not confirmed", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Offline")));
  show(
    {
      type: "function",
      name: "selector: 0x40c10f19",
      selector: "0x40c10f19",
      inputInference: { source: "unknown", message: "Unknown input types" },
      stateMutability: "nonpayable",
      inputs: [],
      outputs: [],
    } as any,
    "write",
    undefined,
    true
  );
  fireEvent.click(
    await screen.findByRole("button", {
      name: "Submit function signature to Sourcify",
    })
  );
  fireEvent.change(screen.getByLabelText("Canonical function signature"), {
    target: { value: "mint(address,uint256)" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Submit to Sourcify" }));
  await screen.findByText(/Could not check Sourcify/);
  expect(
    screen.getByRole("button", {
      name: "Toggle selector: 0x40c10f19",
      hidden: true,
    })
  ).toBeTruthy();
  expect(screen.queryByText("arg0", { exact: true })).toBeNull();
});

it.each(["uint256", "int256"])(
  "preserves the %s output unit across latest, block, time and subsequent reads",
  async (outputType) => {
    client.readContract
      .mockResolvedValueOnce(2000000n)
      .mockResolvedValueOnce(3000000n)
      .mockResolvedValueOnce(4000000n)
      .mockResolvedValueOnce(5000000n);
    const getBlock = vi.fn(async ({ blockTag, blockNumber }: any) => {
      const number = blockTag === "latest" ? 1000n : blockNumber;
      return { number, timestamp: 1700000000n + number * 12n };
    });
    Object.assign(client, { getBlock });
    show(
      {
        type: "function",
        name: "supply",
        stateMutability: "view",
        inputs: [],
        outputs: [{ type: outputType }],
      },
      "read",
      { args: [], value: "0" }
    );
    fireEvent.click(screen.getByRole("button", { name: "Read" }));
    await screen.findByDisplayValue("2000000");
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "ArrowDown" });
    fireEvent.click(await screen.findByRole("option", { name: "10^6" }));
    await screen.findByDisplayValue("2");
    fireEvent.click(screen.getByRole("button", { name: "Read options" }));
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Query at Block" })
    );
    const blockSettings = await screen.findByRole("dialog");
    expect(within(blockSettings).getByText("Enter Block Number")).toBeTruthy();
    expect(
      within(blockSettings).queryByText("Block number", { selector: "label" })
    ).toBeNull();
    expect(blockSettings.textContent).not.toContain("Uses your configured");
    fireEvent.change(within(blockSettings).getByLabelText("Block number"), {
      target: { value: "100" },
    });
    fireEvent.click(within(blockSettings).getByRole("button", { name: "Set" }));
    fireEvent.click(screen.getByRole("button", { name: "Query at Block" }));
    await screen.findByDisplayValue("3");
    expect(screen.getByText("10^6", { exact: true })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Read options" }));
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Query at Time" })
    );
    const timeSettings = await screen.findByRole("dialog");
    fireEvent.change(
      await within(timeSettings).findByRole("combobox", { name: "Year" }),
      { target: { value: "2023" } }
    );
    fireEvent.change(
      within(timeSettings).getByRole("combobox", { name: "Month" }),
      { target: { value: "10" } }
    );
    fireEvent.click(
      await within(timeSettings).findByRole("button", {
        name: "14 November 2023",
      })
    );
    for (const [label, value] of [
      ["Hours (UTC)", "10"],
      ["Minutes", "33"],
      ["Seconds", "25"],
    ]) {
      fireEvent.change(within(timeSettings).getByLabelText(label), {
        target: { value },
      });
    }
    fireEvent.change(
      within(timeSettings).getByRole("combobox", { name: "AM/PM" }),
      { target: { value: "PM" } }
    );
    fireEvent.click(within(timeSettings).getByRole("button", { name: "Set" }));
    fireEvent.click(screen.getByRole("button", { name: "Query at Time" }));
    await screen.findByDisplayValue("4");
    expect(screen.getByText("10^6", { exact: true })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Read options" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Read" }));
    expect(screen.queryByRole("textbox")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Read" }));
    await screen.findByDisplayValue("5");
    expect(screen.getByText("10^6", { exact: true })).toBeTruthy();
  }
);

it.each([
  {
    label: "uint32",
    output: { type: "uint32" },
    result: 1234567n,
    raw: "1234567",
  },
  {
    label: "uint256",
    output: { type: "uint256" },
    result: (1n << 256n) - 1n,
    raw: ((1n << 256n) - 1n).toString(),
  },
  {
    label: "tuple uint",
    output: {
      type: "tuple",
      components: [{ name: "amount", type: "uint256" }],
    },
    result: { amount: 1234567n },
    raw: "1234567",
  },
])(
  "uses decoder-style uint output for $label without losing raw precision",
  async ({ output, result, raw }) => {
    client.readContract.mockResolvedValueOnce(result);
    show(
      {
        type: "function",
        name: "amount",
        stateMutability: "view",
        inputs: [],
        outputs: [output],
      },
      "read",
      { args: [], value: "0" }
    );
    fireEvent.click(screen.getByRole("button", { name: "Read" }));
    const input = await screen.findByDisplayValue(raw);
    expect(screen.queryByRole("button", { name: /^(Format|Raw)$/ })).toBeNull();
    fireEvent.focus(input);
    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip.textContent).toContain(
      raw.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    );
    expect(tooltip.textContent).toMatch(/\([\d.e+]+[KMB]\)/);
    const copy = input
      .closest(".chakra-input__group")!
      .querySelector("button")!;
    fireEvent.click(copy);
    await waitFor(() => expect(clipboardWrite).toHaveBeenCalledWith(raw));
  }
);

it.each([
  { type: "bytes", hex: "0x6162", text: "ab" },
  { type: "bytes4", hex: "0x61626364", text: "abcd" },
  {
    type: "bytes20",
    hex: "0x6162636465666768696a6b6c6d6e6f7071727374",
    text: "abcdefghijklmnopqrst",
  },
  { type: "tuple", hex: "0x6162", text: "ab" },
])(
  "uses shared bytes controls for $type returns and preserves the format on refresh",
  async ({ type, hex, text }) => {
    const tuple = type === "tuple";
    const output = tuple
      ? { type, components: [{ name: "data", type: "bytes" }] }
      : { type };
    client.readContract.mockResolvedValue(tuple ? { data: hex } : hex);
    show(
      {
        type: "function",
        name: "data",
        stateMutability: "view",
        inputs: [],
        outputs: [output],
      },
      "read",
      { args: [], value: "0" }
    );
    fireEvent.click(screen.getByRole("button", { name: "Read" }));
    const input = await screen.findByDisplayValue(hex);
    fireEvent.click(
      input.closest(".chakra-input__group")!.querySelector("button")!
    );
    await waitFor(() => expect(clipboardWrite).toHaveBeenCalledWith(hex));
    expect(screen.queryByText("to Decimal", { exact: true })).toBeNull();
    for (const [format, expected] of [
      ["Decimal", BigInt(hex).toString()],
      ["Binary", BigInt(hex).toString(2)],
      ["Text", text],
      ["Hex", hex],
    ]) {
      fireEvent.keyDown(screen.getByRole("combobox"), { key: "ArrowDown" });
      fireEvent.click(await screen.findByRole("option", { name: format }));
      await screen.findByDisplayValue(expected);
    }
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "ArrowDown" });
    fireEvent.click(await screen.findByRole("option", { name: "Decimal" }));
    fireEvent.click(screen.getByRole("button", { name: "Read" }));
    await screen.findByDisplayValue(BigInt(hex).toString());
    expect(screen.getByText("Decimal", { exact: true })).toBeTruthy();
  }
);

it.each([
  {
    label: "fixed array",
    output: { type: "uint256[2]" },
    result: [11n, 22n],
    values: ["11", "22"],
  },
  {
    label: "nested array",
    output: { type: "uint256[][]" },
    result: [[11n], [22n, 33n]],
    values: ["11", "22", "33"],
  },
  {
    label: "tuple array",
    output: {
      type: "tuple[]",
      components: [
        { name: "amount", type: "uint256" },
        { name: "data", type: "bytes" },
      ],
    },
    result: [{ amount: 11n, data: "0x6162" }],
    values: ["11", "0x6162"],
  },
  {
    label: "bytes array",
    output: { type: "bytes4[]" },
    result: ["0x61626364"],
    values: ["0x61626364"],
  },
  {
    label: "empty array",
    output: { type: "uint256[]" },
    result: [],
    values: [],
  },
])(
  "renders $label returns in the shared decoder tree",
  async ({ output, result, values }) => {
    client.readContract.mockResolvedValueOnce(result);
    show(
      {
        type: "function",
        name: "items",
        stateMutability: "view",
        inputs: [],
        outputs: [output],
      },
      "read",
      { args: [], value: "0" }
    );
    fireEvent.click(screen.getByRole("button", { name: "Read" }));
    const branch = await screen.findByRole("button", {
      name: "arg0",
      expanded: true,
    });
    expect(
      within(branch).getByText(`${result.length} items`, { exact: true })
    ).toBeTruthy();
    for (const value of values)
      expect(screen.getByDisplayValue(value)).toBeTruthy();
    if (!values.length) expect(screen.getByText("No items")).toBeTruthy();
    fireEvent.click(branch);
    expect(
      screen.getByRole("button", { name: "arg0", expanded: false })
    ).toBeTruthy();
    for (const value of values)
      expect(screen.getByDisplayValue(value).closest("[hidden]")).toBeTruthy();
    fireEvent.click(branch);
    expect(
      screen.getByRole("button", { name: "arg0", expanded: true })
    ).toBeTruthy();
  }
);

it("retains array item units and collapsed branches across refreshed return values", async () => {
  client.readContract
    .mockResolvedValueOnce([2000000n])
    .mockResolvedValueOnce([3000000n]);
  show(
    {
      type: "function",
      name: "items",
      stateMutability: "view",
      inputs: [],
      outputs: [{ type: "uint256[]" }],
    },
    "read",
    { args: [], value: "0" }
  );
  fireEvent.click(screen.getByRole("button", { name: "Read" }));
  await screen.findByDisplayValue("2000000");
  fireEvent.keyDown(screen.getByRole("combobox"), { key: "ArrowDown" });
  fireEvent.click(await screen.findByRole("option", { name: "10^6" }));
  await screen.findByDisplayValue("2");
  fireEvent.click(screen.getByRole("button", { name: "arg0" }));
  fireEvent.click(screen.getByRole("button", { name: "Read" }));
  await waitFor(() => expect(client.readContract).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.getByDisplayValue("3")).toBeTruthy());
  expect(
    screen.getByRole("button", { name: "arg0", expanded: false })
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "arg0" }));
  expect(screen.getByText("10^6", { exact: true })).toBeTruthy();
});

it("renders nested struct fields in one tree and preserves formats and disclosure on refresh", async () => {
  const outputs = [
    {
      type: "tuple",
      components: [
        {
          name: "configuration",
          type: "tuple",
          components: [{ name: "data", type: "uint256" }],
        },
        { name: "active", type: "bool" },
        { name: "amounts", type: "uint256[2]" },
      ],
    },
  ];
  client.readContract
    .mockResolvedValueOnce({
      configuration: { data: 2000000n },
      active: true,
      amounts: [11n, 22n],
    })
    .mockResolvedValueOnce({
      configuration: { data: 3000000n },
      active: false,
      amounts: [33n, 44n],
    });
  show(
    {
      type: "function",
      name: "reserve",
      stateMutability: "view",
      inputs: [],
      outputs,
    },
    "read",
    { args: [], value: "0" }
  );
  fireEvent.click(screen.getByRole("button", { name: "Read" }));
  await screen.findByDisplayValue("2000000");
  expect(screen.getByDisplayValue("true")).toBeTruthy();
  expect(screen.getByDisplayValue("22")).toBeTruthy();
  fireEvent.keyDown(screen.getAllByRole("combobox")[0], { key: "ArrowDown" });
  fireEvent.click(await screen.findByRole("option", { name: "10^6" }));
  await screen.findByDisplayValue("2");
  fireEvent.click(screen.getByRole("button", { name: "configuration" }));
  fireEvent.click(screen.getByRole("button", { name: "Read" }));
  await screen.findByDisplayValue("false");
  expect(screen.getByDisplayValue("3")).toBeTruthy();
  expect(screen.getByDisplayValue("44")).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "configuration", expanded: false })
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "configuration" }));
  expect(screen.getByText("10^6", { exact: true })).toBeTruthy();
});

it.each([
  { type: "int24", result: -1234567n },
  { type: "int256", result: -(1n << 255n) },
])(
  "renders and copies negative $type returns exactly using shared integer controls",
  async ({ type, result }) => {
    client.readContract.mockResolvedValueOnce(result);
    show(
      {
        type: "function",
        name: "signedValue",
        stateMutability: "view",
        inputs: [],
        outputs: [{ type }],
      },
      "read",
      { args: [], value: "0" }
    );
    fireEvent.click(screen.getByRole("button", { name: "Read" }));
    const input = await screen.findByDisplayValue(result.toString());
    fireEvent.click(
      input.closest(".chakra-input__group")!.querySelector("button")!
    );
    await waitFor(() =>
      expect(clipboardWrite).toHaveBeenCalledWith(result.toString())
    );
    if (type === "int24") {
      fireEvent.keyDown(screen.getByRole("combobox"), { key: "ArrowDown" });
      fireEvent.click(await screen.findByRole("option", { name: "10^6" }));
      const converted = await screen.findByDisplayValue("-1.234567");
      fireEvent.click(
        converted.closest(".chakra-input__group")!.querySelector("button")!
      );
      await waitFor(() =>
        expect(clipboardWrite).toHaveBeenCalledWith("-1.234567")
      );
    }
  }
);

it("keeps compact nested tuple values when array rows collapse, expand and are removed", async () => {
  const func: JsonFragment = {
    type: "function",
    name: "batch",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "ops",
        type: "tuple[]",
        components: [
          { name: "nonce", type: "uint256" },
          {
            name: "calls",
            type: "tuple[]",
            components: [
              { name: "target", type: "address" },
              { name: "data", type: "bytes" },
            ],
          },
        ],
      },
    ],
  };
  show(func, "write", {
    args: [
      [
        ["478", [[address, "0x1234"]]],
        ["599", []],
      ],
    ],
    value: "0",
  });
  const collapse = await screen.findByRole("button", {
    name: "Collapse ops item 0",
  });
  expect(collapse.tagName).toBe("BUTTON");
  fireEvent.click(collapse);
  expect(
    screen
      .getByRole("button", { name: "Expand ops item 0" })
      .getAttribute("aria-expanded")
  ).toBe("false");
  fireEvent.click(screen.getByRole("button", { name: "Expand ops item 0" }));
  expect(screen.getByDisplayValue("478")).toBeTruthy();
  expect(screen.getByDisplayValue("0x1234")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Remove ops item 0" }));
  await waitFor(() => expect(screen.queryByDisplayValue("478")).toBeNull());
  expect(screen.getByDisplayValue("599")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Options" }));
  fireEvent.click(
    await screen.findByRole("menuitem", { name: "Encode Calldata" })
  );
  await encodeCurrent();
  expect(
    await screen.findByText(
      new Interface([func]).encodeFunctionData("batch", [[[599n, []]]])
    )
  ).toBeTruthy();
  expect(client.simulateContract).not.toHaveBeenCalled();
});

function ValidationRevealHarness({
  inputs,
  values,
}: {
  inputs: JsonFragment["inputs"];
  values: any[];
}) {
  const root = React.useRef<HTMLDivElement>(null);
  const [isError, setError] = React.useState(false);
  const [attempt, setAttempt] = React.useState(0);
  const [collapsed, setCollapsed] = React.useState(false);
  useInvalidInputReveal(root, attempt);
  return (
    <CompactParameterInputs.Provider value={true}>
      <div ref={root} data-parameter-branch="">
        <button
          data-parameter-toggle=""
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((value) => !value)}
        >
          Toggle form
        </button>
        <button
          onClick={() => {
            setError(true);
            setAttempt((value) => value + 1);
          }}
        >
          Validate
        </button>
        <div style={{ display: collapsed ? "none" : undefined }}>
          {inputs?.map((input, index) => (
            <div key={index}>
              {renderInputFields({
                chainId: 1,
                input,
                value: values[index],
                isError,
                ariaLabel: input.name || input.type,
                onChange: () => {},
                onKeyDown: () => {},
                setFunctionIsDisabled: () => {},
                allowBytesBuilder: true,
              })}
            </div>
          ))}
        </div>
      </div>
    </CompactParameterInputs.Provider>
  );
}

describe("revealing invalid parameter inputs", () => {
  let frames: Map<number, FrameRequestCallback>;
  let nextFrame: number;
  let scrolled: HTMLElement[];
  let previousScroll: PropertyDescriptor | undefined;
  beforeEach(() => {
    frames = new Map();
    nextFrame = 1;
    scrolled = [];
    previousScroll = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "scrollIntoView"
    );
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(function (this: HTMLElement) {
        scrolled.push(this);
      }),
    });
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      const id = nextFrame++;
      frames.set(id, callback);
      return id;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => {
      frames.delete(id);
    });
  });
  afterEach(() => {
    if (previousScroll)
      Object.defineProperty(
        HTMLElement.prototype,
        "scrollIntoView",
        previousScroll
      );
    else Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
  });
  const flushFrames = async () => {
    for (let pass = 0; pass < 10 && frames.size; pass++) {
      await act(async () => {
        const callbacks = [...frames.values()];
        frames.clear();
        callbacks.forEach((callback) => callback(0));
        await Promise.resolve();
      });
    }
  };

  it("opens every collapsed invalid ancestor and scrolls once to the first invalid leaf, including on repeat attempts", async () => {
    render(
      <ChakraProvider>
        <ValidationRevealHarness
          inputs={[
            {
              name: "groups",
              type: "tuple[]",
              components: [
                {
                  name: "settings",
                  type: "tuple",
                  components: [{ name: "label", type: "string" }],
                },
              ],
            },
            {
              name: "other",
              type: "tuple",
              components: [{ name: "payload", type: "bytes" }],
            },
          ]}
          values={[[[[""]]], [""]]}
        />
      </ChakraProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: "Collapse settings" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Collapse groups item 0" })
    );
    fireEvent.click(screen.getByRole("button", { name: "Collapse other" }));
    fireEvent.click(screen.getByRole("button", { name: "Toggle form" }));
    fireEvent.click(screen.getByRole("button", { name: "Validate" }));
    await flushFrames();
    expect(
      screen
        .getByRole("button", { name: "Toggle form" })
        .getAttribute("aria-expanded")
    ).toBe("true");
    expect(
      screen.getByRole("button", { name: "Collapse groups item 0" })
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Collapse settings" })
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Collapse other" })).toBeTruthy();
    expect(scrolled).toEqual([screen.getAllByRole("textbox")[0]]);
    fireEvent.click(
      screen.getByRole("button", { name: "Collapse groups item 0" })
    );
    await flushFrames();
    expect(
      screen.getByRole("button", { name: "Expand groups item 0" })
    ).toBeTruthy();
    expect(scrolled).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Validate" }));
    await flushFrames();
    expect(
      screen.getByRole("button", { name: "Collapse groups item 0" })
    ).toBeTruthy();
    expect(scrolled).toHaveLength(2);
  });

  it("reveals the real contract form after a failed action marks a collapsed array invalid", async () => {
    client.readContract.mockRejectedValueOnce(new Error("Invalid arguments"));
    show(
      {
        type: "function",
        name: "validateRun",
        stateMutability: "view",
        inputs: [
          {
            name: "items",
            type: "tuple[]",
            components: [{ name: "amount", type: "uint256" }],
          },
        ],
      },
      "read",
      { args: [[[""]]], value: "0" }
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Collapse items item 0" })
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Collapse validateRun" })
    );
    fireEvent.click(screen.getByRole("button", { name: "Read" }));
    await waitFor(() =>
      expect(document.querySelector('input[aria-invalid="true"]')).toBeTruthy()
    );
    await flushFrames();
    expect(
      screen.getByRole("button", { name: "Collapse validateRun" })
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Collapse items item 0" })
    ).toBeTruthy();
    expect(scrolled).toHaveLength(1);
    expect(scrolled[0].getAttribute("aria-invalid")).toBe("true");
  });

  it.each([
    { name: "address", type: "address", value: "" },
    { name: "integer", type: "uint256", value: "" },
    { name: "bytes", type: "bytes", value: "" },
    { name: "fixedBytes", type: "bytes4", value: "" },
    { name: "fixedArray", type: "uint256[2]", value: ["", ""] },
    { name: "nestedArray", type: "uint256[][]", value: [[""]] },
    { name: "string", type: "string", value: "" },
    { name: "boolean", type: "bool", value: "" },
    { name: "array", type: "uint256[]", value: [""] },
    { name: "fixedArray", type: "uint256[1]", value: [""] },
  ])(
    "reveals invalid $name fields and respects reduced motion",
    async ({ name, type, value }) => {
      vi.stubGlobal("matchMedia", () => ({
        matches: true,
        addListener() {},
        removeListener() {},
      }));
      render(
        <ChakraProvider>
          <ValidationRevealHarness inputs={[{ name, type }]} values={[value]} />
        </ChakraProvider>
      );
      fireEvent.click(screen.getByRole("button", { name: "Toggle form" }));
      fireEvent.click(screen.getByRole("button", { name: "Validate" }));
      await flushFrames();
      expect(scrolled).toHaveLength(1);
      expect(scrolled[0].getAttribute("aria-invalid")).toBe("true");
      expect(scrolled[0].scrollIntoView).toHaveBeenCalledWith({
        block: "center",
        behavior: "instant",
      });
      expect(
        screen
          .getByRole("button", { name: "Toggle form" })
          .getAttribute("aria-expanded")
      ).toBe("true");
    }
  );

  it("does not expand for a general error with valid inputs and cancels queued work on unmount", async () => {
    const view = render(
      <ChakraProvider>
        <ValidationRevealHarness
          inputs={[{ name: "label", type: "string" }]}
          values={["valid"]}
        />
      </ChakraProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: "Toggle form" }));
    fireEvent.click(screen.getByRole("button", { name: "Validate" }));
    await flushFrames();
    expect(
      screen
        .getByRole("button", { name: "Toggle form" })
        .getAttribute("aria-expanded")
    ).toBe("false");
    expect(scrolled).toHaveLength(0);
    view.unmount();
    const invalid = render(
      <ChakraProvider>
        <ValidationRevealHarness
          inputs={[{ name: "label", type: "string" }]}
          values={[""]}
        />
      </ChakraProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: "Validate" }));
    invalid.unmount();
    await flushFrames();
    expect(scrolled).toHaveLength(0);
  });
});

it.each([
  { raw: "", percent: "0.00", encoded: 0n },
  { raw: "400", percent: "4.00", encoded: 400n },
])(
  "converts '$raw' to Bps % and encodes the integer value",
  async ({ raw, percent, encoded }) => {
    const func: JsonFragment = {
      type: "function",
      name: "setSlippage",
      stateMutability: "view",
      inputs: [{ type: "uint256", name: "slippageBps" }],
      outputs: [],
    };
    show(func);
    const field = screen.getByRole("textbox");
    if (raw) fireEvent.change(field, { target: { value: raw } });
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "ArrowDown" });
    fireEvent.click(await screen.findByRole("option", { name: "Bps %" }));
    await screen.findByDisplayValue(percent);
    expect(field.getAttribute("aria-invalid")).not.toBe("true");
    await encodeCurrent();
    expect(
      await screen.findByText(
        new Interface([func]).encodeFunctionData("setSlippage", [encoded])
      )
    ).toBeTruthy();

    fireEvent.change(field, { target: { value: "" } });
    expect(field.getAttribute("aria-invalid")).not.toBe("true");
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "ArrowDown" });
    fireEvent.click(await screen.findByRole("option", { name: "Wei" }));
    await screen.findByDisplayValue("0");
  }
);
