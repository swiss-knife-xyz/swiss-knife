import type { GasCostChain } from "./gasCostEstimateRead";

// Explicit native-asset identities only: symbols alone are not price-feed IDs.
// Unknown assets and testnet tokens intentionally have no USD conversion.
const nativePriceIds: Readonly<Record<number, string>> = {
  1: "ethereum",
  10: "ethereum",
  42161: "ethereum",
  42170: "ethereum",
  8453: "ethereum",
  7777777: "ethereum",
  81457: "ethereum",
  59144: "ethereum",
  534352: "ethereum",
  324: "ethereum",
  57073: "ethereum",
  480: "ethereum",
  130: "ethereum",
  1868: "ethereum",
  4326: "ethereum",
  4663: "ethereum",
  56: "binancecoin",
  137: "polygon-ecosystem-token",
  43114: "avalanche-2",
  100: "xdai",
  250: "fantom",
  146: "sonic-3",
  1329: "sei-network",
  42220: "celo",
  5000: "mantle",
  1088: "metis-token",
};

/** Reuses the existing CoinGecko simple-price API; a feed failure is optional. */
export async function readNativeUsdPrice(
  chain: GasCostChain,
  fetcher: typeof fetch = fetch,
  now: () => number = Date.now
): Promise<number | undefined> {
  const id = chain.testnet ? undefined : nativePriceIds[chain.id];
  if (!id) return undefined;
  try {
    const response = await fetcher(
      `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_last_updated_at=true`,
      { signal: AbortSignal.timeout(8000), cache: "no-store" }
    );
    if (!response.ok) return undefined;
    const body: unknown = await response.json();
    if (!body || typeof body !== "object") return undefined;
    const value = (body as Record<string, unknown>)[id];
    if (!value || typeof value !== "object") return undefined;
    const { usd, last_updated_at: updated } = value as Record<string, unknown>;
    if (
      typeof usd !== "number" ||
      !Number.isFinite(usd) ||
      usd <= 0 ||
      typeof updated !== "number" ||
      !Number.isFinite(updated)
    )
      return undefined;
    const age = now() / 1000 - updated;
    if (age < -60 || age > 900) return undefined;
    return usd;
  } catch {
    return undefined;
  }
}
