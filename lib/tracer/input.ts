import { parseTransactionExplorerUrl } from "@/lib/contractExplorerInput";
import { HASH } from "./model";

/** Explorer identity comes from the shared registry, including saved explorers. */
export function parseTraceInput(input: string, selectedChainId: number) {
  const value = input.trim();
  if (HASH.test(value)) return { hash: value, chainId: selectedChainId };
  const transaction = parseTransactionExplorerUrl(value);
  if (transaction) return transaction;
  throw new Error(
    value.includes("/")
      ? "Explorer not recognized. Paste the hash and select its network."
      : "Enter a transaction hash or explorer link."
  );
}
