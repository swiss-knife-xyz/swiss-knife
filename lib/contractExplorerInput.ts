import { chainIdToChain, erc3770ShortNameToChain } from "@/data/common";

export function parseChainPrefixedAddress(input: string) {
  const match = /^([^:]+):(0x[a-fA-F0-9]{40})$/.exec(
    input.trim().replace(/^"|"$/g, "")
  );
  const chain = match && erc3770ShortNameToChain[match[1]];
  return chain && match ? { address: match[2], chainId: chain.id } : null;
}

export function parseContractAddressInput(input: string) {
  return parseChainPrefixedAddress(input) ?? parseContractExplorerUrl(input);
}

export function parseTransactionExplorerUrl(input: string) {
  try {
    const value = input.trim();
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return null;
    const match = /^(.*)\/tx\/(0x[a-fA-F0-9]{64})\/?$/.exec(url.pathname);
    if (!match) return null;
    for (const chain of Object.values(chainIdToChain)) {
      for (const explorer of Object.values(chain.blockExplorers ?? {})) {
        const base = new URL(explorer.url);
        if (url.host === base.host && match[1] === base.pathname.replace(/\/$/, "")) {
          return { hash: match[2], chainId: chain.id };
        }
      }
    }
  } catch { /* Not a known explorer transaction URL. */ }
  return null;
}

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
