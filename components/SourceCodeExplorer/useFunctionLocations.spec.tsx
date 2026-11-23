import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useFunctionLocations } from "./useFunctionLocations";

class IndexWorker {
  static instances: IndexWorker[] = [];
  onmessage?: (event: { data: object }) => void;
  onerror?: () => void;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor() {
    IndexWorker.instances.push(this);
  }
}
beforeEach(() => {
  vi.useFakeTimers();
  IndexWorker.instances = [];
  vi.stubGlobal("Worker", IndexWorker);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("cancels stale work, ignores late messages, and caches results by bundle and contract", () => {
  const first = { "A.sol": "contract A {}" };
  const second = { "B.sol": "contract B {}" };
  const view = renderHook(
    ({ sources, name }) => useFunctionLocations(sources, name),
    { initialProps: { sources: first, name: "A" } }
  );
  expect(IndexWorker.instances).toHaveLength(0);
  act(() => vi.advanceTimersByTime(100));
  const oldWorker = IndexWorker.instances[0];
  view.rerender({ sources: second as any, name: "B" });
  expect(oldWorker.terminate).toHaveBeenCalledOnce();
  act(() =>
    oldWorker.onmessage?.({
      data: { "wrong()": { path: "A.sol", line: 1, column: 1 } },
    })
  );
  expect(view.result.current.locations).toEqual({});
  act(() => vi.advanceTimersByTime(100));
  const worker = IndexWorker.instances[1];
  const locations = { "f()": { path: "B.sol", line: 1, column: 1 } };
  act(() => worker.onmessage?.({ data: locations }));
  expect(view.result.current.locations).toEqual(locations);
  expect(view.result.current.isIndexing).toBe(false);
  expect(worker.terminate).toHaveBeenCalledOnce();
  view.unmount();
  const cached = renderHook(() => useFunctionLocations(second, "B"));
  expect(cached.result.current.locations).toEqual(locations);
  act(() => vi.advanceTimersByTime(100));
  expect(IndexWorker.instances).toHaveLength(2);
});

it("stops a hung worker and leaves unavailable definitions disabled", () => {
  const sources = { "A.sol": "contract A {}" };
  const view = renderHook(() => useFunctionLocations(sources, "A"));
  act(() => vi.advanceTimersByTime(100));
  act(() => vi.advanceTimersByTime(15000));
  expect(view.result.current.isIndexing).toBe(false);
  expect(view.result.current.locations).toEqual({});
  expect(IndexWorker.instances[0].terminate).toHaveBeenCalled();
});
