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
import TraceCallDetails from "./TraceCallDetails";
import { normalizeTrace } from "@/lib/tracer/model";
vi.mock("./TraceDecodedValues", () => ({
  TraceDecodedValues: () => <div>Decoded call values</div>,
}));
afterEach(cleanup);
it("uses Decoded/Raw tabs and applies ABI overrides from the settings popover", async () => {
  const address = `0x${"11".repeat(20)}`;
  const call = normalizeTrace({
    type: "CALL",
    from: address,
    to: address,
    input: "0x12345678",
    output: "0x",
  }).call;
  const onAbi = vi.fn().mockResolvedValue(undefined);
  render(
    <ChakraProvider>
      <TraceCallDetails
        call={call}
        chainId={1}
        rolledBack={false}
        onAbi={onAbi}
        entry={{
          status: "ready",
          data: {
            input: null,
            inputInferred: false,
            revert: null,
            logs: {},
            note: "Decoded using your ABI.",
          },
        }}
      />
    </ChakraProvider>
  );
  expect(
    screen.getByRole("tab", { name: "Decoded" }).getAttribute("aria-selected")
  ).toBe("true");
  fireEvent.click(screen.getByRole("tab", { name: "Raw" }));
  expect(screen.getByText(call.input)).toBeTruthy();
  expect(screen.queryByRole("button", { name: "ABI" })).toBeNull();
  expect(screen.queryByRole("textbox", { name: "ABI" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Call settings" }));
  const input = await screen.findByRole("textbox", {
    name: "ABI",
  });
  expect(screen.queryByText("Decoded using your ABI.")).toBeNull();
  fireEvent.change(input, {
    target: {
      value: "function transfer(address to, uint256 value) returns (bool)",
    },
  });
  fireEvent.click(screen.getByRole("button", { name: "Apply" }));
  await waitFor(() => expect(onAbi).toHaveBeenCalledOnce());
  expect(onAbi.mock.calls[0][0]).toBe(address);
  await waitFor(() =>
    expect(screen.queryByRole("textbox", { name: "ABI" })).toBeNull()
  );
  fireEvent.click(screen.getByRole("tab", { name: "Decoded" }));
  expect(screen.getByText("Decoded call values")).toBeTruthy();
});
