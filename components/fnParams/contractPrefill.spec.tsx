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
function show() {
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
      />
    </ChakraProvider>
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState(null, "", "/contract/1/" + address);
});
afterEach(cleanup);
it("pasted calldata fills only the matched overload on explicit decode; invalid input clears the selection", async () => {
  show();
  const data = new Interface(abi).encodeFunctionData("transfer(uint256)", [
    9007199254740993n,
  ]);
  fireEvent.change(
    screen.getByRole("textbox", { name: "Calldata to decode" }),
    { target: { value: data } }
  );
  expect(onPrefill).not.toHaveBeenCalledWith(
    expect.objectContaining({ signature: expect.anything() })
  );
  fireEvent.click(screen.getByRole("button", { name: "Decode into form" }));
  expect(onPrefill).toHaveBeenLastCalledWith(
    expect.objectContaining({
      signature: "transfer(uint256)",
      args: ["9007199254740993"],
      value: "0",
      abiMode: "contract",
    })
  );
  expect(screen.getByText(/Review only/)).toBeTruthy();
  fireEvent.change(
    screen.getByRole("textbox", { name: "Calldata to decode" }),
    { target: { value: "0xdeadbeef" } }
  );
  fireEvent.click(screen.getByRole("button", { name: "Decode into form" }));
  expect(onPrefill).toHaveBeenLastCalledWith(null);
  expect(await screen.findByRole("alert")).toBeTruthy();
});
it("restores a shared link without a click and fails closed for mismatching review signature/context", async () => {
  const data = new Interface(abi).encodeFunctionData(
    "transfer(address,uint256)",
    [address, 12]
  );
  const url = createContractCallLink(
    window.location.origin + "/contract/",
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
    createContractCallLink(window.location.origin + "/contract/", 1, address, {
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
    window.location.origin + "/contract/",
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
