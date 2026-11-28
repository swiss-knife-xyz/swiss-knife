import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { TraceCallTree } from "./TraceCallTree";
import { normalizeTrace } from "@/lib/tracer/model";
import { demoTrace } from "@/lib/tracer/demo";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const from = `0x${"11".repeat(20)}`;
it("opens all depths for local examples while normal traces keep deep branches collapsed", () => {
  const root = normalizeTrace({ type: "CALL", from, calls: [
    { type: "CALL", from, calls: [{ type: "CALL", from, calls: [{ type: "CALL", from }] }] },
  ] }).call;
  const ui = render(<ChakraProvider><TraceCallTree root={root} selectedId="0" onSelect={() => {}} /></ChakraProvider>);
  expect(screen.queryByRole("button", { name: "Select call 0.0.0.0" })).toBeNull();
  ui.unmount();
  render(<ChakraProvider><TraceCallTree root={root} selectedId="0" onSelect={() => {}} defaultExpanded /></ChakraProvider>);
  expect(screen.getByRole("button", { name: "Select call 0.0.0.0" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Collapse all" }));
  expect(screen.queryByRole("button", { name: "Select call 0.0.0.0" })).toBeNull();
});
it("toggles static call subtrees without restoring them through search or decoding", () => {
  const root = normalizeTrace({ type: "CALL", from, calls: [
    { type: "STATICCALL", from, to: from, calls: [{ type: "DELEGATECALL", from, to: from }] },
    { type: "CALL", from, to: from },
  ] }).call;
  const onVisibleCalls = vi.fn();
  render(<ChakraProvider><TraceCallTree root={root} selectedId="0" onSelect={() => {}} onVisibleCalls={onVisibleCalls} /></ChakraProvider>);
  const toggle = screen.getByRole("checkbox", { name: "Static calls" }) as HTMLInputElement;
  expect(toggle.checked).toBe(true);
  expect(screen.getByRole("button", { name: "Select call 0.0.0" })).toBeTruthy();
  fireEvent.click(toggle);
  expect(toggle.checked).toBe(false);
  expect(screen.queryByRole("button", { name: "Select call 0.0" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Select call 0.0.0" })).toBeNull();
  expect(screen.getByText("2 calls")).toBeTruthy();
  expect(onVisibleCalls.mock.lastCall?.[0].map((call: { id: string }) => call.id)).toEqual(["0", "0.1"]);
  fireEvent.click(screen.getByRole("button", { name: "Decode all" }));
  expect(onVisibleCalls.mock.lastCall?.[0].map((call: { id: string }) => call.id)).toEqual(["0", "0.1"]);
  fireEvent.change(screen.getByRole("textbox", { name: "Search calls" }), { target: { value: "STATICCALL" } });
  expect(screen.getByText("No matching calls.")).toBeTruthy();
  fireEvent.change(screen.getByRole("textbox", { name: "Search calls" }), { target: { value: "" } });
  fireEvent.click(toggle);
  expect(screen.getByRole("button", { name: "Select call 0.0" })).toBeTruthy();
  expect(screen.getByText("4 calls")).toBeTruthy();
});
it("shows an empty state when hiding a static root", () => {
  const root = normalizeTrace({ type: "STATICCALL", from }).call;
  render(<ChakraProvider><TraceCallTree root={root} selectedId="0" onSelect={() => {}} /></ChakraProvider>);
  fireEvent.click(screen.getByRole("checkbox", { name: "Static calls" }));
  expect(screen.getByText("No matching calls.")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Select call 0" })).toBeNull();
});
it.each(["KillSwitch", undefined])("joins the contract name or address and function with a dot (%s)", (contractName) => {
  const root = normalizeTrace({ type: "STATICCALL", from, to: from }).call;
  const { container } = render(
    <ChakraProvider>
      <TraceCallTree root={root} selectedId="0" onSelect={() => {}}
        entries={{ [root.id]: { status: "ready", data: {
          input: { functionName: "paused", signature: "paused()", args: [], rawArgs: [] },
          inputInferred: false, contractName, revert: null, logs: {}, note: "",
        } } }} />
    </ChakraProvider>
  );
  expect(container.textContent).toContain(`${contractName ?? "0x111111…1111"}.paused()`);
});
it("labels precompiled calls before decoding instead of treating input as a selector", () => {
  const root = normalizeTrace({ type: "STATICCALL", from,
    to: `0x${"0".repeat(39)}1`, input: "0x4559f462" }).call;
  render(<ChakraProvider><TraceCallTree root={root} selectedId="0" onSelect={() => {}} /></ChakraProvider>);
  expect(screen.getByText("Precompiled")).toBeTruthy();
  expect(screen.getByText("ecRecover")).toBeTruthy();
  expect(screen.queryByText("0x4559f462")).toBeNull();
});
it.each([
  { top: 200, height: 100, expected: null },
  { top: 480, height: 100, expected: "nearest" },
  { top: 480, height: 900, expected: "start" },
  { top: 200, height: 900, expected: null },
])(
  "reveals expanded children only when needed ($top, $height)",
  async ({ top, height, expected }) => {
    const scrollIntoView = vi.fn();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    const geometry = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: HTMLElement) {
        const child = this.hasAttribute("data-trace-children");
        return {
          top: child ? top : 100,
          bottom: child ? top + height : 500,
          height: child ? height : 400,
        } as DOMRect;
      });
    const ui = render(
      <ChakraProvider>
        <TraceCallTree
          root={demoTrace.call}
          selectedId="0"
          onSelect={() => {}}
        />
      </ChakraProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: "Collapse call 0" }));
    // Attach the spy to newly mounted contents without changing browser geometry.
    const original = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    try {
      fireEvent.click(screen.getByRole("button", { name: "Expand call 0" }));
      await waitFor(() =>
        expect(
          ui.container.querySelector('[data-trace-children="0"]')
        ).toBeTruthy()
      );
      if (expected)
        expect(scrollIntoView).toHaveBeenCalledWith(
          expect.objectContaining({ block: expected, inline: "nearest" })
        );
      else expect(scrollIntoView).not.toHaveBeenCalled();
      scrollIntoView.mockClear();
      fireEvent.click(screen.getByRole("button", { name: "Collapse call 0" }));
      expect(scrollIntoView).not.toHaveBeenCalled();
    } finally {
      HTMLElement.prototype.scrollIntoView = original;
      geometry.mockRestore();
    }
  }
);
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
