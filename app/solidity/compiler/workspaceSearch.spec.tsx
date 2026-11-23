import React, { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { searchAllFiles } from "@/components/SourceCodeExplorer/search";
import { SearchPanel } from "@/components/SourceCodeExplorer/SearchPanel";
import {
  planReplacements,
  applyReplacements,
} from "@/lib/solidity/workspaceSearch";
import type { SolidityWorkspace } from "@/lib/solidity/workspace";
import { WorkspaceFiles } from "./WorkspaceFiles";
const options = { caseSensitive: false, regex: false };
const makeWorkspace = (): SolidityWorkspace => ({
  activeFileId: "a",
  openFileIds: ["a"],
  files: [
    { id: "a", name: "Token.sol", content: "Token token\nuint x;" },
    { id: "b", name: "Other.sol", content: "Token" },
    { id: "lib", name: "@pkg/lib/Lib.sol", content: "Token" },
  ],
  dependencies: [
    {
      name: "@pkg/lib",
      version: "1.0.0",
      files: [{ path: "@pkg/lib/Lib.sol", integrity: "hash" }],
    },
  ],
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("searches one character, nonoverlapping matches and zero-width regex consistently", () => {
  expect(searchAllFiles({ a: "aaa" }, "aa", options)[0].matches).toHaveLength(
    1
  );
  expect(searchAllFiles({ a: "x\nx" }, "x", options)[0].matches).toHaveLength(
    2
  );
  expect(
    searchAllFiles({ a: "x\ny" }, "^", { ...options, regex: true })[0].matches
  ).toHaveLength(2);
  expect(searchAllFiles({ a: "[" }, "[", { ...options, regex: true })).toEqual(
    []
  );
});
it("replaces every editable file atomically, supports safe undo and leaves dependency locks intact", () => {
  const original = makeWorkspace();
  const plan = planReplacements(original, "token", "Coin", options);
  expect(plan.count).toBe(3);
  const updated = applyReplacements(original, plan);
  expect(updated.files.map((file) => file.content)).toEqual([
    "Coin Coin\nuint x;",
    "Coin",
    "Token",
  ]);
  expect(updated.dependencies).toBe(original.dependencies);
  expect(applyReplacements(updated, plan, true)).toEqual(original);
  const newer = {
    ...updated,
    files: updated.files.map((file) =>
      file.id === "a" ? { ...file, content: "newer edit" } : file
    ),
  };
  expect(applyReplacements(newer, plan, true)).toBe(newer);
  const renamed = {
    ...original,
    files: original.files.map((file) => ({
      ...file,
      name: `new/${file.name}`,
    })),
  };
  expect(applyReplacements(renamed, plan)).toBe(renamed);
});
it("handles regex captures, empty replacement, literal dollars, CRLF and file-only replacement", () => {
  const workspace = makeWorkspace();
  workspace.files[0].content = "Token42\r\nToken12";
  const plan = planReplacements(
    workspace,
    "Token(\\d+)",
    "Coin$1",
    { ...options, regex: true },
    "Token.sol"
  );
  expect(plan.files[0].after).toBe("Coin42\r\nCoin12");
  expect(plan.files).toHaveLength(1);
  expect(
    planReplacements(workspace, "Token", "$&", options).files[0].after
  ).toBe("$&42\r\n$&12");
  expect(planReplacements(workspace, "Token", "", options).files[0].after).toBe(
    "42\r\n12"
  );
  expect(() =>
    planReplacements(workspace, "[", "", { ...options, regex: true })
  ).toThrow();
});
it("replacement is not truncated by the display limit", () => {
  const workspace = makeWorkspace();
  workspace.files[0].content = "Token\n".repeat(1200);
  const plan = planReplacements(workspace, "Token", "Coin", options);
  expect(plan.count).toBe(1201);
  expect(plan.files[0].count).toBe(1200);
  expect(plan.files[0].preview).toHaveLength(100);
});
it("read-only source explorers have no replacement controls", () => {
  render(
    <ChakraProvider>
      <SearchPanel sourceCode={{ a: "abc" }} onResultClick={() => {}} isOpen />
    </ChakraProvider>
  );
  expect(screen.queryByRole("button", { name: "Replace" })).toBeNull();
});
it("previews before changing files, keeps the search draft, and Undo restores the workspace", async () => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  let current = makeWorkspace();
  function Harness() {
    const [workspace, setWorkspace] = useState(current);
    return (
      <WorkspaceFiles
        workspace={workspace}
        update={(edit) => setWorkspace((before) => (current = edit(before)))}
        disabled={false}
        isOpen={true}
        onClose={() => {}}
      />
    );
  }
  render(
    <ChakraProvider>
      <Harness />
    </ChakraProvider>
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Search workspace files" })
  );
  fireEvent.change(screen.getByPlaceholderText("Search in files..."), {
    target: { value: "Token" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Replace" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Replace with" }), {
    target: { value: "Coin" },
  });
  await waitFor(() =>
    expect(
      (
        screen.getByRole("button", {
          name: "Replace all…",
        }) as HTMLButtonElement
      ).disabled
    ).toBe(false)
  );
  fireEvent.click(screen.getByRole("button", { name: "Replace all…" }));
  expect(await screen.findByText("Review replacements")).toBeTruthy();
  expect(current.files[0].content).toContain("Token");
  fireEvent.click(screen.getByRole("button", { name: "Replace all" }));
  await waitFor(() => expect(current.files[0].content).toContain("Coin"));
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  await waitFor(() =>
    expect(current.files[0].content).toBe("Token token\nuint x;")
  );
  fireEvent.click(screen.getByRole("button", { name: "Show workspace files" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Search workspace files" })
  );
  expect(
    (screen.getByPlaceholderText("Search in files...") as HTMLInputElement)
      .value
  ).toBe("Token");
});

it("opens workspace search and replace with keyboard shortcuts", () => {
  const onOpen = vi.fn();
  render(
    <ChakraProvider>
      <WorkspaceFiles
        workspace={makeWorkspace()}
        update={() => {}}
        disabled={false}
        isOpen={false}
        onClose={() => {}}
        onOpen={onOpen}
      />
    </ChakraProvider>
  );
  fireEvent.keyDown(window, { key: "F", metaKey: true, shiftKey: true });
  expect(screen.getByPlaceholderText("Search in files...")).toBeTruthy();
  expect(onOpen).toHaveBeenCalledTimes(1);
  fireEvent.keyDown(window, { key: "H", ctrlKey: true, shiftKey: true });
  expect(screen.getByPlaceholderText("Replace with...")).toBeTruthy();
});
it("shows invalid regex and prevents replacement", () => {
  render(
    <ChakraProvider>
      <SearchPanel
        sourceCode={{ a: "abc" }}
        onResultClick={() => {}}
        isOpen
        replacement={{
          writablePaths: new Set(["a"]),
          disabled: false,
          onPreview: vi.fn(),
        }}
      />
    </ChakraProvider>
  );
  fireEvent.click(screen.getByRole("button", { name: "Replace" }));
  fireEvent.click(screen.getByRole("button", { name: "Use regex" }));
  fireEvent.change(screen.getByPlaceholderText("Search in files..."), {
    target: { value: "[" },
  });
  expect(screen.getByRole("alert").textContent).toBe(
    "Invalid regular expression"
  );
  expect(
    (screen.getByRole("button", { name: "Replace all…" }) as HTMLButtonElement)
      .disabled
  ).toBe(true);
});
