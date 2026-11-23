"use client";
import { CompilationCache } from "./compilationCache";
import { dependencyCompilerSettings } from "@/lib/solidity/dependencySettings";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { compilationSources } from "@/lib/solidity/compilation";
import type { SolidityWorkspace, SolidityFile } from "@/lib/solidity/workspace";
import type { CompiledContract, CompileResult, WorkerMessage } from "./types";

import {
  standardJsonInput,
  type CompilerSettings,
} from "@/lib/solidity/settings";

export const AUTO_COMPILE_DELAY = 750;
export type CompilerTarget = {
  key: string;
  workspaceId: string;
  entry: string;
  entryId: string;
  files: SolidityFile[];
  settings: CompilerSettings;
};
type Target = CompilerTarget;
type Input = Target & {
  sources: Record<string, { content: string }>;
  fingerprint: string;
};
export type CompilerBuild = {
  input: Input;
  result: CompileResult;
  output?: WorkerMessage["output"];
};
export function compileResult(data: WorkerMessage): CompileResult {
  if (!data.success || !data.output)
    return { error: data.error || "Compilation failed." };
  const diagnostics =
    data.output.errors?.filter((item) => item.severity === "error") ?? [];
  const warnings =
    data.output.errors?.filter((item) => item.severity === "warning") ?? [];
  if (diagnostics.length)
    return {
      diagnostics,
      warnings,
      error: diagnostics.map((item) => item.formattedMessage).join("\n\n"),
    };
  const contracts: Record<string, CompiledContract> = {};
  for (const [sourcePath, outputs] of Object.entries(
    data.output.contracts ?? {}
  )) {
    for (const [name, contract] of Object.entries(outputs))
      contracts[`${sourcePath}:${name}`] = {
        sourcePath,
        name,
        abi: contract.abi,
        bytecode: contract.evm.bytecode.object,
        deployedBytecode: contract.evm.deployedBytecode.object,
      };
  }
  return { contracts, warnings };
}
export function useSolidityCompiler({
  workspaceId,
  workspace,
  paused,
  autoCompile = true,
}: {
  workspaceId?: string;
  workspace: SolidityWorkspace | null;
  paused: boolean;
  autoCompile?: boolean;
}) {
  const generation = useRef(0);
  const settings = useMemo(
    () =>
      dependencyCompilerSettings(
        workspace?.compilerSettings,
        workspace?.dependencies
      ),
    [workspace?.compilerSettings, workspace?.dependencies]
  );
  const input = useMemo<Target | null>(() => {
    const entry = workspace?.files.find(
      (file) => file.id === workspace.activeFileId
    );
    if (!entry || !workspaceId) return null;
    // Only source references change while typing. Scan imports and serialize
    // the graph after the debounce, never in the per-keystroke render path.
    return {
      workspaceId,
      entry: entry.name,
      entryId: entry.id,
      files: workspace!.files,
      settings,
      key: `${workspaceId}:${++generation.current}`,
    };
  }, [workspace?.files, workspace?.activeFileId, workspaceId, settings]);
  const latest = useRef({ input, paused });
  latest.current = { input, paused };
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  const [error, setError] = useState("");
  const [isCompiling, setIsCompiling] = useState(false);
  const [build, setBuild] = useState<CompilerBuild | null>(null);
  const [attempt, setAttempt] = useState(0);
  const worker = useRef<Worker | null>(null);
  const ready = useRef(false);
  const running = useRef<{ id: number; input: Input } | null>(null);
  const queued = useRef<{ input: Target; due: number; force?: boolean } | null>(
    null
  );
  const cache = useRef(new CompilationCache());
  const [cacheRevision, setCacheRevision] = useState(0);
  const cachedBuild = useMemo(
    () => (!paused && input ? cache.current.find(input) : null),
    [input, paused, cacheRevision]
  );
  const sequence = useRef(0);
  const finished = useRef<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watchdog = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearDebounce = useCallback(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = null;
  }, []);
  const clearWatchdog = useCallback(() => {
    if (watchdog.current) clearTimeout(watchdog.current);
    watchdog.current = null;
  }, []);
  const fail = useCallback(
    (message: string) => {
      clearDebounce();
      clearWatchdog();
      ready.current = false;
      queued.current = null;
      running.current = null;
      worker.current?.terminate();
      worker.current = null;
      setIsCompiling(false);
      setState("failed");
      setError(message);
    },
    [clearDebounce, clearWatchdog]
  );
  const pump = useCallback(() => {
    clearDebounce();
    const next = queued.current;
    if (
      !next ||
      !ready.current ||
      !worker.current ||
      running.current ||
      latest.current.paused
    )
      return;
    if (next.input.key !== latest.current.input?.key) {
      queued.current = null;
      return;
    }
    const wait = next.due - Date.now();
    if (wait > 0) {
      debounce.current = setTimeout(() => pump(), wait);
      return;
    }
    queued.current = null;
    const sources = compilationSources(
      next.input.files,
      next.input.entry,
      next.input.settings.extras?.remappings
    );
    const prepared: Input = {
      ...next.input,
      sources,
      fingerprint: JSON.stringify([
        next.input.workspaceId,
        next.input.entryId,
        next.input.settings,
        sources,
      ]),
    };
    const cached = !next.force
      ? cache.current.get(prepared.fingerprint)
      : undefined;
    if (cached) {
      cache.current.touch(cached);
      finished.current = prepared.key;
      setBuild({ ...cached, input: prepared });
      return;
    }
    const id = ++sequence.current;
    running.current = { id, input: prepared };
    setIsCompiling(true);
    watchdog.current = setTimeout(
      () => fail("Compilation timed out. Reload the compiler to try again."),
      30000
    );
    worker.current.postMessage({
      id,
      sources,
      input: standardJsonInput(sources, prepared.settings),
    });
  }, [clearDebounce, fail]);
  useEffect(() => {
    setState("loading");
    setError("");
    ready.current = false;
    setIsCompiling(false);
    finished.current = null;
    let current: Worker;
    try {
      current = new Worker(
        `/worker/solc.worker.js?version=${encodeURIComponent(settings.version)}`
      );
      worker.current = current;
    } catch {
      fail("Couldn't start the compiler. Try again.");
      return;
    }
    watchdog.current = setTimeout(
      () => fail("Compiler loading timed out. Try again."),
      45000
    );
    current.onmessage = ({ data }: MessageEvent<WorkerMessage>) => {
      if (worker.current !== current) return;
      if (data.type === "load-error") {
        fail(data.error || "Couldn’t load this compiler. Try again.");
        return;
      }
      if (data.type === "ready") {
        clearWatchdog();
        ready.current = true;
        setState("ready");
        return;
      }
      const completed = running.current;
      if (!completed || data.id !== completed.id) return;
      clearWatchdog();
      running.current = null;
      setIsCompiling(false);
      const completedBuild = {
        input: completed.input,
        result: compileResult(data),
        output: data.output,
      };
      if (data.success && data.output) {
        cache.current.remember(completedBuild);
      } else {
        cache.current.forget(completed.input.fingerprint);
      }
      setCacheRevision((value) => value + 1);
      if (
        completed.input.key === latest.current.input?.key &&
        !latest.current.paused
      ) {
        finished.current = completed.input.key;
        setBuild(completedBuild);
      }
      pump();
    };
    current.onerror = () => {
      if (worker.current === current)
        fail(
          "Couldn't load the compiler. Check your connection and try again."
        );
    };
    return () => {
      clearDebounce();
      clearWatchdog();
      current.terminate();
      if (worker.current === current) worker.current = null;
      ready.current = false;
      queued.current = null;
      running.current = null;
    };
  }, [attempt, settings.version, clearDebounce, clearWatchdog, fail, pump]);
  useEffect(() => {
    clearDebounce();
    queued.current = null;
    if (cachedBuild && !paused) {
      cache.current.touch(cachedBuild);
      finished.current = cachedBuild.input.key;
      setBuild(cachedBuild);
      return clearDebounce;
    }
    if (
      input &&
      autoCompile &&
      !paused &&
      state === "ready" &&
      finished.current !== input.key
    ) {
      queued.current = { input, due: Date.now() + AUTO_COMPILE_DELAY };
      pump();
    }
    return clearDebounce;
  }, [
    input?.key,
    cachedBuild,
    autoCompile,
    paused,
    state,
    clearDebounce,
    pump,
  ]);
  const compile = useCallback(() => {
    if (!latest.current.input || latest.current.paused || !ready.current)
      return;
    if (running.current?.input.key === latest.current.input.key) return;
    queued.current = {
      input: latest.current.input,
      due: Date.now(),
      force: true,
    };
    pump();
  }, [pump]);
  const visibleBuild =
    cachedBuild ?? (build?.input.workspaceId === workspaceId ? build : null);
  const stale = !!visibleBuild && input?.key !== visibleBuild.input.key;
  return {
    state,
    error,
    isCompiling:
      isCompiling &&
      (!cachedBuild || running.current?.input.key === input?.key),
    compile,
    reload: () => setAttempt((value) => value + 1),
    result: visibleBuild?.result ?? null,
    compiledSource: visibleBuild?.input.fingerprint ?? null,
    compiledFileName: visibleBuild?.input.entry ?? "",
    diagnosticBuild: !stale ? visibleBuild : null,
    build: visibleBuild,
    stale,
  };
}
