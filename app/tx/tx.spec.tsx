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
import { decodeFunctionData, encodeFunctionData, erc20Abi } from "viem";
const mocks = vi.hoisted(() => ({
  query: "",
  rpcRevision: 0,
  decode: vi.fn(),
  editorLoad: vi.fn(),
  editorReady: vi.fn(),
  copy: vi.fn(),
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
vi.mock("@/components/calldata/EditableCalldata", async (importOriginal) => {
  mocks.editorLoad();
  const module = await importOriginal<typeof import("@/components/calldata/EditableCalldata")>();
  mocks.editorReady();
  return module;
});
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mocks.query),
}));
vi.mock("next/dynamic", () => ({
  default: (loader: any, options?: { loading?: React.ComponentType }) => {
    const Component = React.lazy(loader);
    const Loading = options?.loading;
    return (props: any) => <React.Suspense fallback={Loading ? <Loading /> : null}>
      <Component {...props} />
    </React.Suspense>;
  },
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
vi.mock("@/lib/customChains/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/customChains/store")>()),
  useCustomChains: () => ({ ready: true, revision: mocks.rpcRevision, chains: [], error: null }),
}));
vi.mock("@/lib/decoder", () => ({ decodeRecursive: mocks.decode }));
vi.mock("@/utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/utils")>()),
  getPath: (base: string) => `/${base}/`,
  fetchContractAbi: vi.fn().mockResolvedValue(undefined),
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
vi.mock("@/components/decodedParams/CalldataTree", async (importOriginal) => {
  const { CalldataTree } = await importOriginal<typeof import("@/components/decodedParams/CalldataTree")>();
  return { CalldataTree: (props: any) => <div data-testid="shared-calldata-tree">
    {props.editor ? <CalldataTree {...props} /> : props.functionName}
  </div> };
});
vi.mock("@/components/AddressBook", () => ({ AddressBookButton: () => null }));
vi.mock("@/lib/publicClient", () => ({ getPublicClient: () => ({}) }));
vi.mock("@/utils/addressLabels", () => ({ fetchAddressLabels: async () => [] }));
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
  CopyToClipboard: ({ textToCopy, labelText }: any) => labelText ? (
    <button onClick={() => mocks.copy(textToCopy)}>{labelText}</button>
  ) : null,
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
  mocks.rpcRevision = 0;
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
it("starts loading the editor while decoding is still pending", async () => {
  let finishDecode!: (value: unknown) => void;
  mocks.decode.mockReturnValueOnce(new Promise(resolve => { finishDecode = resolve; }));
  render(page(`to=${address}&calldata=0xa9059cbb`));
  fireEvent.click(screen.getByRole("button", { name: /^Decode$/ }));
  await waitFor(() => expect(mocks.editorLoad).toHaveBeenCalled());
  expect(mocks.decode).toHaveBeenCalled();
  expect(screen.queryByTestId("shared-calldata-tree")).toBeNull();
  await waitFor(() => expect(mocks.editorReady).toHaveBeenCalled(), { timeout: 5000 });
  await act(async () => finishDecode({ functionName: "transfer", signature: "transfer(address,uint256)", args: [], rawArgs: [] }));
  expect(await screen.findByTestId("shared-calldata-tree")).toBeTruthy();
});

it("reopens an unchanged decode synchronously without a loader or another decoding request", async () => {
  render(page(`to=${address}&calldata=0xa9059cbb&chainId=1`));
  fireEvent.click(screen.getByRole("button", { name: /^Decode$/ }));
  await screen.findByTestId("shared-calldata-tree", {}, { timeout: 5000 });
  fireEvent.click(await screen.findByRole("button", { name: "Close" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  mocks.decode.mockClear();
  fireEvent.click(screen.getByRole("button", { name: /^Decode$/ }));
  const dialog = within(screen.getByRole("dialog"));
  expect(dialog.getByTestId("shared-calldata-tree")).toBeTruthy();
  expect(dialog.queryByRole("status")).toBeNull();
  expect(mocks.decode).not.toHaveBeenCalled();
});

it.each(["calldata", "recipient", "network", "RPC settings"])("decodes again when %s changes", async (changed) => {
  const query = `to=${address}&calldata=0xa9059cbb&chainId=1`;
  const ui = render(page(query));
  fireEvent.click(screen.getByRole("button", { name: /^Decode$/ }));
  await screen.findByTestId("shared-calldata-tree");
  fireEvent.click(await screen.findByRole("button", { name: "Close" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  if (changed === "calldata") fireEvent.change(screen.getByLabelText("Calldata"), { target: { value: "0x095ea7b3" } });
  if (changed === "recipient") fireEvent.change(screen.getByLabelText("To Address"), { target: { value: "0x2222222222222222222222222222222222222222" } });
  if (changed === "network") {
    fireEvent.click(screen.getByRole("button", { name: "Change target network" }));
    fireEvent.change(screen.getByLabelText("Target network"), { target: { value: "8453" } });
  }
  if (changed === "RPC settings") { mocks.rpcRevision++; ui.rerender(page(query)); }
  fireEvent.click(screen.getByRole("button", { name: /^Decode$/ }));
  await screen.findByTestId("shared-calldata-tree");
  expect(mocks.decode).toHaveBeenCalledTimes(2);
});

it("does not cache failed decodes and permits retrying the same calldata", async () => {
  mocks.decode.mockRejectedValueOnce(new Error("Decode failed"));
  render(page(`to=${address}&calldata=0xa9059cbb`));
  fireEvent.click(screen.getByRole("button", { name: /^Decode$/ }));
  expect(await screen.findByRole("alert")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  await screen.findByTestId("shared-calldata-tree");
  expect(mocks.decode).toHaveBeenCalledTimes(2);
});

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
  fireEvent.click(within(dialog).getByRole("button", { name: "Copy decoded JSON" }));
  expect(JSON.parse(mocks.copy.mock.calls.at(-1)![0])).toEqual({
    functionName: "transfer", signature: "transfer(address,uint256)", args: [], rawArgs: [],
  });
  expect(mocks.decode).toHaveBeenCalledWith({
    calldata: "0xa9059cbb",
    address,
    chainId: 8453,
  });
});
it("reuses the decoder editor in the modal and retains the transaction context in its result link", async () => {
  const recipient = "0x2222222222222222222222222222222222222222";
  const original = encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [recipient, 7n] });
  mocks.decode.mockResolvedValueOnce({
    functionName: "transfer", signature: "transfer(address,uint256)", rawArgs: [recipient, 7n], args: [
      { name: "recipient", type: "address", baseType: "address", rawValue: recipient, value: recipient },
      { name: "amount", type: "uint256", baseType: "uint256", rawValue: 7n, value: "7" },
    ],
  });
  render(page(`to=${address}&calldata=${original}&chainId=8453`));
  fireEvent.click(screen.getByRole("button", { name: /^Decode$/ }));
  const dialog = within(await screen.findByRole("dialog"));
  const edit = await dialog.findByRole("button", { name: "Edit calldata" });
  const copy = dialog.getByRole("button", { name: "Copy params" });
  expect(edit.compareDocumentPosition(copy) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(edit.parentElement!.parentElement!.contains(copy)).toBe(true);
  fireEvent.click(edit);
  expect(dialog.queryByRole("button", { name: "Copy params" })).toBeNull();
  expect(dialog.queryByRole("button", { name: "Copy decoded JSON" })).toBeNull();
  fireEvent.change(dialog.getByRole("textbox", { name: "args.1 amount" }), { target: { value: "42" } });
  fireEvent.click(dialog.getByRole("button", { name: "Encode new calldata" }));
  const encoded = encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [recipient, 42n] });
  expect((dialog.getByRole("textbox", { name: "Encoded calldata" }) as HTMLTextAreaElement).value).toBe(encoded);
  const link = dialog.getByRole("link", { name: "Decode result" });
  const url = new URL(link.getAttribute("href")!);
  expect(url.searchParams.get("address")).toBe(address);
  expect(url.searchParams.get("chainId")).toBe("8453");
  expect(url.searchParams.get("calldata")).toBe(encoded);
  expect(link.getAttribute("target")).toBe("_blank");
  expect((screen.getByLabelText("Calldata") as HTMLTextAreaElement).value).toBe(original);
  fireEvent.click(dialog.getByRole("button", { name: "Use new calldata" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  const updatedInput = screen.getByLabelText("Calldata") as HTMLTextAreaElement;
  expect(updatedInput.value).toBe(encoded);
  await waitFor(() => expect(updatedInput.getAttribute("data-calldata-updated")).toBe("true"));
  expect(mocks.scroll.mock.contexts).toContain(updatedInput);
  expect(mocks.scroll).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });
  await waitFor(() => expect(updatedInput.getAttribute("data-calldata-updated")).toBeNull(), { timeout: 2500 });
  expect((screen.getByLabelText("To Address") as HTMLInputElement).value).toBe(address);
  await waitFor(() => expect(mocks.urlUpdate.mock.lastCall?.[0].searchParams.get("calldata")).toBe(encoded));
  expect(mocks.urlUpdate.mock.lastCall?.[0].searchParams.get("chainId")).toBe("8453");
  expect(mocks.send).not.toHaveBeenCalled();
});

it("reuses a matching resolved recipient and resolves again when the name changes", async () => {
  const nextAddress = "0x2222222222222222222222222222222222222222";
  render(page("to=alice.gwei&calldata=0xa9059cbb&chainId=8453"));
  await screen.findByRole("link", { name: "Open recipient in Contract Explorer" });
  mocks.resolve.mockClear();
  fireEvent.click(screen.getByRole("button", { name: /^Decode$/ }));
  expect(await screen.findByTestId("shared-calldata-tree")).toBeTruthy();
  expect(mocks.resolve).not.toHaveBeenCalled();
  expect(mocks.decode.mock.lastCall?.[0]).toMatchObject({ address, chainId: 8453 });
  fireEvent.click(await screen.findByRole("button", { name: "Close" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  mocks.resolve.mockResolvedValue(nextAddress);
  fireEvent.change(screen.getByLabelText("To Address"), { target: { value: "bob.gwei" } });
  fireEvent.click(screen.getByRole("button", { name: /^Decode$/ }));
  await waitFor(() => expect(mocks.decode.mock.lastCall?.[0]).toMatchObject({ address: nextAddress, chainId: 8453 }));
  expect(mocks.resolve).toHaveBeenCalledWith("bob.gwei");
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
  fireEvent.click(
    screen.getByRole("button", { name: "Dismiss transaction status" })
  );
  expect(screen.queryByText("Switched to Base")).toBeNull();
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
  fireEvent.click(
    screen.getByRole("button", { name: "Dismiss transaction status" })
  );
  expect(screen.queryByText("Waiting for confirmation")).toBeNull();
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

it("loads the Base USDC transfer and Ethereum WETH deposit examples without requesting a transaction", async () => {
  connect(1);
  render(page(`to=${address}&calldata=0x1234&eth=10&chainId=1`));
  fireEvent.click(screen.getByRole("button", { name: /Transfer 5 USDC/ }));
  await screen.findByRole("button", { name: "Switch to Base" });
  expect((screen.getByLabelText("To Address") as HTMLInputElement).value).toBe("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913");
  expect((screen.getByLabelText("Value") as HTMLInputElement).value).toBe("0");
  const transfer = decodeFunctionData({ abi: erc20Abi,
    data: (screen.getByLabelText("Calldata") as HTMLTextAreaElement).value as `0x${string}` });
  expect(transfer.functionName).toBe("transfer");
  expect(transfer.args).toEqual(["0x63A556c75443b176b5A4078e929e38bEb37a1ff2", 5_000_000n]);
  await waitFor(() => expect(mocks.urlUpdate.mock.lastCall?.[0].searchParams.get("chainId")).toBe("8453"));
  fireEvent.click(screen.getByRole("button", { name: /Deposit 0.01 ETH/ }));
  await screen.findByRole("button", { name: "Send Transaction" });
  expect((screen.getByLabelText("To Address") as HTMLInputElement).value).toBe("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
  expect((screen.getByLabelText("Value") as HTMLInputElement).value).toBe("0.01");
  expect((screen.getByLabelText("Calldata") as HTMLTextAreaElement).value).toBe("0xd0e30db0");
  await waitFor(() => {
    const params = mocks.urlUpdate.mock.lastCall?.[0].searchParams;
    expect(params?.get("chainId")).toBe("1");
    expect(params?.get("eth")).toBe("0.01");
  });
  expect(mocks.send).not.toHaveBeenCalled();
  expect(mocks.deploy).not.toHaveBeenCalled();
  expect(mocks.switchNetwork).not.toHaveBeenCalled();
});

it("resets transaction fields, target chain, preview and URL parameters from the heading", async () => {
  connect(8453);
  render(page(`to=${address}&calldata=0xa9059cbb&eth=1.25&chainId=8453`));
  await screen.findByRole("region", { name: "Clear signing" });
  fireEvent.click(screen.getByRole("button", { name: "Reset transaction form" }));
  expect((screen.getByLabelText("To Address") as HTMLInputElement).value).toBe("");
  expect((screen.getByLabelText("Value") as HTMLInputElement).value).toBe("");
  expect((screen.getByLabelText("Calldata") as HTMLTextAreaElement).value).toBe("");
  expect(screen.getByText("Chain ID: 1")).toBeTruthy();
  expect(screen.queryByRole("region", { name: "Clear signing" })).toBeNull();
  expect(screen.getByRole("button", { name: "Switch to Ethereum" })).toBeTruthy();
  await waitFor(() => {
    const params = mocks.urlUpdate.mock.lastCall?.[0].searchParams;
    expect(params).toBeDefined();
    for (const key of ["to", "calldata", "eth", "chainId"]) expect(params.has(key)).toBe(false);
  });
  expect(mocks.send).not.toHaveBeenCalled();
  expect(mocks.switchNetwork).not.toHaveBeenCalled();
});

it("links the recipient beside the input to the selected-chain Contract Explorer and hides stale resolutions", async () => {
  render(page(`to=${address}&chainId=8453`));
  const link = screen.getByRole("link", { name: "Open recipient in Contract Explorer" });
  expect(link.getAttribute("href")).toBe(`/explorer/8453/${address}`);
  expect(link.getAttribute("target")).toBe("_blank");
  fireEvent.change(screen.getByLabelText("To Address"), { target: { value: "alice.wei" } });
  expect(screen.queryByRole("link", { name: "Open recipient in Contract Explorer" })).toBeNull();
  await waitFor(() => expect(screen.getByRole("link", { name: "Open recipient in Contract Explorer" }).getAttribute("href")).toBe(`/explorer/8453/${address}`));
  fireEvent.change(screen.getByLabelText("To Address"), { target: { value: "" } });
  expect(screen.queryByRole("link", { name: "Open recipient in Contract Explorer" })).toBeNull();
});

it("passes the current envelope through all Explorer links and clears stale calldata when editing", async () => {
  render(page(`to=${address}&calldata=0xa9059cbb&eth=1.25&chainId=8453`));
  const recipient = screen.getByRole("link", { name: "Open recipient in Contract Explorer" });
  const calldataEditor = screen.getByRole("link", { name: "Edit in Contract Explorer" });
  expect(calldataEditor.getAttribute("href")).toBe(recipient.getAttribute("href"));
  expect(calldataEditor.getAttribute("target")).toBe("_blank");
  const url = new URL(recipient.getAttribute("href")!, "https://eth.sh");
  expect(url.pathname).toBe(`/explorer/8453/${address}`);
  const params = new URLSearchParams(url.hash.slice(1));
  expect(params.get("call")).toBe("3");
  expect(params.get("data")).toBe("0xa9059cbb");
  expect(params.get("value")).toBe("1250000000000000000");
  fireEvent.change(screen.getByLabelText("Calldata"), { target: { value: "0xd0e30db0" } });
  expect(new URLSearchParams(new URL(recipient.getAttribute("href")!, "https://eth.sh").hash.slice(1)).get("data")).toBe("0xd0e30db0");
  expect(calldataEditor.getAttribute("href")).toBe(recipient.getAttribute("href"));
  fireEvent.change(screen.getByLabelText("Calldata"), { target: { value: "0xnothex" } });
  expect(recipient.getAttribute("href")).toBe(`/explorer/8453/${address}`);
  expect(calldataEditor.getAttribute("href")).toBe(recipient.getAttribute("href"));
});
