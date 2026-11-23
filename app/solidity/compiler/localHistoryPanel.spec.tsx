import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { LocalHistory } from "./LocalHistory";
const source = vi.hoisted(() => ({ list: vi.fn(), read: vi.fn() }));
vi.mock("@/lib/solidity/workspace", () => ({
  listSourceRevisions: source.list,
  readSourceRevision: source.read,
}));
vi.mock("next/dynamic", () => ({
  default:
    () =>
    ({ diff }: any) => (
      <div aria-label="Source diff">
        {diff.oldCode} → {diff.newCode}
      </div>
    ),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const revision = {
  id: "r",
  workspaceId: "w",
  fileId: "a",
  path: "A.sol",
  hash: "hash",
  bytes: 3,
  createdAt: 1000,
  reason: "Editing",
};
const request = { workspaceId: "w" };
function props() {
  source.list.mockResolvedValue([revision]);
  source.read.mockResolvedValue({ ...revision, content: "old" });
  return {
    request,
    workspace: {
      files: [{ id: "a", name: "A.sol", content: "current" }],
      activeFileId: "a",
      openFileIds: ["a"],
    },
    disabled: false,
    onClose: vi.fn(),
    onRestore: vi.fn().mockResolvedValue(undefined),
  };
}
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ChakraProvider>{children}</ChakraProvider>
);
it("previews source changes and restores the selected revision only after an explicit action", async () => {
  const input = props();
  render(<LocalHistory {...input} />, { wrapper });
  fireEvent.click(await screen.findByRole("button", { name: /A.sol/ }));
  await screen.findByText("current → old");
  expect(input.onRestore).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Restore revision" }));
  await waitFor(() =>
    expect(input.onRestore).toHaveBeenCalledWith(
      "r",
      input.workspace.files[0],
      "w"
    )
  );
  expect(input.onClose).toHaveBeenCalledOnce();
});
it("blocks a stale preview and lets the same revision be selected again", async () => {
  const input = props();
  const view = render(<LocalHistory {...input} />, { wrapper });
  fireEvent.click(await screen.findByRole("button", { name: /A.sol/ }));
  await screen.findByText("current → old");
  view.rerender(
    <LocalHistory
      {...input}
      workspace={{
        ...input.workspace,
        files: [{ ...input.workspace.files[0], content: "newer" }],
      }}
    />
  );
  expect(
    (
      screen.getByRole("button", {
        name: "Restore revision",
      }) as HTMLButtonElement
    ).disabled
  ).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: /A.sol/ }));
  await screen.findByText("newer → old");
  fireEvent.click(screen.getByRole("button", { name: "Restore revision" }));
  await waitFor(() =>
    expect(input.onRestore).toHaveBeenCalledWith(
      "r",
      expect.objectContaining({ content: "newer" }),
      "w"
    )
  );
});
it("can filter deleted files and recover one without an existing file target", async () => {
  const input = props();
  render(
    <LocalHistory
      {...input}
      workspace={{ files: [], activeFileId: null, openFileIds: [] }}
    />,
    { wrapper }
  );
  fireEvent.click(screen.getByRole("checkbox", { name: "Deleted files" }));
  fireEvent.click(await screen.findByRole("button", { name: /A.sol/ }));
  await screen.findByText("→ old");
  fireEvent.click(screen.getByRole("button", { name: "Restore file" }));
  await waitFor(() =>
    expect(input.onRestore).toHaveBeenCalledWith("r", null, "w")
  );
});
it("uses a source-only preview for large revisions instead of expensive diff rendering", async () => {
  const input = props();
  source.read.mockResolvedValue({ ...revision, content: "x".repeat(260000) });
  render(<LocalHistory {...input} />, { wrapper });
  fireEvent.click(await screen.findByRole("button", { name: /A.sol/ }));
  const textarea = await screen.findByRole("textbox", {
    name: "Revision source",
  });
  expect((textarea as HTMLTextAreaElement).value).toHaveLength(260000);
});
