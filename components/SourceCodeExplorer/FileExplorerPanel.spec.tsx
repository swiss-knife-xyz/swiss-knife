import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { FileExplorerPanel } from "./FileExplorerPanel";
vi.mock("./FileExplorerTree", () => ({ FileExplorerTree: () => <div>Files</div> }));
vi.mock("./useSourceOutline", () => ({ useSourceOutline: (path: string) => ({
  loading: path === "Loading.sol",
  unavailable: path === "Unavailable.sol",
  symbols: path === "Token.sol" ? [{ id: "Token", kind: "contract", name: "Token", detail: "", tags: [], line: 1, column: 1, children: [] }] : [],
}) }));
afterEach(cleanup);
it("collapses unavailable or empty outlines, and restores a useful outline on file change", () => {
  const view = (path: string) => <ChakraProvider><FileExplorerPanel data={[]} onFileSelect={() => {}} outline={{ path, content: "", onSelect() {} }} /></ChakraProvider>;
  const { rerender } = render(view("Unavailable.sol"));
  expect(screen.getByRole("button", { name: "Expand Outline" }).getAttribute("aria-expanded")).toBe("false");
  expect(screen.queryByRole("region", { name: "Source outline" })).toBeNull();
  rerender(view("Token.sol"));
  expect(screen.getByRole("button", { name: "Collapse Outline" })).toBeTruthy();
  expect(screen.getByRole("region", { name: "Source outline" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Collapse Outline" }));
  rerender(view("Token.sol"));
  expect(screen.getByRole("button", { name: "Expand Outline" })).toBeTruthy();
  rerender(view("Empty.sol"));
  expect(screen.getByRole("button", { name: "Expand Outline" })).toBeTruthy();
  rerender(view("notes.txt"));
  expect(screen.queryByRole("region", { name: "Source outline" })).toBeNull();
});
