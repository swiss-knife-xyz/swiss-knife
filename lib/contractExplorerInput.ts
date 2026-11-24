import { chainIdToChain, erc3770ShortNameToChain } from "@/data/common";
import { CHAINLABEL_KEY, TX_KEY } from "@/data/networks";
import { txExplorers } from "@/data/txExplorers";

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
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return null;
    const hashes = url.pathname.match(/0x[a-fA-F0-9]{64}/g);
    if (hashes?.length !== 1) return null;
    const hash = hashes[0];
    const match = /^(.*)\/tx\/(0x[a-fA-F0-9]{64})\/?$/.exec(url.pathname);
    const candidates = new Set<number>();
    for (const chain of Object.values(chainIdToChain)) {
      for (const explorer of Object.values(chain.blockExplorers ?? {})) {
        const base = new URL(explorer.url);
        if (
          match &&
          url.host === base.host &&
          match[1] === base.pathname.replace(/\/$/, "")
        ) {
          candidates.add(chain.id);
        }
      }
    }
    // Alternative explorers use the same directory metadata as outbound links.
    // Multi-chain URLs without a chain in their path remain ambiguous.
    for (const explorer of Object.values(txExplorers)) {
      for (const [id, label] of Object.entries(explorer.chainIdToLabel)) {
        if (!chainIdToChain[Number(id)]) continue;
        const candidate = new URL(
          explorer.urlLayout
            .replace(CHAINLABEL_KEY, label)
            .replace(TX_KEY, hash)
        );
        if (
          url.host === candidate.host &&
          url.pathname.replace(/\/$/, "") ===
            candidate.pathname.replace(/\/$/, "")
        )
          candidates.add(Number(id));
      }
    }
    if (candidates.size === 1) return { hash, chainId: [...candidates][0] };
  } catch {
    /* Not a known explorer transaction URL. */
  }
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
