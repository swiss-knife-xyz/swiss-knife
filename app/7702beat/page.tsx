"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Box,
  Heading,
  Text,
  VStack,
  Divider,
  Table,
  Tbody,
  Tr,
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
  Tag,
  Spacer,
  Icon,
  Skeleton,
  SkeletonText,
} from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import { FaXTwitter } from "react-icons/fa6";
import { FiTool, FiShield, FiCheck, FiX, FiExternalLink } from "react-icons/fi";
import { Layout } from "@/components/Layout";
import {
  useAccount,
  usePublicClient,
  useSendCalls,
  useWaitForCallsStatus,
  useCapabilities,
  useChainId,
} from "wagmi";
import {
  chains,
  wallets,
  hardwareWallets,
  dapps,
  shameChains,
  shameWallets,
  shameHardwareWallets,
  shameDapps,
  type SupportedChain,
  type SupportedApp,
} from "./data";
import {
  Address,
  parseEther,
  encodeFunctionData,
  PublicClient,
  Chain,
} from "viem";
import {
  getPublicClient,
  createPublicClientForRpcUrl,
} from "@/lib/publicClient";
import { DELEGATION_PREFIX, getDelegatedImplementation } from "@/lib/eip7702";
import { fetchAddressLabels } from "@/utils/addressLabels";
import { ConnectButton } from "@/components/ConnectButton";
import { chainIdToImage } from "@/data/common";
import { fetchContractAbi } from "@/utils";
import { InputField } from "@/components/InputField";
import NumberFlow from "@number-flow/react";

// Wall of Shame epoch timestamp - you can update this later
const WALL_OF_SHAME_START_EPOCH = 1746621911;
const SEPOLIA_PECTRA_START_EPOCH = 1741159740;

const skeletonAddress = "0x1111222233334444000000000000000000000000";

// 7702 Chain Check Constants and Function
const DUMMY_DELEGATE_CODE =
  "0x6080604052348015600e575f5ffd5b50600436106026575f3560e01c8063c1cd785614602a575b5f5ffd5b60306044565b604051603b91906064565b60405180910390f35b5f6001905090565b5f8115159050919050565b605e81604c565b82525050565b5f60208201905060755f8301846057565b9291505056fea2646970667358221220265103185dec648e9bcac4dd322c8482f2923aa8ab542d2233f257916b73cd6a64736f6c634300081c0033" as `0x${string}`;
const DUMMY_DELEGATE_ADDRESS =
  "0x1234567890abcdef1234567890abcdef12345678" as `0x${string}`;

const isSevenSevenZeroTwoAbi = [
  {
    type: "function",
    name: "isSevenSevenZeroTwo",
    inputs: [],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "pure",
  },
] as const;

async function checkChainIs7702Enabled({
  publicClient,
  chain,
  address,
}: {
  publicClient?: PublicClient;
  chain?: Chain;
  address: `0x${string}`;
}): Promise<boolean> {
  let client = publicClient;
  if (!client && chain) {
    client = getPublicClient(chain.id);
  }
  if (!client) throw new Error("No publicClient or chain provided");

  const connectedAccount7702Code = (DELEGATION_PREFIX +
    DUMMY_DELEGATE_ADDRESS.slice(2)) as `0x${string}`;
  const data = encodeFunctionData({
    abi: isSevenSevenZeroTwoAbi,
    functionName: "isSevenSevenZeroTwo",
  });

  try {
    const result = await client.call({
      to: address,
      data,
      stateOverride: [
        {
          address: DUMMY_DELEGATE_ADDRESS,
          code: DUMMY_DELEGATE_CODE,
        },
        {
          address,
          code: connectedAccount7702Code,
        },
      ],
    });
    return (
      result.data ===
      "0x0000000000000000000000000000000000000000000000000000000000000001"
    );
  } catch (error: any) {
    console.error(
      `Error checking chain ${chain?.name} 7702 support:`,
      error.shortMessage
    );
    return false;
  }
}

const ChainTag = ({ chain }: { chain: SupportedChain }) => {
  return (
    <Tooltip
      label={chain.abbreviation || chain.name}
      hasArrow
      placement="top"
      bg="white"
      color="gray.900"
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
  chain: SupportedChain;
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
  globalChainsList: SupportedChain[];
}) => {
  const chainsToDisplay = supportedAppChainIds
    .map((id) => globalChainsList.find((chain) => chain.id === id))
    .filter((chain) => chain !== undefined) as SupportedChain[]; // Type assertion to SupportedChain[]

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
  chain: SupportedChain;
  onClick: (chain: SupportedChain) => void;
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
  filterChain: SupportedChain | null;
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
const supportsChain = (
  app: SupportedApp,
  chainToFilterBy: SupportedChain
): boolean => {
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

Check the full list: https://7702beat.eth.sh/#wall-of-shame`;

  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    baseText
  )}`;
};

// Timer component for Wall of Shame
const WallOfShameTimer = () => {
  const [mainnetTime, setMainnetTime] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [sepoliaTime, setSepoliaTime] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);

      // Mainnet timer
      const elapsed = now - WALL_OF_SHAME_START_EPOCH;
      const days = Math.floor(elapsed / 86400);
      const hours = Math.floor((elapsed % 86400) / 3600);
      const minutes = Math.floor((elapsed % 3600) / 60);
      const seconds = elapsed % 60;
      setMainnetTime({ days, hours, minutes, seconds });

      // Sepolia timer
      const sepoliaElapsed = now - SEPOLIA_PECTRA_START_EPOCH;
      const sepoliaDays = Math.floor(sepoliaElapsed / 86400);
      const sepoliaHours = Math.floor((sepoliaElapsed % 86400) / 3600);
      const sepoliaMinutes = Math.floor((sepoliaElapsed % 3600) / 60);
      const sepoliaSeconds = sepoliaElapsed % 60;
      setSepoliaTime({
        days: sepoliaDays,
        hours: sepoliaHours,
        minutes: sepoliaMinutes,
        seconds: sepoliaSeconds,
      });
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
          <NumberFlow value={mainnetTime.days} />d{" "}
          <NumberFlow
            value={mainnetTime.hours}
            format={{ minimumIntegerDigits: 2 }}
          />
          h{" "}
          <NumberFlow
            value={mainnetTime.minutes}
            format={{ minimumIntegerDigits: 2 }}
          />
          m{" "}
          <NumberFlow
            value={mainnetTime.seconds}
            format={{ minimumIntegerDigits: 2 }}
          />
          s
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
          <NumberFlow value={sepoliaTime.days} />d{" "}
          <NumberFlow
            value={sepoliaTime.hours}
            format={{ minimumIntegerDigits: 2 }}
          />
          h{" "}
          <NumberFlow
            value={sepoliaTime.minutes}
            format={{ minimumIntegerDigits: 2 }}
          />
          m{" "}
          <NumberFlow
            value={sepoliaTime.seconds}
            format={{ minimumIntegerDigits: 2 }}
          />
          s
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
  const router = useRouter();
  const pathname = usePathname();

  const isMobile = useBreakpointValue({ base: true, lg: false });

  const client = usePublicClient();
  const { address, chain } = useAccount();
  const chainId = useChainId();
  const { data: availableCapabilities } = useCapabilities({
    account: address,
    chainId,
  });
  const {
    sendCalls,
    data: sendCallsData,
    isPending,
    isError: isSendCallsError,
  } = useSendCalls();

  const {
    data: waitForCallsStatusData,
    isLoading: isWaitingForCalls,
    isSuccess: isCallsSuccess,
    isError: isCallsError,
  } = useWaitForCallsStatus({ id: sendCallsData?.id });

  const [selectedChain, setSelectedChain] = useState<SupportedChain | null>(
    null
  );
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [authAddress, setAuthAddress] = useState<string | null>(null);
  const [addressLabels, setAddressLabels] = useState<string[]>([]);
  const [isAuthFetching, setIsAuthFetching] = useState(false);
  const [rpcUrl, setRpcUrl] = useState("");
  const [isCheckingRpc, setIsCheckingRpc] = useState(false);
  const [rpcCheckResult, setRpcCheckResult] = useState<{
    supported: boolean;
    chainId?: number;
    error?: string;
  } | null>(null);

  const handleChainClick = useCallback((chain: SupportedChain) => {
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
      } else if (hash === "tools") {
        setActiveTabIndex(2);
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
      } else if (index === 2) {
        router.push(`${pathname}#tools`);
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

  const fetchAuthAddress = useCallback(async () => {
    if (!client || !address || !chain?.id) {
      setAuthAddress(null);
      setIsAuthFetching(false);
      return;
    }

    setIsAuthFetching(true);
    try {
      const addressCode = await client.getCode({
        address,
      });
      setAuthAddress(getDelegatedImplementation(addressCode));
    } catch (error) {
      console.error("Error fetching auth address:", error);
      setAuthAddress(null);
    } finally {
      setIsAuthFetching(false);
    }
  }, [client, address, chain?.id]);

  useEffect(() => {
    fetchAuthAddress();
  }, [fetchAuthAddress]);

  // Refetch auth address when transaction is confirmed
  useEffect(() => {
    if (isCallsSuccess) {
      fetchAuthAddress();
    }
  }, [isCallsSuccess, fetchAuthAddress]);

  const fetchSetAddressLabels = useCallback(async () => {
    setAddressLabels([]);

    try {
      if (!client || !authAddress || !chain?.id) return;

      try {
        // try fetching the contract name if it's verified
        const fetchedAbi = await fetchContractAbi({
          address: authAddress,
          chainId: chain.id,
        });
        if (fetchedAbi) {
          setAddressLabels([fetchedAbi.name]);
        }
      } catch {
        try {
          const labels = await fetchAddressLabels(authAddress, chain?.id);
          if (labels.length > 0) {
            setAddressLabels(labels);
          }
        } catch {
          setAddressLabels([]);
        }
      }
    } catch {
      setAddressLabels([]);
    }
  }, [client, authAddress, chain?.id]);

  useEffect(() => {
    if (address !== skeletonAddress) {
      fetchSetAddressLabels();
    }
  }, [address, chain?.id, fetchSetAddressLabels]);

  // source: https://github.com/azf20/7702-mission/blob/bd960675c91f8bd157d3822c5eb1a2a188bfcd73/packages/7702-checker/utils/checkChainIs7702Enabled.ts
  const handleCheckRpcUrl = useCallback(async () => {
    if (!rpcUrl) return;

    setIsCheckingRpc(true);
    setRpcCheckResult(null);

    try {
      const customClient = createPublicClientForRpcUrl(rpcUrl);

      // Fetch chain ID
      const chainId = await customClient.getChainId();

      // Use a dummy address for testing
      const testAddress =
        "0x000000000000000000000000000000000dead123" as `0x${string}`;
      const isSupported = await checkChainIs7702Enabled({
        publicClient: customClient,
        address: testAddress,
      });

      setRpcCheckResult({ supported: isSupported, chainId });
    } catch (error: any) {
      console.error("Error checking RPC URL:", error);
      setRpcCheckResult({
        supported: false,
        error: error.message || "Failed to check RPC URL",
      });
    } finally {
      setIsCheckingRpc(false);
    }
  }, [rpcUrl]);

  return (
    <Layout>
      <Box
        width="100%"
        maxW="1000px"
        mx="auto"
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
            <TabList mb={{ base: 4, md: 4 }} justifyContent="center">
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
              <Tab
                color="whiteAlpha.700"
                _selected={{ color: "white", bg: "whiteAlpha.200" }}
                fontSize={{ base: "sm", md: "md" }}
                px={{ base: 3, md: 4 }}
              >
                🛠️ Tools
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

                <Box
                  mb={{ base: 6, md: 8 }}
                  width="100%"
                  maxW="100%"
                  overflowX="hidden"
                >
                  <Box mb={3}>
                    <Heading size={{ base: "md", md: "lg" }} color="white">
                      Hardware Wallets
                    </Heading>
                  </Box>

                  {isMobile ? (
                    <VStack
                      spacing={4}
                      align="stretch"
                      width="100%"
                      maxW="100%"
                    >
                      {hardwareWallets.map((wallet, idx) => (
                        <AppCard
                          key={idx}
                          app={wallet}
                          filterChain={selectedChain}
                        />
                      ))}
                    </VStack>
                  ) : (
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
                          {hardwareWallets.map((wallet, index) => {
                            const isWalletFiltered =
                              selectedChain !== null &&
                              !supportsChain(wallet, selectedChain);
                            return (
                              <Tr
                                key={index}
                                borderBottom={
                                  index < hardwareWallets.length - 1
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
                  {shameChains.length > 0 && (
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
                  )}

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
                      Hardware Wallets
                    </Heading>
                    <VStack spacing={4} align="stretch">
                      {shameHardwareWallets.map((wallet, idx) => (
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

              <TabPanel
                px={{ base: 4, md: 6 }}
                width="100%"
                maxW="100%"
                overflowX="hidden"
              >
                {/* Tools Content */}
                <Box maxW="1400px" mx="auto">
                  {/* Page Header */}
                  <Box mb={8} textAlign="center">
                    <HStack justify="center" spacing={3} mb={4}>
                      <Icon as={FiTool} color="blue.400" boxSize={8} />
                      <Heading
                        size="xl"
                        color="gray.100"
                        fontWeight="bold"
                        letterSpacing="tight"
                      >
                        7702 Tools
                      </Heading>
                    </HStack>
                    <Text color="gray.400" fontSize="lg" maxW="600px" mx="auto">
                      Check your account&apos;s 7702 authorized address or
                      trigger 7702 account upgrade.
                    </Text>
                  </Box>

                  <Center mb={8}>
                    <ConnectButton />
                  </Center>

                  {/* Account Status Section */}
                  <Box
                    p={4}
                    bg="whiteAlpha.50"
                    borderRadius="lg"
                    border="1px solid"
                    borderColor="whiteAlpha.200"
                    maxW={address && authAddress ? "100%" : "800px"}
                    mx="auto"
                  >
                    <VStack spacing={6} align="stretch">
                      <HStack
                        spacing={2}
                        align="center"
                        justify="space-between"
                      >
                        <HStack spacing={2}>
                          {!isAuthFetching && (
                            <Icon
                              as={authAddress ? FiCheck : FiX}
                              color={authAddress ? "green.400" : "red.400"}
                              boxSize={6}
                            />
                          )}
                          <Heading size="md" color="gray.300">
                            Account Status
                          </Heading>
                        </HStack>
                        {address && authAddress && (
                          <Badge
                            colorScheme="green"
                            fontSize="sm"
                            px={3}
                            py={1}
                            rounded="md"
                          >
                            7702 Enabled
                          </Badge>
                        )}
                      </HStack>

                      {address ? (
                        isAuthFetching ? (
                          <VStack spacing={4} align="stretch">
                            {/* Loading State */}
                            <HStack justify="space-between" align="center">
                              <Skeleton height="32px" width="120px" />
                              <Skeleton height="32px" width="140px" />
                            </HStack>
                            <Box>
                              <VStack spacing={2} align="start">
                                <HStack spacing={2}>
                                  <Skeleton boxSize={4} />
                                  <Skeleton height="16px" width="80px" />
                                </HStack>
                                <HStack spacing={2} w="full" align="center">
                                  <Box flex="1" minW="0">
                                    <Skeleton height="40px" width="100%" />
                                  </Box>
                                  <Skeleton boxSize="32px" />
                                </HStack>
                              </VStack>
                            </Box>
                            <Box>
                              <SkeletonText mt="4" noOfLines={2} spacing="4" />
                            </Box>
                          </VStack>
                        ) : authAddress ? (
                          <VStack spacing={4} align="stretch">
                            {/* Auth Address Input */}
                            <Box>
                              <VStack spacing={2} align="start">
                                <HStack spacing={2}>
                                  <Icon
                                    as={FiShield}
                                    color="blue.400"
                                    boxSize={4}
                                  />
                                  <Text
                                    color="gray.300"
                                    fontWeight="medium"
                                    fontSize="sm"
                                  >
                                    Auth Address
                                  </Text>
                                </HStack>
                                <HStack spacing={2} w="full" align="center">
                                  <Box flex="1" minW="0">
                                    <InputField
                                      placeholder="Auth address will appear here"
                                      value={authAddress}
                                      onChange={() => {}}
                                      isReadOnly
                                      cursor="text"
                                      fontSize="md"
                                      w="full"
                                    />
                                  </Box>
                                  {chain?.blockExplorers?.default && (
                                    <Button
                                      as={Link}
                                      href={`${chain.blockExplorers.default.url}/address/${authAddress}`}
                                      isExternal
                                      variant={"solid"}
                                      size="sm"
                                      p={2}
                                      minW="auto"
                                      flexShrink={0}
                                      color="whiteAlpha.800"
                                      _hover={{
                                        bg: "whiteAlpha.300",
                                      }}
                                    >
                                      <Icon as={FiExternalLink} boxSize={4} />
                                    </Button>
                                  )}
                                </HStack>
                              </VStack>
                            </Box>

                            {/* Tags */}
                            {addressLabels.length > 0 && (
                              <Box>
                                <HStack spacing={2} mb={2}>
                                  <Text
                                    color="gray.400"
                                    fontSize="sm"
                                    fontWeight="medium"
                                  >
                                    Tags:
                                  </Text>
                                </HStack>
                                <HStack spacing={2} flexWrap="wrap">
                                  {addressLabels.map((label, index) => (
                                    <Badge
                                      key={index}
                                      colorScheme="blue"
                                      fontSize="xs"
                                      px={2}
                                      py={0.5}
                                      rounded="md"
                                    >
                                      {label}
                                    </Badge>
                                  ))}
                                </HStack>
                              </Box>
                            )}
                          </VStack>
                        ) : (
                          <VStack spacing={4} align="stretch">
                            {/* Status Badge */}
                            <HStack justify="space-between" align="center">
                              <Badge
                                colorScheme="red"
                                fontSize="sm"
                                px={3}
                                py={1}
                                rounded="md"
                              >
                                7702 Not Enabled
                              </Badge>
                              <Button
                                onClick={() => {
                                  if (!address) return;
                                  sendCalls({
                                    calls: [
                                      {
                                        to: address,
                                        value: parseEther("0"),
                                      },
                                      {
                                        to: address,
                                        value: parseEther("0"),
                                      },
                                    ],
                                  });
                                }}
                                colorScheme="green"
                                size="sm"
                                isDisabled={
                                  !address ||
                                  isPending ||
                                  isWaitingForCalls ||
                                  !availableCapabilities ||
                                  Object.keys(availableCapabilities).length ===
                                    0
                                }
                                isLoading={isPending || isWaitingForCalls}
                                loadingText={
                                  isPending
                                    ? "Sending request..."
                                    : "Confirming..."
                                }
                                leftIcon={<Icon as={FiShield} boxSize={4} />}
                              >
                                Upgrade Account
                              </Button>
                            </HStack>

                            {/* Error Messages */}
                            {(isSendCallsError || isCallsError) && (
                              <Box
                                p={4}
                                bg="red.900"
                                borderRadius="md"
                                border="1px solid"
                                borderColor="red.600"
                              >
                                <Text color="red.200" fontSize="sm">
                                  Transaction failed. Please try again.
                                </Text>
                              </Box>
                            )}

                            {/* Success Message */}
                            {isCallsSuccess && (
                              <Box
                                p={4}
                                bg="green.900"
                                borderRadius="md"
                                border="1px solid"
                                borderColor="green.600"
                              >
                                <Text color="green.200" fontSize="sm">
                                  Account successfully upgraded! Refreshing
                                  status...
                                </Text>
                              </Box>
                            )}

                            {/* Description */}
                            <Box
                              p={4}
                              bg="whiteAlpha.100"
                              borderRadius="md"
                              border="1px solid"
                              borderColor="whiteAlpha.200"
                            >
                              <Text color="gray.400" fontSize="sm">
                                {!availableCapabilities ||
                                Object.keys(availableCapabilities).length === 0
                                  ? "Your wallet doesn't support any capabilities on this chain. Please try switching to a different chain or use a wallet that supports EIP-5792."
                                  : 'Your account is not currently upgraded to support EIP-7702. Click "Upgrade Account" to enable account abstraction features like transaction batching and delegation.'}
                              </Text>
                            </Box>
                          </VStack>
                        )
                      ) : (
                        <Box
                          p={4}
                          bg="whiteAlpha.100"
                          borderRadius="md"
                          border="1px solid"
                          borderColor="whiteAlpha.200"
                        >
                          <Text
                            color="gray.400"
                            fontSize="sm"
                            textAlign="center"
                          >
                            Please connect your wallet to check your
                            account&apos;s 7702 status
                          </Text>
                        </Box>
                      )}
                    </VStack>
                  </Box>

                  {/* Wallet Capabilities Section */}
                  <Box
                    p={4}
                    bg="whiteAlpha.50"
                    borderRadius="lg"
                    border="1px solid"
                    borderColor="whiteAlpha.200"
                    maxW="800px"
                    mx="auto"
                    mt={8}
                  >
                    <VStack spacing={4} align="stretch">
                      <HStack spacing={2} align="center">
                        <Icon as={FiTool} color="blue.400" boxSize={6} />
                        <Heading size="md" color="gray.300">
                          Wallet Capabilities
                        </Heading>
                      </HStack>

                      {address ? (
                        <VStack spacing={4} align="stretch">
                          <HStack spacing={2} align="center">
                            <Text
                              color="gray.400"
                              fontSize="sm"
                              fontWeight="medium"
                            >
                              Chain ID: {chainId}
                            </Text>
                          </HStack>

                          <Box
                            p={4}
                            bg="blackAlpha.400"
                            borderRadius="md"
                            border="1px solid"
                            borderColor="whiteAlpha.200"
                            maxH="300px"
                            overflowY="auto"
                          >
                            <Text
                              color="gray.300"
                              fontSize="sm"
                              mb={2}
                              fontWeight="medium"
                            >
                              Available Capabilities:
                            </Text>
                            <Box
                              as="pre"
                              color="gray.300"
                              fontSize="xs"
                              fontFamily="mono"
                              whiteSpace="pre-wrap"
                              wordBreak="break-word"
                            >
                              {availableCapabilities
                                ? JSON.stringify(availableCapabilities, null, 2)
                                : "No capabilities available"}
                            </Box>
                          </Box>
                        </VStack>
                      ) : (
                        <Box
                          p={4}
                          bg="whiteAlpha.100"
                          borderRadius="md"
                          border="1px solid"
                          borderColor="whiteAlpha.200"
                        >
                          <Text
                            color="gray.400"
                            fontSize="sm"
                            textAlign="center"
                          >
                            Please connect your wallet to view capabilities
                          </Text>
                        </Box>
                      )}
                    </VStack>
                  </Box>

                  {/* Check Chain 7702 Support Section */}
                  <Box
                    p={4}
                    bg="whiteAlpha.50"
                    borderRadius="lg"
                    border="1px solid"
                    borderColor="whiteAlpha.200"
                    maxW="800px"
                    mx="auto"
                    mt={8}
                  >
                    <VStack spacing={4} align="stretch">
                      <HStack spacing={2} align="center">
                        <Icon as={FiTool} color="purple.400" boxSize={6} />
                        <Heading size="md" color="gray.300">
                          Check if Chain Supports 7702
                        </Heading>
                      </HStack>

                      <VStack spacing={4} align="stretch">
                        <Box>
                          <HStack spacing={2} mb={2} align="center">
                            <Text
                              color="gray.400"
                              fontSize="sm"
                              fontWeight="medium"
                            >
                              RPC URL
                            </Text>
                            <Link
                              href="https://chainlist.org/"
                              target="_blank"
                              rel="noopener noreferrer"
                              fontSize="xs"
                              color="blue.400"
                              _hover={{ color: "blue.300" }}
                            >
                              <HStack spacing={1}>
                                <Text>Get RPC from Chainlist</Text>
                                <Icon as={FiExternalLink} boxSize={3} />
                              </HStack>
                            </Link>
                          </HStack>
                          <HStack spacing={2}>
                            <InputField
                              placeholder="https://..."
                              value={rpcUrl}
                              onChange={(e) => {
                                setRpcUrl(e.target.value);
                                setRpcCheckResult(null);
                              }}
                              fontSize="md"
                              flex="1"
                            />
                            <Button
                              onClick={handleCheckRpcUrl}
                              colorScheme="purple"
                              size="md"
                              isDisabled={!rpcUrl || isCheckingRpc}
                              isLoading={isCheckingRpc}
                              loadingText="Checking..."
                              flexShrink={0}
                            >
                              Check Support
                            </Button>
                          </HStack>
                        </Box>

                        {/* Result Display */}
                        {rpcCheckResult && (
                          <Box
                            p={4}
                            bg={
                              rpcCheckResult.supported ? "green.900" : "red.900"
                            }
                            borderRadius="md"
                            border="1px solid"
                            borderColor={
                              rpcCheckResult.supported ? "green.600" : "red.600"
                            }
                          >
                            <HStack spacing={2} mb={2}>
                              <Icon
                                as={rpcCheckResult.supported ? FiCheck : FiX}
                                color={
                                  rpcCheckResult.supported
                                    ? "green.200"
                                    : "red.200"
                                }
                                boxSize={5}
                              />
                              <Text
                                color={
                                  rpcCheckResult.supported
                                    ? "green.200"
                                    : "red.200"
                                }
                                fontWeight="bold"
                                fontSize="md"
                              >
                                {rpcCheckResult.chainId
                                  ? rpcCheckResult.supported
                                    ? `Chain ID ${rpcCheckResult.chainId} Supports 7702`
                                    : `Chain ID ${rpcCheckResult.chainId} Does Not Support 7702`
                                  : rpcCheckResult.supported
                                    ? "Chain Supports 7702"
                                    : "Chain Does Not Support 7702"}
                              </Text>
                            </HStack>
                            {rpcCheckResult.error && (
                              <Text
                                color="red.300"
                                fontSize="sm"
                                fontFamily="mono"
                              >
                                Error: {rpcCheckResult.error}
                              </Text>
                            )}
                          </Box>
                        )}

                        {/* Description */}
                        <Box
                          p={4}
                          bg="whiteAlpha.100"
                          borderRadius="md"
                          border="1px solid"
                          borderColor="whiteAlpha.200"
                        >
                          <Text color="gray.400" fontSize="sm">
                            Enter an RPC URL to check if the blockchain supports
                            EIP-7702. You can find RPC URLs for various chains
                            on{" "}
                            <Link
                              href="https://chainlist.org/"
                              target="_blank"
                              rel="noopener noreferrer"
                              color="blue.400"
                              _hover={{ color: "blue.300" }}
                            >
                              Chainlist.org
                            </Link>
                            .
                          </Text>
                        </Box>
                      </VStack>
                    </VStack>
                  </Box>
                </Box>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </VStack>
      </Box>
    </Layout>
  );
};

export default SevenSevenZeroTwoBeat;
