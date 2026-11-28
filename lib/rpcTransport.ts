import { fallback, http, custom, type Transport } from "viem";
import { getRpcUrlsForChain, chainIdToChain } from "@/data/networks";
import {
  beginCustomRpcRequest,
  settleCustomRpcRequest,
} from "./customChains/failures";

type RpcPolicy = "configured" | "trace";

function resolveTransport(
  chainId: number,
  timeout?: number,
  policy: RpcPolicy = "configured"
) {
  const urls = getRpcUrlsForChain(chainId, policy);
  if (!urls.length) throw new Error(`Unsupported RPC chain ${chainId}`);
  const transports = urls.map((url) => http(url, timeout ? { timeout } : {}));
  return transports.length === 1
    ? transports[0]
    : fallback(transports, { retryCount: 0 });
}

/** Browser requests wait for saved settings, then resolve the current endpoint. */
export function getRpcTransport(
  chainId: number,
  timeout?: number,
  policy: RpcPolicy = "configured"
): Transport {
  if (!chainIdToChain[chainId])
    throw new Error(`Unsupported RPC chain ${chainId}`);
  if (typeof window === "undefined")
    return resolveTransport(chainId, timeout, policy);
  return (parameters) => {
    let key = "";
    let active: ReturnType<Transport> | undefined;
    return custom(
      {
        request: async (args) => {
          const { waitForCustomChains, getSavedCustomChain } = await import(
            "./customChains/store"
          );
          await waitForCustomChains();
          const nextKey = getRpcUrlsForChain(chainId, policy).join("\n");
          if (!active || nextKey !== key) {
            active = resolveTransport(
              chainId,
              timeout,
              policy
            )({ ...parameters, chain: chainIdToChain[chainId] });
            key = nextKey;
          }
          const saved = getSavedCustomChain(chainId);
          const request = saved ? beginCustomRpcRequest() : 0;
          try {
            const result = await active.request(args);
            if (saved && getSavedCustomChain(chainId)?.rpcUrl === saved.rpcUrl)
              settleCustomRpcRequest(chainId, saved.rpcUrl, request);
            return result;
          } catch (error) {
            if (saved && getSavedCustomChain(chainId)?.rpcUrl === saved.rpcUrl)
              settleCustomRpcRequest(chainId, saved.rpcUrl, request, error);
            throw error;
          }
        },
      },
      { retryCount: 0 }
    )(parameters);
  };
}

// Wagmi keeps clients cached by ID; the same transport also follows saved RPC changes.
export const getLiveRpcTransport = getRpcTransport;
