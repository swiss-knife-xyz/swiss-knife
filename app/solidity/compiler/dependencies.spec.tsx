// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import {
  applyDependency,
  installNpmDependency,
  lockedPath,
  removeDependency,
  sourceIntegrity,
  validateDependencyLocks,
} from "@/lib/solidity/dependencies";
import type { SolidityWorkspace } from "@/lib/solidity/workspace";
import { compilationSources } from "@/lib/solidity/compilation";
import {
  exportWorkspaceZip,
  importWorkspaceZip,
  applyWorkspaceImport,
} from "@/lib/solidity/backup";
import { addFolder, moveFolder, removeFolder } from "@/lib/solidity/paths";
const workspace: SolidityWorkspace = {
  files: [
    {
      id: "entry",
      name: "Token.sol",
      content: 'import "@test/pkg/A.sol"; contract Token is A {}',
    },
  ],
  activeFileId: "entry",
  openFileIds: ["entry"],
};
const packageSources = {
  "/A.sol": 'import "./utils/B.sol"; contract A is B {}',
  "/utils/B.sol": 'import "../A.sol"; contract B {}',
};
async function network(
  overrides: { hash?: boolean; version?: string; missing?: boolean } = {}
) {
  const metadata = {
    package: "@test/pkg",
    version: overrides.version ?? "1.0.0",
    files: await Promise.all(
      Object.entries(packageSources).map(async ([path, content]) => ({
        path,
        size: content.length,
        integrity: overrides.hash
          ? "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
          : await sourceIntegrity(content),
      }))
    ),
  };
  const fetcher = vi.fn(async (url: string) => {
    if (url.endsWith("?meta")) return new Response(JSON.stringify(metadata));
    if (overrides.missing) return new Response("", { status: 404 });
    const path = url.replace("https://unpkg.com/@test/pkg@1.0.0", "");
    return new Response(
      packageSources[path as keyof typeof packageSources] ?? "missing",
      { status: path in packageSources ? 200 : 404 }
    );
  });
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}
afterEach(() => vi.unstubAllGlobals());
it("fetches only pinned reachable sources, follows transitive/cyclic imports and checks hashes", async () => {
  const fetcher = await network();
  const installed = await installNpmDependency(
    workspace,
    "@test/pkg",
    "1.0.0",
    new AbortController().signal
  );
  expect(installed.sources).toHaveLength(2);
  expect(fetcher).toHaveBeenCalledTimes(3);
  expect(
    fetcher.mock.calls.every(([url]) =>
      url.startsWith("https://unpkg.com/@test/pkg@1.0.0/")
    )
  ).toBe(true);
  const next = applyDependency(workspace, installed);
  expect(next.files[0]).toEqual(workspace.files[0]);
  expect(Object.keys(compilationSources(next.files, "Token.sol"))).toHaveLength(
    3
  );
  expect(lockedPath(next, "@test/pkg/A.sol")).toBe(true);
  expect(lockedPath(next, "@test", true)).toBe(true);
  expect(() => addFolder(next, "@test/pkg/custom")).toThrow("read-only");
  expect(() => moveFolder(next, "@test", "moved")).toThrow("read-only");
  expect(() => removeFolder(next, "@test")).toThrow("read-only");
  const again = applyDependency(next, installed);
  expect(again.files.map((f) => f.id)).toEqual(next.files.map((f) => f.id));
  expect(removeDependency(next, "@test/pkg").files).toEqual(workspace.files);
});
it("rejects ranges, metadata mismatches, missing sources and corrupt bytes without mutating the workspace", async () => {
  const fetcher = await network();
  await expect(
    installNpmDependency(
      workspace,
      "@test/pkg",
      "latest",
      new AbortController().signal
    )
  ).rejects.toThrow("exact version");
  expect(fetcher).not.toHaveBeenCalled();
  await network({ version: "2.0.0" });
  await expect(
    installNpmDependency(
      workspace,
      "@test/pkg",
      "1.0.0",
      new AbortController().signal
    )
  ).rejects.toThrow("pinned version");
  await network({ hash: true });
  await expect(
    installNpmDependency(
      workspace,
      "@test/pkg",
      "1.0.0",
      new AbortController().signal
    )
  ).rejects.toThrow("Integrity");
  await network({ missing: true });
  await expect(
    installNpmDependency(
      workspace,
      "@test/pkg",
      "1.0.0",
      new AbortController().signal
    )
  ).rejects.toThrow("not found");
  expect(workspace.files).toHaveLength(1);
});
it("doesn't overwrite editable package paths and respects cancellation", async () => {
  await network();
  const installed = await installNpmDependency(
    workspace,
    "@test/pkg",
    "1.0.0",
    new AbortController().signal
  );
  expect(() =>
    applyDependency(
      {
        ...workspace,
        files: [
          ...workspace.files,
          { id: "local", name: "@test/pkg/Local.sol", content: "keep" },
        ],
      },
      installed
    )
  ).toThrow("editable sources");
  const controller = new AbortController();
  controller.abort();
  await expect(
    installNpmDependency(workspace, "@test/pkg", "1.0.0", controller.signal)
  ).rejects.toThrow();
});
it("round-trips pinned dependencies in ZIP backups and rejects tampered lock files", async () => {
  await network();
  const installed = await installNpmDependency(
    workspace,
    "@test/pkg",
    "1.0.0",
    new AbortController().signal
  );
  const next = applyDependency(workspace, installed);
  const backup = await importWorkspaceZip(await exportWorkspaceZip(next));
  expect(backup.dependencies).toEqual(next.dependencies);
  const restored = applyWorkspaceImport(
    { files: [], activeFileId: null, openFileIds: [] },
    backup,
    "restore"
  );
  expect(restored.dependencies).toEqual(next.dependencies);
  expect(lockedPath(restored, "@test/pkg/A.sol")).toBe(true);
  expect(() => applyWorkspaceImport(workspace, backup, "add")).toThrow(
    "new workspace"
  );
  await expect(
    validateDependencyLocks(
      next.dependencies,
      next.files.map((file) => ({
        ...file,
        content: file.name.endsWith("A.sol") ? "tampered" : file.content,
      }))
    )
  ).rejects.toThrow("don't match");
});

it("updates from current consumer imports rather than obsolete internal paths", async () => {
  await network();
  const first = applyDependency(
    workspace,
    await installNpmDependency(
      workspace,
      "@test/pkg",
      "1.0.0",
      new AbortController().signal
    )
  );
  const newSource = "contract A {}";
  const integrity = await sourceIntegrity(newSource);
  const fetcher = vi.fn(async (url: string) =>
    url.endsWith("?meta")
      ? new Response(
          JSON.stringify({
            package: "@test/pkg",
            version: "2.0.0",
            files: [{ path: "/A.sol", size: newSource.length, integrity }],
          })
        )
      : new Response(newSource)
  );
  vi.stubGlobal("fetch", fetcher);
  const updated = applyDependency(
    first,
    await installNpmDependency(
      first,
      "@test/pkg",
      "2.0.0",
      new AbortController().signal
    )
  );
  expect(updated.dependencies?.[0].version).toBe("2.0.0");
  expect(updated.files.map((file) => file.name)).toEqual([
    "Token.sol",
    "@test/pkg/A.sol",
  ]);
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(
    updated.files.find((file) => file.name === "@test/pkg/A.sol")?.id
  ).toBe(first.files.find((file) => file.name === "@test/pkg/A.sol")?.id);
});

it("fetches an exact latest version directly from npm and builds package links safely", async () => {
  const { latestNpmVersion, npmPackageUrl } = await import(
    "@/lib/solidity/dependencies"
  );
  const fetcher = vi.fn(
    async () =>
      new Response(JSON.stringify({ name: "@test/pkg", version: "2.3.4" }))
  );
  vi.stubGlobal("fetch", fetcher);
  expect(npmPackageUrl("@test/pkg")).toBe(
    "https://www.npmjs.com/package/@test/pkg"
  );
  expect(npmPackageUrl("https://evil.test")).toBeUndefined();
  expect(
    await latestNpmVersion("@test/pkg", new AbortController().signal)
  ).toBe("2.3.4");
  expect(fetcher).toHaveBeenCalledWith(
    "https://registry.npmjs.org/%40test%2Fpkg/latest",
    expect.objectContaining({ credentials: "omit", cache: "no-store" })
  );
  fetcher.mockResolvedValue(
    new Response(JSON.stringify({ name: "different", version: "2.3.4" }))
  );
  await expect(
    latestNpmVersion("@test/pkg", new AbortController().signal)
  ).rejects.toThrow("invalid package version");
});
