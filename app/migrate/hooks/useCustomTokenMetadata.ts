"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchCustomTokenMetadata,
  CustomTokenMetadata,
} from "../lib/customTokenLookup";

export interface UseCustomTokenMetadataResult {
  data: CustomTokenMetadata | null | undefined;
  isLoading: boolean;
  isError: boolean;
  /** True only after the fetch returned and the address didn't decode to
   *  a valid ERC-20 (`data === null`). Distinct from `isError`, which fires
   *  on RPC failures. */
  isInvalid: boolean;
}

/**
 * Onchain ERC-20 metadata lookup. Skips the network entirely when `enabled`
 * is false (e.g. address isn't a 0x string yet, or it's already a known
 * token from the popular/rest lists).
 *
 * Cached aggressively in-memory: contract metadata is immutable, so a hit
 * stays valid until the page reloads.
 */
export function useCustomTokenMetadata(
  address: string | undefined,
  chainId: number | undefined,
  enabled: boolean
): UseCustomTokenMetadataResult {
  const query = useQuery({
    queryKey: [
      "wallet-migrate-custom-token-metadata",
      chainId ?? 0,
      address?.toLowerCase() ?? "",
    ],
    queryFn: () => fetchCustomTokenMetadata(address!, chainId!),
    enabled: enabled && !!address && !!chainId,
    staleTime: Infinity,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  return {
    data: query.data,
    isLoading: query.isLoading && query.fetchStatus !== "idle",
    isError: query.isError,
    isInvalid: query.data === null,
  };
}
