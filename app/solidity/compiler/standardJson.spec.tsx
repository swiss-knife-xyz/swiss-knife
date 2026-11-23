// @vitest-environment node
import { expect, it } from "vitest";
import { createRequire } from "node:module";
import { importStandardJson } from "@/lib/solidity/standardJson";
import {
  DEFAULT_COMPILER_SETTINGS as defaults,
  normalizeCompilerSettings,
  standardJsonInput,
} from "@/lib/solidity/settings";
import {
  applyWorkspaceImport,
  exportWorkspaceZip,
  importWorkspaceZip,
} from "@/lib/solidity/backup";
const input = {
  language: "Solidity",
  sources: {
    "Counter.sol": {
      content: "pragma solidity ^0.8.0; contract Counter {uint public value;}",
    },
  },
  settings: {
    optimizer: { enabled: true, runs: 1000, details: { yul: true } },
    evmVersion: "paris",
    viaIR: true,
    metadata: { bytecodeHash: "none" },
    libraries: {
      "Counter.sol": { L: "0x0000000000000000000000000000000000000001" },
    },
    outputSelection: { "*": { Counter: ["metadata"], "": ["ast"] } },
  },
};
it("imports inline files and preserves bytecode-affecting settings through compile and backup", async () => {
  const backup = importStandardJson(JSON.stringify(input));
  expect(backup.compilerSettings).toMatchObject({
    optimizer: true,
    runs: 1000,
    evmVersion: "paris",
    viaIR: true,
    version: defaults.version,
  });
  const workspace = applyWorkspaceImport(
    { files: [], openFileIds: [], activeFileId: null },
    backup,
    "restore"
  );
  const settings = normalizeCompilerSettings(workspace.compilerSettings);
  const restored = await importWorkspaceZip(
    await exportWorkspaceZip(workspace)
  );
  expect(restored.compilerSettings).toEqual(settings);
  const generated = standardJsonInput(input.sources, settings);
  expect(generated.settings.optimizer).toEqual(input.settings.optimizer);
  expect(generated.settings).toMatchObject({
    metadata: input.settings.metadata,
    libraries: input.settings.libraries,
  });
  expect(generated.settings.outputSelection["*"].Counter).toEqual([
    "metadata",
    "abi",
    "evm.bytecode",
    "evm.deployedBytecode",
  ]);
  expect(generated.settings.outputSelection["*"][""]).toEqual(["ast"]);
});
it("rejects unsupported or incomplete inputs instead of silently changing their meaning", () => {
  for (const value of [
    { language: "Yul", sources: {} },
    {
      ...input,
      sources: { "A.sol": { urls: ["https://example.test/A.sol"] } },
    },
    { ...input, sources: { "../A.sol": { content: "contract A{}" } } },
    {
      ...input,
      sources: { "A.sol": { content: "a" }, "a.sol": { content: "b" } },
    },
    { ...input, settings: { remappings: ["a=b"] } },
    { ...input, settings: { optimizer: { enabled: "yes" } } },
    { ...input, settings: { outputSelection: { "*": { "*": "abi" } } } },
    { ...input, settings: { modelChecker: { engine: "chc" } } },
    { ...input, settings: { optimizer: { runs: -1 } } },
  ])
    expect(() => importStandardJson(JSON.stringify(value))).toThrow();
  expect(() => importStandardJson("invalid")).toThrow("valid JSON");
});
it("keeps a chosen compiler version and leaves current settings alone when adding files", () => {
  const version = "soljson-v0.8.24+commit.e11b9ed9.js";
  const backup = importStandardJson(JSON.stringify(input), {
    ...defaults,
    version,
  });
  expect(backup.compilerSettings?.version).toBe(version);
  const workspace = {
    files: [],
    openFileIds: [],
    activeFileId: null,
    compilerSettings: defaults,
  };
  expect(
    applyWorkspaceImport(workspace, backup, "add").compilerSettings
  ).toEqual(defaults);
});

it("imports bundled mock-token sources with scoped OpenZeppelin dependencies and round-trips them in ZIP", async () => {
  const { readFileSync } = await import("node:fs");
  const { compilationSources } = await import("@/lib/solidity/compilation");
  const solc = createRequire(import.meta.url)("solc");
  const raw = readFileSync(
    new URL("../../../public/mock-tokens-standard-input.json", import.meta.url),
    "utf8"
  );
  const backup = importStandardJson(raw);
  const workspace = applyWorkspaceImport(
    { files: [], openFileIds: [], activeFileId: null },
    backup,
    "restore"
  );
  expect(
    workspace.files.some((file) => file.name.startsWith("@openzeppelin/"))
  ).toBe(true);
  const sources = compilationSources(
    workspace.files,
    "contracts/mocks/MockTokens.sol"
  );
  expect(Object.keys(sources)).toHaveLength(backup.files.length);
  const output = JSON.parse(
    solc.compile(
      JSON.stringify(
        standardJsonInput(
          sources,
          normalizeCompilerSettings(workspace.compilerSettings)
        )
      )
    )
  );
  expect(
    output.errors?.filter((error: any) => error.severity === "error") ?? []
  ).toEqual([]);
  expect(
    Object.keys(output.contracts["contracts/mocks/MockTokens.sol"])
  ).toEqual(expect.arrayContaining(["MockERC20", "MockERC721", "MockERC1155"]));
  const zipped = await importWorkspaceZip(await exportWorkspaceZip(workspace));
  expect(zipped.files).toEqual(backup.files);
  const colliding = applyWorkspaceImport(workspace, backup, "add");
  expect(
    colliding.files.some((file) =>
      file.name.startsWith("imported/@openzeppelin/")
    )
  ).toBe(true);
  const second = compilationSources(
    colliding.files,
    "imported/contracts/mocks/MockTokens.sol"
  );
  expect(Object.keys(second)).toHaveLength(backup.files.length);
});
it("keeps scoped package validation strict against traversal and malformed paths", async () => {
  const { validatePath } = await import("@/lib/solidity/paths");
  expect(
    validatePath("@openzeppelin/contracts/token/ERC20/ERC20.sol", true)
  ).toBe("@openzeppelin/contracts/token/ERC20/ERC20.sol");
  expect(validatePath("imported/@openzeppelin/contracts", false)).toBe(
    "imported/@openzeppelin/contracts"
  );
  for (const path of [
    "@/A.sol",
    "@scope/../A.sol",
    "@scope//A.sol",
    "@scope/./A.sol",
    "@scope\\A.sol",
    "https://example.test/A.sol",
    "@scope/@A.sol",
  ])
    expect(() => validatePath(path, true)).toThrow();
});
