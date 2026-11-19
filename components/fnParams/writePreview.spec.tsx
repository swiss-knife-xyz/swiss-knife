import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { encodeFunctionData, parseAbi, type PublicClient } from "viem";
import { mainnet } from "viem/chains";
import { ReadWriteFunction } from "./ReadWriteFunction";

const mocks = vi.hoisted(() => ({ send: vi.fn(), receipt: vi.fn(), account: "0x0000000000000000000000000000000000000002", walletChainId: 1 }));
vi.mock("wagmi", () => ({
  useAccount: () => ({ address: mocks.account, chain: mainnet }),
  useWalletClient: () => ({ data: { account: { address: mocks.account, type: "json-rpc" }, chain: { ...mainnet, id: mocks.walletChainId }, sendTransaction: mocks.send } }),
}));
vi.mock("wagmi/actions", () => ({ waitForTransactionReceipt: mocks.receipt }));
vi.mock("@/app/providers", () => ({ config: {} }));
vi.mock("@/components/ConnectButton", () => ({ ConnectButton: () => null }));
vi.mock("@/components/AddressBook", () => ({ AddressBookButton: () => null }));
vi.mock("@/lib/publicClient", () => ({ getPublicClient: () => ({}) }));
vi.mock("@/lib/nameResolution", () => ({ resolveNameToAddress: vi.fn(), resolveAddressToName: vi.fn(), getNameAvatar: vi.fn(), isResolvableName: () => false }));
vi.mock("@/utils/addressLabels", () => ({ fetchAddressLabels: async () => [] }));

const governor = parseAbi(["function propose(address[] targets,uint256[] values,bytes[] calldatas,string description) payable returns (uint256 proposalId)"])[0];
const proposalId = 12345678901234567890123456789012345678901234567890n;
const simulate = vi.fn();
const client = { chain: mainnet, simulateContract: simulate } as unknown as PublicClient;
const target = "0x0000000000000000000000000000000000000001";
const props: React.ComponentProps<typeof ReadWriteFunction> = { index: 0, type: "write", client, address: target, chainId: 1, func: governor };
function show(overrides: Partial<typeof props> = {}) {
  return render(<ChakraProvider><ReadWriteFunction {...props} {...overrides} /></ChakraProvider>);
}
function fillGovernor() {
  screen.getAllByRole("button", { name: "+ Add" }).forEach(button => fireEvent.click(button));
  const fields = screen.getAllByRole("textbox");
  // Payable value is the first field; arguments follow in ABI order.
  ["0.000000000000000007", target, "0", "0x", "A mocked proposal"].forEach((value, i) => fireEvent.change(fields[i], { target: { value } }));
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.account = "0x0000000000000000000000000000000000000002";
  mocks.walletChainId = 1;
  simulate.mockResolvedValue({ result: proposalId });
  mocks.send.mockResolvedValue("0x1234");
  mocks.receipt.mockResolvedValue({ status: "success" });
  HTMLElement.prototype.scrollTo = vi.fn();
  vi.stubGlobal("localStorage", { getItem: () => null, setItem() {} });
  vi.stubGlobal("matchMedia", () => ({ matches: false, addListener() {}, removeListener() {} }));
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("No network permitted"); }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("previews Governor.propose's exact uint256 before wallet confirmation with identical call context", async () => {
  show();
  fillGovernor();
  fireEvent.click(screen.getByRole("button", { name: "Write" }));
  await waitFor(() => expect(simulate).toHaveBeenCalledOnce());
  const request = simulate.mock.calls[0][0];
  expect(request).toMatchObject({ address: target, functionName: "propose", account: { address: mocks.account }, args: [[target], ["0"], ["0x"], "A mocked proposal"], value: 7n, chain: mainnet });
  expect(mocks.send).not.toHaveBeenCalled();
  const dialog = await screen.findByRole("dialog");
  expect(dialog.textContent).toContain("Predicted return (simulation)");
  expect(dialog.textContent).toContain(proposalId.toString());
  expect(dialog.textContent).toMatch(/not a receipt|not.*guarantee/i);
  fireEvent.click(screen.getByRole("button", { name: "Continue to wallet" }));
  await waitFor(() => expect(mocks.send).toHaveBeenCalledOnce());
  expect(mocks.send.mock.calls[0][0]).toMatchObject({ to: target, account: request.account, chain: mainnet, value: 7n, data: encodeFunctionData({ abi: [governor], functionName: "propose", args: request.args }) });
});

it("does not send when the preview is cancelled", async () => {
  show(); fillGovernor();
  fireEvent.click(screen.getByRole("button", { name: "Write" }));
  await screen.findByRole("dialog");
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(mocks.send).not.toHaveBeenCalled();
});

it("keeps output-less writes on the existing wallet path", async () => {
  show({ func: { ...governor, outputs: [] } }); fillGovernor();
  fireEvent.click(screen.getByRole("button", { name: "Write" }));
  await waitFor(() => expect(mocks.send).toHaveBeenCalledOnce());
  expect(simulate).not.toHaveBeenCalled();
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(mocks.receipt).toHaveBeenCalledWith({}, { hash: "0x1234", chainId: 1 });
});

it.each(["execution reverted", "RPC unavailable", "could not decode result"])("fails closed on %s and allows retry", async (message) => {
  simulate.mockRejectedValueOnce(new Error(message));
  show(); fillGovernor();
  fireEvent.click(screen.getByRole("button", { name: "Write" }));
  await screen.findByText(new RegExp(message));
  expect(mocks.send).not.toHaveBeenCalled();
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Write" }));
  await screen.findByRole("dialog");
  expect(simulate).toHaveBeenCalledTimes(2);
});

it.each(["address", "chain", "account", "function", "client", "wallet network"])("invalidates a displayed preview after %s changes", async (change) => {
  const view = show(); fillGovernor();
  fireEvent.click(screen.getByRole("button", { name: "Write" }));
  await screen.findByRole("dialog");
  const changed = { ...props };
  if (change === "address") changed.address = mocks.account;
  if (change === "chain") changed.chainId = 10;
  if (change === "account" || change === "wallet network") {
    if (change === "account") mocks.account = target;
    else mocks.walletChainId = 10;
    // A real wagmi subscription schedules a render despite React.memo. The
    // hook mock needs an unrelated prop change to exercise that same render.
    changed.index = 1;
  }
  if (change === "function") changed.func = { ...governor, name: "proposeAgain" };
  if (change === "client") changed.client = { ...client } as PublicClient;
  view.rerender(<ChakraProvider><ReadWriteFunction {...changed} /></ChakraProvider>);
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(mocks.send).not.toHaveBeenCalled();
});

it.each(["argument", "value"])("ignores an old simulation after changing %s, including out-of-order completion", async (change) => {
  let resolveOld!: (value: { result: bigint }) => void;
  simulate.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
  show(); fillGovernor();
  fireEvent.click(screen.getByRole("button", { name: "Write" }));
  await waitFor(() => expect(simulate).toHaveBeenCalledOnce());
  const fields = screen.getAllByRole("textbox");
  fireEvent.change(fields[change === "value" ? 0 : 4], { target: { value: change === "value" ? "0.000000000000000009" : "Updated proposal" } });
  fireEvent.click(screen.getByRole("button", { name: "Write" }));
  await screen.findByRole("dialog");
  await act(async () => resolveOld({ result: 99n }));
  expect(screen.getByRole("dialog").textContent).toContain(proposalId.toString());
  fireEvent.click(screen.getByRole("button", { name: "Continue to wallet" }));
  await waitFor(() => expect(mocks.send).toHaveBeenCalledOnce());
  const request = simulate.mock.calls[1][0];
  expect(mocks.send.mock.calls[0][0]).toMatchObject({ value: request.value, data: encodeFunctionData({ abi: [governor], functionName: "propose", args: request.args }) });
});

it("rejects a wallet on the wrong chain without simulation or sending", async () => {
  mocks.walletChainId = 10;
  show(); fillGovernor();
  fireEvent.click(screen.getByRole("button", { name: "Write" }));
  await screen.findByText(/Wallet account or network changed/);
  expect(simulate).not.toHaveBeenCalled(); expect(mocks.send).not.toHaveBeenCalled();
});

it("renders named multiple and nested outputs without losing integer precision", async () => {
  const func = parseAbi(["function result() returns (uint256 id, (uint256 count,bool active) details, uint256[] values)"])[0];
  simulate.mockResolvedValue({ result: [proposalId, { count: proposalId, active: false }, [0n, proposalId]] });
  show({ func });
  fireEvent.click(screen.getByRole("button", { name: "Write" }));
  const dialog = await screen.findByRole("dialog");
  expect(dialog.textContent).toContain("id (uint256)");
  expect(dialog.textContent).toContain("details (tuple)");
  expect(dialog.textContent).toContain('"active": false');
  expect(dialog.textContent?.match(new RegExp(proposalId.toString(), "g"))).toHaveLength(3);
  expect(mocks.send).not.toHaveBeenCalled();
});

it.each([
  ["uint256", 0n, '"0"'],
  ["bool", false, "false"],
  ["bytes", "0x", '"0x"'],
  ["string", "", '""'],
])("shows a falsy %s result instead of hiding the preview", async (type, result, displayed) => {
  simulate.mockResolvedValue({ result });
  show({ func: parseAbi([`function result() returns (${type})`])[0] });
  fireEvent.click(screen.getByRole("button", { name: "Write" }));
  await screen.findByRole("dialog");
  expect(screen.getByRole("status").textContent).toContain(displayed);
  expect(mocks.send).not.toHaveBeenCalled();
});

it("does not resurrect a pending preview after unmount", async () => {
  let finish!: (value: { result: bigint }) => void;
  simulate.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const view = show(); fillGovernor();
  fireEvent.click(screen.getByRole("button", { name: "Write" }));
  await waitFor(() => expect(simulate).toHaveBeenCalledOnce());
  view.unmount();
  await act(async () => finish({ result: proposalId }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(mocks.send).not.toHaveBeenCalled();
});

it("rejects a simulation client from another chain", async () => {
  show({ client: { ...client, chain: { ...mainnet, id: 10 } } as PublicClient }); fillGovernor();
  fireEvent.click(screen.getByRole("button", { name: "Write" }));
  await screen.findByText(/Simulation client does not match/);
  expect(simulate).not.toHaveBeenCalled();
  expect(mocks.send).not.toHaveBeenCalled();
});
