import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { AbiCoder, Interface } from "ethers";
import { decodeUniversalRouter } from "@/lib/universalRouter";
import { CalldataTree } from "./components/CalldataTree";
vi.mock("@/components/decodedParams", () => ({
  AddressParam: ({ address }: any) => <span>{address}</span>,
  UintParam: ({ value }: any) => <span>{value}</span>,
  IntParam: ({ value }: any) => <span>{value}</span>,
  StringParam: ({ value }: any) => <span>{value}</span>,
}));
vi.mock("@/components/decodedParams/TreeView/TreeBytesParam", () => ({
  TreeBytesParam: ({ arg }: any) => (
    <input aria-label="Raw bytes value" readOnly value={arg.rawValue} />
  ),
}));
afterEach(cleanup);
const coder = AbiCoder.defaultAbiCoder();
const router = new Interface([
  "function execute(bytes commands,bytes[] inputs)",
]);
const token = "0x1111111111111111111111111111111111111111";
it("renders command/action names, narrow tuple values and raw toggles without exposing hook data as calls", async () => {
  const hook = "0x12345678";
  const pool =
    "(address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks)";
  const swap = coder.encode(
    [`(${pool},bool,uint128,uint128,bytes)`],
    [[[token, token, 3000, -60, token], true, 10, 9, hook]]
  );
  const data = router.encodeFunctionData("execute", [
    "0x90",
    [coder.encode(["bytes", "bytes[]"], ["0x06", [swap]])],
  ]);
  const result = await decodeUniversalRouter({
    calldata: data,
    depth: 0,
    generic: async () => {
      throw Error("Unexpected decoding of opaque bytes");
    },
  });
  expect(result).toBeTruthy();
  render(
    <ChakraProvider>
      <CalldataTree args={result!.args} functionName={result!.functionName} />
    </ChakraProvider>
  );
  const command = screen.getByRole("button", { name: "[0], V4_SWAP" });
  expect(command.getAttribute("aria-expanded")).toBe("true");
  expect(screen.getByText("Allow revert")).toBeTruthy();
  const action = screen.getByRole("button", {
    name: "[0], SWAP_EXACT_IN_SINGLE",
  });
  expect(action.getAttribute("aria-expanded")).toBe("true");
  expect(screen.getAllByText("uint128")).toHaveLength(2);
  expect(screen.getByText("hookData")).toBeTruthy();
  expect(screen.getByDisplayValue(hook)).toBeTruthy();
  expect(screen.queryByRole("button", { name: /hookData/ })).toBeNull();
  fireEvent.click(action);
  expect(action.getAttribute("aria-expanded")).toBe("false");
  fireEvent.click(action);
  const raw = screen.getAllByRole("button", { name: "Raw bytes" });
  fireEvent.click(raw[0]);
  expect(screen.getByRole("button", { name: "Hide raw" })).toBeTruthy();
});
it("shows unknown command status and retains its exact raw bytes", async () => {
  const result = await decodeUniversalRouter({
    calldata: router.encodeFunctionData("execute", ["0x3f", ["0xdeadbeef"]]),
    depth: 0,
    generic: async () => null,
  });
  render(
    <ChakraProvider>
      <CalldataTree args={result!.args} functionName="execute" />
    </ChakraProvider>
  );
  expect(screen.queryByText("Unknown command")).toBeNull();
  expect(screen.queryByText("inferred")).toBeNull();
  expect(screen.getByDisplayValue("0xdeadbeef")).toBeTruthy();
});
