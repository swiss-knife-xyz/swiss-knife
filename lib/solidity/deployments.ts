import {
  mergeVerificationProgress,
  type DeploymentVerifications,
} from "@/lib/verification/progress";
import type { Address, Hex } from "viem";
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
  account: Address;
  value: string;
  data: Hex;
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
};
export type DeploymentBuild = {
  id: string;
  workspaceId: string;
  entry: string;
  settings: CompilerSettings;
  input: ReturnType<typeof standardJsonInput>;
  output?: CompilerBuild["output"];
  contract: CompiledContract;
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
let database: Promise<IDBDatabase> | undefined;
function openDatabase() {
  if (!database) {
    database = new Promise((resolve, reject) => {
      const request = indexedDB.open("ethsh-solidity-deployments", 1);
      let blocked = false;
      request.onupgradeneeded = () => {
        request.result.createObjectStore("builds", { keyPath: "id" });
        request.result
          .createObjectStore("deployments", { keyPath: "id" })
          .createIndex("workspaceId", "workspaceId");
      };
      request.onerror = () => {
        database = undefined;
        reject(request.error);
      };
      request.onblocked = () => {
        blocked = true;
        database = undefined;
        reject(
          new Error(
            "Close other Solidity tabs and retry saving deployment history."
          )
        );
      };
      request.onsuccess = () => {
        const db = request.result;
        if (blocked) {
          db.close();
          return;
        }
        db.onversionchange = () => {
          db.close();
          database = undefined;
        };
        resolve(db);
      };
    });
  }
  return database;
}
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
