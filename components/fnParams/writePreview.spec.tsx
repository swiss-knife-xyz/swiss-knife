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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
function write() { fireEvent.click(screen.getByRole("button", { name: "Write" })); }

it("requests the wallet immediately while simulation is pending, with identical arguments", async () => {
  const simulation = deferred<{ result: bigint }>();
  const wallet = deferred<string>();
  const receipt = deferred<{ status: string }>();
  simulate.mockReturnValue(simulation.promise);
  mocks.send.mockReturnValue(wallet.promise);
  mocks.receipt.mockReturnValue(receipt.promise);
  show(); fillGovernor(); write();
  expect(mocks.send).toHaveBeenCalledOnce();
  expect(simulate).toHaveBeenCalledOnce();
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.queryByRole("button", { name: "Continue to wallet" })).toBeNull();
  await screen.findByText("Confirm in your wallet");
  await screen.findByText("Fetching simulated return…");
  const request = simulate.mock.calls[0][0];
  expect(request).toMatchObject({ address: target, functionName: "propose", account: { address: mocks.account }, args: [[target], ["0"], ["0x"], "A mocked proposal"], value: 7n, chain: mainnet });
  expect(mocks.send.mock.calls[0][0]).toMatchObject({ to: target, account: request.account, chain: mainnet, value: 7n, data: encodeFunctionData({ abi: [governor], functionName: "propose", args: request.args }) });
  await act(async () => simulation.resolve({ result: proposalId }));
  expect(screen.getByRole("status").textContent).toContain(proposalId.toString());
  expect(screen.getByText("Function return value:")).toBeTruthy();
  await act(async () => wallet.resolve("0x1234"));
  await screen.findByText("Transaction submitted");
  expect(screen.getByRole("status").textContent).toContain(proposalId.toString());
  await act(async () => receipt.resolve({ status: "success" }));
  await screen.findByText("Transaction confirmed");
  expect(screen.getByRole("status").textContent).toContain(proposalId.toString());
});

it("keeps output-less writes on the existing wallet path", async () => {
  show({ func: { ...governor, outputs: [] } }); fillGovernor(); write();
  await waitFor(() => expect(mocks.send).toHaveBeenCalledOnce());
  expect(simulate).not.toHaveBeenCalled();
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(mocks.receipt).toHaveBeenCalledWith({}, { hash: "0x1234", chainId: 1 });
});

it.each(["execution reverted", "RPC unavailable", "could not decode result"])("shows unavailable simulation without blocking the wallet on %s", async message => {
  simulate.mockRejectedValueOnce(new Error(message));
  show(); fillGovernor(); write();
  await screen.findByText("Simulated return unavailable");
  expect(mocks.send).toHaveBeenCalledOnce();
  await screen.findByText("Transaction confirmed");
  expect(screen.queryByRole("dialog")).toBeNull();
});

it.each(["address", "chain", "account", "function", "client", "wallet network"])("discards simulation and wallet UI when %s changes", async change => {
  const wallet = deferred<string>();
  const simulation = deferred<{ result: bigint }>();
  mocks.send.mockReturnValue(wallet.promise);
  simulate.mockReturnValue(simulation.promise);
  const view = show(); fillGovernor(); write();
  await screen.findByText("Confirm in your wallet");
  const changed = { ...props };
  if (change === "address") changed.address = mocks.account;
  if (change === "chain") changed.chainId = 10;
  if (change === "account" || change === "wallet network") {
    if (change === "account") mocks.account = target;
    else mocks.walletChainId = 10;
    changed.index = 1;
  }
  if (change === "function") changed.func = { ...governor, name: "proposeAgain" };
  if (change === "client") changed.client = { ...client } as PublicClient;
  view.rerender(<ChakraProvider><ReadWriteFunction {...changed} /></ChakraProvider>);
  await act(async () => { simulation.resolve({ result: 99n }); wallet.resolve("0x1234"); });
  expect(screen.queryByRole("region", { name: "Transaction status" })).toBeNull();
  expect(mocks.send).toHaveBeenCalledOnce();
});

it.each(["argument", "value"])("ignores out-of-order simulations after %s changes", async change => {
  const old = deferred<{ result: bigint }>();
  simulate.mockReturnValueOnce(old.promise);
  show(); fillGovernor(); write();
  await screen.findByText("Transaction confirmed");
  const fields = screen.getAllByRole("textbox");
  fireEvent.change(fields[change === "value" ? 0 : 4], { target: { value: change === "value" ? "0.000000000000000009" : "Updated proposal" } });
  write();
  await waitFor(() => expect(simulate).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.getByRole("status").textContent).toContain(proposalId.toString()));
  await act(async () => old.resolve({ result: 99n }));
  expect(screen.getByRole("status").textContent).toContain(proposalId.toString());
  const request = simulate.mock.calls[1][0];
  expect(mocks.send.mock.calls[1][0]).toMatchObject({ value: request.value, data: encodeFunctionData({ abi: [governor], functionName: "propose", args: request.args }) });
});

it("rejects a wallet on the wrong chain without simulation or sending", async () => {
  mocks.walletChainId = 10;
  show(); fillGovernor(); write();
  await screen.findByText(/Wallet account or network changed/);
  expect(simulate).not.toHaveBeenCalled(); expect(mocks.send).not.toHaveBeenCalled();
});

it("renders named multiple and nested outputs without losing integer precision", async () => {
  const func = parseAbi(["function result() returns (uint256 id, (uint256 count,bool active) details, uint256[] values)"])[0];
  simulate.mockResolvedValue({ result: [proposalId, { count: proposalId, active: false }, [0n, proposalId]] });
  show({ func }); write();
  await waitFor(() => expect(screen.getByRole("status").textContent).toContain("id (uint256)"));
  const status = screen.getByRole("status");
  expect(status.textContent).toContain("details (tuple)");
  expect(status.textContent).toContain('"active": false');
  expect(status.textContent?.match(new RegExp(proposalId.toString(), "g"))).toHaveLength(3);
  expect(mocks.send).toHaveBeenCalledOnce();
});

it.each([
  ["uint256", 0n, '"0"'], ["bool", false, "false"],
  ["bytes", "0x", '"0x"'], ["string", "", '""'],
])("shows a falsy %s result", async (type, result, displayed) => {
  simulate.mockResolvedValue({ result });
  show({ func: parseAbi([`function result() returns (${type})`])[0] }); write();
  await waitFor(() => expect(screen.getByRole("status").textContent).toContain(displayed));
  expect(screen.getByRole("status").textContent).not.toContain("Output 1");
  expect(mocks.send).toHaveBeenCalledOnce();
});

it("does not resurrect a pending simulation after unmount", async () => {
  const simulation = deferred<{ result: bigint }>();
  simulate.mockReturnValueOnce(simulation.promise);
  const view = show(); fillGovernor(); write();
  await waitFor(() => expect(simulate).toHaveBeenCalledOnce());
  view.unmount();
  await act(async () => simulation.resolve({ result: proposalId }));
  expect(screen.queryByRole("region", { name: "Transaction status" })).toBeNull();
  expect(mocks.send).toHaveBeenCalledOnce();
});

it("rejects a simulation client from another chain", async () => {
  show({ client: { ...client, chain: { ...mainnet, id: 10 } } as PublicClient }); fillGovernor(); write();
  await screen.findByText(/Simulation client does not match/);
  expect(simulate).not.toHaveBeenCalled(); expect(mocks.send).not.toHaveBeenCalled();
});

it("shows wallet rejection and prevents duplicate sends while confirmation is pending", async () => {
  const wallet = deferred<string>();
  mocks.send.mockReturnValueOnce(wallet.promise);
  show(); fillGovernor();
  const button = screen.getByRole("button", { name: "Write" });
  fireEvent.click(button);
  fireEvent.click(button);
  await screen.findByText("Confirm in your wallet");
  expect(mocks.send).toHaveBeenCalledOnce();
  await act(async () => wallet.reject(Object.assign(new Error("User rejected the request"), { code: 4001 })));
  await screen.findByText("Request rejected");
  expect(screen.queryByRole("button", { name: "Continue to wallet" })).toBeNull();
});


it("does not label a reverted receipt as confirmed", async () => {
  mocks.receipt.mockResolvedValueOnce({ status: "reverted" });
  show(); fillGovernor(); write();
  await screen.findByText("Transaction failed");
  expect(screen.queryByText("Transaction confirmed")).toBeNull();
  expect(mocks.send).toHaveBeenCalledOnce();
});
