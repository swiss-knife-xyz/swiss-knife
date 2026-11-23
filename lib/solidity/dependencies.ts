import {
  githubImport,
  githubRoot,
  githubRepository,
  COMMIT_SHA,
} from "./githubSources";
import type { SolidityWorkspace } from "./workspace";
import { assertPaths, validatePath } from "./paths";
import { importPaths, resolveImport } from "./compilation";

export type DependencyLock = {
  name: string;
  version: string;
  source?: "npm" | "github";
  repository?: string;
  prefixes?: string[];
  files: { path: string; integrity: string }[];
};
export type InstalledDependency = {
  lock: DependencyLock;
  sources: { name: string; content: string }[];
};
const PACKAGE = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;
const VERSION =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const FILE_LIMIT = 5 * 1024 * 1024;
const TOTAL_LIMIT = 50 * 1024 * 1024;
export function npmPackageForImport(path: string): string | null {
  if (
    path.startsWith(".") ||
    path.startsWith("/") ||
    path.includes(":") ||
    !path.endsWith(".sol")
  )
    return null;
  if (githubImport(path)) return null;
  const parts = path.split("/");
  const count = path.startsWith("@") ? 2 : 1;
  const name = parts.slice(0, count).join("/");
  return parts.length > count && PACKAGE.test(name) ? name : null;
}
export function npmPackageUrl(name: string): string | undefined {
  return PACKAGE.test(name)
    ? `https://www.npmjs.com/package/${name}`
    : undefined;
}
export async function latestNpmVersion(
  name: string,
  signal: AbortSignal
): Promise<string> {
  if (!PACKAGE.test(name))
    throw new Error("Enter a valid npm package name first.");
  const data = JSON.parse(
    await readBounded(
      await fetch(
        `https://registry.npmjs.org/${encodeURIComponent(name)}/latest`,
        {
          signal,
          credentials: "omit",
          referrerPolicy: "no-referrer",
          cache: "no-store",
        }
      ),
      FILE_LIMIT
    )
  );
  if (
    data.name !== name ||
    typeof data.version !== "string" ||
    !VERSION.test(data.version)
  )
    throw new Error("npm returned an invalid package version.");
  return data.version;
}
export function validatePackage(name: string, version: string) {
  if (!PACKAGE.test(name))
    throw new Error(
      "Enter an npm package name, such as @openzeppelin/contracts."
    );
  if (!VERSION.test(version))
    throw new Error("Enter an exact version, such as 5.4.0.");
}
export function lockedPath(
  workspace: SolidityWorkspace,
  path: string,
  includeChildren = false
) {
  const lower = path.toLowerCase();
  return (workspace.dependencies ?? []).some((dep) => {
    const root = dep.name.toLowerCase();
    return (
      lower === root ||
      lower.startsWith(root + "/") ||
      (includeChildren && root.startsWith(lower + "/"))
    );
  });
}
export function assertEditablePath(
  workspace: SolidityWorkspace,
  path: string,
  includeChildren = false
) {
  if (lockedPath(workspace, path, includeChildren))
    throw new Error(
      "Dependency files are read-only. Manage them from Dependencies."
    );
}
export async function sourceIntegrity(content: string) {
  const bytes = new TextEncoder().encode(content);
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return "sha256-" + btoa(String.fromCharCode(...hash));
}
export async function readBounded(response: Response, limit: number) {
  if (!response.ok)
    throw new Error(
      response.status === 404
        ? "Package, version or source file not found."
        : `Dependency download failed (${response.status}).`
    );
  if (!response.body) throw new Error("Empty dependency response.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit)
        throw new Error("Dependency download exceeds the size limit.");
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}
/** Fetch source text only, at the version explicitly chosen by the user. No package code executes. */
export async function installNpmDependency(
  workspace: SolidityWorkspace,
  name: string,
  version: string,
  signal: AbortSignal,
  onProgress: (count: number) => void = () => {}
): Promise<InstalledDependency> {
  validatePackage(name, version);
  const root = name + "/";
  const pending = new Set<string>();
  for (const file of workspace.files) {
    // Re-resolve from consumers, not the previous version's internal imports.
    if (file.name.startsWith(root)) continue;
    for (const imported of importPaths(file.content)) {
      const path = resolveImport(file.name, imported);
      if (path.startsWith(root)) pending.add(path);
    }
  }
  if (!pending.size)
    throw new Error(`Add a Solidity import from ${name} first.`);
  const base = `https://unpkg.com/${name}@${version}`;
  const metadata = JSON.parse(
    await readBounded(
      await fetch(`${base}/?meta`, {
        signal,
        credentials: "omit",
        referrerPolicy: "no-referrer",
      }),
      FILE_LIMIT
    )
  );
  if (
    metadata.package !== name ||
    metadata.version !== version ||
    !Array.isArray(metadata.files)
  )
    throw new Error("The package metadata doesn't match the pinned version.");
  const available = new Map<string, { integrity: string; size: number }>();
  for (const file of metadata.files) {
    if (typeof file.path !== "string" || !file.path.endsWith(".sol")) continue;
    const path = name + file.path;
    if (
      validatePath(path, true) !== path ||
      !file.path.startsWith("/") ||
      !Number.isInteger(file.size) ||
      file.size < 0 ||
      file.size > FILE_LIMIT ||
      !/^sha256-[A-Za-z0-9+/]{43}=$/.test(file.integrity)
    )
      throw new Error("Invalid dependency source metadata.");
    available.set(path, { integrity: file.integrity, size: file.size });
  }
  const sources = new Map<string, string>();
  let total = 0;
  while (pending.size) {
    signal.throwIfAborted();
    const batch = [...pending].slice(0, 4);
    for (const path of batch) pending.delete(path);
    const fetched = await Promise.all(
      batch.map(async (path) => {
        const info = available.get(path);
        if (!info)
          throw new Error(`The pinned package doesn't contain ${path}.`);
        const relative = path
          .slice(root.length)
          .split("/")
          .map(encodeURIComponent)
          .join("/");
        const content = await readBounded(
          await fetch(`${base}/${relative}`, {
            signal,
            credentials: "omit",
            referrerPolicy: "no-referrer",
          }),
          FILE_LIMIT
        );
        if ((await sourceIntegrity(content)) !== info.integrity)
          throw new Error(`Integrity check failed for ${path}.`);
        return { path, content };
      })
    );
    for (const { path, content } of fetched) {
      total += new TextEncoder().encode(content).byteLength;
      if (total > TOTAL_LIMIT || sources.size >= 500)
        throw new Error("Dependencies exceed the workspace size limit.");
      sources.set(path, content);
      for (const imported of importPaths(content)) {
        const resolved = resolveImport(path, imported);
        if (
          resolved.startsWith(root) &&
          !sources.has(resolved) &&
          !batch.includes(resolved)
        )
          pending.add(resolved);
      }
      onProgress(sources.size);
    }
  }
  return {
    lock: {
      name,
      version,
      files: [...sources.keys()]
        .sort()
        .map((path) => ({ path, integrity: available.get(path)!.integrity })),
    },
    sources: [...sources].map(([name, content]) => ({ name, content })),
  };
}
export function applyDependency(
  workspace: SolidityWorkspace,
  installed: InstalledDependency
): SolidityWorkspace {
  const { lock, sources } = installed;
  if (
    workspace.dependencies?.some(
      (dep) =>
        dep.name !== lock.name &&
        (dep.name.toLowerCase().startsWith(lock.name.toLowerCase() + "/") ||
          lock.name.toLowerCase().startsWith(dep.name.toLowerCase() + "/"))
    )
  )
    throw new Error(
      "Dependency paths overlap. Remove the conflicting dependency first."
    );
  const old = workspace.dependencies?.find((dep) => dep.name === lock.name);
  const oldPaths = new Set(old?.files.map((file) => file.path));
  const root = lock.name.toLowerCase() + "/";
  if (
    workspace.files.some(
      (file) =>
        file.name.toLowerCase().startsWith(root) && !oldPaths.has(file.name)
    )
  )
    throw new Error(
      "This package path contains editable sources. Move those files before installing the dependency."
    );
  const ids = new Map(
    workspace.files
      .filter((file) => oldPaths.has(file.name))
      .map((file) => [file.name, file.id])
  );
  const files = [
    ...workspace.files.filter((file) => !oldPaths.has(file.name)),
    ...sources.map((file) => ({
      ...file,
      id: ids.get(file.name) ?? crypto.randomUUID(),
    })),
  ];
  if (
    files.reduce(
      (total, file) =>
        total + new TextEncoder().encode(file.content).byteLength,
      0
    ) > TOTAL_LIMIT
  )
    throw new Error("Workspace sources exceed 50 MB.");
  if (files.length > 500)
    throw new Error("A workspace can contain up to 500 files.");
  assertPaths(files, workspace.folders);
  const valid = new Set(files.map((file) => file.id));
  return {
    ...workspace,
    files,
    dependencies: [
      ...(workspace.dependencies ?? []).filter((dep) => dep.name !== lock.name),
      lock,
    ],
    openFileIds: workspace.openFileIds.filter((id) => valid.has(id)),
    activeFileId:
      workspace.activeFileId && valid.has(workspace.activeFileId)
        ? workspace.activeFileId
        : null,
  };
}
export function removeDependency(
  workspace: SolidityWorkspace,
  name: string
): SolidityWorkspace {
  const paths = new Set(
    workspace.dependencies
      ?.find((dep) => dep.name === name)
      ?.files.map((file) => file.path)
  );
  const files = workspace.files.filter((file) => !paths.has(file.name));
  const ids = new Set(files.map((file) => file.id));
  const openFileIds = workspace.openFileIds.filter((id) => ids.has(id));
  return {
    ...workspace,
    files,
    dependencies: workspace.dependencies?.filter((dep) => dep.name !== name),
    openFileIds,
    activeFileId:
      workspace.activeFileId && ids.has(workspace.activeFileId)
        ? workspace.activeFileId
        : (openFileIds[0] ?? null),
  };
}
export async function validateDependencyLocks(
  value: unknown,
  files: { name: string; content: string }[]
): Promise<DependencyLock[]> {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 100)
    throw new Error("Invalid dependency lock.");
  const contents = new Map(files.map((file) => [file.name, file.content]));
  const seen = new Set<string>();
  for (const dep of value) {
    if (!dep || typeof dep.name !== "string" || typeof dep.version !== "string")
      throw new Error("Invalid dependency lock.");
    if (dep.source === "github") {
      if (
        typeof dep.repository !== "string" ||
        githubRepository(dep.repository) !== dep.repository ||
        dep.name !== githubRoot(dep.repository) ||
        !COMMIT_SHA.test(dep.version) ||
        !Array.isArray(dep.prefixes) ||
        dep.prefixes.length > 500 ||
        dep.prefixes.some((prefix: unknown) => {
          if (typeof prefix !== "string") return true;
          const imported = githubImport(prefix + "__probe.sol");
          return (
            !imported ||
            imported.repository.toLowerCase() !==
              dep.repository.toLowerCase() ||
            imported.prefix !== prefix ||
            (imported.reference &&
              COMMIT_SHA.test(imported.reference) &&
              imported.reference.toLowerCase() !== dep.version.toLowerCase())
          );
        })
      )
        throw new Error("Invalid GitHub dependency lock.");
    } else {
      if (dep.source !== undefined && dep.source !== "npm")
        throw new Error("Unknown dependency source.");
      validatePackage(dep.name, dep.version);
    }
    if (
      seen.has(dep.name) ||
      !Array.isArray(dep.files) ||
      !dep.files.length ||
      dep.files.length > 500
    )
      throw new Error("Invalid dependency lock.");
    seen.add(dep.name);
    const paths = new Set<string>();
    for (const file of dep.files) {
      if (
        !file ||
        typeof file.path !== "string" ||
        !file.path.startsWith(dep.name + "/") ||
        paths.has(file.path) ||
        !contents.has(file.path) ||
        (await sourceIntegrity(contents.get(file.path)!)) !== file.integrity
      )
        throw new Error("Dependency files don't match their lock.");
      paths.add(file.path);
    }
    if (
      files.some(
        (file) => file.name.startsWith(dep.name + "/") && !paths.has(file.name)
      )
    )
      throw new Error("Dependency lock is incomplete.");
  }
  return value as DependencyLock[];
}
