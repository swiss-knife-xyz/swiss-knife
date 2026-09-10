import { FaucetEntry, faucets } from "./faucets";

const unique = <T>(values: T[]) => Array.from(new Set(values));

const preferredChainOrder = new Map(
  ["Ethereum Sepolia"].map((chain, index) => [chain, index])
);

const chainSlugOverrides: Record<string, string> = {
  "OP Sepolia": "optimism-sepolia",
};

const chainSlugAliases: Record<string, string> = {
  sepolia: "Ethereum Sepolia",
  "op-sepolia": "OP Sepolia",
  optimism: "OP Sepolia",
  "optimism-testnet": "OP Sepolia",
  hoodi: "Ethereum Hoodi",
  "hoodi-testnet": "Ethereum Hoodi",
  "bnb-testnet": "BNB Smart Chain Testnet",
  "bsc-testnet": "BNB Smart Chain Testnet",
  "base-testnet": "Base Sepolia",
  amoy: "Polygon Amoy",
  "amoy-testnet": "Polygon Amoy",
  "plasma-testnet": "Plasma Testnet",
  hyperliquid: "HyperEVM Testnet",
  "hyperliquid-testnet": "HyperEVM Testnet",
  "zksync-testnet": "ZKsync Sepolia",
  "zksync-sepolia-testnet": "ZKsync Sepolia",
  "scroll-testnet": "Scroll Sepolia",
  "scroll-sepolia-testnet": "Scroll Sepolia",
  "avalanche-testnet": "Avalanche Fuji",
  "avax-testnet": "Avalanche Fuji",
  "avax-fuji": "Avalanche Fuji",
};

export const getFaucetChains = (faucet: FaucetEntry) => {
  if (faucet.variants?.length) {
    return unique(faucet.variants.map((variant) => variant.chain));
  }

  return faucet.supportedChains?.length
    ? faucet.supportedChains
    : [faucet.chain];
};

export const getFaucetChainSortValue = (chain: string) =>
  preferredChainOrder.get(chain) ?? 1;

export const getFaucetChainNames = () =>
  unique(faucets.flatMap((faucet) => getFaucetChains(faucet))).sort(
    (a, b) =>
      getFaucetChainSortValue(a) - getFaucetChainSortValue(b) ||
      a.localeCompare(b)
  );

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const getFaucetChainSlug = (chain: string) =>
  chainSlugOverrides[chain] ?? slugify(chain);

const normalizeSlug = (slug: string) => {
  try {
    return slugify(decodeURIComponent(slug));
  } catch {
    return slugify(slug);
  }
};

export const getFaucetChainBySlug = (slug: string) => {
  const normalizedSlug = normalizeSlug(slug);
  const chains = getFaucetChainNames();

  return (
    chains.find((chain) => getFaucetChainSlug(chain) === normalizedSlug) ??
    (chains.includes(chainSlugAliases[normalizedSlug])
      ? chainSlugAliases[normalizedSlug]
      : undefined)
  );
};

export const getFaucetChainSeoName = (chain: string) =>
  chain === "OP Sepolia" ? "Optimism Sepolia" : chain;

export const getFaucetsForChain = (chain: string) =>
  faucets.filter((faucet) => getFaucetChains(faucet).includes(chain));

export const getFaucetChainSeoEntries = () =>
  getFaucetChainNames().map((chain) => ({
    chain,
    name: getFaucetChainSeoName(chain),
    slug: getFaucetChainSlug(chain),
  }));
