import {
  validateDependencyLocks,
  lockedPath,
  type DependencyLock,
} from "./dependencies";
import { normalizeCompilerSettings, type CompilerSettings } from "./settings";
import { validateFileName, type SolidityWorkspace } from "./workspace";
import { assertPaths, validatePath, workspaceFolders } from "./paths";
import { relocateImports } from "./compilation";
import type { JSZipObject, JSZipStreamHelper } from "jszip";

const MANIFEST = "ethsh-workspace.json";
const FORMAT = "eth.sh/solidity-workspace";
export const BACKUP_LIMITS = {
  archiveBytes: 20 * 1024 * 1024,
  fileBytes: 5 * 1024 * 1024,
  totalBytes: 50 * 1024 * 1024,
  files: 500,
};
export type WorkspaceBackup = {
  files: { name: string; content: string }[];
  folders?: string[];
  compilerSettings?: CompilerSettings;
  dependencies?: DependencyLock[];
  openFiles: string[];
  activeFile: string | null;
};
export type ImportMode = "add" | "restore";

async function hash(content: Uint8Array) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new Uint8Array(content).buffer
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

// Stop decompression as soon as a file exceeds the limit, rather than allocating
// an entire oversized entry before checking it.
function readEntry(entry: JSZipObject, maxBytes: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Uint8Array[] = [];
    // JSZip 3.10 documents this method but omits it from JSZipObject's types.
    const stream = (
      entry as JSZipObject & {
        internalStream(type: "uint8array"): JSZipStreamHelper<Uint8Array>;
      }
    ).internalStream("uint8array");
    let stopped = false;
    stream.on("data", (chunk: Uint8Array) => {
      if (stopped) return;
      size += chunk.byteLength;
      if (size > maxBytes) {
        stopped = true;
        stream.pause();
        reject(new Error("Backup exceeds the file or total size limit."));
        return;
      }
      chunks.push(chunk);
    });
    stream.on("error", reject);
    stream.on("end", () => {
      if (stopped) return;
      const data = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        data.set(chunk, offset);
        offset += chunk.length;
      }
      resolve(data);
    });
    stream.resume();
  });
}

function text(data: Uint8Array) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(data);
  } catch {
    throw new Error("Backup contains a file that isn't valid UTF-8 text.");
  }
}

export async function exportWorkspaceZip(
  workspace: SolidityWorkspace
): Promise<Uint8Array> {
  if (!workspace.files.length && !workspace.folders?.length)
    throw new Error("Create a file or folder before exporting a workspace.");
  assertPaths(workspace.files, workspace.folders);
  if (workspace.files.length > BACKUP_LIMITS.files)
    throw new Error("A backup can contain up to 500 files.");
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const files: { name: string; sha256: string }[] = [];
  let total = 0;
  for (const file of workspace.files) {
    validateFileName(file.name, workspace.files, file.id);
    const data = new TextEncoder().encode(file.content);
    total += data.length;
    if (
      data.length > BACKUP_LIMITS.fileBytes ||
      total > BACKUP_LIMITS.totalBytes
    )
      throw new Error(
        "Workspace exceeds the backup size limit (5 MB per file, 50 MB total)."
      );
    zip.file(file.name, data);
    files.push({ name: file.name, sha256: await hash(data) });
  }
  const folders = workspaceFolders(workspace);
  for (const folder of folders) zip.folder(folder);
  const names = new Map(workspace.files.map((file) => [file.id, file.name]));
  zip.file(
    MANIFEST,
    JSON.stringify(
      {
        format: FORMAT,
        version: 3,
        dependencies: workspace.dependencies ?? [],
        folders,
        compilerSettings: normalizeCompilerSettings(workspace.compilerSettings),
        files,
        openFiles: workspace.openFileIds
          .map((id) => names.get(id))
          .filter(Boolean),
        activeFile: workspace.activeFileId
          ? (names.get(workspace.activeFileId) ?? null)
          : null,
      },
      null,
      2
    )
  );
  const data = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
  });
  if (data.length > BACKUP_LIMITS.archiveBytes)
    throw new Error(
      "Compressed backup exceeds 20 MB. Export individual files instead."
    );
  return data;
}

export async function importWorkspaceZip(
  data: ArrayBuffer | Uint8Array
): Promise<WorkspaceBackup> {
  if (data.byteLength > BACKUP_LIMITS.archiveBytes)
    throw new Error("Choose a ZIP smaller than 20 MB.");
  const JSZip = (await import("jszip")).default;
  let zip;
  try {
    zip = await JSZip.loadAsync(data);
  } catch {
    throw new Error(
      "Couldn't read this ZIP. Choose a workspace backup or a ZIP of Solidity files."
    );
  }
  const entries = Object.values(zip.files);
  if (entries.length > BACKUP_LIMITS.files * 2 + 1)
    throw new Error("A backup can contain up to 500 files.");
  for (const entry of entries) {
    const original = entry.unsafeOriginalName ?? entry.name;
    const path = entry.dir ? entry.name.replace(/\/$/, "") : entry.name;
    if (original !== entry.name || path.includes("\\") || path.includes("\0"))
      throw new Error("Unsafe archive path.");
    if (entry.name !== MANIFEST) {
      if (validatePath(path, !entry.dir) !== path)
        throw new Error("Invalid archive path.");
    }
  }
  const folderEntries = entries
    .filter((entry) => entry.dir)
    .map((entry) => entry.name.replace(/\/$/, ""));
  const sourceEntries = entries.filter(
    (entry) => !entry.dir && entry.name !== MANIFEST
  );
  if (sourceEntries.length > BACKUP_LIMITS.files)
    throw new Error("A backup can contain up to 500 files.");
  if (!sourceEntries.length && !folderEntries.length)
    throw new Error("This backup contains no Solidity files or folders.");
  const files: WorkspaceBackup["files"] = [];
  const rawFiles = new Map<string, Uint8Array>();
  let total = 0;
  for (const entry of sourceEntries) {
    if (
      validateFileName(
        entry.name,
        files.map((file) => ({ ...file, id: file.name }))
      ) !== entry.name
    )
      throw new Error(
        "Backup filenames cannot have leading or trailing spaces."
      );
    const bytes = await readEntry(
      entry,
      Math.min(BACKUP_LIMITS.fileBytes, BACKUP_LIMITS.totalBytes - total)
    );
    total += bytes.length;
    files.push({ name: entry.name, content: text(bytes) });
    rawFiles.set(entry.name, bytes);
  }
  assertPaths(files, folderEntries);
  if (!zip.file(MANIFEST))
    return {
      files,
      folders: folderEntries,
      openFiles: files.length ? [files[0].name] : [],
      activeFile: files[0]?.name ?? null,
    };
  let manifest;
  try {
    manifest = JSON.parse(
      text(await readEntry(zip.file(MANIFEST)!, 256 * 1024))
    );
  } catch {
    throw new Error("The workspace manifest is invalid.");
  }
  if (manifest?.format !== FORMAT || ![1, 2, 3].includes(manifest.version))
    throw new Error("This workspace backup version isn't supported.");
  if (
    !Array.isArray(manifest.files) ||
    manifest.files.length !== files.length ||
    !Array.isArray(manifest.openFiles) ||
    !(manifest.activeFile === null || typeof manifest.activeFile === "string")
  )
    throw new Error("The workspace manifest is invalid.");
  const folders: string[] =
    manifest.version >= 2 ? manifest.folders : folderEntries;
  if (
    !Array.isArray(folders) ||
    folders.some((path) => typeof path !== "string") ||
    folders.length > 500
  )
    throw new Error("The saved folders are invalid.");
  assertPaths(files, folders);
  const listed = new Set<string>();
  for (const file of manifest.files) {
    if (
      typeof file?.name !== "string" ||
      listed.has(file.name) ||
      !rawFiles.has(file.name) ||
      typeof file.sha256 !== "string" ||
      file.sha256 !== (await hash(rawFiles.get(file.name)!))
    )
      throw new Error(
        "Backup files don't match the manifest. The archive may be incomplete or modified."
      );
    listed.add(file.name);
  }
  if (
    manifest.openFiles.some(
      (name: unknown) => typeof name !== "string" || !listed.has(name)
    ) ||
    new Set(manifest.openFiles).size !== manifest.openFiles.length ||
    (manifest.activeFile !== null &&
      !manifest.openFiles.includes(manifest.activeFile))
  )
    throw new Error("The saved editor tabs are invalid.");
  return {
    files: manifest.files.map(
      (entry: { name: string }) =>
        files.find((file) => file.name === entry.name)!
    ),
    folders,
    dependencies: await validateDependencyLocks(manifest.dependencies, files),
    compilerSettings: normalizeCompilerSettings(manifest.compilerSettings),
    openFiles: manifest.openFiles,
    activeFile: manifest.activeFile,
  };
}

export function planWorkspaceImport(
  workspace: SolidityWorkspace,
  backup: WorkspaceBackup,
  mode: ImportMode
) {
  // Keep a colliding project together so its relative imports remain valid.
  const currentPaths = [
    ...workspace.files.map((file) => file.name),
    ...workspaceFolders(workspace),
  ];
  const incomingPaths = [
    ...backup.files.map((file) => ({ name: file.name, isFile: true })),
    ...(backup.folders ?? []).map((name) => ({ name, isFile: false })),
  ];
  const currentFiles = new Set(
    workspace.files.map((file) => file.name.toLowerCase())
  );
  const clashes =
    mode === "add" &&
    incomingPaths.some(({ name, isFile }) =>
      currentPaths.some((path) => {
        const a = path.toLowerCase(),
          b = name.toLowerCase();
        return (
          (a === b && (isFile || currentFiles.has(a) || path !== name)) ||
          (b.startsWith(a + "/") && currentFiles.has(a)) ||
          (a.startsWith(b + "/") && isFile)
        );
      })
    );
  let prefix = "";
  if (clashes) {
    prefix = "imported";
    for (
      let index = 2;
      currentPaths.some(
        (path) =>
          path.toLowerCase() === prefix ||
          path.toLowerCase().startsWith(prefix + "/")
      );
      index++
    )
      prefix = `imported-${index}`;
  }
  const names = new Map(
    backup.files.map((file) => [
      file.name,
      prefix ? `${prefix}/${file.name}` : file.name,
    ])
  );
  return backup.files.map((file) => ({
    ...file,
    originalName: file.name,
    name: names.get(file.name)!,
    content: prefix ? relocateImports(file.content, names) : file.content,
  }));
}

export function applyWorkspaceImport(
  workspace: SolidityWorkspace,
  backup: WorkspaceBackup,
  mode: ImportMode
): SolidityWorkspace {
  if (mode === "add" && backup.dependencies?.length)
    throw new Error("Import this dependency-backed ZIP into a new workspace.");
  const planned = planWorkspaceImport(workspace, backup, mode);
  if (
    mode === "add" &&
    planned.some((file) => lockedPath(workspace, file.name))
  )
    throw new Error(
      "Import these files into a new workspace; their paths belong to a locked dependency."
    );
  const ids = new Map(
    planned.map((file) => [file.originalName, crypto.randomUUID()])
  );
  const imported = planned.map(({ name, content, originalName }) => ({
    id: ids.get(originalName)!,
    name,
    content,
  }));
  const openFileIds = backup.openFiles.map((name) => ids.get(name)!);
  const prefix =
    planned[0] && planned[0].name !== planned[0].originalName
      ? planned[0].name.slice(0, -(planned[0].originalName.length + 1))
      : "";
  const result = {
    ...workspace,
    dependencies:
      mode === "restore" ? (backup.dependencies ?? []) : workspace.dependencies,
    compilerSettings:
      mode === "restore"
        ? normalizeCompilerSettings(backup.compilerSettings)
        : workspace.compilerSettings,
    folders: [
      ...(mode === "add" ? workspaceFolders(workspace) : []),
      ...(backup.folders ?? []).map((folder) =>
        prefix ? `${prefix}/${folder}` : folder
      ),
    ],
    files: mode === "add" ? [...workspace.files, ...imported] : imported,
    openFileIds:
      mode === "add" ? [...workspace.openFileIds, ...openFileIds] : openFileIds,
    activeFileId: backup.activeFile
      ? ids.get(backup.activeFile)!
      : mode === "add"
        ? workspace.activeFileId
        : null,
  };
  assertPaths(result.files, result.folders);
  return result;
}
