import type { ExampleEnrichment } from "@/components/decodedParams/ExampleSnapshotContext";
import type { DecodeEventResult, DecodeRecursiveResult } from "@/types";
import encoded from "./examples.v1.json";
import { decoderSamples } from "./samples";

type ExampleSnapshot = ExampleEnrichment & Readonly<{
  version: 1;
  chainId: number;
  hash: string;
  result: NonNullable<DecodeRecursiveResult>;
  events: DecodeEventResult[];
}>;

const snapshots = JSON.parse(JSON.stringify(encoded), (_key, value) => {
  if (value && typeof value === "object") {
    if (Object.keys(value).length === 1 && typeof value.$bigint === "string" &&
        /^-?\d+$/.test(value.$bigint)) {
      return BigInt(value.$bigint);
    }
    return Object.freeze(value);
  }
  return value;
}) as ExampleSnapshot[];

export function getExampleSnapshot(sample: (typeof decoderSamples)[number]) {
  const snapshot = snapshots.find(({ hash, chainId }) =>
    hash === sample.hash && chainId === sample.chainId
  );
  if (
    snapshot?.version !== 1 ||
    typeof snapshot.result?.functionName !== "string" ||
    typeof snapshot.result.signature !== "string" ||
    !Array.isArray(snapshot.result.args) ||
    !Array.isArray(snapshot.result.rawArgs) ||
    !Array.isArray(snapshot.events) ||
    !snapshot.events.every((event) =>
      typeof event.eventName === "string" &&
      typeof event.signature === "string" &&
      Array.isArray(event.args)
    ) ||
    !snapshot.addresses ||
    !snapshot.urls ||
    Object.values(snapshot.urls).some(({ image }) =>
      image !== undefined && !/^\/decoder-examples\/[\w.-]+$/.test(image)
    )
  ) {
    throw new Error(`Invalid decoder example snapshot for ${sample.id}`);
  }
  return snapshot;
}

export function findExampleDeepLink(input: string, chain: string | null) {
  return decoderSamples.find(sample =>
    (chain === null || chain === String(sample.chainId)) &&
    (input === sample.explorerUrl ||
      (chain !== null && input.toLowerCase() === sample.hash))
  );
}
