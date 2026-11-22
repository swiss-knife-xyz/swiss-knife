import { builtinNetworks, getRpcUrlsForChain } from "@/data/networks";

const networks = Object.values(builtinNetworks);

// The console's allowlist never includes environment-configured endpoints.
export const RPC_ENDPOINTS: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(
    networks.map((chain) => [
      String(chain.id),
      getRpcUrlsForChain(chain.id, "public")[0],
    ])
  )
);
export const RPC_CHAINS = networks.map((chain) => ({
  id: String(chain.id),
  name: chain.name,
  provider: new URL(RPC_ENDPOINTS[String(chain.id)]).hostname,
}));
