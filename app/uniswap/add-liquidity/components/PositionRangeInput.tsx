import { useState, useEffect, useRef } from "react";
import {
  Box,
  Button,
  Input,
  Text,
  VStack,
  HStack,
  IconButton,
} from "@chakra-ui/react";
import { AddIcon, MinusIcon } from "@chakra-ui/icons";
import {
  isValidNumericInput,
  priceRatioToTick,
  tickToPriceRatio,
} from "../lib/utils";

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

  // Handle mode switching with immediate conversion
  const handleModeSwitch = () => {
    const newMode = !priceInputMode;

    if (currency0Decimals && currency1Decimals && tickSpacing !== undefined) {
      if (newMode) {
        // Switching TO price mode - convert current ticks to prices
        if (tickLower && tickUpper) {
          console.log("Converting ticks to prices:", tickLower, tickUpper);
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

            const precision = Math.max(
              priceDirection ? currency1Decimals : currency0Decimals,
              8 // Minimum 8 decimal places for very small values
            );

            const formattedLowerPrice = finalLowerPrice.toFixed(precision);
            const formattedUpperPrice = finalUpperPrice.toFixed(precision);

            console.log(
              "Setting prices:",
              formattedLowerPrice,
              formattedUpperPrice
            );
            setLowerPrice(formattedLowerPrice);
            setUpperPrice(formattedUpperPrice);
            setTempLowerPrice(formattedLowerPrice);
            setTempUpperPrice(formattedUpperPrice);
          }
        }
      } else {
        // Switching TO tick mode - convert current prices to ticks
        if (lowerPrice && upperPrice) {
          console.log("Converting prices to ticks:", lowerPrice, upperPrice);
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
          console.log("Setting ticks:", finalLowerTick, finalUpperTick);
          setTickLower(finalLowerTick.toString());
          setTickUpper(finalUpperTick.toString());
        }
      }
    }

    // Set the new mode after conversion
    setPriceInputMode(newMode);
  };

  // Update tick values when price inputs change in price mode
  useEffect(() => {
    if (
      priceInputMode &&
      currency0Decimals &&
      currency1Decimals &&
      lowerPrice &&
      upperPrice &&
      tickSpacing !== undefined &&
      !isInternalUpdate.current
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
      setTimeout(() => {
        isInternalUpdate.current = false;
      }, 0);
    }
  }, [
    lowerPrice,
    upperPrice,
    priceDirection,
    currency0Decimals,
    currency1Decimals,
    setTickLower,
    setTickUpper,
    tickSpacing,
    priceInputMode,
  ]);

  // Update price inputs when ticks change in price mode (for live updates)
  useEffect(() => {
    if (
      priceInputMode &&
      currency0Decimals &&
      currency1Decimals &&
      tickLower &&
      tickUpper &&
      !isInternalUpdate.current
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

        const precision = Math.max(
          priceDirection ? currency1Decimals : currency0Decimals,
          8
        );

        const formattedLowerPrice = finalLowerPrice.toFixed(precision);
        const formattedUpperPrice = finalUpperPrice.toFixed(precision);

        setLowerPrice(formattedLowerPrice);
        setUpperPrice(formattedUpperPrice);
        setTempLowerPrice(formattedLowerPrice);
        setTempUpperPrice(formattedUpperPrice);
      }
      setTimeout(() => {
        isInternalUpdate.current = false;
      }, 0);
    }
  }, [
    tickLower,
    tickUpper,
    priceDirection,
    currency0Decimals,
    currency1Decimals,
    setLowerPrice,
    setUpperPrice,
    priceInputMode,
  ]);

  // Define consistent colors for lower and upper ticks
  const lowerTickColor = "red.300";
  const upperTickColor = "green.300";

  // Helper function to get the tick that corresponds to the lower price
  const getTickForPrice = (isLowerPrice: boolean): string => {
    if (!currency0Decimals || !currency1Decimals || !tickLower || !tickUpper) {
      return "";
    }

    const lowerTickNum = parseInt(tickLower);
    const upperTickNum = parseInt(tickUpper);

    if (isNaN(lowerTickNum) || isNaN(upperTickNum)) {
      return "";
    }

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

    // Determine which tick corresponds to the lower price
    const lowerPriceTickIsLowerTick = lowerPriceCalc <= upperPriceCalc;

    if (isLowerPrice) {
      return lowerPriceTickIsLowerTick ? tickLower : tickUpper;
    } else {
      return lowerPriceTickIsLowerTick ? tickUpper : tickLower;
    }
  };

  // Helper function to get the color for price tick display
  const getTickColor = (isLowerPrice: boolean): string => {
    if (!currency0Decimals || !currency1Decimals || !tickLower || !tickUpper) {
      return "gray.400";
    }

    const lowerTickNum = parseInt(tickLower);
    const upperTickNum = parseInt(tickUpper);

    if (isNaN(lowerTickNum) || isNaN(upperTickNum)) {
      return "gray.400";
    }

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

    // Determine which tick corresponds to the lower price
    const lowerPriceTickIsLowerTick = lowerPriceCalc <= upperPriceCalc;

    if (isLowerPrice) {
      return lowerPriceTickIsLowerTick ? lowerTickColor : upperTickColor;
    } else {
      return lowerPriceTickIsLowerTick ? upperTickColor : lowerTickColor;
    }
  };

  // Helper function to get the correct tick label based on actual tick values
  const getTickLabel = (isLowerPrice: boolean): string => {
    if (!currency0Decimals || !currency1Decimals || !tickLower || !tickUpper) {
      return "Tick";
    }

    const lowerTickNum = parseInt(tickLower);
    const upperTickNum = parseInt(tickUpper);

    if (isNaN(lowerTickNum) || isNaN(upperTickNum)) {
      return "Tick";
    }

    const tickForThisPrice = getTickForPrice(isLowerPrice);
    const tickValue = parseInt(tickForThisPrice);

    // Determine if this tick is the numerically lower or upper tick
    if (tickValue === Math.min(lowerTickNum, upperTickNum)) {
      return "Lower Tick";
    } else {
      return "Upper Tick";
    }
  };

  const handleLowerPriceBlur = () => {
    if (currency0Decimals && currency1Decimals && tickSpacing !== undefined) {
      const tempNum = parseFloat(tempLowerPrice);
      const currentNum = parseFloat(lowerPrice);
      // Only update if the numbers are actually different (avoid precision comparison issues)
      if (
        !isNaN(tempNum) &&
        (isNaN(currentNum) || Math.abs(tempNum - currentNum) > 1e-15)
      ) {
        setLowerPrice(tempLowerPrice);
      }
    }
  };

  const handleUpperPriceBlur = () => {
    if (currency0Decimals && currency1Decimals && tickSpacing !== undefined) {
      const tempNum = parseFloat(tempUpperPrice);
      const currentNum = parseFloat(upperPrice);
      // Only update if the numbers are actually different (avoid precision comparison issues)
      if (
        !isNaN(tempNum) &&
        (isNaN(currentNum) || Math.abs(tempNum - currentNum) > 1e-15)
      ) {
        setUpperPrice(tempUpperPrice);
      }
    }
  };

  const handleLowerTickBlur = () => {
    if (tickSpacing !== undefined) {
      const tickNum = parseInt(tickLower);
      if (!isNaN(tickNum)) {
        // Round to nearest valid tick based on tick spacing
        const roundedTick = Math.round(tickNum / tickSpacing) * tickSpacing;

        // Calculate the maximum valid tick that's divisible by tickSpacing and within bounds
        const maxValidTick = Math.floor(887272 / tickSpacing) * tickSpacing;
        const minValidTick = Math.ceil(-887272 / tickSpacing) * tickSpacing;

        const clampedTick = Math.max(
          minValidTick,
          Math.min(maxValidTick, roundedTick)
        );
        if (clampedTick !== tickNum) {
          setTickLower(clampedTick.toString());
        }
      }
    }
  };

  const handleUpperTickBlur = () => {
    if (tickSpacing !== undefined) {
      const tickNum = parseInt(tickUpper);
      if (!isNaN(tickNum)) {
        // Round to nearest valid tick based on tick spacing
        const roundedTick = Math.round(tickNum / tickSpacing) * tickSpacing;

        // Calculate the maximum valid tick that's divisible by tickSpacing and within bounds
        const maxValidTick = Math.floor(887272 / tickSpacing) * tickSpacing;
        const minValidTick = Math.ceil(-887272 / tickSpacing) * tickSpacing;

        const clampedTick = Math.max(
          minValidTick,
          Math.min(maxValidTick, roundedTick)
        );
        if (clampedTick !== tickNum) {
          setTickUpper(clampedTick.toString());
        }
      }
    }
  };

  // Add increment/decrement functions for ticks
  const incrementTick = (currentTick: string, isUpper: boolean) => {
    if (tickSpacing === undefined) return;

    const tickNum = parseInt(currentTick) || 0;
    const newTick = tickNum + tickSpacing;

    // Calculate the maximum valid tick that's divisible by tickSpacing and within bounds
    const maxValidTick = Math.floor(887272 / tickSpacing) * tickSpacing;
    const minValidTick = Math.ceil(-887272 / tickSpacing) * tickSpacing;

    const clampedTick = Math.max(minValidTick, Math.min(maxValidTick, newTick));

    if (isUpper) {
      setTickUpper(clampedTick.toString());
    } else {
      setTickLower(clampedTick.toString());
    }
  };

  const decrementTick = (currentTick: string, isUpper: boolean) => {
    if (tickSpacing === undefined) return;

    const tickNum = parseInt(currentTick) || 0;
    const newTick = tickNum - tickSpacing;

    // Calculate the maximum valid tick that's divisible by tickSpacing and within bounds
    const maxValidTick = Math.floor(887272 / tickSpacing) * tickSpacing;
    const minValidTick = Math.ceil(-887272 / tickSpacing) * tickSpacing;

    const clampedTick = Math.max(minValidTick, Math.min(maxValidTick, newTick));

    if (isUpper) {
      setTickUpper(clampedTick.toString());
    } else {
      setTickLower(clampedTick.toString());
    }
  };

  // Add increment/decrement functions for prices (work through tick conversion)
  const incrementPrice = (isUpper: boolean) => {
    if (!currency0Decimals || !currency1Decimals || tickSpacing === undefined)
      return;

    const currentPrice = isUpper ? tempUpperPrice : tempLowerPrice;
    if (!currentPrice) return;

    // Convert current price to tick
    const currentTick = priceRatioToTick(
      currentPrice,
      priceDirection,
      currency0Decimals,
      currency1Decimals,
      tickSpacing
    );

    // Increment tick
    const newTick = currentTick + tickSpacing;
    const clampedTick = Math.max(-887272, Math.min(887272, newTick));

    // Convert back to price
    const newPrice = tickToPriceRatio(
      clampedTick,
      priceDirection,
      currency0Decimals,
      currency1Decimals
    );

    const precision = Math.max(
      priceDirection ? currency1Decimals : currency0Decimals,
      8
    );

    const formattedPrice = newPrice.toFixed(precision);

    if (isUpper) {
      setTempUpperPrice(formattedPrice);
      setUpperPrice(formattedPrice);
    } else {
      setTempLowerPrice(formattedPrice);
      setLowerPrice(formattedPrice);
    }
  };

  const decrementPrice = (isUpper: boolean) => {
    if (!currency0Decimals || !currency1Decimals || tickSpacing === undefined)
      return;

    const currentPrice = isUpper ? tempUpperPrice : tempLowerPrice;
    if (!currentPrice) return;

    // Convert current price to tick
    const currentTick = priceRatioToTick(
      currentPrice,
      priceDirection,
      currency0Decimals,
      currency1Decimals,
      tickSpacing
    );

    // Decrement tick
    const newTick = currentTick - tickSpacing;
    const clampedTick = Math.max(-887272, Math.min(887272, newTick));

    // Convert back to price
    const newPrice = tickToPriceRatio(
      clampedTick,
      priceDirection,
      currency0Decimals,
      currency1Decimals
    );

    const precision = Math.max(
      priceDirection ? currency1Decimals : currency0Decimals,
      8
    );

    const formattedPrice = newPrice.toFixed(precision);

    if (isUpper) {
      setTempUpperPrice(formattedPrice);
      setUpperPrice(formattedPrice);
    } else {
      setTempLowerPrice(formattedPrice);
      setLowerPrice(formattedPrice);
    }
  };

  return (
    <VStack align="stretch" spacing={4}>
      <Box>
        <Text fontWeight="bold" mb={2}>
          Position Range:
        </Text>
        <Button
          colorScheme="blue"
          variant={priceInputMode ? "solid" : "outline"}
          onClick={handleModeSwitch}
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

                // Calculate precision for the new price direction
                const newPrecision = Math.max(
                  !priceDirection ? currency1Decimals : currency0Decimals,
                  8 // Minimum 8 decimal places for very small values
                );

                const formattedLower = newLowerPrice.toFixed(newPrecision);
                const formattedUpper = newUpperPrice.toFixed(newPrecision);
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
            <HStack spacing={1}>
              <IconButton
                aria-label="Decrease lower price"
                icon={<MinusIcon />}
                size="sm"
                onClick={() => decrementPrice(false)}
                isDisabled={
                  !currency0Decimals ||
                  !currency1Decimals ||
                  tickSpacing === undefined
                }
                colorScheme="gray"
                variant="outline"
              />
              <Input
                value={tempLowerPrice}
                onChange={(e) => {
                  if (isValidNumericInput(e.target.value)) {
                    setTempLowerPrice(e.target.value);
                  }
                }}
                placeholder={`e.g., ${priceDirection ? "2000" : "0.0005"}`}
                onBlur={handleLowerPriceBlur}
                flex={1}
              />
              <IconButton
                aria-label="Increase lower price"
                icon={<AddIcon />}
                size="sm"
                onClick={() => incrementPrice(false)}
                isDisabled={
                  !currency0Decimals ||
                  !currency1Decimals ||
                  tickSpacing === undefined
                }
                colorScheme="gray"
                variant="outline"
              />
            </HStack>
            <Text
              fontSize="xs"
              color={getTickColor(true)}
              mt={1}
              fontWeight="semibold"
            >
              {getTickLabel(true)}: {getTickForPrice(true)}
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
            <HStack spacing={1}>
              <IconButton
                aria-label="Decrease upper price"
                icon={<MinusIcon />}
                size="sm"
                onClick={() => decrementPrice(true)}
                isDisabled={
                  !currency0Decimals ||
                  !currency1Decimals ||
                  tickSpacing === undefined
                }
                colorScheme="gray"
                variant="outline"
              />
              <Input
                value={tempUpperPrice}
                onChange={(e) => {
                  if (isValidNumericInput(e.target.value)) {
                    setTempUpperPrice(e.target.value);
                  }
                }}
                placeholder={`e.g., ${priceDirection ? "4000" : "0.0003"}`}
                onBlur={handleUpperPriceBlur}
                flex={1}
              />
              <IconButton
                aria-label="Increase upper price"
                icon={<AddIcon />}
                size="sm"
                onClick={() => incrementPrice(true)}
                isDisabled={
                  !currency0Decimals ||
                  !currency1Decimals ||
                  tickSpacing === undefined
                }
                colorScheme="gray"
                variant="outline"
              />
            </HStack>
            <Text
              fontSize="xs"
              color={getTickColor(false)}
              mt={1}
              fontWeight="semibold"
            >
              {getTickLabel(false)}: {getTickForPrice(false)}
            </Text>
          </Box>
        </VStack>
      ) : (
        <VStack align="stretch" spacing={3}>
          <Box>
            <Text
              fontSize="sm"
              mb={1}
              color={lowerTickColor}
              fontWeight="semibold"
            >
              Lower Tick:
            </Text>
            <HStack spacing={1}>
              <IconButton
                aria-label="Decrease lower tick"
                icon={<MinusIcon />}
                size="sm"
                onClick={() => decrementTick(tickLower, false)}
                isDisabled={tickSpacing === undefined}
                colorScheme="gray"
                variant="outline"
              />
              <Input
                value={tickLower}
                onChange={(e) => {
                  if (isValidNumericInput(e.target.value)) {
                    setTickLower(e.target.value);
                  }
                }}
                placeholder="Enter lower tick (e.g., -887220)"
                onBlur={handleLowerTickBlur}
                color={lowerTickColor}
                fontWeight="semibold"
                flex={1}
              />
              <IconButton
                aria-label="Increase lower tick"
                icon={<AddIcon />}
                size="sm"
                onClick={() => incrementTick(tickLower, false)}
                isDisabled={tickSpacing === undefined}
                colorScheme="gray"
                variant="outline"
              />
            </HStack>
            {tickSpacing && (
              <Text fontSize="xs" color="gray.400" mt={1}>
                Must be divisible by {tickSpacing} (tick spacing)
              </Text>
            )}
          </Box>
          <Box>
            <Text
              fontSize="sm"
              mb={1}
              color={upperTickColor}
              fontWeight="semibold"
            >
              Upper Tick:
            </Text>
            <HStack spacing={1}>
              <IconButton
                aria-label="Decrease upper tick"
                icon={<MinusIcon />}
                size="sm"
                onClick={() => decrementTick(tickUpper, true)}
                isDisabled={tickSpacing === undefined}
                colorScheme="gray"
                variant="outline"
              />
              <Input
                value={tickUpper}
                onChange={(e) => {
                  if (isValidNumericInput(e.target.value)) {
                    setTickUpper(e.target.value);
                  }
                }}
                placeholder="Enter upper tick (e.g., 887220)"
                onBlur={handleUpperTickBlur}
                color={upperTickColor}
                fontWeight="semibold"
                flex={1}
              />
              <IconButton
                aria-label="Increase upper tick"
                icon={<AddIcon />}
                size="sm"
                onClick={() => incrementTick(tickUpper, true)}
                isDisabled={tickSpacing === undefined}
                colorScheme="gray"
                variant="outline"
              />
            </HStack>
            {tickSpacing && (
              <Text fontSize="xs" color="gray.400" mt={1}>
                Must be divisible by {tickSpacing} (tick spacing)
              </Text>
            )}
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
