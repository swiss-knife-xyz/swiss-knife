"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Box,
  HStack,
  Image,
  Input,
  Spinner,
  Text,
  VStack,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import { ChevronDown } from "lucide-react";
import { TargetTokenEntry } from "../lib/swapTypes";
import { useCustomTokenMetadata } from "../hooks/useCustomTokenMetadata";

interface TokenPickerDropdownProps {
  selected: TargetTokenEntry | null;
  popular: TargetTokenEntry[];
  rest: TargetTokenEntry[];
  onSelect: (token: TargetTokenEntry) => void;
  /** Excluded address — usually the source side when target == source. */
  excludeAddress?: string;
  chainName?: string;
  /** Used for the onchain ERC-20 metadata lookup when the user pastes an
   *  arbitrary address. */
  chainId?: number;
  /** True while the live token list is fetching — shows an inline spinner. */
  isLoadingRest?: boolean;
  /** When true and there's no current selection, the dropdown opens itself
   *  the moment it mounts. Used to nudge the user toward picking a target
   *  when they first switch to the Swap tab. */
  autoOpenOnMount?: boolean;
}

function truncateAddr(addr: string): string {
  if (addr === "native") return "native";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function TokenAvatar({
  entry,
  size = "20px",
}: {
  entry: { symbol: string; logoUrl?: string };
  size?: string;
}) {
  if (entry.logoUrl) {
    return (
      <Image
        src={entry.logoUrl}
        alt={entry.symbol}
        boxSize={size}
        borderRadius="full"
        bg="whiteAlpha.200"
        fallbackSrc="/icon.png"
      />
    );
  }
  return (
    <Box
      boxSize={size}
      borderRadius="full"
      bg="whiteAlpha.200"
      border="1px solid"
      borderColor="whiteAlpha.300"
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <Text fontSize="2xs" fontWeight="700" color="whiteAlpha.800">
        {entry.symbol.slice(0, 2).toUpperCase()}
      </Text>
    </Box>
  );
}

export function TokenPickerDropdown({
  selected,
  popular,
  rest,
  onSelect,
  excludeAddress,
  chainName,
  chainId,
  isLoadingRest = false,
  autoOpenOnMount = false,
}: TokenPickerDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(60);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(
    null
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const searchTerm = search.trim().toLowerCase();
  const excludeLower = excludeAddress?.toLowerCase();

  useEffect(() => {
    if (!isOpen) return;
    const handle = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setVisibleCount(60);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isOpen]);

  // Reset pagination when the search term changes so the filtered list always
  // shows from the top.
  useEffect(() => {
    setVisibleCount(60);
  }, [searchTerm]);

  // Auto-open on mount when the parent asked for it (e.g. user just landed
  // on the Swap tab with no target picked). The viewport check prevents the
  // hidden duplicate panel (the inline-mobile one on desktop, or vice versa)
  // from opening — its trigger has zero size under `display:none`.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!autoOpenOnMount || selected) return;
    const t = setTimeout(() => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect && rect.width > 0 && rect.height > 0) {
        setIsOpen(true);
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // Anchor the dropdown to the trigger but pin into the viewport so it never
  // overflows. Mirrors walletchan's TokenSelector positioning, simplified for
  // a single (left-aligned) variant.
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
      const desiredW = Math.max(rect.width, 320);
      const width = Math.min(desiredW, viewportW - padding * 2);
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

  const allTokens = useMemo(
    () => [...popular, ...rest],
    [popular, rest]
  );

  const filteredRest = useMemo(() => {
    const base = rest.filter(
      (t) => t.address.toLowerCase() !== excludeLower
    );
    if (!searchTerm) return base;
    return base.filter(
      (t) =>
        t.symbol.toLowerCase().includes(searchTerm) ||
        t.name.toLowerCase().includes(searchTerm) ||
        t.address.toLowerCase().includes(searchTerm)
    );
  }, [rest, searchTerm, excludeLower]);

  const isAddressSearch = /^0x[a-fA-F0-9]{40}$/.test(search.trim());

  // Is the pasted address already in our known lists? If so we don't need
  // the onchain lookup — the dropdown's address filter will surface the
  // existing entry naturally.
  const knownMatch = useMemo(() => {
    if (!isAddressSearch) return null;
    const lower = search.trim().toLowerCase();
    return (
      allTokens.find((t) => t.address.toLowerCase() === lower) ?? null
    );
  }, [isAddressSearch, search, allTokens]);

  // Onchain ERC-20 metadata fetch — fires only when the pasted address
  // isn't already a known token. Mirrors walletchan's resolver: three
  // parallel reads of name/symbol/decimals via the canonical PublicClient.
  const customLookup = useCustomTokenMetadata(
    isAddressSearch ? search.trim() : undefined,
    chainId,
    isAddressSearch && !knownMatch
  );

  const customResolved: TargetTokenEntry | null = useMemo(() => {
    if (!customLookup.data) return null;
    return {
      address: customLookup.data.address,
      symbol: customLookup.data.symbol,
      name: customLookup.data.name,
      decimals: customLookup.data.decimals,
    };
  }, [customLookup.data]);

  const filteredPopular = useMemo(() => {
    if (searchTerm) return [];
    return popular.filter(
      (t) => t.address.toLowerCase() !== excludeLower
    );
  }, [popular, searchTerm, excludeLower]);

  const visibleRest = useMemo(
    () => filteredRest.slice(0, visibleCount),
    [filteredRest, visibleCount]
  );

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
      setVisibleCount((c) => Math.min(c + 60, filteredRest.length));
    }
  };

  const select = (t: TargetTokenEntry) => {
    onSelect(t);
    setIsOpen(false);
    setSearch("");
  };

  const isSelected = (t: TargetTokenEntry) =>
    selected?.address.toLowerCase() === t.address.toLowerCase();

  return (
    <Box ref={containerRef} position="relative" w="full">
      {/* Trigger */}
      <Box
        ref={triggerRef}
        as="button"
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        w="full"
        bg="whiteAlpha.100"
        border="1px solid"
        borderColor={isOpen ? "primary.500" : "whiteAlpha.200"}
        borderRadius="md"
        px={3}
        py={2.5}
        textAlign="left"
        cursor="pointer"
        _hover={{ borderColor: "whiteAlpha.400" }}
        transition="all 0.15s"
      >
        <HStack spacing={2.5}>
          {selected ? (
            <>
              <TokenAvatar entry={selected} size="24px" />
              <VStack spacing={0} align="flex-start" flex={1} minW={0}>
                <Text fontSize="sm" fontWeight="600" color="white">
                  {selected.symbol}
                </Text>
                <Text fontSize="2xs" color="whiteAlpha.600" noOfLines={1}>
                  {selected.name}
                </Text>
              </VStack>
            </>
          ) : (
            <Text fontSize="sm" color="whiteAlpha.600" flex={1}>
              Choose a target token
            </Text>
          )}
          <ChevronDown
            size={16}
            color="var(--chakra-colors-whiteAlpha-700)"
            style={{
              transform: isOpen ? "rotate(180deg)" : undefined,
              transition: "transform 0.15s",
            }}
          />
        </HStack>
      </Box>

      {/* Dropdown */}
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
          {/* Search */}
          <Box p={2} borderBottom="1px solid" borderColor="whiteAlpha.200">
            <Input
              ref={inputRef}
              placeholder="Search or paste address"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
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

          {/* Popular chips */}
          {filteredPopular.length > 0 && (
            <Box
              px={2}
              py={2}
              borderBottom="1px solid"
              borderColor="whiteAlpha.200"
            >
              <Text
                fontSize="2xs"
                color="whiteAlpha.600"
                letterSpacing="wider"
                textTransform="uppercase"
                mb={1.5}
                px={1}
              >
                Popular
              </Text>
              <Wrap spacing={1.5}>
                {filteredPopular.map((t) => {
                  const active = isSelected(t);
                  return (
                    <WrapItem key={t.address}>
                      <HStack
                        as="button"
                        type="button"
                        spacing={1.5}
                        px={2}
                        py={1}
                        border="1px solid"
                        borderColor={
                          active ? "primary.500" : "whiteAlpha.200"
                        }
                        borderRadius="md"
                        bg={active ? "whiteAlpha.200" : "whiteAlpha.50"}
                        _hover={{ borderColor: "primary.500" }}
                        onClick={() => select(t)}
                      >
                        <TokenAvatar entry={t} size="16px" />
                        <Text
                          fontWeight="600"
                          fontSize="xs"
                          color="white"
                        >
                          {t.symbol}
                        </Text>
                      </HStack>
                    </WrapItem>
                  );
                })}
              </Wrap>
            </Box>
          )}

          {/* List */}
          <Box
            ref={scrollRef}
            maxH="260px"
            overflowY="auto"
            onScroll={handleScroll}
          >
            <VStack spacing={0} align="stretch">
              {/* Custom-address loading row: spinner while we read
                  name/symbol/decimals onchain. */}
              {isAddressSearch && !knownMatch && customLookup.isLoading && (
                <HStack
                  px={3}
                  py={2.5}
                  spacing={2.5}
                  bg="whiteAlpha.50"
                  borderBottom="1px solid"
                  borderColor="whiteAlpha.100"
                >
                  <Spinner size="xs" color="primary.400" />
                  <VStack spacing={0} align="flex-start" flex={1} minW={0}>
                    <Text fontSize="sm" fontWeight="600" color="white">
                      Resolving token…
                    </Text>
                    <Text
                      fontSize="2xs"
                      color="whiteAlpha.700"
                      fontFamily="mono"
                      noOfLines={1}
                    >
                      {truncateAddr(search.trim())}
                    </Text>
                  </VStack>
                </HStack>
              )}

              {/* Resolved custom token — real metadata, click to pick. */}
              {isAddressSearch &&
                !knownMatch &&
                !customLookup.isLoading &&
                customResolved && (
                  <HStack
                    as="button"
                    type="button"
                    px={3}
                    py={2.5}
                    spacing={2.5}
                    bg="rgba(59,130,246,0.12)"
                    _hover={{ bg: "rgba(59,130,246,0.20)" }}
                    onClick={() => select(customResolved)}
                    textAlign="left"
                    borderBottom="1px solid"
                    borderColor="whiteAlpha.100"
                  >
                    <TokenAvatar entry={customResolved} size="24px" />
                    <VStack spacing={0} align="flex-start" flex={1} minW={0}>
                      <Text fontSize="sm" fontWeight="600" color="white">
                        {customResolved.symbol}
                      </Text>
                      <Text
                        fontSize="2xs"
                        color="whiteAlpha.700"
                        noOfLines={1}
                      >
                        {customResolved.name}
                      </Text>
                    </VStack>
                    <Text fontSize="2xs" color="primary.400" fontWeight="600">
                      USE
                    </Text>
                  </HStack>
                )}

              {/* Lookup finished but the contract didn't decode as an
                  ERC-20, or the RPC failed. */}
              {isAddressSearch &&
                !knownMatch &&
                !customLookup.isLoading &&
                !customResolved && (
                  <Box
                    px={3}
                    py={2.5}
                    bg="rgba(239,68,68,0.08)"
                    borderBottom="1px solid"
                    borderColor="whiteAlpha.100"
                  >
                    <Text fontSize="xs" color="#F87171" fontWeight="600">
                      {customLookup.isInvalid
                        ? "Not a valid ERC-20 on this chain"
                        : "Lookup failed — check the address or RPC"}
                    </Text>
                  </Box>
                )}

              {filteredRest.length === 0 &&
                !isAddressSearch &&
                !isLoadingRest && (
                  <Box px={3} py={6}>
                    <Text fontSize="sm" color="whiteAlpha.600" textAlign="center">
                      {searchTerm
                        ? "No tokens match"
                        : `No more tokens${chainName ? ` on ${chainName}` : ""}`}
                    </Text>
                  </Box>
                )}

              {filteredRest.length === 0 && isLoadingRest && (
                <HStack px={3} py={6} spacing={2} justify="center">
                  <Spinner size="xs" color="primary.400" />
                  <Text fontSize="xs" color="whiteAlpha.700">
                    Loading token list…
                  </Text>
                </HStack>
              )}

              {visibleRest.map((t) => {
                const active = isSelected(t);
                return (
                  <HStack
                    as="button"
                    type="button"
                    key={t.address}
                    px={3}
                    py={2}
                    spacing={2.5}
                    bg={active ? "whiteAlpha.100" : "transparent"}
                    _hover={{ bg: "whiteAlpha.100" }}
                    onClick={() => select(t)}
                    textAlign="left"
                  >
                    <TokenAvatar entry={t} size="22px" />
                    <VStack spacing={0} align="flex-start" flex={1} minW={0}>
                      <Text fontSize="sm" fontWeight="600" color="white">
                        {t.symbol}
                      </Text>
                      <Text
                        fontSize="2xs"
                        color="whiteAlpha.600"
                        noOfLines={1}
                      >
                        {t.name}
                      </Text>
                    </VStack>
                    <Text
                      fontSize="2xs"
                      color="whiteAlpha.500"
                      fontFamily="mono"
                      flexShrink={0}
                    >
                      {truncateAddr(t.address)}
                    </Text>
                  </HStack>
                );
              })}
            </VStack>
          </Box>
        </Box>
      )}
    </Box>
  );
}
