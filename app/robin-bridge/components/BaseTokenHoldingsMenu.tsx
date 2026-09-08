"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Flex,
  HStack,
  Image,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { ChevronDown, Search } from "lucide-react";
import { isAddress } from "viem";
import {
  getBalanceWei,
  type PortfolioToken,
} from "@/app/migrate/lib/portfolioApi";
import { BASE_CHAIN_ID } from "../lib/oft";

export const getBaseTokenHoldings = (tokens: PortfolioToken[]) =>
  tokens.filter(
    (token) =>
      token.chainId === BASE_CHAIN_ID &&
      token.contractAddress !== "native" &&
      isAddress(token.contractAddress) &&
      getBalanceWei(token) > 0n
  );

export function BaseTokenHoldingsMenu({
  tokens,
  isLoading,
  onSelect,
}: {
  tokens: PortfolioToken[];
  isLoading: boolean;
  onSelect: (token: PortfolioToken) => void;
}) {
  const [search, setSearch] = useState("");
  const filteredTokens = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return tokens;
    return tokens.filter(
      (token) =>
        token.symbol.toLowerCase().includes(query) ||
        token.name.toLowerCase().includes(query) ||
        token.contractAddress.toLowerCase().includes(query)
    );
  }, [search, tokens]);

  return (
    <Menu placement="bottom-end" closeOnSelect>
      <MenuButton
        as={Button}
        variant="secondary"
        rightIcon={<ChevronDown size={15} />}
        minW={{ base: "auto", sm: "170px" }}
      >
        <Text display={{ base: "none", sm: "inline" }}>Your Base tokens</Text>
        <Text display={{ base: "inline", sm: "none" }}>Tokens</Text>
      </MenuButton>
      <MenuList
        bg="bg.muted"
        borderColor="border.default"
        minW={{ base: "300px", sm: "360px" }}
        maxH="360px"
        overflowY="auto"
        p={2}
      >
        <Box position="sticky" top={0} zIndex={1} bg="bg.muted" pb={2}>
          <HStack px={2} bg="whiteAlpha.50" borderRadius="md">
            <Search size={14} />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search holdings"
              variant="unstyled"
              size="sm"
            />
          </HStack>
        </Box>
        {isLoading ? (
          <Flex justify="center" py={8}>
            <Spinner size="sm" />
          </Flex>
        ) : filteredTokens.length ? (
          filteredTokens.map((token) => (
            <MenuItem
              key={token.contractAddress}
              bg="transparent"
              borderRadius="md"
              _hover={{ bg: "whiteAlpha.100" }}
              onClick={() => onSelect(token)}
            >
              <TokenIdentity token={token} />
              <VStack align="flex-end" spacing={0} ml="auto">
                <Text fontSize="xs" fontFamily="mono">
                  {formatTokenBalance(token.balanceFormatted)}
                </Text>
                <Text fontSize="2xs" color="text.tertiary">
                  $
                  {token.valueUsd.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </VStack>
            </MenuItem>
          ))
        ) : (
          <Text
            color="text.tertiary"
            fontSize="sm"
            px={3}
            py={7}
            textAlign="center"
          >
            No Base ERC-20 holdings found.
          </Text>
        )}
      </MenuList>
    </Menu>
  );
}

function TokenIdentity({ token }: { token: PortfolioToken }) {
  return (
    <HStack spacing={3} minW={0}>
      {token.logoUrl ? (
        <Image
          src={token.logoUrl}
          alt={token.symbol}
          boxSize="28px"
          borderRadius="full"
          fallbackSrc="/icon.png"
        />
      ) : (
        <Box
          boxSize="28px"
          display="grid"
          placeItems="center"
          borderRadius="full"
          bg="primary.500"
          color="white"
          fontWeight="700"
          fontSize="xs"
        >
          {token.symbol.slice(0, 2).toUpperCase()}
        </Box>
      )}
      <Box minW={0}>
        <Text color="text.primary" fontWeight="700" noOfLines={1}>
          {token.symbol}
        </Text>
        <Text color="text.tertiary" fontSize="xs" noOfLines={1}>
          {token.name}
        </Text>
      </Box>
    </HStack>
  );
}

function formatTokenBalance(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return value;
  return parsed.toLocaleString(undefined, { maximumFractionDigits: 4 });
}
