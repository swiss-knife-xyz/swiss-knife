import { useState, useEffect, useCallback } from "react";
import { parseUnits, formatUnits } from "viem";
import {
  getPairedAmountForInput,
  priceToSqrtPriceX96,
  sqrtPriceX96ToTick,
} from "../lib/utils";

interface UseLiquidityCalculationsProps {
  currency0Decimals?: number;
  currency1Decimals?: number;
  isPoolInitialized?: boolean;
  initialPrice?: string;
  initialPriceDirection?: boolean;
  slot0Data?: readonly [bigint, number, number, number] | undefined;
  tickLower?: string;
  tickUpper?: string;
  tickSpacing?: number;
  amount0: string;
  setAmount0: (value: string) => void;
  amount1: string;
  setAmount1: (value: string) => void;
}

interface UseLiquidityCalculationsResult {
  lastUpdatedField: "amount0" | "amount1" | null;
  setLastUpdatedField: (field: "amount0" | "amount1" | null) => void;
  isCalculating: boolean;
  calculatingField: "amount0" | "amount1" | null;
  setIsCalculating: (value: boolean) => void;
  setCalculatingField: (field: "amount0" | "amount1" | null) => void;
}

export const useLiquidityCalculations = ({
  currency0Decimals,
  currency1Decimals,
  isPoolInitialized,
  initialPrice,
  initialPriceDirection,
  slot0Data,
  tickLower,
  tickUpper,
  tickSpacing,
  amount0,
  setAmount0,
  amount1,
  setAmount1,
}: UseLiquidityCalculationsProps): UseLiquidityCalculationsResult => {
  const [lastUpdatedField, setLastUpdatedField] = useState<
    "amount0" | "amount1" | null
  >(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [calculatingField, setCalculatingField] = useState<
    "amount0" | "amount1" | null
  >(null);

  const calculateAmount1FromAmount0 = useCallback(
    (
      amount0Input: string,
      currentTick: number,
      currentSqrtPriceX96: bigint,
      tickLowerNum: number,
      tickUpperNum: number,
      decimals0: number,
      decimals1: number
    ): string => {
      if (!amount0Input || amount0Input === "0" || isNaN(Number(amount0Input)))
        return "";
      try {
        const amount0Parsed = parseUnits(amount0Input, decimals0);
        const amount1Calculated = getPairedAmountForInput({
          anchor: "amount0",
          amount: amount0Parsed,
          currentTick,
          currentSqrtPriceX96,
          tickLower: tickLowerNum,
          tickUpper: tickUpperNum,
        });
        return formatUnits(amount1Calculated, decimals1);
      } catch (error) {
        console.error("Error calculating amount1 from amount0:", error);
        return "";
      }
    },
    [] // Q96, Q192 are global, no need for deps if not changing
  );

  const calculateAmount0FromAmount1 = useCallback(
    (
      amount1Input: string,
      currentTick: number,
      currentSqrtPriceX96: bigint,
      tickLowerNum: number,
      tickUpperNum: number,
      decimals0: number,
      decimals1: number
    ): string => {
      if (!amount1Input || amount1Input === "0" || isNaN(Number(amount1Input)))
        return "";
      try {
        const amount1Parsed = parseUnits(amount1Input, decimals1);
        const amount0Calculated = getPairedAmountForInput({
          anchor: "amount1",
          amount: amount1Parsed,
          currentTick,
          currentSqrtPriceX96,
          tickLower: tickLowerNum,
          tickUpper: tickUpperNum,
        });
        return formatUnits(amount0Calculated, decimals0);
      } catch (error) {
        console.error("Error calculating amount0 from amount1:", error);
        return "";
      }
    },
    [] // Q96, Q192 are global
  );

  useEffect(() => {
    if (
      lastUpdatedField !== "amount0" ||
      currency0Decimals === undefined ||
      currency1Decimals === undefined ||
      (!isPoolInitialized && !initialPrice)
    )
      return;
    setIsCalculating(true);
    setCalculatingField("amount1");
    const timeoutId = setTimeout(async () => {
      try {
        let currentTick: number;
        let currentSqrtPriceX96: bigint;
        if (isPoolInitialized && slot0Data) {
          currentTick = Number(slot0Data[1]);
          currentSqrtPriceX96 = slot0Data[0];
        } else if (
          !isPoolInitialized &&
          initialPrice &&
          tickSpacing &&
          initialPriceDirection !== undefined
        ) {
          currentSqrtPriceX96 = priceToSqrtPriceX96(
            Number(initialPrice),
            currency0Decimals,
            currency1Decimals,
            initialPriceDirection
          );
          currentTick = sqrtPriceX96ToTick(currentSqrtPriceX96);
        } else {
          setIsCalculating(false);
          setCalculatingField(null);
          return;
        }
        const tickLowerNum = parseInt(tickLower || "0");
        const tickUpperNum = parseInt(tickUpper || "0");
        if (isNaN(tickLowerNum) || isNaN(tickUpperNum)) {
          setIsCalculating(false);
          setCalculatingField(null);
          return;
        }
        const calculationPromise = new Promise<string>((resolve) => {
          const calculatedAmount1 = calculateAmount1FromAmount0(
            amount0,
            currentTick,
            currentSqrtPriceX96,
            tickLowerNum,
            tickUpperNum,
            currency0Decimals,
            currency1Decimals
          );
          resolve(calculatedAmount1);
        });
        const minLoadingPromise = new Promise((resolve) =>
          setTimeout(resolve, 300)
        );
        const [calculatedAmount1] = await Promise.all([
          calculationPromise,
          minLoadingPromise,
        ]);
        if (calculatedAmount1 && calculatedAmount1 !== amount1)
          setAmount1(calculatedAmount1);
      } catch (error) {
        console.error("Error in amount0 calculation effect:", error);
      } finally {
        setIsCalculating(false);
        setCalculatingField(null);
      }
    }, 500);
    return () => {
      clearTimeout(timeoutId);
      setIsCalculating(false);
      setCalculatingField(null);
    };
  }, [
    amount0,
    lastUpdatedField,
    currency0Decimals,
    currency1Decimals,
    isPoolInitialized,
    initialPrice,
    initialPriceDirection,
    slot0Data,
    tickLower,
    tickUpper,
    tickSpacing,
    calculateAmount1FromAmount0,
    setAmount1,
    amount1,
  ]);

  useEffect(() => {
    if (
      lastUpdatedField !== "amount1" ||
      currency0Decimals === undefined ||
      currency1Decimals === undefined ||
      (!isPoolInitialized && !initialPrice)
    )
      return;
    setIsCalculating(true);
    setCalculatingField("amount0");
    const timeoutId = setTimeout(async () => {
      try {
        let currentTick: number;
        let currentSqrtPriceX96: bigint;
        if (isPoolInitialized && slot0Data) {
          currentTick = Number(slot0Data[1]);
          currentSqrtPriceX96 = slot0Data[0];
        } else if (
          !isPoolInitialized &&
          initialPrice &&
          tickSpacing &&
          initialPriceDirection !== undefined
        ) {
          currentSqrtPriceX96 = priceToSqrtPriceX96(
            Number(initialPrice),
            currency0Decimals,
            currency1Decimals,
            initialPriceDirection
          );
          currentTick = sqrtPriceX96ToTick(currentSqrtPriceX96);
        } else {
          setIsCalculating(false);
          setCalculatingField(null);
          return;
        }
        const tickLowerNum = parseInt(tickLower || "0");
        const tickUpperNum = parseInt(tickUpper || "0");
        if (isNaN(tickLowerNum) || isNaN(tickUpperNum)) {
          setIsCalculating(false);
          setCalculatingField(null);
          return;
        }
        const calculationPromise = new Promise<string>((resolve) => {
          const calculatedAmount0 = calculateAmount0FromAmount1(
            amount1,
            currentTick,
            currentSqrtPriceX96,
            tickLowerNum,
            tickUpperNum,
            currency0Decimals,
            currency1Decimals
          );
          resolve(calculatedAmount0);
        });
        const minLoadingPromise = new Promise((resolve) =>
          setTimeout(resolve, 300)
        );
        const [calculatedAmount0] = await Promise.all([
          calculationPromise,
          minLoadingPromise,
        ]);
        if (calculatedAmount0 && calculatedAmount0 !== amount0)
          setAmount0(calculatedAmount0);
      } catch (error) {
        console.error("Error in amount1 calculation effect:", error);
      } finally {
        setIsCalculating(false);
        setCalculatingField(null);
      }
    }, 500);
    return () => {
      clearTimeout(timeoutId);
      setIsCalculating(false);
      setCalculatingField(null);
    };
  }, [
    amount1,
    lastUpdatedField,
    currency0Decimals,
    currency1Decimals,
    isPoolInitialized,
    initialPrice,
    initialPriceDirection,
    slot0Data,
    tickLower,
    tickUpper,
    tickSpacing,
    calculateAmount0FromAmount1,
    setAmount0,
    amount0,
  ]);

  return {
    lastUpdatedField,
    setLastUpdatedField,
    isCalculating,
    calculatingField,
    setIsCalculating,
    setCalculatingField,
  };
};
