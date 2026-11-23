import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { DeploymentScrollArea } from "./DeploymentScrollArea";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("shows shadows only on edges that conceal scrollable content", () => {
  let resize!: () => void;
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: () => void) {
        resize = callback;
      }
      observe() {}
      disconnect() {}
    }
  );
  render(
    <ChakraProvider>
      <DeploymentScrollArea>Deployment</DeploymentScrollArea>
    </ChakraProvider>
  );
  const viewport = screen.getByRole("region", { name: "Deployment history" });
  const top = screen.getByTestId("deployment-top-shadow"),
    bottom = screen.getByTestId("deployment-bottom-shadow");
  const state = () => [
    getComputedStyle(top).opacity,
    getComputedStyle(bottom).opacity,
  ];
  expect(state()).toEqual(["0", "0"]);
  Object.defineProperties(viewport, {
    clientHeight: { configurable: true, value: 440 },
    scrollHeight: { configurable: true, value: 1000 },
    scrollTop: { configurable: true, writable: true, value: 0 },
  });
  act(() => resize());
  expect(state()).toEqual(["0", "1"]);
  viewport.scrollTop = 200;
  fireEvent.scroll(viewport);
  expect(state()).toEqual(["1", "1"]);
  viewport.scrollTop = 560;
  fireEvent.scroll(viewport);
  expect(state()).toEqual(["1", "0"]);
  viewport.scrollTop = 0;
  Object.defineProperty(viewport, "scrollHeight", {
    configurable: true,
    value: 200,
  });
  act(() => resize());
  expect(state()).toEqual(["0", "0"]);
});
it("disconnects measurements when the list unmounts", () => {
  const disconnect = vi.fn();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect = disconnect;
    }
  );
  const view = render(
    <ChakraProvider>
      <DeploymentScrollArea>Deployment</DeploymentScrollArea>
    </ChakraProvider>
  );
  view.unmount();
  expect(disconnect).toHaveBeenCalledOnce();
});
