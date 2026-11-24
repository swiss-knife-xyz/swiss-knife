import { fallback, http, custom, type Transport } from "viem";
import { getRpcUrlsForChain, chainIdToChain } from "@/data/networks";

function resolveTransport(chainId: number, timeout?: number) {
  const urls = getRpcUrlsForChain(chainId);
  if (!urls.length) throw new Error(`Unsupported RPC chain ${chainId}`);
  const transports = urls.map((url) => http(url, timeout ? { timeout } : {}));
  return transports.length === 1
    ? transports[0]
    : fallback(transports, { retryCount: 0 });
}

/** Browser requests wait for saved settings, then resolve the current endpoint. */
export function getRpcTransport(chainId: number, timeout?: number): Transport {
  if (!chainIdToChain[chainId])
    throw new Error(`Unsupported RPC chain ${chainId}`);
  if (typeof window === "undefined") return resolveTransport(chainId, timeout);
  return (parameters) => {
    let key = "";
    let active: ReturnType<Transport> | undefined;
    return custom(
      {
        request: async (args) => {
          const { waitForCustomChains } = await import("./customChains/store");
          await waitForCustomChains();
          const nextKey = getRpcUrlsForChain(chainId).join("\n");
          if (!active || nextKey !== key) {
            active = resolveTransport(
              chainId,
              timeout
            )({ ...parameters, chain: chainIdToChain[chainId] });
            key = nextKey;
          }
          return active.request(args);
        },
      },
      { retryCount: 0 }
    )(parameters);
  };
}

// Wagmi keeps clients cached by ID; the same transport also follows saved RPC changes.
export const getLiveRpcTransport = getRpcTransport;
