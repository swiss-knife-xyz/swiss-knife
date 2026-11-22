import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { SourceCodeExplorer } from "./SourceCodeExplorer";

vi.mock("@monaco-editor/react", () => ({ Editor: () => <div>Code editor</div> }));
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("@/components/CopyToClipboard", () => ({ CopyToClipboard: () => null }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("retains search text and options across Search / Explorer switches, including before debounce", () => {
  Element.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} unobserve() {} });
  render(<ChakraProvider><SourceCodeExplorer sourceCode={{ "Token.sol": "contract Token { function transfer() external {} }" }} /></ChakraProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Search" }));
  fireEvent.change(screen.getByPlaceholderText("Search in files..."), { target: { value: "transfer" } });
  fireEvent.click(screen.getByRole("button", { name: "Case sensitive" }));
  fireEvent.click(screen.getByRole("button", { name: "Use regex" }));
  const caseStyle = screen.getByRole("button", { name: "Case sensitive" }).className;
  const regexStyle = screen.getByRole("button", { name: "Use regex" }).className;
  fireEvent.click(screen.getByRole("button", { name: /files/i }));
  expect(screen.queryByPlaceholderText("Search in files...")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Search" }));
  expect((screen.getByPlaceholderText("Search in files...") as HTMLInputElement).value).toBe("transfer");
  expect(screen.getByRole("button", { name: "Case sensitive" }).className).toBe(caseStyle);
  expect(screen.getByRole("button", { name: "Use regex" }).className).toBe(regexStyle);
  fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
  expect((screen.getByPlaceholderText("Search in files...") as HTMLInputElement).value).toBe("");
});
