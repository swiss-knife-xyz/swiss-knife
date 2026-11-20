import React from "react";
import { afterEach, expect, test, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { RpcTool } from "./RpcTool";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const renderTool = () =>
  render(
    <ChakraProvider>
      <RpcTool />
    </ChakraProvider>
  );
test("no automatic query; explicit read-only request shows exact JSON and copy", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      Response.json({ jsonrpc: "2.0", id: 1, result: "0x123456789abcdef" })
    );
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("fetch", fetcher);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  renderTool();
  expect(fetcher).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Run read query" }));
  await screen.findByText(/0x123456789abcdef/);
  expect(fetcher.mock.calls[0][0]).toBe("/api/rpc");
  const init = fetcher.mock.calls[0][1];
  expect(JSON.parse(init.body)).toEqual({
    chain: "1",
    request: { jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] },
  });
  expect(init.method).toBe("POST");
  expect(init.cache).toBe("no-store");
  fireEvent.click(screen.getByRole("button", { name: "Copy response" }));
  await waitFor(() => expect(writeText).toHaveBeenCalled());
  expect(writeText.mock.calls[0][0]).toContain("0x123456789abcdef");
});
test("mixed write batch fails locally and never sends", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  renderTool();
  fireEvent.change(screen.getByLabelText("JSON-RPC request"), {
    target: {
      value: JSON.stringify([
        { jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] },
        {
          jsonrpc: "2.0",
          id: 2,
          method: "eth_sendRawTransaction",
          params: ["0x"],
        },
      ]),
    },
  });
  fireEvent.click(screen.getByRole("button", { name: "Run read query" }));
  await screen.findByText(/whole batch was rejected/);
  expect(fetcher).not.toHaveBeenCalled();
});
test("edits invalidate results, abort in-flight and ignore late completion", async () => {
  let resolve!: (r: Response) => void;
  const fetcher = vi.fn().mockImplementation(
    () =>
      new Promise((r) => {
        resolve = r;
      })
  );
  vi.stubGlobal("fetch", fetcher);
  renderTool();
  fireEvent.click(screen.getByRole("button", { name: "Run read query" }));
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  fireEvent.change(screen.getByLabelText("Chain"), {
    target: { value: "8453" },
  });
  expect(fetcher.mock.calls[0][1].signal.aborted).toBe(true);
  resolve(Response.json({ jsonrpc: "2.0", id: 1, result: "stale-result" }));
  await new Promise((r) => setTimeout(r, 20));
  expect(screen.queryByText(/stale-result/)).toBeNull();
  expect(screen.queryByRole("button", { name: "Copy response" })).toBeNull();
});
test("examples only edit drafts; server failures are shown without unsafe HTML", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      Response.json(
        { error: { code: "UNAVAILABLE", message: "<script>bad</script>" } },
        { status: 502 }
      )
    );
  vi.stubGlobal("fetch", fetcher);
  renderTool();
  fireEvent.change(screen.getByLabelText("Example"), {
    target: { value: "Batch" },
  });
  expect(
    JSON.parse(
      (screen.getByLabelText("JSON-RPC request") as HTMLTextAreaElement).value
    )
  ).toHaveLength(2);
  expect(fetcher).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Run read query" }));
  await screen.findByRole("alert");
  expect(document.querySelector("script")).toBeNull();
});
