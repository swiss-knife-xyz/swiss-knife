import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ChakraProvider } from "@chakra-ui/react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import SendTx from "./page";
const mocks = vi.hoisted(() => ({
  query: "",
  decode: vi.fn(),
  resolve: vi.fn(),
  wallet: undefined as any,
  accountChain: undefined as number | undefined,
  liveChain: 1,
  connected: undefined as string | undefined,
  switchNetwork: vi.fn(),
  receipt: vi.fn(),
  send: vi.fn(),
  deploy: vi.fn(),
  walletChain: vi.fn(),
  scroll: vi.fn(),
  urlUpdate: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mocks.query),
}));
vi.mock("next/dynamic", () => ({
  default: (loader: any) => React.lazy(loader),
}));
vi.mock("wagmi", () => ({
  useWalletClient: () => ({ data: mocks.wallet }),
  useAccount: () => ({
    chain: mocks.accountChain ? { id: mocks.accountChain } : undefined,
    address: mocks.connected,
  }),
  useSwitchChain: () => ({ switchChainAsync: mocks.switchNetwork }),
}));
vi.mock("wagmi/actions", () => ({ waitForTransactionReceipt: mocks.receipt }));
vi.mock("@/app/providers", () => ({ config: {} }));
vi.mock("@/lib/decoder", () => ({ decodeRecursive: mocks.decode }));
vi.mock("@/utils", () => ({
  getPath: () => "/explorer/",
  ethFormatOptions: ["Wei", "ETH"],
  startHexWith0x: (s: string) => (s.startsWith("0x") ? s : `0x${s}`),
  resolveNameToAddress: mocks.resolve,
  resolveAddressToName: async () => null,
  getNameAvatar: async () => null,
  isResolvableName: (s: string) => s.includes("."),
  slicedText: (s: string) => s,
  generateTenderlyUrl: () => "",
}));
vi.mock("@/components/ClearSigning/ClearSigningSummary", () => ({
  default: (props: any) => (
    <section aria-label="Clear signing" data-preview={JSON.stringify(props)}>
      Readable preview
    </section>
  ),
}));
vi.mock("@/components/decodedParams/CalldataTree", () => ({
  CalldataTree: (props: any) => (
    <div data-testid="shared-calldata-tree">{props.functionName}</div>
  ),
}));
vi.mock("@/components/NetworkSelect", () => ({
  NetworkSelect: (props: any) => (
    <select aria-label={props.ariaLabel} autoFocus={props.autoFocus}
      value={props.chainId} onKeyDown={props.onKeyDown}
      onChange={(event) => props.onChange(Number(event.target.value))}>
      <option value={1}>Ethereum</option>
      <option value={8453}>Base</option>
      <option value={11155111}>Sepolia</option>
    </select>
  ),
}));
vi.mock("@/components/DarkSelect", () => ({ DarkSelect: () => null }));
vi.mock("@/components/CopyToClipboard", () => ({
  CopyToClipboard: () => null,
}));
vi.mock("@/hooks/useAutoHideScrollbars", () => ({
  useAutoHideScrollbars: () => ({}),
}));
const address = "0x1111111111111111111111111111111111111111";
function page(query: string) {
  mocks.query = query;
  return (
    <ChakraProvider>
      <NuqsTestingAdapter searchParams={query} hasMemory onUrlUpdate={mocks.urlUpdate}>
        <SendTx />
      </NuqsTestingAdapter>
    </ChakraProvider>
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.decode.mockResolvedValue({
    functionName: "transfer",
    signature: "transfer(address,uint256)",
    args: [],
    rawArgs: [],
  });
  mocks.resolve.mockResolvedValue(address);
  mocks.wallet = undefined;
  mocks.connected = undefined;
  mocks.accountChain = undefined;
  mocks.liveChain = 1;
  mocks.walletChain.mockImplementation(async () => mocks.liveChain);
  mocks.switchNetwork.mockResolvedValue({ id: 8453 });
  mocks.send.mockResolvedValue(`0x${"ab".repeat(32)}`);
  mocks.deploy.mockResolvedValue(`0x${"ab".repeat(32)}`);
  mocks.receipt.mockResolvedValue({ status: "success" });
  HTMLElement.prototype.scrollIntoView = mocks.scroll;
});
afterEach(cleanup);
it("places Value above Calldata and previews the full transaction envelope outside the decode modal", async () => {
  render(page(`to=${address}&calldata=0xa9059cbb&chainId=8453&eth=1.25`));
  const preview = await screen.findByRole("region", { name: "Clear signing" });
  expect(JSON.parse(preview.getAttribute("data-preview")!)).toMatchObject({
    to: address,
    chainId: 8453,
    calldata: "0xa9059cbb",
    value: "1250000000000000000",
  });
  expect(
    screen
      .getByLabelText("Value")
      .compareDocumentPosition(screen.getByLabelText("Calldata")) &
      Node.DOCUMENT_POSITION_FOLLOWING
  ).toBeTruthy();
  expect(preview.closest("[data-tx-send-form]")).toBeNull();
  expect(
    screen.getByLabelText("Calldata").closest("[data-tx-send-form]")
  ).toBeTruthy();
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /^Decode$/ }));
  const dialog = await screen.findByRole("dialog");
  expect(
    await within(dialog).findByTestId("shared-calldata-tree")
  ).toBeTruthy();
  expect(
    within(dialog).queryByRole("region", { name: "Clear signing" })
  ).toBeNull();
  expect(mocks.decode).toHaveBeenCalledWith({
    calldata: "0xa9059cbb",
    address,
    chainId: 8453,
  });
});
it("drops stale preview immediately on recipient changes, resolves names and refreshes the value", async () => {
  render(page(`to=${address}&calldata=0xa9059cbb`));
  await screen.findByRole("region", { name: "Clear signing" });
  fireEvent.change(screen.getByLabelText("To Address"), {
    target: { value: "alice.gwei" },
  });
  expect(screen.queryByRole("region", { name: "Clear signing" })).toBeNull();
  await waitFor(() => expect(mocks.resolve).toHaveBeenCalledWith("alice.gwei"));
  const preview = await screen.findByRole("region", { name: "Clear signing" });
  expect(JSON.parse(preview.getAttribute("data-preview")!).to).toBe(address);
  fireEvent.change(screen.getByLabelText("Value"), { target: { value: "2" } });
  expect(screen.queryByRole("region", { name: "Clear signing" })).toBeNull();
  await waitFor(() =>
    expect(
      JSON.parse(
        screen
          .getByRole("region", { name: "Clear signing" })
          .getAttribute("data-preview")!
      ).value
    ).toBe("2000000000000000000")
  );
});
it("does not invent a clear-signing target for deployment bytecode", async () => {
  render(page("calldata=0xa9059cbb"));
  await new Promise((resolve) => setTimeout(resolve, 450));
  expect(screen.queryByRole("region", { name: "Clear signing" })).toBeNull();
});

function connect(chainId: number) {
  mocks.connected = address;
  mocks.accountChain = chainId;
  mocks.liveChain = chainId;
  mocks.wallet = {
    getChainId: mocks.walletChain,
    sendTransaction: mocks.send,
    deployContract: mocks.deploy,
  };
}
it("switches networks on a separate click and does not silently replace the URL network", async () => {
  connect(1);
  const rendered = render(page(`to=${address}&chainId=8453`));
  fireEvent.click(screen.getByRole("button", { name: "Switch to Base" }));
  await screen.findByText("Switched to Base");
  expect(mocks.switchNetwork).toHaveBeenCalledWith({ chainId: 8453 });
  expect(mocks.send).not.toHaveBeenCalled();
  expect(mocks.deploy).not.toHaveBeenCalled();
  expect(mocks.scroll).toHaveBeenCalled();
  mocks.accountChain = 8453;
  mocks.liveChain = 8453;
  rendered.rerender(page(`to=${address}&chainId=8453`));
  fireEvent.click(screen.getByRole("button", { name: "Send Transaction" }));
  await screen.findByText("Transaction confirmed");
  expect(mocks.send).toHaveBeenCalledWith(
    expect.objectContaining({ chain: expect.objectContaining({ id: 8453 }) })
  );
  expect(mocks.receipt).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ chainId: 8453 })
  );
});
it("checks the actual wallet chain before sending even when account state is stale", async () => {
  connect(1);
  mocks.liveChain = 8453;
  render(page(`to=${address}&chainId=1`));
  fireEvent.click(screen.getByRole("button", { name: "Send Transaction" }));
  await screen.findByText("Switch your wallet to Ethereum before sending.");
  expect(
    screen.getByRole("button", { name: "Switch to Ethereum" })
  ).toBeTruthy();
  expect(mocks.send).not.toHaveBeenCalled();
  expect(mocks.deploy).not.toHaveBeenCalled();
});
it("shows pending and reverted status inline with the correct chain explorer", async () => {
  connect(8453);
  let finish!: (receipt: any) => void;
  mocks.receipt.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    })
  );
  render(page(`to=${address}&chainId=8453`));
  fireEvent.click(screen.getByRole("button", { name: "Send Transaction" }));
  await screen.findByText("Waiting for confirmation");
  expect(
    screen.getByRole("link", { name: /View on explorer/ }).getAttribute("href")
  ).toBe(`https://basescan.org/tx/0x${"ab".repeat(32)}`);
  await act(async () => {
    finish({ status: "reverted" });
  });
  expect(await screen.findByText("Transaction reverted")).toBeTruthy();
  expect(screen.queryByText("Transaction confirmed")).toBeNull();
});
it("displays wallet rejection inline without retrying the transaction", async () => {
  connect(1);
  mocks.send.mockRejectedValue({
    code: 4001,
    shortMessage: "User rejected the request.",
  });
  render(page(`to=${address}&chainId=1`));
  fireEvent.click(screen.getByRole("button", { name: "Send Transaction" }));
  await screen.findByText("User rejected the request.");
  expect(screen.getByText("Transaction request failed")).toBeTruthy();
  expect(mocks.send).toHaveBeenCalledTimes(1);
  expect(mocks.receipt).not.toHaveBeenCalled();
});
it("pins deployments and their receipt to the requested chain", async () => {
  connect(1);
  render(page("chainId=1&calldata=0x6000"));
  fireEvent.click(screen.getByRole("button", { name: "Send Transaction" }));
  await screen.findByText("Contract deployed successfully");
  expect(mocks.deploy).toHaveBeenCalledWith(
    expect.objectContaining({
      bytecode: "0x6000",
      chain: expect.objectContaining({ id: 1 }),
    })
  );
  expect(mocks.send).not.toHaveBeenCalled();
  expect(mocks.receipt).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ chainId: 1 })
  );
});

it("keeps switch rejection inline without issuing a wallet transaction", async () => {
  connect(1);
  mocks.switchNetwork.mockRejectedValue({
    shortMessage: "Network switch rejected.",
  });
  render(page(`to=${address}&chainId=8453`));
  fireEvent.click(screen.getByRole("button", { name: "Switch to Base" }));
  await screen.findByText("Network switch rejected.");
  expect(mocks.send).not.toHaveBeenCalled();
  expect(mocks.deploy).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Switch to Base" })).toBeTruthy();
});
it("does not open duplicate wallet requests while confirmation is pending", async () => {
  connect(1);
  let finish!: (hash: string) => void;
  mocks.send.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    })
  );
  render(page(`to=${address}&chainId=1`));
  const button = screen.getByRole("button", { name: "Send Transaction" });
  fireEvent.click(button);
  fireEvent.click(button);
  await waitFor(() => expect(mocks.send).toHaveBeenCalledTimes(1));
  await act(async () => {
    finish(`0x${"ab".repeat(32)}`);
  });
  await screen.findByText("Transaction confirmed");
  expect(mocks.send).toHaveBeenCalledTimes(1);
});

it("shows the URL network above To Address even when the wallet is on a different chain", () => {
  connect(1);
  render(page(`to=${address}&chainId=11155111`));
  const network = screen.getByRole("region", { name: "Transaction network" });
  expect(within(network).getByText("Sepolia")).toBeTruthy();
  expect(within(network).getByText("Chain ID: 11155111")).toBeTruthy();
  expect(
    network.compareDocumentPosition(screen.getByLabelText("To Address")) &
      Node.DOCUMENT_POSITION_FOLLOWING
  ).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Switch to Sepolia" })
  ).toBeTruthy();
});

it("edits the target network without sending and preserves URL fields including explicit Ethereum", async () => {
  connect(1);
  render(page(`to=${address}&calldata=0xa9059cbb&eth=1.25&chainId=11155111`));
  fireEvent.click(screen.getByRole("button", { name: "Change target network" }));
  expect(document.activeElement).toBe(screen.getByLabelText("Target network"));
  fireEvent.change(screen.getByLabelText("Target network"), { target: { value: "8453" } });
  await screen.findByRole("button", { name: "Switch to Base" });
  expect(screen.queryByLabelText("Target network")).toBeNull();
  expect(mocks.send).not.toHaveBeenCalled();
  expect(mocks.switchNetwork).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Change target network" }));
  fireEvent.change(screen.getByLabelText("Target network"), { target: { value: "1" } });
  await screen.findByRole("button", { name: "Send Transaction" });
  await waitFor(() => {
    const params = mocks.urlUpdate.mock.lastCall?.[0].searchParams;
    expect(params?.get("chainId")).toBe("1");
    expect(params?.get("to")).toBe(address);
    expect(params?.get("calldata")).toBe("0xa9059cbb");
    expect(params?.get("eth")).toBe("1.25");
  });
});
it("cancels network editing without changing the target", () => {
  render(page("chainId=8453"));
  fireEvent.click(screen.getByRole("button", { name: "Change target network" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel network change" }));
  expect(screen.queryByLabelText("Target network")).toBeNull();
  expect(screen.getByText("Chain ID: 8453")).toBeTruthy();
  expect(mocks.urlUpdate).not.toHaveBeenCalled();
});
