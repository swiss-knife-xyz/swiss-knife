import { useState, useEffect, useCallback } from "react";
import { parseUnits, formatUnits } from "viem";
import { TickMath } from "@uniswap/v3-sdk";
import { Q96, Q192 } from "../lib/constants";
import { priceRatioToTick } from "../lib/utils";

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
      tickLowerNum: number,
      tickUpperNum: number,
      decimals0: number,
      decimals1: number
    ): string => {
      if (!amount0Input || amount0Input === "0" || isNaN(Number(amount0Input)))
        return "";
      try {
        const amount0Parsed = parseUnits(amount0Input, decimals0);
        const sqrtRatioCurrentX96 = BigInt(
          TickMath.getSqrtRatioAtTick(currentTick).toString()
        );
        let sqrtRatioLowerX96 = BigInt(
          TickMath.getSqrtRatioAtTick(tickLowerNum).toString()
        );
        let sqrtRatioUpperX96 = BigInt(
          TickMath.getSqrtRatioAtTick(tickUpperNum).toString()
        );
        if (sqrtRatioLowerX96 > sqrtRatioUpperX96) {
          [sqrtRatioLowerX96, sqrtRatioUpperX96] = [
            sqrtRatioUpperX96,
            sqrtRatioLowerX96,
          ];
        }
        let amount1Calculated: bigint;
        if (sqrtRatioCurrentX96 <= sqrtRatioLowerX96) {
          amount1Calculated = 0n;
        } else if (sqrtRatioCurrentX96 >= sqrtRatioUpperX96) {
          const ratio = (sqrtRatioUpperX96 * sqrtRatioUpperX96) / Q96;
          amount1Calculated = (amount0Parsed * ratio) / Q96;
        } else {
          const intermediate1 =
            (sqrtRatioUpperX96 *
              sqrtRatioCurrentX96 *
              (sqrtRatioCurrentX96 - sqrtRatioLowerX96)) /
            Q96;
          const intermediate2 =
            (Q192 * (sqrtRatioUpperX96 - sqrtRatioCurrentX96)) / Q96;
          if (intermediate2 > 0n)
            amount1Calculated = (amount0Parsed * intermediate1) / intermediate2;
          else amount1Calculated = 0n;
        }
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
      tickLowerNum: number,
      tickUpperNum: number,
      decimals0: number,
      decimals1: number
    ): string => {
      if (!amount1Input || amount1Input === "0" || isNaN(Number(amount1Input)))
        return "";
      try {
        const amount1Parsed = parseUnits(amount1Input, decimals1);
        const sqrtRatioCurrentX96 = BigInt(
          TickMath.getSqrtRatioAtTick(currentTick).toString()
        );
        let sqrtRatioLowerX96 = BigInt(
          TickMath.getSqrtRatioAtTick(tickLowerNum).toString()
        );
        let sqrtRatioUpperX96 = BigInt(
          TickMath.getSqrtRatioAtTick(tickUpperNum).toString()
        );
        if (sqrtRatioLowerX96 > sqrtRatioUpperX96) {
          [sqrtRatioLowerX96, sqrtRatioUpperX96] = [
            sqrtRatioUpperX96,
            sqrtRatioLowerX96,
          ];
        }
        let amount0Calculated: bigint;
        if (sqrtRatioCurrentX96 <= sqrtRatioLowerX96) {
          const ratio = (sqrtRatioLowerX96 * sqrtRatioLowerX96) / Q96;
          amount0Calculated = (amount1Parsed * Q96) / ratio;
        } else if (sqrtRatioCurrentX96 >= sqrtRatioUpperX96) {
          amount0Calculated = 0n;
        } else {
          const intermediate1 =
            (sqrtRatioUpperX96 *
              sqrtRatioCurrentX96 *
              (sqrtRatioCurrentX96 - sqrtRatioLowerX96)) /
            Q96;
          const intermediate2 =
            (Q192 * (sqrtRatioUpperX96 - sqrtRatioCurrentX96)) / Q96;
          if (intermediate1 > 0n)
            amount0Calculated = (amount1Parsed * intermediate2) / intermediate1;
          else amount0Calculated = 0n;
        }
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
      !currency0Decimals ||
      !currency1Decimals ||
      (!isPoolInitialized && !initialPrice)
    )
      return;
    setIsCalculating(true);
    setCalculatingField("amount1");
    const timeoutId = setTimeout(async () => {
      try {
        let currentTick: number;
        if (isPoolInitialized && slot0Data) currentTick = Number(slot0Data[1]);
        else if (
          !isPoolInitialized &&
          initialPrice &&
          tickSpacing &&
          initialPriceDirection !== undefined
        ) {
          currentTick = priceRatioToTick(
            initialPrice,
            initialPriceDirection,
            currency0Decimals,
            currency1Decimals,
            tickSpacing,
            false // Don't snap to nearest usable tick for calculation consistency
          );
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
      !currency0Decimals ||
      !currency1Decimals ||
      (!isPoolInitialized && !initialPrice)
    )
      return;
    setIsCalculating(true);
    setCalculatingField("amount0");
    const timeoutId = setTimeout(async () => {
      try {
        let currentTick: number;
        if (isPoolInitialized && slot0Data) currentTick = Number(slot0Data[1]);
        else if (
          !isPoolInitialized &&
          initialPrice &&
          tickSpacing &&
          initialPriceDirection !== undefined
        ) {
          currentTick = priceRatioToTick(
            initialPrice,
            initialPriceDirection,
            currency0Decimals,
            currency1Decimals,
            tickSpacing,
            false // Don't snap to nearest usable tick for calculation consistency
          );
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
