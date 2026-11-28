"use client";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { createTraceDecodeStore, type TraceDecodeEntry } from "@/lib/tracer/decodingStore";
import type { TraceAbis } from "@/lib/tracer/decode";
import type { TraceCall, TraceDocument } from "@/lib/tracer/model";

export function useTraceDecoding(
  document?: TraceDocument,
  selected?: TraceCall,
  abis?: TraceAbis,
  entries?: Record<string, TraceDecodeEntry>
) {
  const store = useMemo(
    () => createTraceDecodeStore(document?.chainId, abis, undefined, entries),
    [document, abis, entries]
  );
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot
  );
  useEffect(() => {
    if (selected) store.enqueue([selected], true);
  }, [store, selected]);
  return { ...snapshot, enqueue: store.enqueue, setAbi: store.setAbi };
}
