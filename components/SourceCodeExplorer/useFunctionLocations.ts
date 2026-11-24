"use client";

import { useEffect, useState } from "react";
import type { FunctionLocations } from "./functionLocations";

// Weak keys let source bundles be collected when their contract tab is closed.
const cache = new WeakMap<
  Record<string, string>,
  Map<string, FunctionLocations>
>();
const empty: FunctionLocations = {};

export function useFunctionLocations(
  sources: Record<string, string> | undefined,
  contractName: string | undefined
) {
  const [result, setResult] = useState<{
    sources: Record<string, string>;
    contractName: string;
    locations: FunctionLocations;
  }>();
  useEffect(() => {
    if (!sources || !contractName || cache.get(sources)?.has(contractName))
      return;
    let worker: Worker | undefined;
    let watchdog: ReturnType<typeof setTimeout>;
    let disposed = false;
    let finished = false;
    const finish = (locations: FunctionLocations) => {
      if (disposed || finished) return;
      finished = true;
      clearTimeout(watchdog);
      worker?.terminate();
      const entries =
        cache.get(sources) ?? new Map<string, FunctionLocations>();
      entries.set(contractName, locations);
      cache.set(sources, entries);
      setResult({ sources, contractName, locations });
    };
    // Let the function list paint before cloning the source bundle to a worker.
    const timer = setTimeout(() => {
      try {
        worker = new Worker(
          new URL("./functionLocations.worker.ts", import.meta.url)
        );
        worker.onmessage = ({ data }: MessageEvent<FunctionLocations>) =>
          finish(data);
        worker.onerror = () => finish(empty);
        watchdog = setTimeout(() => finish(empty), 15000);
        worker.postMessage({ sources, contractName });
      } catch {
        finish(empty);
      }
    }, 100);
    return () => {
      disposed = true;
      clearTimeout(timer);
      clearTimeout(watchdog);
      worker?.terminate();
    };
  }, [sources, contractName]);
  const cached =
    sources && contractName ? cache.get(sources)?.get(contractName) : undefined;
  const current =
    result && result.sources === sources && result.contractName === contractName
      ? result.locations
      : undefined;
  return {
    locations: cached ?? current ?? empty,
    isIndexing: !!sources && !!contractName && !cached && !current,
  };
}
