// @vitest-environment node
import "fake-indexeddb/auto";
import { createRequire } from "node:module";
import { afterEach, expect, it, vi } from "vitest";
import { compileResult } from "./useSolidityCompiler";
import {
  normalizeCompilerSettings,
  standardJsonInput,
} from "@/lib/solidity/settings";
import {
  deploymentFormKey,
  libraryDrafts,
  linkedCompilerSettings,
  normalizeLibraryLinks,
  referencesFromSolc,
  reusableLibrary,
  unresolvedLibraries,
  updateLibraryAddress,
} from "@/lib/solidity/libraries";
import {
  exportWorkspaceZip,
  importWorkspaceZip,
  applyWorkspaceImport,
} from "@/lib/solidity/backup";
import { loadWorkspace, saveWorkspace } from "@/lib/solidity/workspace";
import {
  prepareDeployment,
  getDeploymentBuild,
} from "@/lib/solidity/deployments";
import type { SolidityWorkspace } from "@/lib/solidity/workspace";
import type { CompilerBuild } from "./useSolidityCompiler";
const solc = createRequire(import.meta.url)("solc");
const version = `soljson-v${solc.version().match(/^\d+\.\d+\.\d+\+commit\.[a-f0-9]+/)[0]}.js`;
const a = `0x${"11".repeat(20)}`,
  b = `0x${"22".repeat(20)}`;
const files = [
  {
    id: "math",
    name: "Math.sol",
    content:
      "pragma solidity ^0.8.0; library Math { function add(uint a,uint b) external pure returns(uint){return a+b;} }",
  },
  {
    id: "main",
    name: "Main.sol",
    content:
      'pragma solidity ^0.8.0; import "./Math.sol"; contract Main { uint public n; constructor(uint n_){n=n_;} function f() external view returns(uint){return Math.add(n,2);} }',
  },
];
const sources = Object.fromEntries(
  files.map((file) => [file.name, { content: file.content }])
);
const ref = { sourcePath: "Math.sol", name: "Math" };
const settings = normalizeCompilerSettings({
  version,
  extras: { outputSelection: { "*": { "*": ["metadata"] } } },
});
function workspace(): SolidityWorkspace {
  return {
    files,
    activeFileId: "main",
    openFileIds: ["main"],
    compilerSettings: settings,
  };
}
function build(ws: SolidityWorkspace, chainId: number): CompilerBuild {
  const effective = linkedCompilerSettings(settings, ws, chainId);
  const input = standardJsonInput(sources, effective);
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  return {
    input: {
      workspaceId: "default",
      entry: "Main.sol",
      entryId: "main",
      key: "key",
      files,
      settings: effective,
      sources,
      fingerprint: JSON.stringify(input),
    },
    output,
    result: compileResult({ success: true, output }),
  };
}
afterEach(() => vi.restoreAllMocks());
it("uses real solc link references, produces linked bytecode and records matching metadata", () => {
  const unlinked = build(workspace(), 1);
  const main = unlinked.result.contracts!["Main.sol:Main"];
  expect(main.requiredLibraries).toEqual([ref]);
  expect(unresolvedLibraries(main)).toBe(true);
  expect(unlinked.result.contracts!["Math.sol:Math"].requiredLibraries).toEqual(
    []
  );
  const linked = build(updateLibraryAddress(workspace(), 1, ref, a), 1);
  const artifact = linked.result.contracts!["Main.sol:Main"];
  expect(unresolvedLibraries(artifact)).toBe(false);
  expect(artifact.bytecode.toLowerCase()).toContain(a.slice(2));
  const raw = linked.output!.contracts!["Main.sol"].Main as any;
  expect(
    JSON.parse(raw.metadata).settings.libraries["Math.sol:Math"].toLowerCase()
  ).toBe(a);
  expect(raw.evm.bytecode.linkReferences).toEqual({});
  expect(
    referencesFromSolc(
      unlinked.output!.contracts!["Main.sol"].Main.evm.bytecode.linkReferences
    )
  ).toEqual([ref]);
});
it("scopes addresses by chain, ignores invalid drafts and requires explicit adoption of unscoped imports", () => {
  let ws = updateLibraryAddress(workspace(), 1, ref, a);
  ws = updateLibraryAddress(ws, 11155111, ref, b);
  expect(
    linkedCompilerSettings(settings, ws, 1).extras!.libraries["Math.sol"].Math
  ).toBe(a);
  expect(
    linkedCompilerSettings(settings, ws, 11155111).extras!.libraries["Math.sol"]
      .Math
  ).toBe(b);
  expect(
    linkedCompilerSettings(settings, ws, 8453).extras!.libraries
  ).toBeUndefined();
  ws = updateLibraryAddress(ws, 1, ref, "alice.eth");
  expect(libraryDrafts(ws, 1)["Math.sol"].Math).toBe("alice.eth");
  expect(
    linkedCompilerSettings(settings, ws, 1).extras!.libraries
  ).toBeUndefined();
  const imported = {
    ...workspace(),
    compilerSettings: {
      ...settings,
      extras: { libraries: { "Math.sol": { Math: a } } },
    },
  };
  expect(
    linkedCompilerSettings(imported.compilerSettings, imported, 1).extras
      ?.libraries
  ).toBeUndefined();
  const verified = {
    ...imported,
    importedContract: { chainId: 1, address: a },
  };
  expect(libraryDrafts(verified, 1)["Math.sol"].Math).toBe(a);
  expect(libraryDrafts(verified, 11155111)).toEqual({});
});
it("keeps the deployment form identity stable for relinking but changes it for source edits", () => {
  const before = build(workspace(), 1);
  const after = build(updateLibraryAddress(workspace(), 1, ref, a), 1);
  expect(deploymentFormKey(before, "Main")).toBe(
    deploymentFormKey(after, "Main")
  );
  const edited = {
    ...after,
    input: {
      ...after.input,
      sources: { ...sources, "Main.sol": { content: "new source" } },
    },
  };
  expect(deploymentFormKey(edited, "Main")).not.toBe(
    deploymentFormKey(after, "Main")
  );
});
it("persists network mappings and round-trips them through workspace ZIP", async () => {
  const saved = await loadWorkspace("original");
  const ws = {
    ...updateLibraryAddress(workspace(), 11155111, ref, a),
    deploymentChainId: 11155111,
  };
  await saveWorkspace(ws, saved);
  expect((await loadWorkspace("ignored")).workspace.libraryLinks).toEqual(
    ws.libraryLinks
  );
  const backup = await importWorkspaceZip(await exportWorkspaceZip(ws));
  const restored = applyWorkspaceImport(
    { files: [], activeFileId: null, openFileIds: [] },
    backup,
    "restore"
  );
  expect(restored.libraryLinks).toEqual(ws.libraryLinks);
  expect(restored.deploymentChainId).toBe(11155111);
  expect(() => normalizeLibraryLinks({ "0": {} })).toThrow();
  expect(() =>
    normalizeCompilerSettings({
      ...settings,
      extras: { libraries: { "Math.sol": { Math: "not an address" } } },
    })
  ).toThrow();
});
it("retains linked settings and bytecode in immutable deployment snapshots", async () => {
  const current = build(updateLibraryAddress(workspace(), 1, ref, a), 1);
  const contract = current.result.contracts!["Main.sol:Main"];
  const record = await prepareDeployment({
    workspaceId: "default",
    build: current,
    contract,
    chainId: 1,
    account: a as `0x${string}`,
    data: `0x${contract.bytecode}${"0".repeat(64)}`,
    value: 0n,
    args: [0n],
  });
  const saved = await getDeploymentBuild(record.buildId);
  current.input.settings.extras!.libraries["Math.sol"].Math = b;
  expect((saved.input.settings as any).libraries["Math.sol"].Math).toBe(a);
  expect(saved.contract.bytecode).toBe(contract.bytecode);
});
it("offers previous deployments only for the same network, qualified library and source/settings", () => {
  const current = build(workspace(), 1);
  const saved = {
    contract: current.result.contracts!["Math.sol:Math"],
    input: standardJsonInput(sources, current.input.settings),
    settings: current.input.settings,
  } as any;
  const record = {
    chainId: 1,
    status: "success",
    address: a,
    sourcePath: "Math.sol",
    contractName: "Math",
  } as any;
  expect(reusableLibrary(record, saved, current, ref, 1)).toBe(true);
  expect(reusableLibrary(record, saved, current, ref, 11155111)).toBe(false);
  expect(
    reusableLibrary(
      { ...record, sourcePath: "Other.sol" },
      saved,
      current,
      ref,
      1
    )
  ).toBe(false);
  const changed = {
    ...current,
    input: {
      ...current.input,
      sources: { ...sources, "Math.sol": { content: "changed library" } },
    },
  };
  expect(reusableLibrary(record, saved, changed, ref, 1)).toBe(false);
});
