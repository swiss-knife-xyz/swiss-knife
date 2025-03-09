"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "@chakra-ui/react";
import { Global } from "@emotion/react";
import frameSdk, { Context } from "@farcaster/frame-sdk";
import { useAccount, useWalletClient, useChainId, useSwitchChain } from "wagmi";
import { base } from "viem/chains";
import { buildApprovedNamespaces } from "@walletconnect/utils";
import { ConnectButton } from "@/components/ConnectButton/ConnectButton";
import { walletChains } from "@/app/providers";
import { chainIdToChain } from "@/data/common";

// Import types
import { SessionProposal, SessionRequest, WalletKitInstance } from "./types";

// Import components
import SessionProposalModal from "./components/SessionProposalModal";
import SessionRequestModal from "./components/SessionRequestModal";
import ConnectDapp from "./components/ConnectDapp";
import ActiveSessions from "./components/ActiveSessions";
import WalletKitInitializer from "./components/WalletKitInitializer";
import WalletKitEventHandler from "./components/WalletKitEventHandler";
import ChainNotifier from "./components/ChainNotifier";
import AutoPasteHandler from "./components/AutoPasteHandler";
import { AnimatedSubtitle } from "./components/AnimatedSubtitle";
import { filterActiveSessions } from "./utils";

export default function WalletBridgePage() {
  const toast = useToast();
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();

  // State for Frame
  const [isFrameSDKLoaded, setIsFrameSDKLoaded] = useState(false);
  const [frameContext, setFrameContext] = useState<typeof Context | null>(null);

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

  // Handle session request (like eth_sendTransaction)
  const handleSessionRequest = useCallback(
    async (approve: boolean) => {
      if (!walletKit || !currentSessionRequest || !walletClient) return;

      try {
        const { id, topic, params } = currentSessionRequest;
        const { request } = params;

        if (approve) {
          let result;

          setPendingRequest(true);

          // Handle different request methods
          if (request.method === "eth_sendTransaction") {
            const txParams = request.params[0];

            // Send transaction using wagmi wallet client
            const hash = await walletClient.sendTransaction({
              account: address as `0x${string}`,
              to: txParams.to as `0x${string}`,
              value: txParams.value ? BigInt(txParams.value) : undefined,
              data: txParams.data as `0x${string}` | undefined,
              gas: txParams.gas ? BigInt(txParams.gas) : undefined,
            });

            result = hash;
          } else if (
            request.method === "personal_sign" ||
            request.method === "eth_sign"
          ) {
            const message = request.params[0];
            const signature = await walletClient.signMessage({
              account: address as `0x${string}`,
              message: { raw: message as `0x${string}` },
            });

            result = signature;
          } else if (
            request.method === "eth_signTypedData" ||
            request.method === "eth_signTypedData_v3" ||
            request.method === "eth_signTypedData_v4"
          ) {
            // Handle typed data signing
            const typedData = request.params[1]; // The typed data is usually the second parameter
            const signature = await walletClient.signTypedData({
              account: address as `0x${string}`,
              domain: typedData.domain,
              types: typedData.types,
              primaryType: typedData.primaryType,
              message: typedData.message,
            });

            result = signature;
          } else if (request.method === "wallet_switchEthereumChain") {
            // Handle chain switching request
            const requestedChainId = parseInt(request.params[0].chainId);

            // Switch chain using wagmi
            setIsSwitchingChain(true);
            await switchChainAsync({ chainId: requestedChainId });
            setIsSwitchingChain(false);

            // Return success
            result = null;
          } else if (request.method === "wallet_addEthereumChain") {
            // For adding a new chain, we'll just show a toast for now
            // In a real implementation, you might want to add the chain to your wallet
            const chainParams = request.params[0];

            toast({
              title: "Add Chain Request",
              description: `Request to add chain ${chainParams.chainName} (${chainParams.chainId})`,
              status: "info",
              duration: 5000,
              isClosable: true,
              position: "bottom-right",
            });

            // Return success
            result = null;
          } else {
            // For other methods, just return success
            result = "0x";
          }

          // Respond to the request
          await walletKit.respondSessionRequest({
            topic,
            response: {
              id,
              jsonrpc: "2.0",
              result,
            },
          });

          setPendingRequest(false);
          setNeedsChainSwitch(false);
          setTargetChainId(null);

          toast({
            title: "Request approved",
            description: `Method: ${request.method}`,
            status: "success",
            duration: 3000,
            isClosable: true,
            position: "bottom-right",
          });
        } else {
          // Reject the request
          await walletKit.respondSessionRequest({
            topic,
            response: {
              id,
              jsonrpc: "2.0",
              error: {
                code: 4001,
                message: "User rejected the request",
              },
            },
          });

          toast({
            title: "Request rejected",
            status: "info",
            duration: 3000,
            isClosable: true,
            position: "bottom-right",
          });
        }

        // Close the modal
        onSessionRequestClose();
      } catch (error) {
        console.error("Error handling session request:", error);
        setPendingRequest(false);
        setIsSwitchingChain(false);
        setNeedsChainSwitch(false);
        setTargetChainId(null);

        // Extract a more user-friendly error message using Viem's error handling
        let errorMessage = String(error);

        // Check if it's a Viem error with a walk method
        if (
          error &&
          typeof error === "object" &&
          "walk" in error &&
          typeof error.walk === "function"
        ) {
          try {
            // Try to extract ContractFunctionRevertedError or other specific error types
            const specificError = error.walk(
              (err: any) =>
                err?.name === "ContractFunctionRevertedError" ||
                err?.shortMessage ||
                err?.message
            );

            if (specificError) {
              // Use the most specific error information available
              errorMessage =
                specificError.shortMessage ||
                specificError.message ||
                specificError.data?.message ||
                specificError.data?.errorName ||
                String(specificError);

              // Clean up the error message
              errorMessage = errorMessage
                .replace(/^(Error:|ContractFunctionRevertedError:)/, "")
                .trim();
            }
          } catch (walkError) {
            console.error("Error extracting specific error:", walkError);
          }
        }

        toast({
          title: "Error",
          description: `Failed to ${
            approve ? "approve" : "reject"
          } request: ${errorMessage}`,
          status: "error",
          duration: 5000,
          isClosable: true,
          position: "bottom-right",
        });

        // Note: We're not automatically closing the modal on error
        // This allows users to see the error and manually close the modal if needed
      }
    },
    [
      walletKit,
      currentSessionRequest,
      walletClient,
      address,
      toast,
      switchChainAsync,
      onSessionRequestClose,
    ]
  );

  // Custom close handler for session request modal
  const handleSessionRequestClose = useCallback(() => {
    // If there's an active request, reject it when closing the modal
    if (
      currentSessionRequest &&
      walletKit &&
      !pendingRequest &&
      !isSwitchingChain
    ) {
      handleSessionRequest(false);
    } else {
      // Just close the modal without rejecting if we're in the middle of processing
      onSessionRequestClose();
      setCurrentSessionRequest(null);

      // Show a warning toast if closing during processing
      if (pendingRequest || isSwitchingChain) {
        handleSessionRequest(false);
        toast({
          title: "Request in progress",
          description:
            "The request might still be processing in the background. You can check the status in your wallet.",
          status: "warning",
          duration: 5000,
          isClosable: true,
          position: "bottom-right",
        });

        // Reset states after a delay to ensure UI is responsive
        setTimeout(() => {
          setPendingRequest(false);
          setIsSwitchingChain(false);
          setNeedsChainSwitch(false);
          setTargetChainId(null);
        }, 500);
      }
    }
  }, [
    currentSessionRequest,
    walletKit,
    pendingRequest,
    isSwitchingChain,
    handleSessionRequest,
    onSessionRequestClose,
    toast,
  ]);

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
    if (!walletKit || !currentSessionProposal || !address) return;

    try {
      // Get the supported chains from walletChains
      const chains = walletChains.map((chain) => `eip155:${chain.id}`);
      const accounts = chains.map((chain) => `${chain}:${address}`);

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
          code: 4001,
          message: "User rejected the session",
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

      // No need to set targetChainId to null here as we want to keep it
      // for reference in case the user needs to switch back
    } catch (error) {
      setIsSwitchingChain(false);
      console.error("Error switching chain:", error);
      toast({
        title: "Chain Switch Failed",
        description: `Failed to switch to ${
          chainIdToChain[targetChainId]?.name || `Chain ID: ${targetChainId}`
        }`,
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "bottom-right",
      });
    }
  }, [targetChainId, switchChainAsync, toast]);

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
      setFrameContext(await frameSdk.context);
      frameSdk.actions.ready();
    };
    if (frameSdk && !isFrameSDKLoaded) {
      setIsFrameSDKLoaded(true);
      load();
    }
  }, [isFrameSDKLoaded]);

  // switch to base, as warpcast wallet is on base
  useEffect(() => {
    if (frameContext && switchChainAsync && address) {
      switchChainAsync({ chainId: base.id });
    }
  }, [frameContext, switchChainAsync, address]);

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
    <Container
      maxW={"80%"}
      py={{ base: 4, md: 8 }}
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

      {/* Handle WalletKit events */}
      <WalletKitEventHandler
        walletKit={walletKit}
        address={address}
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
          <Heading size={{ base: "2xl", md: "lg" }}>💸 Wallet Bridge</Heading>
          {isConnected && <ConnectButton />}
        </Flex>

        <AnimatedSubtitle />

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
                    Please connect your wallet to use WalletBridge
                  </Text>
                  <ConnectButton />
                </Box>
              )}

              {/* Connect to dapp section */}
              <ConnectDapp
                uri={uri}
                setUri={setUri}
                setPasted={setPasted}
                isConnected={isConnected}
                connectToDapp={connectToDapp}
              />

              {/* Active Sessions section */}
              <ActiveSessions
                isConnected={isConnected}
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

      {/* Session Request Modal */}
      <SessionRequestModal
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
        onApprove={() => handleSessionRequest(true)}
        onReject={() => handleSessionRequest(false)}
        onChainSwitch={handleChainSwitch}
      />
    </Container>
  );
}
