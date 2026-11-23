import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { ExampleSnapshotContext } from "@/components/decodedParams/ExampleSnapshotContext";
import { NestedCallData } from "./NestedCallData";
const mocks = vi.hoisted(() => ({ decode: vi.fn() }));
vi.mock("@/lib/decoder", () => ({ decodeRecursive: mocks.decode }));
vi.mock("next/dynamic", () => ({ default: (loader: any) => React.lazy(async () => { const loaded = await loader(); return { default: loaded.default ?? loaded }; }) }));
vi.mock("@/components/decodedParams/CalldataTree", () => ({
  CalldataTree: ({ args, showControls }: any) => <div data-testid="nested-call-tree" data-controls={String(showControls)}>{args.map((arg: any) => arg.name).join(", ")}</div>,
}));
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);
const request = { calldata: "0xf2b9fdb8", to: "0x1111111111111111111111111111111111111111", chainId: 1 };
const result = { functionName: "supply", signature: "supply(address,uint256)", rawArgs: [], args: [{ name: "asset", baseType: "address", type: "address", rawValue: request.to, value: request.to }] };
it("decodes a fallback call and discloses the shared typed tree only on request", async () => {
  mocks.decode.mockResolvedValue(result);
  render(<ChakraProvider><NestedCallData request={request} /></ChakraProvider>);
  const button = await screen.findByRole("button", { name: "Show supply calldata" });
  expect(mocks.decode).toHaveBeenCalledWith({ calldata: request.calldata, address: request.to, chainId: 1 });
  expect(screen.queryByTestId("nested-call-tree")).toBeNull();
  fireEvent.click(button);
  expect((await screen.findByTestId("nested-call-tree")).textContent).toBe("asset");
  expect(screen.getByTestId("nested-call-tree").getAttribute("data-controls")).toBe("false");
  fireEvent.click(screen.getByRole("button", { name: "Hide supply calldata" }));
  expect(screen.queryByTestId("nested-call-tree")).toBeNull();
});
it("keeps unknown bytes available behind a selector disclosure", async () => {
  mocks.decode.mockResolvedValue(null);
  render(<ChakraProvider><NestedCallData request={request} /></ChakraProvider>);
  await act(async () => {});
  expect(screen.queryByText(request.calldata)).toBeTruthy(); // compact selector, never a hex wall
  fireEvent.click(screen.getByRole("button", { name: `Show ${request.calldata} calldata` }));
  expect(screen.getAllByText(request.calldata)).toHaveLength(2);
});
it("reads nested decoded calls from the example snapshot without network requests", () => {
  const snapshot = { addresses: {}, urls: {}, result: { ...result, args: [{ name: "data", baseType: "bytes", type: "bytes", rawValue: request.calldata, value: { decoded: result } }] } };
  render(<ChakraProvider><ExampleSnapshotContext.Provider value={snapshot}><NestedCallData request={request} /></ExampleSnapshotContext.Provider></ChakraProvider>);
  expect(screen.getByRole("button", { name: "Show supply calldata" })).toBeTruthy();
  expect(mocks.decode).not.toHaveBeenCalled();
});
