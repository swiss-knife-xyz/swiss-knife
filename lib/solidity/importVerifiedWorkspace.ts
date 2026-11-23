import {
  createWorkspace,
  validateWorkspaceName,
  type SolidityWorkspace,
} from "./workspace";
import {
  saveImportedDeployment,
  discardImportedDeployment,
} from "./deployments";
import type { VerifiedContract } from "./verifiedContract";

/** Both databases must save before the hook adopts the new workspace. */
export async function importVerifiedWorkspace(
  name: string,
  initialCode: string,
  workspace: SolidityWorkspace,
  contract: VerifiedContract
) {
  validateWorkspaceName(name);
  const id = crypto.randomUUID();
  await saveImportedDeployment(id, contract);
  try {
    return await createWorkspace(
      name,
      initialCode,
      {
        ...workspace,
        importedContract: {
          address: contract.address,
          chainId: contract.chainId,
        },
      },
      id
    );
  } catch (error) {
    // An interrupted cleanup leaves only an unreachable staged record, never a
    // visible half-imported workspace or a change to the previous workspace.
    await discardImportedDeployment(id).catch(() => {});
    throw error;
  }
}

/** Open the original without fetching again or replacing the user's local edits. */
export async function openOriginalImportedWorkspace(
  name: string,
  initialCode: string,
  record: import("./deployments").DeploymentRecord,
  snapshot: import("./deployments").DeploymentBuild
) {
  const { copyImportedDeployment } = await import("./deployments");
  const { importStandardJson } = await import("./standardJson");
  const { applyWorkspaceImport } = await import("./backup");
  validateWorkspaceName(name);
  const backup = importStandardJson(
    JSON.stringify(snapshot.input),
    snapshot.settings
  );
  const workspace = applyWorkspaceImport(
    { files: [], folders: [], openFileIds: [], activeFileId: null },
    {
      ...backup,
      compilerSettings: snapshot.settings,
      activeFile: snapshot.entry,
      openFiles: [snapshot.entry],
    },
    "restore"
  );
  const id = crypto.randomUUID();
  await copyImportedDeployment(id, record, snapshot);
  try {
    return await createWorkspace(
      name,
      initialCode,
      {
        ...workspace,
        importedContract: { address: record.address!, chainId: record.chainId },
      },
      id
    );
  } catch (error) {
    await discardImportedDeployment(id).catch(() => {});
    throw error;
  }
}
