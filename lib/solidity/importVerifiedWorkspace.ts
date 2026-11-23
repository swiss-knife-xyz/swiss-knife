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
