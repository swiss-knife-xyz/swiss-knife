"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  mergeVerificationProgress,
  type StoredVerificationProgress,
} from "@/lib/verification/progress";
import { getPublicClient } from "@/lib/publicClient";
import {
  deploymentStore,
  type DeploymentDraft,
  type DeploymentPatch,
  type DeploymentRecord,
  type DeploymentStore,
} from "@/lib/solidity/deployments";
import type { Address, Hex } from "viem";
export type ReceiptLookup = (
  chainId: number,
  hash: Hex
) => Promise<{
  status: "success" | "reverted";
  contractAddress: Address | null;
}>;
const lookupReceipt: ReceiptLookup = async (chainId, hash) => {
  const receipt = await getPublicClient(chainId, {
    timeout: 10000,
  }).getTransactionReceipt({ hash });
  return {
    status: receipt.status,
    contractAddress: receipt.contractAddress ?? null,
  };
};
const message = (error: unknown) =>
  error instanceof Error ? error.message : "Couldn't save deployment history.";
// Keep a broadcast hash recoverable across client-side navigation if IDB fails.
// This buffer contains no wallet credentials and is cleared after a successful save.
const unsavedRecords = new Map<string, DeploymentRecord>();
const protectUnsavedHistory = (event: BeforeUnloadEvent) => {
  if (unsavedRecords.size) {
    event.preventDefault();
    event.returnValue = "";
  }
};
function protectRecoveryBuffer() {
  window.removeEventListener("beforeunload", protectUnsavedHistory);
  if (unsavedRecords.size)
    window.addEventListener("beforeunload", protectUnsavedHistory);
}
export function useDeploymentHistory(
  workspaceId?: string,
  store: DeploymentStore = deploymentStore,
  receipt: ReceiptLookup = lookupReceipt
) {
  const [records, setRecords] = useState<DeploymentRecord[]>([]);
  const [activeId, setActiveId] = useState<string>();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(
    unsavedRecords.size ? "The latest deployment status is not saved." : ""
  );
  const [dirtyCount, setDirtyCount] = useState(unsavedRecords.size);
  const dirty = useRef(unsavedRecords);
  const latest = useRef({ workspaceId, mounted: false });
  latest.current.workspaceId = workspaceId;
  const known = useRef(new Map(unsavedRecords));
  const awaitingWallet = useRef(new Set<string>());
  const polls = useRef(new Map<string, () => void>());
  const publish = useCallback((record: DeploymentRecord) => {
    const previous = known.current.get(record.id);
    if (previous && previous.revision > record.revision) return;
    known.current.set(record.id, record);
    if (
      latest.current.mounted &&
      latest.current.workspaceId === record.workspaceId
    )
      setRecords((current) =>
        [record, ...current.filter((item) => item.id !== record.id)].sort(
          (a, b) => b.createdAt - a.createdAt
        )
      );
  }, []);
  const refresh = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const startedAt = Date.now();
      const loaded = await store.list(workspaceId, true);
      if (!latest.current.mounted || latest.current.workspaceId !== workspaceId)
        return;
      const ids = new Set(loaded.map((record) => record.id));
      setRecords((current) =>
        current.filter(
          (record) =>
            ids.has(record.id) ||
            dirty.current.has(record.id) ||
            record.createdAt >= startedAt
        )
      );
      for (const record of loaded) {
        const existing =
          dirty.current.get(record.id) ?? known.current.get(record.id);
        publish(
          existing && existing.revision > record.revision ? existing : record
        );
      }
      setReady(true);
      if (!dirty.current.size) setError("");
    } catch (error) {
      if (latest.current.mounted && latest.current.workspaceId === workspaceId)
        setError(message(error));
    }
  }, [workspaceId, store, publish]);
  useEffect(() => {
    latest.current.mounted = true;
    setRecords([]);
    setReady(false);
    if (!dirty.current.size) setError("");
    void refresh();
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty.current.size || awaitingWallet.current.size) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("focus", refresh);
    return () => {
      latest.current.mounted = false;
      for (const stop of polls.current.values()) stop();
      polls.current.clear();
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);
  const prepare = useCallback(
    async (draft: Omit<DeploymentDraft, "workspaceId">) => {
      if (!workspaceId || !ready)
        throw new Error(
          "Wait for deployment history to load before deploying."
        );
      const record = await store.prepare({ ...draft, workspaceId });
      awaitingWallet.current.add(record.id);
      publish(record);
      if (latest.current.mounted && latest.current.workspaceId === workspaceId)
        setActiveId(record.id);
      return record;
    },
    [workspaceId, ready, store, publish]
  );
  const update = useCallback(
    async (id: string, patch: DeploymentPatch) => {
      awaitingWallet.current.delete(id);
      const current = known.current.get(id);
      if (!current) throw new Error("Deployment record is unavailable.");
      const optimistic = {
        ...current,
        ...patch,
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
      if (optimistic.status === "rejected" && !optimistic.hash) {
        // No broadcast occurred: discard the attempt without treating cleanup
        // failure as an unsaved transaction that would lock the workspace.
        dirty.current.delete(id);
        protectRecoveryBuffer();
        publish(optimistic);
        if (latest.current.mounted) setDirtyCount(dirty.current.size);
        try {
          return await store.update(id, {
            status: "rejected",
            error: optimistic.error,
          });
        } catch (error) {
          if (latest.current.mounted) setError(message(error));
          throw error;
        }
      }
      dirty.current.set(id, optimistic);
      protectRecoveryBuffer();
      publish(optimistic);
      if (latest.current.mounted) setDirtyCount(dirty.current.size);
      try {
        const saved = await store.update(id, {
          status: optimistic.status,
          hash: optimistic.hash,
          address: optimistic.address,
          error: optimistic.error,
          ...(optimistic.verification
            ? { verification: optimistic.verification }
            : {}),
        });
        if (dirty.current.get(id) === optimistic) dirty.current.delete(id);
        protectRecoveryBuffer();
        // The database serializes updates and enforces terminal receipt states.
        if (!dirty.current.has(id)) {
          known.current.set(id, saved);
          publish(saved);
        }
        if (latest.current.mounted) {
          setDirtyCount(dirty.current.size);
          if (!dirty.current.size) setError("");
        }
        return saved;
      } catch (error) {
        if (latest.current.mounted) setError(message(error));
        throw error;
      }
    },
    [store, publish]
  );
  useEffect(() => {
    if (!ready) return;
    const pending = new Set(
      records
        .filter(
          (record) =>
            record.workspaceId === workspaceId &&
            record.status === "pending" &&
            (!record.deletedAt || record.id === activeId) &&
            record.hash
        )
        .map((record) => record.id)
    );
    for (const [id, stop] of polls.current)
      if (!pending.has(id)) {
        stop();
        polls.current.delete(id);
      }
    for (const record of records) {
      if (!pending.has(record.id) || polls.current.has(record.id)) continue;
      let cancelled = false,
        attempts = 0,
        timer: ReturnType<typeof setTimeout> | undefined;
      polls.current.set(record.id, () => {
        cancelled = true;
        clearTimeout(timer);
      });
      const poll = async () => {
        try {
          const result = await receipt(record.chainId, record.hash!);
          if (cancelled) return;
          await update(record.id, {
            status: result.status,
            address: result.contractAddress ?? undefined,
            error: undefined,
          });
        } catch {
          if (cancelled) return;
          if (++attempts >= 90) {
            void update(record.id, {
              status: "unknown",
              error:
                "Confirmation unavailable. Check the transaction explorer.",
            }).catch(() => {});
            return;
          }
          timer = setTimeout(poll, 4000);
        }
      };
      void poll();
    }
  }, [records, workspaceId, ready, receipt, update, activeId]);
  const saveVerification = useCallback(
    (
      id: string,
      provider: "sourcify" | "etherscan",
      progress: StoredVerificationProgress
    ) => {
      const record = known.current.get(id);
      if (!record || record.status !== "success")
        return Promise.reject(new Error("Deployment is not confirmed."));
      return update(id, {
        status: record.status,
        verification: { [provider]: progress },
      }).then(() => {});
    },
    [update]
  );
  const remove = useCallback(
    async (id: string) => {
      // Preserve the journal under a tombstone so an outstanding wallet/poll cannot
      // resurrect a removed entry; Undo can restore the same immutable build.
      const unsaved = dirty.current.get(id);
      if (unsaved)
        await update(id, {
          status: unsaved.status,
          hash: unsaved.hash,
          address: unsaved.address,
          error: unsaved.error,
          ...(unsaved.verification
            ? { verification: unsaved.verification }
            : {}),
        });
      const saved = await store.remove(id);
      dirty.current.delete(id);
      protectRecoveryBuffer();
      known.current.set(id, saved);
      publish(saved);
      if (latest.current.mounted) {
        setDirtyCount(dirty.current.size);
        if (!dirty.current.size) setError("");
      }
    },
    [store, publish, update]
  );
  const restore = useCallback(
    async (id: string) => {
      const saved = await store.restore(id);
      known.current.set(id, saved);
      publish(saved);
    },
    [store, publish]
  );
  const retrySaving = useCallback(async () => {
    for (const record of [...dirty.current.values()]) {
      try {
        await update(record.id, {
          status: record.status,
          hash: record.hash,
          address: record.address,
          error: record.error,
          ...(record.verification ? { verification: record.verification } : {}),
        });
      } catch {}
    }
  }, [update]);
  return {
    activeId,
    workspaceId,
    recoveryRecords: [...dirty.current.values()].filter(
      (record) =>
        record.workspaceId !== workspaceId &&
        !record.deletedAt &&
        record.status !== "rejected"
    ),
    records: records.filter(
      (record) =>
        record.workspaceId === workspaceId &&
        !record.deletedAt &&
        record.status !== "rejected"
    ),
    ready,
    error,
    hasUnsaved: dirtyCount > 0,
    prepare,
    update,
    refresh,
    retrySaving,
    getBuild: store.getBuild,
    saveVerification,
    getRecord: (id: string) => known.current.get(id),
    remove,
    restore,
  };
}
export type DeploymentHistoryController = ReturnType<
  typeof useDeploymentHistory
>;
