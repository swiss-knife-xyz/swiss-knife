"use client";

import { useEffect, useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import {
  Heading,
  FormControl,
  FormLabel,
  Input,
  Box,
  Text,
  VStack,
  HStack,
  Icon,
  Divider,
  Grid,
  GridItem,
  Badge,
  InputGroup,
  InputLeftElement,
} from "@chakra-ui/react";
import {
  FiHash,
  FiTrendingUp,
  FiDollarSign,
  FiLayers,
  FiTarget,
  FiBarChart,
} from "react-icons/fi";

// Helper function to validate hexadecimal number (complete)
const isValidHexNum = (value: string): boolean => {
  if (!value) return false;

  // Check if it starts with 0x and contains only valid hex characters
  const hexRegex = /^0x[a-fA-F0-9]+$/;
  return hexRegex.test(value);
};

// Helper function to check if input could become a valid hex number
const isValidPartialHex = (value: string): boolean => {
  if (!value) return true; // Empty is valid (user is starting to type)

  // Allow "0" (start of "0x")
  if (value === "0") return true;

  // Allow "0x" (valid prefix)
  if (value === "0x") return true;

  // Must start with "0x" and contain only valid hex characters
  const partialHexRegex = /^0x[a-fA-F0-9]*$/;
  return partialHexRegex.test(value);
};

const TokenInput = ({
  title,
  tokenName,
  tokenAddress,
  tokenDecimals,
  setTokenName,
  setTokenAddress,
  setTokenDecimals,
  iconColor,
}: {
  title: string;
  tokenName: string | undefined;
  tokenAddress: string | undefined;
  tokenDecimals: number | undefined;
  setTokenName: (val?: string) => void;
  setTokenAddress: (val?: string) => void;
  setTokenDecimals: (val?: number) => void;
  iconColor: string;
}) => {
  const [addressError, setAddressError] = useState<string>("");
  const [inputValue, setInputValue] = useState<string>(tokenAddress || "");

  // Update input value when tokenAddress changes from localStorage
  useEffect(() => {
    setInputValue(tokenAddress || "");
  }, [tokenAddress]);

  const handleAddressChange = (value: string) => {
    // Always update the input display value
    setInputValue(value);

    if (!value) {
      setTokenAddress(undefined);
      setAddressError("");
      return;
    }

    // Check if the input could become valid
    if (!isValidPartialHex(value)) {
      setAddressError("Invalid Address");
      // Don't save to localStorage
      return;
    }

    // Clear error for valid partial input
    setAddressError("");

    // Only save to localStorage if it's a complete valid hex number
    if (isValidHexNum(value)) {
      setTokenAddress(value);
    } else {
      // For partial inputs (like "0" or "0x"), don't save to localStorage yet
      // but don't show error either
      setTokenAddress(undefined);
    }
  };

  return (
    <Box
      p={6}
      bg="whiteAlpha.50"
      borderRadius="lg"
      border="1px solid"
      borderColor="whiteAlpha.200"
    >
      <VStack spacing={4} align="stretch">
        <HStack spacing={2} align="center">
          <Icon as={FiDollarSign} color={iconColor} boxSize={5} />
          <Heading size="md" color="gray.300">
            {title}
          </Heading>
        </HStack>

        <VStack spacing={4} align="stretch">
          <FormControl>
            <FormLabel color="gray.400" fontSize="sm" fontWeight="medium">
              Token Name
            </FormLabel>
            <Input
              bg="whiteAlpha.50"
              border="1px solid"
              borderColor="whiteAlpha.200"
              _hover={{ borderColor: "whiteAlpha.300" }}
              _focus={{
                borderColor: iconColor,
                boxShadow: `0 0 0 1px var(--chakra-colors-${iconColor.replace(
                  ".",
                  "-"
                )})`,
              }}
              color="gray.100"
              _placeholder={{ color: "gray.500" }}
              placeholder="e.g., USDC, WETH"
              value={tokenName || ""}
              onChange={(e) => setTokenName(e.target.value || undefined)}
            />
          </FormControl>

          <FormControl isInvalid={!!addressError}>
            <FormLabel color="gray.400" fontSize="sm" fontWeight="medium">
              Contract Address
            </FormLabel>
            <Input
              bg="whiteAlpha.50"
              border="1px solid"
              borderColor={addressError ? "red.400" : "whiteAlpha.200"}
              _hover={{
                borderColor: addressError ? "red.400" : "whiteAlpha.300",
              }}
              _focus={{
                borderColor: addressError ? "red.400" : iconColor,
                boxShadow: addressError
                  ? "0 0 0 1px var(--chakra-colors-red-400)"
                  : `0 0 0 1px var(--chakra-colors-${iconColor.replace(
                      ".",
                      "-"
                    )})`,
              }}
              color="gray.100"
              _placeholder={{ color: "gray.500" }}
              placeholder="0x..."
              value={inputValue}
              onChange={(e) => handleAddressChange(e.target.value)}
            />
            {addressError && (
              <Text color="red.400" fontSize="xs" mt={1}>
                {addressError}
              </Text>
            )}
          </FormControl>

          <FormControl>
            <FormLabel color="gray.400" fontSize="sm" fontWeight="medium">
              Decimals
            </FormLabel>
            <Input
              type="number"
              bg="whiteAlpha.50"
              border="1px solid"
              borderColor="whiteAlpha.200"
              _hover={{ borderColor: "whiteAlpha.300" }}
              _focus={{
                borderColor: iconColor,
                boxShadow: `0 0 0 1px var(--chakra-colors-${iconColor.replace(
                  ".",
                  "-"
                )})`,
              }}
              color="gray.100"
              _placeholder={{ color: "gray.500" }}
              placeholder="18"
              value={tokenDecimals || ""}
              onChange={(e) =>
                setTokenDecimals(parseInt(e.target.value) || undefined)
              }
            />
          </FormControl>
        </VStack>
      </VStack>
    </Box>
  );
};

const TickToPrice = () => {
  // Use useLocalStorage hooks instead of manual localStorage management
  const [tokenAName, setTokenAName] = useLocalStorage<string | undefined>(
    "tick-to-price-tokenAName",
    undefined
  );
  const [tokenAAddress, setTokenAAddress] = useLocalStorage<string | undefined>(
    "tick-to-price-tokenAAddress",
    undefined
  );
  const [tokenADecimals, setTokenADecimals] = useLocalStorage<
    number | undefined
  >(
    "tick-to-price-tokenADecimals",
    18 // Default to 18
  );

  const [tokenBName, setTokenBName] = useLocalStorage<string | undefined>(
    "tick-to-price-tokenBName",
    undefined
  );
  const [tokenBAddress, setTokenBAddress] = useLocalStorage<string | undefined>(
    "tick-to-price-tokenBAddress",
    undefined
  );
  const [tokenBDecimals, setTokenBDecimals] = useLocalStorage<
    number | undefined
  >(
    "tick-to-price-tokenBDecimals",
    18 // Default to 18
  );

  const [tickInput, setTickInput] = useLocalStorage<string | undefined>(
    "tick-to-price-tickInput",
    undefined
  );

  const [isTokenA0, setIsTokenA0] = useState<boolean>(false);
  const [token1PerToken0InDecimals, setToken1PerToken0InDecimals] =
    useState<number>();

  // Validate and clean up invalid addresses from localStorage on mount
  useEffect(() => {
    if (tokenAAddress && !isValidHexNum(tokenAAddress)) {
      setTokenAAddress(undefined);
    }
    if (tokenBAddress && !isValidHexNum(tokenBAddress)) {
      setTokenBAddress(undefined);
    }
  }, []); // Empty dependency array for mount only

  useEffect(() => {
    if (
      !tokenAAddress ||
      !tokenBAddress ||
      !tickInput ||
      !tokenADecimals ||
      !tokenBDecimals
    )
      return;

    // Additional safety check before BigInt conversion
    if (!isValidHexNum(tokenAAddress) || !isValidHexNum(tokenBAddress)) {
      return;
    }

    const _isTokenA0 = BigInt(tokenAAddress) < BigInt(tokenBAddress);
    setIsTokenA0(_isTokenA0);

    const price = Math.pow(1.0001, parseInt(tickInput));

    const token0Decimals = _isTokenA0 ? tokenADecimals : tokenBDecimals;
    const token1Decimals = _isTokenA0 ? tokenBDecimals : tokenADecimals;

    setToken1PerToken0InDecimals(
      (price * 10 ** token0Decimals) / 10 ** token1Decimals
    );
  }, [tokenAAddress, tokenBAddress, tickInput, tokenADecimals, tokenBDecimals]);

  return (
    <Box
      p={6}
      bg="rgba(0, 0, 0, 0.05)"
      backdropFilter="blur(5px)"
      borderRadius="xl"
      border="1px solid"
      borderColor="whiteAlpha.50"
    >
      {/* Modern Page Header */}
      <Box mb={8} textAlign="center">
        <HStack justify="center" spacing={3} mb={4}>
          <Icon as={FiBarChart} color="blue.400" boxSize={8} />
          <Heading
            size="xl"
            color="gray.100"
            fontWeight="bold"
            letterSpacing="tight"
          >
            Tick to Price Converter
          </Heading>
        </HStack>
        <Text color="gray.400" fontSize="lg" maxW="600px" mx="auto">
          Convert Uniswap V3 tick values to human-readable token prices
        </Text>
      </Box>

      <Box w="full" px={8}>
        {/* Token Configuration Section */}
        <Box
          p={4}
          bg="whiteAlpha.30"
          borderRadius="lg"
          border="1px solid"
          borderColor="whiteAlpha.200"
          mb={6}
          minW="50rem"
        >
          <VStack spacing={6} align="stretch">
            <HStack spacing={2} align="center">
              <Icon as={FiLayers} color="purple.400" boxSize={6} />
              <Heading size="md" color="gray.300">
                Token Configuration
              </Heading>
            </HStack>

            <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={6}>
              <GridItem>
                <TokenInput
                  title="Token A"
                  tokenName={tokenAName}
                  tokenAddress={tokenAAddress}
                  tokenDecimals={tokenADecimals}
                  setTokenName={setTokenAName}
                  setTokenAddress={setTokenAAddress}
                  setTokenDecimals={setTokenADecimals}
                  iconColor="blue.400"
                />
              </GridItem>
              <GridItem>
                <TokenInput
                  title="Token B"
                  tokenName={tokenBName}
                  tokenAddress={tokenBAddress}
                  tokenDecimals={tokenBDecimals}
                  setTokenName={setTokenBName}
                  setTokenAddress={setTokenBAddress}
                  setTokenDecimals={setTokenBDecimals}
                  iconColor="green.400"
                />
              </GridItem>
            </Grid>

            <HStack justify="center">
              <Badge
                colorScheme="purple"
                fontSize="sm"
                px={3}
                py={1}
                borderRadius="full"
              >
                Token0: {isTokenA0 ? tokenAName : tokenBName}
              </Badge>
              <Badge
                colorScheme="orange"
                fontSize="sm"
                px={3}
                py={1}
                borderRadius="full"
              >
                Token1: {isTokenA0 ? tokenBName : tokenAName}
              </Badge>
            </HStack>
          </VStack>
        </Box>

        <Divider my={6} />

        {/* Tick Input Section */}
        <Box
          p={6}
          bg="whiteAlpha.50"
          borderRadius="lg"
          border="1px solid"
          borderColor="whiteAlpha.200"
          mb={6}
        >
          <VStack spacing={4} align="stretch">
            <HStack spacing={2} align="center">
              <Icon as={FiTarget} color="orange.400" boxSize={6} />
              <Heading size="md" color="gray.300">
                Tick Value
              </Heading>
            </HStack>

            <Box maxW="400px" mx="auto">
              <FormControl>
                <FormLabel color="gray.400" fontSize="sm" fontWeight="medium">
                  Enter Tick
                </FormLabel>
                <InputGroup>
                  <InputLeftElement>
                    <Icon as={FiHash} color="orange.400" boxSize={4} />
                  </InputLeftElement>
                  <Input
                    type="number"
                    bg="whiteAlpha.50"
                    border="1px solid"
                    borderColor="whiteAlpha.200"
                    _hover={{ borderColor: "whiteAlpha.300" }}
                    _focus={{
                      borderColor: "orange.400",
                      boxShadow: "0 0 0 1px var(--chakra-colors-orange-400)",
                    }}
                    color="gray.100"
                    _placeholder={{ color: "gray.500" }}
                    placeholder="e.g. 1800 or -2000"
                    value={tickInput || ""}
                    onChange={(e) => setTickInput(e.target.value || undefined)}
                    textAlign="center"
                    fontSize="lg"
                    py={6}
                  />
                </InputGroup>
                <Text fontSize="xs" color="gray.500" mt={2} textAlign="center">
                  Positive values indicate higher prices for token1
                </Text>
              </FormControl>
            </Box>
          </VStack>
        </Box>

        {/* Results Section */}
        {token1PerToken0InDecimals &&
        tokenAName &&
        tokenBName &&
        tokenADecimals &&
        tokenBDecimals ? (
          <Box
            p={6}
            bg="gradient.primary"
            borderRadius="lg"
            border="1px solid"
            borderColor="whiteAlpha.200"
            position="relative"
            overflow="hidden"
          >
            <Box
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              bg="blackAlpha.300"
              backdropFilter="blur(1px)"
            />
            <Box position="relative" zIndex={1}>
              <VStack spacing={6} align="stretch">
                <HStack spacing={2} align="center" justify="center">
                  <Icon as={FiTrendingUp} color="green.300" boxSize={6} />
                  <Heading size="md" color="white">
                    Price Result
                  </Heading>
                </HStack>

                <VStack spacing={4} align="stretch">
                  {/* Price Display */}
                  <Box
                    p={4}
                    bg="whiteAlpha.100"
                    borderRadius="md"
                    border="1px solid"
                    borderColor="whiteAlpha.200"
                  >
                    <VStack spacing={3}>
                      <Text
                        fontSize="xl"
                        fontWeight="bold"
                        color="green.300"
                        textAlign="center"
                      >
                        {`${token1PerToken0InDecimals.toFixed(
                          !isTokenA0 ? tokenADecimals : tokenBDecimals
                        )} ${isTokenA0 ? tokenBName : tokenAName}`}
                      </Text>
                      <Text color="gray.300" fontSize="md" textAlign="center">
                        per 1 {isTokenA0 ? tokenAName : tokenBName}
                      </Text>
                    </VStack>
                  </Box>

                  {/* Inverse Price Display */}
                  <Box
                    p={4}
                    bg="whiteAlpha.100"
                    borderRadius="md"
                    border="1px solid"
                    borderColor="whiteAlpha.200"
                  >
                    <VStack spacing={3}>
                      <Text
                        fontSize="xl"
                        fontWeight="bold"
                        color="blue.300"
                        textAlign="center"
                      >
                        {`${(1 / token1PerToken0InDecimals).toFixed(
                          isTokenA0 ? tokenADecimals : tokenBDecimals
                        )} ${isTokenA0 ? tokenAName : tokenBName}`}
                      </Text>
                      <Text color="gray.300" fontSize="md" textAlign="center">
                        per 1 {isTokenA0 ? tokenBName : tokenAName}
                      </Text>
                    </VStack>
                  </Box>
                </VStack>
              </VStack>
            </Box>
          </Box>
        ) : (
          <Box
            p={8}
            bg="whiteAlpha.50"
            borderRadius="lg"
            border="1px solid"
            borderColor="whiteAlpha.200"
            textAlign="center"
          >
            <VStack spacing={4}>
              <Icon as={FiHash} color="gray.400" boxSize={12} />
              <Text color="gray.400" fontSize="lg">
                Enter token details and tick value to see price conversion
              </Text>
              <Text color="gray.500" fontSize="sm">
                Fill in all fields above to calculate the price ratio
              </Text>
            </VStack>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default TickToPrice;
