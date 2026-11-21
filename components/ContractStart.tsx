"use client";

import { useState } from "react";
import { useTopLoaderRouter } from "@/hooks/useTopLoaderRouter";
import { DarkSelect } from "@/components/DarkSelect";
import { InputField } from "@/components/InputField";
import React from "react";
import { SelectedOptionState } from "@/types";
import { networkOptions } from "@/data/common";
import { getPath, resolveERC3770Address } from "@/utils";
import subdomains from "@/subdomains";
import {
  Box,
  VStack,
  Heading,
  Text,
  Button,
  HStack,
  Link,
  Icon,
} from "@chakra-ui/react";
import { FileCode, ArrowRight } from "lucide-react";

const ExampleCard = ({
  title,
  address,
  chainId,
  description,
  onOpen,
}: {
  title: string;
  address: string;
  chainId: number;
  description: string;
  onOpen?: (address: string, chainId: number) => void;
}) => {
  return (
    <Link
      href={`${getPath(subdomains.CONTRACT.base)}${chainId}/${address}`}
      onClick={(event) => {
        if (
          !onOpen ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        )
          return;
        event.preventDefault();
        onOpen(address, chainId);
      }}
      _hover={{ textDecor: "none" }}
      flex={{ base: "1 1 100%", md: 1 }}
      minW={0}
      maxW={{ base: "full", md: "300px" }}
    >
      <Box
        w="full"
        p={5}
        border="1px solid"
        borderColor="whiteAlpha.200"
        borderRadius="lg"
        cursor="pointer"
        bg="whiteAlpha.50"
        _hover={{
          borderColor: "primary.400",
          bg: "whiteAlpha.100",
          transform: "translateY(-2px)",
        }}
        transition="all 0.2s ease"
      >
        <VStack spacing={3} align="start">
          <HStack spacing={2}>
            <Icon as={FileCode} color="primary.400" boxSize={5} />
            <Text fontWeight="semibold" color="text.primary" fontSize="md">
              {title}
            </Text>
          </HStack>
          <Text color="text.secondary" fontSize="sm">
            {description}
          </Text>
        </VStack>
      </Box>
    </Link>
  );
};

export default function ContractStart({
  onOpen,
  initialChainId = 1,
  embedded = false,
}: {
  onOpen?: (address: string, chainId: number) => void;
  initialChainId?: number;
  embedded?: boolean;
}) {
  const router = useTopLoaderRouter();

  const [address, setAddress] = useState("");
  const [selectedNetworkOption, setSelectedNetworkOption] =
    useState<SelectedOptionState>(
      () =>
        networkOptions.find((option) => option.value === initialChainId) ??
        networkOptions[0]
    );
  const [isInvalidAddress, setIsInvalidAddress] = useState(false);

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAddress(value);
    setIsInvalidAddress(false);
  };

  const handleSubmit = () => {
    if (!address.trim()) {
      setIsInvalidAddress(true);
      return;
    }

    // Resolve ERC-3770 address format (e.g., eth:0x1234...)
    const resolved = resolveERC3770Address(address.trim());
    const finalAddress = resolved.address;
    const finalChainId = resolved.chainId ?? selectedNetworkOption?.value ?? 1;

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(finalAddress)) {
      setIsInvalidAddress(true);
      return;
    }

    if (onOpen) onOpen(finalAddress, Number(finalChainId));
    else
      router.push(
        `${getPath(subdomains.CONTRACT.base)}${finalChainId}/${finalAddress}`
      );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <VStack
      spacing={embedded ? 6 : 8}
      w="full"
      maxW={embedded ? "full" : "800px"}
      mx="auto"
      px={embedded ? 0 : { base: 0, md: 4 }}
    >
      {/* Header */}
      {!embedded && (
        <Box textAlign="center" pt={4}>
          <Heading
            as="h1"
            size={{ base: "lg", md: "xl" }}
            color="text.primary"
            mb={4}
          >
            Contract Explorer
          </Heading>
          <Text color="text.secondary" maxW="600px" mx="auto">
            Interact with any smart contract - read & write functions, storage
            slots, and raw calldata. Works with both verified and unverified
            contracts.
          </Text>
        </Box>
      )}

      {!embedded && (
        <HStack spacing={4} flexWrap="wrap" justify="center">
          <Link
            href={`${getPath(subdomains.CONTRACT.base)}verify`}
            fontSize="sm"
            color="text.secondary"
          >
            Cross-explorer Verification
          </Link>
          <Link
            href={getPath(subdomains.EXPLORER.base)}
            fontSize="sm"
            color="text.secondary"
          >
            Explorer Directory
          </Link>
        </HStack>
      )}
      {/* Input Section */}
      <Box
        w="full"
        p={{ base: 4, md: 6 }}
        bg="bg.subtle"
        borderRadius="lg"
        border="1px solid"
        borderColor="border.default"
      >
        <VStack spacing={4}>
          <Box w="full">
            <Text color="text.secondary" fontSize="sm" mb={2}>
              Contract Address
            </Text>
            <InputField
              placeholder="0x... or eth:0x..."
              value={address}
              onChange={handleAddressChange}
              onKeyDown={handleKeyDown}
              isInvalid={isInvalidAddress}
              fontFamily="mono"
            />
            {isInvalidAddress && (
              <Text color="red.400" fontSize="sm" mt={1}>
                Please enter a valid contract address
              </Text>
            )}
          </Box>

          <Box w="full">
            <Text color="text.secondary" fontSize="sm" mb={2}>
              Network
            </Text>
            <DarkSelect
              ariaLabel="Network"
              placeholder="Select network"
              options={networkOptions}
              selectedOption={selectedNetworkOption}
              setSelectedOption={setSelectedNetworkOption}
            />
          </Box>

          <Button
            w="full"
            bg="primary.500"
            color="white"
            _hover={{ bg: "primary.600" }}
            onClick={handleSubmit}
            rightIcon={<ArrowRight size={18} />}
          >
            Explore Contract
          </Button>
        </VStack>
      </Box>

      {/* Example Contracts */}
      <Box w="full">
        <HStack spacing={2} justify="center" mb={4}>
          <Icon as={ArrowRight} color="primary.400" boxSize={5} />
          <Heading size="sm" color="text.secondary">
            Try These Examples
          </Heading>
        </HStack>
        <HStack
          spacing={0}
          gap={4}
          justify="center"
          flexWrap="wrap"
          alignItems="stretch"
        >
          <ExampleCard
            onOpen={onOpen}
            title="Uniswap V3 Router"
            address="0xE592427A0AEce92De3Edee1F18E0157C05861564"
            chainId={1}
            description="Mainnet - Verified contract with read/write functions"
          />
          <ExampleCard
            onOpen={onOpen}
            title="USDC"
            address="0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
            chainId={1}
            description="Mainnet - ERC20 token with proxy implementation"
          />
          <ExampleCard
            onOpen={onOpen}
            title="Aave V3 Pool"
            address="0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2"
            chainId={1}
            description="Mainnet - Lending protocol with complex functions"
          />
        </HStack>
      </Box>
    </VStack>
  );
}
