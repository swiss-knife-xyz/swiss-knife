import { afterEach, expect, it, vi } from "vitest";
import { flashSourceLine } from "@/components/SourceCodeExplorer/flashSourceLine";
afterEach(() => {
  vi.useRealTimers();
  document.getElementById("ethsh-source-navigation-style")?.remove();
});
it("highlights the whole target line, clears after the hold/fade and restarts for a new jump", () => {
  vi.useFakeTimers();
  const collections: { clear: ReturnType<typeof vi.fn> }[] = [];
  let onModelChange = () => {};
  const editor = {
    getModel: () => ({ getLineCount: () => 10 }),
    createDecorationsCollection: vi.fn(() => {
      const collection = { clear: vi.fn() };
      collections.push(collection);
      return collection;
    }),
    onDidChangeModel: vi.fn((fn) => {
      onModelChange = fn;
      return { dispose: vi.fn() };
    }),
    onDidDispose: vi.fn(() => ({ dispose: vi.fn() })),
  };
  flashSourceLine(editor as never, 4);
  expect(editor.createDecorationsCollection).toHaveBeenLastCalledWith([
    expect.objectContaining({
      range: expect.objectContaining({ startLineNumber: 4 }),
      options: expect.objectContaining({ isWholeLine: true }),
    }),
  ]);
  vi.advanceTimersByTime(500);
  expect(collections[0].clear).not.toHaveBeenCalled();
  flashSourceLine(editor as never, 7);
  expect(collections[0].clear).toHaveBeenCalledOnce();
  vi.advanceTimersByTime(899);
  expect(collections[1].clear).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);
  expect(collections[1].clear).toHaveBeenCalledOnce();
  flashSourceLine(editor as never, 99);
  expect(editor.createDecorationsCollection).toHaveBeenLastCalledWith([
    expect.objectContaining({
      range: expect.objectContaining({ startLineNumber: 10 }),
    }),
  ]);
  onModelChange();
  expect(collections[2].clear).toHaveBeenCalledOnce();
});
