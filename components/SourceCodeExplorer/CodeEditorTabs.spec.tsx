import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { CodeEditorTabs } from "./CodeEditorTabs";
const tabs = ["A.sol", "B.sol", "C.sol"].map(path => ({ id: path, path, name: path, content: "", isPinned: false, isTarget: false }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
it("reveals newly activated offscreen tabs by scrolling only the tab strip", () => {
  const view = (activeTabId: string, files = tabs) => <ChakraProvider><CodeEditorTabs tabs={files} activeTabId={activeTabId} onTabSelect={() => {}} onTabClose={() => {}} /></ChakraProvider>;
  const { rerender } = render(view("A.sol", tabs.slice(0, 2)));
  const strip = screen.getByRole("tablist").parentElement!;
  const scrollTo = vi.fn();
  Object.defineProperty(strip, "scrollTo", { value: scrollTo, configurable: true });
  Object.defineProperty(strip, "clientWidth", { value: 200 });
  vi.spyOn(strip, "getBoundingClientRect").mockReturnValue({ left: 100, right: 300 } as DOMRect);
  const rect = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    if (this.getAttribute("aria-label") === "C.sol") return { left: 330, right: 430 } as DOMRect;
    return { left: 100, right: 200 } as DOMRect;
  });
  rerender(view("C.sol"));
  expect(scrollTo).toHaveBeenLastCalledWith({ left: 130, behavior: "instant" });
  scrollTo.mockClear();
  rerender(view("B.sol"));
  expect(scrollTo).not.toHaveBeenCalled();
  strip.scrollLeft = 130;
  rect.mockImplementation(function (this: HTMLElement) {
    if (this.getAttribute("aria-label") === "A.sol") return { left: -30, right: 70 } as DOMRect;
    return { left: 100, right: 200 } as DOMRect;
  });
  rerender(view("A.sol"));
  expect(scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: "instant" });
});
