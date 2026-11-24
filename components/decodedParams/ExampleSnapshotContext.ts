import type { DecodeRecursiveResult } from "@/types";
import { createContext } from "react";
import type { ClearSigningResult } from "@/lib/clearSigning/resolve";

export type ExampleEnrichment = Readonly<{
  result?: NonNullable<DecodeRecursiveResult>;
  clearSigning?: Readonly<Record<string, ClearSigningResult | null>>;
  addresses: Readonly<Record<string, Readonly<{ labels: readonly string[] }>>>;
  urls: Readonly<Record<string, Readonly<{ json?: unknown; image?: string }>>>;
}>;

// A non-null value disables live enrichment, including for absent entries.
export const ExampleSnapshotContext = createContext<ExampleEnrichment | null>(
  null
);
