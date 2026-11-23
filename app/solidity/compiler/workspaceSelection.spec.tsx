import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { WorkspaceSelector } from "./WorkspaceSelector";
beforeEach(() => {
  vi.stubGlobal("matchMedia", vi.fn(() => ({matches:false,addListener:vi.fn(),removeListener:vi.fn(),addEventListener:vi.fn(),removeEventListener:vi.fn(),dispatchEvent:vi.fn()})));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it("focuses the active workspace when opening, including after switching workspaces", async () => {
  const workspaces = [
    { id: "a", name: "First" },
    { id: "b", name: "Current" },
  ];
  const props = {
    workspaces,
    active: workspaces[1],
    fileCount: 1,
    disabled: false,
    busy: false,
    onSwitch: vi.fn().mockResolvedValue(undefined),
    onCreate: vi.fn(),
    onRename: vi.fn(),
    onDelete: vi.fn(),
  };
  const view = render(
    <ChakraProvider>
      <WorkspaceSelector {...props} />
    </ChakraProvider>
  );
  const combo = await screen.findByRole("combobox", { name: "Workspace" });
  fireEvent.focus(combo);
  fireEvent.keyDown(combo, { key: "ArrowDown", code: "ArrowDown" });
  const current = await screen.findByRole("option", { name: "Current" });
  expect(combo.getAttribute("aria-activedescendant")).toBe(current.id);
  fireEvent.keyDown(combo, { key: "Escape", code: "Escape" });
  view.rerender(
    <ChakraProvider>
      <WorkspaceSelector {...props} active={workspaces[0]} />
    </ChakraProvider>
  );
  fireEvent.keyDown(combo, { key: "ArrowDown", code: "ArrowDown" });
  const first = await screen.findByRole("option", { name: "First" });
  expect(combo.getAttribute("aria-activedescendant")).toBe(first.id);
});
