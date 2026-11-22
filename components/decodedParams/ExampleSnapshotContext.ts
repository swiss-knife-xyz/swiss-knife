import { createContext } from "react";

export type ExampleEnrichment = Readonly<{
  addresses: Readonly<Record<string, Readonly<{ labels: readonly string[] }>>>;
  urls: Readonly<Record<string, Readonly<{ json?: unknown; image?: string }>>>;
}>;

// A non-null value disables live enrichment, including for absent entries.
export const ExampleSnapshotContext = createContext<ExampleEnrichment | null>(null);
