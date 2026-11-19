import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import {
  AddressInspectorProvider,
  InspectAddressButton,
} from "./AddressInspector";

const { getClient, client } = vi.hoisted(() => ({
  getClient: vi.fn(),
  client: {
    getBalance: vi.fn(async () => 1234567890123456789n),
    getCode: vi.fn(async () => "0x6000"),
    getTransactionCount: vi.fn(async () => 7),
  },
}));
vi.mock("@/lib/publicClient", () => ({ getPublicClient: getClient }));
vi.mock("@/components/CopyToClipboard", () => ({
  CopyToClipboard: ({ textToCopy }: any) => (
    <button
      aria-label="Copy address"
      onClick={() => navigator.clipboard.writeText(textToCopy)}
    >
      Copy
    </button>
  ),
}));
const first = "0x0000000000000000000000000000000000000001";
const second = "0x0000000000000000000000000000000000000002";
beforeEach(() => {
  getClient.mockReturnValue(client);
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: vi.fn() });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

function fixture(chainId = 1) {
  return (
    <ChakraProvider>
      <AddressInspectorProvider chainId={chainId}>
        <InspectAddressButton address={first} />
        <InspectAddressButton address={second} />
      </AddressInspectorProvider>
    </ChakraProvider>
  );
}

it("does not read anything until an inspect action, and hides outside contract scope or for invalid addresses", () => {
  const { rerender } = render(
    <ChakraProvider>
      <InspectAddressButton address={first} />
    </ChakraProvider>
  );
  expect(screen.queryByRole("button")).toBeNull();
  rerender(
    <ChakraProvider>
      <AddressInspectorProvider chainId={1}>
        <InspectAddressButton address={null} />
        <InspectAddressButton address="0x1234" />
        <InspectAddressButton address={"0x" + "1".repeat(64)} />
      </AddressInspectorProvider>
    </ChakraProvider>
  );
  expect(screen.queryByRole("button")).toBeNull();
  expect(getClient).not.toHaveBeenCalled();
  expect(client.getBalance).not.toHaveBeenCalled();
});

it("preserves the exact copy value and distinct chain-bound external explorer action", async () => {
  const writeText = vi.fn();
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  render(fixture(137));
  fireEvent.click(
    screen.getByRole("button", { name: `Inspect address ${first}` })
  );
  const dialog = await screen.findByRole("dialog");
  const link = within(dialog).getByRole("link", { name: /Open in/ });
  expect(link.getAttribute("href")).toBe(
    `https://polygonscan.com/address/${first}`
  );
  expect(link.getAttribute("target")).toBe("_blank");
  expect(link.getAttribute("rel")).toContain("noopener");
  fireEvent.click(within(dialog).getByRole("button", { name: "Copy address" }));
  expect(writeText).toHaveBeenCalledWith(first);
  expect(screen.getByRole("dialog")).toBe(dialog);
  expect(getClient).toHaveBeenCalledWith(137);
});

it("shows explicit read failure, retries, and handles addresses without bytecode", async () => {
  client.getBalance.mockRejectedValueOnce(new Error("RPC unavailable"));
  client.getCode.mockResolvedValueOnce("0x");
  render(fixture());
  fireEvent.click(
    screen.getByRole("button", { name: `Inspect address ${first}` })
  );
  const dialog = await screen.findByRole("dialog");
  expect(await within(dialog).findByRole("alert")).toBeTruthy();
  expect(within(dialog).queryByText("No deployed bytecode")).toBeNull();
  client.getCode.mockResolvedValueOnce("0x");
  fireEvent.click(within(dialog).getByRole("button", { name: "Retry" }));
  await within(dialog).findByText("No deployed bytecode");
  expect(within(dialog).queryByRole("alert")).toBeNull();
});

it("ignores a late result from a dismissed address when a second address is opened", async () => {
  let finish!: (value: bigint) => void;
  client.getBalance.mockImplementationOnce(
    () =>
      new Promise<bigint>((resolve) => {
        finish = resolve;
      })
  );
  render(fixture());
  fireEvent.click(
    screen.getByRole("button", { name: `Inspect address ${first}` })
  );
  let dialog = await screen.findByRole("dialog");
  await within(dialog).findByRole("status");
  fireEvent.click(
    within(dialog).getByRole("button", { name: "Close address inspector" })
  );
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  fireEvent.click(
    screen.getByRole("button", { name: `Inspect address ${second}` })
  );
  dialog = await screen.findByRole("dialog");
  await within(dialog).findByText("1.234567890123456789 ETH");
  finish(999000000000000000000n);
  await waitFor(() => expect(within(dialog).getByText(second)).toBeTruthy());
  expect(within(dialog).queryByText("999 ETH")).toBeNull();
});

it("opens the linked address on the provider's loaded chain without replacing the draft", async () => {
  getClient.mockReturnValue(client);
  render(
    <ChakraProvider>
      <AddressInspectorProvider chainId={1}>
        <input aria-label="Contract draft" defaultValue="keep me" />
        <InspectAddressButton address={first} />
        <InspectAddressButton address={second} />
      </AddressInspectorProvider>
    </ChakraProvider>
  );
  const draft = screen.getByLabelText("Contract draft");
  fireEvent.change(draft, { target: { value: "unsaved calldata" } });
  fireEvent.click(
    screen.getByRole("button", { name: `Inspect address ${first}` })
  );
  const drawer = await screen.findByRole("dialog", { name: "Inspect address" });
  await waitFor(() =>
    expect(within(drawer).getByText("1.234567890123456789 ETH")).toBeTruthy()
  );
  expect(within(drawer).getByText(first)).toBeTruthy();
  expect(within(drawer).getByText(/Ethereum.*1/)).toBeTruthy();
  expect(getClient).toHaveBeenCalledWith(1);
  expect(client.getCode).toHaveBeenCalledWith({ address: first });
  expect((draft as HTMLInputElement).value).toBe("unsaved calldata");
  expect(screen.getByLabelText("Contract draft")).toBe(draft);
});
