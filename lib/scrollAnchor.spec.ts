import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { maintainFunctionScrollAnchor } from "./scrollAnchor";

let resize: ResizeObserverCallback;
let frames: Map<number, FrameRequestCallback>;
let scrollY: number;
let targetY: number;
let top: number;
let target: HTMLElement;
let container: HTMLElement;
let release: () => void;
const observe = vi.fn();
const disconnect = vi.fn();
const scrollTo = vi.fn();
function flush() {
  const callbacks = [...frames.values()];
  frames.clear();
  callbacks.forEach(callback => callback(0));
}
function resized() { resize([], {} as ResizeObserver); }
beforeEach(() => {
  vi.clearAllMocks();
  frames = new Map();
  scrollY = 372; targetY = 500; top = 128;
  let next = 0;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    const id = ++next; frames.set(id, callback); return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  vi.stubGlobal("ResizeObserver", class {
    constructor(callback: ResizeObserverCallback) { resize = callback; }
    observe = observe;
    disconnect = disconnect;
  });
  vi.spyOn(window, "scrollY", "get").mockImplementation(() => scrollY);
  vi.spyOn(window, "scrollTo").mockImplementation((options: any) => { scrollTo(options); scrollY = options.top; });
  container = document.createElement("div");
  container.innerHTML = '<div data-function-selector="read"></div><div data-function-selector="write"></div>';
  document.body.append(container);
  target = container.lastElementChild as HTMLElement;
  vi.spyOn(target, "getBoundingClientRect").mockImplementation(() => ({ top: targetY - scrollY }) as DOMRect);
  release = maintainFunctionScrollAnchor(target, container, () => top);
  flush();
});
afterEach(() => { release(); container.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("keeps the shared function below the toolbar as reads expand either column", () => {
  expect(observe).toHaveBeenCalledWith(container.firstElementChild);
  targetY += 250;
  resized(); resized();
  expect(frames.size).toBe(1);
  flush();
  expect(target.getBoundingClientRect().top).toBe(128);
  // Browser scroll anchoring can also move the viewport without moving the target.
  scrollY += 300;
  window.dispatchEvent(new Event("scroll")); flush();
  expect(target.getBoundingClientRect().top).toBe(128);
  scrollTo.mockClear();
  resized(); flush();
  expect(scrollTo).not.toHaveBeenCalled();
});

it("uses the updated toolbar offset when the viewport changes", () => {
  top = 156;
  window.dispatchEvent(new Event("resize")); flush();
  expect(target.getBoundingClientRect().top).toBe(156);
});

it.each(["wheel", "touchstart", "pointerdown", "keydown"])("releases anchoring on user %s and cancels queued corrections", event => {
  targetY += 200;
  resized();
  window.dispatchEvent(new Event(event));
  flush(); resized(); flush();
  expect(scrollTo).not.toHaveBeenCalled();
  expect(disconnect).toHaveBeenCalledOnce();
});

it("stops after navigation removes the function", () => {
  target.remove(); resized(); flush();
  expect(disconnect).toHaveBeenCalledOnce();
  expect(scrollTo).not.toHaveBeenCalled();
});
