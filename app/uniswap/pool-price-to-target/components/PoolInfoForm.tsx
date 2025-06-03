"use client";

import {
  Box,
  Center,
  Input,
  InputGroup,
  InputRightAddon,
  VStack,
  HStack,
  Text,
  Icon,
  Badge,
} from "@chakra-ui/react";
import { FiDollarSign, FiSettings, FiLink, FiCode } from "react-icons/fi";
import { isValidNumericInput } from "../lib/utils";

interface PoolInfoFormProps {
  currency0: string;
  setCurrency0: (value: string) => void;
  currency0Symbol?: string;
  currency0Decimals?: number;
  currency1: string;
  setCurrency1: (value: string) => void;
  currency1Symbol?: string;
  currency1Decimals?: number;
  fee: number | undefined;
  setFee: (value: number) => void;
  tickSpacing: number | undefined;
  setTickSpacing: (value: number) => void;
  hookAddress: string | undefined;
  setHookAddress: (value: string) => void;
  hookData: string | undefined;
  setHookData: (value: string) => void;
}

export const PoolInfoForm: React.FC<PoolInfoFormProps> = ({
  currency0,
  setCurrency0,
  currency0Symbol,
  currency0Decimals,
  currency1,
  setCurrency1,
  currency1Symbol,
  currency1Decimals,
  fee,
  setFee,
  tickSpacing,
  setTickSpacing,
  hookAddress,
  setHookAddress,
  hookData,
  setHookData,
}) => {
  const inputStyles = {
    bg: "whiteAlpha.50",
    border: "1px solid",
    borderColor: "whiteAlpha.200",
    _hover: { borderColor: "whiteAlpha.300" },
    _focus: {
      borderColor: "blue.400",
      boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
    },
    color: "gray.100",
    _placeholder: { color: "gray.500" },
    rounded: "md",
  };

  return (
    <Box
      p={4}
      bg="whiteAlpha.50"
      borderRadius="lg"
      border="1px solid"
      borderColor="whiteAlpha.200"
    >
      <VStack spacing={6} align="stretch">
        {/* Currency Section */}
        <VStack spacing={4} align="stretch">
          {/* Currency0 */}
          <Box>
            <HStack spacing={2} mb={2}>
              <Icon as={FiDollarSign} color="blue.400" boxSize={4} />
              <Text color="gray.300" fontSize="sm" fontWeight="medium">
                Currency 0
              </Text>
            </HStack>
            <InputGroup>
              <Input
                {...inputStyles}
                value={currency0}
                onChange={(e) => setCurrency0(e.target.value)}
                placeholder="e.g., 0xTokenAddress"
              />
              {currency0Symbol && (
                <InputRightAddon
                  bg="blue.900"
                  borderColor="blue.600"
                  px={3}
                  py={2}
                >
                  <HStack spacing={2} align="center">
                    <Badge
                      colorScheme="blue"
                      variant="solid"
                      fontSize="xs"
                      fontWeight="bold"
                    >
                      {currency0Symbol}
                    </Badge>
                    <Text fontSize="xs" color="blue.200">
                      {currency0Decimals} decimals
                    </Text>
                  </HStack>
                </InputRightAddon>
              )}
            </InputGroup>
          </Box>

          {/* Currency1 */}
          <Box>
            <HStack spacing={2} mb={2}>
              <Icon as={FiDollarSign} color="green.400" boxSize={4} />
              <Text color="gray.300" fontSize="sm" fontWeight="medium">
                Currency 1
              </Text>
            </HStack>
            <InputGroup>
              <Input
                {...inputStyles}
                value={currency1}
                onChange={(e) => setCurrency1(e.target.value)}
                placeholder="e.g., 0xTokenAddress"
              />
              {currency1Symbol && (
                <InputRightAddon
                  bg="green.900"
                  borderColor="green.600"
                  px={3}
                  py={2}
                >
                  <HStack spacing={2} align="center">
                    <Badge
                      colorScheme="green"
                      variant="solid"
                      fontSize="xs"
                      fontWeight="bold"
                    >
                      {currency1Symbol}
                    </Badge>
                    <Text fontSize="xs" color="green.200">
                      {currency1Decimals} decimals
                    </Text>
                  </HStack>
                </InputRightAddon>
              )}
            </InputGroup>
          </Box>
        </VStack>

        {/* Pool Settings Section */}
        <VStack spacing={4} align="stretch">
          <HStack spacing={4}>
            <Box flex={1}>
              <HStack spacing={2} mb={2}>
                <Icon as={FiSettings} color="purple.400" boxSize={4} />
                <Text color="gray.300" fontSize="sm" fontWeight="medium">
                  Fee (bps)
                </Text>
              </HStack>
              <Input
                {...inputStyles}
                value={fee === undefined ? "" : fee}
                onChange={(e) => {
                  if (isValidNumericInput(e.target.value)) {
                    setFee(Number(e.target.value) || 0);
                  }
                }}
                placeholder="e.g., 3000 (for 0.3%)"
                type="number"
              />
            </Box>

            <Box flex={1}>
              <HStack spacing={2} mb={2}>
                <Icon as={FiSettings} color="orange.400" boxSize={4} />
                <Text color="gray.300" fontSize="sm" fontWeight="medium">
                  Tick Spacing
                </Text>
              </HStack>
              <Input
                {...inputStyles}
                value={tickSpacing === undefined ? "" : tickSpacing}
                onChange={(e) => {
                  if (isValidNumericInput(e.target.value)) {
                    setTickSpacing(Number(e.target.value) || 0);
                  }
                }}
                placeholder="e.g., 60"
                type="number"
              />
            </Box>
          </HStack>
        </VStack>

        {/* Hook Section */}
        <VStack spacing={4} align="stretch">
          <Box>
            <HStack spacing={2} mb={2}>
              <Icon as={FiLink} color="cyan.400" boxSize={4} />
              <Text color="gray.300" fontSize="sm" fontWeight="medium">
                Hook Address
                <Text as="span" color="gray.500" fontSize="xs" ml={1}>
                  (optional)
                </Text>
              </Text>
            </HStack>
            <Input
              {...inputStyles}
              value={hookAddress || ""}
              onChange={(e) => setHookAddress(e.target.value)}
              placeholder="e.g., 0xHookAddress"
            />
          </Box>

          <Box>
            <HStack spacing={2} mb={2}>
              <Icon as={FiCode} color="pink.400" boxSize={4} />
              <Text color="gray.300" fontSize="sm" fontWeight="medium">
                Hook Data
                <Text as="span" color="gray.500" fontSize="xs" ml={1}>
                  (optional)
                </Text>
              </Text>
            </HStack>
            <Input
              {...inputStyles}
              value={hookData || ""}
              onChange={(e) => setHookData(e.target.value)}
              placeholder="e.g., 0x"
            />
          </Box>
        </VStack>
      </VStack>
    </Box>
  );
};
