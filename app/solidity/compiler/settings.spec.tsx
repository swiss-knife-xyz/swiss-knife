// @vitest-environment node

import "fake-indexeddb/auto";
import { expect, it, vi } from "vitest";
import {
  DEFAULT_COMPILER_SETTINGS as defaults,
  normalizeCompilerSettings,
  standardJsonInput,
  evmTargets,
} from "@/lib/solidity/settings";
import {
  exportWorkspaceZip,
  importWorkspaceZip,
  applyWorkspaceImport,
} from "@/lib/solidity/backup";

it("validates settings and only passes explicitly selected compiler options", () => {
  expect(normalizeCompilerSettings()).toEqual(defaults);
  for (const runs of [-1, 0.5, NaN, 4294967296])
    expect(() => normalizeCompilerSettings({ runs })).toThrow();
  expect(() =>
    normalizeCompilerSettings({ version: "https://evil.test/compiler.js" })
  ).toThrow();
  expect(() =>
    normalizeCompilerSettings({
      version: "soljson-v0.5.0+commit.1d4f565a.js",
      viaIR: true,
    })
  ).toThrow();
  expect(() =>
    normalizeCompilerSettings({
      version: "soljson-v0.8.19+commit.7dd6d404.js",
      evmVersion: "shanghai",
    })
  ).toThrow();
  expect(evmTargets(defaults.version)).toContain("prague");
  expect(evmTargets(defaults.version)).not.toContain("osaka");
  expect(standardJsonInput({}, defaults).settings).not.toHaveProperty(
    "evmVersion"
  );
  expect(standardJsonInput({}, defaults).settings).not.toHaveProperty("viaIR");
});
it("persists per-workspace settings and preserves them in ZIP backups", async () => {
  const { IDBFactory } = await import("fake-indexeddb");
  vi.resetModules();
  vi.stubGlobal("indexedDB", new IDBFactory());
  try {
    const repo = await import("@/lib/solidity/workspace");
    const first = await repo.loadWorkspace("contract C {}");
    const settings = {
      ...defaults,
      optimizer: true,
      runs: 1000,
      evmVersion: "paris",
      viaIR: true,
    };
    const workspace = { ...first.workspace, compilerSettings: settings };
    await repo.saveWorkspace(workspace, first);
    expect(
      (await repo.loadWorkspace("ignored")).workspace.compilerSettings
    ).toEqual(settings);
    const other = await repo.createWorkspace("Other", "contract D {}");
    expect(other.workspace.compilerSettings).toBeUndefined();
    const backup = await importWorkspaceZip(
      await exportWorkspaceZip(workspace)
    );
    expect(backup.compilerSettings).toEqual(settings);
    expect(
      applyWorkspaceImport(other.workspace, backup, "restore").compilerSettings
    ).toEqual(settings);
    expect(
      applyWorkspaceImport(other.workspace, backup, "add").compilerSettings
    ).toBeUndefined();
  } finally {
    vi.unstubAllGlobals();
  }
});
