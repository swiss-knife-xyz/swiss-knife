import { ethers } from "ethers";
import { getPublicClient } from "./publicClient";
import { getRpcUrlsForChain } from "@/data/networks";

/** Adapter for tools that require ethers (for example ethereum-block-by-date). */
export function getEthersProvider(chainId: number) {
  if (typeof window !== "undefined") {
    return new ethers.BrowserProvider(
      {
        request: async (args) => {
          const { waitForCustomChains } = await import("./customChains/store");
          await waitForCustomChains();
          return getPublicClient(chainId).request(
            args as Parameters<ReturnType<typeof getPublicClient>["request"]>[0]
          );
        },
      },
      chainId
    );
  }
  const urls = getRpcUrlsForChain(chainId);
  if (!urls.length) throw new Error(`Unsupported RPC chain ${chainId}`);
  const providers = urls.map((url) => new ethers.JsonRpcProvider(url, chainId));
  return providers.length === 1
    ? providers[0]
    : new ethers.FallbackProvider(
        providers.map((provider, index) => ({
          provider,
          priority: index + 1,
          weight: 1,
        })),
        chainId,
        { quorum: 1 }
      );
}
