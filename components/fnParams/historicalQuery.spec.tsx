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
import { ReadWriteFunction } from "./ReadWriteFunction";

const { wallet } = vi.hoisted(() => ({ wallet: { sendTransaction: vi.fn() } }));
vi.mock("wagmi", () => ({
  useWalletClient: () => ({ data: undefined }),
  useAccount: () => ({ chain: { id: 8453 } }),
  useSwitchChain: () => ({ switchChain: vi.fn() }),
}));
vi.mock("wagmi/actions", () => ({ waitForTransactionReceipt: vi.fn() }));
vi.mock("@/app/providers", () => ({ config: {} }));
vi.mock("@/components/ConnectButton", () => ({
  ConnectButton: () => <button>Connect wallet</button>,
}));
vi.mock("@/utils", () => ({
  generateTenderlyUrl: vi.fn(),
  getPath: (s: string) => `/${s}/`,
  slicedText: (s: string) => s,
}));
vi.mock("./Renderer", () => ({
  renderInputFields: ({ input, value, onChange }: any) => (
    <input aria-label={input.name} value={value} onChange={onChange} />
  ),
  renderParamTypes: ({ value }: any) => (
    <output data-testid="result">
      {value === null || value === undefined ? "" : String(value)}
    </output>
  ),
}));
vi.mock("./inputs", () => ({
  IntInput: ({ value, onChange }: any) => (
    <input aria-label="Payable wei" value={value} onChange={onChange} />
  ),
  InputInfo: () => null,
  AddressInput: () => null,
}));
vi.mock("@/components/CopyToClipboard", () => ({
  CopyToClipboard: () => null,
}));
const address = "0x0000000000000000000000000000000000000001";
const client = {
  getBlock: vi.fn(),
  readContract: vi.fn(),
  simulateContract: vi.fn(),
  call: vi.fn(),
};
const read = {
  type: "function",
  name: "balance",
  stateMutability: "view",
  inputs: [{ name: "who", type: "address" }],
  outputs: [{ type: "uint256" }],
};
const write = { ...read, name: "transfer", stateMutability: "payable" };
function page(type: "read" | "write" = "read", inferred = false, rpc = client) {
  return (
    <ChakraProvider>
      <ReadWriteFunction
        client={rpc as any}
        index={1}
        type={type}
        func={(type === "read" ? read : write) as any}
        address={address}
        chainId={1}
        isAbiDecoded={inferred}
        readAllCollapsed={false}
      />
    </ChakraProvider>
  );
}
async function select(label: string, type: "read" | "write" = "read") {
  fireEvent.click(
    screen.getByRole("button", {
      name: type === "read" ? "Read options" : "Options",
    })
  );
  const items = await screen.findAllByRole("menuitem");
  const order = items.map((item) => item.textContent);
  expect(order.indexOf("Encode Calldata")).toBeLessThan(
    order.indexOf(
      type === "read" ? "Query at Block" : "Call as View Fn at Block"
    )
  );
  fireEvent.click(screen.getByRole("menuitem", { name: label }));
  return screen.findByRole("dialog");
}
function fill(name: string, value: string) {
  fireEvent.change(screen.getByLabelText(name), { target: { value } });
}
function setAndQuery(settings: HTMLElement) {
  fireEvent.click(within(settings).getByRole("button", { name: "Set" }));
  expect(client.getBlock).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole("button", {
      name: /^(Query at (Block|Time)|Call as View Fn at (Block|Time))$/,
    })
  );
}
async function selectQueryTime() {
  fireEvent.change(await screen.findByRole("combobox", { name: "Year" }), {
    target: { value: "2023" },
  });
  fireEvent.change(screen.getByRole("combobox", { name: "Month" }), {
    target: { value: "10" },
  });
  fireEvent.click(
    await screen.findByRole("button", { name: "14 November 2023" })
  );
  fill("Hours (UTC)", "10");
  fireEvent.change(screen.getByRole("combobox", { name: "AM/PM" }), { target: { value: "PM" } });
  fill("Minutes", "33");
  fill("Seconds", "25");
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("localStorage", { getItem: () => null, setItem() {} });
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addListener() {},
    removeListener() {},
  }));
  HTMLElement.prototype.scrollTo = vi.fn();
  client.getBlock.mockImplementation(async ({ blockTag, blockNumber }) => ({
    number: blockTag === "latest" ? 1000n : blockNumber,
    timestamp:
      1700000000n + (blockTag === "latest" ? 1000n : blockNumber) * 12n,
  }));
  client.readContract.mockResolvedValue(42n);
  client.simulateContract.mockResolvedValue({ result: 23n });
  client.call.mockResolvedValue({ data: "0xabcd" });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("appends read options, explicitly queries at a bigint block, labels results and invalidates them after argument edits", async () => {
  render(page());
  fill("who", address);
  const dialog = await select("Query at Block");
  expect(client.readContract).not.toHaveBeenCalled();
  fill("Block number", "100");
  setAndQuery(dialog);
  await screen.findByText(/Block 100 ·/);
  expect(client.readContract).toHaveBeenCalledWith(
    expect.objectContaining({ blockNumber: 100n, args: [address] })
  );
  const result = screen.getByLabelText("Historical query result");
  expect(result.textContent).toContain("42");
  fill("who", "0x0000000000000000000000000000000000000002");
  expect(screen.queryByLabelText("Historical query result")).toBeNull();
  expect(wallet.sendTransaction).not.toHaveBeenCalled();
});
it("resolves UTC time to the last preceding block and calls the exact same RPC client", async () => {
  render(page());
  fill("who", address);
  const dialog = await select("Query at Time");
  await selectQueryTime(); // base + 1205 seconds -> block 100.
  setAndQuery(dialog);
  await screen.findByLabelText("Historical query result");
  expect(client.readContract).toHaveBeenCalledWith(
    expect.objectContaining({ blockNumber: 100n })
  );
});
it("appends write history options and simulates without a wallet despite a wallet network mismatch", async () => {
  render(page("write"));
  fill("who", address);
  fill("Payable wei", "12");
  const dialog = await select("Call as View Fn at Block", "write");
  fill("Block number", "100");
  setAndQuery(dialog);
  await screen.findByLabelText("Historical query result");
  expect(client.simulateContract).toHaveBeenCalledWith(
    expect.objectContaining({ blockNumber: 100n, value: 12n, args: [address] })
  );
  expect(client.readContract).not.toHaveBeenCalled();
  expect(wallet.sendTransaction).not.toHaveBeenCalled();
});
it("sends inferred calls through raw eth_call at the selected block", async () => {
  render(page("write", true));
  fill("who", address);
  const dialog = await select("Call as View Fn at Time", "write");
  await selectQueryTime();
  setAndQuery(dialog);
  await screen.findByLabelText("Historical query result");
  expect(client.call).toHaveBeenCalledWith(
    expect.objectContaining({
      blockNumber: 100n,
      to: address,
      data: expect.stringMatching(/^0x/),
    })
  );
  expect(client.simulateContract).not.toHaveBeenCalled();
});
it("keeps invalid input in the dialog without making a contract call", async () => {
  render(page());
  fill("who", address);
  const dialog = await select("Query at Block");
  fill("Block number", "1.5");
  fireEvent.click(within(dialog).getByRole("button", { name: "Set" }));
  await screen.findByRole("alert");
  expect(
    (screen.getByLabelText("Block number") as HTMLInputElement).value
  ).toBe("1.5");
  expect(client.getBlock).not.toHaveBeenCalled();
  expect(client.readContract).not.toHaveBeenCalled();
});
it("surfaces archive failures without falling back to latest", async () => {
  client.readContract.mockRejectedValue({
    shortMessage: "Call failed",
    cause: { message: "missing trie node" },
  });
  render(page());
  fill("who", address);
  const dialog = await select("Query at Block");
  fill("Block number", "100");
  setAndQuery(dialog);
  expect((await screen.findByRole("alert")).textContent).toContain(
    "archive-capable RPC"
  );
  expect(
    screen.getByRole("button", { name: "Manage networks & RPCs" })
  ).toBeTruthy();
  expect(client.readContract).toHaveBeenCalledOnce();
  expect(client.readContract.mock.calls[0][0].blockNumber).toBe(100n);
});
it("ignores results after cancellation or RPC changes", async () => {
  let complete!: (result: unknown) => void;
  client.readContract.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      })
  );
  const view = render(page());
  fill("who", address);
  const dialog = await select("Query at Block");
  fill("Block number", "100");
  setAndQuery(dialog);
  await waitFor(() => expect(client.readContract).toHaveBeenCalledOnce());
  fireEvent.click(
    screen.getByRole("button", { name: "Historical query settings" })
  );
  const reopened = await screen.findByRole("dialog");
  fireEvent.click(within(reopened).getByRole("button", { name: "Cancel" }));
  await act(async () => complete(999n));
  expect(screen.queryByLabelText("Historical query result")).toBeNull();
  const next = { ...client, readContract: vi.fn().mockResolvedValue(5n) };
  view.rerender(page("read", false, next));
  expect(screen.queryByLabelText("Historical query result")).toBeNull();
});

it("discards an in-flight historical response when arguments change", async () => {
  let finish!: (result: unknown) => void;
  client.readContract.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  render(page());
  fill("who", address);
  const dialog = await select("Query at Block");
  fill("Block number", "100");
  setAndQuery(dialog);
  await waitFor(() => expect(client.readContract).toHaveBeenCalledOnce());
  fill("who", "0x0000000000000000000000000000000000000002");
  await act(async () => finish(999n));
  expect(screen.queryByLabelText("Historical query result")).toBeNull();
});

it("discards a pending latest read when switching to a historical query", async () => {
  let finish!: (result: unknown) => void;
  client.readContract.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  render(page());
  fill("who", address);
  fireEvent.click(screen.getAllByRole("button", { name: "Read" })[0]);
  await waitFor(() => expect(client.readContract).toHaveBeenCalledOnce());
  // The menu is disabled during a normal read; changing arguments cancels it.
  fill("who", "0x0000000000000000000000000000000000000002");
  await select("Query at Block");
  await act(async () => finish(999n));
  expect(screen.queryByText("999")).toBeNull();
});

it("auto-opens the gear popover, keeps its target, and reruns from the primary button", async () => {
  render(page());
  fill("who", address);
  const settings = await select("Query at Block");
  const gear = screen.getByRole("button", {
    name: "Historical query settings",
  });
  expect(gear.getAttribute("aria-expanded")).toBe("true");
  expect(settings.getAttribute("aria-modal")).not.toBe("true");
  fill("Block number", "100");
  setAndQuery(settings);
  await screen.findByLabelText("Historical query result");
  await waitFor(() => expect(gear.getAttribute("aria-expanded")).toBe("false"));
  fireEvent.click(gear);
  expect(
    ((await screen.findByLabelText("Block number")) as HTMLInputElement).value
  ).toBe("100");
  fireEvent.click(gear);
  const nextAddress = "0x0000000000000000000000000000000000000002";
  fill("who", nextAddress);
  fireEvent.click(screen.getByRole("button", { name: "Query at Block" }));
  await waitFor(() => expect(client.readContract).toHaveBeenCalledTimes(2));
  expect(client.readContract.mock.calls[1][0]).toMatchObject({
    blockNumber: 100n,
    args: [nextAddress],
  });
  await screen.findByLabelText("Historical query result");
  expect(gear.getAttribute("aria-expanded")).toBe("false");
});

it("sets a target without arguments or RPC requests, then queries only from the main button", async () => {
  render(page());
  const settings = await select("Query at Block");
  fill("Block number", "100");
  const gear = screen.getByRole("button", {
    name: "Historical query settings",
  });
  expect(gear.getAttribute("aria-description")).toBeNull();
  fireEvent.click(within(settings).getByRole("button", { name: "Set" }));
  expect(client.getBlock).not.toHaveBeenCalled();
  expect(client.readContract).not.toHaveBeenCalled();
  expect(gear.getAttribute("aria-description")).toBe("Block number configured");
  fill("who", address);
  fireEvent.click(screen.getByRole("button", { name: "Query at Block" }));
  await screen.findByLabelText("Historical query result");
  expect(client.readContract).toHaveBeenCalledOnce();
});
