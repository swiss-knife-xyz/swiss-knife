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

  useEffect(() => {
    if (slot0Data) {
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
    } else if (isSlot0Loading) {
      setIsPoolInitialized(undefined);
      setCurrentSqrtPriceX96("Loading...");
      setCurrentTick(undefined);
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
    isSlot0Loading,
    slot0Error,
    currency0Decimals,
    currency1Decimals,
  ]);

  const fetchPoolInfo = useCallback(() => {
    if (poolId && isChainSupported && refetchSlot0) {
      refetchSlot0();
    }
  }, [poolId, isChainSupported, refetchSlot0]);

  return {
    isPoolInitialized,
    currentSqrtPriceX96,
    currentTick,
    currentZeroForOnePrice,
    currentOneForZeroPrice,
    slot0Data,
    isSlot0Loading,
    slot0Error,
    fetchPoolInfo,
  };
};
