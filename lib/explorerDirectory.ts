import { CHAINLABEL_KEY, chainIdToChain } from "@/data/networks";
import type { ExplorerData, ExplorersData } from "@/types";

function isNativeExplorer(entry: ExplorerData, chainId: number): boolean {
  const nativeUrl = chainIdToChain[chainId]?.blockExplorers?.default?.url;
  const label = entry.chainIdToLabel[chainId];
  if (!nativeUrl || label === undefined) return false;
  try {
    const native = new URL(nativeUrl);
    const candidate = new URL(entry.urlLayout.replace(CHAINLABEL_KEY, label));
    const basePath = native.pathname.replace(/\/$/, "");
    return (
      candidate.origin === native.origin &&
      (candidate.pathname === basePath ||
        candidate.pathname.startsWith(`${basePath}/`))
    );
  } catch {
    return false;
  }
}

// Promote each selected chain's default explorer, keeping all other entries stable.
export function orderDirectoryExplorers(
  names: string[],
  entries: ExplorersData,
  chainIds: number[]
): string[] {
  if (!chainIds.length) return names;
  const rank = (name: string) => {
    const index = chainIds.findIndex((id) =>
      isNativeExplorer(entries[name], id)
    );
    return index < 0 ? chainIds.length : index;
  };
  return names
    .map((name) => ({ name, rank: rank(name) }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ name }) => name);
}
