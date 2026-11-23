// @vitest-environment node
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { afterEach, expect, it, vi } from "vitest";
import { githubImport, githubRoot } from "@/lib/solidity/githubSources";
import {
  githubCommit,
  installGithubDependency,
} from "@/lib/solidity/githubDependencies";
import {
  applyDependency,
  validateDependencyLocks,
} from "@/lib/solidity/dependencies";
import { dependencyCompilerSettings } from "@/lib/solidity/dependencySettings";
import { compilationSources } from "@/lib/solidity/compilation";
import { standardJsonInput } from "@/lib/solidity/settings";
import { importStandardJson } from "@/lib/solidity/standardJson";
import { exportWorkspaceZip, importWorkspaceZip } from "@/lib/solidity/backup";
import type { SolidityWorkspace } from "@/lib/solidity/workspace";
const sha = "a".repeat(40),
  repo = "Vectorized/solady",
  root = githubRoot(repo);
const sourceFiles = {
  "src/tokens/ERC20.sol":
    'import "../utils/Helper.sol"; contract ERC20 {function value() external pure returns(uint){return Helper.value();}}',
  "src/utils/Helper.sol":
    "library Helper {function value() internal pure returns(uint){return 7;}}",
};
const workspace: SolidityWorkspace = {
  files: [
    {
      id: "entry",
      name: "Token.sol",
      content: `pragma solidity ^0.8.20; import {ERC20} from "https://github.com/${repo}/blob/main/src/tokens/ERC20.sol"; contract Token is ERC20 {}`,
    },
  ],
  activeFileId: "entry",
  openFileIds: ["entry"],
};
const gitHash = (content: string) =>
  createHash("sha1")
    .update(`blob ${Buffer.byteLength(content)}\0`)
    .update(content)
    .digest("hex");
function network({
  tampered = false,
  truncated = false,
  symlink = false,
} = {}) {
  const fetcher = vi.fn(async (url: string) => {
    if (url.includes("/commits/")) return new Response(JSON.stringify({ sha }));
    if (url.includes("/git/trees/"))
      return new Response(
        JSON.stringify({
          truncated,
          tree: Object.entries(sourceFiles).map(([path, content]) => ({
            path,
            type: "blob",
            mode: symlink ? "120000" : "100644",
            size: Buffer.byteLength(content),
            sha: gitHash(content),
          })),
        })
      );
    const prefix = `https://raw.githubusercontent.com/${repo}/${sha}/`;
    const path = url.slice(prefix.length) as keyof typeof sourceFiles;
    if (!url.startsWith(prefix) || !sourceFiles[path])
      return new Response("missing", { status: 404 });
    return new Response(tampered ? "tampered" : sourceFiles[path]);
  });
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}
afterEach(() => vi.unstubAllGlobals());
it("pins a GitHub reference and downloads only reachable, verified sources at that exact SHA", async () => {
  const fetcher = network();
  const installed = await installGithubDependency(
    workspace,
    repo,
    "main",
    new AbortController().signal
  );
  expect(installed.lock).toMatchObject({
    name: root,
    source: "github",
    repository: repo,
    version: sha,
  });
  expect(installed.sources.map((file) => file.name).sort()).toEqual([
    `${root}/src/tokens/ERC20.sol`,
    `${root}/src/utils/Helper.sol`,
  ]);
  expect(
    fetcher.mock.calls
      .filter(([url]) => url.startsWith("https://raw.githubusercontent.com/"))
      .every(([url]) => url.includes(`/${sha}/`))
  ).toBe(true);
  expect(fetcher).toHaveBeenCalledTimes(4);
  expect(await githubCommit(repo, "HEAD", new AbortController().signal)).toBe(
    sha
  );
});
it("compiles unchanged GitHub URL imports with real solc and round-trips Standard JSON and lock backups", async () => {
  network();
  const installed = await installGithubDependency(
    workspace,
    repo,
    "main",
    new AbortController().signal
  );
  const next = applyDependency(workspace, installed);
  const settings = dependencyCompilerSettings(
    next.compilerSettings,
    next.dependencies
  );
  const sources = compilationSources(
    next.files,
    "Token.sol",
    settings.extras?.remappings
  );
  expect(sources["Token.sol"].content).toBe(workspace.files[0].content);
  const input = standardJsonInput(sources, settings);
  const solc = createRequire(import.meta.url)("solc");
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  expect(
    output.errors?.filter((error: any) => error.severity === "error") ?? []
  ).toEqual([]);
  expect(
    output.contracts["Token.sol"].Token.evm.bytecode.object.length
  ).toBeGreaterThan(0);
  const imported = importStandardJson(JSON.stringify(input));
  expect(imported.compilerSettings?.extras?.remappings).toEqual(
    settings.extras?.remappings
  );
  const backup = await importWorkspaceZip(await exportWorkspaceZip(next));
  expect(backup.dependencies).toEqual(next.dependencies);
});
it("supports canonical and raw GitHub imports, normalizes repository case and rejects unsafe URLs", () => {
  expect(
    githubImport("github.com/Vectorized/solady/src/tokens/ERC20.sol")
  ).toMatchObject({ root, repository: repo, path: "src/tokens/ERC20.sol" });
  expect(
    githubImport(
      `https://raw.githubusercontent.com/${repo}/${sha}/src/tokens/ERC20.sol`
    )
  ).toMatchObject({ reference: sha, root });
  expect(githubRoot("vectorized/solady")).toBe(root);
  for (const path of [
    "https://github.com.evil.test/a/b/blob/main/A.sol",
    "https://github.com/a/b/blob/main/../A.sol",
    "https://user:secret@github.com/a/b/blob/main/A.sol",
  ])
    expect(githubImport(path)).toBeNull();
});
it("rejects mismatched commits, tampered blobs, symlinks and incomplete trees without changing local sources", async () => {
  const different = {
    ...workspace,
    files: workspace.files.map((file) => ({
      ...file,
      content: `import "https://raw.githubusercontent.com/${repo}/${"b".repeat(40)}/src/tokens/ERC20.sol";`,
    })),
  };
  network();
  await expect(
    installGithubDependency(different, repo, sha, new AbortController().signal)
  ).rejects.toThrow("different commit");
  network({ tampered: true });
  await expect(
    installGithubDependency(
      workspace,
      repo,
      "main",
      new AbortController().signal
    )
  ).rejects.toThrow("integrity");
  network({ symlink: true });
  await expect(
    installGithubDependency(
      workspace,
      repo,
      "main",
      new AbortController().signal
    )
  ).rejects.toThrow("regular Solidity");
  network({ truncated: true });
  await expect(
    installGithubDependency(
      workspace,
      repo,
      "main",
      new AbortController().signal
    )
  ).rejects.toThrow("incomplete");
  expect(workspace.files).toHaveLength(1);
});
it("validates GitHub locks and rejects forged repository mappings or changed source contents", async () => {
  network();
  const installed = await installGithubDependency(
    workspace,
    repo,
    "main",
    new AbortController().signal
  );
  expect(
    await validateDependencyLocks([installed.lock], installed.sources)
  ).toEqual([installed.lock]);
  await expect(
    validateDependencyLocks(
      [{ ...installed.lock, prefixes: ["https://evil.test/"] }],
      installed.sources
    )
  ).rejects.toThrow("GitHub dependency lock");
  await expect(
    validateDependencyLocks(
      [installed.lock],
      installed.sources.map((file) => ({ ...file, content: "modified" }))
    )
  ).rejects.toThrow("don't match");
});
