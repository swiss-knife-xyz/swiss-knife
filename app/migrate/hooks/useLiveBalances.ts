"use client";

/**
 * Refresh on-chain balances for the *currently visible* tokens. Hidden
 * (dust-filtered) tokens are NOT refreshed — they don't matter for the
 * migration plan and the multicall round-trip should stay cheap.
 *
 * The hook is idempotent: once a (token, address) pair has been refreshed,
 * we don't re-fetch unless `version` bumps (e.g. after a successful
 * migration when the parent calls `bump()` to invalidate).
 */
import { useEffect, useRef, useState } from "react";
import type { Address } from "viem";
import { PortfolioToken, tokenKey } from "../lib/portfolioApi";
import { fetchLiveBalances, LiveBalance } from "../lib/onchainBalances";

export interface UseLiveBalancesResult {
  liveMap: Map<string, LiveBalance>;
  isRefreshing: boolean;
  /** Drop all cached results so the next render re-fetches everything. */
  reset: () => void;
}

export function useLiveBalances(
  address: string | undefined,
  visibleTokens: PortfolioToken[],
  version = 0
): UseLiveBalancesResult {
  const [liveMap, setLiveMap] = useState<Map<string, LiveBalance>>(new Map());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Tracks which (address, version, tokenKey) pairs we've already requested
  // so refetching the portfolio doesn't trigger a duplicate multicall when
  // the token set is unchanged.
  const requestedRef = useRef<Set<string>>(new Set());
  const stampRef = useRef<string>("");

  useEffect(() => {
    if (!address || visibleTokens.length === 0) return;

    // Stamp identifies the (address, version) tuple. Changing it invalidates
    // the per-token "already requested" set.
    const stamp = `${address.toLowerCase()}#${version}`;
    if (stamp !== stampRef.current) {
      stampRef.current = stamp;
      requestedRef.current = new Set();
      setLiveMap(new Map());
    }

    // Which tokens still need a fetch this round?
    const needFetch = visibleTokens.filter(
      (t) => !requestedRef.current.has(tokenKey(t))
    );
    if (needFetch.length === 0) return;

    // Mark as requested up front (before the await) so re-renders during the
    // in-flight fetch don't re-trigger.
    for (const t of needFetch) requestedRef.current.add(tokenKey(t));

    let cancelled = false;
    setIsRefreshing(true);
    fetchLiveBalances(address as Address, needFetch)
      .then((freshMap) => {
        if (cancelled) return;
        if (freshMap.size === 0) return;
        setLiveMap((prev) => {
          const next = new Map(prev);
          for (const [key, value] of freshMap) next.set(key, value);
          return next;
        });
      })
      .catch(() => {
        // Per-token failures are swallowed inside fetchLiveBalances; a top-
        // level throw means something catastrophic happened and we silently
        // fall back to API values.
      })
      .finally(() => {
        if (!cancelled) setIsRefreshing(false);
      });

    return () => {
      cancelled = true;
    };
    // `visibleTokens` identity changes on every render; the per-token dedup
    // above handles that. We only re-enter from address / version changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, version, visibleTokens]);

  return {
    liveMap,
    isRefreshing,
    reset: () => {
      requestedRef.current = new Set();
      setLiveMap(new Map());
    },
  };
}
