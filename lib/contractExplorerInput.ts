import { chainIdToChain } from "@/data/common";

// Match configured explorer origins exactly, including testnet subdomains.
const explorerChains = new Map<string, number>();
for (const chain of Object.values(chainIdToChain)) {
  for (const explorer of Object.values(chain.blockExplorers ?? {})) {
    explorerChains.set(new URL(explorer.url).origin, chain.id);
  }
}

export function parseContractExplorerUrl(input: string) {
  try {
    const value = input.trim();
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return null;
    // HTTP links are also accepted for the same known explorer host.
    const chainId = explorerChains.get(`https://${url.host}`);
    const match = /^\/(?:address|token)\/(0x[a-fA-F0-9]{40})(?:\/)?$/.exec(
      url.pathname
    );
    if (!chainId || !match) return null;
    return { address: match[1], chainId };
  } catch {
    return null;
  }
}
