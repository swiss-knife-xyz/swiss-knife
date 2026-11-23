import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { SourceOutline } from "@/components/SourceCodeExplorer/SourceOutline";
import { FileExplorerPanel } from "@/components/SourceCodeExplorer/FileExplorerPanel";
import { buildFileTree } from "@/components/SourceCodeExplorer/utils";
import { solidityOutline } from "@/lib/solidity/outline";
class OutlineWorker {
  static instances: OutlineWorker[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  messages: { id: number; content: string }[] = [];
  terminated = false;
  constructor() {
    OutlineWorker.instances.push(this);
  }
  postMessage(data: (typeof this.messages)[number]) {
    this.messages.push(data);
  }
  terminate() {
    this.terminated = true;
  }
  finish(index = 0) {
    const request = this.messages[index];
    act(() =>
      this.onmessage?.(
        new MessageEvent("message", {
          data: { id: request.id, result: solidityOutline(request.content) },
        })
      )
    );
  }
}
beforeEach(() => {
  vi.useFakeTimers();
  OutlineWorker.instances = [];
  vi.stubGlobal("Worker", OutlineWorker);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ChakraProvider>{children}</ChakraProvider>
);
const tick = () => act(() => vi.advanceTimersByTime(300));
it("shares Files/Outline sections, supports collapsing and jumps to the exact symbol line", () => {
  const source =
    "contract A {\n function mint(address to,uint amount) external {}\n}";
  const jump = vi.fn();
  render(
    <FileExplorerPanel
      data={buildFileTree({ "A.sol": source })}
      onFileSelect={() => {}}
      outline={{ path: "A.sol", content: source, onSelect: jump }}
    />,
    { wrapper }
  );
  tick();
  OutlineWorker.instances[0].finish();
  fireEvent.click(
    screen.getByRole("button", { name: "Go to function mint, line 2" })
  );
  expect(jump).toHaveBeenCalledWith(2, 2);
  fireEvent.click(screen.getByRole("button", { name: "Collapse A" }));
  expect(
    screen.queryByRole("button", { name: "Go to function mint, line 2" })
  ).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Collapse Files" }));
  expect(screen.queryByRole("button", { name: "A.sol" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Collapse Outline" }));
  expect(OutlineWorker.instances[0].terminated).toBe(true);
});
it("debounces edits, discards old file replies and disables stale symbol navigation", () => {
  const jump = vi.fn();
  const first = { path: "A.sol", content: "contract A{}", onSelect: jump };
  const view = render(<SourceOutline source={first} />, { wrapper });
  tick();
  const worker = OutlineWorker.instances[0];
  view.rerender(
    <SourceOutline
      source={{ ...first, path: "B.sol", content: "contract B{}" }}
    />
  );
  worker.finish();
  expect(screen.queryByRole("button", { name: /Go to contract A/ })).toBeNull();
  tick();
  worker.finish(1);
  expect(
    screen.getByRole("button", { name: "Go to contract B, line 1" })
  ).toBeTruthy();
  view.rerender(
    <SourceOutline
      source={{ ...first, path: "B.sol", content: "\ncontract B{}" }}
    />
  );
  expect(
    (
      screen.getByRole("button", {
        name: "Go to contract B, line 1",
      }) as HTMLButtonElement
    ).disabled
  ).toBe(true);
  tick();
  worker.finish(2);
  expect(
    screen.getByRole("button", { name: "Go to contract B, line 2" })
  ).toBeTruthy();
  view.unmount();
  expect(worker.terminated).toBe(true);
});
