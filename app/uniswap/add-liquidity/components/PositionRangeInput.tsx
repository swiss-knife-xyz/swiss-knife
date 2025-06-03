import { useState, useEffect, useRef } from "react";
import { Box, Button, Input, Text, VStack } from "@chakra-ui/react";
import {
  isValidNumericInput,
  priceRatioToTick,
  tickToPriceRatio,
} from "../lib/utils"; // Adjust path, ADD priceRatioToTick, tickToPriceRatio

interface PositionRangeInputProps {
  priceInputMode: boolean;
  setPriceInputMode: (value: boolean) => void;
  currency0Decimals?: number;
  currency1Decimals?: number;
  lowerPrice: string;
  setLowerPrice: (value: string) => void;
  upperPrice: string;
  setUpperPrice: (value: string) => void;
  tickLower: string;
  setTickLower: (value: string) => void;
  tickUpper: string;
  setTickUpper: (value: string) => void;
  priceDirection: boolean;
  setPriceDirection: (value: boolean) => void;
  currency0Symbol?: string;
  currency1Symbol?: string;
  tickSpacing?: number;
}

export const PositionRangeInput: React.FC<PositionRangeInputProps> = ({
  priceInputMode,
  setPriceInputMode,
  currency0Decimals,
  currency1Decimals,
  lowerPrice,
  setLowerPrice,
  upperPrice,
  setUpperPrice,
  tickLower,
  setTickLower,
  tickUpper,
  setTickUpper,
  priceDirection,
  setPriceDirection,
  currency0Symbol,
  currency1Symbol,
  tickSpacing,
}) => {
  const [tempLowerPrice, setTempLowerPrice] = useState<string>(lowerPrice);
  const [tempUpperPrice, setTempUpperPrice] = useState<string>(upperPrice);

  // Add ref to track internal updates to prevent circular dependencies
  const isInternalUpdate = useRef(false);

  useEffect(() => {
    setTempLowerPrice(lowerPrice);
  }, [lowerPrice]);

  useEffect(() => {
    setTempUpperPrice(upperPrice);
  }, [upperPrice]);

  // Update tick values when price inputs change (only if not from internal update)
  useEffect(() => {
    if (
      priceInputMode &&
      currency0Decimals &&
      currency1Decimals &&
      lowerPrice &&
      upperPrice &&
      tickSpacing !== undefined &&
      !isInternalUpdate.current // prevent circular updates
    ) {
      isInternalUpdate.current = true;
      const lowerTickNum = priceRatioToTick(
        lowerPrice,
        priceDirection,
        currency0Decimals,
        currency1Decimals,
        tickSpacing
      );
      const upperTickNum = priceRatioToTick(
        upperPrice,
        priceDirection,
        currency0Decimals,
        currency1Decimals,
        tickSpacing
      );
      const finalLowerTick = Math.min(lowerTickNum, upperTickNum);
      const finalUpperTick = Math.max(lowerTickNum, upperTickNum);
      setTickLower(finalLowerTick.toString());
      setTickUpper(finalUpperTick.toString());
      // Reset flag after a brief delay to allow the update to complete
      setTimeout(() => {
        isInternalUpdate.current = false;
      }, 0);
    }
  }, [
    priceInputMode,
    lowerPrice,
    upperPrice,
    priceDirection,
    currency0Decimals,
    currency1Decimals,
    setTickLower,
    setTickUpper,
    tickSpacing,
  ]);

  // Update price inputs when switching to price mode or when ticks change (only if not from internal update)
  useEffect(() => {
    if (
      priceInputMode &&
      currency0Decimals &&
      currency1Decimals &&
      tickLower &&
      tickUpper &&
      !isInternalUpdate.current // prevent circular updates
    ) {
      isInternalUpdate.current = true;
      const lowerTickNum = parseInt(tickLower);
      const upperTickNum = parseInt(tickUpper);
      if (!isNaN(lowerTickNum) && !isNaN(upperTickNum)) {
        const lowerPriceCalc = tickToPriceRatio(
          lowerTickNum,
          priceDirection,
          currency0Decimals,
          currency1Decimals
        );
        const upperPriceCalc = tickToPriceRatio(
          upperTickNum,
          priceDirection,
          currency0Decimals,
          currency1Decimals
        );
        const finalLowerPrice = Math.min(lowerPriceCalc, upperPriceCalc);
        const finalUpperPrice = Math.max(lowerPriceCalc, upperPriceCalc);
        // Update actual controlled state for parent
        setLowerPrice(finalLowerPrice.toFixed(6));
        setUpperPrice(finalUpperPrice.toFixed(6));
        // Also update temp state for local input fields to match
        setTempLowerPrice(finalLowerPrice.toFixed(6));
        setTempUpperPrice(finalUpperPrice.toFixed(6));
      }
      // Reset flag after a brief delay to allow the update to complete
      setTimeout(() => {
        isInternalUpdate.current = false;
      }, 0);
    }
  }, [
    priceInputMode,
    priceDirection,
    currency0Decimals,
    currency1Decimals,
    tickLower,
    tickUpper,
    setLowerPrice, // Prop for parent state
    setUpperPrice, // Prop for parent state
  ]);

  const handleLowerPriceBlur = () => {
    if (
      tempLowerPrice !== lowerPrice &&
      currency0Decimals &&
      currency1Decimals &&
      tickSpacing
    ) {
      setLowerPrice(tempLowerPrice);
    }
  };

  const handleUpperPriceBlur = () => {
    if (
      tempUpperPrice !== upperPrice &&
      currency0Decimals &&
      currency1Decimals &&
      tickSpacing
    ) {
      setUpperPrice(tempUpperPrice);
    }
  };

  return (
    <VStack align="stretch" spacing={4}>
      <Box>
        <Text fontWeight="bold" mb={2}>
          Position Range:
        </Text>
        <Button
          colorScheme="purple"
          variant={priceInputMode ? "solid" : "outline"}
          onClick={() => setPriceInputMode(!priceInputMode)}
          size="sm"
          mb={3}
        >
          {priceInputMode ? "📈 Price Mode" : "🔢 Tick Mode"}
        </Button>
        {priceInputMode && currency0Decimals && currency1Decimals && (
          <Button
            colorScheme="blue"
            variant="outline"
            onClick={() => {
              const currentLower = parseFloat(tempLowerPrice);
              const currentUpper = parseFloat(tempUpperPrice);
              if (
                !isNaN(currentLower) &&
                !isNaN(currentUpper) &&
                currentLower > 0 &&
                currentUpper > 0
              ) {
                const newLowerPrice = 1 / currentUpper;
                const newUpperPrice = 1 / currentLower;
                const formattedLower = newLowerPrice.toFixed(8);
                const formattedUpper = newUpperPrice.toFixed(8);
                setTempLowerPrice(formattedLower);
                setTempUpperPrice(formattedUpper);
                setLowerPrice(formattedLower);
                setUpperPrice(formattedUpper);
              }
              setPriceDirection(!priceDirection);
            }}
            size="sm"
            ml={2}
            mb={3}
          >
            {priceDirection
              ? `${currency1Symbol || "Currency1"} per ${
                  currency0Symbol || "Currency0"
                }`
              : `${currency0Symbol || "Currency0"} per ${
                  currency1Symbol || "Currency1"
                }`}
          </Button>
        )}
      </Box>

      {priceInputMode ? (
        <VStack align="stretch" spacing={3}>
          <Box>
            <Text fontSize="sm" mb={1}>
              Lower Price (
              {priceDirection
                ? `${currency1Symbol || "Currency1"} per ${
                    currency0Symbol || "Currency0"
                  }`
                : `${currency0Symbol || "Currency0"} per ${
                    currency1Symbol || "Currency1"
                  }`}
              ):
            </Text>
            <Input
              value={tempLowerPrice}
              onChange={(e) => {
                if (isValidNumericInput(e.target.value)) {
                  setTempLowerPrice(e.target.value);
                }
              }}
              placeholder={`e.g., ${priceDirection ? "2000" : "0.0005"}`}
              onBlur={handleLowerPriceBlur}
            />
            <Text fontSize="xs" color="gray.400" mt={1}>
              Tick: {tickLower}
            </Text>
          </Box>
          <Box>
            <Text fontSize="sm" mb={1}>
              Upper Price (
              {priceDirection
                ? `${currency1Symbol || "Currency1"} per ${
                    currency0Symbol || "Currency0"
                  }`
                : `${currency0Symbol || "Currency0"} per ${
                    currency1Symbol || "Currency1"
                  }`}
              ):
            </Text>
            <Input
              value={tempUpperPrice}
              onChange={(e) => {
                if (isValidNumericInput(e.target.value)) {
                  setTempUpperPrice(e.target.value);
                }
              }}
              placeholder={`e.g., ${priceDirection ? "4000" : "0.0003"}`}
              onBlur={handleUpperPriceBlur}
            />
            <Text fontSize="xs" color="gray.400" mt={1}>
              Tick: {tickUpper}
            </Text>
          </Box>
        </VStack>
      ) : (
        <VStack align="stretch" spacing={3}>
          <Box>
            <Text fontSize="sm" mb={1}>
              Lower Tick:
            </Text>
            <Input
              value={tickLower}
              onChange={(e) => {
                if (isValidNumericInput(e.target.value)) {
                  setTickLower(e.target.value);
                }
              }}
              placeholder="Enter lower tick (e.g., -887220)"
            />
          </Box>
          <Box>
            <Text fontSize="sm" mb={1}>
              Upper Tick:
            </Text>
            <Input
              value={tickUpper}
              onChange={(e) => {
                if (isValidNumericInput(e.target.value)) {
                  setTickUpper(e.target.value);
                }
              }}
              placeholder="Enter upper tick (e.g., 887220)"
            />
          </Box>
        </VStack>
      )}

      {priceInputMode && (!currency0Decimals || !currency1Decimals) && (
        <Text fontSize="sm" color="yellow.400">
          ⚠️ Please enter valid token addresses to use price mode
        </Text>
      )}
    </VStack>
  );
};
