import React from "react";
import "fake-indexeddb/auto";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import {
  loadWorkspace,
  saveWorkspace,
  validateFileName,
  WorkspaceConflictError,
} from "@/lib/solidity/workspace";
import { useLocalWorkspace } from "./useLocalWorkspace";
import { closeWorkspaceFile, selectWorkspaceFile } from "./WorkspaceFiles";

beforeEach(() => vi.resetModules());
afterEach(cleanup);

async function repository() {
  // Each test gets its own IDB connection/schema and isolated backing factory.
  const { IDBFactory } = await import("fake-indexeddb");
  vi.stubGlobal("indexedDB", new IDBFactory());
  return import("@/lib/solidity/workspace");
}

it("creates a default file once and restores multiple files and open tabs", async () => {
  const repo = await repository();
  const first = await repo.loadWorkspace("contract Counter {}");
  const newFile = {
    id: "second",
    name: "Token.sol",
    content: "contract Token {}",
  };
  const next = {
    files: [...first.workspace.files, newFile],
    openFileIds: [newFile.id],
    activeFileId: newFile.id,
  };
  await repo.saveWorkspace(next, first);
  const loaded = await repo.loadWorkspace("must not replace existing code");
  expect(loaded.revision).toBe(2);
  expect(loaded.workspace.files).toEqual(expect.arrayContaining(next.files));
  expect(loaded.workspace.activeFileId).toBe("second");
  expect(loaded.workspace.openFileIds).toEqual(["second"]);
});

it("atomically saves edits, renames and deletions while retaining closed files", async () => {
  const repo = await repository();
  const first = await repo.loadWorkspace("original");
  const file = first.workspace.files[0];
  const next = {
    ...first.workspace,
    files: [{ ...file, name: "Renamed.sol", content: "edited" }],
    activeFileId: null,
    openFileIds: [],
  };
  const saved = await repo.saveWorkspace(next, first);
  expect((await repo.loadWorkspace("ignored")).workspace).toEqual({
    ...next,
    folders: [],
  });
  await repo.saveWorkspace(
    { files: [], activeFileId: null, openFileIds: [] },
    saved
  );
  expect(
    (await repo.loadWorkspace("do not recreate deleted files")).workspace.files
  ).toEqual([]);
});

it("rejects stale-tab writes instead of overwriting newer files", async () => {
  const repo = await repository();
  const a = await repo.loadWorkspace("original");
  const b = await repo.loadWorkspace("ignored");
  const edited = {
    ...a.workspace,
    files: a.workspace.files.map((file) => ({ ...file, content: "newer" })),
  };
  await repo.saveWorkspace(edited, a);
  await expect(
    repo.saveWorkspace({ ...b.workspace, files: [] }, b)
  ).rejects.toBeInstanceOf(repo.WorkspaceConflictError);
  expect((await repo.loadWorkspace("ignored")).workspace.files[0].content).toBe(
    "newer"
  );
});

it("rolls back the entire transaction if a write fails", async () => {
  const repo = await repository();
  const first = await repo.loadWorkspace("original");
  // Uncloneable data causes an IndexedDB write failure after deletion is queued.
  const invalid = {
    ...first.workspace,
    files: [
      { id: "bad", name: "Bad.sol", content: (() => {}) as unknown as string },
    ],
  };
  await expect(repo.saveWorkspace(invalid, first)).rejects.toThrow();
  const loaded = await repo.loadWorkspace("ignored");
  expect(loaded.revision).toBe(first.revision);
  expect(loaded.workspace.files[0].content).toBe("original");
});

it("validates names and preserves file contents when tabs close", () => {
  const file = { id: "a", name: "Counter.sol", content: "keep me" };
  expect(() => validateFileName("counter.sol", [file])).toThrow(
    "already exists"
  );
  expect(() => validateFileName("../Token.sol", [])).toThrow("Solidity path");
  expect(validateFileName("Counter.sol", [file], "a")).toBe("Counter.sol");
  const closed = closeWorkspaceFile(
    { files: [file], activeFileId: "a", openFileIds: ["a"] },
    "a"
  );
  expect(closed.files).toEqual([file]);
  expect(closed.activeFileId).toBe(null);
  expect(selectWorkspaceFile(closed, "a").activeFileId).toBe("a");
});

it("autosaves and restores the final edit even when another save is in flight", async () => {
  await repository();
  const { useLocalWorkspace: useWorkspace } = await import(
    "./useLocalWorkspace"
  );
  const hook = renderHook(() => useWorkspace("initial"), {
    wrapper: React.StrictMode,
  });
  await waitFor(() => expect(hook.result.current.status).toBe("saved"));
  act(() =>
    hook.result.current.update((current) => ({
      ...current,
      files: current.files.map((file) => ({ ...file, content: "first" })),
    }))
  );
  let save!: Promise<void>;
  act(() => {
    save = hook.result.current.flush();
  });
  act(() =>
    hook.result.current.update((current) => ({
      ...current,
      files: current.files.map((file) => ({ ...file, content: "latest" })),
    }))
  );
  await act(async () => {
    await save;
  });
  expect(hook.result.current.status).toBe("saved");
  hook.unmount();
  const again = renderHook(() => useWorkspace("ignored"));
  await waitFor(() => expect(again.result.current.status).toBe("saved"));
  expect(again.result.current.workspace?.files[0].content).toBe("latest");
});

it("keeps unsaved edits after a storage failure and retries without losing them", async () => {
  const repo = await repository();
  const { useLocalWorkspace: useWorkspace } = await import(
    "./useLocalWorkspace"
  );
  const hook = renderHook(() => useWorkspace("initial"));
  await waitFor(() => expect(hook.result.current.status).toBe("saved"));
  const failure = vi
    .spyOn(repo, "saveWorkspace")
    .mockRejectedValueOnce(
      new DOMException("Storage quota exceeded", "QuotaExceededError")
    );
  act(() =>
    hook.result.current.update((current) => ({
      ...current,
      files: current.files.map((file) => ({
        ...file,
        content: "do not lose this",
      })),
    }))
  );
  await act(async () => {
    await hook.result.current.flush();
  });
  expect(hook.result.current.status).toBe("error");
  expect(hook.result.current.workspace?.files[0].content).toBe(
    "do not lose this"
  );
  expect((await repo.loadWorkspace("ignored")).workspace.files[0].content).toBe(
    "initial"
  );
  failure.mockRestore();
  await act(async () => {
    await hook.result.current.flush();
  });
  expect(hook.result.current.status).toBe("saved");
  expect((await repo.loadWorkspace("ignored")).workspace.files[0].content).toBe(
    "do not lose this"
  );
});

it("warns before closing while edits are unsaved and stops warning after saving", async () => {
  await repository();
  const { useLocalWorkspace: useWorkspace } = await import(
    "./useLocalWorkspace"
  );
  const hook = renderHook(() => useWorkspace("initial"));
  await waitFor(() => expect(hook.result.current.status).toBe("saved"));
  const savedClose = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(savedClose);
  expect(savedClose.defaultPrevented).toBe(false);
  act(() =>
    hook.result.current.update((current) => ({
      ...current,
      files: current.files.map((file) => ({
        ...file,
        content: "pending edit",
      })),
    }))
  );
  const unsavedClose = new Event("beforeunload", { cancelable: true });
  act(() => {
    window.dispatchEvent(unsavedClose);
  });
  expect(unsavedClose.defaultPrevented).toBe(true);
  await act(async () => {
    await hook.result.current.flush();
  });
  const afterSave = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(afterSave);
  expect(afterSave.defaultPrevented).toBe(false);
});

it("migrates the old single workspace without changing its files, IDs or tabs", async () => {
  const repo = await repository();
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("ethsh-solidity", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("workspaces", { keyPath: "id" });
      request.result
        .createObjectStore("files", { keyPath: "id" })
        .createIndex("workspaceId", "workspaceId");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(["workspaces", "files"], "readwrite");
    tx.objectStore("workspaces").put({
      id: "default",
      revision: 7,
      activeFileId: "existing",
      openFileIds: ["existing"],
    });
    tx.objectStore("files").put({
      id: "existing",
      workspaceId: "default",
      name: "Original.sol",
      content: "keep this exact code",
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  const migrated = await repo.loadWorkspace("must not replace existing data");
  expect(migrated).toMatchObject({
    id: "default",
    name: "Workspace",
    revision: 7,
    workspace: {
      activeFileId: "existing",
      openFileIds: ["existing"],
      files: [
        {
          id: "existing",
          name: "Original.sol",
          content: "keep this exact code",
        },
      ],
    },
  });
});

it("isolates named workspaces and remembers the last selected workspace", async () => {
  const repo = await repository();
  const a = await repo.loadWorkspace("A code");
  const b = await repo.createWorkspace("Token demo", "B code");
  expect(b.id).not.toBe(a.id);
  expect((await repo.loadWorkspace("ignored")).id).toBe(b.id);
  const changed = await repo.saveWorkspace(
    {
      ...b.workspace,
      openFileIds: [],
      activeFileId: null,
      files: b.workspace.files.map((file) => ({
        ...file,
        name: "B.sol",
        content: "B edited",
      })),
    },
    b
  );
  const restoredA = await repo.loadWorkspace("ignored", a.id);
  expect(restoredA.workspace.files[0].content).toBe("A code");
  const restoredB = await repo.loadWorkspace("ignored", changed.id);
  expect(restoredB.workspace.files[0]).toMatchObject({
    name: "B.sol",
    content: "B edited",
  });
  expect(restoredB.workspace.openFileIds).toEqual([]);
  expect((await repo.loadWorkspace("ignored")).id).toBe(b.id);
});

it("renames workspaces atomically and rejects duplicate names without changing data", async () => {
  const repo = await repository();
  const a = await repo.loadWorkspace("original");
  const b = await repo.createWorkspace("Token demo", "B");
  const renamed = await repo.renameWorkspace(b, "  NFT demo  ");
  expect(renamed.name).toBe("NFT demo");
  await expect(
    repo.createWorkspace("nft DEMO", "must not create")
  ).rejects.toThrow("already exists");
  await expect(repo.renameWorkspace(a, "NFT demo")).rejects.toThrow(
    "already exists"
  );
  expect(await repo.listWorkspaces()).toHaveLength(2);
  expect(
    (await repo.loadWorkspace("ignored", a.id)).workspace.files[0].content
  ).toBe("original");
});

it("deletes only the selected workspace, blocks stale writes and keeps at least one workspace", async () => {
  const repo = await repository();
  const a = await repo.loadWorkspace("A code");
  const b = await repo.createWorkspace("Disposable", "B code");
  await repo.deleteWorkspace(b);
  await expect(repo.loadWorkspace("ignored", b.id)).rejects.toBeInstanceOf(
    repo.WorkspaceMissingError
  );
  await expect(repo.saveWorkspace(b.workspace, b)).rejects.toBeInstanceOf(
    repo.WorkspaceMissingError
  );
  expect((await repo.loadWorkspace("ignored")).id).toBe(a.id);
  expect((await repo.loadWorkspace("ignored")).workspace.files[0].content).toBe(
    "A code"
  );
  await expect(repo.deleteWorkspace(a)).rejects.toThrow("at least one");
});

it("flushes edits before creating/switching workspaces and restores each workspace's tabs", async () => {
  await repository();
  const { useLocalWorkspace: useWorkspace } = await import(
    "./useLocalWorkspace"
  );
  const hook = renderHook(() => useWorkspace("initial"));
  await waitFor(() => expect(hook.result.current.status).toBe("saved"));
  const a = hook.result.current.activeWorkspace!.id;
  act(() =>
    hook.result.current.update((current) => ({
      ...current,
      files: current.files.map((file) => ({
        ...file,
        content: "A final edit",
      })),
      openFileIds: [],
      activeFileId: null,
    }))
  );
  await act(async () => {
    await hook.result.current.addWorkspace("Demo");
  });
  const b = hook.result.current.activeWorkspace!.id;
  expect(b).not.toBe(a);
  expect(hook.result.current.workspace?.files[0].content).toBe("initial");
  await act(async () => {
    await hook.result.current.switchWorkspace(a);
  });
  expect(hook.result.current.workspace?.files[0].content).toBe("A final edit");
  expect(hook.result.current.workspace?.openFileIds).toEqual([]);
  await act(async () => {
    await hook.result.current.switchWorkspace(b);
  });
  expect(hook.result.current.workspace?.openFileIds).toHaveLength(1);
  act(() =>
    hook.result.current.update((current) => ({ ...current, files: [] }), a)
  );
  expect(hook.result.current.workspace?.files).toHaveLength(1);
});

it("refuses to switch on save failure and keeps unsaved edits available", async () => {
  const repo = await repository();
  const { useLocalWorkspace: useWorkspace } = await import(
    "./useLocalWorkspace"
  );
  const hook = renderHook(() => useWorkspace("initial"));
  await waitFor(() => expect(hook.result.current.status).toBe("saved"));
  const a = hook.result.current.activeWorkspace!.id;
  await act(async () => {
    await hook.result.current.addWorkspace("Demo");
  });
  const b = hook.result.current.activeWorkspace!.id;
  await act(async () => {
    await hook.result.current.switchWorkspace(a);
  });
  act(() =>
    hook.result.current.update((current) => ({
      ...current,
      files: current.files.map((file) => ({ ...file, content: "unsaved" })),
    }))
  );
  const failure = vi
    .spyOn(repo, "saveWorkspace")
    .mockRejectedValueOnce(
      new DOMException("Quota exceeded", "QuotaExceededError")
    );
  await act(async () => {
    await expect(hook.result.current.switchWorkspace(b)).rejects.toThrow(
      "Quota exceeded"
    );
  });
  expect(hook.result.current.activeWorkspace?.id).toBe(a);
  expect(hook.result.current.workspace?.files[0].content).toBe("unsaved");
  expect(hook.result.current.isChanging).toBe(false);
  failure.mockRestore();
  await act(async () => {
    await hook.result.current.switchWorkspace(b);
  });
  await act(async () => {
    await hook.result.current.switchWorkspace(a);
  });
  expect(hook.result.current.workspace?.files[0].content).toBe("unsaved");
});

it("persists nested source paths and empty folders across reload", async () => {
  const repo = await repository();
  const saved = await repo.loadWorkspace("initial");
  const workspace = {
    ...saved.workspace,
    folders: ["contracts/utils", "empty"],
    files: saved.workspace.files.map((file) => ({
      ...file,
      name: "contracts/Counter.sol",
    })),
  };
  await repo.saveWorkspace(workspace, saved);
  expect((await repo.loadWorkspace("ignored")).workspace).toEqual(workspace);
});

it("creates an imported workspace atomically and auto-switches after saving current edits", async () => {
  const repo = await repository();
  const { useLocalWorkspace: useWorkspace } = await import(
    "./useLocalWorkspace"
  );
  const hook = renderHook(() => useWorkspace("original"));
  await waitFor(() => expect(hook.result.current.status).toBe("saved"));
  const oldId = hook.result.current.activeWorkspace!.id;
  act(() =>
    hook.result.current.update((current) => ({
      ...current,
      files: current.files.map((file) => ({
        ...file,
        content: "pending edit",
      })),
    }))
  );
  const imported = {
    files: [
      {
        id: crypto.randomUUID(),
        name: "contracts/Imported.sol",
        content: "contract Imported{}",
      },
    ],
    folders: ["contracts", "empty"],
    activeFileId: null as string | null,
    openFileIds: [] as string[],
    compilerSettings: {
      version: "soljson-v0.8.28+commit.7893614a.js",
      optimizer: true,
      runs: 999,
      evmVersion: "paris",
      viaIR: false,
    },
  };
  imported.activeFileId = imported.files[0].id;
  imported.openFileIds = [imported.activeFileId];
  await act(async () => {
    await hook.result.current.importWorkspace("Imported", imported);
  });
  expect(hook.result.current.activeWorkspace?.name).toBe("Imported");
  const newId = hook.result.current.activeWorkspace!.id;
  expect(newId).not.toBe(oldId);
  expect(hook.result.current.workspace).toEqual(imported);
  expect((await repo.loadWorkspace("ignored")).id).toBe(newId);
  expect(
    (await repo.loadWorkspace("ignored", oldId)).workspace.files[0].content
  ).toBe("pending edit");
  expect((await repo.loadWorkspace("ignored", newId)).workspace).toEqual(
    imported
  );
  const before = (await repo.listWorkspaces()).length;
  await expect(
    repo.createWorkspace("Imported", "starter", {
      ...imported,
      files: imported.files.map((file) => ({
        ...file,
        id: crypto.randomUUID(),
      })),
    })
  ).rejects.toThrow("already exists");
  expect((await repo.listWorkspaces()).length).toBe(before);
  expect((await repo.loadWorkspace("ignored")).id).toBe(newId);
});

it("persists dependency locks with atomic workspace saves and restores their source files", async () => {
  const repo = await repository();
  const first = await repo.loadWorkspace("contract A{}");
  const dependency = {
    id: "dependency",
    name: "@test/pkg/A.sol",
    content: "contract Library{}",
  };
  const lock = {
    name: "@test/pkg",
    version: "1.0.0",
    files: [{ path: dependency.name, integrity: "sha256-pinned" }],
  };
  const workspace = {
    ...first.workspace,
    files: [...first.workspace.files, dependency],
    dependencies: [lock],
  };
  await repo.saveWorkspace(workspace, first);
  const restored = await repo.loadWorkspace("ignored", first.id);
  expect(restored.workspace.dependencies).toEqual([lock]);
  expect(restored.workspace.files).toContainEqual(dependency);
  const removed = {
    ...restored.workspace,
    files: first.workspace.files,
    dependencies: [],
  };
  await repo.saveWorkspace(removed, restored);
  const reloaded = await repo.loadWorkspace("ignored", first.id);
  expect(reloaded.workspace.dependencies ?? []).toEqual([]);
  expect(reloaded.workspace.files).toEqual(first.workspace.files);
});

it("keeps in-memory edits when initialization effects replay during a save", async () => {
  const repo = await repository();
  const { useLocalWorkspace: useWorkspace } = await import("./useLocalWorkspace");
  const hook = renderHook(({initial}) => useWorkspace(initial), {initialProps:{initial:"initial"}});
  await waitFor(() => expect(hook.result.current.status).toBe("saved"));
  const loads = vi.spyOn(repo,"loadWorkspace");
  const realSave = repo.saveWorkspace;
  let release!: () => void;
  const gate = new Promise<void>(resolve => {release=resolve;});
  const saving = vi.spyOn(repo,"saveWorkspace").mockImplementationOnce(async (...args) => {
    await gate; return realSave(...args);
  });
  act(() => hook.result.current.update(current => ({...current,
    files:current.files.map(file => ({...file,content:"first pending edit"}))})));
  let flush!: Promise<void>;
  act(() => {flush=hook.result.current.flush();});
  act(() => hook.result.current.update(current => ({...current,
    files:current.files.map(file => ({...file,content:"newest pending edit"}))})));
  // Changing the initializer replays the same cleanup/setup used by Fast Refresh.
  hook.rerender({initial:"changed initializer"});
  expect(hook.result.current.workspace?.files[0].content).toBe("newest pending edit");
  expect(loads).not.toHaveBeenCalled();
  await act(async () => {release();await flush;});
  expect(hook.result.current.status).toBe("saved");
  expect((await repo.loadWorkspace("ignored")).workspace.files[0].content).toBe("newest pending edit");
  loads.mockRestore();saving.mockRestore();
});

it("rejects editor callbacks belonging to a previous workspace after switching", async () => {
  await repository();
  const {useLocalWorkspace:useWorkspace}=await import("./useLocalWorkspace");
  const hook=renderHook(()=>useWorkspace("initial"));
  await waitFor(()=>expect(hook.result.current.status).toBe("saved"));
  const previousId=hook.result.current.activeWorkspace!.id;
  await act(async()=>{await hook.result.current.addWorkspace("Second workspace");});
  const current=hook.result.current.workspace;
  act(()=>hook.result.current.update(value=>({...value,files:[]}),previousId));
  expect(hook.result.current.workspace).toBe(current);
});
