"use client";

import { useState, useCallback } from "react";
import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Tag,
  Divider,
  Table,
  Thead,
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
  useColorModeValue,
} from "@chakra-ui/react";
import { CheckCircleIcon } from "@chakra-ui/icons";
import { Layout } from "@/components/Layout";
import { mainnet, optimism, base, bsc, gnosis } from "wagmi/chains";

interface ChainSupport {
  ethereum: boolean;
  optimism: boolean;
  base: boolean;
  bnbChain: boolean;
  gnosisChain: boolean;
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
];

const wallets: SupportedApp[] = [
  {
    name: "Metamask",
    logoUrl:
      "https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://metamask.io&size=128",
    chainSupport: {
      ethereum: true,
      optimism: true,
      base: true,
      bnbChain: true,
      gnosisChain: true,
    },
  },
  {
    name: "Ambire",
    logoUrl:
      "https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://ambire.com&size=128",
    chainSupport: {
      ethereum: true,
      optimism: true,
      base: true,
      bnbChain: true,
      gnosisChain: true,
    },
  },
];

const dapps: SupportedApp[] = [
  {
    name: "Revoke.cash",
    logoUrl:
      "https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://revoke.cash&size=128",
    chainSupport: {
      ethereum: true,
      optimism: true,
      base: true,
      bnbChain: true,
      gnosisChain: true,
      allChains: true,
    },
  },
  {
    name: "Uniswap",
    logoUrl:
      "https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://app.uniswap.org&size=128",
    chainSupport: {
      ethereum: true,
      optimism: true,
      base: true,
      bnbChain: true,
      gnosisChain: false,
    },
  },
];

const ChainTag = ({ name, color }: { name: string; color: string }) => (
  <Tag
    size="md"
    bg={color}
    color="gray.800"
    px={3}
    py={1}
    borderRadius="md"
    fontWeight="medium"
    opacity={0.9}
    _hover={{ opacity: 1 }}
  >
    {name}
  </Tag>
);

const ChainIcon = ({
  chain,
  size = "24px",
}: {
  chain: Chain;
  size?: string;
}) => {
  // Create favicon URLs for each chain
  const getFaviconUrl = (chainName: string) => {
    const urls: Record<string, string> = {
      Ethereum:
        "https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://ethereum.org&size=128",
      Optimism:
        "https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://optimism.io&size=128",
      Base: "https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://base.org&size=128",
      "BNB Chain":
        "https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://bnbchain.org&size=128",
      "Gnosis Chain":
        "https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://gnosis.io&size=128",
    };
    return urls[chainName] || "";
  };

  const faviconUrl = getFaviconUrl(chain.name);

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
      {faviconUrl ? (
        <Image alt={chain.name} src={faviconUrl} boxSize={size} />
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
}) => (
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
      />
    ) : null}
  </Box>
);

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
          {app.name}
        </Heading>
      </Flex>
      <Divider borderColor="whiteAlpha.300" mb={3} />
      <Flex wrap="wrap" gap={2}>
        {/* For Revoke.cash, don't use the AllChainsTag but show individual chains */}
        {app.name === "Revoke.cash" && app.chainSupport.allChains ? (
          <>
            {app.chainSupport.ethereum && (
              <ChainTag name="Ethereum" color="blue.300" />
            )}
            {app.chainSupport.optimism && (
              <ChainTag name="Optimism" color="red.300" />
            )}
            {app.chainSupport.base && <ChainTag name="Base" color="blue.400" />}
            {app.chainSupport.bnbChain && (
              <ChainTag name="BNB Chain" color="yellow.300" />
            )}
            {app.chainSupport.gnosisChain && (
              <ChainTag name="Gnosis Chain" color="green.300" />
            )}
          </>
        ) : (
          <>
            {app.chainSupport.ethereum && (
              <ChainTag name="Ethereum" color="blue.300" />
            )}
            {app.chainSupport.optimism && (
              <ChainTag name="Optimism" color="red.300" />
            )}
            {app.chainSupport.base && <ChainTag name="Base" color="blue.400" />}
            {app.chainSupport.bnbChain && (
              <ChainTag name="BNB Chain" color="yellow.300" />
            )}
            {app.chainSupport.gnosisChain && (
              <ChainTag name="Gnosis Chain" color="green.300" />
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

  if (chain.name === "Ethereum") return app.chainSupport.ethereum;
  if (chain.name === "Optimism") return app.chainSupport.optimism;
  if (chain.name === "Base") return app.chainSupport.base;
  if (chain.name === "BNB Chain") return app.chainSupport.bnbChain;
  if (chain.name === "Gnosis Chain") return app.chainSupport.gnosisChain;

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
        <Center flexDirection="column" pt={4}>
          <Heading as="h1" size="xl" mb={3} textAlign="center" color="white">
            7702 Beat
          </Heading>

          <Text
            fontSize="lg"
            textAlign="center"
            color="whiteAlpha.900"
            maxW="700px"
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
                            <Text>{wallet.name}</Text>
                          </Flex>
                        </Td>
                        <Td py={4}>
                          <Flex wrap="wrap" gap={2}>
                            {wallet.chainSupport.ethereum && (
                              <ChainTag name="Ethereum" color="blue.300" />
                            )}
                            {wallet.chainSupport.optimism && (
                              <ChainTag name="Optimism" color="red.300" />
                            )}
                            {wallet.chainSupport.base && (
                              <ChainTag name="Base" color="blue.400" />
                            )}
                            {wallet.chainSupport.bnbChain && (
                              <ChainTag name="BNB Chain" color="yellow.300" />
                            )}
                            {wallet.chainSupport.gnosisChain && (
                              <ChainTag name="Gnosis Chain" color="green.300" />
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
                            <Text>{dapp.name}</Text>
                          </Flex>
                        </Td>
                        <Td py={4}>
                          <Flex wrap="wrap" gap={2}>
                            {/* For Revoke.cash, show individual chains instead of "All Chains" */}
                            {dapp.name === "Revoke.cash" &&
                            dapp.chainSupport.allChains ? (
                              <>
                                {dapp.chainSupport.ethereum && (
                                  <ChainTag name="Ethereum" color="blue.300" />
                                )}
                                {dapp.chainSupport.optimism && (
                                  <ChainTag name="Optimism" color="red.300" />
                                )}
                                {dapp.chainSupport.base && (
                                  <ChainTag name="Base" color="blue.400" />
                                )}
                                {dapp.chainSupport.bnbChain && (
                                  <ChainTag
                                    name="BNB Chain"
                                    color="yellow.300"
                                  />
                                )}
                                {dapp.chainSupport.gnosisChain && (
                                  <ChainTag
                                    name="Gnosis Chain"
                                    color="green.300"
                                  />
                                )}
                              </>
                            ) : (
                              <>
                                {dapp.chainSupport.ethereum && (
                                  <ChainTag name="Ethereum" color="blue.300" />
                                )}
                                {dapp.chainSupport.optimism && (
                                  <ChainTag name="Optimism" color="red.300" />
                                )}
                                {dapp.chainSupport.base && (
                                  <ChainTag name="Base" color="blue.400" />
                                )}
                                {dapp.chainSupport.bnbChain && (
                                  <ChainTag
                                    name="BNB Chain"
                                    color="yellow.300"
                                  />
                                )}
                                {dapp.chainSupport.gnosisChain && (
                                  <ChainTag
                                    name="Gnosis Chain"
                                    color="green.300"
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
