import type { Chain } from "viem";
import { c, chainIdToChain, networks } from "./networks";

// Wallet ordering is a presentation preference. Chain definitions and RPCs come
// exclusively from the registry; newly supported catalog networks follow these.
const preferredWalletKeys = [
  "base",
  "robinhood",
  "arbitrum",
  "avalanche",
  "bsc",
  "citrea",
  "gnosis",
  "ink",
  "megaeth",
  "monad",
  "optimism",
  "polygon",
  "sei",
  "unichain",
  "zora",
  "plasma",
  "pulsechain",
  "soneium",
  "sonic",
  "seiTestnet",
  "sepolia",
  "arbitrumSepolia",
  "baseSepolia",
  "citreaTestnet",
  "monadTestnet",
];
const preferred = preferredWalletKeys.flatMap((key) =>
  c[key] ? [chainIdToChain[c[key].id]] : []
);
const preferredIds = new Set([
  c.mainnet.id,
  ...preferred.map((chain) => chain.id),
]);

export const walletChains: [Chain, ...Chain[]] = [
  // First chain is the wallet default. Tool selectors keep their own state.
  chainIdToChain[c.mainnet.id],
  ...preferred,
  ...networks.filter((chain) => !preferredIds.has(chain.id)),
];
