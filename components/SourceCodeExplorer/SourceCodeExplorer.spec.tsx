import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { SourceCodeExplorer } from "./SourceCodeExplorer";

const { mountedEditors, flash, importActions } = vi.hoisted(() => ({ mountedEditors: [] as any[], flash: vi.fn(), importActions: { current: null as any } }));
vi.mock("./selectorLenses", () => ({ registerSelectorLenses: (_editor: any, _monaco: any, actions: any) => { importActions.current = actions; return { dispose() {}, refreshContext() {} }; } }));
vi.mock("./flashSourceLine", () => ({ flashSourceLine: flash }));
vi.mock("@monaco-editor/react", () => ({ Editor: ({ value, onMount }: any) => {
  React.useEffect(() => {
    const editor = { value, revealLineInCenter: vi.fn(), setPosition: vi.fn(), focus: vi.fn(), createDecorationsCollection: () => ({ clear() {} }) };
    mountedEditors.push(editor);
    onMount(editor, { languages: { setMonarchTokensProvider() {} }, Range: class {} });
  }, []);
  return <div>Code editor</div>;
} }));
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("@/components/CopyToClipboard", () => ({ CopyToClipboard: () => null }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("retains search text and options across Search / Explorer switches, including before debounce", () => {
  Element.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} unobserve() {} });
  render(<ChakraProvider><SourceCodeExplorer sourceCode={{ "Token.sol": "contract Token { function transfer() external {} }" }} /></ChakraProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Search" }));
  fireEvent.change(screen.getByPlaceholderText("Search in files..."), { target: { value: "transfer" } });
  fireEvent.click(screen.getByRole("button", { name: "Case sensitive" }));
  fireEvent.click(screen.getByRole("button", { name: "Use regex" }));
  const caseStyle = screen.getByRole("button", { name: "Case sensitive" }).className;
  const regexStyle = screen.getByRole("button", { name: "Use regex" }).className;
  fireEvent.click(screen.getByRole("button", { name: /files/i }));
  expect(screen.queryByPlaceholderText("Search in files...")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Search" }));
  expect((screen.getByPlaceholderText("Search in files...") as HTMLInputElement).value).toBe("transfer");
  expect(screen.getByRole("button", { name: "Case sensitive" }).className).toBe(caseStyle);
  expect(screen.getByRole("button", { name: "Use regex" }).className).toBe(regexStyle);
  fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
  expect((screen.getByPlaceholderText("Search in files...") as HTMLInputElement).value).toBe("");
});


it("opens an unopened source file, reveals its line after mount, and repeats the jump without duplicating tabs", async () => {
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  const sources = { "Main.sol": "contract Main {}", "Base.sol": "contract Base {\n  function f() public {}\n}" };
  const wrapper = (navigation?: { path: string; line: number; column: number; revision: number }) =>
    <ChakraProvider><SourceCodeExplorer sourceCode={sources} targetFileName="Main.sol" navigation={navigation} /></ChakraProvider>;
  const view = render(wrapper());
  expect(screen.queryByRole("tab", { name: "Base.sol" })).toBeNull();
  view.rerender(wrapper({ path: "Base.sol", line: 2, column: 3, revision: 1 }));
  await waitFor(() => expect(screen.getByRole("tab", { name: "Base.sol" }).getAttribute("aria-selected")).toBe("true"));
  const editor = mountedEditors.at(-1);
  expect(editor.value).toBe(sources["Base.sol"]);
  expect(editor.revealLineInCenter).toHaveBeenCalledWith(2);
  expect(editor.setPosition).toHaveBeenCalledWith({ lineNumber: 2, column: 3 });
  expect(editor.focus).toHaveBeenCalled();
  editor.revealLineInCenter.mockClear();
  view.rerender(wrapper({ path: "Base.sol", line: 2, column: 3, revision: 2 }));
  await waitFor(() => expect(editor.revealLineInCenter).toHaveBeenCalledWith(2));
  expect(screen.getAllByRole("tab", { name: "Base.sol" })).toHaveLength(1);
});

it("returns from an annotation-opened tab to the last active file and its source view", async () => {
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  const sources = { "A.sol": "contract A {}", "B.sol": "contract B {}", "C.sol": "contract C {}", "D.sol": "contract D {}" };
  const diffData = Object.fromEntries(Object.entries(sources).map(([path, content]) => [path, { oldCode: "", oldExists: false, newCode: content, newExists: true, diffCode: content, changesCount: path === "D.sol" ? 0 : 1, linesAdded: 1, linesRemoved: 0 }]));
  render(<ChakraProvider><SourceCodeExplorer sourceCode={sources} diffData={diffData} /></ChakraProvider>);
  fireEvent.click(screen.getByRole("tab", { name: "B.sol" }));
  fireEvent.click(screen.getByRole("button", { name: "New" }));
  act(() => importActions.current.onOpenImport("D.sol"));
  await waitFor(() => expect(screen.getByRole("tab", { name: "D.sol" }).getAttribute("aria-selected")).toBe("true"));
  fireEvent.click(screen.getByRole("button", { name: "Close tab" }));
  expect(screen.getByRole("tab", { name: "B.sol" }).getAttribute("aria-selected")).toBe("true");
  expect(screen.queryByRole("tab", { name: "D.sol" })).toBeNull();
  expect(mountedEditors.at(-1).value).toBe(sources["B.sol"]);
});
