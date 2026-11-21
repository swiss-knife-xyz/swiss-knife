import React from "react";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import {
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

const abi = JSON.parse(
  new Interface([
    "function transfer(address to,uint256 amount) payable",
    "function transfer(uint256 amount)",
  ]).formatJson()
);
const address = "0x0000000000000000000000000000000000000001";
const onPrefill = vi.fn();
function show(restoreFromUrl = true) {
  return render(
    <ChakraProvider>
      <ContractCallPrefill
        chainId={1}
        address={address}
        selectedAbi={abi}
        contractAbi={abi}
        implementationAbi={null}
        abiMode="contract"
        onPrefill={onPrefill}
        restoreFromUrl={restoreFromUrl}
      />
    </ChakraProvider>
  );
}
async function openRawCalldata() {
  if (!screen.queryByRole("dialog", { name: "Enter raw calldata" })) {
    fireEvent.click(await screen.findByRole("button", { name: "Enter raw calldata" }));
  }
  return screen.findByRole("textbox", { name: "Calldata to decode" });
}

beforeEach(() => {
  vi.clearAllMocks();
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
  expect(screen.getByRole("dialog", { name: "Enter raw calldata" })).toBeTruthy();
  const onScrollStart = onPrefill.mock.lastCall?.[1];
  onScrollStart();
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Enter raw calldata" })).toBeNull());
  expect(screen.queryByText(/Review only/)).toBeNull();
  fireEvent.change(
    await openRawCalldata(),
    { target: { value: "0xdeadbeef" } }
  );
  fireEvent.click(screen.getByRole("button", { name: "Fill parameters" }));
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(onPrefill).toHaveBeenLastCalledWith(null);
  expect(screen.getByRole("dialog", { name: "Enter raw calldata" })).toBeTruthy();
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
  const trigger = screen.getByRole("button", { name: "Enter raw calldata" });
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
