import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { ClearSigningScrollArea } from "./ClearSigningScrollArea";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("shows only the shadows for remaining scroll content and updates on resize", () => {
  let resize!: () => void;
  const disconnect = vi.fn();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: () => void) {
        resize = callback;
      }
      observe() {}
      disconnect = disconnect;
    }
  );
  const rendered = render(
    <ChakraProvider>
      <ClearSigningScrollArea>
        <p>Summary</p>
      </ClearSigningScrollArea>
    </ChakraProvider>
  );
  const viewport = rendered.container.querySelector(
    "[data-clear-signing-scroll]"
  ) as HTMLElement;
  let height = 300;
  Object.defineProperties(viewport, {
    clientHeight: { get: () => 100 },
    scrollHeight: { get: () => height },
    scrollTop: { value: 0, writable: true },
  });
  const opacity = (edge: string) =>
    getComputedStyle(
      rendered.container.querySelector(`[data-scroll-shadow=${edge}]`)!
    ).opacity;
  act(() => resize());
  expect(opacity("top")).toBe("0");
  expect(opacity("bottom")).toBe("1");
  viewport.scrollTop = 100;
  fireEvent.scroll(viewport);
  expect(opacity("top")).toBe("1");
  expect(opacity("bottom")).toBe("1");
  viewport.scrollTop = 200;
  fireEvent.scroll(viewport);
  expect(opacity("top")).toBe("1");
  expect(opacity("bottom")).toBe("0");
  viewport.scrollTop = 0;
  height = 80;
  act(() => resize());
  expect(opacity("top")).toBe("0");
  expect(opacity("bottom")).toBe("0");
  rendered.unmount();
  expect(disconnect).toHaveBeenCalled();
});
