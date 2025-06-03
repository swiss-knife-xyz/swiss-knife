import { Box, Button, Heading, Text, Tr, Td } from "@chakra-ui/react";

interface PoolInfoDisplayProps {
  isPoolInitialized?: boolean;
  currentSqrtPriceX96?: string;
  currentTick?: number;
  currentZeroForOnePrice?: string;
  currentOneForZeroPrice?: string;
  currency0Symbol?: string;
  currency1Symbol?: string;
  fetchPoolInfo: () => void;
  isSlot0Loading: boolean;
  poolId: string | null; // Assuming PoolId is string or null
  isChainSupported?: boolean;
  currency0: string;
  currency1: string;
}

export const PoolInfoDisplay: React.FC<PoolInfoDisplayProps> = ({
  isPoolInitialized,
  currentSqrtPriceX96,
  currentTick,
  currentZeroForOnePrice,
  currentOneForZeroPrice,
  currency0Symbol,
  currency1Symbol,
  fetchPoolInfo,
  isSlot0Loading,
  poolId,
  isChainSupported,
  currency0,
  currency1,
}) => {
  return (
    <>
      <Tr>
        <Td colSpan={2}>
          <Heading size={"md"} mb={4}>
            Pool Information:
          </Heading>
          <Button
            colorScheme="blue"
            onClick={fetchPoolInfo}
            mb={4}
            isLoading={isSlot0Loading}
            loadingText="Fetching pool info..."
            isDisabled={
              !currency0 || !currency1 || !isChainSupported || !poolId
            }
          >
            Fetch Pool Information
          </Button>

          {isPoolInitialized !== undefined && (
            <Box mb={4}>
              <Text>
                Pool Status:{" "}
                <Box
                  as="span"
                  color={isPoolInitialized ? "green.400" : "red.400"}
                  fontWeight="bold"
                >
                  {isPoolInitialized ? "Initialized" : "Not Initialized"}
                </Box>
              </Text>
              {!isPoolInitialized && (
                <Text fontSize="sm" color="yellow.400" mt={1}>
                  ⚠️ Pool needs to be initialized first
                </Text>
              )}
            </Box>
          )}

          {currentTick !== undefined && (
            <Box mb={4}>
              <Text fontSize="sm" color="gray.400">
                Current Tick: {currentTick}
              </Text>
            </Box>
          )}

          {currentSqrtPriceX96 && (
            <Box mb={4}>
              <Text fontSize="sm" color="gray.400">
                Current sqrtPriceX96: {currentSqrtPriceX96}
              </Text>
            </Box>
          )}
        </Td>
      </Tr>
      {(currentZeroForOnePrice || currentOneForZeroPrice) && (
        <>
          {currentZeroForOnePrice && (
            <Tr>
              <Td>1 {currency0Symbol || "Currency0"} =</Td>
              <Td>
                <Box fontWeight="bold">
                  {currentZeroForOnePrice} {currency1Symbol || "Currency1"}
                </Box>
              </Td>
            </Tr>
          )}
          {currentOneForZeroPrice && (
            <Tr>
              <Td>1 {currency1Symbol || "Currency1"} =</Td>
              <Td>
                <Box fontWeight="bold">
                  {currentOneForZeroPrice} {currency0Symbol || "Currency0"}
                </Box>
              </Td>
            </Tr>
          )}
        </>
      )}
    </>
  );
};
