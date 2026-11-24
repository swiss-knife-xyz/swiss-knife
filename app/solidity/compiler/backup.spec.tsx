// @vitest-environment node
import { expect, it } from "vitest";
import JSZip from "jszip";
import {
  exportWorkspaceZip,
  importWorkspaceZip,
  applyWorkspaceImport,
  planWorkspaceImport,
  BACKUP_LIMITS,
} from "@/lib/solidity/backup";
import type { SolidityWorkspace } from "@/lib/solidity/workspace";

const workspace: SolidityWorkspace = {
  files: [
    { id: "a", name: "Counter.sol", content: "// ⚡ λ\ncontract Counter {}\n" },
    { id: "b", name: "Token.sol", content: "" },
  ],
  activeFileId: "a",
  openFileIds: ["b", "a"],
};
const zip = async (files: Record<string, string | Uint8Array>) => {
  const archive = new JSZip();
  for (const [name, content] of Object.entries(files))
    archive.file(name, content);
  return archive.generateAsync({ type: "uint8array", compression: "DEFLATE" });
};
it("round-trips exact Unicode source, file order, editor tabs and active file", async () => {
  const backup = await importWorkspaceZip(await exportWorkspaceZip(workspace));
  expect(backup.files).toEqual(
    workspace.files.map(({ name, content }) => ({ name, content }))
  );
  expect(backup.openFiles).toEqual(["Token.sol", "Counter.sol"]);
  expect(backup.activeFile).toBe("Counter.sol");
  const restored = applyWorkspaceImport(
    { files: [], activeFileId: null, openFileIds: [] },
    backup,
    "restore"
  );
  expect(
    restored.files.map(({ name, content }) => ({ name, content }))
  ).toEqual(backup.files);
  expect(
    restored.files.find((file) => file.id === restored.activeFileId)?.name
  ).toBe("Counter.sol");
  expect(restored.files[0].id).not.toBe("a");
});
it("preserves a workspace with all editor tabs closed", async () => {
  const backup = await importWorkspaceZip(
    await exportWorkspaceZip({
      ...workspace,
      activeFileId: null,
      openFileIds: [],
    })
  );
  expect(backup.openFiles).toEqual([]);
  expect(backup.activeFile).toBeNull();
});
it("adds files without overwriting names or content and handles repeated collisions", () => {
  const current = {
    ...workspace,
    files: [
      ...workspace.files,
      { id: "c", name: "counter-2.sol", content: "keep this" },
    ],
  };
  const backup = {
    files: [{ name: "Counter.sol", content: "new code" }],
    activeFile: "Counter.sol",
    openFiles: ["Counter.sol"],
  };
  const result = applyWorkspaceImport(current, backup, "add");
  expect(result.files.slice(0, 3)).toEqual(current.files);
  expect(result.files[3]).toMatchObject({
    name: "imported/Counter.sol",
    content: "new code",
  });
  expect(current.files).toHaveLength(3);
  const restored = applyWorkspaceImport(current, backup, "restore");
  expect(restored.files.map((file) => file.name)).toEqual(["Counter.sol"]);
});
it("keeps renamed collisions within the filename length limit", () => {
  const name = "X".repeat(96) + ".sol";
  const current = { ...workspace, files: [{ id: "a", name, content: "" }] };
  const backup = {
    files: [{ name, content: "" }],
    openFiles: [],
    activeFile: null,
  };
  expect(planWorkspaceImport(current, backup, "add")[0].name).toBe(
    "imported/" + name
  );
});
it("imports ordinary flat Solidity ZIPs", async () => {
  const backup = await importWorkspaceZip(
    await zip({
      "Counter.sol": "contract Counter {}",
      "Token.sol": "contract Token {}",
    })
  );
  expect(backup.files).toHaveLength(2);
  expect(backup.activeFile).toBe("Counter.sol");
});
it("rejects unsafe paths, unsupported entries and duplicate names", async () => {
  const cases: Record<string, string>[] = [
    { "../Token.sol": "x" },
    { "nested/../Token.sol": "x" },
    { "README.md": "x" },
    { "Token.sol": "x", "token.sol": "y" },
  ];
  for (const files of cases) {
    await expect(importWorkspaceZip(await zip(files))).rejects.toThrow();
  }
});
it("rejects corrupted files, missing sources, unsupported manifests and invalid tab state", async () => {
  const data = await exportWorkspaceZip(workspace);
  const archive = await JSZip.loadAsync(data);
  archive.file("Counter.sol", "modified");
  await expect(
    importWorkspaceZip(await archive.generateAsync({ type: "uint8array" }))
  ).rejects.toThrow("don't match");
  const original = await JSZip.loadAsync(data);
  const manifest = JSON.parse(
    await original.file("ethsh-workspace.json")!.async("string")
  );
  for (const change of [
    { version: 99 },
    { openFiles: ["missing.sol"] },
    { files: [] },
  ]) {
    original.file(
      "ethsh-workspace.json",
      JSON.stringify({ ...manifest, ...change })
    );
    await expect(
      importWorkspaceZip(await original.generateAsync({ type: "uint8array" }))
    ).rejects.toThrow();
  }
  await expect(importWorkspaceZip(new Uint8Array([1, 2, 3]))).rejects.toThrow(
    "Couldn't read"
  );
});
it("rejects oversized decompressed entries, excessive files and invalid UTF-8", async () => {
  await expect(
    importWorkspaceZip(
      await zip({ "Large.sol": "x".repeat(BACKUP_LIMITS.fileBytes + 1) })
    )
  ).rejects.toThrow("size limit");
  await expect(
    importWorkspaceZip(await zip({ "Bad.sol": new Uint8Array([0xff, 0xfe]) }))
  ).rejects.toThrow("UTF-8");
  await expect(
    importWorkspaceZip(
      await zip(
        Object.fromEntries(
          Array.from({ length: BACKUP_LIMITS.files + 1 }, (_, i) => [
            `File${i}.sol`,
            "",
          ])
        )
      )
    )
  ).rejects.toThrow("500 files");
});

it("round-trips folders, nested sources and old version-one manifests", async () => {
  const nested = {
    ...workspace,
    folders: ["contracts", "empty/nested"],
    files: workspace.files.map((file) => ({
      ...file,
      name: "contracts/" + file.name,
    })),
  };
  const backup = await importWorkspaceZip(await exportWorkspaceZip(nested));
  expect(backup.folders).toEqual(["contracts", "empty", "empty/nested"]);
  expect(backup.files.map((file) => file.name)).toEqual([
    "contracts/Counter.sol",
    "contracts/Token.sol",
  ]);
  const archive = await JSZip.loadAsync(await exportWorkspaceZip(workspace));
  const manifest = JSON.parse(
    await archive.file("ethsh-workspace.json")!.async("string")
  );
  manifest.version = 1;
  delete manifest.folders;
  archive.file("ethsh-workspace.json", JSON.stringify(manifest));
  expect(
    (
      await importWorkspaceZip(
        await archive.generateAsync({ type: "uint8array" })
      )
    ).files
  ).toHaveLength(2);
});
it("keeps colliding imported graphs together and updates direct local imports", () => {
  const backup = {
    files: [
      {
        name: "Counter.sol",
        content:
          'import "./lib/Base.sol"; import {Base} from "lib/Base.sol"; // import "Counter.sol";',
      },
      { name: "lib/Base.sol", content: "contract Base {}" },
    ],
    folders: ["empty"],
    openFiles: ["Counter.sol"],
    activeFile: "Counter.sol",
  };
  const imported = applyWorkspaceImport(workspace, backup, "add");
  expect(imported.files[2].name).toBe("imported/Counter.sol");
  expect(imported.files[2].content).toBe(
    'import "./lib/Base.sol"; import {Base} from "imported/lib/Base.sol"; // import "Counter.sol";'
  );
  expect(imported.folders).toContain("imported/empty");
});
