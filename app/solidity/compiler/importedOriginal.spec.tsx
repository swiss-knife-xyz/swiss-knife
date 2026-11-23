// @vitest-environment node
import "fake-indexeddb/auto";
import { expect, it } from "vitest";
import { importedChanges } from "@/lib/solidity/importedOriginal";
import {
  importVerifiedWorkspace,
  openOriginalImportedWorkspace,
} from "@/lib/solidity/importVerifiedWorkspace";
import {
  verifiedContractWorkspace,
  type VerifiedContract,
} from "@/lib/solidity/verifiedContract";
import {
  getDeploymentBuild,
  listDeployments,
} from "@/lib/solidity/deployments";
import { loadWorkspace, saveWorkspace } from "@/lib/solidity/workspace";

const contract: VerifiedContract = {
  chainId: 1,
  address: `0x${"12".repeat(20)}`,
  provider: "etherscan",
  source: {
    contractName: "src/Token.sol:Token",
    compilerVersion: "v0.8.30+commit.73712a01",
    constructorArguments: "",
    licenseType: "3",
    partial: false,
    files: ["src/Token.sol", "lib/Base.sol"],
    sourceCode: JSON.stringify({
      language: "Solidity",
      sources: {
        "src/Token.sol": {
          content: "pragma solidity ^0.8.20; contract Token {}",
        },
        "lib/Base.sol": {
          content: "pragma solidity ^0.8.20; contract Base {}",
        },
      },
      settings: {
        optimizer: { enabled: true, runs: 200 },
        metadata: { bytecodeHash: "none" },
      },
    }),
  },
};
it("detects unsaved edits, added/deleted/renamed files and settings; ignores navigation and clears after reverting", async () => {
  const saved = await importVerifiedWorkspace(
    "Original checks",
    "",
    verifiedContractWorkspace(contract.source),
    contract
  );
  const [record] = await listDeployments(saved.id);
  const build = (await getDeploymentBuild(record.buildId))!;
  const original = saved.workspace;
  expect(importedChanges(original, build).modified).toBe(false);
  expect(
    importedChanges({ ...original, activeFileId: null, openFileIds: [] }, build)
      .modified
  ).toBe(false);
  expect(
    importedChanges(
      {
        ...original,
        files: original.files.map((file, i) =>
          i ? file : { ...file, content: file.content + "\n// edited" }
        ),
      },
      build
    ).files
  ).toHaveLength(1);
  expect(
    importedChanges({ ...original, files: original.files.slice(1) }, build)
      .modified
  ).toBe(true);
  expect(
    importedChanges(
      {
        ...original,
        files: [
          ...original.files,
          { id: "extra", name: "Extra.sol", content: "" },
        ],
      },
      build
    ).files
  ).toContain("Extra.sol");
  expect(
    importedChanges(
      {
        ...original,
        files: original.files.map((file, i) =>
          i ? file : { ...file, name: "Moved.sol" }
        ),
      },
      build
    ).files
  ).toHaveLength(2);
  expect(
    importedChanges(
      {
        ...original,
        compilerSettings: { ...original.compilerSettings!, runs: 999 },
      },
      build
    ).settings
  ).toBe(true);
  expect(importedChanges(original, build).modified).toBe(false);
});
it("opens a distinct pristine workspace from the immutable snapshot and leaves edited source intact across reloads", async () => {
  let saved = await importVerifiedWorkspace(
    "Edited import",
    "",
    verifiedContractWorkspace(contract.source),
    contract
  );
  const [record] = await listDeployments(saved.id);
  const build = (await getDeploymentBuild(record.buildId))!;
  saved = await saveWorkspace(
    {
      ...saved.workspace,
      files: saved.workspace.files.map((file) => ({
        ...file,
        content: file.content + "\n// local",
      })),
    },
    saved
  );
  const restored = await openOriginalImportedWorkspace(
    "Token (original)",
    "",
    record,
    build
  );
  expect(restored.id).not.toBe(saved.id);
  expect(restored.workspace.importedContract).toEqual(
    saved.workspace.importedContract
  );
  const [copied] = await listDeployments(restored.id);
  const copiedBuild = (await getDeploymentBuild(copied.buildId))!;
  expect(copied.id).not.toBe(record.id);
  expect(copied.imported).toEqual(record.imported);
  expect(copiedBuild.input).toEqual(build.input);
  expect(importedChanges(restored.workspace, copiedBuild).modified).toBe(false);
  const reloaded = await loadWorkspace("", saved.id);
  expect(
    reloaded.workspace.files.every((file) => file.content.endsWith("// local"))
  ).toBe(true);
  expect(importedChanges(reloaded.workspace, build).modified).toBe(true);
});

it("reverts every source and compiler setting, restores deletions, removes additions and retains existing file IDs", async () => {
  const { restoreImportedOriginal } = await import(
    "@/lib/solidity/importedOriginal"
  );
  const saved = await importVerifiedWorkspace(
    "Revert checks",
    "",
    verifiedContractWorkspace(contract.source),
    contract
  );
  const [record] = await listDeployments(saved.id);
  const build = (await getDeploymentBuild(record.buildId))!;
  const existing = saved.workspace.files[0];
  const edited = {
    ...saved.workspace,
    files: [
      { ...existing, content: existing.content + "\n// local" },
      { id: "added", name: "Added.sol", content: "contract Added {}" },
    ],
    openFileIds: [existing.id, "added"],
    activeFileId: "added",
    compilerSettings: { ...saved.workspace.compilerSettings!, runs: 999 },
  };
  const reverted = restoreImportedOriginal(edited, build);
  expect(importedChanges(reverted, build).modified).toBe(false);
  expect(reverted.files.find((file) => file.name === existing.name)?.id).toBe(
    existing.id
  );
  expect(reverted.files).toHaveLength(2);
  expect(reverted.files.some((file) => file.name === "Added.sol")).toBe(false);
  expect(reverted.openFileIds).not.toContain("added");
  expect(reverted.files.some((file) => file.id === reverted.activeFileId)).toBe(
    true
  );
  expect(reverted.importedContract).toEqual(edited.importedContract);
  expect((await getDeploymentBuild(record.buildId))!.input).toEqual(
    build.input
  );
});
