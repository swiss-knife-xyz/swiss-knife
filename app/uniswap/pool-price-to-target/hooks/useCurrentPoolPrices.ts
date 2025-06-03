import { useState, useEffect } from "react";
import { useReadContract } from "wagmi";
import { StateViewAbi, StateViewAddress } from "../lib/constants"; // Adjusted path
import { Chain, Hex } from "viem"; // Import Chain and Hex types

interface UseCurrentPoolPricesProps {
  poolId: Hex | null; // Changed from string to Hex
  chain: Chain | undefined; // Use Chain type from viem
  currency0Decimals: number | undefined;
  currency1Decimals: number | undefined;
}

export function useCurrentPoolPrices({
  poolId,
  chain,
  currency0Decimals,
  currency1Decimals,
}: UseCurrentPoolPricesProps) {
  const [currentZeroForOnePrice, setCurrentZeroForOnePrice] = useState<
    string | undefined
  >();
  const [currentOneForZeroPrice, setCurrentOneForZeroPrice] = useState<
    string | undefined
  >();

  const {
    data: slot0DataResult, // Renamed to avoid confusion with the whole object
    isLoading: isSlot0Loading,
    error: slot0Error,
    refetch: refetchSlot0,
  } = useReadContract({
    address: chain?.id && poolId ? StateViewAddress[chain.id] : undefined,
    abi: StateViewAbi,
    functionName: "getSlot0",
    args: poolId ? [poolId] : undefined, // Ensure args is undefined if poolId is null
    query: {
      enabled: !!poolId && !!chain?.id && !!StateViewAddress[chain.id],
    },
  });

  useEffect(() => {
    if (
      slot0DataResult &&
      currency0Decimals !== undefined &&
      currency1Decimals !== undefined
    ) {
      // slot0DataResult is: readonly [sqrtPriceX96: bigint, tick: number, protocolFee: number, lpFee: number]
      // The ABI defines tick as int24, which viem treats as number.
      const [, tick] = slot0DataResult;
      const currentTick = Number(tick);
      const price = Math.pow(1.0001, currentTick);

      const token1PerToken0 =
        (price * 10 ** currency0Decimals) / 10 ** currency1Decimals;
      setCurrentZeroForOnePrice(token1PerToken0.toFixed(6));

      const token0PerToken1 = 1 / token1PerToken0;
      setCurrentOneForZeroPrice(token0PerToken1.toFixed(6));
    } else if (isSlot0Loading) {
      setCurrentZeroForOnePrice("Fetching...");
      setCurrentOneForZeroPrice("Fetching...");
    } else if (slot0Error) {
      setCurrentZeroForOnePrice("Error");
      setCurrentOneForZeroPrice("Error");
    } else {
      // Reset if dependencies are not met
      setCurrentZeroForOnePrice(undefined);
      setCurrentOneForZeroPrice(undefined);
    }
  }, [
    slot0DataResult,
    isSlot0Loading,
    slot0Error,
    currency0Decimals,
    currency1Decimals,
  ]);

  const fetchCurrentPrices = () => {
    if (
      poolId &&
      currency0Decimals &&
      currency1Decimals &&
      chain?.id &&
      StateViewAddress[chain.id]
    ) {
      refetchSlot0();
    }
  };

  return {
    currentZeroForOnePrice,
    currentOneForZeroPrice,
    slot0Tick: slot0DataResult ? Number(slot0DataResult[1]) : undefined, // Expose tick directly
    isSlot0Loading,
    slot0Error,
    fetchCurrentPrices, // Expose refetch function
  };
}
