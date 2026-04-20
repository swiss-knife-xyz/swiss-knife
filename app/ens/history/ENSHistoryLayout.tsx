"use client";

import NextLink from "next/link";
import { useTopLoaderRouter } from "@/hooks/useTopLoaderRouter";
import { useParams } from "next/navigation";
import { ReactNode, useRef, useState } from "react";
import {
  Heading,
  FormControl,
  FormLabel,
  Input,
  Button,
  HStack,
  Box,
  Text,
  Card,
  CardBody,
  SimpleGrid,
  Image,
  IconButton,
} from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import { getPath } from "@/utils";
import subdomains from "@/subdomains";

export const ENSHistoryLayout = ({ children }: { children: ReactNode }) => {
  const router = useTopLoaderRouter();
  const params = useParams();

  const ensNameFromParams =
    typeof params.ensName === "string" ? params.ensName : undefined;

  const [ensName, setEnsName] = useState<string>(ensNameFromParams ?? "");
  const [loading, setLoading] = useState(false);

  // Add a debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Define the card data structure
  interface CardData {
    ensName: string;
    description: string;
    category: string;
    useEnsAvatar?: boolean;
    limoSuffix?: string;
    whiteIconBg?: boolean;
    customFaviconUrl?: string;
  }

  // Array of card data
  const cardsData: CardData[] = [
    // Wallets / Safe
    {
      ensName: "eternalsafe.eth",
      description: "A decentralized UI for Safe{Wallet}",
      category: "Wallets / Safe",
    },
    {
      ensName: "localsafe.eth",
      description: "Local-first alternative UI for Safe{Wallet}",
      category: "Wallets / Safe",
      whiteIconBg: true,
    },
    {
      ensName: "app.safe.eth",
      description: "Safe{Wallet} official interface on ENS",
      category: "Wallets / Safe",
    },
    {
      ensName: "beta.walletbeat.eth",
      description: "Walletbeat — wallet comparison & review",
      category: "Wallets / Safe",
    },
    // DeFi
    {
      ensName: "aero.drome.eth",
      description: "Aerodrome Finance — AMM on Base",
      category: "DeFi",
    },
    {
      ensName: "velo.drome.eth",
      description: "Velodrome Finance — AMM on Optimism",
      category: "DeFi",
    },
    {
      ensName: "1inch.eth",
      description: "1inch DEX aggregator",
      category: "DeFi",
      customFaviconUrl: "https://1inch.eth.limo/assets/favicon/favicon-32x32.png",
    },
    {
      ensName: "kwenta.eth",
      description: "Perpetual futures trading on Optimism",
      category: "DeFi",
    },
    {
      ensName: "staking.synthetix.eth",
      description: "Synthetix staking interface",
      category: "DeFi",
    },
    {
      ensName: "originprotocol.eth",
      description: "Origin Protocol DeFi platform",
      category: "DeFi",
    },
    {
      ensName: "swapr.eth",
      description: "Swapr — community-driven DEX",
      category: "DeFi",
    },
    {
      ensName: "agavefinance.eth",
      description: "Agave — lending protocol on Gnosis",
      category: "DeFi",
    },
    {
      ensName: "2.horswap.eth",
      description:
        "Open source and censorship resistant interface for the Uniswap protocol",
      category: "DeFi",
      whiteIconBg: true,
    },
    {
      ensName: "cowswap.eth",
      description: "CoW Swap — MEV-protected DEX aggregator",
      category: "DeFi",
    },
    {
      ensName: "reality.eth",
      description: "Reality.eth — crowd-sourced on-chain oracle",
      category: "DeFi",
    },
    // Alternative ENS frontend
    {
      ensName: "app.ens.eth",
      description: "Alternative ENS app frontend",
      category: "Alternative ENS frontend",
    },
    // NFT
    {
      ensName: "cryptopunks.eth",
      description: "CryptoPunks NFT collection",
      category: "NFT",
    },
    {
      ensName: "etherphunks.eth",
      description: "Etherphunks NFT collection",
      category: "NFT",
    },
    {
      ensName: "cigtoken.eth",
      description: "CIG Token project",
      category: "NFT",
    },
    // Personal / Blogs
    {
      ensName: "vitalik.eth",
      description: "Blogposts by Vitalik Buterin",
      category: "Personal / Blogs",
      useEnsAvatar: true,
    },
    {
      ensName: "bitsofcode.eth",
      description: "bitsofcode — blog by Ire Aderinokun",
      category: "Personal / Blogs",
      customFaviconUrl: "https://bitsofco.de/bitsofcode.ico",
    },
    {
      ensName: "ire.eth",
      description: "Ire's personal site",
      category: "Personal / Blogs",
    },
    {
      ensName: "jango.eth",
      description: "Jango's personal site",
      category: "Personal / Blogs",
    },
    {
      ensName: "banny.eth",
      description: "Banny's personal site",
      category: "Personal / Blogs",
    },
    {
      ensName: "yihanphotos.eth",
      description: "Yihan's photography",
      category: "Personal / Blogs",
    },
    {
      ensName: "ohlife.eth",
      description: "OhLife — personal journal",
      category: "Personal / Blogs",
    },
    {
      ensName: "alex.siher.eth",
      description: "Alex Siher's personal site",
      category: "Personal / Blogs",
    },
    {
      ensName: "rekt.eth",
      description: "Rekt News — DeFi news & post-mortems",
      category: "Personal / Blogs",
      whiteIconBg: true,
    },
    // DAOs / Communities
    {
      ensName: "jbdao.eth",
      description: "Juicebox DAO",
      category: "DAOs / Communities",
      customFaviconUrl: "https://jbdao.eth.limo/avatar.png",
    },
    // Education / Docs
    {
      ensName: "showmehow.eth",
      description: "Show Me How — educational tutorials",
      category: "Education / Docs",
    },
    {
      ensName: "docs.ipfs.eth",
      description: "IPFS documentation",
      category: "Education / Docs",
      limoSuffix: ".sucks",
      customFaviconUrl: "https://docs.ipfs.eth.sucks/favicon-32x32.png",
    },
    // Tools / Infrastructure
    {
      ensName: "evmnow.eth",
      description:
        "Smart Contract Reader — streamlined open source block explorer UI",
      category: "Tools / Infrastructure",
    },
    {
      ensName: "planetable.eth",
      description: "Planetable — decentralized publishing",
      category: "Tools / Infrastructure",
    },
    {
      ensName: "webhash.eth",
      description: "WebHash — decentralized web tools",
      category: "Tools / Infrastructure",
    },
    {
      ensName: "pinme.eth",
      description: "PinMe — IPFS pinning",
      category: "Tools / Infrastructure",
    },
    {
      ensName: "geocities.eth",
      description: "Geocities revival on IPFS",
      category: "Tools / Infrastructure",
      customFaviconUrl:
        "https://github.com/GeoCities/Ads/blob/main/Ads/Nyan%20Cat%20-%20Chris.gif?raw=true",
    },
    {
      ensName: "evmfs.eth",
      description: "EVM File System",
      category: "Tools / Infrastructure",
    },
    {
      ensName: "liber3.eth",
      description: "Liber3 — decentralized publishing",
      category: "Tools / Infrastructure",
    },
    {
      ensName: "facelessprivacy.eth",
      description: "Faceless Privacy tools",
      category: "Tools / Infrastructure",
    },
    {
      ensName: "simplepage.eth",
      description: "SimplePage — simple static site builder",
      category: "Tools / Infrastructure",
      customFaviconUrl:
        "https://simplepage.eth.limo/_files/.artifacts/foamFavicon-light.png",
    },
    {
      ensName: "walkaway.fileverse.eth",
      description:
        "Fileverse Walkaway — encrypted, self-sovereign dDocs & dSheets",
      category: "Tools / Infrastructure",
      customFaviconUrl:
        "https://walkaway.fileverse.eth.link/assets/favicon-CPSrIiXo.ico",
    },
  ];

  // Filter cards by the current input value (case-insensitive match on name or description)
  const filterQuery = ensName.trim().toLowerCase();
  const filteredCards = filterQuery
    ? cardsData.filter(
        (card) =>
          card.ensName.toLowerCase().includes(filterQuery) ||
          card.description.toLowerCase().includes(filterQuery) ||
          card.category.toLowerCase().includes(filterQuery)
      )
    : cardsData;

  // Group filtered cards by category, preserving insertion order
  const groupedCards = filteredCards.reduce<Record<string, CardData[]>>(
    (acc, card) => {
      (acc[card.category] ??= []).push(card);
      return acc;
    },
    {}
  );

  // Handle input change with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Update the input value immediately for UI responsiveness
    setEnsName(value);

    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set a new timer
    debounceTimerRef.current = setTimeout(() => {
      // This will only run after the user stops typing for 500ms
      // No need to do anything here as we're just preventing re-renders
    }, 500);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault(); // Prevent default paste behavior
    const pastedText = e.clipboardData.getData("text");
    setEnsName(pastedText);
    fetchHistory(pastedText);
  };

  // Add a keyDown handler for the Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      fetchHistory();
    }
  };

  const handleExampleClick = (example: string) => {
    setEnsName(example);
    fetchHistory(example);
  };

  const fetchHistory = (_ensName?: string) => {
    setLoading(true);
    if (_ensName) {
      setEnsName(_ensName);
    }
    _ensName = _ensName ?? ensName;

    setTimeout(() => {
      setLoading(false);
    }, 1_000);

    router.push(`${getPath(subdomains.ENS.base)}history/${_ensName}`);
  };

  return (
    <Box maxW="800px" mx="auto" w="full">
      {/* Page Header */}
      <Box
        mb={8}
        mt={4}
        as={NextLink}
        href={`${getPath(subdomains.ENS.base)}history`}
        _hover={{ textDecoration: "none" }}
        textAlign="center"
        display="block"
      >
        <Heading
          size="2xl"
          fontWeight="extrabold"
          letterSpacing="tight"
          lineHeight="1.1"
          color="white"
        >
          ENS Domain History
        </Heading>
        <Text
          mt={3}
          color="gray.400"
          fontSize="md"
          maxW="600px"
          mx="auto"
        >
          Check IPFS content changes, ownership transfers and more over time.
        </Text>
      </Box>

      <Box
        p={5}
        bg="whiteAlpha.50"
        borderRadius="lg"
        border="1px solid"
        borderColor="whiteAlpha.200"
        mb={5}
      >
        <FormControl>
          <FormLabel fontWeight="medium" color="gray.300" fontSize="sm">ENS Name</FormLabel>
          <HStack spacing={3}>
            <Input
              placeholder="eternalsafe.eth"
              value={ensName}
              onChange={handleInputChange}
              onPaste={handlePaste}
              onKeyDown={handleKeyDown}
              size="md"
              bg="whiteAlpha.100"
              border="1px solid"
              borderColor="whiteAlpha.300"
              _hover={{ borderColor: "whiteAlpha.400" }}
              _focus={{
                borderColor: "blue.400",
                boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
              }}
              color="gray.100"
              _placeholder={{ color: "gray.500" }}
            />
            <Button
              onClick={() => fetchHistory()}
              isLoading={loading}
              colorScheme="blue"
            >
              Fetch
            </Button>
          </HStack>
        </FormControl>

        {!ensNameFromParams && (
          <Box mt={6}>
            <Text fontSize="sm" mb={3} color="gray.400">
              or try these examples:
            </Text>
            {filteredCards.length === 0 && (
              <Text fontSize="sm" color="gray.500" fontStyle="italic">
                No matching examples. Press Fetch to look up &quot;{ensName}&quot;.
              </Text>
            )}
            {Object.entries(groupedCards).map(([category, cards]) => (
              <Box key={category} mb={5}>
                <Text
                  fontSize="xs"
                  fontWeight="semibold"
                  textTransform="uppercase"
                  letterSpacing="wider"
                  color="gray.500"
                  mb={2}
                >
                  {category}
                </Text>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                  {cards.map((card, index) => (
                    <Card
                      key={index}
                      variant="outline"
                      shadow="sm"
                      bg="whiteAlpha.100"
                      border="1px solid"
                      borderColor="whiteAlpha.200"
                      cursor="pointer"
                      _hover={{ borderColor: "blue.400", bg: "whiteAlpha.200" }}
                      transition="all 0.2s"
                      onClick={() => handleExampleClick(card.ensName)}
                    >
                      <CardBody display="flex" alignItems="center" p={3}>
                        <Image
                          alt={card.ensName}
                          src={
                            card.customFaviconUrl
                              ? card.customFaviconUrl
                              : card.useEnsAvatar
                              ? `https://euc.li/${card.ensName}`
                              : `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&size=128&url=https://${card.ensName}${card.limoSuffix ?? ".link"}`
                          }
                          boxSize="40px"
                          borderRadius="full"
                          mr={3}
                          fallbackSrc="https://placehold.co/40x40/gray/white?text=ENS"
                          bg={card.whiteIconBg ? "white" : undefined}
                          p={card.whiteIconBg ? 1 : undefined}
                          objectFit={card.whiteIconBg ? "contain" : undefined}
                        />
                        <Box flex="1" minW={0}>
                          <HStack spacing={0} align="center">
                            <Text
                              fontWeight="bold"
                              fontSize="sm"
                              color="gray.100"
                              isTruncated
                            >
                              {card.ensName}
                            </Text>
                            <IconButton
                              as="a"
                              href={`https://${card.ensName}${
                                card.limoSuffix ?? ".link"
                              }`}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Open ${card.ensName} in a new tab`}
                              icon={<ExternalLinkIcon boxSize={2.5} />}
                              size="xs"
                              variant="ghost"
                              minW="auto"
                              h="auto"
                              p={0}
                              ml={1}
                              color="gray.400"
                              _hover={{ color: "blue.300", bg: "transparent" }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </HStack>
                          <Text fontSize="xs" color="gray.400">
                            {card.description}
                          </Text>
                        </Box>
                      </CardBody>
                    </Card>
                  ))}
                </SimpleGrid>
              </Box>
            ))}
          </Box>
        )}
      </Box>
      {children}
    </Box>
  );
};
