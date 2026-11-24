import type { DependencyLock } from "./dependencies";
const REPOSITORY = /^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9_][A-Za-z0-9_.-]*$/;
export const COMMIT_SHA = /^[a-fA-F0-9]{40}$/;
export function githubRepository(value: string): string {
  const repo = value
    .trim()
    .replace(/^https:\/\/github\.com\//, "")
    .replace(/\/$/, "")
    .replace(/\.git$/, "");
  if (
    !REPOSITORY.test(repo) ||
    repo.split("/").some((part) => part === "." || part === "..")
  )
    throw new Error("Enter a GitHub repository, such as Vectorized/solady.");
  return repo;
}
export const githubRoot = (repository: string) =>
  `github.com/${githubRepository(repository).toLowerCase()}`;
export function githubRepositoryUrl(value: string): string | undefined {
  try {
    return `https://github.com/${githubRepository(value)}`;
  } catch {
    return undefined;
  }
}
export type GithubImport = {
  repository: string;
  root: string;
  path: string;
  prefix: string;
  reference?: string;
};
export function githubImport(value: string): GithubImport | null {
  let match: RegExpMatchArray | null;
  let repository: string,
    path: string,
    prefix: string,
    reference: string | undefined;
  if ((match = value.match(/^github\.com\/([^/]+\/[^/]+)\/(.+\.sol)$/))) {
    repository = match[1];
    path = match[2];
    prefix = `github.com/${repository}/`;
  } else if (
    (match = value.match(
      /^https:\/\/github\.com\/([^/]+\/[^/]+)\/(?:blob|raw)\/([^/]+)\/(.+\.sol)$/
    ))
  ) {
    repository = match[1];
    reference = match[2];
    path = match[3];
    prefix = value.slice(0, -path.length);
  } else if (
    (match = value.match(
      /^https:\/\/raw\.githubusercontent\.com\/([^/]+\/[^/]+)\/([^/]+)\/(.+\.sol)$/
    ))
  ) {
    repository = match[1];
    reference = match[2];
    path = match[3];
    prefix = value.slice(0, -path.length);
  } else return null;
  try {
    repository = githubRepository(repository);
    if (reference && !/^[A-Za-z0-9_.-]+$/.test(reference)) return null;
    if (
      path.split("/").some((part) => !part || part === "." || part === "..") ||
      /[?#%\\]/.test(path)
    )
      return null;
    return {
      repository,
      root: githubRoot(repository),
      path,
      prefix,
      reference,
    };
  } catch {
    return null;
  }
}
export function githubTarget(value: string) {
  return (
    githubImport(value) ??
    (() => {
      try {
        if (!value.startsWith("github.com/")) return null;
        const repository = githubRepository(value.slice(11));
        return {
          repository,
          root: githubRoot(repository),
          reference: undefined,
        };
      } catch {
        return null;
      }
    })()
  );
}
export function githubRemappings(dependencies: DependencyLock[] = []) {
  return dependencies.flatMap((dep) =>
    dep.source === "github"
      ? (dep.prefixes ?? [])
          .filter((prefix) => prefix !== dep.name + "/")
          .map(
            (prefix) =>
              `${prefix.startsWith("https://") ? ":" : ""}${prefix}=${dep.name}/`
          )
      : []
  );
}
