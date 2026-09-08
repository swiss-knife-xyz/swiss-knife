"use client";

import {
  Box,
  HStack,
  Image,
  Input,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { ChevronDown } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { BridgeChain } from "../lib/bridgeApi";
import { chainIdToChain, chainIdToImage } from "@/data/common";

interface ChainPickerDropdownProps {
  sourceChainId?: number;
  destinationChainId: number | null;
  chains: BridgeChain[];
  onSelect: (chainId: number | null) => void;
  isLoading?: boolean;
}

function chainLogo(chainId: number, chain?: BridgeChain): string | undefined {
  return chain?.icon ?? chain?.logoURI ?? chainIdToImage[chainId];
}

function chainName(chainId: number, chain?: BridgeChain): string {
  return chain?.name ?? chainIdToChain[chainId]?.name ?? `Chain ${chainId}`;
}

export function ChainPickerDropdown({
  sourceChainId,
  destinationChainId,
  chains,
  onSelect,
  isLoading = false,
}: ChainPickerDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const effectiveDestination = destinationChainId ?? sourceChainId;
  const chainsById = useMemo(() => {
    const map = new Map<number, BridgeChain>();
    for (const chain of chains) map.set(chain.chainId, chain);
    return map;
  }, [chains]);

  const filteredChains = useMemo(() => {
    const term = search.trim().toLowerCase();
    const base = chains.filter((chain) => chain.chainId !== sourceChainId);
    if (!term) return base;
    return base.filter(
      (chain) =>
        chain.name.toLowerCase().includes(term) ||
        String(chain.chainId).includes(term)
    );
  }, [chains, search, sourceChainId]);

  useEffect(() => {
    if (!isOpen) return;
    const handle = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setTimeout(() => inputRef.current?.focus(), 30);
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) {
      setPos(null);
      return;
    }
    const compute = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const padding = 8;
      const viewportW = document.documentElement.clientWidth;
      const width = Math.min(
        Math.max(rect.width, 320),
        viewportW - padding * 2
      );
      let left = rect.left;
      if (left + width > viewportW - padding) left = rect.right - width;
      if (left < padding) left = padding;
      setPos({ top: rect.bottom + 4, left, width });
    };
    compute();
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute, true);
    };
  }, [isOpen]);

  const selectedBridgeChain =
    effectiveDestination !== undefined
      ? chainsById.get(effectiveDestination)
      : undefined;
  const selectedName =
    effectiveDestination !== undefined
      ? chainName(effectiveDestination, selectedBridgeChain)
      : "Same chain";
  const selectedLogo =
    effectiveDestination !== undefined
      ? chainLogo(effectiveDestination, selectedBridgeChain)
      : undefined;
  const isSameChain =
    destinationChainId === null ||
    destinationChainId === undefined ||
    destinationChainId === sourceChainId;

  const select = (chainId: number | null) => {
    onSelect(chainId);
    setIsOpen(false);
    setSearch("");
  };

  return (
    <Box ref={containerRef} position="relative" w="full">
      <Box
        ref={triggerRef}
        as="button"
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        w="full"
        bg="whiteAlpha.100"
        border="1px solid"
        borderColor={isOpen ? "primary.500" : "whiteAlpha.200"}
        borderRadius="md"
        px={3}
        py={2.5}
        textAlign="left"
        _hover={{ borderColor: "whiteAlpha.400" }}
      >
        <HStack spacing={2.5}>
          {selectedLogo && (
            <Image
              src={selectedLogo}
              alt={selectedName}
              boxSize="22px"
              borderRadius="full"
              fallbackSrc="/icon.png"
            />
          )}
          <VStack spacing={0} align="flex-start" flex={1} minW={0}>
            <Text fontSize="sm" fontWeight="600" color="white" noOfLines={1}>
              {isSameChain ? "Same chain" : selectedName}
            </Text>
            <Text fontSize="2xs" color="whiteAlpha.600" noOfLines={1}>
              {isSameChain ? selectedName : "Bridge destination"}
            </Text>
          </VStack>
          {isLoading ? (
            <Spinner size="xs" color="primary.400" />
          ) : (
            <ChevronDown
              size={16}
              color="var(--chakra-colors-whiteAlpha-700)"
              style={{
                transform: isOpen ? "rotate(180deg)" : undefined,
                transition: "transform 0.15s",
              }}
            />
          )}
        </HStack>
      </Box>

      {isOpen && pos && (
        <Box
          position="fixed"
          top={`${pos.top}px`}
          left={`${pos.left}px`}
          w={`${pos.width}px`}
          bg="bg.muted"
          border="1px solid"
          borderColor="whiteAlpha.300"
          borderRadius="lg"
          boxShadow="0 12px 40px rgba(0,0,0,0.5)"
          zIndex={1500}
          overflow="hidden"
        >
          <Box p={2} borderBottom="1px solid" borderColor="whiteAlpha.200">
            <Input
              ref={inputRef}
              placeholder="Search chains"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => event.stopPropagation()}
              size="sm"
              bg="whiteAlpha.50"
              border="1px solid"
              borderColor="whiteAlpha.200"
              color="white"
              _placeholder={{ color: "whiteAlpha.500" }}
              _hover={{ borderColor: "whiteAlpha.400" }}
              _focus={{
                borderColor: "primary.500",
                boxShadow: "0 0 0 1px var(--chakra-colors-primary-500)",
              }}
              borderRadius="md"
            />
          </Box>
          <Box maxH="280px" overflowY="auto">
            <VStack spacing={0} align="stretch">
              {sourceChainId !== undefined && (
                <ChainRow
                  chainId={sourceChainId}
                  name="Same chain"
                  subtitle={chainName(
                    sourceChainId,
                    chainsById.get(sourceChainId)
                  )}
                  logo={chainLogo(sourceChainId, chainsById.get(sourceChainId))}
                  isActive={isSameChain}
                  onClick={() => select(null)}
                />
              )}
              {isLoading && filteredChains.length === 0 && (
                <HStack px={3} py={5} spacing={2} justify="center">
                  <Spinner size="xs" color="primary.400" />
                  <Text fontSize="xs" color="whiteAlpha.700">
                    Loading bridge chains…
                  </Text>
                </HStack>
              )}
              {!isLoading && filteredChains.length === 0 && (
                <Box px={3} py={5}>
                  <Text fontSize="sm" color="whiteAlpha.600" textAlign="center">
                    No chains match
                  </Text>
                </Box>
              )}
              {filteredChains.map((chain) => (
                <ChainRow
                  key={chain.chainId}
                  chainId={chain.chainId}
                  name={chain.name}
                  subtitle={`Chain ${chain.chainId}`}
                  logo={chainLogo(chain.chainId, chain)}
                  isActive={destinationChainId === chain.chainId}
                  onClick={() => select(chain.chainId)}
                />
              ))}
            </VStack>
          </Box>
        </Box>
      )}
    </Box>
  );
}

function ChainRow({
  chainId,
  name,
  subtitle,
  logo,
  isActive,
  onClick,
}: {
  chainId: number;
  name: string;
  subtitle: string;
  logo?: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <HStack
      as="button"
      type="button"
      px={3}
      py={2}
      spacing={2.5}
      textAlign="left"
      bg={isActive ? "whiteAlpha.100" : "transparent"}
      _hover={{ bg: "whiteAlpha.100" }}
      onClick={onClick}
    >
      {logo && (
        <Image
          src={logo}
          alt={name}
          boxSize="22px"
          borderRadius="full"
          fallbackSrc="/icon.png"
        />
      )}
      <VStack spacing={0} align="flex-start" flex={1} minW={0}>
        <Text fontSize="sm" fontWeight="600" color="white" noOfLines={1}>
          {name}
        </Text>
        <Text fontSize="2xs" color="whiteAlpha.600" noOfLines={1}>
          {subtitle}
        </Text>
      </VStack>
      <Text fontSize="2xs" color="whiteAlpha.500" fontFamily="mono">
        {chainId}
      </Text>
    </HStack>
  );
}
