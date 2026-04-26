import React from "react";
import {
  Box,
  Grid,
  HStack,
  IconButton,
  Input,
  Text,
  VStack,
  Icon,
  Badge,
} from "@chakra-ui/react";
import { Address, Hex, zeroAddress } from "viem";
import { FiX } from "react-icons/fi";
import { PoolWithHookData } from "@/lib/uniswap/types";

interface PoolKeyFormProps {
  poolKey: PoolWithHookData;
  index: number;
  onUpdate: (index: number, poolKey: PoolWithHookData) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
  currencyInfoMap?: Map<Address, { symbol?: string; decimals?: number }>;
}

export const PoolKeyForm: React.FC<PoolKeyFormProps> = ({
  poolKey,
  index,
  onUpdate,
  onRemove,
  canRemove,
  currencyInfoMap,
}) => {
  const handleUpdate = (field: keyof PoolWithHookData, value: any) => {
    onUpdate(index, { ...poolKey, [field]: value });
  };

  const getCurrencyInfo = (currency: Address) => {
    if (currency === zeroAddress) {
      return { symbol: "ETH", decimals: 18 };
    }
    return currencyInfoMap?.get(currency);
  };

  return (
    <Box
      p={4}
      bg="whiteAlpha.50"
      borderRadius="lg"
      border="1px solid"
      borderColor="whiteAlpha.200"
    >
      <VStack spacing={4} align="stretch">
        <HStack justify="space-between" align="center">
          <Text color="gray.300" fontWeight="medium" fontSize="sm">
            Pool {index + 1}
          </Text>
          {canRemove && (
            <IconButton
              aria-label="Remove pool"
              icon={<FiX />}
              size="sm"
              colorScheme="red"
              variant="ghost"
              onClick={() => onRemove(index)}
            />
          )}
        </HStack>

        <Grid templateColumns="1fr 1fr" gap={4}>
          <Box>
            <HStack justify="space-between" align="center" mb={1}>
              <Text color="gray.400" fontSize="xs">
                Currency 0
              </Text>
              {poolKey.currency0 && (
                <Badge colorScheme="blue" fontSize="xs" px={2} py={0.5}>
                  {getCurrencyInfo(poolKey.currency0)?.symbol || "Unknown"}
                </Badge>
              )}
            </HStack>
            <Input
              placeholder="0x... or use 0x0000000000000000000000000000000000000000 for ETH"
              value={poolKey.currency0}
              onChange={(e) =>
                handleUpdate("currency0", e.target.value as Address)
              }
              bg="whiteAlpha.50"
              border="1px solid"
              borderColor="whiteAlpha.200"
              _hover={{ borderColor: "whiteAlpha.300" }}
              _focus={{
                borderColor: "blue.400",
                boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
              }}
              color="gray.100"
              _placeholder={{ color: "gray.500" }}
              fontSize="sm"
            />
          </Box>
          <Box>
            <HStack justify="space-between" align="center" mb={1}>
              <Text color="gray.400" fontSize="xs">
                Currency 1
              </Text>
              {poolKey.currency1 && (
                <Badge colorScheme="green" fontSize="xs" px={2} py={0.5}>
                  {getCurrencyInfo(poolKey.currency1)?.symbol || "Unknown"}
                </Badge>
              )}
            </HStack>
            <Input
              placeholder="0x..."
              value={poolKey.currency1}
              onChange={(e) =>
                handleUpdate("currency1", e.target.value as Address)
              }
              bg="whiteAlpha.50"
              border="1px solid"
              borderColor="whiteAlpha.200"
              _hover={{ borderColor: "whiteAlpha.300" }}
              _focus={{
                borderColor: "blue.400",
                boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
              }}
              color="gray.100"
              _placeholder={{ color: "gray.500" }}
              fontSize="sm"
            />
          </Box>
        </Grid>

        <Grid templateColumns="1fr 1fr" gap={4}>
          <Box>
            <Text color="gray.400" fontSize="xs" mb={1}>
              Fee
            </Text>
            <Input
              type="number"
              placeholder="3000"
              value={poolKey.fee}
              onChange={(e) =>
                handleUpdate("fee", parseInt(e.target.value) || 0)
              }
              bg="whiteAlpha.50"
              border="1px solid"
              borderColor="whiteAlpha.200"
              _hover={{ borderColor: "whiteAlpha.300" }}
              _focus={{
                borderColor: "blue.400",
                boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
              }}
              color="gray.100"
              _placeholder={{ color: "gray.500" }}
              fontSize="sm"
            />
          </Box>
          <Box>
            <Text color="gray.400" fontSize="xs" mb={1}>
              Tick Spacing
            </Text>
            <Input
              type="number"
              placeholder="60"
              value={poolKey.tickSpacing}
              onChange={(e) =>
                handleUpdate("tickSpacing", parseInt(e.target.value) || 0)
              }
              bg="whiteAlpha.50"
              border="1px solid"
              borderColor="whiteAlpha.200"
              _hover={{ borderColor: "whiteAlpha.300" }}
              _focus={{
                borderColor: "blue.400",
                boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
              }}
              color="gray.100"
              _placeholder={{ color: "gray.500" }}
              fontSize="sm"
            />
          </Box>
        </Grid>

        <Box>
          <Text color="gray.400" fontSize="xs" mb={1}>
            Hooks Address
          </Text>
          <Input
            placeholder="0x0000000000000000000000000000000000000000"
            value={poolKey.hooks}
            onChange={(e) => handleUpdate("hooks", e.target.value as Address)}
            bg="whiteAlpha.50"
            border="1px solid"
            borderColor="whiteAlpha.200"
            _hover={{ borderColor: "whiteAlpha.300" }}
            _focus={{
              borderColor: "blue.400",
              boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
            }}
            color="gray.100"
            _placeholder={{ color: "gray.500" }}
            fontSize="sm"
          />
        </Box>

        <Box>
          <Text color="gray.400" fontSize="xs" mb={1}>
            Hook Data
          </Text>
          <Input
            placeholder="0x"
            value={poolKey.hookData}
            onChange={(e) => handleUpdate("hookData", e.target.value as Hex)}
            bg="whiteAlpha.50"
            border="1px solid"
            borderColor="whiteAlpha.200"
            _hover={{ borderColor: "whiteAlpha.300" }}
            _focus={{
              borderColor: "blue.400",
              boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
            }}
            color="gray.100"
            _placeholder={{ color: "gray.500" }}
            fontSize="sm"
          />
        </Box>
      </VStack>
    </Box>
  );
};
