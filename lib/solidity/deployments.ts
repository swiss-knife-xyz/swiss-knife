import { browserDatabase } from "@/lib/browser/database";
import {
  mergeVerificationProgress,
  type DeploymentVerifications,
} from "@/lib/verification/progress";
import type { VerificationProvider } from "@/lib/verification/source";
import type { Address, Hex, AbiParameter } from "viem";
import {
  decodeConstructorArguments,
  stringifyConstructorValues,
} from "./constructorArguments";
import type { CompilerBuild } from "@/app/solidity/compiler/useSolidityCompiler";
import type { CompiledContract } from "@/app/solidity/compiler/types";
import { standardJsonInput, type CompilerSettings } from "./settings";

export type DeploymentStatus =
  | "wallet"
  | "pending"
  | "success"
  | "reverted"
  | "unknown"
  | "rejected";
export type DeploymentRecord = {
  id: string;
  workspaceId: string;
  buildId: string;
  contractName: string;
  sourcePath: string;
  chainId: number;
  account?: Address;
  value?: string;
  data?: Hex;
  constructorInputs?: readonly AbiParameter[];
  constructorArgs: Hex;
  arguments: string;
  createdAt: number;
  updatedAt: number;
  revision: number;
  status: DeploymentStatus;
  hash?: Hex;
  address?: Address;
  error?: string;
  deletedAt?: number;
  verification?: DeploymentVerifications;
  imported?: { provider: VerificationProvider; sourceUrl: string };
};
export type DeploymentBuild = {
  id: string;
  workspaceId: string;
  entry: string;
  settings: CompilerSettings;
  input: ReturnType<typeof standardJsonInput>;
  output?: CompilerBuild["output"];
  contract: Pick<CompiledContract, "name" | "sourcePath"> &
    Partial<Pick<CompiledContract, "abi" | "bytecode" | "deployedBytecode">>;
};
export type DeploymentDraft = {
  workspaceId: string;
  build: CompilerBuild;
  contract: CompiledContract;
  chainId: number;
  account: Address;
  data: Hex;
  value: bigint;
  args: unknown;
};
export type DeploymentPatch = Pick<DeploymentRecord, "status"> &
  Partial<
    Pick<DeploymentRecord, "hash" | "address" | "error" | "verification">
  >;
const openDatabase = browserDatabase(
  "ethsh-solidity-deployments",
  1,
  (db) => {
    db.createObjectStore("builds", { keyPath: "id" });
    db.createObjectStore("deployments", { keyPath: "id" })
      .createIndex("workspaceId", "workspaceId");
  },
  "Close other Solidity tabs and retry saving deployment history."
);
export async function prepareDeployment(
  draft: DeploymentDraft
): Promise<DeploymentRecord> {
  const { build, contract, workspaceId } = draft;
  const artifact =
    build.result.contracts?.[`${contract.sourcePath}:${contract.name}`];
  if (
    build.input.workspaceId !== workspaceId ||
    build.result.error ||
    !artifact ||
    artifact.bytecode !== contract.bytecode ||
    !draft.data.startsWith(`0x${contract.bytecode}`)
  )
    throw new Error("Compile the current contract before deploying.");
  const input = standardJsonInput(build.input.sources, build.input.settings);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(
      JSON.stringify([
        workspaceId,
        build.input.settings.version,
        input,
        contract.sourcePath,
        contract.name,
      ])
    )
  );
  const buildId = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  const savedBuild: DeploymentBuild = structuredClone({
    id: buildId,
    workspaceId,
    entry: build.input.entry,
    settings: build.input.settings,
    input,
    output: build.output,
    contract: artifact,
  });
  const now = Date.now();
  const record: DeploymentRecord = {
    id: crypto.randomUUID(),
    workspaceId,
    buildId,
    contractName: contract.name,
    sourcePath: contract.sourcePath,
    chainId: draft.chainId,
    account: draft.account,
    value: draft.value.toString(),
    data: draft.data,
    constructorArgs: `0x${draft.data.slice(2 + contract.bytecode.length)}`,
    arguments: JSON.stringify(draft.args, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    ),
    createdAt: now,
    updatedAt: now,
    revision: 1,
    status: "wallet",
  };
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["builds", "deployments"], "readwrite");
    tx.oncomplete = () => resolve(record);
    tx.onabort = tx.onerror = () =>
      reject(
        tx.error ??
          new Error(
            "Couldn't save deployment history. No transaction was sent."
          )
      );
    const builds = tx.objectStore("builds");
    const request = builds.get(buildId);
    request.onsuccess = () => {
      if (!request.result) builds.add(savedBuild);
    };
    tx.objectStore("deployments").add(record);
  });
}
/** Save an already-deployed contract without inventing transaction/wallet data. */
export async function saveImportedDeployment(
  workspaceId: string,
  imported: import("./verifiedContract").VerifiedContract
): Promise<DeploymentRecord> {
  const { verifiedContractBackup } = await import("./verifiedContract");
  const { explorerUrl } = await import("@/lib/verification/source");
  const { getAddress } = await import("viem");
  const backup = verifiedContractBackup(imported.source);
  const sourcePath = backup.activeFile;
  const contractName = imported.source.contractName.slice(
    imported.source.contractName.lastIndexOf(":") + 1
  );
  const id = `imported-${workspaceId}`;
  const constructorArgs: Hex = `0x${imported.source.constructorArguments.replace(/^0x/, "")}`;
  const constructorInputs = imported.source.constructorAbi?.inputs;
  const decoded = constructorInputs
    ? decodeConstructorArguments(constructorInputs, constructorArgs)
    : undefined;
  const now = Date.now();
  const record: DeploymentRecord = {
    id,
    buildId: id,
    workspaceId,
    sourcePath,
    contractName,
    chainId: imported.chainId,
    address: getAddress(imported.address),
    status: "success",
    constructorArgs,
    ...(constructorInputs ? { constructorInputs } : {}),
    arguments: decoded
      ? stringifyConstructorValues(decoded)
      : imported.source.constructorArguments
        ? JSON.stringify({ encoded: constructorArgs })
        : "[]",
    createdAt: now,
    updatedAt: now,
    revision: 1,
    imported: {
      provider: imported.provider,
      sourceUrl: explorerUrl(
        imported.provider,
        String(imported.chainId),
        imported.address
      ),
    },
  };
  const build: DeploymentBuild = {
    id,
    workspaceId,
    entry: sourcePath,
    settings: backup.compilerSettings,
    input: JSON.parse(imported.source.sourceCode),
    // No local compiler output exists yet; only the verified target is known.
    contract: {
      name: contractName,
      sourcePath,
      ...(imported.source.constructorAbi
        ? { abi: [imported.source.constructorAbi] }
        : {}),
    },
  };
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["builds", "deployments"], "readwrite");
    tx.oncomplete = () => resolve(record);
    tx.onabort = tx.onerror = () =>
      reject(tx.error ?? new Error("Couldn't save the imported deployment."));
    tx.objectStore("builds").add(build);
    tx.objectStore("deployments").add(record);
  });
}
/** Roll back only a staged import whose workspace failed to be created. */
export async function discardImportedDeployment(workspaceId: string) {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(["builds", "deployments"], "readwrite");
    tx.oncomplete = () => resolve();
    tx.onabort = tx.onerror = () => reject(tx.error);
    const id = `imported-${workspaceId}`;
    const request = tx.objectStore("deployments").get(id);
    request.onsuccess = () => {
      if (
        request.result?.workspaceId === workspaceId &&
        request.result.imported
      ) {
        tx.objectStore("deployments").delete(id);
        tx.objectStore("builds").delete(id);
      }
    };
  });
}
export async function listDeployments(
  workspaceId: string,
  includeDeleted = false
): Promise<DeploymentRecord[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["deployments", "builds"], "readwrite");
    const store = tx.objectStore("deployments");
    let visible: DeploymentRecord[] = [];
    tx.oncomplete = () => resolve(visible);
    tx.onabort = tx.onerror = () => reject(tx.error);
    const request = store.index("workspaceId").getAll(workspaceId);
    request.onsuccess = () => {
      const records: DeploymentRecord[] = request.result;
      const rejected = records.filter(
        (record) => record.status === "rejected" && !record.hash
      );
      const remaining = records.filter((record) => !rejected.includes(record));
      for (const record of rejected) {
        store.delete(record.id);
        if (!remaining.some((item) => item.buildId === record.buildId))
          tx.objectStore("builds").delete(record.buildId);
      }
      visible = remaining
        .filter((record) => includeDeleted || !record.deletedAt)
        .sort((a, b) => b.createdAt - a.createdAt);
    };
  });
}
export async function getDeploymentBuild(id: string): Promise<DeploymentBuild> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction("builds").objectStore("builds").get(id);
    request.onsuccess = () =>
      request.result
        ? resolve(request.result)
        : reject(new Error("Saved deployment build is unavailable."));
    request.onerror = () => reject(request.error);
  });
}
export async function updateDeployment(
  id: string,
  patch: DeploymentPatch
): Promise<DeploymentRecord> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["deployments", "builds"], "readwrite"),
      store = tx.objectStore("deployments");
    let next: DeploymentRecord;
    let failure: Error | undefined;
    tx.oncomplete = () => resolve(next);
    tx.onabort = tx.onerror = () =>
      reject(
        failure ?? tx.error ?? new Error("Couldn't save deployment status.")
      );
    const request = store.get(id);
    request.onsuccess = () => {
      const current: DeploymentRecord | undefined = request.result;
      if (
        !current ||
        (current.hash &&
          patch.hash &&
          current.hash.toLowerCase() !== patch.hash.toLowerCase())
      ) {
        failure = new Error(
          "Deployment record changed. Check its transaction before continuing."
        );
        tx.abort();
        return;
      }
      // A late poll from another tab must never downgrade a confirmed receipt.
      const settled =
        current.status === "success" || current.status === "reverted";
      if (settled && !patch.verification) {
        next = current;
        return;
      }
      if (patch.hash && !/^0x[0-9a-fA-F]{64}$/.test(patch.hash)) {
        failure = new Error("Invalid deployment transaction hash.");
        tx.abort();
        return;
      }
      next = {
        ...current,
        ...(settled ? {} : patch),
        ...(patch.verification
          ? {
              verification: mergeVerificationProgress(
                current.verification,
                patch.verification
              ),
            }
          : {}),
        updatedAt: Date.now(),
        revision: current.revision + 1,
      };
      if (next.status === "rejected" && !next.hash) {
        store.delete(id);
        const siblings = store.index("workspaceId").getAll(current.workspaceId);
        siblings.onsuccess = () => {
          if (
            !siblings.result.some(
              (item: DeploymentRecord) => item.buildId === current.buildId
            )
          )
            tx.objectStore("builds").delete(current.buildId);
        };
      } else store.put(next);
    };
  });
}
async function setDeploymentDeleted(
  id: string,
  deleted: boolean
): Promise<DeploymentRecord> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("deployments", "readwrite"),
      store = tx.objectStore("deployments");
    let next: DeploymentRecord;
    tx.oncomplete = () => resolve(next);
    tx.onabort = tx.onerror = () =>
      reject(tx.error ?? new Error("Couldn't update deployment history."));
    const request = store.get(id);
    request.onsuccess = () => {
      const current: DeploymentRecord | undefined = request.result;
      if (!current) {
        tx.abort();
        return;
      }
      next = {
        ...current,
        deletedAt: deleted ? Date.now() : undefined,
        updatedAt: Date.now(),
        revision: current.revision + 1,
      };
      store.put(next);
    };
  });
}
export const removeDeployment = (id: string) => setDeploymentDeleted(id, true);
export const restoreDeployment = (id: string) =>
  setDeploymentDeleted(id, false);
export const deploymentStore = {
  prepare: prepareDeployment,
  list: listDeployments,
  update: updateDeployment,
  getBuild: getDeploymentBuild,
  remove: removeDeployment,
  restore: restoreDeployment,
};
export type DeploymentStore = typeof deploymentStore;

/** Copy an immutable imported snapshot, never the edited workspace or a newer local build. */
export async function copyImportedDeployment(workspaceId: string, original: DeploymentRecord, snapshot: DeploymentBuild) {
  if (!original.imported || !original.address || original.buildId !== snapshot.id || original.workspaceId !== snapshot.workspaceId || original.sourcePath !== snapshot.contract.sourcePath || original.contractName !== snapshot.contract.name)
    throw new Error("The original imported snapshot is unavailable.");
  const id = `imported-${workspaceId}`;
  const now = Date.now();
  const record: DeploymentRecord = {...original, id, buildId: id, workspaceId, createdAt: now, updatedAt: now, revision: 1};
  const build: DeploymentBuild = {...snapshot, id, workspaceId};
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(["builds", "deployments"], "readwrite");
    tx.oncomplete = () => resolve();
    tx.onabort = tx.onerror = () => reject(tx.error ?? new Error("Couldn't copy the original snapshot."));
    tx.objectStore("builds").add(build);
    tx.objectStore("deployments").add(record);
  });
}
