import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { TraceCallTree } from "./TraceCallTree";
import { normalizeTrace } from "@/lib/tracer/model";
import { demoTrace } from "@/lib/tracer/demo";
afterEach(cleanup);
const from = `0x${"11".repeat(20)}`;
it("passes rollback context to successful descendants and supports keyboard disclosure", () => {
  const root = normalizeTrace({
    type: "CALL",
    from,
    error: "execution reverted",
    calls: [{ type: "DELEGATECALL", from, to: from }],
  }).call;
  const onSelect = vi.fn();
  render(
    <ChakraProvider>
      <TraceCallTree root={root} selectedId="0" onSelect={onSelect} />
    </ChakraProvider>
  );
  expect(screen.getByText("Rolled back")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Select call 0.0" }));
  expect(onSelect).toHaveBeenCalledWith(root.calls[0], true);
  onSelect.mockClear();
  fireEvent.keyDown(screen.getByRole("button", { name: "Select call 0" }), {
    key: "Enter",
  });
  expect(onSelect).toHaveBeenCalledWith(root, true);
  expect(screen.getByRole("button", { name: "Select call 0.0" })).toBeTruthy();
  onSelect.mockClear();
  fireEvent.click(screen.getByRole("button", { name: "Collapse call 0" }));
  expect(onSelect).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: "Select call 0.0" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Expand all" }));
  expect(screen.getByRole("button", { name: "Select call 0.0" })).toBeTruthy();
  expect(
    screen
      .getByRole("button", { name: "Collapse call 0" })
      .getAttribute("aria-expanded")
  ).toBe("true");
  expect(screen.queryByText("Inspect")).toBeNull();
});
it("searches collapsed descendants while retaining ancestors and restores disclosures when cleared", () => {
  render(
    <ChakraProvider>
      <TraceCallTree root={demoTrace.call} selectedId="0" onSelect={() => {}} />
    </ChakraProvider>
  );
  fireEvent.click(screen.getByRole("button", { name: "Collapse all" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Search calls" }), {
    target: { value: "0x70a08231" },
  });
  expect(screen.getByRole("button", { name: "Select call 0.0" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Select call 0" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Select call 0.1" })).toBeNull();
  fireEvent.change(screen.getByRole("textbox", { name: "Search calls" }), {
    target: { value: "" },
  });
  expect(screen.queryByRole("button", { name: "Select call 0.0" })).toBeNull();
});
it("filters reverted calls without marking the successful parent failed", () => {
  render(
    <ChakraProvider>
      <TraceCallTree root={demoTrace.call} selectedId="0" onSelect={() => {}} />
    </ChakraProvider>
  );
  fireEvent.click(screen.getByRole("button", { name: "1 reverted" }));
  expect(screen.getByRole("button", { name: "Select call 0.1" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Select call 0.2" })).toBeNull();
  expect(screen.getByText("Success")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "1 reverted" }));
  expect(screen.getByRole("button", { name: "Select call 0.2" })).toBeTruthy();
});
it("shows decoded arguments, returns, custom errors and positioned events directly in the tree", () => {
  const arg = (name: string, value: string) => ({
    name,
    type: "uint256",
    baseType: "uint256",
    value,
    rawValue: value,
  });
  const decoded = {
    input: {
      functionName: "transfer",
      signature: "transfer(uint256)",
      args: [arg("amount", "7")],
      rawArgs: [7n],
    },
    inputInferred: false,
    outputs: [
      {
        name: "success",
        type: "bool",
        baseType: "bool",
        value: "true",
        rawValue: true,
      },
    ],
    revert: null,
    logs: {
      0: {
        eventName: "Transfer",
        signature: "Transfer(uint256)",
        args: [arg("value", "7")],
      },
    },
    note: "",
  };
  const ui = render(
    <ChakraProvider>
      <TraceCallTree
        root={demoTrace.call}
        selectedId="0"
        onSelect={() => {}}
        entries={{
          "0.2": { status: "ready", data: decoded },
          "0.1": {
            status: "ready",
            data: {
              ...decoded,
              outputs: undefined,
              logs: {},
              revert: {
                functionName: "InsufficientBalance",
                signature: "InsufficientBalance(uint256)",
                rawArgs: [1n],
                args: [arg("available", "1")],
              },
            },
          },
        }}
      />
    </ChakraProvider>
  );
  const header = ui.container.querySelector('[data-tree-header="0.2"]')!;
  expect(header.textContent).toContain("transfer(amount: 7)");
  expect(header.textContent).toContain("success: true");
  expect(
    ui.container.querySelector('[data-tree-header="0.1"]')!.textContent
  ).toContain("InsufficientBalance(available: 1)");
  expect(
    ui.container.querySelector('[data-trace-log="0.2.0"]')!.textContent
  ).toContain("Transfer(value: 7)");
});
