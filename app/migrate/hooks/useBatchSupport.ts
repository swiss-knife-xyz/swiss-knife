"use client";

import { useAccount, useCapabilities } from "wagmi";

export interface BatchSupport {
  supports: boolean;
  status: string | undefined;
  isLoading: boolean;
}

/**
 * ERC-5792 atomic-batch detection. Mirrors the pattern used in walletchan's
 * stake page: a wallet supports batching when its `atomic.status` is either
 * "supported" or "ready" for the active chain.
 */
export function useBatchSupport(chainId?: number): BatchSupport {
  const { address } = useAccount();
  const { data, isLoading } = useCapabilities({
    account: address,
    chainId,
    query: { enabled: !!address && !!chainId },
  });
  const status = (data as any)?.atomic?.status as string | undefined;
  const supports = status === "supported" || status === "ready";
  return { supports, status, isLoading };
}
