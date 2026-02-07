import React from "react";
import {
  Box,
  Button,
  Badge,
  Collapse,
  Heading,
  HStack,
  Icon,
  VStack,
  useDisclosure,
} from "@chakra-ui/react";
import { Address, zeroAddress } from "viem";
import { FiDroplet, FiPlus, FiChevronDown, FiChevronUp } from "react-icons/fi";
import { PoolWithHookData } from "@/lib/uniswap/types";
import { PoolKeyForm } from "./PoolKeyForm";

interface PoolConfigurationProps {
  pools: PoolWithHookData[];
  onUpdatePools: (pools: PoolWithHookData[]) => void;
  currencyInfoMap?: Map<Address, { symbol?: string; decimals?: number }>;
}

export const PoolConfiguration: React.FC<PoolConfigurationProps> = ({
  pools,
  onUpdatePools,
  currencyInfoMap,
}) => {
  const { isOpen: isPoolsOpen, onToggle: onTogglePools } = useDisclosure({
    defaultIsOpen: true,
  });

  const addPool = () => {
    const newPool: PoolWithHookData = {
      currency0: zeroAddress,
      currency1: "" as Address,
      fee: 3000,
      tickSpacing: 60,
      hooks: zeroAddress,
      hookData: "0x",
    };
    onUpdatePools([...pools, newPool]);
  };

  const updatePool = (index: number, updatedPool: PoolWithHookData) => {
    const newPools = [...pools];
    newPools[index] = updatedPool;
    onUpdatePools(newPools);
  };

  const removePool = (index: number) => {
    onUpdatePools(pools.filter((_, i) => i !== index));
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
        <HStack spacing={4} align="center" justify="space-between">
          <HStack spacing={2} align="center">
            <Icon as={FiDroplet} color="purple.400" boxSize={6} />
            <Heading size="md" color="gray.300">
              Pool Configuration
            </Heading>
            <Badge colorScheme="purple" fontSize="xs" px={2} rounded="md">
              {pools.length} pool{pools.length !== 1 ? "s" : ""}
            </Badge>
          </HStack>

          <Button
            colorScheme="purple"
            onClick={onTogglePools}
            variant="ghost"
            size="sm"
            rightIcon={
              <Icon
                as={isPoolsOpen ? FiChevronUp : FiChevronDown}
                boxSize={4}
              />
            }
          >
            {isPoolsOpen ? "Hide" : "Show"} Pools
          </Button>
        </HStack>

        <Collapse in={isPoolsOpen} animateOpacity>
          <VStack spacing={4} align="stretch">
            {pools.map((pool, index) => (
              <PoolKeyForm
                key={index}
                poolKey={pool}
                index={index}
                onUpdate={updatePool}
                onRemove={removePool}
                canRemove={pools.length > 1}
                currencyInfoMap={currencyInfoMap}
              />
            ))}

            <Button
              colorScheme="purple"
              onClick={addPool}
              leftIcon={<Icon as={FiPlus} boxSize={4} />}
              size="sm"
              alignSelf="flex-start"
            >
              Add Pool
            </Button>
          </VStack>
        </Collapse>
      </VStack>
    </Box>
  );
};
