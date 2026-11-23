import { afterEach, expect, it, vi } from "vitest";
import { registerInlineErrors } from "./inlineErrors";
afterEach(() => { document.body.replaceChildren(); vi.unstubAllGlobals(); });
it("renders complete wrapped errors, clears them on edits and switches, and disposes annotations", () => {
  let changed: any, edited: any, switched: any, resized: any;
  let path = "a";
  let width = 400;
  let frame: FrameRequestCallback | undefined;
  vi.stubGlobal("requestAnimationFrame", (fn: FrameRequestCallback) => { frame = fn; return 1; });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  const nodes = new Map<string, any>();
  let next = 0;
  const disposed = vi.fn();
  const uri = () => ({ scheme: "ethsh-solidity", toString: () => path });
  const glyphs = {set: vi.fn(), clear: vi.fn()};
  const editor = {
    createDecorationsCollection: () => glyphs,
    getModel: () => ({ uri: uri() }),
    getLayoutInfo: () => ({ contentWidth: width }),
    changeViewZones: (fn: any) => fn({ addZone: (zone: any) => {
      const id = String(++next); nodes.set(id, zone); document.body.append(zone.domNode); return id;
    }, removeZone: (id: string) => { nodes.get(id)?.domNode.remove(); nodes.delete(id); }, layoutZone: vi.fn() }),
    onDidChangeModel: (fn: any) => { switched = fn; return {dispose: disposed}; },
    onDidChangeModelContent: (fn: any) => { edited = fn; return {dispose: disposed}; },
    onDidLayoutChange: (fn: any) => { resized = fn; return {dispose: disposed}; },
  };
  const message = "Expected pragma, import directive or contract/interface/library/struct/enum/constant/function/error definition.";
  const monaco = { MarkerSeverity: {Error: 8}, editor: {
    onDidChangeMarkers: (fn: any) => { changed = fn; return {dispose: disposed}; },
    getModelMarkers: () => path === "a" ? [
      {severity: 8, message, startLineNumber: 5},
      {severity: 4, message: "Warning", startLineNumber: 2},
    ] : [],
  }};
  const registration = registerInlineErrors(editor as any, monaco as any);
  expect(document.querySelector('[role="note"]')?.textContent).toBe(message);
  expect([...nodes.values()][0].afterLineNumber).toBe(5);
  expect(nodes.size).toBe(1);
  expect(glyphs.set).toHaveBeenLastCalledWith([expect.objectContaining({
    range: expect.objectContaining({startLineNumber: 5}),
    options: expect.objectContaining({lineNumberClassName: expect.stringContaining("codicon-error")}),
  })]);
  width = 200; resized(); frame?.(0);
  expect((document.querySelector('[role="note"]') as HTMLElement).style.width).toBe("184px");
  edited(); expect(nodes.size).toBe(0);
  changed([uri()]); expect(nodes.size).toBe(1);
  path = "b"; switched(); expect(nodes.size).toBe(0);
  registration.dispose(); expect(disposed).toHaveBeenCalledTimes(4);
});
