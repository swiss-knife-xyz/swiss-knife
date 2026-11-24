import {
  githubCommit,
  githubSolidityTree,
  githubSourceFile,
} from "./solidity/githubDependencies";
import { githubRepository } from "./solidity/githubSources";
import { validatePath } from "./solidity/paths";

/** Tree URLs encode a revision followed by an optional repository folder. */
export function parseGithubTreeUrl(value: string) {
  try {
    const url = new URL(value.trim());
    if (
      url.protocol !== "https:" ||
      url.hostname !== "github.com" ||
      url.port ||
      url.username ||
      url.password
    )
      return null;
    const parts = url.pathname.replace(/\/$/, "").split("/").slice(1);
    if (parts.length < 4 || parts[2] !== "tree") return null;
    const repository = githubRepository(parts.slice(0, 2).join("/"));
    const revision = decodeURIComponent(parts[3]);
    if (!revision || revision.length > 200 || /[?#\\]/.test(revision))
      return null;
    const folder = parts.slice(4).map(decodeURIComponent).join("/");
    if (folder) validatePath(folder);
    return { repository, revision, folder };
  } catch {
    return null;
  }
}

/** Preserve explorer paths as diff keys; refuse ambiguous or many-to-one matches. */
export function matchGithubFiles(
  contractPaths: string[],
  repositoryPaths: string[],
  folder = ""
) {
  const prefix = folder ? validatePath(folder) + "/" : "";
  const paths = repositoryPaths.filter((path) => path.startsWith(prefix));
  const matches: Record<string, string> = Object.create(null);
  const used = new Set<string>();
  for (const original of contractPaths) {
    // Single-file explorer responses use the contract name without an extension.
    const sourcePath = original.includes(".") ? original : original + ".sol";
    const normalized = sourcePath.replace(/\\/g, "/").replace(/^(\.\/)+/, "");
    const exact = paths.filter(
      (path) => path === normalized || path.slice(prefix.length) === normalized
    );
    // Prefer the longest common path suffix, falling back to a unique filename.
    const parts = normalized.split("/");
    let candidates = exact;
    for (
      let length = parts.length;
      !candidates.length && length > 0;
      length--
    ) {
      const suffix = parts.slice(-length).join("/");
      candidates = paths.filter(
        (path) => path === suffix || path.endsWith("/" + suffix)
      );
    }
    if (candidates.length > 1)
      throw new Error(
        `Multiple repository files match ${original}. Narrow the repository folder to select one.`
      );
    if (candidates.length === 1) {
      const path = candidates[0];
      if (used.has(path))
        throw new Error(
          `More than one verified source matches ${path}. Choose a repository folder with distinct source paths.`
        );
      used.add(path);
      matches[original] = path;
    }
  }
  return matches;
}

export async function loadGithubComparison(
  contractSources: Record<string, string>,
  repository: string,
  reference: string,
  folder: string,
  signal: AbortSignal
) {
  const treeUrl = parseGithubTreeUrl(repository);
  const repo = githubRepository(treeUrl?.repository ?? repository);
  const scope = folder.trim().replace(/\/$/, "");
  if (scope) validatePath(scope);
  const commit = await githubCommit(repo, reference.trim() || "HEAD", signal);
  const tree = await githubSolidityTree(repo, commit, signal);
  const matches = matchGithubFiles(
    Object.keys(contractSources),
    [...tree.keys()],
    scope
  );
  const entries = Object.entries(matches);
  if (!entries.length)
    throw new Error(
      "No repository Solidity files match the verified sources. Check the repository and folder. Flattened sources may require a matching flattened file."
    );
  if (
    entries.length > 500 ||
    entries.reduce((size, [, path]) => size + tree.get(path)!.size, 0) >
      50 * 1024 * 1024
  )
    throw new Error("Matching sources exceed the comparison size limit.");
  const sources: Record<string, string> = Object.create(null);
  for (let index = 0; index < entries.length; index += 4) {
    signal.throwIfAborted();
    await Promise.all(
      entries.slice(index, index + 4).map(async ([original, path]) => {
        sources[original] = await githubSourceFile(
          repo,
          commit,
          path,
          tree.get(path)!.sha,
          signal
        );
      })
    );
  }
  return {
    repository: repo,
    folder: scope,
    commit,
    sources,
    matches,
    missing: Object.keys(contractSources).filter(
      (path) => !Object.hasOwn(matches, path)
    ),
  };
}
