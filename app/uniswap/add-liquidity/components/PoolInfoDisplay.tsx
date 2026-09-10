import {
  Box,
  Button,
  Heading,
  Text,
  HStack,
  VStack,
  Badge,
  Flex,
  Icon,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";
import {
  FiRefreshCw,
  FiTrendingUp,
  FiActivity,
  FiInfo,
  FiAlertTriangle,
} from "react-icons/fi";

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
  const poolInteractionDisabled =
    !currency0 || !currency1 || !isChainSupported || !poolId;

  return (
    <Box
      p={4}
      bg="whiteAlpha.50"
      borderRadius="lg"
      border="1px solid"
      borderColor="whiteAlpha.200"
    >
      <VStack spacing={4} align="stretch">
        {/* Header with Button */}
        <HStack spacing={4} align="center">
          <HStack spacing={2} align="center">
            <Icon as={FiInfo} color="purple.400" boxSize={6} />
            <Heading size="md" color="gray.300">
              Pool Information
            </Heading>
          </HStack>

          <Button
            colorScheme="purple"
            onClick={fetchPoolInfo}
            isLoading={isSlot0Loading}
            loadingText="Fetching..."
            isDisabled={poolInteractionDisabled}
            leftIcon={<Icon as={FiRefreshCw} boxSize={3} />}
            size="xs"
          >
            Fetch
          </Button>
        </HStack>

        {/* Pool Status */}
        {isPoolInitialized !== undefined && (
          <Box>
            <HStack spacing={2} align="center" mb={2}>
              <Icon as={FiActivity} color="gray.400" boxSize={4} />
              <Text fontSize="sm" color="gray.400">
                Pool Status:
              </Text>
              <Badge
                colorScheme={isPoolInitialized ? "green" : "red"}
                fontSize="xs"
                px={2}
                py={0.5}
              >
                {isPoolInitialized ? "Initialized" : "Not Initialized"}
              </Badge>
            </HStack>

            {!isPoolInitialized && (
              <Alert
                status="warning"
                size="sm"
                bg="yellow.900"
                borderColor="yellow.600"
              >
                <AlertIcon />
                <Text fontSize="xs" color="yellow.200">
                  Pool needs to be initialized first
                </Text>
              </Alert>
            )}
          </Box>
        )}

        {/* Current Tick */}
        {currentTick !== undefined && (
          <HStack spacing={2} align="center">
            <Icon as={FiActivity} color="gray.400" boxSize={3} />
            <Text fontSize="sm" color="gray.400">
              Current Tick:
            </Text>
            <Badge colorScheme="blue" fontSize="xs" px={2} py={0.5}>
              {currentTick}
            </Badge>
          </HStack>
        )}

        {/* SqrtPriceX96 (Technical Info) */}
        {currentSqrtPriceX96 && (
          <HStack spacing={2} align="center">
            <Icon as={FiActivity} color="gray.400" boxSize={3} />
            <Text fontSize="sm" color="gray.400">
              SqrtPriceX96:
            </Text>
            <Text fontSize="xs" color="gray.500" fontFamily="mono">
              {currentSqrtPriceX96}
            </Text>
          </HStack>
        )}

        {/* Current Pool Prices */}
        {(currentZeroForOnePrice || currentOneForZeroPrice) && (
          <Box>
            <HStack spacing={2} align="center" mb={3}>
              <Icon as={FiTrendingUp} color="blue.400" boxSize={4} />
              <Text fontSize="sm" fontWeight="medium" color="gray.300">
                Current Pool Prices
              </Text>
            </HStack>

            <HStack spacing={3} align="stretch">
              {currentZeroForOnePrice && (
                <Flex
                  justify="space-between"
                  align="center"
                  bg="whiteAlpha.50"
                  px={3}
                  py={2}
                  borderRadius="md"
                  border="1px solid"
                  borderColor="whiteAlpha.100"
                  flex={1}
                >
                  <Text color="gray.300" fontSize="sm">
                    1 {currency0Symbol || "Currency0"} =
                  </Text>
                  <HStack spacing={1}>
                    <Text fontWeight="bold" color="blue.300" fontSize="sm">
                      {currentZeroForOnePrice}
                    </Text>
                    <Text fontSize="xs" color="gray.400">
                      {currency1Symbol || "Currency1"}
                    </Text>
                  </HStack>
                </Flex>
              )}

              {currentOneForZeroPrice && (
                <Flex
                  justify="space-between"
                  align="center"
                  bg="whiteAlpha.50"
                  px={3}
                  py={2}
                  borderRadius="md"
                  border="1px solid"
                  borderColor="whiteAlpha.100"
                  flex={1}
                >
                  <Text color="gray.300" fontSize="sm">
                    1 {currency1Symbol || "Currency1"} =
                  </Text>
                  <HStack spacing={1}>
                    <Text fontWeight="bold" color="green.300" fontSize="sm">
                      {currentOneForZeroPrice}
                    </Text>
                    <Text fontSize="xs" color="gray.400">
                      {currency0Symbol || "Currency0"}
                    </Text>
                  </HStack>
                </Flex>
              )}
            </HStack>
          </Box>
        )}
      </VStack>
    </Box>
  );
};
