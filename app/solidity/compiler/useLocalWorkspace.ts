"use client";
import { importVerifiedWorkspace } from "@/lib/solidity/importVerifiedWorkspace";
import type { VerifiedContract } from "@/lib/solidity/verifiedContract";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  loadWorkspace,
  saveWorkspace,
  listWorkspaces,
  createWorkspace,
  renameWorkspace,
  deleteWorkspace,
  WorkspaceConflictError,
  WorkspaceMissingError,
  type SavedWorkspace,
  type SolidityWorkspace,
  type WorkspaceSummary,
} from "@/lib/solidity/workspace";

function message(error: unknown, fallback: string) {
  return error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
    ? error.message
    : fallback;
}

export function useLocalWorkspace(initialCode: string) {
  const [workspace, setWorkspace] = useState<SolidityWorkspace | null>(null);
  const [activeWorkspace, setActiveWorkspace] =
    useState<WorkspaceSummary | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [status, setStatus] = useState<
    "loading" | "saved" | "saving" | "unsaved" | "error"
  >("loading");
  const [isChanging, setIsChanging] = useState(false);
  const [error, setError] = useState("");
  const saved = useRef<SavedWorkspace | null>(null);
  const latest = useRef<SolidityWorkspace | null>(null);
  const running = useRef<Promise<void> | null>(null);
  const mounted = useRef(false);
  const conflict = useRef(false);
  const changing = useRef(false);
  const generation = useRef(0);
  const saveError = useRef("");

  const refreshList = useCallback(async () => {
    const entries = await listWorkspaces();
    if (mounted.current) setWorkspaces(entries);
  }, []);
  const adopt = useCallback((loaded: SavedWorkspace) => {
    saved.current = loaded;
    latest.current = loaded.workspace;
    conflict.current = false;
    saveError.current = "";
    if (!mounted.current) return;
    setWorkspace(loaded.workspace);
    setActiveWorkspace({ id: loaded.id, name: loaded.name, ...(loaded.workspace.importedContract ? { importedContract: loaded.workspace.importedContract } : {}) });
    setStatus("saved");
    setError("");
    setWorkspaces((entries) =>
      [
        ...entries.filter((entry) => entry.id !== loaded.id),
        { id: loaded.id, name: loaded.name, ...(loaded.workspace.importedContract ? { importedContract: loaded.workspace.importedContract } : {}) },
      ].sort((a, b) => a.name.localeCompare(b.name))
    );
  }, []);
  const reload = useCallback(async () => {
    const requestGeneration = ++generation.current;
    setStatus("loading");
    setError("");
    try {
      await running.current;
      let loaded: SavedWorkspace;
      try {
        loaded = await loadWorkspace(initialCode, saved.current?.id);
      } catch (error) {
        if (!(error instanceof WorkspaceMissingError)) throw error;
        loaded = await loadWorkspace(initialCode);
      }
      if (!mounted.current || requestGeneration !== generation.current) return;
      adopt(loaded);
      await refreshList().catch(() => {});
    } catch (error) {
      if (!mounted.current || requestGeneration !== generation.current) return;
      setError(message(error, "Couldn't load local files."));
      setStatus("error");
    }
  }, [initialCode, adopt, refreshList]);

  const flush = useCallback(() => {
    if (running.current) return running.current;
    if (
      !saved.current ||
      !latest.current ||
      conflict.current ||
      saved.current.workspace === latest.current
    )
      return Promise.resolve();
    const requestGeneration = generation.current;
    const work = async () => {
      if (mounted.current) setStatus("saving");
      try {
        while (
          latest.current &&
          saved.current &&
          latest.current !== saved.current.workspace &&
          requestGeneration === generation.current
        )
          saved.current = await saveWorkspace(latest.current, saved.current);
        saveError.current = "";
        if (mounted.current && requestGeneration === generation.current) {
          setStatus("saved");
          setError("");
        }
      } catch (error) {
        conflict.current = error instanceof WorkspaceConflictError;
        saveError.current = message(error, "Couldn't save local files.");
        if (mounted.current && requestGeneration === generation.current) {
          setStatus("error");
          setError(saveError.current);
        }
      } finally {
        running.current = null;
      }
    };
    running.current = work();
    return running.current;
  }, []);

  const action = useCallback(
    async (operation: (current: SavedWorkspace) => Promise<SavedWorkspace>) => {
      if (changing.current || !saved.current)
        throw new Error("Wait for the workspace to finish loading.");
      changing.current = true;
      setIsChanging(true);
      try {
        await flush();
        if (conflict.current || latest.current !== saved.current.workspace)
          throw new Error(
            saveError.current || "Save the current workspace before switching."
          );
        const loaded = await operation(saved.current);
        generation.current++;
        adopt(loaded);
        await refreshList().catch(() => {});
      } catch (error) {
        if (error instanceof WorkspaceConflictError) {
          conflict.current = true;
          if (mounted.current) {
            setStatus("error");
            setError(error.message);
          }
        }
        throw error;
      } finally {
        changing.current = false;
        if (mounted.current) setIsChanging(false);
      }
    },
    [adopt, flush, refreshList]
  );
  const switchWorkspace = useCallback(
    async (id: string) => {
      if (saved.current?.id === id) return;
      await action(() => loadWorkspace(initialCode, id));
    },
    [action, initialCode]
  );
  const addWorkspace = useCallback(
    (name: string) => action(() => createWorkspace(name, initialCode)),
    [action, initialCode]
  );
  const importWorkspace = useCallback(
    (name: string, workspace: SolidityWorkspace) =>
      action(() => createWorkspace(name, initialCode, workspace)),
    [action, initialCode]
  );
  const importVerifiedContract = useCallback(
    (name: string, workspace: SolidityWorkspace, contract: VerifiedContract) =>
      action(() =>
        importVerifiedWorkspace(name, initialCode, workspace, contract)
      ),
    [action, initialCode]
  );
  const changeName = useCallback(
    (name: string) => action((current) => renameWorkspace(current, name)),
    [action]
  );
  const removeWorkspace = useCallback(
    () =>
      action(async (current) => {
        await deleteWorkspace(current);
        return loadWorkspace(initialCode);
      }),
    [action, initialCode]
  );

  useEffect(() => {
    mounted.current = true;
    // Effect replay during Fast Refresh must not reload over unsaved edits.
    // Explicit reload remains available for conflict recovery.
    if (!saved.current) void reload();
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (latest.current && latest.current !== saved.current?.workspace) {
        event.preventDefault();
        event.returnValue = "";
        void flush();
      }
    };
    const onHidden = () => {
      if (document.visibilityState === "hidden") void flush();
      else void refreshList().catch(() => {});
    };
    const onFocus = () => {
      void refreshList().catch(() => {});
    };
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      mounted.current = false;
      void flush();
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onHidden);
    };
  }, [reload, flush, refreshList]);

  const update = useCallback(
    (
      edit: (current: SolidityWorkspace) => SolidityWorkspace,
      expectedWorkspaceId?: string
    ) => {
      const current = latest.current;
      if (
        !current ||
        changing.current ||
        (expectedWorkspaceId && expectedWorkspaceId !== saved.current?.id)
      )
        return;
      const next = edit(current);
      if (next === current) return;
      latest.current = next;
      setWorkspace(next);
      if (!conflict.current) setStatus("unsaved");
    },
    []
  );
  useEffect(() => {
    if (!workspace || saved.current?.workspace === workspace) return;
    const timer = setTimeout(() => {
      void flush();
    }, 400);
    return () => clearTimeout(timer);
  }, [workspace, flush]);

  return {
    workspace,
    activeWorkspace,
    workspaces,
    isChanging,
    switchWorkspace,
    addWorkspace,
    importWorkspace,
    importVerifiedContract,
    changeName,
    removeWorkspace,
    update,
    status,
    error,
    flush,
    reload,
    hasConflict: conflict.current,
  };
}
