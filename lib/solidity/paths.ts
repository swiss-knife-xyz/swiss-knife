import { assertEditablePath } from "./dependencies";
import type { SolidityWorkspace } from "./workspace";

export const parentPath = (path: string) =>
  path.slice(0, Math.max(0, path.lastIndexOf("/")));
export const baseName = (path: string) => path.split("/").at(-1)!;
export const insideFolder = (path: string, folder: string) =>
  path.startsWith(`${folder}/`);

export function validatePath(value: string, file = false) {
  const path = value.trim();
  const parts = path.split("/");
  if (
    !path ||
    path.length > 500 ||
    parts.some(
      (part, index) =>
        part.length > 100 ||
        (!/^[A-Za-z0-9_][A-Za-z0-9_. -]*$/.test(part) &&
          !(
            (!file || index < parts.length - 1) &&
            /^@[A-Za-z0-9_][A-Za-z0-9_.-]*$/.test(part)
          )) ||
        part !== part.trim()
    ) ||
    (file && !path.endsWith(".sol"))
  )
    throw new Error(
      file
        ? "Use a Solidity path, such as contracts/Token.sol."
        : "Use a folder path, such as contracts/utils."
    );
  return path;
}
export function workspaceFolders(workspace: SolidityWorkspace): string[] {
  const folders = new Set<string>(workspace.folders ?? []);
  for (const path of [
    ...folders,
    ...workspace.files.map((file) => file.name),
  ]) {
    let parent = parentPath(path);
    while (parent) {
      folders.add(parent);
      parent = parentPath(parent);
    }
  }
  return [...folders].sort((a, b) => a.localeCompare(b));
}
export function assertPaths(files: { name: string }[], folders: string[] = []) {
  const directoryCase = new Map<string, string>();
  const registerFolder = (folder: string) => {
    const key = folder.toLowerCase();
    const prior = directoryCase.get(key);
    if (prior && prior !== folder)
      throw new Error("Folder paths must use consistent capitalization.");
    directoryCase.set(key, folder);
  };
  const seen = new Set<string>();
  const folderKeys = new Set(folders.map((path) => path.toLowerCase()));
  for (const { name } of files) {
    validatePath(name, true);
    const key = name.toLowerCase();
    if (seen.has(key) || folderKeys.has(key))
      throw new Error("A file or folder with that path already exists.");
    seen.add(key);
  }
  for (const folder of folders) {
    validatePath(folder);
    registerFolder(folder);
  }
  for (const path of [...files.map((file) => file.name), ...folders]) {
    let parent = parentPath(path);
    while (parent) {
      registerFolder(parent);
      if (seen.has(parent.toLowerCase()))
        throw new Error("A file cannot also be a folder.");
      parent = parentPath(parent);
    }
  }
  if (directoryCase.size > 500)
    throw new Error("A workspace can contain up to 500 folders.");
}
export function addFolder(
  workspace: SolidityWorkspace,
  value: string
): SolidityWorkspace {
  const path = validatePath(value);
  assertEditablePath(workspace, path);
  if (
    workspaceFolders(workspace).some(
      (folder) => folder.toLowerCase() === path.toLowerCase()
    )
  )
    throw new Error("A folder with that path already exists.");
  const folders = [...workspaceFolders(workspace), path];
  assertPaths(workspace.files, folders);
  return { ...workspace, folders };
}
export function moveFolder(
  workspace: SolidityWorkspace,
  from: string,
  value: string
): SolidityWorkspace {
  assertEditablePath(workspace, from, true);
  const to = validatePath(value);
  assertEditablePath(workspace, to);
  if (to === from) return workspace;
  if (insideFolder(to.toLowerCase(), from.toLowerCase()))
    throw new Error("A folder cannot be moved inside itself.");
  const allFolders = workspaceFolders(workspace);
  if (
    allFolders.some(
      (folder) =>
        folder !== from &&
        !insideFolder(folder, from) &&
        folder.toLowerCase() === to.toLowerCase()
    )
  )
    throw new Error("A folder with that path already exists.");
  const move = (path: string) =>
    path === from || insideFolder(path, from)
      ? to + path.slice(from.length)
      : path;
  const files = workspace.files.map((file) => ({
    ...file,
    name: move(file.name),
  }));
  const folders = allFolders.map(move);
  assertPaths(files, folders);
  return { ...workspace, files, folders };
}
export function removeFolder(
  workspace: SolidityWorkspace,
  path: string
): SolidityWorkspace {
  assertEditablePath(workspace, path, true);
  const files = workspace.files.filter(
    (file) => !insideFolder(file.name, path)
  );
  const ids = new Set(files.map((file) => file.id));
  const openFileIds = workspace.openFileIds.filter((id) => ids.has(id));
  return {
    ...workspace,
    files,
    folders: workspaceFolders(workspace).filter(
      (folder) => folder !== path && !insideFolder(folder, path)
    ),
    openFileIds,
    activeFileId:
      workspace.activeFileId && ids.has(workspace.activeFileId)
        ? workspace.activeFileId
        : (openFileIds[0] ?? null),
  };
}
