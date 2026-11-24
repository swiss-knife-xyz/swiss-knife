import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import ETHUnitConverter from "./page";

const state = vi.hoisted(() => ({ query: "" }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(state.query) }));
vi.mock("@/components/CopyToClipboard", () => ({ CopyToClipboard: () => null }));
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ ethereum: { usd: 2000 } })));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function mount(value: string) {
  state.query = new URLSearchParams({ wei: value }).toString();
  const update = vi.fn(({ queryString }) => { state.query = queryString; });
  render(<ChakraProvider>
    <NuqsTestingAdapter searchParams={state.query} hasMemory resetUrlUpdateQueueOnMount={false} onUrlUpdate={update}>
      <ETHUnitConverter />
    </NuqsTestingAdapter>
  </ChakraProvider>);
  return update;
}

it.each(["1000000000000000001", "-1000000000000000001", "0"])("retains incoming wei=%s without rewriting the URL during initialization", async value => {
  const update = mount(value);
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
  expect((screen.getByPlaceholderText("Enter Wei amount") as HTMLInputElement).value).toBe(value);
  expect((screen.getByPlaceholderText("Enter Ether amount") as HTMLInputElement).value).toBe(value === "0" ? "0" : `${value.startsWith("-") ? "-" : ""}1.000000000000000001`);
  expect(new URLSearchParams(state.query).get("wei")).toBe(value);
  expect(update).not.toHaveBeenCalled();
});

it("keeps edited values in the URL and clears them only when the input is cleared", async () => {
  const update = mount("1000000000000000000");
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
  fireEvent.change(screen.getByPlaceholderText("Enter Gwei amount"), { target: { value: "2" } });
  await waitFor(() => expect(new URLSearchParams(state.query).get("wei")).toBe("2000000000"));
  expect((screen.getByPlaceholderText("Enter Wei amount") as HTMLInputElement).value).toBe("2000000000");
  expect(update).toHaveBeenCalled();
  fireEvent.change(screen.getByPlaceholderText("Enter Wei amount"), { target: { value: "" } });
  await waitFor(() => expect(new URLSearchParams(state.query).has("wei")).toBe(false));
  expect((screen.getByPlaceholderText("Enter Gwei amount") as HTMLInputElement).value).toBe("");
});
