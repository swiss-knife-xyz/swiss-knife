import { chainIdToChain } from "@/data/common";

export function isOPStackChain(chainId: number): boolean {
  const chain = chainIdToChain[chainId];
  if (!chain) return false;
  return "portal" in (chain.contracts ?? {});
}

export function getL1ChainForL2(l2ChainId: number): number | null {
  const chain = chainIdToChain[l2ChainId];
  if (!chain) return null;
  if ("portal" in (chain.contracts ?? {})) {
    const portal = chain.contracts?.portal as {
      [sourceId: number]: { address: string };
    };
    const firstPortal = parseInt(Object.keys(portal)[0]);
    return firstPortal;
  }
  return null;
}
