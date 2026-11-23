import type { SolidityWorkspace } from "./workspace";
import {
  readBounded,
  sourceIntegrity,
  type InstalledDependency,
} from "./dependencies";
import {
  githubRepository,
  githubRoot,
  githubImport,
  COMMIT_SHA,
} from "./githubSources";
import { importPaths, resolveImport } from "./compilation";
import { validatePath } from "./paths";
const FILE_LIMIT = 5 * 1024 * 1024;
const apiOptions = (signal: AbortSignal) => ({
  signal,
  credentials: "omit" as const,
  referrerPolicy: "no-referrer" as const,
  headers: { Accept: "application/vnd.github+json" },
});
export async function githubCommit(
  repository: string,
  reference: string,
  signal: AbortSignal
): Promise<string> {
  const repo = githubRepository(repository);
  if (!reference.trim() || reference.length > 200)
    throw new Error("Enter a commit SHA, tag or branch.");
  const data = JSON.parse(
    await readBounded(
      await fetch(
        `https://api.github.com/repos/${repo}/commits/${encodeURIComponent(reference)}`,
        apiOptions(signal)
      ),
      FILE_LIMIT
    )
  );
  if (typeof data.sha !== "string" || !COMMIT_SHA.test(data.sha))
    throw new Error("GitHub did not return a valid commit.");
  return data.sha.toLowerCase();
}
async function blobHash(content: string) {
  const bytes = new TextEncoder().encode(content);
  const header = new TextEncoder().encode(`blob ${bytes.byteLength}\0`);
  const blob = new Uint8Array(header.length + bytes.length);
  blob.set(header);
  blob.set(bytes, header.length);
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-1", blob));
  return [...hash].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
export async function installGithubDependency(
  workspace: SolidityWorkspace,
  repository: string,
  reference: string,
  signal: AbortSignal,
  onProgress: (count: number) => void = () => {}
): Promise<InstalledDependency> {
  const repo = githubRepository(repository);
  const name = githubRoot(repo),
    root = name + "/";
  const commit = COMMIT_SHA.test(reference)
    ? reference.toLowerCase()
    : await githubCommit(repo, reference, signal);
  const prefixes = new Set<string>([root]);
  const verifiedRefs = new Set<string>();
  const resolve = (from: string, imported: string) => {
    const git = githubImport(imported);
    if (git && git.repository.toLowerCase() === repo.toLowerCase()) {
      prefixes.add(git.prefix);
      if (git.reference) {
        if (COMMIT_SHA.test(git.reference)) {
          if (git.reference.toLowerCase() !== commit)
            throw new Error(
              "This import points to a different commit. Install it in a separate workspace or use the same commit."
            );
        } else verifiedRefs.add(git.reference);
      }
      return root + git.path;
    }
    return resolveImport(from, imported);
  };
  const pending = new Set<string>();
  for (const file of workspace.files) {
    if (file.name.toLowerCase().startsWith(root.toLowerCase())) continue;
    for (const imported of importPaths(file.content)) {
      const path = resolve(file.name, imported);
      if (path.startsWith(root)) pending.add(path);
    }
  }
  if (!pending.size) throw new Error(`Add an import from ${name} first.`);
  const tree = JSON.parse(
    await readBounded(
      await fetch(
        `https://api.github.com/repos/${repo}/git/trees/${commit}?recursive=1`,
        apiOptions(signal)
      ),
      FILE_LIMIT
    )
  );
  if (tree.truncated || !Array.isArray(tree.tree))
    throw new Error(
      "The repository file list is incomplete. Choose a smaller repository."
    );
  const available = new Map<string, { sha: string; size: number }>();
  for (const item of tree.tree) {
    if (
      item.type !== "blob" ||
      !["100644", "100755"].includes(item.mode) ||
      typeof item.path !== "string" ||
      !item.path.endsWith(".sol")
    )
      continue;
    const path = root + item.path;
    if (
      validatePath(path, true) !== path ||
      !COMMIT_SHA.test(item.sha) ||
      !Number.isInteger(item.size) ||
      item.size < 0 ||
      item.size > FILE_LIMIT
    )
      continue;
    available.set(path, item);
  }
  const sources = new Map<string, string>(),
    integrities = new Map<string, string>();
  let total = 0;
  while (pending.size) {
    signal.throwIfAborted();
    const batch = [...pending].slice(0, 4);
    batch.forEach((path) => pending.delete(path));
    const fetched = await Promise.all(
      batch.map(async (path) => {
        const item = available.get(path);
        if (!item)
          throw new Error(
            `The pinned repository doesn't contain a regular Solidity file at ${path}.`
          );
        const relative = path
          .slice(root.length)
          .split("/")
          .map(encodeURIComponent)
          .join("/");
        const content = await readBounded(
          await fetch(
            `https://raw.githubusercontent.com/${repo}/${commit}/${relative}`,
            { signal, credentials: "omit", referrerPolicy: "no-referrer" }
          ),
          FILE_LIMIT
        );
        if ((await blobHash(content)) !== item.sha)
          throw new Error(`GitHub source integrity check failed for ${path}.`);
        return { path, content, integrity: await sourceIntegrity(content) };
      })
    );
    for (const { path, content, integrity } of fetched) {
      total += new TextEncoder().encode(content).byteLength;
      if (total > 50 * 1024 * 1024 || sources.size >= 500)
        throw new Error("Dependencies exceed the workspace size limit.");
      sources.set(path, content);
      integrities.set(path, integrity);
      for (const imported of importPaths(content)) {
        const resolved = resolve(path, imported);
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
  for (const ref of verifiedRefs)
    if (
      (ref === reference ? commit : await githubCommit(repo, ref, signal)) !==
      commit
    )
      throw new Error(
        `GitHub reference ${ref} points to a different commit. Use that reference or its exact SHA.`
      );
  return {
    lock: {
      name,
      version: commit,
      source: "github",
      repository: repo,
      prefixes: [...prefixes].sort(),
      files: [...sources.keys()]
        .sort()
        .map((path) => ({ path, integrity: integrities.get(path)! })),
    },
    sources: [...sources].map(([name, content]) => ({ name, content })),
  };
}
