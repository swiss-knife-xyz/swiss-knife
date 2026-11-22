"use client";

import { useAccount, useCapabilities } from "wagmi";

export interface BatchSupport {
  supports: boolean;
  status: string | undefined;
  isLoading: boolean;
}

interface AtomicCapabilities {
  atomic?: {
    status?: string;
  };
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
    query: { enabled: !!address && !!chainId },
  });

  // Some wallets omit chains they do not support from the capability map.
  // Passing chainId to Wagmi makes that missing entry become an undefined
  // query result, which TanStack Query rejects. Resolve the chain locally so
  // an omitted entry is treated as a normal "batching unsupported" response.
  const capabilities = chainId
    ? (data as Record<number, AtomicCapabilities> | undefined)?.[chainId]
    : undefined;
  const status = capabilities?.atomic?.status;
  const supports = status === "supported" || status === "ready";
  return { supports, status, isLoading };
}
