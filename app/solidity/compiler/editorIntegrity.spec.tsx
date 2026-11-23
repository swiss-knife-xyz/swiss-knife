import React, { useEffect, useRef, useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, waitFor, act } from "@testing-library/react";
import Editor, { loader, type OnMount } from "@monaco-editor/react";
import {
  bindWorkspaceEditor,
  updateEditorFile,
  workspaceModelPath,
  type WorkspaceEditorContext,
} from "./workspaceEditorBinding";
import type { SolidityWorkspace } from "@/lib/solidity/workspace";

afterEach(cleanup);
function fakeMonaco() {
  const models = new Map<string, any>();
  const listeners = new Set<(event: { isFlush: boolean }) => void>();
  let model: any,
    readOnly = false;
  const createModel = (initial: string, _language: string, uri: any) => {
    let value = initial;
    const item = {
      uri,
      getValue: () => value,
      getFullModelRange: () => ({}),
      dispose: vi.fn(),
      setValue: (next: string) => {
        value = next;
        if (model === item) listeners.forEach((fn) => fn({ isFlush: true }));
      },
      edit: (next: string) => {
        value = next;
        if (model === item) listeners.forEach((fn) => fn({ isFlush: false }));
      },
    };
    models.set(uri.toString(), item);
    return item;
  };
  const editor = {
    getModel: () => model,
    setModel: (next: any) => {
      model = next;
    },
    getValue: () => model.getValue(),
    setValue: (v: string) => model.setValue(v),
    getOption: () => readOnly,
    updateOptions: (o: any) => {
      readOnly = o.readOnly;
    },
    saveViewState: () => ({}),
    restoreViewState: () => {},
    executeEdits: (_: any, edits: any) => model.edit(edits[0].text),
    pushUndoStop: () => {},
    onDidChangeModelContent: (fn: any) => {
      listeners.add(fn);
      return { dispose: () => listeners.delete(fn) };
    },
    dispose: vi.fn(),
  };
  const monaco = {
    Uri: { parse: (path: string) => ({ path, toString: () => path }) },
    editor: {
      EditorOption: { readOnly: 1 },
      getModel: (uri: any) => models.get(uri.toString()),
      createModel,
      create: (_: any, o: any) => {
        model = o.model;
        readOnly = o.readOnly;
        return editor;
      },
      setTheme: () => {},
      onDidChangeMarkers: () => ({ dispose: () => {} }),
    },
  };
  return {
    editor: editor as unknown as Parameters<OnMount>[0],
    monaco,
    models,
    listeners,
    select(id: string, content: string) {
      model =
        models.get(workspaceModelPath(id)) ??
        createModel(content, "sol", monaco.Uri.parse(workspaceModelPath(id)));
      return model;
    },
    emit() {
      listeners.forEach((fn) => fn({ isFlush: false }));
    },
  };
}
function workspace(): SolidityWorkspace {
  return {
    files: [
      { id: "source", name: "Counter.sol", content: "CUSTOM TOKEN" },
      {
        id: "lib",
        name: "github.com/owner/repo/ERC20.sol",
        content: "DEPENDENCY",
      },
    ],
    dependencies: [
      {
        name: "github.com/owner/repo",
        version: "sha",
        files: [{ path: "github.com/owner/repo/ERC20.sol", integrity: "hash" }],
      },
    ],
    openFileIds: ["source", "lib"],
    activeFileId: "source",
  };
}
it("uses the installed React Monaco wrapper without writing dependency content into a previous tab", async () => {
  const fake = fakeMonaco();
  loader.config({ monaco: fake.monaco as any });
  const writes = vi.fn();
  const initial = workspace();
  function Harness({
    current,
    replay = 0,
  }: {
    current: SolidityWorkspace;
    replay?: number;
  }) {
    const context = useRef<WorkspaceEditorContext>({
      workspace: current,
      workspaceId: "a",
      blocked: false,
    });
    context.current = { workspace: current, workspaceId: "a", blocked: false };
    const [editor, setEditor] = useState<Parameters<OnMount>[0] | null>(null);
    const binding = useRef<ReturnType<typeof bindWorkspaceEditor> | null>(null);
    useEffect(() => {
      if (!editor) return;
      const next = bindWorkspaceEditor(editor, () => context.current, writes);
      binding.current = next;
      next.sync();
      return () => next.dispose();
    }, [editor, replay]);
    useEffect(() => {
      binding.current?.sync();
    }, [current, editor, replay]);
    const file = current.files.find((f) => f.id === current.activeFileId)!;
    return (
      <Editor
        path={workspaceModelPath(file.id)}
        defaultValue={file.content}
        options={{ readOnly: file.id === "lib" }}
        keepCurrentModel
        onMount={setEditor}
      />
    );
  }
  const view = render(<Harness current={initial} />);
  await waitFor(() => expect(fake.listeners.size).toBe(1));
  view.rerender(<Harness current={{ ...initial, activeFileId: "lib" }} />);
  await waitFor(() => expect(fake.editor.getValue()).toBe("DEPENDENCY"));
  expect(writes).not.toHaveBeenCalled();
  // Effect replay models Fast Refresh while the readonly model stays attached.
  view.rerender(
    <Harness current={{ ...initial, activeFileId: "lib" }} replay={1} />
  );
  expect(writes).not.toHaveBeenCalled();
  view.rerender(<Harness current={initial} replay={1} />);
  await waitFor(() => expect(fake.editor.getValue()).toBe("CUSTOM TOKEN"));
  act(() => fake.models.get(workspaceModelPath("source")).edit("USER EDIT"));
  expect(writes).toHaveBeenCalledExactlyOnceWith("a", "source", "USER EDIT");
});
it("rejects stale model events, locked sources, flushes and blocked workspace transitions", () => {
  const fake = fakeMonaco();
  const current = workspace();
  let context: WorkspaceEditorContext = {
    workspace: current,
    workspaceId: "a",
    blocked: false,
  };
  const source = fake.select("source", "CUSTOM TOKEN");
  const write = vi.fn();
  const binding = bindWorkspaceEditor(fake.editor, () => context, write);
  source.setValue("PROGRAMMATIC RESET");
  expect(write).not.toHaveBeenCalled();
  context = { ...context, workspace: { ...current, activeFileId: "lib" } };
  source.edit("LATE SOURCE EVENT");
  expect(write).not.toHaveBeenCalled();
  fake.select("lib", "DEPENDENCY").edit("LOCKED EDIT");
  expect(write).not.toHaveBeenCalled();
  context = { workspace: current, workspaceId: "b", blocked: true };
  fake.select("source", "CUSTOM TOKEN").edit("DURING SWITCH");
  expect(write).not.toHaveBeenCalled();
  context = { ...context, blocked: false };
  binding.sync();
  expect(source.getValue()).toBe("CUSTOM TOKEN");
  expect(write).not.toHaveBeenCalled();
  source.edit("NORMAL EDIT");
  expect(write).toHaveBeenCalledWith("b", "source", "NORMAL EDIT");
  binding.dispose();
  source.edit("AFTER UNMOUNT");
  expect(write).toHaveBeenCalledTimes(1);
});
it("rechecks file identity and readonly status against the current workspace before saving", () => {
  const current = workspace();
  expect(updateEditorFile(current, "lib", "bad")).toBe(current);
  expect(updateEditorFile(current, "deleted", "bad")).toBe(current);
  expect(
    updateEditorFile({ ...current, activeFileId: "lib" }, "source", "bad").files
  ).toEqual(current.files);
  const next = updateEditorFile(current, "source", "edit");
  expect(next.files[0].content).toBe("edit");
  expect(next.files[1]).toBe(current.files[1]);
});
