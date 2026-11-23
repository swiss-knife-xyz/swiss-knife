import { lockedPath } from "./dependencies";
import type { SolidityFile, SolidityWorkspace } from "./workspace";

export const HISTORY_LIMITS = {
  perFile: 30,
  workspaceRevisions: 3000,
  workspaceBytes: 25 * 1024 * 1024,
  interval: 30_000,
};
export const HISTORY_STORES = [
  "sourceRevisions",
  "revisionContents",
  "revisionHeads",
];
export type SourceRevision = {
  id: string;
  workspaceId: string;
  fileId: string;
  path: string;
  hash: string;
  bytes: number;
  createdAt: number;
  reason: string;
};
export type SourceCheckpoint = { files: SolidityFile[]; reason: string };
export type PreparedRevision = Omit<
  SourceRevision,
  "id" | "workspaceId" | "createdAt"
> & { content: string; force: boolean };
type Head = {
  workspaceId: string;
  fileId: string;
  hash: string;
  createdAt: number;
  id: string;
};

export function upgradeRevisionHistory(db: IDBDatabase) {
  const revisions = db.createObjectStore("sourceRevisions", { keyPath: "id" });
  revisions.createIndex("workspaceId", "workspaceId");
  revisions.createIndex("file", ["workspaceId", "fileId"]);
  db.createObjectStore("revisionContents", {
    keyPath: ["workspaceId", "hash"],
  }).createIndex("workspaceId", "workspaceId");
  db.createObjectStore("revisionHeads", {
    keyPath: ["workspaceId", "fileId"],
  }).createIndex("workspaceId", "workspaceId");
}

export async function prepareRevisions(
  before: SolidityWorkspace,
  after: SolidityWorkspace,
  checkpoints: SourceCheckpoint[] = []
): Promise<PreparedRevision[]> {
  const candidates: { file: SolidityFile; reason: string; force: boolean }[] =
    [];
  const afterById = new Map(after.files.map((file) => [file.id, file]));
  for (const file of before.files) {
    if (lockedPath(before, file.name)) continue;
    const next = afterById.get(file.id);
    if (!next || next.content !== file.content || next.name !== file.name) {
      candidates.push({
        file,
        reason: !next
          ? "Before deletion"
          : next.name !== file.name
            ? "Before rename"
            : "Editing",
        force: !next || next.name !== file.name,
      });
    }
  }
  for (const checkpoint of checkpoints)
    for (const file of checkpoint.files) {
      if (!lockedPath(before, file.name))
        candidates.push({ file, reason: checkpoint.reason, force: true });
    }
  // Hash off the main thread via Web Crypto before opening the IDB transaction.
  return Promise.all(
    candidates.map(async ({ file, reason, force }) => {
      const encoded = new TextEncoder().encode(file.content);
      // JSON escapes lone UTF-16 surrogates, preserving distinct JS source strings
      // that TextEncoder alone would normalize to the same replacement character.
      const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(JSON.stringify(file.content))
      );
      const hash = Array.from(new Uint8Array(digest), (byte) =>
        byte.toString(16).padStart(2, "0")
      ).join("");
      return {
        fileId: file.id,
        path: file.name,
        content: file.content,
        bytes: encoded.byteLength,
        hash,
        reason,
        force,
      };
    })
  );
}

/** Metadata-only pruning: source text is stored once per workspace/content hash. */
export function retainedRevisions(
  rows: SourceRevision[],
  limits = HISTORY_LIMITS
) {
  const perFile = new Map<string, number>();
  let kept = rows
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id))
    .filter((row) => {
      const count = (perFile.get(row.fileId) ?? 0) + 1;
      perFile.set(row.fileId, count);
      return count <= limits.perFile;
    })
    .slice(0, limits.workspaceRevisions);
  const refs = new Map<string, { bytes: number; count: number }>();
  for (const row of kept) {
    const ref = refs.get(row.hash);
    if (ref) ref.count++;
    else refs.set(row.hash, { bytes: row.bytes, count: 1 });
  }
  let bytes = [...refs.values()].reduce((sum, ref) => sum + ref.bytes, 0);
  while (bytes > limits.workspaceBytes && kept.length) {
    const removed = kept.pop()!;
    const ref = refs.get(removed.hash)!;
    if (--ref.count === 0) bytes -= ref.bytes;
  }
  return kept;
}

function guarded(
  tx: IDBTransaction,
  onFailure: (error: Error) => void,
  action: () => void
) {
  return () => {
    try {
      action();
    } catch (error) {
      onFailure(error as Error);
      tx.abort();
    }
  };
}
function prune(
  tx: IDBTransaction,
  workspaceId: string,
  onFailure: (error: Error) => void
) {
  const store = tx.objectStore("sourceRevisions");
  const request = store.index("workspaceId").getAll(workspaceId);
  request.onsuccess = guarded(tx, onFailure, () => {
    const rows = request.result as SourceRevision[];
    const kept = retainedRevisions(rows);
    const ids = new Set(kept.map((row) => row.id));
    const hashes = new Set(kept.map((row) => row.hash));
    for (const row of rows) {
      if (!ids.has(row.id)) store.delete(row.id);
      if (!hashes.has(row.hash))
        tx.objectStore("revisionContents").delete([workspaceId, row.hash]);
    }
    const heads = tx.objectStore("revisionHeads");
    const requestHeads = heads.index("workspaceId").getAll(workspaceId);
    requestHeads.onsuccess = guarded(tx, onFailure, () => {
      for (const head of requestHeads.result as Head[]) {
        const last = kept.find((row) => row.fileId === head.fileId);
        if (!last) heads.delete([workspaceId, head.fileId]);
        else if (last.id !== head.id)
          heads.put({
            workspaceId,
            fileId: last.fileId,
            hash: last.hash,
            createdAt: last.createdAt,
            id: last.id,
          });
      }
    });
  });
}

/** Runs inside the source-save transaction; history and file changes commit together. */
export function queueRevisions(
  tx: IDBTransaction,
  workspaceId: string,
  candidates: PreparedRevision[],
  onFailure: (error: Error) => void,
  now = Date.now()
) {
  const store = tx.objectStore("sourceRevisions");
  const heads = tx.objectStore("revisionHeads");
  let index = 0;
  let added = false;
  const next = () => {
    const candidate = candidates[index++];
    if (!candidate) {
      if (added) prune(tx, workspaceId, onFailure);
      return;
    }
    const request = heads.get([workspaceId, candidate.fileId]);
    request.onsuccess = guarded(tx, onFailure, () => {
      const head = request.result as Head | undefined;
      if (head?.hash === candidate.hash) {
        if (candidate.force) {
          const previous = store.get(head.id);
          previous.onsuccess = guarded(tx, onFailure, () => {
            if (previous.result)
              store.put({
                ...previous.result,
                reason: candidate.reason,
                path: candidate.path,
              });
            next();
          });
        } else next();
        return;
      }
      if (
        !candidate.force &&
        head &&
        now - head.createdAt < HISTORY_LIMITS.interval
      ) {
        next();
        return;
      }
      const { content, force, ...fields } = candidate;
      const row: SourceRevision = {
        ...fields,
        id: crypto.randomUUID(),
        workspaceId,
        createdAt: Math.max(
          now + index / 1000,
          head ? head.createdAt + 0.01 : 0
        ),
      };
      store.add(row);
      added = true;
      tx.objectStore("revisionContents").put({
        workspaceId,
        hash: row.hash,
        content,
      });
      heads.put({
        workspaceId,
        fileId: row.fileId,
        hash: row.hash,
        createdAt: row.createdAt,
        id: row.id,
      });
      next();
    });
  };
  next();
}

export function clearWorkspaceHistory(tx: IDBTransaction, workspaceId: string) {
  for (const name of HISTORY_STORES) {
    const request = tx
      .objectStore(name)
      .index("workspaceId")
      .openCursor(workspaceId);
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
  }
}
