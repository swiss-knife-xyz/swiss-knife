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
  HStack,
  Link,
} from "@chakra-ui/react";
import { Layout } from "@/components/Layout";
import {
  mainnet,
  optimism,
  base,
  bsc,
  gnosis,
  ink,
  polygon,
  unichain,
} from "wagmi/chains";
import { chainIdToImage } from "@/data/common";

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
  supportedChainIds: number[];
  filterSupportsAllChains?: boolean; // For filtering logic: if true, supports all chains in the global list
}

const getFaviconUrl = (url: string) => {
  return `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${url}&size=128`;
};

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
    id: ink.id,
    name: "Ink",
    color: "purple.400",
    abbreviation: "INK",
    chainObj: ink,
  },
  {
    id: optimism.id,
    name: "Optimism",
    color: "red.300",
    abbreviation: "OP",
    chainObj: optimism,
  },
  // {
  //   id: polygon.id,
  //   name: "Polygon",
  //   color: "purple.500",
  //   abbreviation: "POL",
  //   chainObj: polygon,
  // },
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
    logoUrl: getFaviconUrl("https://metamask.io"),
    siteUrl: "https://metamask.io/",
    supportedChainIds: [
      mainnet.id,
      base.id,
      bsc.id,
      gnosis.id,
      optimism.id,
      // polygon.id,
    ],
  },
  {
    name: "Ambire",
    logoUrl: getFaviconUrl("https://ambire.com"),
    siteUrl: "https://www.ambire.com/",
    supportedChainIds: [
      mainnet.id,
      base.id,
      bsc.id,
      gnosis.id,
      ink.id,
      optimism.id,
      // polygon.id,
      unichain.id,
    ],
  },
  {
    name: "OKX Wallet",
    logoUrl: getFaviconUrl("https://web3.okx.com/"),
    siteUrl: "https://web3.okx.com/",
    supportedChainIds: [
      mainnet.id,
      base.id,
      bsc.id,
      gnosis.id,
      ink.id,
      optimism.id,
      // polygon.id,
      unichain.id,
    ],
  },
  {
    name: "Trust Wallet",
    logoUrl: getFaviconUrl("https://trustwallet.com/"),
    siteUrl: "https://trustwallet.com/",
    supportedChainIds: [mainnet.id, bsc.id],
  },
];

const dapps: SupportedApp[] = [
  {
    name: "Ask Gina",
    logoUrl: getFaviconUrl("https://askgina.ai/"),
    siteUrl: "https://askgina.ai/",
    supportedChainIds: [mainnet.id, base.id, bsc.id, optimism.id],
  },
  {
    name: "Cabana",
    logoUrl: getFaviconUrl("https://app.cabana.fi/"),
    siteUrl: "https://app.cabana.fi/",
    supportedChainIds: [mainnet.id, base.id, gnosis.id, optimism.id],
  },
  {
    name: "Ekubo",
    logoUrl: getFaviconUrl("https://evm.ekubo.org/"),
    siteUrl: "https://evm.ekubo.org/",
    supportedChainIds: [mainnet.id],
  },
  {
    name: "Ethena",
    logoUrl: getFaviconUrl("https://app.ethena.fi/"),
    siteUrl: "https://app.ethena.fi/",
    supportedChainIds: [mainnet.id],
  },
  {
    name: "Fibrous",
    logoUrl: getFaviconUrl("https://app.fibrous.finance/"),
    siteUrl: "https://app.fibrous.finance/",
    supportedChainIds: [base.id],
  },
  {
    name: "Flaunch",
    logoUrl: getFaviconUrl("https://flaunch.gg/"),
    siteUrl: "https://flaunch.gg/",
    supportedChainIds: [base.id],
  },
  {
    name: "Jumper",
    logoUrl: getFaviconUrl("https://jumper.exchange/"),
    siteUrl: "https://jumper.exchange/",
    supportedChainIds: [
      mainnet.id,
      base.id,
      bsc.id,
      gnosis.id,
      ink.id,
      optimism.id,
      // polygon.id,
      unichain.id,
    ],
  },
  {
    name: "Lido",
    logoUrl: getFaviconUrl("https://stake.lido.fi/"),
    siteUrl: "https://stake.lido.fi/",
    supportedChainIds: [mainnet.id],
  },
  {
    name: "Matcha",
    logoUrl: getFaviconUrl("https://matcha.xyz/"),
    siteUrl: "https://matcha.xyz/",
    supportedChainIds: [
      mainnet.id,
      base.id,
      bsc.id,
      gnosis.id,
      optimism.id,
      // polygon.id,
      unichain.id,
    ],
  },
  {
    name: "PWN",
    logoUrl: getFaviconUrl("https://app.pwn.xyz/"),
    siteUrl: "https://app.pwn.xyz/",
    supportedChainIds: [
      mainnet.id,
      base.id,
      gnosis.id,
      ink.id,
      optimism.id,
      unichain.id,
    ],
  },
  {
    name: "Relay",
    logoUrl: getFaviconUrl("https://relay.link/"),
    siteUrl: "https://relay.link/bridge",
    supportedChainIds: [
      mainnet.id,
      base.id,
      bsc.id,
      gnosis.id,
      ink.id,
      optimism.id,
      // polygon.id,
      unichain.id,
    ],
  },
  {
    name: "Reserve",
    logoUrl: getFaviconUrl("https://app.reserve.org/"),
    siteUrl: "https://app.reserve.org/",
    supportedChainIds: [mainnet.id, base.id],
  },
  {
    name: "Revoke.cash",
    logoUrl: getFaviconUrl("https://revoke.cash"),
    siteUrl: "https://revoke.cash/",
    supportedChainIds: [
      mainnet.id,
      base.id,
      bsc.id,
      gnosis.id,
      ink.id,
      optimism.id,
      // polygon.id,
      unichain.id,
    ],
    filterSupportsAllChains: true, // Was allChains: true
  },
  {
    name: "Spark",
    logoUrl: getFaviconUrl("https://spark.fi/"),
    siteUrl: "https://spark.fi/",
    supportedChainIds: [mainnet.id, base.id, gnosis.id],
  },
  {
    name: "Uniswap",
    logoUrl: getFaviconUrl("https://app.uniswap.org"),
    siteUrl: "https://app.uniswap.org/",
    supportedChainIds: [
      mainnet.id,
      base.id,
      bsc.id,
      optimism.id,
      // polygon.id,
      unichain.id,
    ],
  },
  {
    name: "Vaults.fyi",
    logoUrl: getFaviconUrl("https://app.vaults.fyi"),
    siteUrl: "https://app.vaults.fyi/",
    supportedChainIds: [
      mainnet.id,
      base.id,
      gnosis.id,
      optimism.id,
      unichain.id,
      // TODO: also supports: arbitrum, berachain, celo
    ],
  },
  {
    name: "WalletConnect Staking",
    logoUrl: getFaviconUrl("https://staking.walletconnect.network/"),
    siteUrl: "https://staking.walletconnect.network/",
    supportedChainIds: [optimism.id],
  },
  {
    name: "ZAMM",
    logoUrl:
      "https://pbs.twimg.com/profile_images/1923055014492209152/YBAwv6wp_400x400.jpg",
    siteUrl: "https://coin.nani.ooo/",
    supportedChainIds: [mainnet.id],
  },
];

const ChainTag = ({ chain }: { chain: Chain }) => {
  return (
    <Tooltip
      label={chain.abbreviation || chain.name}
      hasArrow
      placement="top"
      bg="white"
    >
      <Box display="inline-flex" alignItems="center" mr={1} mb={1}>
        <ChainIcon chain={chain} size="24px" />
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

const AppChainDisplay = ({
  supportedAppChainIds,
  globalChainsList,
}: {
  supportedAppChainIds: number[];
  globalChainsList: Chain[];
}) => {
  const chainsToDisplay = supportedAppChainIds
    .map((id) => globalChainsList.find((chain) => chain.id === id))
    .filter((chain) => chain !== undefined) as Chain[]; // Type assertion to Chain[]

  return (
    <Flex wrap="wrap" gap={2}>
      {chainsToDisplay.map((chain) => (
        <ChainTag key={chain.id} chain={chain} />
      ))}
    </Flex>
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
            <Link
              href={app.siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              color="inherit"
              textDecoration="none"
              _hover={{ textDecoration: "underline" }}
            >
              {app.name}
            </Link>
          ) : (
            app.name
          )}
        </Heading>
      </Flex>
      <Divider borderColor="whiteAlpha.300" mb={3} />
      <AppChainDisplay
        supportedAppChainIds={app.supportedChainIds}
        globalChainsList={chains}
      />
    </Box>
  );
};

// Utility to check if an app supports a specific chain
const supportsChain = (app: SupportedApp, chainToFilterBy: Chain): boolean => {
  if (app.filterSupportsAllChains) return true;
  return app.supportedChainIds.includes(chainToFilterBy.id);
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
        <Center flexDirection="column" pt={8}>
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
              <Link
                href="https://eip.tools/eip/7702"
                target="_blank"
                rel="noopener noreferrer"
                color="inherit"
                textDecoration="none"
                _hover={{ textDecoration: "underline" }}
              >
                7702
              </Link>
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
            Stats about{" "}
            <Link
              href="https://eip.tools/eip/7702"
              target="_blank"
              rel="noopener noreferrer"
              color="inherit"
              textDecoration="none"
              _hover={{ textDecoration: "underline" }}
            >
              7702
            </Link>{" "}
            adoption across EVM chains, Wallets and Dapps
          </Text>
        </Center>

        <Box>
          <Flex justify="space-between" align="center" mb={5}>
            <Heading size="lg" color="white">
              Chains Supporting{" "}
              <Link
                href="https://eip.tools/eip/7702"
                target="_blank"
                rel="noopener noreferrer"
                color="inherit"
                textDecoration="none"
                _hover={{ textDecoration: "underline" }}
              >
                7702
              </Link>
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
                              <Link
                                href={wallet.siteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                color="inherit"
                                textDecoration="none"
                                _hover={{ textDecoration: "underline" }}
                              >
                                <Text>{wallet.name}</Text>
                              </Link>
                            ) : (
                              <Text>{wallet.name}</Text>
                            )}
                          </Flex>
                        </Td>
                        <Td py={4}>
                          <AppChainDisplay
                            supportedAppChainIds={wallet.supportedChainIds}
                            globalChainsList={chains}
                          />
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
          <HStack mb={5} alignItems="baseline">
            <Heading size="lg" color="white">
              Dapps
            </Heading>
            <Text fontSize={"md"} color="whiteAlpha.800">
              (Supporting{" "}
              <Link
                href="https://eip.tools/eip/5792"
                target="_blank"
                rel="noopener noreferrer"
                color="inherit"
                textDecoration="none"
                _hover={{ textDecoration: "underline" }}
              >
                EIP-5792
              </Link>
              )
            </Text>
          </HStack>

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
                              <Link
                                href={dapp.siteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                color="inherit"
                                textDecoration="none"
                                _hover={{ textDecoration: "underline" }}
                              >
                                <Text>{dapp.name}</Text>
                              </Link>
                            ) : (
                              <Text>{dapp.name}</Text>
                            )}
                          </Flex>
                        </Td>
                        <Td py={4}>
                          <AppChainDisplay
                            supportedAppChainIds={dapp.supportedChainIds}
                            globalChainsList={chains}
                          />
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
