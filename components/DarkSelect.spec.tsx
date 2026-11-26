import React, { useLayoutEffect, useRef } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { ChakraProvider } from "@chakra-ui/react";
import { DarkSelect } from "./DarkSelect";

const dropdown = () => <DarkSelect
  ariaLabel="Units"
  options={[{ label: "Wei", value: "Wei" }, { label: "ETH", value: "ETH" }]}
  selectedOption={{ label: "Wei", value: "Wei" }}
  setSelectedOption={() => {}}
/>;
beforeEach(() => vi.stubGlobal("matchMedia", () => ({
  matches: false,
  addListener() {}, removeListener() {},
  addEventListener() {}, removeEventListener() {},
})));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("renders a usable selector on the first commit of a client-created control", async () => {
  let interactiveAtCommit = false;
  function InspectFirstCommit() {
    const element = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
      interactiveAtCommit = Boolean(element.current?.querySelector('[role="combobox"]'));
    }, []);
    return <div ref={element}>{dropdown()}</div>;
  }
  render(<ChakraProvider><InspectFirstCommit /></ChakraProvider>);
  expect(interactiveAtCommit).toBe(true);
  fireEvent.keyDown(screen.getByRole("combobox", { name: "Units" }), { key: "ArrowDown" });
  expect(await screen.findByRole("option", { name: "ETH" })).toBeTruthy();
});

it("retains the server placeholder and hydrates into an interactive selector without mismatch", async () => {
  const ui = <ChakraProvider>{dropdown()}</ChakraProvider>;
  const container = document.createElement("div");
  container.innerHTML = renderToString(ui);
  document.body.append(container);
  expect(container.querySelector('[role="combobox"]')).toBeNull();
  const recoverable = vi.fn();
  let root!: ReturnType<typeof hydrateRoot>;
  try {
    await act(async () => { root = hydrateRoot(container, ui, { onRecoverableError: recoverable }); });
    expect(container.querySelector('[role="combobox"]')).toBeTruthy();
    expect(recoverable).not.toHaveBeenCalled();
  } finally {
    await act(async () => root?.unmount());
    container.remove();
  }
});
