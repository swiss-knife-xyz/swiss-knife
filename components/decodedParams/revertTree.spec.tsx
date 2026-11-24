import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { CalldataTree } from "./CalldataTree";
vi.mock("@/components/decodedParams", () => ({
  AddressParam: ({ address }: any) => <span>{address}</span>,
  UintParam: ({ value }: any) => <span>{String(value)}</span>,
  IntParam: ({ value }: any) => <span>{String(value)}</span>,
  StringParam: ({ value }: any) => <span>{value}</span>,
}));
vi.mock("@/components/decodedParams/TreeBytesParam", () => ({ TreeBytesParam: () => <span>Raw bytes</span> }));
afterEach(cleanup);
it("labels errors and explains panic codes alongside existing typed parameters", () => {
  render(<ChakraProvider><CalldataTree kind="revert" functionName="Panic" decodeNote="Panic 0x11: Arithmetic overflow or underflow." args={[{ name: "code", baseType: "uint256", type: "uint256", value: "17", rawValue: "17" }]} /></ChakraProvider>);
  expect(screen.getByText("Revert")).toBeTruthy();
  expect(screen.getByText("Panic()")).toBeTruthy();
  expect(screen.getByText("Panic 0x11: Arithmetic overflow or underflow.")).toBeTruthy();
  expect(screen.getByText("17")).toBeTruthy();
});
it("does not label ordinary functions as reverts", () => {
  render(<ChakraProvider><CalldataTree functionName="transfer" args={[]} /></ChakraProvider>);
  expect(screen.queryByText("Revert")).toBeNull();
  expect(screen.getByText("transfer()")).toBeTruthy();
});
