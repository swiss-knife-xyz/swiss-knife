import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import Epoch from "./page";

const state = vi.hoisted(() => ({ query: "" }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(state.query) }));
vi.mock("@/components/Layout", () => ({ Layout: ({ children }: any) => children }));
vi.mock("@/components/CopyToClipboard", () => ({ CopyToClipboard: () => null }));
vi.mock("@/components/NetworkSelect", () => ({ NetworkSelect: () => null }));
vi.mock("@/lib/ethersProvider", () => ({ getEthersProvider: vi.fn() }));
beforeEach(() => { vi.stubGlobal("matchMedia", () => ({ matches: false, addListener() {}, removeListener() {} })); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it.each(["1700000000", "1700000000.123", "0"])("prefills and converts timestamp=%s without a click", value => {
  state.query = new URLSearchParams({ timestamp: value }).toString();
  render(<ChakraProvider><Epoch /></ChakraProvider>);
  expect((screen.getByPlaceholderText("Timestamp in seconds") as HTMLInputElement).value).toBe(value);
  expect(screen.getByText(new Date(Number(value) * 1000).toUTCString())).toBeTruthy();
});

it("ignores an invalid deep link and preserves manual conversion", () => {
  state.query = "timestamp=invalid";
  render(<ChakraProvider><Epoch /></ChakraProvider>);
  const input = screen.getByPlaceholderText("Timestamp in seconds");
  expect((input as HTMLInputElement).value).toBe("");
  fireEvent.change(input, { target: { value: "0" } });
  fireEvent.click(screen.getByRole("button", { name: "Convert" }));
  expect(screen.getByText("Thu, 01 Jan 1970 00:00:00 GMT")).toBeTruthy();
});
