"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocalStorage } from "usehooks-ts";
import {
  Box,
  Container,
  Flex,
  Heading,
  Text,
  VStack,
  useToast,
  useDisclosure,
  Skeleton,
  SkeletonText,
  Stack,
  FormControl,
  Input,
  Alert,
  AlertIcon,
  HStack,
  Link,
} from "@chakra-ui/react";
import { Global } from "@emotion/react";
import frameSdk, { Context } from "@farcaster/frame-sdk";
import {
  useAccount,
  useWalletClient,
  useChainId,
  useSwitchChain,
  usePublicClient,
} from "wagmi";
import {
  arbitrum,
  base,
  mainnet,
  optimism,
  avalanche,
  polygon,
  zora,
  bsc,
} from "viem/chains";
import { buildApprovedNamespaces } from "@walletconnect/utils";
import { ConnectButton } from "@/components/ConnectButton/ConnectButton";
import { walletChains } from "@/app/providers";
import { chainIdToChain } from "@/data/common";
import { Address, isAddress } from "viem";

// Import types
import {
  SessionProposal,
  SessionRequest,
  WalletKitInstance,
} from "../bridge/types";

// Import components from wallet bridge
import SessionProposalModal from "../bridge/components/SessionProposalModal";
import ConnectDapp from "../bridge/components/ConnectDapp";
import ActiveSessions from "../bridge/components/ActiveSessions";
import WalletKitInitializer from "../bridge/components/WalletKitInitializer";
import ChainNotifier from "../bridge/components/ChainNotifier";
import AutoPasteHandler from "../bridge/components/AutoPasteHandler";
import { filterActiveSessions } from "../bridge/utils";

// Import our custom Coinbase Smart Wallet components
import CoinbaseSmartWalletSessionRequestModal from "./components/CoinbaseSmartWalletSessionRequestModal";
import CoinbaseSmartWalletWalletKitEventHandler from "./components/CoinbaseSmartWalletWalletKitEventHandler";
import { InfoIcon } from "@chakra-ui/icons";

// Get supported chain names for display
// Officially supported chains from https://help.coinbase.com/en/wallet/getting-started/smart-wallet
const getSupportedChains = (): string[] => {
  return [
    mainnet.name,
    base.name,
    optimism.name,
    arbitrum.name,
    polygon.name,
    zora.name,
    bsc.name,
    avalanche.name,
  ];
};

export default function CoinbaseSmartWalletPage() {
  const toast = useToast();
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();

  // Coinbase Smart Wallet configuration state (persisted in localStorage)
  const [coinbaseSmartWalletAddress, setCoinbaseSmartWalletAddress] =
    useLocalStorage<string>("coinbaseSmartWalletnaddress", "");

  // Add validation states
  const [coinbaseSmartWalletValidation, setCoinbaseSmartWalletValidation] =
    useState<{
      isValidating: boolean;
      isContract: boolean | null;
      isOwner: boolean | null;
      error: string | null;
    }>({
      isValidating: false,
      isContract: null,
      isOwner: null,
      error: null,
    });

  //TODO
  const isChainSupported = true;

  // State for Frame
  const [isFrameSDKLoaded, setIsFrameSDKLoaded] = useState(false);
  const [frameContext, setFrameContext] = useState<Context.FrameContext | null>(
    null
  );

  // State for WalletConnect
  const [uri, setUri] = useState<string>("");
  const [pasted, setPasted] = useState(false);
  const [walletKit, setWalletKit] = useState<WalletKitInstance | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);

  // Modal states for different request types
  const {
    isOpen: isSessionProposalOpen,
    onOpen: onSessionProposalOpen,
    onClose: onSessionProposalClose,
  } = useDisclosure();

  const {
    isOpen: isSessionRequestOpen,
    onOpen: onSessionRequestOpen,
    onClose: onSessionRequestClose,
  } = useDisclosure();

  // Current request states
  const [currentSessionProposal, setCurrentSessionProposal] =
    useState<SessionProposal | null>(null);
  const [currentSessionRequest, setCurrentSessionRequest] =
    useState<SessionRequest | null>(null);
  const [decodedTxData, setDecodedTxData] = useState<any>(null);
  const [isDecodingTx, setIsDecodingTx] = useState<boolean>(false);
  const [decodedSignatureData, setDecodedSignatureData] = useState<{
    type: "message" | "typedData";
    decoded: any;
  } | null>(null);

  // Add a new state to track if we're switching chains
  const [isSwitchingChain, setIsSwitchingChain] = useState<boolean>(false);
  const [pendingRequest, setPendingRequest] = useState<boolean>(false);

  // Add a state to track if we need to switch chains
  const [needsChainSwitch, setNeedsChainSwitch] = useState<boolean>(false);
  const [targetChainId, setTargetChainId] = useState<number | null>(null);

  // Validation function for Coinbase Smart Wallet configuration
  const isConfigurationValid = (): boolean => {
    return (
      coinbaseSmartWalletAddress.trim() !== "" &&
      coinbaseSmartWalletValidation.isContract === true &&
      coinbaseSmartWalletValidation.isOwner === true &&
      !coinbaseSmartWalletValidation.isValidating
    );
  };

  // Validate Coinbase Smart Wallet address
  const validateCoinbaseSmartWalletAddress = useCallback(
    async (coinbaseSmartWalletAddress: string) => {
      if (
        !coinbaseSmartWalletAddress.trim() ||
        !isAddress(coinbaseSmartWalletAddress) ||
        !publicClient ||
        !address
      ) {
        setCoinbaseSmartWalletValidation({
          isValidating: false,
          isContract: null,
          isOwner: null,
          error: null,
        });
        return;
      }

      setCoinbaseSmartWalletValidation({
        isValidating: true,
        isContract: null,
        isOwner: null,
        error: null,
      });

      try {
        // Check if the address is a contract
        const bytecode = await publicClient.getBytecode({
          address: coinbaseSmartWalletAddress as Address,
        });

        if (!bytecode || bytecode === "0x") {
          setCoinbaseSmartWalletValidation({
            isValidating: false,
            isContract: false,
            isOwner: null,
            error:
              "Invalid Coinbase Smart Wallet address - not a contract. Has the wallet been deployed on the selected chain?",
          });
          return;
        }

        // Check if the connected wallet is the owner
        try {
          const isOwner = await publicClient.readContract({
            address: coinbaseSmartWalletAddress as Address,
            abi: [
              {
                inputs: [
                  { internalType: "address", name: "", type: "address" },
                ],
                name: "isOwnerAddress",
                outputs: [{ internalType: "bool", name: "", type: "bool" }],
                stateMutability: "view",
                type: "function",
              },
            ],
            functionName: "isOwnerAddress",
            args: [address],
          });

          setCoinbaseSmartWalletValidation({
            isValidating: false,
            isContract: true,
            isOwner,
            error: isOwner
              ? null
              : "Connected wallet is not the owner of this Coinbase Smart Wallet",
          });
        } catch (error) {
          console.error("Error checking owner:", error);
          setCoinbaseSmartWalletValidation({
            isValidating: false,
            isContract: true,
            isOwner: false,
            error:
              "Failed to verify Coinbase Smart Wallet owner - contract may not have isOwnerAddress() function",
          });
        }
      } catch (error) {
        console.error("Error validating Coinbase Smart Wallet address:", error);
        setCoinbaseSmartWalletValidation({
          isValidating: false,
          isContract: null,
          isOwner: null,
          error: "Failed to validate Coinbasei Smart Wallet address",
        });
      }
    },
    [publicClient, address]
  );

  // Effect to validate Coinbase Smart Wallet address with 500ms delay
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      validateCoinbaseSmartWalletAddress(coinbaseSmartWalletAddress);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [coinbaseSmartWalletAddress, validateCoinbaseSmartWalletAddress]);

  // Connect to dapp using WalletConnect URI
  const connectToDapp = useCallback(async () => {
    if (!walletKit || !uri) return;

    try {
      await walletKit.core.pairing.pair({ uri });
      setUri("");
      toast({
        title: "Connecting to dapp",
        description: "Waiting for session proposal...",
        status: "info",
        duration: 3000,
        isClosable: true,
        position: "bottom-right",
      });
    } catch (error) {
      console.error("Failed to connect to dapp:", error);
      toast({
        title: "Failed to connect to dapp",
        description: (error as Error).message,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom-right",
      });
    }
  }, [walletKit, uri, toast]);

  // Approve session proposal
  const approveSessionProposal = useCallback(async () => {
    if (
      !walletKit ||
      !currentSessionProposal ||
      !address ||
      !coinbaseSmartWalletAddress
    )
      return;

    try {
      // Get the supported chains from walletChains
      const chains = walletChains.map((chain) => `eip155:${chain.id}`);
      const accounts = chains.map(
        (chain) => `${chain}:${coinbaseSmartWalletAddress}`
      );

      const namespaces = buildApprovedNamespaces({
        proposal: currentSessionProposal.params,
        supportedNamespaces: {
          eip155: {
            chains,
            accounts,
            methods: [
              "eth_sendTransaction",
              "eth_sign",
              "personal_sign",
              "eth_signTransaction",
              "eth_signTypedData",
              "eth_signTypedData_v3",
              "eth_signTypedData_v4",
              "wallet_switchEthereumChain",
              "wallet_addEthereumChain",
            ],
            events: ["chainChanged", "accountsChanged"],
          },
        },
      });

      console.log("Approving session with namespaces:", namespaces);

      await walletKit.approveSession({
        id: currentSessionProposal.id,
        namespaces,
      });

      // Update active sessions
      const sessions = walletKit.getActiveSessions();
      setActiveSessions(filterActiveSessions(Object.values(sessions)));

      onSessionProposalClose();
      setCurrentSessionProposal(null);

      toast({
        title: "Session approved",
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "bottom-right",
      });
    } catch (error) {
      console.error("Failed to approve session:", error);
      toast({
        title: "Failed to approve session",
        description: (error as Error).message,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom-right",
      });
    }
  }, [
    walletKit,
    currentSessionProposal,
    address,
    coinbaseSmartWalletAddress,
    onSessionProposalClose,
    toast,
  ]);

  // Reject session proposal
  const rejectSessionProposal = useCallback(async () => {
    if (!walletKit || !currentSessionProposal) return;

    try {
      await walletKit.rejectSession({
        id: currentSessionProposal.id,
        reason: {
          code: 5000,
          message: "User rejected the session proposal",
        },
      });

      onSessionProposalClose();
      setCurrentSessionProposal(null);

      toast({
        title: "Session rejected",
        status: "info",
        duration: 3000,
        isClosable: true,
        position: "bottom-right",
      });
    } catch (error) {
      console.error("Failed to reject session:", error);
      toast({
        title: "Failed to reject session",
        description: (error as Error).message,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom-right",
      });
    }
  }, [walletKit, currentSessionProposal, onSessionProposalClose, toast]);

  // Handle chain switch
  const handleChainSwitch = useCallback(async () => {
    if (!targetChainId) return;

    try {
      setIsSwitchingChain(true);
      await switchChainAsync({ chainId: targetChainId });
      setIsSwitchingChain(false);
      setNeedsChainSwitch(false);
      setTargetChainId(null);
    } catch (error) {
      console.error("Failed to switch chain:", error);
      setIsSwitchingChain(false);
      toast({
        title: "Failed to switch chain",
        description: (error as Error).message,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom-right",
      });
    }
  }, [targetChainId, switchChainAsync, toast]);

  // Handle session request close
  const handleSessionRequestClose = useCallback(() => {
    onSessionRequestClose();
    setCurrentSessionRequest(null);
    setDecodedTxData(null);
    setDecodedSignatureData(null);
    setPendingRequest(false);
    setNeedsChainSwitch(false);
    setTargetChainId(null);
  }, [onSessionRequestClose]);

  // Disconnect session
  const disconnectSession = useCallback(
    async (topic: string) => {
      if (!walletKit) return;

      try {
        await walletKit.disconnectSession({
          topic,
          reason: {
            code: 6000,
            message: "User disconnected the session",
          },
        });

        // Update active sessions
        const sessions = walletKit.getActiveSessions();
        setActiveSessions(filterActiveSessions(Object.values(sessions)));

        toast({
          title: "Session disconnected",
          status: "info",
          duration: 3000,
          isClosable: true,
          position: "bottom-right",
        });
      } catch (error) {
        console.error("Failed to disconnect session:", error);
        toast({
          title: "Failed to disconnect session",
          description: (error as Error).message,
          status: "error",
          duration: 5000,
          isClosable: true,
          position: "bottom-right",
        });
      }
    },
    [walletKit, toast]
  );

  // Initialize Frame SDK
  useEffect(() => {
    const load = async () => {
      const _frameContext = await frameSdk.context;
      setFrameContext(_frameContext);

      frameSdk.actions.ready().then(() => {
        if (!_frameContext.client.added) {
          frameSdk.actions.addFrame();
        }
      });
    };
    if (frameSdk && !isFrameSDKLoaded) {
      setIsFrameSDKLoaded(true);
      load();
    }
  }, [isFrameSDKLoaded]);

  // Check if chain switch is needed when session request changes
  useEffect(() => {
    if (currentSessionRequest && chainId) {
      const { params } = currentSessionRequest;
      const { request } = params;

      // Extract the requested chain ID from the request
      const requestedChainIdStr = params.chainId.split(":")[1];
      const requestedChainId = parseInt(requestedChainIdStr);

      // Check if we need to switch chains for this request
      const requiresChainSwitch =
        chainId !== requestedChainId &&
        (request.method === "eth_sendTransaction" ||
          request.method === "eth_signTransaction" ||
          request.method === "eth_sign" ||
          request.method === "personal_sign" ||
          request.method === "eth_signTypedData" ||
          request.method === "eth_signTypedData_v3" ||
          request.method === "eth_signTypedData_v4");

      setNeedsChainSwitch(requiresChainSwitch);
      setTargetChainId(requiresChainSwitch ? requestedChainId : null);
    } else {
      setNeedsChainSwitch(false);
      setTargetChainId(null);
    }
  }, [currentSessionRequest, chainId]);

  return (
    <Box w="full" mt="-2rem">
      <Container
        mt="2rem"
        maxW={{ base: "20rem", md: "80%" }}
        px={{ base: 3, sm: 4, md: 6 }}
        mx="auto"
      >
        <Global
          styles={{
            ".chakra-react-select__menu": {
              zIndex: "9999 !important",
            },
            ".chakra-react-select__menu-portal": {
              zIndex: "9999 !important",
            },
            ".chakra-react-select__menu-list": {
              zIndex: "9999 !important",
            },
            ".chakra-modal__content": {
              overflow: "visible !important",
            },
            ".chakra-modal__body": {
              overflow: "visible !important",
            },
          }}
        />

        {/* Initialize WalletKit */}
        <WalletKitInitializer
          isConnected={isConnected}
          address={address}
          setWalletKit={setWalletKit}
          setActiveSessions={setActiveSessions}
          setIsInitializing={setIsInitializing}
          isInitializing={isInitializing}
        />

        {/* Handle WalletKit events with Coinbase Smart Wallet */}
        <CoinbaseSmartWalletWalletKitEventHandler
          walletKit={walletKit}
          address={address}
          coinbaseSmartWalletAddress={coinbaseSmartWalletAddress}
          setCurrentSessionProposal={setCurrentSessionProposal}
          setCurrentSessionRequest={setCurrentSessionRequest}
          setDecodedTxData={setDecodedTxData}
          setIsDecodingTx={setIsDecodingTx}
          setDecodedSignatureData={setDecodedSignatureData}
          setActiveSessions={setActiveSessions}
          onSessionProposalOpen={onSessionProposalOpen}
          onSessionRequestOpen={onSessionRequestOpen}
        />

        {/* Notify dApps about chain changes */}
        <ChainNotifier
          walletKit={walletKit}
          isConnected={isConnected}
          chainId={chainId}
          activeSessions={activeSessions}
        />

        {/* Handle auto-paste of WalletConnect URIs */}
        <AutoPasteHandler
          pasted={pasted}
          isConnected={isConnected}
          uri={uri}
          connectToDapp={connectToDapp}
          setPasted={setPasted}
        />

        <VStack
          spacing={{ base: 4, md: 6 }}
          align="stretch"
          w="100%"
          maxW={{ base: "100%", md: "700px", lg: "800px" }}
          mx="auto"
        >
          <Flex
            justifyContent="space-between"
            alignItems="center"
            direction={{ base: "column", lg: "row" }}
            gap={{ base: 4, lg: 0 }}
          >
            <Heading size={{ base: "xl", md: "xl" }}>
              🔵 Coinbase Smart Wallet Connect
            </Heading>
            {isConnected && <ConnectButton />}
          </Flex>

          <Text mb={2} fontSize={{ base: "md", md: "lg" }} color="gray.300">
            Connect your Coinbase Smart Wallet to any dapp via Wallet Connect.
            Transactions will be executed through your Coinbase Smart Wallet.
          </Text>

          <Box>
            {isInitializing ? (
              <Box p={{ base: 4, md: 6 }} borderWidth={1} borderRadius="lg">
                <Stack spacing={4}>
                  <Skeleton height="40px" width="60%" />
                  <SkeletonText
                    mt={2}
                    noOfLines={3}
                    spacing={4}
                    skeletonHeight={4}
                  />
                  <Skeleton height="60px" mt={2} />
                </Stack>
              </Box>
            ) : (
              <>
                {!isConnected && (
                  <Box
                    mt={{ base: 0, md: -5 }}
                    p={{ base: 4, md: 6 }}
                    borderWidth={1}
                    borderRadius="lg"
                    textAlign="center"
                    mb={{ base: 3, md: 4 }}
                  >
                    <Text mb={{ base: 3, md: 4 }}>
                      Please connect your wallet that owns the Coinbase Smart
                      Wallet contract
                    </Text>
                    <ConnectButton />
                  </Box>
                )}

                {/* Coinbase Smart Wallet Configuration section */}
                {isConnected && (
                  <Box
                    p={{ base: 4, md: 6 }}
                    borderWidth={1}
                    borderRadius="lg"
                    mb={{ base: 3, md: 4 }}
                  >
                    <Heading
                      size={{ base: "sm", md: "md" }}
                      mb={{ base: 3, md: 4 }}
                    >
                      Coinbase Smart Wallet Address
                    </Heading>
                    <VStack spacing={{ base: 3, md: 4 }}>
                      <FormControl isRequired>
                        <Input
                          placeholder="0x..."
                          value={coinbaseSmartWalletAddress}
                          onChange={(e) =>
                            setCoinbaseSmartWalletAddress(e.target.value)
                          }
                          size={{ base: "md", md: "md" }}
                          isDisabled={
                            coinbaseSmartWalletValidation.isValidating
                          }
                        />
                      </FormControl>

                      {coinbaseSmartWalletValidation.isValidating && (
                        <Alert status="info" borderRadius="md">
                          <AlertIcon />
                          Validating Coinbase Smart Wallet address...
                        </Alert>
                      )}

                      {coinbaseSmartWalletValidation.error && (
                        <Alert status="error" borderRadius="md">
                          <AlertIcon />
                          {coinbaseSmartWalletValidation.error}
                        </Alert>
                      )}

                      {coinbaseSmartWalletValidation.isContract === true &&
                        coinbaseSmartWalletValidation.isOwner === true && (
                          <Alert status="success" borderRadius="md">
                            <AlertIcon />
                            Coinbase Smart Wallet address validated successfully
                          </Alert>
                        )}

                      {!isChainSupported && (
                        <Alert status="warning" borderRadius="md">
                          <AlertIcon />
                          This chain is not supported. Please switch to a
                          supported chain: {getSupportedChains().join(", ")}
                        </Alert>
                      )}

                      {!isConfigurationValid() &&
                        isChainSupported &&
                        !coinbaseSmartWalletValidation.error &&
                        coinbaseSmartWalletAddress.trim() === "" && (
                          <Alert status="warning" borderRadius="md">
                            <AlertIcon />
                            Please provide Coinbase Smart Wallet address to
                            continue.
                          </Alert>
                        )}

                      <HStack spacing={2}>
                        <InfoIcon color="gray.500" />
                        <Text>
                          Transactions will be executed via your Coinbase Smart
                          Wallet, with gas payed by your connected wallet
                        </Text>
                      </HStack>
                    </VStack>
                  </Box>
                )}

                {/* Connect to dapp section */}
                <ConnectDapp
                  uri={uri}
                  setUri={setUri}
                  setPasted={setPasted}
                  isConnected={isConnected && isConfigurationValid()}
                  connectToDapp={connectToDapp}
                />

                {/* Active Sessions section */}
                <ActiveSessions
                  isConnected={isConnected && isConfigurationValid()}
                  activeSessions={activeSessions}
                  chainId={chainId}
                  disconnectSession={disconnectSession}
                />
              </>
            )}
          </Box>
        </VStack>

        {/* Session Proposal Modal */}
        <SessionProposalModal
          isOpen={isSessionProposalOpen}
          onClose={onSessionProposalClose}
          currentSessionProposal={currentSessionProposal}
          onApprove={approveSessionProposal}
          onReject={rejectSessionProposal}
        />

        {/* Coinbase Smart Wallet Session Request Modal */}
        <CoinbaseSmartWalletSessionRequestModal
          isOpen={isSessionRequestOpen}
          onClose={handleSessionRequestClose}
          currentSessionRequest={currentSessionRequest}
          decodedTxData={decodedTxData}
          isDecodingTx={isDecodingTx}
          decodedSignatureData={decodedSignatureData}
          pendingRequest={pendingRequest}
          isSwitchingChain={isSwitchingChain}
          needsChainSwitch={needsChainSwitch}
          targetChainId={targetChainId}
          onChainSwitch={handleChainSwitch}
          coinbaseSmartWalletAddress={coinbaseSmartWalletAddress}
          coinbaseSmartWalletChainId={chainId}
          walletKit={walletKit}
          address={address}
          walletClient={walletClient}
          setPendingRequest={setPendingRequest}
          setIsSwitchingChain={setIsSwitchingChain}
          setNeedsChainSwitch={setNeedsChainSwitch}
          setTargetChainId={setTargetChainId}
          toast={toast}
        />
      </Container>
    </Box>
  );
}
