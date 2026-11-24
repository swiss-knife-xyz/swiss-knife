import React from "react";
import "fake-indexeddb/auto";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import {
  retainedRevisions,
  HISTORY_LIMITS,
  type SourceRevision,
} from "@/lib/solidity/revisionHistory";

beforeEach(() => vi.resetModules());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
async function repository() {
  const { IDBFactory } = await import("fake-indexeddb");
  vi.stubGlobal("indexedDB", new IDBFactory());
  return import("@/lib/solidity/workspace");
}
function edited(saved: any, content: string) {
  return {
    ...saved.workspace,
    files: saved.workspace.files.map((file: any, index: number) =>
      index ? file : { ...file, content }
    ),
  };
}
it("groups automatic checkpoints across saves and reloads while retaining the original", async () => {
  const repo = await repository();
  const clock = vi.spyOn(Date, "now").mockReturnValue(100_000);
  const first = await repo.loadWorkspace("original");
  const second = await repo.saveWorkspace(edited(first, "one"), first);
  const third = await repo.saveWorkspace(edited(second, "two"), second);
  expect(await repo.listSourceRevisions(first.id)).toHaveLength(1);
  clock.mockReturnValue(131_000);
  await repo.saveWorkspace(edited(third, "three"), third);
  const rows = await repo.listSourceRevisions(first.id);
  expect(rows).toHaveLength(2);
  expect((await repo.readSourceRevision(first.id, rows[0].id))?.content).toBe(
    "two"
  );
  expect((await repo.readSourceRevision(first.id, rows[1].id))?.content).toBe(
    "original"
  );
  expect((await repo.loadWorkspace("ignored")).workspace.files[0].content).toBe(
    "three"
  );
});
it("protects an unsaved pre-replacement edit, restores without changing settings, and makes restore reversible", async () => {
  const repo = await repository();
  const { useLocalWorkspace } = await import("./useLocalWorkspace");
  const { result } = renderHook(() => useLocalWorkspace("original"));
  await waitFor(() => expect(result.current.status).toBe("saved"));
  await act(async () => {
    result.current.update((current) => ({
      ...current,
      files: current.files.map((file) => ({ ...file, content: "unsaved" })),
    }));
    result.current.update(
      (current) => ({
        ...current,
        files: current.files.map((file) => ({
          ...file,
          content: "replacement",
        })),
      }),
      undefined,
      "Before replace all"
    );
    await result.current.flush();
  });
  const workspaceId = result.current.activeWorkspace!.id;
  let rows = await repo.listSourceRevisions(workspaceId);
  const before = rows.find((row) => row.reason === "Before replace all")!;
  expect((await repo.readSourceRevision(workspaceId, before.id))?.content).toBe(
    "unsaved"
  );
  const expected = result.current.workspace!.files[0];
  await act(() =>
    result.current.restoreRevision(before.id, expected, workspaceId)
  );
  expect(result.current.workspace!.files[0].content).toBe("unsaved");
  rows = await repo.listSourceRevisions(workspaceId);
  const undo = rows.find((row) => row.reason === "Before restore")!;
  expect((await repo.readSourceRevision(workspaceId, undo.id))?.content).toBe(
    "replacement"
  );
});
it("retains file identity across renames and recovers deleted files into open tabs", async () => {
  const repo = await repository();
  let saved = await repo.loadWorkspace("original");
  const id = saved.workspace.files[0].id;
  saved = await repo.saveWorkspace(
    {
      ...saved.workspace,
      files: [{ id, name: "nested/Renamed.sol", content: "edited" }],
    },
    saved
  );
  saved = await repo.saveWorkspace(
    { files: [], openFileIds: [], activeFileId: null },
    saved
  );
  const row = (await repo.listSourceRevisions(saved.id)).find(
    (row) => row.reason === "Before deletion"
  )!;
  const restored = await repo.restoreSourceRevision(saved, row.id, null);
  expect(restored.workspace.files).toEqual([
    { id, name: "nested/Renamed.sol", content: "edited" },
  ]);
  expect(restored.workspace.activeFileId).toBe(id);
  expect(restored.workspace.openFileIds).toContain(id);
});
it("guards stale previews, path collisions and cross-workspace revision access", async () => {
  const repo = await repository();
  const first = await repo.loadWorkspace("original");
  let saved = await repo.saveWorkspace(edited(first, "one"), first);
  const row = (await repo.listSourceRevisions(first.id))[0];
  const expected = saved.workspace.files[0];
  saved = await repo.saveWorkspace(edited(saved, "newer"), saved);
  await expect(
    repo.restoreSourceRevision(saved, row.id, expected)
  ).rejects.toThrow("changed after the preview");
  expect(await repo.readSourceRevision("other", row.id)).toBeNull();
  saved = await repo.saveWorkspace(
    {
      files: [{ id: "collision", name: expected.name, content: "keep" }],
      activeFileId: null,
      openFileIds: [],
    },
    saved
  );
  await expect(repo.restoreSourceRevision(saved, row.id, null)).rejects.toThrow(
    "already exists"
  );
  expect((await repo.loadWorkspace("ignored")).workspace.files[0].content).toBe(
    "keep"
  );
});
it("does not snapshot dependencies or write revisions on failed concurrent saves", async () => {
  const repo = await repository();
  const first = await repo.loadWorkspace("original");
  const ws = {
    ...first.workspace,
    files: [
      ...first.workspace.files,
      { id: "lib", name: "@pkg/lib/A.sol", content: "lib" },
    ],
    dependencies: [
      {
        name: "@pkg/lib",
        version: "1.0.0",
        files: [{ path: "@pkg/lib/A.sol", integrity: "hash" }],
      },
    ],
  };
  const second = await repo.saveWorkspace(ws, first);
  const third = await repo.saveWorkspace(
    { ...ws, files: ws.files.filter((file) => file.id !== "lib") },
    second
  );
  expect(await repo.listSourceRevisions(first.id)).toEqual([]);
  await expect(
    repo.saveWorkspace(edited(second, "stale"), second)
  ).rejects.toThrow("another tab");
  expect(await repo.listSourceRevisions(first.id)).toEqual([]);
  expect((await repo.loadWorkspace("ignored")).revision).toBe(third.revision);
});
it("deduplicates content, enforces file and byte budgets, and prunes oldest revisions only", () => {
  const rows = Array.from({ length: 40 }, (_, i) => ({
    id: `id${i}`,
    workspaceId: "w",
    fileId: "f",
    path: "A.sol",
    createdAt: i,
    hash: `h${i}`,
    bytes: 10,
    reason: "Editing",
  }));
  expect(retainedRevisions(rows)).toHaveLength(30);
  expect(retainedRevisions(rows)[29].createdAt).toBe(10);
  const shared = [
    { ...rows[0], hash: "same" },
    { ...rows[1], hash: "same" },
    { ...rows[2], hash: "other" },
  ];
  expect(
    retainedRevisions(shared, { ...HISTORY_LIMITS, workspaceBytes: 20 })
  ).toHaveLength(3);
  const kept = retainedRevisions(shared, {
    ...HISTORY_LIMITS,
    workspaceBytes: 10,
  });
  expect(kept).toHaveLength(1);
  expect(kept[0].hash).toBe("other");
});
it("caps persisted history at 30 revisions and removes history when its workspace is deleted", async () => {
  const repo = await repository();
  let saved = await repo.loadWorkspace("original");
  for (let i = 0; i < 35; i++)
    saved = await repo.saveWorkspace(edited(saved, `edit${i}`), saved, [
      { files: saved.workspace.files, reason: "Before replace all" },
    ]);
  expect(await repo.listSourceRevisions(saved.id)).toHaveLength(30);
  await repo.createWorkspace("Other", "keep");
  await repo.deleteWorkspace(saved);
  expect(await repo.listSourceRevisions(saved.id)).toEqual([]);
});
it("prioritizes current source if the history store hits quota", async () => {
  const repo = await repository();
  const first = await repo.loadWorkspace("original");
  const { IDBObjectStore } = await import("fake-indexeddb");
  const add = IDBObjectStore.prototype.add;
  vi.spyOn(IDBObjectStore.prototype, "add").mockImplementation(function (
    this: IDBObjectStore,
    ...args: Parameters<IDBObjectStore["add"]>
  ) {
    if (this.name === "sourceRevisions")
      throw new DOMException("Full", "QuotaExceededError");
    return add.apply(this, args);
  });
  const saved = await repo.saveWorkspace(edited(first, "must survive"), first);
  expect(saved.historyWarning).toContain("without a history checkpoint");
  expect((await repo.loadWorkspace("ignored")).workspace.files[0].content).toBe(
    "must survive"
  );
});

it("bounds metadata even for empty revisions belonging to many deleted files", () => {
  const rows = Array.from({ length: 3100 }, (_, index) => ({
    id: String(index),
    workspaceId: "w",
    fileId: String(index),
    path: `${index}.sol`,
    createdAt: index,
    hash: "empty",
    bytes: 0,
    reason: "Before deletion",
  }));
  expect(retainedRevisions(rows)).toHaveLength(3000);
});
it("prunes unreferenced source blobs while leaving current source untouched", async () => {
  const repo = await repository();
  let saved = await repo.loadWorkspace("original");
  for (let i = 0; i < 35; i++)
    saved = await repo.saveWorkspace(edited(saved, `source${i}`), saved, [
      { files: saved.workspace.files, reason: "Before replace all" },
    ]);
  const count = await new Promise<number>((resolve, reject) => {
    const request = indexedDB.open("ethsh-solidity");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction("revisionContents");
      const count = tx.objectStore("revisionContents").count();
      tx.oncomplete = () => {
        db.close();
        resolve(count.result);
      };
    };
  });
  expect(count).toBe(30);
  expect((await repo.loadWorkspace("ignored")).workspace.files[0].content).toBe(
    "source34"
  );
});

it("preserves distinct source strings containing lone UTF-16 surrogates", async () => {
  const repo = await repository();
  let saved = await repo.loadWorkspace("// \ud800");
  saved = await repo.saveWorkspace(edited(saved, "// \ud801"), saved);
  saved = await repo.saveWorkspace(edited(saved, "current"), saved, [
    { files: saved.workspace.files, reason: "Before replace all" },
  ]);
  const rows = await repo.listSourceRevisions(saved.id);
  const contents = await Promise.all(
    rows.map((row) => repo.readSourceRevision(saved.id, row.id))
  );
  expect(contents.map((row) => row?.content)).toEqual(
    expect.arrayContaining(["// \ud800", "// \ud801"])
  );
});

it("keeps saving source when optional history hashing is unavailable",async()=> {
  const repo=await repository();const first=await repo.loadWorkspace("original");
  vi.spyOn(crypto.subtle,"digest").mockRejectedValueOnce(new Error("Unavailable"));
  const saved=await repo.saveWorkspace(edited(first,"keep source"),first);
  expect(saved.historyWarning).toContain("without a history checkpoint");
  expect((await repo.loadWorkspace("ignored")).workspace.files[0].content).toBe("keep source");
});
