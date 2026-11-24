import type { InterfaceAbi } from "ethers";
import type { DecodedTraceCall, TraceAbis, createTraceDecoder } from "./decode";
import type { TraceCall } from "./model";
import { traceCodeAddress } from "./codeAddress";

export type TraceDecodeEntry = {
  status: "queued" | "loading" | "ready" | "error";
  data?: DecodedTraceCall;
  error?: string;
};
export type TraceDecodeSnapshot = {
  entries: Record<string, TraceDecodeEntry>;
  completed: number;
  requested: number;
};
type Decoder = ReturnType<typeof createTraceDecoder>;
type Loader = () => Promise<{ createTraceDecoder: typeof createTraceDecoder }>;

/** One store per trace. Subscribers own its lifetime; abandoned queues stop launching work. */
export function createTraceDecodeStore(
  chainId?: number,
  initialAbis: TraceAbis = {},
  loader: Loader = () => import("./decode")
) {
  let snapshot: TraceDecodeSnapshot = {
    entries: {},
    completed: 0,
    requested: 0,
  };
  const listeners = new Set<() => void>();
  const requested = new Map<string, TraceCall>();
  let queue: TraceCall[] = [];
  let active = 0;
  const versions = new Map<string, number>();
  let decoder: Promise<Decoder> | undefined;
  const abis = { ...initialAbis };
  const getDecoder = () =>
    (decoder ??= loader().then((module) =>
      module.createTraceDecoder(chainId, abis)
    ));
  function publish(entries: Record<string, TraceDecodeEntry>) {
    snapshot = {
      entries,
      requested: Object.keys(entries).length,
      completed: Object.values(entries).filter(
        (entry) => entry.status === "ready" || entry.status === "error"
      ).length,
    };
    listeners.forEach((listener) => listener());
  }
  function pump() {
    while (listeners.size && active < 3 && queue.length) {
      const call = queue.shift()!;
      const version = versions.get(call.id) ?? 0;
      active++;
      publish({ ...snapshot.entries, [call.id]: { status: "loading" } });
      void getDecoder()
        .then((worker) => worker.decode(call))
        .then(
          (data) => {
            if ((versions.get(call.id) ?? 0) === version)
              publish({
                ...snapshot.entries,
                [call.id]: { status: "ready", data },
              });
          },
          () => {
            if ((versions.get(call.id) ?? 0) === version)
              publish({
                ...snapshot.entries,
                [call.id]: { status: "error", error: "Decoding unavailable" },
              });
          }
        )
        .finally(() => {
          active--;
          pump();
        });
    }
  }
  function enqueue(calls: readonly TraceCall[], priority = false) {
    let entries = snapshot.entries;
    const added: TraceCall[] = [];
    for (const call of calls) {
      requested.set(call.id, call);
      if (entries[call.id]) {
        if (priority && entries[call.id].status === "queued") {
          queue = queue.filter((queued) => queued.id !== call.id);
          queue.unshift(call);
        }
        continue;
      }
      if (entries === snapshot.entries) entries = { ...entries };
      entries[call.id] = { status: "queued" };
      added.push(call);
    }
    if (priority) queue.unshift(...added);
    else queue.push(...added);
    if (entries !== snapshot.entries) publish(entries);
    pump();
  }
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      pump();
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    enqueue,
    async setAbi(address: string, abi: InterfaceAbi) {
      const worker = await getDecoder();
      abis[address.toLowerCase()] = abi;
      worker.setAbi(address, abi);
      const key = address.toLowerCase();
      const affected = [...requested.values()].filter(
        (call) =>
          traceCodeAddress(call)?.toLowerCase() === key ||
          call.logs.some((log) => log.address.toLowerCase() === key)
      );
      const ids = new Set(affected.map((call) => call.id));
      const entries = { ...snapshot.entries };
      for (const id of ids) {
        versions.set(id, (versions.get(id) ?? 0) + 1);
        delete entries[id];
      }
      queue = queue.filter((call) => !ids.has(call.id));
      publish(entries);
      enqueue(affected);
    },
  };
}
