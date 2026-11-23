import React from "react";
import { webcrypto } from "node:crypto";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import type { VerifiedContract } from "@/lib/solidity/verifiedContract";
const address = `0x${"12".repeat(20)}`;
const contract: VerifiedContract = {
  chainId: 1,
  address,
  provider: "etherscan",
  source: {
    compilerVersion: "v0.8.30+commit.73712a01",
    contractName: "Token.sol:Token",
    files: ["Token.sol"],
    constructorArguments: "",
    licenseType: "3",
    partial: false,
    sourceCode: JSON.stringify({
      language: "Solidity",
      sources: {
        "Token.sol": { content: "pragma solidity ^0.8.20; contract Token {}" },
      },
      settings: { optimizer: { enabled: true, runs: 500 } },
    }),
  },
};
beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal("indexedDB", new IDBFactory());
  vi.stubGlobal("crypto", webcrypto);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
it("creates a workspace with its imported deployment and immutable source snapshot before switching", async () => {
  const workspaces = await import("@/lib/solidity/workspace");
  const original = await workspaces.loadWorkspace("contract Original {}");
  const { verifiedContractWorkspace } = await import(
    "@/lib/solidity/verifiedContract"
  );
  const { importVerifiedWorkspace } = await import(
    "@/lib/solidity/importVerifiedWorkspace"
  );
  const deployments = await import("@/lib/solidity/deployments");
  const workspace = verifiedContractWorkspace(contract.source);
  const saved = await importVerifiedWorkspace(
    "Imported Token",
    "",
    workspace,
    contract
  );
  const [entry] = await deployments.listDeployments(saved.id);
  expect(
    (await workspaces.listWorkspaces()).find((item) => item.id === saved.id)
      ?.importedContract
  ).toEqual({ address, chainId: 1 });
  expect(
    (await workspaces.loadWorkspace("", saved.id)).workspace.importedContract
  ).toEqual({ address, chainId: 1 });
  expect(entry).toMatchObject({
    workspaceId: saved.id,
    address,
    chainId: 1,
    status: "success",
    contractName: "Token",
    sourcePath: "Token.sol",
    imported: { provider: "etherscan" },
  });
  expect(entry.hash).toBeUndefined();
  expect(entry.account).toBeUndefined();
  expect(entry.data).toBeUndefined();
  expect(entry.value).toBeUndefined();
  workspace.files[0].content = "edited after import";
  const build = await deployments.getDeploymentBuild(entry.buildId);
  expect(build.input.sources["Token.sol"].content).toContain("contract Token");
  expect(build.settings.runs).toBe(500);
  expect(build.output).toBeUndefined();
  expect(
    (await workspaces.loadWorkspace("", original.id)).workspace
  ).toMatchObject(original.workspace);
  expect(await deployments.listDeployments(original.id)).toEqual([]);
  expect(
    (await deployments.listDeployments(saved.id))[0].imported?.sourceUrl
  ).toBe(`https://etherscan.io/address/${address}#code`);
});
it("restores the imported entry without polling receipts or requesting a wallet", async () => {
  const { loadWorkspace } = await import("@/lib/solidity/workspace");
  await loadWorkspace("contract Original {}");
  const { verifiedContractWorkspace } = await import(
    "@/lib/solidity/verifiedContract"
  );
  const { importVerifiedWorkspace } = await import(
    "@/lib/solidity/importVerifiedWorkspace"
  );
  const { deploymentStore } = await import("@/lib/solidity/deployments");
  const { useDeploymentHistory } = await import("./useDeploymentHistory");
  const saved = await importVerifiedWorkspace(
    "Token",
    "",
    verifiedContractWorkspace(contract.source),
    contract
  );
  const receipt = vi.fn();
  const hook = renderHook(
    () => useDeploymentHistory(saved.id, deploymentStore, receipt),
    { wrapper: React.StrictMode }
  );
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
  expect(hook.result.current.records).toHaveLength(1);
  expect(hook.result.current.records[0].address).toBe(address);
  expect(receipt).not.toHaveBeenCalled();
});
it("rolls back staged history if workspace creation fails without replacing current files", async () => {
  const workspaces = await import("@/lib/solidity/workspace");
  const original = await workspaces.loadWorkspace("contract Original {}");
  const { verifiedContractWorkspace } = await import(
    "@/lib/solidity/verifiedContract"
  );
  const { importVerifiedWorkspace } = await import(
    "@/lib/solidity/importVerifiedWorkspace"
  );
  const deployments = await import("@/lib/solidity/deployments");
  const id = webcrypto.randomUUID();
  vi.spyOn(crypto, "randomUUID").mockReturnValue(id);
  await expect(
    importVerifiedWorkspace(
      original.name,
      "",
      verifiedContractWorkspace(contract.source),
      contract
    )
  ).rejects.toThrow(/name already exists/);
  expect(await deployments.listDeployments(id, true)).toEqual([]);
  await expect(
    deployments.getDeploymentBuild(`imported-${id}`)
  ).rejects.toThrow();
  expect(await workspaces.listWorkspaces()).toHaveLength(1);
  expect(
    (await workspaces.loadWorkspace("", original.id)).workspace
  ).toMatchObject(original.workspace);
});
it("never creates a workspace when saving its deployment fails", async () => {
  const workspaces = await import("@/lib/solidity/workspace");
  await workspaces.loadWorkspace("contract Original {}");
  const deployments = await import("@/lib/solidity/deployments");
  vi.spyOn(deployments, "saveImportedDeployment").mockRejectedValueOnce(
    new Error("Storage full")
  );
  const { verifiedContractWorkspace } = await import(
    "@/lib/solidity/verifiedContract"
  );
  const { importVerifiedWorkspace } = await import(
    "@/lib/solidity/importVerifiedWorkspace"
  );
  await expect(
    importVerifiedWorkspace(
      "Token",
      "",
      verifiedContractWorkspace(contract.source),
      contract
    )
  ).rejects.toThrow("Storage full");
  expect(await workspaces.listWorkspaces()).toHaveLength(1);
});
it("persists decoded imported constructor values and their verified ABI without losing uint precision", async () => {
  const { encodeAbiParameters } = await import("viem");
  const { saveImportedDeployment, getDeploymentBuild, listDeployments } =
    await import("@/lib/solidity/deployments");
  const inputs = [
    { name: "amount", type: "uint256" },
    { name: "owner", type: "address" },
  ] as const;
  const amount = 2n ** 255n;
  const constructorArguments = encodeAbiParameters(inputs, [
    amount,
    address as `0x${string}`,
  ]).slice(2);
  const source = {
    ...contract.source,
    constructorArguments,
    constructorAbi: {
      type: "constructor",
      stateMutability: "nonpayable",
      inputs,
    } as const,
  };
  const entry = await saveImportedDeployment("imported-test", {
    ...contract,
    source,
  });
  expect(JSON.parse(entry.arguments)).toEqual([amount.toString(), address]);
  expect(entry.constructorInputs).toEqual(inputs);
  expect((await getDeploymentBuild(entry.buildId)).contract.abi).toEqual([
    source.constructorAbi,
  ]);
  expect((await listDeployments("imported-test"))[0].constructorInputs).toEqual(
    inputs
  );
});
