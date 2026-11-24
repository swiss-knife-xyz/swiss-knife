import React from "react";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import {
  act,
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { Interface } from "ethers";
import { ContractCallPrefill } from "./ContractCallPrefill";
import { createContractCallLink } from "@/lib/contractCall";

const txMocks = vi.hoisted(() => ({ getTransaction: vi.fn(), getClient: vi.fn() }));
vi.mock("@/lib/publicClient", () => ({ getPublicClient: txMocks.getClient }));
vi.mock("@/components/NetworkSelect", () => ({
  NetworkSelect: ({ chainId, onChange, ariaLabel, isDisabled }: any) => (
    <select aria-label={ariaLabel} value={chainId} disabled={isDisabled}
      onChange={(event) => onChange(Number(event.target.value))}>
      <option value={1}>Ethereum</option><option value={8453}>Base</option><option value={42161}>Arbitrum One</option>
    </select>
  ),
}));

const abi = JSON.parse(
  new Interface([
    "function transfer(address to,uint256 amount) payable",
    "function transfer(uint256 amount)",
  ]).formatJson()
);
const address = "0x0000000000000000000000000000000000000001";
const onPrefill = vi.fn();
function show(restoreFromUrl = true, implementationAbi: typeof abi | null = null, chainId = 1) {
  return render(
    <ChakraProvider>
      <ContractCallPrefill
        chainId={chainId}
        address={address}
        selectedAbi={abi}
        contractAbi={abi}
        implementationAbi={implementationAbi}
        abiMode="contract"
        onPrefill={onPrefill}
        restoreFromUrl={restoreFromUrl}
      />
    </ChakraProvider>
  );
}
async function openRawCalldata() {
  if (!screen.queryByRole("dialog", { name: "Fill from tx or calldata" })) {
    fireEvent.click(await screen.findByRole("button", { name: "Fill from tx or calldata" }));
  }
  return screen.findByRole("textbox", { name: "Calldata to decode" });
}

beforeEach(() => {
  vi.clearAllMocks();
  txMocks.getClient.mockReturnValue({ getTransaction: txMocks.getTransaction });
  txMocks.getTransaction.mockResolvedValue({
    input: new Interface(abi).encodeFunctionData("transfer(address,uint256)", [address, 5000000n]),
    value: 10000000000000000n,
  });
  window.history.replaceState(null, "", "/explorer/1/" + address);
});
afterEach(cleanup);
it("pasted calldata fills only the matched overload on explicit decode; invalid input clears the selection", async () => {
  show();
  expect(screen.queryByRole("textbox", { name: "Calldata to decode" })).toBeNull();
  const data = new Interface(abi).encodeFunctionData("transfer(uint256)", [
    9007199254740993n,
  ]);
  fireEvent.change(
    await openRawCalldata(),
    { target: { value: data } }
  );
  expect(onPrefill).not.toHaveBeenCalledWith(
    expect.objectContaining({ signature: expect.anything() })
  );
  fireEvent.click(screen.getByRole("button", { name: "Fill parameters" }));
  await waitFor(() => {
  expect(onPrefill).toHaveBeenLastCalledWith(
    expect.objectContaining({
      signature: "transfer(uint256)",
      args: ["9007199254740993"],
      value: "0",
      abiMode: "contract",
    }),
    expect.any(Function)
  );
  });
  expect(screen.getByRole("button", { name: /Decoding…/ }).hasAttribute("disabled")).toBe(true);
  expect(screen.getByRole("dialog", { name: "Fill from tx or calldata" })).toBeTruthy();
  const onScrollStart = onPrefill.mock.lastCall?.[1];
  onScrollStart();
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Fill from tx or calldata" })).toBeNull());
  expect(screen.queryByText(/Review only/)).toBeNull();
  fireEvent.change(
    await openRawCalldata(),
    { target: { value: "0xdeadbeef" } }
  );
  fireEvent.click(screen.getByRole("button", { name: "Fill parameters" }));
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(onPrefill).toHaveBeenLastCalledWith(null);
  expect(screen.getByRole("dialog", { name: "Fill from tx or calldata" })).toBeTruthy();
});
it("restores a shared link without a click and fails closed for mismatching review signature/context", async () => {
  const data = new Interface(abi).encodeFunctionData(
    "transfer(address,uint256)",
    [address, 12]
  );
  const url = createContractCallLink(
    window.location.origin + "/explorer/",
    1,
    address,
    {
      data,
      value: "23",
      abiMode: "contract",
      signature: "transfer(address,uint256)",
    }
  );
  window.history.replaceState(null, "", url);
  show();
  await waitFor(() =>
    expect(onPrefill).toHaveBeenLastCalledWith(
      expect.objectContaining({ args: [address, "12"], value: "23" })
    )
  );
  window.history.replaceState(
    null,
    "",
    url.replace("abi=contract", "abi=implementation")
  );
  window.dispatchEvent(new HashChangeEvent("hashchange"));
  await waitFor(() => expect(onPrefill).toHaveBeenLastCalledWith(null));
  expect(screen.getByRole("alert").textContent).toMatch(/ABI context/i);
});

it("rejects a nonpayable overload with shared value even if a same-named payable overload exists", async () => {
  const data = new Interface(abi).encodeFunctionData("transfer(uint256)", [12]);
  window.history.replaceState(
    null,
    "",
    createContractCallLink(window.location.origin + "/explorer/", 1, address, {
      data,
      value: "1",
      abiMode: "contract",
      signature: "transfer(uint256)",
    })
  );
  show();
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(onPrefill).toHaveBeenLastCalledWith(null);
});
it("rejects a tampered shared signature and unsupported version without prefill", async () => {
  const data = new Interface(abi).encodeFunctionData("transfer(uint256)", [12]);
  const url = createContractCallLink(
    window.location.origin + "/explorer/",
    1,
    address,
    { data, value: "0", abiMode: "contract", signature: "wrong(uint256)" }
  );
  window.history.replaceState(null, "", url);
  show();
  expect((await screen.findByRole("alert")).textContent).toMatch(/signature/i);
  expect(onPrefill).toHaveBeenLastCalledWith(null);
  window.history.replaceState(null, "", url.replace("call=1", "call=2"));
  window.dispatchEvent(new HashChangeEvent("hashchange"));
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toMatch(/unsupported/i)
  );
});


it("closes without applying calldata and returns focus to the toolbar button", async () => {
  show();
  const trigger = screen.getByRole("button", { name: "Fill from tx or calldata" });
  trigger.focus();
  const input = await openRawCalldata();
  fireEvent.change(input, { target: { value: new Interface(abi).encodeFunctionData("transfer(uint256)", [42]) } });
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await waitFor(() => expect(document.activeElement).toBe(trigger));
  expect(onPrefill).not.toHaveBeenCalledWith(expect.objectContaining({ signature: expect.anything() }));
});


it("does not import the original page fragment into a newly opened address tab", async () => {
  const data = new Interface(abi).encodeFunctionData("transfer(uint256)", [37]);
  const url = createContractCallLink(window.location.origin + "/explorer/", 1, address, {
    data, value: "0", abiMode: "contract", signature: "transfer(uint256)",
  });
  window.history.replaceState(null, "", url);
  show(false);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
  expect(onPrefill).not.toHaveBeenCalled();
  fireEvent.change(await openRawCalldata(), { target: { value: data } });
  fireEvent.click(screen.getByRole("button", { name: "Fill parameters" }));
  await waitFor(() => expect(onPrefill).toHaveBeenCalledWith(
    expect.objectContaining({ signature: "transfer(uint256)", args: ["37"] }), expect.any(Function)
  ));
});

it.each([false, true])("restores raw calldata and native value using the loaded ABI (proxy: %s)", async (proxy) => {
  const data = new Interface(abi).encodeFunctionData("transfer(address,uint256)", [address, 5_000_000n]);
  window.history.replaceState({}, "", createContractCallLink(window.location.origin + "/explorer/", 1, address, {
    data, value: "10000000000000000",
  }));
  show(true, proxy ? abi : null);
  await waitFor(() => expect(onPrefill).toHaveBeenCalledWith(expect.objectContaining({
    signature: "transfer(address,uint256)", args: [address, "5000000"],
    value: "10000000000000000", abiMode: proxy ? "implementation" : "contract",
  })));
  expect(screen.queryByRole("dialog")).toBeNull();
});

const txHash = `0x${"ab".repeat(32)}`;
async function transactionTab() {
  fireEvent.click(await screen.findByRole("button", { name: "Fill from tx or calldata" }));
  fireEvent.click(screen.getByRole("tab", { name: "From transaction" }));
  return screen.findByRole("textbox", { name: "Transaction hash or explorer URL" });
}
it("fetches a transaction hash on the chosen network and imports its arguments and native value", async () => {
  show();
  const input = await transactionTab();
  fireEvent.change(input, { target: { value: txHash } });
  fireEvent.change(screen.getByRole("combobox", { name: "Transaction network" }), { target: { value: "8453" } });
  expect(txMocks.getTransaction).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Fill parameters" }));
  await waitFor(() => expect(onPrefill).toHaveBeenCalledWith(expect.objectContaining({
    signature: "transfer(address,uint256)", args: [address, "5000000"], value: "10000000000000000",
  }), expect.any(Function)));
  expect(txMocks.getClient).toHaveBeenCalledWith(8453);
  expect(txMocks.getTransaction).toHaveBeenCalledExactlyOnceWith({ hash: txHash });
});
it("automatically fetches a pasted explorer URL and selects its chain", async () => {
  show();
  const input = await transactionTab();
  fireEvent.paste(input, { clipboardData: { getData: () => `https://arbiscan.io/tx/${txHash}` } });
  await waitFor(() => expect(txMocks.getTransaction).toHaveBeenCalledExactlyOnceWith({ hash: txHash }));
  expect(txMocks.getClient).toHaveBeenCalledWith(42161);
  expect((screen.getByRole("combobox", { name: "Transaction network" }) as HTMLSelectElement).value).toBe("42161");
  await waitFor(() => expect(onPrefill).toHaveBeenCalledWith(expect.objectContaining({ signature: "transfer(address,uint256)" }), expect.any(Function)));
});
it("rejects invalid transaction input without an RPC call", async () => {
  show();
  const input = await transactionTab();
  fireEvent.change(input, { target: { value: "0x1234" } });
  fireEvent.click(screen.getByRole("button", { name: "Fill parameters" }));
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(txMocks.getTransaction).not.toHaveBeenCalled();
});
it("ignores a transaction response after closing the modal", async () => {
  let finish!: (value: any) => void;
  txMocks.getTransaction.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  show();
  const input = await transactionTab();
  fireEvent.change(input, { target: { value: txHash } });
  fireEvent.click(screen.getByRole("button", { name: "Fill parameters" }));
  await waitFor(() => expect(txMocks.getTransaction).toHaveBeenCalled());
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  onPrefill.mockClear();
  await act(async () => { finish({ input: new Interface(abi).encodeFunctionData("transfer(uint256)", [37]), value: 0n }); });
  expect(onPrefill).not.toHaveBeenCalled();
});

it("defaults to the open contract's chain on first open and again after reopening", async () => {
  show(true, null, 8453);
  await transactionTab();
  const network = () => screen.getByRole("combobox", { name: "Transaction network" }) as HTMLSelectElement;
  expect(network().value).toBe("8453");
  fireEvent.change(network(), { target: { value: "42161" } });
  expect(network().value).toBe("42161");
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  fireEvent.click(screen.getByRole("button", { name: "Fill from tx or calldata" }));
  await waitFor(() => expect(network().value).toBe("8453"));
});

it("focuses each tab's input after pointer activation, including the already selected tab", async () => {
  show();
  fireEvent.click(screen.getByRole("button", { name: "Fill from tx or calldata" }));
  const calldata = await screen.findByRole("textbox", { name: "Calldata to decode" });
  await waitFor(() => expect(document.activeElement).toBe(calldata));
  for (const name of ["From transaction", "Calldata", "Calldata"]) {
    const tab = screen.getByRole("tab", { name });
    fireEvent.mouseDown(tab);
    tab.focus();
    fireEvent.mouseUp(tab);
    fireEvent.click(tab);
    const input = screen.getByRole("textbox", { name: name === "Calldata" ? "Calldata to decode" : "Transaction hash or explorer URL" });
    await waitFor(() => expect(document.activeElement).toBe(input));
  }
});
