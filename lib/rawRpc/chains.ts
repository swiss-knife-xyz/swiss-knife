import { c } from "@/data/common";

// Public, catalogued endpoints only. Do not use environment-keyed URLs here.
const publicOverrides: Record<number, string> = {
  1: "https://eth.drpc.org",
  8453: "https://mainnet.base.org",
  42161: "https://arb1.arbitrum.io/rpc",
  10: "https://mainnet.optimism.io",
  11155111: "https://ethereum-sepolia-rpc.publicnode.com",
};
const chains = Array.from(new Map(Object.values(c).map(chain => [chain.id, chain])).values());
export const RPC_ENDPOINTS: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(chains.map(chain => [String(chain.id), publicOverrides[chain.id] ?? chain.rpcUrls.default.http[0]]))
);
export const RPC_CHAINS = chains.map(chain => ({
  id: String(chain.id),
  name: chain.name,
  provider: new URL(RPC_ENDPOINTS[String(chain.id)]).hostname,
}));
