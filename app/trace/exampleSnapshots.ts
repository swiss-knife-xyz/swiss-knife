import type { ExampleEnrichment } from "@/components/decodedParams/ExampleSnapshotContext";
import type { TraceDecodeEntry } from "@/lib/tracer/decodingStore";
import type { TraceAbis } from "@/lib/tracer/decode";
import { flattenCalls, normalizeTrace, type TraceDocument } from "@/lib/tracer/model";
import encoded from "./examples.v1.json";

export type TraceExampleSnapshot = ExampleEnrichment & {
  version: 1;
  chainId: number;
  hash: string;
  document: TraceDocument;
  entries: Record<string, TraceDecodeEntry>;
  abis: TraceAbis;
};

const snapshots = JSON.parse(JSON.stringify(encoded), (_key, value) => {
  if (value && typeof value === "object") {
    if (Object.keys(value).length === 1 && typeof value.$bigint === "string" && /^-?\d+$/.test(value.$bigint))
      return BigInt(value.$bigint);
    return Object.freeze(value);
  }
  return value;
}) as TraceExampleSnapshot[];

for (const snapshot of snapshots) {
  const document = normalizeTrace(snapshot.document);
  if (snapshot.version !== 1 || snapshot.chainId !== 1 || document.chainId !== snapshot.chainId ||
      document.transactionHash !== snapshot.hash || !snapshot.addresses || !snapshot.urls || !snapshot.abis ||
      flattenCalls(document.call).some((call) => snapshot.entries[call.id]?.status !== "ready" || !snapshot.entries[call.id]?.data))
    throw new Error(`Invalid trace example snapshot: ${snapshot.hash}`);
}

export function getTraceExampleSnapshot(hash: string, chainId: number) {
  return snapshots.find((snapshot) => snapshot.chainId === chainId && snapshot.hash === hash.toLowerCase());
}
