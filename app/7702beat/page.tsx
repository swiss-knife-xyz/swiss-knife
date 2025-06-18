"use client";

import { useState, useCallback, useEffect } from "react";
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
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Badge,
} from "@chakra-ui/react";
import { FaXTwitter } from "react-icons/fa6";
import { Layout } from "@/components/Layout";
import { useRouter, usePathname } from "next/navigation";
import {
  mainnet,
  arbitrum,
  base,
  berachain,
  bsc,
  gnosis,
  ink,
  optimism,
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
  needsWhiteBg?: boolean;
  siteUrl?: string;
  supportedChainIds: number[];
  announcement?: {
    epochTimestamp: number;
    tweet: string;
  };
  filterSupportsAllChains?: boolean; // For filtering logic: if true, supports all chains in the global list
  twitterHandle?: string; // For Wall of Shame "Post on X" functionality
}

const getFaviconUrl = (url: string) => {
  return `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${url}&size=128`;
};

// Wall of Shame epoch timestamp - you can update this later
const WALL_OF_SHAME_START_EPOCH = 1746621911;
const SEPOLIA_PECTRA_START_EPOCH = 1741159740;

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
    id: arbitrum.id,
    name: "Arbitrum",
    color: "blue.300",
    abbreviation: "ARB",
    chainObj: arbitrum,
  },
  {
    id: base.id,
    name: "Base",
    color: "blue.400",
    abbreviation: "BASE",
    chainObj: base,
  },
  {
    id: berachain.id,
    name: "Berachain",
    color: "orange.600",
    abbreviation: "BERA",
    chainObj: berachain,
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
    name: "Ambire",
    logoUrl: getFaviconUrl("https://ambire.com"),
    siteUrl: "https://www.ambire.com/",
    supportedChainIds: [
      mainnet.id,
      base.id,
      berachain.id, // https://x.com/AmbireWallet/status/1932042333157249209
      bsc.id,
      gnosis.id,
      ink.id,
      optimism.id,
      // polygon.id,
      unichain.id,
    ],
    announcement: {
      epochTimestamp: 1742565360,
      tweet: "https://x.com/AmbireWallet/status/1903083304808857892",
    },
  },
  {
    name: "Metamask",
    logoUrl: getFaviconUrl("https://metamask.io"),
    siteUrl: "https://metamask.io/",
    supportedChainIds: [
      mainnet.id,
      base.id,
      berachain.id,
      bsc.id,
      gnosis.id,
      optimism.id,
      // polygon.id,
      unichain.id,
    ],
    announcement: {
      epochTimestamp: 1746028260,
      tweet: "https://x.com/danfinlay/status/1917607802631250094",
    },
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
    announcement: {
      epochTimestamp: 1746608460,
      tweet: "https://x.com/wallet/status/1920041181410742474",
    },
  },
  {
    name: "Trust Wallet",
    logoUrl: getFaviconUrl("https://trustwallet.com/"),
    siteUrl: "https://trustwallet.com/",
    supportedChainIds: [mainnet.id, bsc.id],
    announcement: {
      epochTimestamp: 1746616860,
      tweet: "https://x.com/TrustWallet/status/1920076571064389771",
    },
  },
  {
    name: "Uniswap Wallet",
    logoUrl: getFaviconUrl("https://wallet.uniswap.org/"),
    siteUrl: "https://wallet.uniswap.org//",
    supportedChainIds: [mainnet.id, base.id, bsc.id, optimism.id, unichain.id],
    announcement: {
      epochTimestamp: 1749738240,
      tweet: "https://x.com/Uniswap/status/1933168423825035768",
    },
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
    name: "Escher",
    logoUrl: getFaviconUrl("https://app.escher.finance/"),
    siteUrl: "https://app.escher.finance/",
    supportedChainIds: [mainnet.id],
  },
  {
    name: "Ethena",
    logoUrl: getFaviconUrl("https://app.ethena.fi/"),
    siteUrl: "https://app.ethena.fi/",
    supportedChainIds: [mainnet.id],
  },
  {
    name: "Euler",
    logoUrl: getFaviconUrl("https://app.euler.finance/"),
    siteUrl: "https://app.euler.finance/",
    supportedChainIds: [mainnet.id, base.id, berachain.id, bsc.id, unichain.id],
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
    name: "Fluid",
    logoUrl: getFaviconUrl("https://fluid.io"),
    siteUrl: "https://fluid.io",
    supportedChainIds: [mainnet.id, base.id],
  },
  {
    name: "Jumper",
    logoUrl: getFaviconUrl("https://jumper.exchange/"),
    needsWhiteBg: true,
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
    name: "Militereum",
    logoUrl: getFaviconUrl("https://militereum.com/"),
    siteUrl: "https://militereum.com/",
    supportedChainIds: [mainnet.id, optimism.id], // TODO: Polygon and Arbitrum
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
    needsWhiteBg: true,
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

// Wall of Shame data
const shameChains: SupportedApp[] = [
  {
    name: "Polygon",
    logoUrl: getFaviconUrl("https://polygon.technology/"),
    siteUrl: "https://polygon.technology/",
    supportedChainIds: [], // Empty since they don't support 7702
    twitterHandle: "0xPolygon",
  },
];

const shameWallets: SupportedApp[] = [
  {
    name: "Rabby",
    logoUrl: getFaviconUrl("https://rabby.io"),
    siteUrl: "https://rabby.io/",
    supportedChainIds: [], // Empty since they don't support 7702
    twitterHandle: "rabby_io",
  },
  {
    name: "Rainbow Wallet",
    logoUrl: getFaviconUrl("https://rainbow.me"),
    siteUrl: "https://rainbow.me/",
    supportedChainIds: [], // Empty since they don't support 7702
    twitterHandle: "rainbowdotme",
  },
];

const shameDapps: SupportedApp[] = [
  {
    name: "Basescan",
    logoUrl: getFaviconUrl("https://basescan.org"),
    needsWhiteBg: true,
    siteUrl: "https://basescan.org/",
    supportedChainIds: [], // Empty since they don't support 7702
    twitterHandle: "etherscan",
  },
  {
    name: "BSCscan",
    logoUrl: getFaviconUrl("https://bscscan.com"),
    needsWhiteBg: true,
    siteUrl: "https://bscscan.com/",
    supportedChainIds: [], // Empty since they don't support 7702
    twitterHandle: "etherscan",
  },
  {
    name: "Aave",
    logoUrl: getFaviconUrl("https://app.aave.com"),
    siteUrl: "https://app.aave.com/",
    supportedChainIds: [], // Empty since they don't support 7702
    twitterHandle: "aave",
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
      <Box
        display="inline-flex"
        alignItems="center"
        mr={{ base: 0.5, md: 1 }}
        mb={1}
      >
        <ChainIcon chain={chain} size={{ base: "20px", md: "24px" }} />
      </Box>
    </Tooltip>
  );
};

const ChainIcon = ({
  chain,
  size = "24px",
}: {
  chain: Chain;
  size?: string | { base: string; md: string };
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
    <Flex wrap="wrap" gap={{ base: 1, md: 2 }} maxW="100%" overflow="hidden">
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
  size?: string | { base: string; md: string };
}) => {
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
          bg={app.needsWhiteBg ? "white" : "transparent"}
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
    p={{ base: 3, md: 4 }}
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
    minH={{ base: "100px", md: "120px" }}
    display="flex"
    flexDirection="column"
    justifyContent="center"
  >
    <ChainIcon chain={chain} size={{ base: "32px", md: "40px" }} />
    <Text
      fontWeight="bold"
      color={chain.color}
      mb={1}
      fontSize={{ base: "sm", md: "md" }}
    >
      {chain.abbreviation || chain.name}
    </Text>
    <Text
      fontSize={{ base: "xs", md: "sm" }}
      color="whiteAlpha.800"
      noOfLines={1}
    >
      {chain.name}
    </Text>
  </Box>
);

// Utility function to format epoch timestamp to date
const formatAnnouncementDate = (epochTimestamp: number): string => {
  const date = new Date(epochTimestamp * 1000);
  const day = date.getDate(); // No padStart, so single digit days have no leading zero
  const month = date.toLocaleString("en-US", { month: "short" });
  const year = date.getFullYear().toString().slice(-2);
  return `${day} ${month}'${year}`;
};

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
      p={{ base: 3, md: 4 }}
      mb={4}
      bg="blackAlpha.200"
      opacity={isAppFiltered ? 0.5 : 1}
      transition="all 0.2s"
      _hover={{ borderColor: "whiteAlpha.400" }}
    >
      <Flex align="center" mb={3} justify="space-between">
        <Flex align="center">
          <AppLogo app={app} size={{ base: "24px", md: "30px" }} />
          <Heading size={{ base: "sm", md: "md" }} color="white">
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
        {app.announcement && (
          <Link
            href={app.announcement.tweet}
            target="_blank"
            rel="noopener noreferrer"
            fontSize="sm"
            color="whiteAlpha.700"
            _hover={{ color: "white", textDecoration: "none" }}
          >
            {formatAnnouncementDate(app.announcement.epochTimestamp)}
          </Link>
        )}
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

// Generate tweet URL for Wall of Shame
const generateTweetUrl = (
  app: SupportedApp,
  isChain: boolean = false
): string => {
  const baseText = `Hey ${
    app.twitterHandle ? `@${app.twitterHandle}` : app.name
  }! 👋

Your users are asking for EIP-7702${
    isChain ? "" : " and EIP-5792"
  } transaction batching support to unlock the next level of UX! 🚀

When can we expect this feature? #Support7702 💪

Check the full list: https://swiss-knife.xyz/7702beat#wall-of-shame`;

  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    baseText
  )}`;
};

// Timer component for Wall of Shame
const WallOfShameTimer = () => {
  const [timeElapsed, setTimeElapsed] = useState("");
  const [sepoliaTimeElapsed, setSepoliaTimeElapsed] = useState("");

  useEffect(() => {
    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);

      // Mainnet timer
      const elapsed = now - WALL_OF_SHAME_START_EPOCH;
      const days = Math.floor(elapsed / 86400);
      const hours = Math.floor((elapsed % 86400) / 3600);
      const minutes = Math.floor((elapsed % 3600) / 60);
      const seconds = elapsed % 60;
      setTimeElapsed(
        `${days}d ${hours.toString().padStart(2, "0")}h ${minutes
          .toString()
          .padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`
      );

      // Sepolia timer
      const sepoliaElapsed = now - SEPOLIA_PECTRA_START_EPOCH;
      const sepoliaDays = Math.floor(sepoliaElapsed / 86400);
      const sepoliaHours = Math.floor((sepoliaElapsed % 86400) / 3600);
      const sepoliaMinutes = Math.floor((sepoliaElapsed % 3600) / 60);
      const sepoliaSeconds = sepoliaElapsed % 60;
      setSepoliaTimeElapsed(
        `${sepoliaDays}d ${sepoliaHours
          .toString()
          .padStart(2, "0")}h ${sepoliaMinutes
          .toString()
          .padStart(2, "0")}m ${sepoliaSeconds.toString().padStart(2, "0")}s`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <VStack
      spacing={{ base: 4, md: 6 }}
      textAlign="center"
      mb={{ base: 6, md: 8 }}
    >
      <Box>
        <Text fontSize={{ base: "md", md: "lg" }} color="whiteAlpha.700" mb={2}>
          Time since Pectra went live on Mainnet:
        </Text>
        <Text
          fontSize={{ base: "lg", md: "3xl" }}
          fontWeight="bold"
          color="red.400"
          fontFamily="mono"
          overflow="hidden"
          textOverflow="ellipsis"
          whiteSpace="nowrap"
          maxW="100%"
        >
          {timeElapsed}
        </Text>
      </Box>

      <Box>
        <Text fontSize={{ base: "md", md: "lg" }} color="whiteAlpha.700" mb={2}>
          Time since Pectra went live on Sepolia Testnet:
        </Text>
        <Text
          fontSize={{ base: "lg", md: "3xl" }}
          fontWeight="bold"
          color="blue.400"
          fontFamily="mono"
          overflow="hidden"
          textOverflow="ellipsis"
          whiteSpace="nowrap"
          maxW="100%"
        >
          {sepoliaTimeElapsed}
        </Text>
      </Box>
    </VStack>
  );
};

// Shame App component for Wall of Shame section
const ShameAppCard = ({
  app,
  isChain,
}: {
  app: SupportedApp;
  isChain?: boolean;
}) => {
  return (
    <Box
      borderWidth="1px"
      borderColor="red.500"
      borderRadius="lg"
      p={{ base: 3, md: 4 }}
      mb={4}
      bg="rgba(153, 27, 27, 0.1)"
      transition="all 0.2s"
      _hover={{ borderColor: "red.400", bg: "rgba(153, 27, 27, 0.2)" }}
    >
      <Flex
        align="center"
        justify="space-between"
        direction={{ base: "column", md: "row" }}
        gap={{ base: 3, md: 0 }}
      >
        <Flex align="center" flex="1">
          <AppLogo app={app} size={{ base: "24px", md: "30px" }} />
          <Heading size={{ base: "sm", md: "md" }} color="white">
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
        <HStack spacing={{ base: 2, md: 3 }} flexWrap="wrap">
          {app.twitterHandle && (
            <Tooltip label="Post on X to demand support" hasArrow>
              <Button
                as="a"
                href={generateTweetUrl(app, isChain)}
                target="_blank"
                rel="noopener noreferrer"
                size="xs"
                bg="black"
                color="white"
                variant="solid"
                rightIcon={<FaXTwitter />}
                _hover={{
                  transform: "translateY(-1px)",
                  bg: "gray.800",
                  boxShadow: "md",
                }}
                fontSize="xs"
                px={2}
              >
                Post on
              </Button>
            </Tooltip>
          )}
          <Badge
            colorScheme="red"
            variant="solid"
            rounded={"md"}
            fontSize={{ base: "xs", md: "sm" }}
          >
            No 7702 Support
          </Badge>
        </HStack>
      </Flex>
    </Box>
  );
};

const SevenSevenZeroTwoBeat = () => {
  const isMobile = useBreakpointValue({ base: true, lg: false });
  const [selectedChain, setSelectedChain] = useState<Chain | null>(null);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const router = useRouter();
  const pathname = usePathname();

  const handleChainClick = useCallback((chain: Chain) => {
    setSelectedChain((prevChain) =>
      prevChain?.id === chain.id ? null : chain
    );
  }, []);

  const clearFilter = useCallback(() => {
    setSelectedChain(null);
  }, []);

  // Handle URL hash changes and initial load
  useEffect(() => {
    const handleRouteChange = () => {
      const hash = window.location.hash.substring(1);
      if (hash === "wall-of-shame") {
        setActiveTabIndex(1);
      } else {
        setActiveTabIndex(0);
      }
    };

    // Set initial tab based on URL hash
    handleRouteChange();

    // Listen for hash changes
    const handleHashChange = () => {
      handleRouteChange();
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  const handleTabChange = useCallback(
    (index: number) => {
      setActiveTabIndex(index);
      if (index === 1) {
        router.push(`${pathname}#wall-of-shame`);
      } else {
        router.push(pathname);
      }
    },
    [router, pathname]
  );

  // Filter wallets and dapps based on selected chain
  const filteredWallets = selectedChain
    ? wallets.filter((wallet) => supportsChain(wallet, selectedChain))
    : wallets;

  const filteredDapps = selectedChain
    ? dapps.filter((dapp) => supportsChain(dapp, selectedChain))
    : dapps;

  return (
    <Layout>
      <Box
        width="100%"
        maxW="90vw"
        overflowX="hidden"
        position="relative"
        minH="100vh"
      >
        <VStack
          spacing={{ base: 6, md: 10 }}
          align="stretch"
          width="100%"
          maxW="100%"
          px={0}
          overflowX="hidden"
        >
          <Center
            flexDirection="column"
            pt={{ base: 2, md: 4 }}
            width="100%"
            maxW="100%"
            px={{ base: 4, md: 6 }}
          >
            <Heading
              as="h1"
              size={{ base: "xl", md: "2xl" }}
              mb={4}
              textAlign="center"
              color="white"
              letterSpacing="tight"
              fontWeight="black"
              display="inline-flex"
              alignItems="center"
              position="relative"
              maxW="100%"
              overflow="hidden"
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
              fontSize={{ base: "md", md: "lg" }}
              textAlign="center"
              color="whiteAlpha.800"
              maxW={{ base: "90%", md: "700px" }}
              px={{ base: 2, md: 4 }}
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

          <Tabs
            variant="enclosed"
            colorScheme="red"
            index={activeTabIndex}
            onChange={handleTabChange}
          >
            <TabList mb={{ base: 4, md: 8 }} justifyContent="center">
              <Tab
                color="whiteAlpha.700"
                _selected={{ color: "white", bg: "whiteAlpha.200" }}
                fontSize={{ base: "sm", md: "md" }}
                px={{ base: 3, md: 4 }}
              >
                💎 7702 Support
              </Tab>
              <Tab
                color="whiteAlpha.700"
                _selected={{ color: "white", bg: "whiteAlpha.200" }}
                fontSize={{ base: "sm", md: "md" }}
                px={{ base: 3, md: 4 }}
              >
                😡 Wall of Shame
              </Tab>
            </TabList>

            <TabPanels>
              <TabPanel
                px={{ base: 4, md: 6 }}
                width="100%"
                maxW="100%"
                overflowX="hidden"
              >
                {/* Existing 7702 Support Content */}

                <Box
                  mb={{ base: 6, md: 8 }}
                  width="100%"
                  maxW="100%"
                  overflowX="hidden"
                >
                  <Flex
                    justify="space-between"
                    align={{ base: "flex-start", md: "center" }}
                    mb={5}
                    direction={{ base: "column", md: "row" }}
                    gap={{ base: 3, md: 0 }}
                    width="100%"
                    maxW="100%"
                  >
                    <Heading size={{ base: "md", md: "lg" }} color="white">
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
                  <SimpleGrid
                    columns={{ base: 2, sm: 3, md: 5 }}
                    spacing={{ base: 2, md: 4 }}
                    mb={6}
                    maxW="100%"
                    width="100%"
                  >
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

                <Box
                  mb={{ base: 6, md: 8 }}
                  width="100%"
                  maxW="100%"
                  overflowX="hidden"
                >
                  <Box mb={3}>
                    <Heading size={{ base: "md", md: "lg" }} color="white">
                      Wallets
                    </Heading>
                    <Text
                      fontSize={{ base: "sm", md: "md" }}
                      color="whiteAlpha.800"
                    >
                      {"(ordered by date for Pectra support)"}
                    </Text>
                  </Box>

                  {isMobile ? (
                    // Mobile view with cards
                    <VStack
                      spacing={4}
                      align="stretch"
                      width="100%"
                      maxW="100%"
                    >
                      {wallets.map((wallet, idx) => (
                        <AppCard
                          key={idx}
                          app={wallet}
                          filterChain={selectedChain}
                        />
                      ))}
                    </VStack>
                  ) : (
                    // Desktop view with table
                    <Box
                      overflowX="auto"
                      borderRadius="lg"
                      borderWidth="1px"
                      borderColor="whiteAlpha.200"
                      maxW="100%"
                      width="100%"
                    >
                      <Table variant="simple" size="sm">
                        <Tbody>
                          {wallets.map((wallet, index) => {
                            const isWalletFiltered =
                              selectedChain !== null &&
                              !supportsChain(wallet, selectedChain);
                            return (
                              <Tr
                                key={index}
                                borderBottom={
                                  index < wallets.length - 1
                                    ? "1px solid"
                                    : "none"
                                }
                                borderColor="whiteAlpha.200"
                                opacity={isWalletFiltered ? 0.5 : 1}
                                bg={
                                  isWalletFiltered
                                    ? "blackAlpha.400"
                                    : "transparent"
                                }
                              >
                                <Td
                                  width={{ base: "150px", md: "200px" }}
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
                                        <Text
                                          fontSize={{ base: "sm", md: "md" }}
                                        >
                                          {wallet.name}
                                        </Text>
                                      </Link>
                                    ) : (
                                      <Text fontSize={{ base: "sm", md: "md" }}>
                                        {wallet.name}
                                      </Text>
                                    )}
                                  </Flex>
                                </Td>
                                <Td py={4}>
                                  <AppChainDisplay
                                    supportedAppChainIds={
                                      wallet.supportedChainIds
                                    }
                                    globalChainsList={chains}
                                  />
                                </Td>
                                <Td py={4} textAlign="right">
                                  {wallet.announcement && (
                                    <Link
                                      href={wallet.announcement.tweet}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      fontSize="sm"
                                      color="whiteAlpha.700"
                                      _hover={{
                                        color: "white",
                                        textDecoration: "none",
                                      }}
                                    >
                                      {formatAnnouncementDate(
                                        wallet.announcement.epochTimestamp
                                      )}
                                    </Link>
                                  )}
                                </Td>
                              </Tr>
                            );
                          })}
                        </Tbody>
                      </Table>
                    </Box>
                  )}
                </Box>

                <Box width="100%" maxW="100%" overflowX="hidden">
                  <VStack
                    mb={5}
                    alignItems={{ base: "flex-start", md: "baseline" }}
                    spacing={{ base: 2, md: 0 }}
                    direction={{ base: "column", md: "row" }}
                    align={{ base: "stretch", md: "flex-start" }}
                    width="100%"
                    maxW="100%"
                  >
                    <Heading size={{ base: "md", md: "lg" }} color="white">
                      Dapps
                    </Heading>
                    <Text
                      fontSize={{ base: "sm", md: "md" }}
                      color="whiteAlpha.800"
                    >
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
                  </VStack>

                  {isMobile ? (
                    // Mobile view with cards
                    <VStack
                      spacing={4}
                      align="stretch"
                      width="100%"
                      maxW="100%"
                    >
                      {dapps.map((dapp, idx) => (
                        <AppCard
                          key={idx}
                          app={dapp}
                          filterChain={selectedChain}
                        />
                      ))}
                    </VStack>
                  ) : (
                    // Desktop view with table
                    <Box
                      overflowX="auto"
                      borderRadius="lg"
                      borderWidth="1px"
                      borderColor="whiteAlpha.200"
                      maxW="100%"
                      width="100%"
                    >
                      <Table variant="simple" size="sm">
                        <Tbody>
                          {dapps.map((dapp, index) => {
                            const isDappFiltered =
                              selectedChain !== null &&
                              !supportsChain(dapp, selectedChain);
                            return (
                              <Tr
                                key={index}
                                borderBottom={
                                  index < dapps.length - 1
                                    ? "1px solid"
                                    : "none"
                                }
                                borderColor="whiteAlpha.200"
                                opacity={isDappFiltered ? 0.5 : 1}
                                bg={
                                  isDappFiltered
                                    ? "blackAlpha.400"
                                    : "transparent"
                                }
                              >
                                <Td
                                  width={{ base: "150px", md: "200px" }}
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
                                        <Text
                                          fontSize={{ base: "sm", md: "md" }}
                                        >
                                          {dapp.name}
                                        </Text>
                                      </Link>
                                    ) : (
                                      <Text fontSize={{ base: "sm", md: "md" }}>
                                        {dapp.name}
                                      </Text>
                                    )}
                                  </Flex>
                                </Td>
                                <Td py={4}>
                                  <AppChainDisplay
                                    supportedAppChainIds={
                                      dapp.supportedChainIds
                                    }
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
              </TabPanel>

              <TabPanel
                px={{ base: 4, md: 6 }}
                width="100%"
                maxW="100%"
                overflowX="hidden"
              >
                {/* Wall of Shame Content */}

                <WallOfShameTimer />
                <VStack
                  spacing={{ base: 6, md: 8 }}
                  align="stretch"
                  width="100%"
                  maxW="100%"
                >
                  <Box width="100%" maxW="100%" overflowX="hidden">
                    <Heading
                      size={{ base: "md", md: "lg" }}
                      mb={5}
                      color="white"
                    >
                      Chains
                    </Heading>
                    <VStack spacing={4} align="stretch">
                      {shameChains.map((chain, idx) => (
                        <ShameAppCard key={idx} app={chain} isChain />
                      ))}
                    </VStack>
                  </Box>

                  <Box width="100%" maxW="100%" overflowX="hidden">
                    <Heading
                      size={{ base: "md", md: "lg" }}
                      mb={5}
                      color="white"
                    >
                      Wallets
                    </Heading>
                    <VStack spacing={4} align="stretch">
                      {shameWallets.map((wallet, idx) => (
                        <ShameAppCard key={idx} app={wallet} />
                      ))}
                    </VStack>
                  </Box>

                  <Box width="100%" maxW="100%" overflowX="hidden">
                    <Heading
                      size={{ base: "md", md: "lg" }}
                      mb={5}
                      color="white"
                    >
                      Dapps
                    </Heading>
                    <VStack spacing={4} align="stretch">
                      {shameDapps.map((dapp, idx) => (
                        <ShameAppCard key={idx} app={dapp} />
                      ))}
                    </VStack>
                  </Box>
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </VStack>
      </Box>
    </Layout>
  );
};

export default SevenSevenZeroTwoBeat;
