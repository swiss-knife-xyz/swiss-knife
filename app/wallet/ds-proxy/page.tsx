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
  Button,
  Center,
  FormControl,
  FormLabel,
  Input,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";
import { Global } from "@emotion/react";
import frameSdk, { Context } from "@farcaster/frame-sdk";
import { useAccount, useWalletClient, useChainId, useSwitchChain } from "wagmi";
import { base } from "viem/chains";
import { buildApprovedNamespaces } from "@walletconnect/utils";
import { ConnectButton } from "@/components/ConnectButton/ConnectButton";
import { walletChains } from "@/app/providers";
import { chainIdToChain, c } from "@/data/common";
import { DarkSelect } from "@/components/DarkSelect";
import { SelectedOptionState } from "@/types";

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

// Import our custom DS Proxy components
import DSProxySessionRequestModal from "./components/DSProxySessionRequestModal";
import DSProxyWalletKitEventHandler from "./components/DSProxyWalletKitEventHandler";

// Create network options for the chain dropdown
const networkOptions: { label: string; value: number }[] = Object.keys(c).map(
  (k, i) => ({
    label: c[k].name,
    value: c[k].id,
  })
);

export default function DSProxyPage() {
  const toast = useToast();
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();

  // DS Proxy configuration state (persisted in localStorage)
  const [dsProxyAddress, setDsProxyAddress] = useLocalStorage<string>(
    "dsProxyAddress",
    ""
  );
  const [selectedChain, setSelectedChain] =
    useLocalStorage<SelectedOptionState>(
      "dsProxySelectedChain",
      networkOptions[0]
    );
  const [executorAddress, setExecutorAddress] = useLocalStorage<string>(
    "dsProxyExecutorAddress",
    ""
  );

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

  // Validation function for DS Proxy configuration
  const isConfigurationValid = (): boolean => {
    return (
      dsProxyAddress.trim() !== "" &&
      executorAddress.trim() !== "" &&
      selectedChain?.value != null
    );
  };

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
    if (!walletKit || !currentSessionProposal || !address || !dsProxyAddress)
      return;

    try {
      // Get the supported chains from walletChains
      const chains = walletChains.map((chain) => `eip155:${chain.id}`);
      const accounts = chains.map((chain) => `${chain}:${dsProxyAddress}`);

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
    dsProxyAddress,
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
        maxW={"80%"}
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

        {/* Handle WalletKit events with DS Proxy */}
        <DSProxyWalletKitEventHandler
          walletKit={walletKit}
          address={address}
          dsProxyAddress={dsProxyAddress}
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
              🛡️ DSProxy Connect
            </Heading>
            {isConnected && <ConnectButton />}
          </Flex>

          <Text mb={2} fontSize={{ base: "md", md: "lg" }} color="gray.300">
            Connect your DSProxy contract to any dapp via WalletConnect.
            Transactions will be executed through your DSProxy.
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
                      Please connect your wallet that owns the DSProxy contract
                    </Text>
                    <ConnectButton />
                  </Box>
                )}

                {/* DS Proxy Configuration section */}
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
                      DSProxy Configuration
                    </Heading>
                    <VStack spacing={{ base: 3, md: 4 }}>
                      <FormControl isRequired>
                        <FormLabel>DSProxy Contract Address</FormLabel>
                        <Input
                          placeholder="0x..."
                          value={dsProxyAddress}
                          onChange={(e) => setDsProxyAddress(e.target.value)}
                          size={{ base: "md", md: "md" }}
                        />
                      </FormControl>

                      <FormControl isRequired>
                        <FormLabel>Chain</FormLabel>
                        <DarkSelect
                          boxProps={{
                            w: "100%",
                          }}
                          selectedOption={selectedChain}
                          setSelectedOption={setSelectedChain}
                          options={networkOptions}
                        />
                      </FormControl>

                      <FormControl isRequired>
                        <FormLabel>Executor Contract Address</FormLabel>
                        <Input
                          placeholder="0x..."
                          value={executorAddress}
                          onChange={(e) => setExecutorAddress(e.target.value)}
                          size={{ base: "md", md: "md" }}
                        />
                      </FormControl>

                      {!isConfigurationValid() && (
                        <Alert status="warning" borderRadius="md">
                          <AlertIcon />
                          Please provide DSProxy address, executor contract
                          address, and select a chain to continue.
                        </Alert>
                      )}
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

        {/* DS Proxy Session Request Modal */}
        <DSProxySessionRequestModal
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
          dsProxyAddress={dsProxyAddress}
          dsProxyChainId={(selectedChain?.value as number) || 1}
          executorAddress={executorAddress}
          walletKit={walletKit}
          address={address}
          walletClient={walletClient}
          setPendingRequest={setPendingRequest}
          setNeedsChainSwitch={setNeedsChainSwitch}
          setTargetChainId={setTargetChainId}
          toast={toast}
        />
      </Container>
    </Box>
  );
}
