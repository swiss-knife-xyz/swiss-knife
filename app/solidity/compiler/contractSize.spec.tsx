import React from "react";
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import {
  bytecodeSize,
  INITCODE_SIZE_LIMIT,
  RUNTIME_SIZE_LIMIT,
  sizeStatus,
} from "@/lib/solidity/contractSize";
import { ContractSize } from "./ContractSize";

afterEach(cleanup);
it("counts bytes with optional prefixes, empty contracts and solc library placeholders", () => {
  expect(bytecodeSize("0x60016000")).toBe(4);
  expect(bytecodeSize("60016000")).toBe(4);
  expect(bytecodeSize("")).toBe(0);
  expect(bytecodeSize("0x")).toBe(0);
  expect(bytecodeSize(`60__$${"a".repeat(34)}$__00`)).toBe(22);
  expect(bytecodeSize(`__${"Library".padEnd(36, "_")}__`)).toBe(20);
  expect(bytecodeSize("123")).toBeNull();
  expect(bytecodeSize("0xzz")).toBeNull();
});
it("uses strict upper boundaries and warns from 90 percent", () => {
  for (const limit of [RUNTIME_SIZE_LIMIT, INITCODE_SIZE_LIMIT]) {
    expect(sizeStatus(Math.ceil(limit * 0.9) - 1, limit)).toBe("normal");
    expect(sizeStatus(Math.ceil(limit * 0.9), limit)).toBe("near");
    expect(sizeStatus(limit, limit)).toBe("near");
    expect(sizeStatus(limit + 1, limit)).toBe("over");
  }
});
it("shows compact creation/runtime metrics and over-limit warnings without expanding ABI", () => {
  render(
    <ChakraProvider>
      <ContractSize
        contract={{
          name: "Big",
          sourcePath: "Big.sol",
          abi: [],
          bytecode: "60".repeat(INITCODE_SIZE_LIMIT + 1),
          deployedBytecode: "60".repeat(RUNTIME_SIZE_LIMIT + 1),
        }}
      />
    </ChakraProvider>
  );
  expect(screen.getByText("24,577 / 24,576 B")).toBeTruthy();
  expect(screen.getByText("49,153 / 49,152 B")).toBeTruthy();
  expect(screen.getByText("1 byte over EIP-170")).toBeTruthy();
  expect(screen.getByText("1 byte over EIP-3860")).toBeTruthy();
  expect(screen.getAllByRole("progressbar")).toHaveLength(2);
});
