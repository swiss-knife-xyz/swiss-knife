"use client";

import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Icon,
  Alert,
  AlertIcon,
  AlertDescription,
  Badge,
  Grid,
  GridItem,
  Image,
  Divider,
  Flex,
  Spacer,
  Spinner,
} from "@chakra-ui/react";
import { useState } from "react";
import { FiUser, FiTrash2, FiExternalLink, FiCopy } from "react-icons/fi";
import { useAccount, useChainId } from "wagmi";
import { base, baseSepolia } from "viem/chains";
import { InputField } from "@/components/InputField";
import { ConnectButton } from "@/components/ConnectButton";
import { usePositionDetails } from "./hooks/usePositionDetails";
import { useRemoveLiquidityTransaction } from "./hooks/useRemoveLiquidityTransaction";
import { CopyToClipboard } from "@/components/CopyToClipboard";
import { formatUnits } from "viem";

const SUPPORTED_CHAINS = [base.id, baseSepolia.id];

// FIXME: improve positions page
const PositionsPage = () => {
  const { address: userAddress, isConnected } = useAccount();
  const chainId = useChainId();
  const isChainSupported = chainId
    ? (SUPPORTED_CHAINS as number[]).includes(chainId)
    : false;

  const [tokenId, setTokenId] = useState("");

  const {
    fetchPositionDetails,
    positionDetails,
    isLoading: isFetchingPosition,
    error: fetchError,
    clearPosition,
  } = usePositionDetails();

  const {
    executeRemoveLiquidity,
    isLoading: isRemovingLiquidity,
    isTransactionComplete,
  } = useRemoveLiquidityTransaction({ isChainSupported });

  const handleFetchPosition = () => {
    if (!tokenId.trim()) return;
    fetchPositionDetails(tokenId.trim());
  };

  const handleRemoveLiquidity = () => {
    if (!positionDetails) return;
    executeRemoveLiquidity(positionDetails);
  };

  const handleTokenIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTokenId(e.target.value);
    if (positionDetails) {
      clearPosition();
    }
  };

  const isUserOwner =
    positionDetails &&
    userAddress &&
    positionDetails.owner.toLowerCase() === userAddress.toLowerCase();

  const extractSVGFromTokenURI = (tokenURI: string) => {
    try {
      // Token URI is typically a data URI containing JSON metadata
      if (tokenURI.startsWith("data:application/json;base64,")) {
        const base64Data = tokenURI.replace(
          "data:application/json;base64,",
          ""
        );
        const decodedData = atob(base64Data);
        const metadata = JSON.parse(decodedData);

        if (
          metadata.image &&
          metadata.image.startsWith("data:image/svg+xml;base64,")
        ) {
          return metadata.image;
        }
      }
    } catch (error) {
      console.error("Error extracting SVG from token URI:", error);
    }
    return null;
  };

  const svgDataUri = positionDetails
    ? extractSVGFromTokenURI(positionDetails.tokenURI)
    : null;

  return (
    <Box
      p={6}
      bg="rgba(0, 0, 0, 0.05)"
      backdropFilter="blur(5px)"
      borderRadius="xl"
      border="1px solid"
      borderColor="whiteAlpha.50"
      maxW="1400px"
      mx="auto"
      w="full"
    >
      {/* Page Header */}
      <Box mb={8} textAlign="center">
        <HStack justify="center" spacing={3} mb={4}>
          <Icon as={FiUser} color="blue.400" boxSize={8} />
          <Heading
            size="xl"
            color="gray.100"
            fontWeight="bold"
            letterSpacing="tight"
          >
            Uniswap V4 Positions
          </Heading>
        </HStack>
        <Text color="gray.400" fontSize="lg" maxW="600px" mx="auto">
          View and manage your Uniswap V4 liquidity positions
        </Text>
      </Box>

      <Flex w="100%" mb={6}>
        <Spacer />
        <ConnectButton />
      </Flex>

      {/* Connection Check */}
      {!isConnected && (
        <Alert status="warning" bg="orange.900" borderColor="orange.400" mb={6}>
          <AlertIcon color="orange.400" />
          <AlertDescription color="orange.100">
            Please connect your wallet to view and manage positions.
          </AlertDescription>
          <Box ml="auto">
            <ConnectButton />
          </Box>
        </Alert>
      )}

      {/* Chain Support Check */}
      {isConnected && !isChainSupported && (
        <Alert status="error" bg="red.900" borderColor="red.400" mb={6}>
          <AlertIcon color="red.400" />
          <AlertDescription color="red.100">
            This chain is not supported. Please switch to Base or Base Sepolia.
          </AlertDescription>
        </Alert>
      )}

      <VStack spacing={8} align="stretch">
        {/* Token ID Input Section */}
        <Box
          p={6}
          bg="whiteAlpha.50"
          borderRadius="lg"
          border="1px solid"
          borderColor="whiteAlpha.200"
        >
          <VStack spacing={4} align="stretch">
            <Heading size="md" color="gray.300">
              Position Lookup
            </Heading>

            <HStack spacing={4}>
              <Box flex={1}>
                <InputField
                  placeholder="Enter position token ID (e.g., 123)"
                  value={tokenId}
                  onChange={handleTokenIdChange}
                  autoFocus
                />
              </Box>
              <Button
                colorScheme="blue"
                onClick={handleFetchPosition}
                isLoading={isFetchingPosition}
                loadingText="Fetching..."
                isDisabled={
                  !tokenId.trim() || !isConnected || !isChainSupported
                }
                leftIcon={<Icon as={FiExternalLink} />}
              >
                Fetch Position
              </Button>
            </HStack>

            {fetchError && (
              <Alert status="error" bg="red.900" borderColor="red.400">
                <AlertIcon color="red.400" />
                <AlertDescription color="red.100">
                  {fetchError}
                </AlertDescription>
              </Alert>
            )}
          </VStack>
        </Box>

        {/* Position Details */}
        {positionDetails && (
          <Box
            p={6}
            bg="whiteAlpha.50"
            borderRadius="lg"
            border="1px solid"
            borderColor="whiteAlpha.200"
          >
            <VStack spacing={6} align="stretch">
              <HStack justify="space-between" align="center">
                <Heading size="md" color="gray.300">
                  Position Details
                </Heading>
                {!isUserOwner && (
                  <Badge colorScheme="orange" fontSize="sm">
                    Not Owner
                  </Badge>
                )}
              </HStack>

              <Grid templateColumns={{ base: "1fr", lg: "300px 1fr" }} gap={6}>
                {/* Left side - NFT Image */}
                <GridItem>
                  <VStack spacing={4}>
                    <Box
                      w="250px"
                      h="250px"
                      bg="whiteAlpha.100"
                      borderRadius="lg"
                      border="1px solid"
                      borderColor="whiteAlpha.200"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      overflow="hidden"
                    >
                      {svgDataUri ? (
                        <Image
                          src={svgDataUri}
                          alt={`Position ${positionDetails.tokenId} NFT`}
                          w="full"
                          h="full"
                          objectFit="contain"
                        />
                      ) : (
                        <VStack spacing={2}>
                          <Icon as={FiUser} boxSize={16} color="gray.500" />
                          <Text color="gray.500" fontSize="sm">
                            NFT Image
                          </Text>
                        </VStack>
                      )}
                    </Box>

                    <VStack spacing={2} w="full">
                      <Text color="gray.400" fontSize="sm" fontWeight="medium">
                        Token ID
                      </Text>
                      <HStack w="full" justify="center">
                        <Text color="gray.100" fontSize="lg" fontWeight="bold">
                          #{positionDetails.tokenId}
                        </Text>
                        <CopyToClipboard textToCopy={positionDetails.tokenId} />
                      </HStack>
                    </VStack>
                  </VStack>
                </GridItem>

                {/* Right side - Position Info */}
                <GridItem>
                  <VStack spacing={6} align="stretch">
                    {/* Pool Information */}
                    <Box>
                      <Text
                        color="gray.300"
                        fontSize="md"
                        fontWeight="medium"
                        mb={3}
                      >
                        Pool Information
                      </Text>
                      <VStack spacing={3} align="stretch">
                        <HStack justify="space-between">
                          <Text color="gray.400" fontSize="sm">
                            Token Pair
                          </Text>
                          <HStack spacing={2}>
                            <Text color="gray.100" fontWeight="medium">
                              {positionDetails.token0.symbol} /{" "}
                              {positionDetails.token1.symbol}
                            </Text>
                          </HStack>
                        </HStack>

                        <HStack justify="space-between">
                          <Text color="gray.400" fontSize="sm">
                            Fee Tier
                          </Text>
                          <Badge colorScheme="purple" fontSize="xs">
                            {(positionDetails.poolKey.fee / 10000).toFixed(2)}%
                          </Badge>
                        </HStack>

                        <HStack justify="space-between">
                          <Text color="gray.400" fontSize="sm">
                            Tick Range
                          </Text>
                          <Text
                            color="gray.100"
                            fontSize="sm"
                            fontFamily="mono"
                          >
                            {positionDetails.positionInfo.tickLower} →{" "}
                            {positionDetails.positionInfo.tickUpper}
                          </Text>
                        </HStack>

                        <HStack justify="space-between">
                          <Text color="gray.400" fontSize="sm">
                            Price Range
                          </Text>
                          <VStack spacing={1} align="end">
                            <Text
                              color="gray.100"
                              fontSize="sm"
                              fontFamily="mono"
                            >
                              {positionDetails.priceInfo.formattedPriceLower} →{" "}
                              {positionDetails.priceInfo.formattedPriceUpper}
                            </Text>
                            <Text color="gray.500" fontSize="xs">
                              {positionDetails.token1.symbol} per{" "}
                              {positionDetails.token0.symbol}
                            </Text>
                          </VStack>
                        </HStack>

                        <HStack justify="space-between">
                          <Text color="gray.400" fontSize="sm">
                            Tick Spacing
                          </Text>
                          <Badge colorScheme="cyan" fontSize="xs">
                            {positionDetails.poolKey.tickSpacing}
                          </Badge>
                        </HStack>

                        <HStack justify="space-between">
                          <Text color="gray.400" fontSize="sm">
                            Hook Address
                          </Text>
                          <HStack spacing={1}>
                            <Text
                              color="gray.100"
                              fontSize="sm"
                              fontFamily="mono"
                            >
                              {positionDetails.poolKey.hooks ===
                              "0x0000000000000000000000000000000000000000"
                                ? "No Hook"
                                : `${positionDetails.poolKey.hooks.slice(
                                    0,
                                    6
                                  )}...${positionDetails.poolKey.hooks.slice(
                                    -4
                                  )}`}
                            </Text>
                            {positionDetails.poolKey.hooks !==
                              "0x0000000000000000000000000000000000000000" && (
                              <CopyToClipboard
                                textToCopy={positionDetails.poolKey.hooks}
                              />
                            )}
                          </HStack>
                        </HStack>

                        <HStack justify="space-between">
                          <Text color="gray.400" fontSize="sm">
                            Pool ID (Truncated)
                          </Text>
                          <HStack spacing={1}>
                            <Text
                              color="gray.100"
                              fontSize="sm"
                              fontFamily="mono"
                            >
                              {positionDetails.positionInfo.poolId.slice(0, 8)}
                              ...{positionDetails.positionInfo.poolId.slice(-6)}
                            </Text>
                            <CopyToClipboard
                              textToCopy={positionDetails.positionInfo.poolId}
                            />
                          </HStack>
                        </HStack>
                      </VStack>
                    </Box>

                    <Divider borderColor="whiteAlpha.200" />

                    {/* Token Information */}
                    <Box>
                      <Text
                        color="gray.300"
                        fontSize="md"
                        fontWeight="medium"
                        mb={3}
                      >
                        Token Details
                      </Text>
                      <VStack spacing={4} align="stretch">
                        {/* Token 0 */}
                        <Box p={4} bg="whiteAlpha.100" borderRadius="md">
                          <VStack spacing={2} align="stretch">
                            <HStack justify="space-between">
                              <Text color="blue.400" fontWeight="medium">
                                {positionDetails.token0.symbol}
                              </Text>
                              <HStack spacing={1}>
                                <Text
                                  color="gray.100"
                                  fontSize="sm"
                                  fontFamily="mono"
                                >
                                  {positionDetails.token0.address.slice(0, 6)}
                                  ...{positionDetails.token0.address.slice(-4)}
                                </Text>
                                <CopyToClipboard
                                  textToCopy={positionDetails.token0.address}
                                />
                              </HStack>
                            </HStack>
                            <HStack justify="space-between">
                              <Text color="gray.400" fontSize="sm">
                                Your Balance
                              </Text>
                              <Text color="gray.100" fontWeight="medium">
                                {parseFloat(
                                  positionDetails.token0.formattedBalance
                                ).toFixed(6)}
                              </Text>
                            </HStack>
                          </VStack>
                        </Box>

                        {/* Token 1 */}
                        <Box p={4} bg="whiteAlpha.100" borderRadius="md">
                          <VStack spacing={2} align="stretch">
                            <HStack justify="space-between">
                              <Text color="green.400" fontWeight="medium">
                                {positionDetails.token1.symbol}
                              </Text>
                              <HStack spacing={1}>
                                <Text
                                  color="gray.100"
                                  fontSize="sm"
                                  fontFamily="mono"
                                >
                                  {positionDetails.token1.address.slice(0, 6)}
                                  ...{positionDetails.token1.address.slice(-4)}
                                </Text>
                                <CopyToClipboard
                                  textToCopy={positionDetails.token1.address}
                                />
                              </HStack>
                            </HStack>
                            <HStack justify="space-between">
                              <Text color="gray.400" fontSize="sm">
                                Your Balance
                              </Text>
                              <Text color="gray.100" fontWeight="medium">
                                {parseFloat(
                                  positionDetails.token1.formattedBalance
                                ).toFixed(6)}
                              </Text>
                            </HStack>
                          </VStack>
                        </Box>
                      </VStack>
                    </Box>

                    <Divider borderColor="whiteAlpha.200" />

                    {/* Position Liquidity */}
                    <Box>
                      <Text
                        color="gray.300"
                        fontSize="md"
                        fontWeight="medium"
                        mb={3}
                      >
                        Position Status
                      </Text>
                      <VStack spacing={3} align="stretch">
                        <HStack justify="space-between">
                          <Text color="gray.400" fontSize="sm">
                            Liquidity
                          </Text>
                          <Text
                            color="gray.100"
                            fontWeight="medium"
                            fontFamily="mono"
                          >
                            {formatUnits(BigInt(positionDetails.liquidity), 18)}
                          </Text>
                        </HStack>

                        <HStack justify="space-between">
                          <Text color="gray.400" fontSize="sm">
                            Owner
                          </Text>
                          <HStack spacing={1}>
                            <Text
                              color="gray.100"
                              fontSize="sm"
                              fontFamily="mono"
                            >
                              {positionDetails.owner.slice(0, 6)}...
                              {positionDetails.owner.slice(-4)}
                            </Text>
                            <CopyToClipboard
                              textToCopy={positionDetails.owner}
                            />
                          </HStack>
                        </HStack>
                      </VStack>
                    </Box>

                    {/* Remove Liquidity Button */}
                    {isUserOwner && BigInt(positionDetails.liquidity) > 0n && (
                      <>
                        <Divider borderColor="whiteAlpha.200" />
                        <Box>
                          <VStack spacing={4}>
                            <Alert
                              status="warning"
                              bg="orange.900"
                              borderColor="orange.400"
                            >
                              <AlertIcon color="orange.400" />
                              <AlertDescription
                                color="orange.100"
                                fontSize="sm"
                              >
                                This will remove 100% of your liquidity from
                                this position.
                              </AlertDescription>
                            </Alert>

                            <Button
                              colorScheme="red"
                              variant="outline"
                              size="lg"
                              leftIcon={<Icon as={FiTrash2} />}
                              onClick={handleRemoveLiquidity}
                              isLoading={isRemovingLiquidity}
                              loadingText="Removing Liquidity..."
                              isDisabled={isTransactionComplete}
                              w="full"
                            >
                              Remove 100% Liquidity
                            </Button>
                          </VStack>
                        </Box>
                      </>
                    )}

                    {/* Empty Position Notice */}
                    {BigInt(positionDetails.liquidity) === 0n && (
                      <Alert status="info" bg="blue.900" borderColor="blue.400">
                        <AlertIcon color="blue.400" />
                        <AlertDescription color="blue.100">
                          This position has no liquidity remaining.
                        </AlertDescription>
                      </Alert>
                    )}
                  </VStack>
                </GridItem>
              </Grid>
            </VStack>
          </Box>
        )}

        {/* Loading State */}
        {isFetchingPosition && (
          <Box
            p={6}
            bg="whiteAlpha.50"
            borderRadius="lg"
            border="1px solid"
            borderColor="whiteAlpha.200"
            textAlign="center"
          >
            <VStack spacing={4}>
              <Spinner size="lg" color="blue.400" />
              <Text color="gray.300">Fetching position details...</Text>
            </VStack>
          </Box>
        )}
      </VStack>
    </Box>
  );
};

export default PositionsPage;
