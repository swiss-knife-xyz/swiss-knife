import { useState, useEffect, useCallback } from "react";
import { Address } from "viem";
import { useReadContract } from "wagmi";
import { StateViewAddress, StateViewAbi } from "../lib/constants"; // Assuming constants are in ../lib
import { Chain } from "viem/chains";

interface Slot0Data {
  sqrtPriceX96: bigint;
  tick: number;
  protocolFee: number;
  lpFee: number;
}

interface PoolStateResult {
  isPoolInitialized?: boolean;
  currentSqrtPriceX96?: string;
  currentTick?: number;
  currentZeroForOnePrice?: string;
  currentOneForZeroPrice?: string;
  slot0Data?: readonly [bigint, number, number, number] | undefined; // from useReadContract
  isSlot0Loading: boolean;
  slot0Error: Error | null;
  fetchPoolInfo: () => void;
}

export const usePoolState = (
  poolId: Address | null,
  chain:
    | (Chain & { id: number; unsupported?: boolean | undefined })
    | undefined,
  currency0Decimals?: number,
  currency1Decimals?: number,
  isChainSupported?: boolean
): PoolStateResult => {
  const [isPoolInitialized, setIsPoolInitialized] = useState<
    boolean | undefined
  >();
  const [currentSqrtPriceX96, setCurrentSqrtPriceX96] = useState<
    string | undefined
  >();
  const [currentTick, setCurrentTick] = useState<number | undefined>();
  const [currentZeroForOnePrice, setCurrentZeroForOnePrice] = useState<
    string | undefined
  >();
  const [currentOneForZeroPrice, setCurrentOneForZeroPrice] = useState<
    string | undefined
  >();
  const [isForcedLoading, setIsForcedLoading] = useState(false);

  const {
    data: slot0Data,
    isLoading: isSlot0Loading,
    error: slot0Error,
    refetch: refetchSlot0,
  } = useReadContract({
    address:
      chain?.id && StateViewAddress[chain.id]
        ? StateViewAddress[chain.id]
        : undefined,
    abi: StateViewAbi,
    functionName: "getSlot0",
    args: [poolId!],
    query: {
      enabled:
        !!poolId &&
        !!chain?.id &&
        !!StateViewAddress[chain.id] &&
        isChainSupported,
    },
  });

  // Combined loading state
  const isLoading = isSlot0Loading || isForcedLoading;

  useEffect(() => {
    if (slot0Data && !isForcedLoading) {
      // Don't update while forced loading
      const [sqrtPriceX96, tick] = slot0Data;
      const isInit = sqrtPriceX96 !== 0n;
      setIsPoolInitialized(isInit);
      setCurrentSqrtPriceX96(sqrtPriceX96.toString());
      setCurrentTick(Number(tick));

      if (
        isInit &&
        currency0Decimals !== undefined &&
        currency1Decimals !== undefined
      ) {
        const currentTick = Number(tick);
        const price = Math.pow(1.0001, currentTick);
        const token1PerToken0 =
          (price * 10 ** currency0Decimals) / 10 ** currency1Decimals;
        setCurrentZeroForOnePrice(token1PerToken0.toFixed(6));
        const token0PerToken1 = 1 / token1PerToken0;
        setCurrentOneForZeroPrice(token0PerToken1.toFixed(6));
      } else {
        setCurrentZeroForOnePrice(undefined);
        setCurrentOneForZeroPrice(undefined);
      }
    } else if (isLoading && !isForcedLoading) {
      // Only set to undefined on initial loading, not during forced refresh
      setIsPoolInitialized(undefined);
      setCurrentSqrtPriceX96("Loading...");
      setCurrentTick(undefined);
      setCurrentZeroForOnePrice("Fetching...");
      setCurrentOneForZeroPrice("Fetching...");
    } else if (isForcedLoading) {
      // During forced loading, keep initialized state but show loading values
      setCurrentSqrtPriceX96("Loading...");
      setCurrentZeroForOnePrice("Fetching...");
      setCurrentOneForZeroPrice("Fetching...");
    } else if (slot0Error) {
      setIsPoolInitialized(false);
      setCurrentSqrtPriceX96("Pool does not exist");
      setCurrentTick(undefined);
      setCurrentZeroForOnePrice("Error");
      setCurrentOneForZeroPrice("Error");
    }
  }, [
    slot0Data,
    isLoading,
    slot0Error,
    currency0Decimals,
    currency1Decimals,
    isForcedLoading,
  ]);

  const fetchPoolInfo = useCallback(async () => {
    if (poolId && isChainSupported && refetchSlot0) {
      // Set forced loading state immediately
      setIsForcedLoading(true);

      // Add artificial delay to ensure loading state is visible
      await new Promise((resolve) => setTimeout(resolve, 300));

      try {
        // Force refetch with fresh data (bypassing cache)
        await refetchSlot0();
      } finally {
        // Clear forced loading state
        setIsForcedLoading(false);
      }
    }
  }, [poolId, isChainSupported, refetchSlot0]);

  return {
    isPoolInitialized,
    currentSqrtPriceX96,
    currentTick,
    currentZeroForOnePrice,
    currentOneForZeroPrice,
    slot0Data,
    isSlot0Loading: isLoading, // Return combined loading state
    slot0Error,
    fetchPoolInfo,
  };
};
