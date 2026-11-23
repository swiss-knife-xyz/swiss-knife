import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { TransactionSummaryRail } from "./TransactionSummaryRail";
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it("centers short reviews, bounds tall reviews, and recalculates for async content and viewport changes", () => {
  const callbacks: Array<() => void> = [];
  const disconnect = vi.fn();
  vi.stubGlobal("ResizeObserver", class {
    constructor(callback: () => void) { callbacks.push(callback); }
    observe() {}
    disconnect = disconnect;
  });
  let panelHeight = 240;
  let panelTop = 160;
  let frame: FrameRequestCallback | undefined;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { frame = callback; return 1; });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    return { top: this.hasAttribute("data-tx-clear-signing") ? 160 : panelTop,
      height: this.hasAttribute("data-tx-review-panel") ? panelHeight : 0 } as DOMRect;
  });
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(1200);
  vi.stubGlobal("innerHeight", 1000);
  const view = render(<ChakraProvider><TransactionSummaryRail><section>Review</section></TransactionSummaryRail></ChakraProvider>);
  const rail = view.container.querySelector("[data-tx-clear-signing]") as HTMLElement;
  expect(rail.style.getPropertyValue("--review-offset")).toBe("220px");
  expect(rail.style.getPropertyValue("--review-body-max")).toBe("768px");
  panelHeight = 816;
  act(() => callbacks.forEach((callback) => callback()));
  expect(rail.style.getPropertyValue("--review-offset")).toBe("0px");
  panelTop = 24;
  act(() => { window.dispatchEvent(new Event("scroll")); frame?.(0); });
  expect(rail.style.getPropertyValue("--review-body-max")).toBe("904px");
  panelTop = 160;
  act(() => { window.dispatchEvent(new Event("scroll")); frame?.(0); });
  expect(rail.style.getPropertyValue("--review-body-max")).toBe("768px");
  vi.stubGlobal("innerHeight", 800);
  act(() => window.dispatchEvent(new Event("resize")));
  expect(rail.style.getPropertyValue("--review-body-max")).toBe("568px");
  view.unmount();
  expect(disconnect).toHaveBeenCalled();
});
