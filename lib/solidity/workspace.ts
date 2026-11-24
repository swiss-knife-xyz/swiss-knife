import { normalizeLibraryLinks, deploymentChain, type LibraryLinks } from "./libraries";
import { HISTORY_STORES, upgradeRevisionHistory, prepareRevisions, queueRevisions, clearWorkspaceHistory, type SourceCheckpoint, type SourceRevision } from "./revisionHistory";
import { lockedPath } from "./dependencies";
import type { DependencyLock } from "./dependencies";
import { normalizeCompilerSettings, type CompilerSettings } from "./settings";
import { validatePath, assertPaths } from "./paths";
export type SolidityFile = { id: string; name: string; content: string };
export type ImportedContractIdentity = { address: string; chainId: number };
export type SolidityWorkspace = {
  libraryLinks?: LibraryLinks;
  deploymentChainId?: number;
  importedContract?: ImportedContractIdentity;
  files: SolidityFile[];
  folders?: string[];
  compilerSettings?: CompilerSettings;
  dependencies?: DependencyLock[];
  activeFileId: string | null;
  openFileIds: string[];
};
export type WorkspaceSummary = { id: string; name: string; importedContract?: ImportedContractIdentity };
export type SavedWorkspace = WorkspaceSummary & {
  workspace: SolidityWorkspace;
  revision: number;
  historyWarning?: string;
};
type WorkspaceRecord = WorkspaceSummary & {
  libraryLinks?: LibraryLinks;
  deploymentChainId?: number;
  nameKey: string;
  folders?: string[];
  compilerSettings?: CompilerSettings;
  dependencies?: DependencyLock[];
  revision: number;
  activeFileId: string | null;
  openFileIds: string[];
};
const DATABASE_NAME = "ethsh-solidity";
const ACTIVE_KEY = "activeWorkspaceId";
let database: Promise<IDBDatabase> | undefined;

export class WorkspaceConflictError extends Error {
  constructor() {
    super(
      "This workspace changed in another tab. Reload the saved version before continuing."
    );
  }
}
export class WorkspaceMissingError extends WorkspaceConflictError {
  constructor() {
    super();
    this.message =
      "This workspace was deleted in another tab. Reload saved files to open another workspace.";
  }
}
export class WorkspaceNameError extends Error {}

function openDatabase() {
  if (!database)
    database = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, 4);
      let blocked = false;
      request.onupgradeneeded = (event) => {
        const db = request.result;
        if (event.oldVersion < 1) {
          db.createObjectStore("workspaces", { keyPath: "id" });
          db.createObjectStore("files", { keyPath: "id" }).createIndex(
            "workspaceId",
            "workspaceId"
          );
        }
        if (event.oldVersion < 3) upgradeRevisionHistory(db);
        if (event.oldVersion < 2) {
          db.createObjectStore("preferences", { keyPath: "key" });
          const workspaces = request.transaction!.objectStore("workspaces");
          workspaces.createIndex("nameKey", "nameKey", { unique: true });
          const cursorRequest = workspaces.openCursor();
          let index = 0;
          cursorRequest.onsuccess = () => {
            const cursor = cursorRequest.result;
            if (!cursor) return;
            const record = cursor.value;
            const name =
              record.name ??
              (++index === 1 ? "Default Workspace" : `Workspace ${index}`);
            cursor.update({ ...record, name, nameKey: name.toLowerCase() });
            cursor.continue();
          };
        }
        if (event.oldVersion < 4) {
          const store = request.transaction!.objectStore("workspaces");
          const original = store.get("default");
          original.onsuccess = () => {
            const record = original.result;
            // Only migrate the untouched generated name; preserve custom names.
            if (record?.name !== "Workspace") return;
            const existing = store.index("nameKey").get("default workspace");
            existing.onsuccess = () => {
              if (existing.result) return;
              store.put({...record,name:"Default Workspace",nameKey:"default workspace",revision:record.revision+1});
            };
          };
        }
      };
      request.onerror = () => {
        database = undefined;
        reject(request.error);
      };
      request.onblocked = () => {
        blocked = true;
        database = undefined;
        reject(
          new Error("Close other Solidity tabs and retry loading your files.")
        );
      };
      request.onsuccess = () => {
        const db = request.result;
        if (blocked) {
          db.close();
          return;
        }
        db.onversionchange = () => {
          db.close();
          database = undefined;
        };
        resolve(db);
      };
    });
  return database;
}

export function validateFileName(
  name: string,
  files: SolidityFile[],
  exceptId?: string
) {
  const trimmed = validatePath(name, true);
  if (
    files.some(
      (file) =>
        file.id !== exceptId &&
        file.name.toLowerCase() === trimmed.toLowerCase()
    )
  )
    throw new Error("A file with that name already exists.");
  return trimmed;
}
export function validateWorkspaceName(value: string) {
  const name = value.trim().normalize("NFC");
  if (!name || name.length > 60 || /[\u0000-\u001f\u007f]/.test(name))
    throw new WorkspaceNameError(
      "Use a workspace name between 1 and 60 characters."
    );
  return name;
}
function seed(initialCode: string): SolidityWorkspace {
  const file = {
    id: crypto.randomUUID(),
    name: "Counter.sol",
    content: initialCode,
  };
  return { files: [file], activeFileId: file.id, openFileIds: [file.id] };
}

export async function listWorkspaces(): Promise<WorkspaceSummary[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db
      .transaction("workspaces")
      .objectStore("workspaces")
      .getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () =>
      resolve(
        request.result
          .map(({ id, name, importedContract }) => ({ id, name, ...(importedContract ? { importedContract } : {}) }))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
  });
}

export async function loadWorkspace(
  initialCode: string,
  workspaceId?: string
): Promise<SavedWorkspace> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      ["workspaces", "files", "preferences"],
      "readwrite"
    );
    const store = tx.objectStore("workspaces");
    const files = tx.objectStore("files");
    const preferences = tx.objectStore("preferences");
    let result: SavedWorkspace;
    let failure: Error | null = null;
    tx.oncomplete = () => resolve(result);
    tx.onabort = tx.onerror = () =>
      reject(failure ?? tx.error ?? new Error("Couldn't load saved files."));
    const recordsRequest = store.getAll();
    recordsRequest.onsuccess = () => {
      const records: WorkspaceRecord[] = recordsRequest.result;
      const preference = preferences.get(ACTIVE_KEY);
      preference.onsuccess = () => {
        const record = workspaceId
          ? records.find((record) => record.id === workspaceId)
          : (records.find((record) => record.id === preference.result?.value) ??
            records[0]);
        if (!record) {
          if (workspaceId) {
            failure = new WorkspaceMissingError();
            tx.abort();
            return;
          }
          const workspace = seed(initialCode);
          const created = {
            id: "default",
            name: "Default Workspace",
            nameKey: "default workspace",
            revision: 1,
            activeFileId: workspace.activeFileId,
            openFileIds: workspace.openFileIds,
          };
          store.add(created);
          for (const file of workspace.files)
            files.add({ ...file, workspaceId: created.id });
          preferences.put({ key: ACTIVE_KEY, value: created.id });
          result = {
            id: created.id,
            name: created.name,
            workspace,
            revision: 1,
          };
        } else {
          const fileRequest = files.index("workspaceId").getAll(record.id);
          fileRequest.onsuccess = () => {
            const savedFiles: SolidityFile[] = fileRequest.result.map(
              ({ id, name, content }) => ({ id, name, content })
            );
            const ids = new Set(savedFiles.map((file) => file.id));
            const openFileIds = record.openFileIds.filter((id) => ids.has(id));
            result = {
              id: record.id,
              name: record.name,
              revision: record.revision,
              workspace: {
                ...(record.importedContract ? { importedContract: record.importedContract } : {}),
                files: savedFiles,
                ...(record.libraryLinks ? {libraryLinks:normalizeLibraryLinks(record.libraryLinks)} : {}),
                ...(record.deploymentChainId ? {deploymentChainId:deploymentChain(record.deploymentChainId)} : {}),
                folders: record.folders ?? [],
                ...(record.dependencies?.length
                  ? { dependencies: record.dependencies }
                  : {}),
                ...(record.compilerSettings
                  ? {
                      compilerSettings: normalizeCompilerSettings(
                        record.compilerSettings
                      ),
                    }
                  : {}),
                openFileIds,
                activeFileId:
                  record.activeFileId &&
                  openFileIds.includes(record.activeFileId)
                    ? record.activeFileId
                    : (openFileIds[0] ?? null),
              },
            };
            preferences.put({ key: ACTIVE_KEY, value: record.id });
          };
        }
      };
    };
  });
}

class HistoryCheckpointError extends Error {}

async function saveWorkspaceOnce(
  workspace: SolidityWorkspace,
  previous: SavedWorkspace,
  checkpoints: SourceCheckpoint[] = [],
  skipHistory = false
): Promise<SavedWorkspace> {
  assertPaths(workspace.files, workspace.folders);
  const candidates = skipHistory ? [] : await prepareRevisions(previous.workspace, workspace, checkpoints).catch(() => { throw new HistoryCheckpointError("Couldn't prepare source history."); });
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["workspaces", "files", ...HISTORY_STORES], "readwrite");
    let failure: Error | null = null;
    const revision = previous.revision + 1;
    tx.oncomplete = () => resolve({ ...previous, workspace, revision, historyWarning: skipHistory ? "Files saved without a history checkpoint because local history is unavailable." : undefined });
    tx.onabort = tx.onerror = () =>
      reject(failure ?? tx.error ?? new Error("Couldn't save files."));
    const request = tx.objectStore("workspaces").get(previous.id);
    request.onsuccess = () => {
      if (request.result?.revision !== previous.revision) {
        failure = request.result
          ? new WorkspaceConflictError()
          : new WorkspaceMissingError();
        tx.abort();
        return;
      }
      try {
        queueRevisions(tx, previous.id, candidates, () => { failure = new HistoryCheckpointError("Couldn't write source history."); });
        const files = tx.objectStore("files");
        const oldFiles = new Map(
          previous.workspace.files.map((file) => [file.id, file])
        );
        for (const file of workspace.files) {
          const old = oldFiles.get(file.id);
          if (!old || old.name !== file.name || old.content !== file.content)
            files.put({ ...file, workspaceId: previous.id });
          oldFiles.delete(file.id);
        }
        for (const id of oldFiles.keys()) files.delete(id);
        tx.objectStore("workspaces").put({
          ...request.result,
          revision,
          folders: workspace.folders ?? [],
          dependencies: workspace.dependencies ?? [],
          libraryLinks: workspace.libraryLinks ? normalizeLibraryLinks(workspace.libraryLinks) : undefined,
          deploymentChainId: workspace.deploymentChainId !== undefined ? deploymentChain(workspace.deploymentChainId) : undefined,
          ...(workspace.compilerSettings
            ? {
                compilerSettings: normalizeCompilerSettings(
                  workspace.compilerSettings
                ),
              }
            : {}),
          activeFileId: workspace.activeFileId,
          openFileIds: workspace.openFileIds,
        });
      } catch (error) {
        failure = error as Error;
        tx.abort();
      }
    };
  });
}

export async function createWorkspace(
  value: string,
  initialCode: string,
  importedWorkspace?: SolidityWorkspace,
  workspaceId = crypto.randomUUID()
): Promise<SavedWorkspace> {
  const name = validateWorkspaceName(value);
  const workspace = importedWorkspace ?? seed(initialCode);
  assertPaths(workspace.files, workspace.folders);
  const compilerSettings = workspace.compilerSettings
    ? normalizeCompilerSettings(workspace.compilerSettings)
    : undefined;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      ["workspaces", "files", "preferences"],
      "readwrite"
    );
    const id = workspaceId;
    tx.oncomplete = () => resolve({ id, name, workspace, revision: 1 });
    tx.onabort = () =>
      reject(
        tx.error?.name === "ConstraintError"
          ? new WorkspaceNameError("A workspace with that name already exists.")
          : (tx.error ?? new Error("Couldn't create the workspace."))
      );
    tx.objectStore("workspaces").add({
      id,
      name,
      nameKey: name.toLowerCase(),
      ...(workspace.importedContract ? { importedContract: workspace.importedContract } : {}),
      revision: 1,
      folders: workspace.folders ?? [],
      dependencies: workspace.dependencies ?? [],
      ...(workspace.libraryLinks ? {libraryLinks:normalizeLibraryLinks(workspace.libraryLinks)} : {}),
      ...(workspace.deploymentChainId !== undefined ? {deploymentChainId:deploymentChain(workspace.deploymentChainId)} : {}),
      ...(compilerSettings ? { compilerSettings } : {}),
      activeFileId: workspace.activeFileId,
      openFileIds: workspace.openFileIds,
    });
    for (const file of workspace.files)
      tx.objectStore("files").add({ ...file, workspaceId: id });
    tx.objectStore("preferences").put({ key: ACTIVE_KEY, value: id });
  });
}

export async function renameWorkspace(
  previous: SavedWorkspace,
  value: string
): Promise<SavedWorkspace> {
  const name = validateWorkspaceName(value);
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("workspaces", "readwrite");
    let failure: Error | null = null;
    tx.oncomplete = () =>
      resolve({ ...previous, name, revision: previous.revision + 1 });
    tx.onabort = () =>
      reject(
        failure ??
          (tx.error?.name === "ConstraintError"
            ? new WorkspaceNameError(
                "A workspace with that name already exists."
              )
            : (tx.error ?? new Error("Couldn't rename the workspace.")))
      );
    const request = tx.objectStore("workspaces").get(previous.id);
    request.onsuccess = () => {
      if (request.result?.revision !== previous.revision) {
        failure = new WorkspaceConflictError();
        tx.abort();
        return;
      }
      tx.objectStore("workspaces").put({
        ...request.result,
        name,
        nameKey: name.toLowerCase(),
        revision: previous.revision + 1,
      });
    };
  });
}

export async function deleteWorkspace(previous: SavedWorkspace): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      ["workspaces", "files", "preferences", ...HISTORY_STORES],
      "readwrite"
    );
    let failure: Error | null = null;
    tx.oncomplete = () => resolve();
    tx.onabort = tx.onerror = () =>
      reject(
        failure ?? tx.error ?? new Error("Couldn't delete the workspace.")
      );
    const store = tx.objectStore("workspaces");
    const request = store.getAll();
    request.onsuccess = () => {
      const records: WorkspaceRecord[] = request.result;
      if (
        records.find((record) => record.id === previous.id)?.revision !==
        previous.revision
      ) {
        failure = new WorkspaceConflictError();
        tx.abort();
        return;
      }
      const remaining = records.filter((record) => record.id !== previous.id);
      if (!remaining.length) {
        failure = new Error("Keep at least one workspace.");
        tx.abort();
        return;
      }
      store.delete(previous.id);
      clearWorkspaceHistory(tx, previous.id);
      const cursorRequest = tx
        .objectStore("files")
        .index("workspaceId")
        .openCursor(previous.id);
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
      const preference = tx.objectStore("preferences").get(ACTIVE_KEY);
      preference.onsuccess = () => {
        if (preference.result?.value === previous.id)
          tx.objectStore("preferences").put({
            key: ACTIVE_KEY,
            value: remaining[0].id,
          });
      };
    };
  });
}

export async function saveWorkspace(workspace: SolidityWorkspace, previous: SavedWorkspace, checkpoints: SourceCheckpoint[] = []): Promise<SavedWorkspace> {
  try { return await saveWorkspaceOnce(workspace, previous, checkpoints); }
  catch(error) {
    if (!(error instanceof HistoryCheckpointError) && !(error && typeof error === "object" && "name" in error && error.name === "QuotaExceededError")) throw error;
    // Prioritize current files over optional snapshots. Never discard current source.
    return saveWorkspaceOnce(workspace, previous, [], true);
  }
}
export async function listSourceRevisions(workspaceId: string): Promise<SourceRevision[]> {
  const db=await openDatabase();
  return new Promise((resolve,reject)=> {
    const request=db.transaction("sourceRevisions").objectStore("sourceRevisions").index("workspaceId").getAll(workspaceId);
    request.onerror=()=>reject(request.error);
    request.onsuccess=()=>resolve(request.result.sort((a:SourceRevision,b:SourceRevision)=>b.createdAt-a.createdAt));
  });
}
export async function readSourceRevision(workspaceId: string, id: string): Promise<(SourceRevision & {content:string}) | null> {
  const db=await openDatabase();
  return new Promise((resolve,reject)=> {
    const tx=db.transaction(["sourceRevisions","revisionContents"]);
    tx.onabort=tx.onerror=()=>reject(tx.error);
    let value: (SourceRevision & {content:string}) | null=null;
    tx.oncomplete=()=>resolve(value);
    const request=tx.objectStore("sourceRevisions").get(id);
    request.onsuccess=()=> {
      const row=request.result as SourceRevision|undefined;
      if(!row || row.workspaceId!==workspaceId) return;
      const source=tx.objectStore("revisionContents").get([workspaceId,row.hash]);
      source.onsuccess=()=> { if(source.result) value={...row,content:source.result.content}; };
    };
  });
}
export async function restoreSourceRevision(previous: SavedWorkspace, revisionId: string, expected: SolidityFile|null): Promise<SavedWorkspace> {
  const revision=await readSourceRevision(previous.id, revisionId);
  if(!revision) throw new Error("This revision is no longer available.");
  const current=previous.workspace.files.find(file=>file.id===revision.fileId);
  if ((expected && (!current || current.name!==expected.name || current.content!==expected.content || current.id!==expected.id)) || (!expected && current))
    throw new Error("The file changed after the preview. Reopen Local history and try again.");
  const path=current?.name ?? revision.path;
  if(lockedPath(previous.workspace,path)) throw new Error("Installed dependencies are read-only.");
  validateFileName(path,previous.workspace.files,revision.fileId);
  const file={id:revision.fileId,name:path,content:revision.content};
  const workspace={...previous.workspace,files:current ? previous.workspace.files.map(value=>value.id===file.id?file:value) : [...previous.workspace.files,file], activeFileId:file.id,
    openFileIds:previous.workspace.openFileIds.includes(file.id)?previous.workspace.openFileIds:[...previous.workspace.openFileIds,file.id]};
  return saveWorkspace(workspace,previous,current ? [{files:[current],reason:"Before restore"}] : []);
}
