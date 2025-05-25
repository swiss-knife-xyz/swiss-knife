"use client";

import { useState, useCallback } from "react";
import {
  Box,
  Heading,
  Text,
  VStack,
  Tag,
  Divider,
  Table,
  Tbody,
  Tr,
  Th,
  Td,
  useBreakpointValue,
  Center,
  Flex,
  SimpleGrid,
  Image,
  Button,
  Tooltip,
} from "@chakra-ui/react";
import { Layout } from "@/components/Layout";
import {
  mainnet,
  optimism,
  base,
  bsc,
  gnosis,
  polygon,
  unichain,
} from "wagmi/chains";
import { chainIdToImage } from "@/data/common";

interface ChainSupport {
  ethereum?: boolean;
  optimism?: boolean;
  base?: boolean;
  bnbChain?: boolean;
  gnosisChain?: boolean;
  polygon?: boolean;
  unichain?: boolean;
  allChains?: boolean;
}

interface Chain {
  id: number;
  name: string;
  color: string;
  abbreviation?: string;
  chainObj: any; // Using any here for simplicity
}

interface SupportedApp {
  name: string;
  logoUrl?: string;
  siteUrl?: string;
  chainSupport: ChainSupport;
}

// All chains that support 7702
const chains: Chain[] = [
  {
    id: mainnet.id,
    name: "Ethereum",
    color: "blue.300",
    abbreviation: "ETH",
    chainObj: mainnet,
  },
  {
    id: optimism.id,
    name: "Optimism",
    color: "red.300",
    abbreviation: "OP",
    chainObj: optimism,
  },
  {
    id: base.id,
    name: "Base",
    color: "blue.400",
    abbreviation: "BASE",
    chainObj: base,
  },
  {
    id: bsc.id,
    name: "BNB Chain",
    color: "yellow.300",
    abbreviation: "BNB",
    chainObj: bsc,
  },
  {
    id: gnosis.id,
    name: "Gnosis Chain",
    color: "green.300",
    abbreviation: "GNO",
    chainObj: gnosis,
  },
  {
    id: polygon.id,
    name: "Polygon",
    color: "purple.500",
    abbreviation: "POL",
    chainObj: polygon,
  },
  {
    id: unichain.id,
    name: "UniChain",
    color: "pink.400",
    abbreviation: "UNI",
    chainObj: unichain,
  },
];

const wallets: SupportedApp[] = [
  {
    name: "Metamask",
    logoUrl:
      "https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://metamask.io&size=128",
    siteUrl: "https://metamask.io/",
    chainSupport: {
      ethereum: true,
      optimism: true,
      base: true,
      bnbChain: true,
      gnosisChain: true,
      polygon: true,
    },
  },
  {
    name: "Ambire",
    logoUrl:
      "https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://ambire.com&size=128",
    siteUrl: "https://www.ambire.com/",
    chainSupport: {
      ethereum: true,
      optimism: true,
      base: true,
      bnbChain: true,
      gnosisChain: true,
      polygon: true,
    },
  },
];

const dapps: SupportedApp[] = [
  {
    name: "Revoke.cash",
    logoUrl:
      "https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://revoke.cash&size=128",
    siteUrl: "https://revoke.cash/",
    chainSupport: {
      ethereum: true,
      optimism: true,
      base: true,
      bnbChain: true,
      gnosisChain: true,
      polygon: true,
      unichain: true,
      allChains: true,
    },
  },
  {
    name: "Uniswap",
    logoUrl:
      "https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://app.uniswap.org&size=128",
    siteUrl: "https://app.uniswap.org/",
    chainSupport: {
      ethereum: true,
      optimism: true,
      base: true,
      bnbChain: true,
      polygon: true,
      unichain: true,
    },
  },
  {
    name: "Vaults.fyi",
    logoUrl:
      "https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://app.vaults.fyi&size=128",
    siteUrl: "https://app.vaults.fyi/",
    chainSupport: {
      base: true,
      // TODO: also supports: arbitrum, berachain, celo
    },
  },
  {
    name: "Lido",
    logoUrl:
      "https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://stake.lido.fi/&size=128",
    siteUrl: "https://stake.lido.fi/",
    chainSupport: {
      ethereum: true,
    },
  },
  {
    name: "Relay",
    logoUrl:
      "https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://relay.link/&size=128",
    siteUrl: "https://relay.link/bridge",
    chainSupport: {
      ethereum: true,
      optimism: true,
      base: true,
      bnbChain: true,
      gnosisChain: true,
      polygon: true,
      unichain: true,
    },
  },
  {
    name: "Ekubo",
    logoUrl:
      "https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://evm.ekubo.org/&size=128",
    siteUrl: "https://evm.ekubo.org/",
    chainSupport: {
      ethereum: true,
    },
  },
  {
    name: "Jumper",
    logoUrl:
      "https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://jumper.exchange/&size=128",
    siteUrl: "https://jumper.exchange/",
    chainSupport: {
      ethereum: true,
      optimism: true,
      base: true,
      bnbChain: true,
      gnosisChain: true,
      polygon: true,
      unichain: true,
    },
  },
  {
    name: "Spark",
    logoUrl:
      "https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://spark.fi/&size=128",
    siteUrl: "https://spark.fi/",
    chainSupport: {
      ethereum: true,
      base: true,
      gnosisChain: true,
    },
  },
  {
    name: "Matcha",
    logoUrl:
      "https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://matcha.xyz/&size=128",
    siteUrl: "https://matcha.xyz/",
    chainSupport: {
      ethereum: true,
      optimism: true,
      base: true,
      bnbChain: true,
      gnosisChain: true,
      polygon: true,
      unichain: true,
    },
  },
  {
    name: "ZAMM",
    logoUrl:
      "https://pbs.twimg.com/profile_images/1923055014492209152/YBAwv6wp_400x400.jpg",
    siteUrl: "https://coin.nani.ooo/",
    chainSupport: {
      ethereum: true,
    },
  },
];

const ChainTag = ({
  name,
  color,
  abbreviation,
}: {
  name: string;
  color: string;
  abbreviation?: string;
}) => {
  // Find the matching chain object to get the chain ID and other properties
  const chainObj = chains.find(
    (c) => c.name === name || c.abbreviation === abbreviation
  );

  if (!chainObj) return null;

  return (
    <Tooltip
      label={chainObj.abbreviation || chainObj.name}
      hasArrow
      placement="top"
      bg="white"
    >
      <Box display="inline-flex" alignItems="center" mr={1} mb={1}>
        <ChainIcon chain={chainObj} size="24px" />
      </Box>
    </Tooltip>
  );
};

const ChainIcon = ({
  chain,
  size = "24px",
}: {
  chain: Chain;
  size?: string;
}) => {
  const logoUrl = chainIdToImage[chain.id] || "";

  // Special case for BNB Chain - use a darker background and add a border for better visibility
  const bgColor =
    chain.name === "BNB Chain"
      ? "yellow.800" // Darker background for BNB
      : chain.chainObj.iconBackground || chain.color;

  return (
    <Box
      w={size}
      h={size}
      bg={bgColor}
      overflow="hidden"
      rounded="full"
      display="flex"
      alignItems="center"
      justifyContent="center"
      mb={2}
      mx="auto"
      border={chain.name === "BNB Chain" ? "1px solid white" : "none"}
    >
      {logoUrl ? (
        <Image alt={chain.name} src={logoUrl} boxSize={size} />
      ) : chain.chainObj.iconUrl ? (
        <Image alt={chain.name} src={chain.chainObj.iconUrl} boxSize={size} />
      ) : (
        <Text fontWeight="bold" fontSize="xs" color="white">
          {chain.abbreviation || chain.name.substring(0, 3)}
        </Text>
      )}
    </Box>
  );
};

const AppLogo = ({
  app,
  size = "24px",
}: {
  app: SupportedApp;
  size?: string;
}) => {
  // List of apps that need white background for their logos
  const needsWhiteBg = ["Vaults.fyi", "Jumper"];

  return (
    <Box
      w={size}
      h={size}
      mr={3}
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      {app.logoUrl ? (
        <Image
          alt={app.name}
          src={app.logoUrl}
          boxSize={size}
          objectFit="contain"
          rounded={"full"}
          bg={needsWhiteBg.includes(app.name) ? "white" : "transparent"}
        />
      ) : null}
    </Box>
  );
};

interface ChainCardProps {
  chain: Chain;
  onClick: (chain: Chain) => void;
  isSelected: boolean;
}

const ChainCard = ({ chain, onClick, isSelected }: ChainCardProps) => (
  <Box
    borderWidth="1px"
    borderColor={isSelected ? chain.color : "whiteAlpha.400"}
    borderRadius="lg"
    p={4}
    bg={isSelected ? `${chain.color}15` : "blackAlpha.200"}
    textAlign="center"
    cursor="pointer"
    transition="all 0.2s"
    _hover={{
      borderColor: chain.color,
      transform: "translateY(-2px)",
      boxShadow: "md",
    }}
    onClick={() => onClick(chain)}
  >
    <ChainIcon chain={chain} size="40px" />
    <Text fontWeight="bold" color={chain.color} mb={1}>
      {chain.abbreviation || chain.name}
    </Text>
    <Text fontSize="sm" color="whiteAlpha.800">
      {chain.name}
    </Text>
  </Box>
);

// For mobile responsive view
const AppCard = ({
  app,
  filterChain,
}: {
  app: SupportedApp;
  filterChain: Chain | null;
}) => {
  // Check if this app supports the filtered chain
  const isAppFiltered =
    filterChain !== null && !supportsChain(app, filterChain);

  return (
    <Box
      borderWidth="1px"
      borderColor="whiteAlpha.300"
      borderRadius="lg"
      p={4}
      mb={4}
      bg="blackAlpha.200"
      opacity={isAppFiltered ? 0.5 : 1}
      transition="all 0.2s"
      _hover={{ borderColor: "whiteAlpha.400" }}
    >
      <Flex align="center" mb={3}>
        <AppLogo app={app} size="30px" />
        <Heading size="md" color="white">
          {app.siteUrl ? (
            <a
              href={app.siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              {app.name}
            </a>
          ) : (
            app.name
          )}
        </Heading>
      </Flex>
      <Divider borderColor="whiteAlpha.300" mb={3} />
      <Flex wrap="wrap" gap={2}>
        {/* For Revoke.cash, don't use the AllChainsTag but show individual chains */}
        {app.name === "Revoke.cash" && app.chainSupport.allChains ? (
          <>
            {app.chainSupport.ethereum && (
              <ChainTag name="Ethereum" color="blue.300" abbreviation="ETH" />
            )}
            {app.chainSupport.optimism && (
              <ChainTag name="Optimism" color="red.300" abbreviation="OP" />
            )}
            {app.chainSupport.base && (
              <ChainTag name="Base" color="blue.400" abbreviation="BASE" />
            )}
            {app.chainSupport.bnbChain && (
              <ChainTag
                name="BNB Chain"
                color="yellow.300"
                abbreviation="BNB"
              />
            )}
            {app.chainSupport.gnosisChain && (
              <ChainTag
                name="Gnosis Chain"
                color="green.300"
                abbreviation="GNO"
              />
            )}
            {app.chainSupport.polygon && (
              <ChainTag name="Polygon" color="purple.500" abbreviation="POL" />
            )}
            {app.chainSupport.unichain && (
              <ChainTag name="UniChain" color="pink.400" abbreviation="UNI" />
            )}
          </>
        ) : (
          <>
            {app.chainSupport.ethereum && (
              <ChainTag name="Ethereum" color="blue.300" abbreviation="ETH" />
            )}
            {app.chainSupport.optimism && (
              <ChainTag name="Optimism" color="red.300" abbreviation="OP" />
            )}
            {app.chainSupport.base && (
              <ChainTag name="Base" color="blue.400" abbreviation="BASE" />
            )}
            {app.chainSupport.bnbChain && (
              <ChainTag
                name="BNB Chain"
                color="yellow.300"
                abbreviation="BNB"
              />
            )}
            {app.chainSupport.gnosisChain && (
              <ChainTag
                name="Gnosis Chain"
                color="green.300"
                abbreviation="GNO"
              />
            )}
            {app.chainSupport.polygon && (
              <ChainTag name="Polygon" color="purple.500" abbreviation="POL" />
            )}
            {app.chainSupport.unichain && (
              <ChainTag name="UniChain" color="pink.400" abbreviation="UNI" />
            )}
          </>
        )}
      </Flex>
    </Box>
  );
};

// Utility to check if an app supports a specific chain
const supportsChain = (app: SupportedApp, chain: Chain): boolean => {
  if (app.chainSupport.allChains) return true;

  if (chain.name === "Ethereum") return !!app.chainSupport.ethereum;
  if (chain.name === "Optimism") return !!app.chainSupport.optimism;
  if (chain.name === "Base") return !!app.chainSupport.base;
  if (chain.name === "BNB Chain") return !!app.chainSupport.bnbChain;
  if (chain.name === "Gnosis Chain") return !!app.chainSupport.gnosisChain;
  if (chain.name === "Polygon") return !!app.chainSupport.polygon;
  if (chain.name === "UniChain") return !!app.chainSupport.unichain;

  return false;
};

const SevenSevenZeroTwoBeat = () => {
  const isMobile = useBreakpointValue({ base: true, md: false });
  const [selectedChain, setSelectedChain] = useState<Chain | null>(null);

  const handleChainClick = useCallback((chain: Chain) => {
    setSelectedChain((prevChain) =>
      prevChain?.id === chain.id ? null : chain
    );
  }, []);

  const clearFilter = useCallback(() => {
    setSelectedChain(null);
  }, []);

  // Filter wallets and dapps based on selected chain
  const filteredWallets = selectedChain
    ? wallets.filter((wallet) => supportsChain(wallet, selectedChain))
    : wallets;

  const filteredDapps = selectedChain
    ? dapps.filter((dapp) => supportsChain(dapp, selectedChain))
    : dapps;

  return (
    <Layout>
      <VStack spacing={10} align="stretch" width="100%" px={{ base: 2, md: 4 }}>
        <Center flexDirection="column" pt={8} pb={6}>
          <Heading
            as="h1"
            size="2xl"
            mb={4}
            textAlign="center"
            color="white"
            letterSpacing="tight"
            fontWeight="black"
            display="inline-flex"
            alignItems="center"
            position="relative"
          >
            <Text as="span" color="red.400">
              7702
            </Text>
            <Text as="span" color="white" ml={2}>
              Beat
            </Text>
          </Heading>

          <Text
            fontSize="lg"
            textAlign="center"
            color="whiteAlpha.800"
            maxW="700px"
            px={4}
          >
            Stats about 7702 adoption across EVM chains, Wallets and Dapps
          </Text>
        </Center>

        <Box>
          <Flex justify="space-between" align="center" mb={5}>
            <Heading size="lg" color="white">
              Chains Supporting 7702
            </Heading>
            {selectedChain && (
              <Button
                size="sm"
                variant="outline"
                onClick={clearFilter}
                borderRadius="md"
                color="white"
                borderColor="whiteAlpha.400"
                _hover={{ bg: "whiteAlpha.100" }}
              >
                Clear Filter
              </Button>
            )}
          </Flex>
          <SimpleGrid columns={{ base: 2, sm: 3, md: 5 }} spacing={4} mb={6}>
            {chains.map((chain, idx) => (
              <ChainCard
                key={idx}
                chain={chain}
                onClick={handleChainClick}
                isSelected={selectedChain?.id === chain.id}
              />
            ))}
          </SimpleGrid>
        </Box>

        <Box>
          <Heading size="lg" mb={5} color="white">
            Wallets
          </Heading>

          {isMobile ? (
            // Mobile view with cards
            <VStack spacing={4} align="stretch">
              {wallets.map((wallet, idx) => (
                <AppCard key={idx} app={wallet} filterChain={selectedChain} />
              ))}
            </VStack>
          ) : (
            // Desktop view with table
            <Box
              overflowX="auto"
              borderRadius="lg"
              borderWidth="1px"
              borderColor="whiteAlpha.200"
            >
              <Table variant="simple">
                <Tbody>
                  {wallets.map((wallet, index) => {
                    const isWalletFiltered =
                      selectedChain !== null &&
                      !supportsChain(wallet, selectedChain);
                    return (
                      <Tr
                        key={index}
                        borderBottom={
                          index < wallets.length - 1 ? "1px solid" : "none"
                        }
                        borderColor="whiteAlpha.200"
                        opacity={isWalletFiltered ? 0.5 : 1}
                        bg={isWalletFiltered ? "blackAlpha.400" : "transparent"}
                      >
                        <Td
                          width="200px"
                          py={4}
                          fontWeight="bold"
                          color="white"
                          verticalAlign="middle"
                        >
                          <Flex align="center">
                            <AppLogo app={wallet} size="26px" />
                            {wallet.siteUrl ? (
                              <a
                                href={wallet.siteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  textDecoration: "none",
                                  color: "inherit",
                                }}
                              >
                                <Text>{wallet.name}</Text>
                              </a>
                            ) : (
                              <Text>{wallet.name}</Text>
                            )}
                          </Flex>
                        </Td>
                        <Td py={4}>
                          <Flex wrap="wrap" gap={2}>
                            {wallet.chainSupport.ethereum && (
                              <ChainTag
                                name="Ethereum"
                                color="blue.300"
                                abbreviation="ETH"
                              />
                            )}
                            {wallet.chainSupport.optimism && (
                              <ChainTag
                                name="Optimism"
                                color="red.300"
                                abbreviation="OP"
                              />
                            )}
                            {wallet.chainSupport.base && (
                              <ChainTag
                                name="Base"
                                color="blue.400"
                                abbreviation="BASE"
                              />
                            )}
                            {wallet.chainSupport.bnbChain && (
                              <ChainTag
                                name="BNB Chain"
                                color="yellow.300"
                                abbreviation="BNB"
                              />
                            )}
                            {wallet.chainSupport.gnosisChain && (
                              <ChainTag
                                name="Gnosis Chain"
                                color="green.300"
                                abbreviation="GNO"
                              />
                            )}
                            {wallet.chainSupport.polygon && (
                              <ChainTag
                                name="Polygon"
                                color="purple.500"
                                abbreviation="POL"
                              />
                            )}
                            {wallet.chainSupport.unichain && (
                              <ChainTag
                                name="UniChain"
                                color="pink.400"
                                abbreviation="UNI"
                              />
                            )}
                          </Flex>
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </Box>
          )}
        </Box>

        <Box>
          <Heading size="lg" mb={5} color="white">
            Dapps
          </Heading>

          {isMobile ? (
            // Mobile view with cards
            <VStack spacing={4} align="stretch">
              {dapps.map((dapp, idx) => (
                <AppCard key={idx} app={dapp} filterChain={selectedChain} />
              ))}
            </VStack>
          ) : (
            // Desktop view with table
            <Box
              overflowX="auto"
              borderRadius="lg"
              borderWidth="1px"
              borderColor="whiteAlpha.200"
            >
              <Table variant="simple">
                <Tbody>
                  {dapps.map((dapp, index) => {
                    const isDappFiltered =
                      selectedChain !== null &&
                      !supportsChain(dapp, selectedChain);
                    return (
                      <Tr
                        key={index}
                        borderBottom={
                          index < dapps.length - 1 ? "1px solid" : "none"
                        }
                        borderColor="whiteAlpha.200"
                        opacity={isDappFiltered ? 0.5 : 1}
                        bg={isDappFiltered ? "blackAlpha.400" : "transparent"}
                      >
                        <Td
                          width="200px"
                          py={4}
                          fontWeight="bold"
                          color="white"
                          verticalAlign="middle"
                        >
                          <Flex align="center">
                            <AppLogo app={dapp} size="26px" />
                            {dapp.siteUrl ? (
                              <a
                                href={dapp.siteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  textDecoration: "none",
                                  color: "inherit",
                                }}
                              >
                                <Text>{dapp.name}</Text>
                              </a>
                            ) : (
                              <Text>{dapp.name}</Text>
                            )}
                          </Flex>
                        </Td>
                        <Td py={4}>
                          <Flex wrap="wrap" gap={2}>
                            {/* For Revoke.cash, show individual chains instead of "All Chains" */}
                            {dapp.name === "Revoke.cash" &&
                            dapp.chainSupport.allChains ? (
                              <>
                                {dapp.chainSupport.ethereum && (
                                  <ChainTag
                                    name="Ethereum"
                                    color="blue.300"
                                    abbreviation="ETH"
                                  />
                                )}
                                {dapp.chainSupport.optimism && (
                                  <ChainTag
                                    name="Optimism"
                                    color="red.300"
                                    abbreviation="OP"
                                  />
                                )}
                                {dapp.chainSupport.base && (
                                  <ChainTag
                                    name="Base"
                                    color="blue.400"
                                    abbreviation="BASE"
                                  />
                                )}
                                {dapp.chainSupport.bnbChain && (
                                  <ChainTag
                                    name="BNB Chain"
                                    color="yellow.300"
                                    abbreviation="BNB"
                                  />
                                )}
                                {dapp.chainSupport.gnosisChain && (
                                  <ChainTag
                                    name="Gnosis Chain"
                                    color="green.300"
                                    abbreviation="GNO"
                                  />
                                )}
                                {dapp.chainSupport.polygon && (
                                  <ChainTag
                                    name="Polygon"
                                    color="purple.500"
                                    abbreviation="POL"
                                  />
                                )}
                                {dapp.chainSupport.unichain && (
                                  <ChainTag
                                    name="UniChain"
                                    color="pink.400"
                                    abbreviation="UNI"
                                  />
                                )}
                              </>
                            ) : (
                              <>
                                {dapp.chainSupport.ethereum && (
                                  <ChainTag
                                    name="Ethereum"
                                    color="blue.300"
                                    abbreviation="ETH"
                                  />
                                )}
                                {dapp.chainSupport.optimism && (
                                  <ChainTag
                                    name="Optimism"
                                    color="red.300"
                                    abbreviation="OP"
                                  />
                                )}
                                {dapp.chainSupport.base && (
                                  <ChainTag
                                    name="Base"
                                    color="blue.400"
                                    abbreviation="BASE"
                                  />
                                )}
                                {dapp.chainSupport.bnbChain && (
                                  <ChainTag
                                    name="BNB Chain"
                                    color="yellow.300"
                                    abbreviation="BNB"
                                  />
                                )}
                                {dapp.chainSupport.gnosisChain && (
                                  <ChainTag
                                    name="Gnosis Chain"
                                    color="green.300"
                                    abbreviation="GNO"
                                  />
                                )}
                                {dapp.chainSupport.polygon && (
                                  <ChainTag
                                    name="Polygon"
                                    color="purple.500"
                                    abbreviation="POL"
                                  />
                                )}
                                {dapp.chainSupport.unichain && (
                                  <ChainTag
                                    name="UniChain"
                                    color="pink.400"
                                    abbreviation="UNI"
                                  />
                                )}
                              </>
                            )}
                          </Flex>
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </Box>
          )}
        </Box>
      </VStack>
    </Layout>
  );
};

export default SevenSevenZeroTwoBeat;
