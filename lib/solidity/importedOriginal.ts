import type { DeploymentBuild } from "./deployments";
import type { SolidityWorkspace } from "./workspace";
import {
  DEFAULT_COMPILER_SETTINGS,
  normalizeCompilerSettings,
} from "./settings";

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .filter(([, value]) => value !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${JSON.stringify(key)}:${canonical(value)}`)
      .join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
export function importedChanges(
  workspace: SolidityWorkspace,
  original: DeploymentBuild
) {
  const current = new Map(
    workspace.files.map((file) => [file.name, file.content])
  );
  const sources = original.input.sources;
  const paths = [
    ...new Set([...Object.keys(sources), ...current.keys()]),
  ].sort();
  const files = paths.filter(
    (path) =>
      !Object.hasOwn(sources, path) ||
      !current.has(path) ||
      sources[path].content !== current.get(path)
  );
  const settings =
    canonical(
      normalizeCompilerSettings(
        workspace.compilerSettings ?? DEFAULT_COMPILER_SETTINGS
      )
    ) !== canonical(normalizeCompilerSettings(original.settings));
  return { files, settings, modified: !!files.length || settings };
}

/** Restore every original source while retaining IDs for files that still exist. */
export function restoreImportedOriginal(
  workspace: SolidityWorkspace,
  original: DeploymentBuild
): SolidityWorkspace {
  if (!workspace.importedContract)
    throw new Error("This workspace wasn't imported from a contract.");
  const byPath = new Map(workspace.files.map((file) => [file.name, file]));
  const files = Object.entries(original.input.sources).map(
    ([name, source]) => ({
      id: byPath.get(name)?.id ?? crypto.randomUUID(),
      name,
      content: source.content,
    })
  );
  const ids = new Set(files.map((file) => file.id));
  const entryId =
    files.find((file) => file.name === original.entry)?.id ??
    files[0]?.id ??
    null;
  return {
    ...workspace,
    files,
    folders: [],
    dependencies: [],
    compilerSettings: normalizeCompilerSettings(original.settings),
    libraryLinks: undefined,
    activeFileId:
      workspace.activeFileId && ids.has(workspace.activeFileId)
        ? workspace.activeFileId
        : entryId,
    openFileIds: [
      ...new Set([
        ...workspace.openFileIds.filter((id) => ids.has(id)),
        ...(entryId ? [entryId] : []),
      ]),
    ],
  };
}
