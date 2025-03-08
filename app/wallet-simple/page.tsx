"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Input,
  Text,
  VStack,
  HStack,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Code,
  Divider,
  Badge,
  Spinner,
  Skeleton,
  SkeletonText,
  Stack,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
} from "@chakra-ui/react";
import { Global } from "@emotion/react";
import { ConnectButton } from "@/components/ConnectButton/ConnectButton";
import { Core } from "@walletconnect/core";
import { buildApprovedNamespaces } from "@walletconnect/utils";
import { WalletKit } from "@reown/walletkit";
import { useAccount, useWalletClient, useChainId, useSwitchChain } from "wagmi";
import { formatEther, parseEther, hexToString, isHex } from "viem";
import { walletChains } from "@/app/providers";
import { chainIdToChain } from "@/data/common";
import { decodeRecursive } from "@/lib/decoder";
import { renderParams } from "@/components/renderParams";

// Types for session requests
interface SessionProposal {
  id: number;
  params: {
    id: number;
    pairingTopic: string;
    expiryTimestamp: number;
    relays: { protocol: string }[];
    proposer: {
      publicKey: string;
      metadata: {
        name: string;
        description: string;
        url: string;
        icons: string[];
      };
    };
    requiredNamespaces: Record<
      string,
      {
        chains: string[];
        methods: string[];
        events: string[];
      }
    >;
    optionalNamespaces: Record<
      string,
      {
        chains: string[];
        methods: string[];
        events: string[];
        rpcMap?: Record<string, string>;
      }
    >;
  };
}

interface SessionRequest {
  id: number;
  topic: string;
  params: {
    request: {
      method: string;
      params: any;
    };
    chainId: string;
  };
}

// Helper function to decode personal_sign and eth_sign messages
const decodeSignMessage = (hexMessage: string) => {
  try {
    // Try to decode as UTF-8 string
    if (isHex(hexMessage)) {
      // First try to decode as UTF-8
      try {
        // viem doesn't have hexToUtf8, but hexToString should work for UTF-8
        return {
          decoded: hexToString(hexMessage),
          type: "utf8",
        };
      } catch (e) {
        // If that fails, return the original hex
        return {
          decoded: hexMessage,
          type: "hex",
        };
      }
    }

    // If it's not hex, it might already be a string
    return {
      decoded: hexMessage,
      type: "string",
    };
  } catch (error) {
    console.error("Error decoding message:", error);
    return {
      decoded: hexMessage,
      type: "unknown",
    };
  }
};

// Helper function to format EIP-712 typed data in a human-readable way
const formatTypedData = (typedData: any) => {
  if (!typedData) return null;

  try {
    // If typedData is a string, try to parse it
    const data =
      typeof typedData === "string" ? JSON.parse(typedData) : typedData;

    return {
      domain: data.domain,
      primaryType: data.primaryType,
      types: data.types,
      message: data.message,
    };
  } catch (error) {
    console.error("Error formatting typed data:", error);
    return null;
  }
};

export default function WalletSimplePage() {
  const toast = useToast();
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  // State for WalletConnect
  const [uri, setUri] = useState<string>("");
  const [pasted, setPasted] = useState(false);
  const [walletKit, setWalletKit] = useState<any>(null);
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

  // Initialize WalletKit
  useEffect(() => {
    const initializeWalletKit = async () => {
      if (!isConnected || !address) return;

      try {
        setIsInitializing(true);

        // Initialize Core and WalletKit
        const core = new Core({
          projectId:
            process.env.NEXT_PUBLIC_WC_PROJECT_ID ||
            process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
            "YOUR_PROJECT_ID",
        });

        const kit = await WalletKit.init({
          core,
          metadata: {
            name: "Swiss Knife Wallet",
            description: "A simple wallet for WalletConnect",
            url: "https://swiss-knife.vercel.app",
            icons: ["https://swiss-knife.vercel.app/logo.png"],
          },
        });

        setWalletKit(kit);

        // Load existing sessions
        const sessions = kit.getActiveSessions();
        setActiveSessions(Object.values(sessions));

        setIsInitializing(false);

        toast({
          title: "WalletKit initialized",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } catch (error) {
        console.error("Failed to initialize WalletKit:", error);
        toast({
          title: "Failed to initialize WalletKit",
          description: (error as Error).message,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        setIsInitializing(false);
      }
    };

    initializeWalletKit();
  }, [isConnected, address, toast]);

  // Set up event listeners for WalletKit
  useEffect(() => {
    if (!walletKit) return;

    // Handle session proposal
    const onSessionProposal = (proposal: SessionProposal) => {
      console.log("Session proposal received:", proposal);
      console.log("Required namespaces:", proposal.params.requiredNamespaces);
      console.log("Optional namespaces:", proposal.params.optionalNamespaces);
      setCurrentSessionProposal(proposal);

      // Auto-approve the session proposal instead of opening the modal
      if (walletKit && address) {
        // We'll call this in a setTimeout to ensure the state is updated
        setTimeout(async () => {
          try {
            // Get the supported chains from walletChains
            const chains = walletChains.map((chain) => `eip155:${chain.id}`);
            const accounts = chains.map((chain) => `${chain}:${address}`);

            const namespaces = buildApprovedNamespaces({
              proposal: proposal.params,
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

            console.log("Auto-approving session with namespaces:", namespaces);

            await walletKit.approveSession({
              id: proposal.id,
              namespaces,
            });

            // Update active sessions
            const sessions = walletKit.getActiveSessions();
            setActiveSessions(Object.values(sessions));

            toast({
              title: "Session auto-approved",
              status: "success",
              duration: 3000,
              isClosable: true,
            });
          } catch (error) {
            console.error("Failed to auto-approve session:", error);

            // If auto-approval fails, fall back to manual approval via modal
            onSessionProposalOpen();

            toast({
              title: "Auto-approval failed",
              description: (error as Error).message,
              status: "error",
              duration: 5000,
              isClosable: true,
            });
          }
        }, 100);
      } else {
        // If wallet is not connected or address is not available, open the modal for manual approval
        onSessionProposalOpen();
      }
    };

    // Handle session request
    const onSessionRequest = async (request: SessionRequest) => {
      console.log("Session request received:", request);
      setCurrentSessionRequest(request);

      // Reset decoded data
      setDecodedTxData(null);
      setDecodedSignatureData(null);

      // Open the modal immediately
      onSessionRequestOpen();

      // Decode transaction data if it's a sendTransaction request
      if (request.params.request.method === "eth_sendTransaction") {
        try {
          setIsDecodingTx(true);
          const txData = request.params.request.params[0];

          if (txData.data) {
            const chainIdStr = request.params.chainId.split(":")[1];
            const chainIdNum = parseInt(chainIdStr);

            const decodedData = await decodeRecursive({
              calldata: txData.data,
              address: txData.to,
              chainId: chainIdNum,
            });

            console.log("Decoded transaction data:", decodedData);
            setDecodedTxData(decodedData);
          }
        } catch (error) {
          console.error("Error decoding transaction data:", error);
        } finally {
          setIsDecodingTx(false);
        }
      }
      // Decode signature requests
      else if (
        request.params.request.method === "personal_sign" ||
        request.params.request.method === "eth_sign"
      ) {
        try {
          // For personal_sign, the message is the first parameter
          // For eth_sign, the message is the second parameter (first is address)
          const messageParam =
            request.params.request.method === "personal_sign"
              ? request.params.request.params[0]
              : request.params.request.params[1];

          const decodedMessage = decodeSignMessage(messageParam);
          setDecodedSignatureData({
            type: "message",
            decoded: decodedMessage,
          });
        } catch (error) {
          console.error("Error decoding signature message:", error);
        }
      }
      // Decode typed data signing requests
      else if (
        request.params.request.method === "eth_signTypedData" ||
        request.params.request.method === "eth_signTypedData_v3" ||
        request.params.request.method === "eth_signTypedData_v4"
      ) {
        try {
          // The typed data is usually the second parameter
          const typedData = request.params.request.params[1];
          const formattedTypedData = formatTypedData(typedData);

          setDecodedSignatureData({
            type: "typedData",
            decoded: formattedTypedData,
          });
        } catch (error) {
          console.error("Error decoding typed data:", error);
        }
      }
    };

    // Subscribe to events
    walletKit.on("session_proposal", onSessionProposal);
    walletKit.on("session_request", onSessionRequest);

    // Cleanup
    return () => {
      walletKit.off("session_proposal", onSessionProposal);
      walletKit.off("session_request", onSessionRequest);
    };
  }, [walletKit, onSessionProposalOpen, onSessionRequestOpen]);

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
            await switchChain({ chainId: requestedChainId });
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

        toast({
          title: "Error",
          description: `Failed to ${
            approve ? "approve" : "reject"
          } request: ${error}`,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    },
    [
      walletKit,
      currentSessionRequest,
      walletClient,
      chainId,
      address,
      toast,
      switchChain,
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
    }
  }, [
    currentSessionRequest,
    walletKit,
    pendingRequest,
    isSwitchingChain,
    handleSessionRequest,
    onSessionRequestClose,
  ]);

  // Notify dApps about chain changes
  useEffect(() => {
    if (!walletKit || !isConnected || !chainId || activeSessions.length === 0)
      return;

    // For each active session, emit a chainChanged event
    activeSessions.forEach(async (session) => {
      try {
        // Check if the session has the eip155 namespace
        if (session.namespaces.eip155) {
          // Format the chain ID as eip155:chainId
          const formattedChainId = `eip155:${chainId}`;

          // Check if this chain is approved for this session
          const isChainApproved = session.namespaces.eip155.accounts.some(
            (account: string) => account.startsWith(formattedChainId)
          );

          if (isChainApproved) {
            // Emit chainChanged event to the dApp
            await walletKit.emitSessionEvent({
              topic: session.topic,
              event: {
                name: "chainChanged",
                data: chainId,
              },
              chainId: formattedChainId,
            });

            console.log(
              `Notified session ${session.topic} about chain change to ${chainId}`
            );
          }
        }
      } catch (error) {
        console.error(
          `Failed to notify session ${session.topic} about chain change:`,
          error
        );
      }
    });
  }, [walletKit, chainId, isConnected, activeSessions]);

  // Connect to dApp using WalletConnect URI
  const connectToDapp = useCallback(async () => {
    if (!walletKit || !uri) return;

    try {
      await walletKit.core.pairing.pair({ uri });
      setUri("");
      toast({
        title: "Connecting to dApp",
        description: "Waiting for session proposal...",
        status: "info",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error("Failed to connect to dApp:", error);
      toast({
        title: "Failed to connect to dApp",
        description: (error as Error).message,
        status: "error",
        duration: 5000,
        isClosable: true,
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
      setActiveSessions(Object.values(sessions));

      onSessionProposalClose();
      setCurrentSessionProposal(null);

      toast({
        title: "Session approved",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error("Failed to approve session:", error);
      toast({
        title: "Failed to approve session",
        description: (error as Error).message,
        status: "error",
        duration: 5000,
        isClosable: true,
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
      });
    } catch (error) {
      console.error("Failed to reject session:", error);
      toast({
        title: "Failed to reject session",
        description: (error as Error).message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  }, [walletKit, currentSessionProposal, onSessionProposalClose, toast]);

  // Handle chain switch
  const handleChainSwitch = useCallback(async () => {
    if (!targetChainId) return;

    try {
      setIsSwitchingChain(true);
      await switchChain({ chainId: targetChainId });
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
      });
    }
  }, [targetChainId, switchChain, toast]);

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
        setActiveSessions(Object.values(sessions));

        toast({
          title: "Session disconnected",
          status: "info",
          duration: 3000,
          isClosable: true,
        });
      } catch (error) {
        console.error("Failed to disconnect session:", error);
        toast({
          title: "Failed to disconnect session",
          description: (error as Error).message,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    },
    [walletKit, toast]
  );

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

  // Add useEffect to handle auto-connect on paste
  useEffect(() => {
    if (pasted && isConnected && uri && uri.startsWith("wc:")) {
      connectToDapp();
      setPasted(false);
    }
  }, [uri, pasted, isConnected, connectToDapp]);

  return (
    <Container maxW="container.lg" py={8}>
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

      <VStack spacing={8} align="stretch">
        <Flex justifyContent="space-between" alignItems="center">
          <Heading size="lg">Wallet Bridge</Heading>
          <ConnectButton />
        </Flex>

        {isInitializing ? (
          <Box p={6} borderWidth={1} borderRadius="lg">
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
                p={6}
                borderWidth={1}
                borderRadius="lg"
                textAlign="center"
                mb={4}
              >
                <Text mb={4}>
                  Please connect your wallet to use Wallet Bridge
                </Text>
                <ConnectButton />
              </Box>
            )}

            <Box
              p={6}
              borderWidth={1}
              borderRadius="lg"
              opacity={!isConnected ? 0.7 : 1}
            >
              <Heading size="md" mb={4}>
                Connect to dApp
              </Heading>
              <VStack spacing={4}>
                <Input
                  placeholder="Enter WalletConnect URI (wc:...)"
                  value={uri}
                  onChange={(e) => setUri(e.target.value)}
                  onPaste={(e) => {
                    e.preventDefault();
                    setPasted(true);
                    setUri(e.clipboardData.getData("text"));
                  }}
                  isDisabled={!isConnected}
                />
                <Button
                  colorScheme="blue"
                  width="100%"
                  onClick={connectToDapp}
                  isDisabled={!isConnected || !uri || !uri.startsWith("wc:")}
                >
                  Connect
                </Button>
              </VStack>
            </Box>

            <Box
              p={6}
              borderWidth={1}
              borderRadius="lg"
              opacity={!isConnected ? 0.7 : 1}
            >
              <Heading size="md" mb={4}>
                Active Sessions ({isConnected ? activeSessions.length : 0})
              </Heading>
              {!isConnected ? (
                <Text>Connect your wallet to view active sessions</Text>
              ) : activeSessions.length === 0 ? (
                <Text>No active sessions</Text>
              ) : (
                <VStack spacing={4} align="stretch">
                  {activeSessions.map((session) => (
                    <Box
                      key={session.topic}
                      p={4}
                      borderWidth={1}
                      borderRadius="md"
                    >
                      <Flex
                        justifyContent="space-between"
                        alignItems="center"
                        mb={2}
                      >
                        <HStack>
                          {session.peer.metadata.icons &&
                            session.peer.metadata.icons[0] && (
                              <Box
                                as="img"
                                src={session.peer.metadata.icons[0]}
                                alt={session.peer.metadata.name}
                                boxSize="32px"
                                borderRadius="md"
                                mr={2}
                              />
                            )}
                          <Text fontWeight="bold">
                            {session.peer.metadata.name}
                          </Text>
                        </HStack>
                        <Button
                          size="sm"
                          colorScheme="red"
                          onClick={() => disconnectSession(session.topic)}
                        >
                          Disconnect
                        </Button>
                      </Flex>
                      <Text fontSize="sm" color="gray.600" mb={2}>
                        {session.peer.metadata.url}
                      </Text>

                      <Text fontSize="sm" fontWeight="bold" mb={1}>
                        Approved Chains:
                      </Text>
                      <HStack wrap="wrap" spacing={2}>
                        {session.namespaces.eip155?.accounts.map(
                          (account: string) => {
                            const [namespace, chainIdStr] = account.split(":");
                            const accountChainId = parseInt(chainIdStr);
                            const chainName =
                              chainIdToChain[accountChainId]?.name ||
                              chainIdStr;
                            return (
                              <Badge
                                key={account}
                                colorScheme={
                                  accountChainId === chainId ? "green" : "gray"
                                }
                              >
                                {chainName}
                              </Badge>
                            );
                          }
                        )}
                      </HStack>
                    </Box>
                  ))}
                </VStack>
              )}
            </Box>
          </>
        )}
      </VStack>

      {/* Session Proposal Modal */}
      <Modal
        isOpen={isSessionProposalOpen}
        onClose={onSessionProposalClose}
        isCentered
        size="lg"
        blockScrollOnMount={false}
      >
        <ModalOverlay bg="none" backdropFilter="auto" backdropBlur="5px" />
        <ModalContent
          bg="bg.900"
          color="white"
          maxW={{
            base: "90%",
            sm: "30rem",
            md: "40rem",
          }}
          zIndex="1400"
        >
          <ModalHeader borderBottomWidth="1px" borderColor="whiteAlpha.200">
            Session Proposal
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {currentSessionProposal && (
              <VStack spacing={4} align="stretch">
                <Flex alignItems="center">
                  {currentSessionProposal.params.proposer.metadata.icons &&
                    currentSessionProposal.params.proposer.metadata
                      .icons[0] && (
                      <Box
                        as="img"
                        src={
                          currentSessionProposal.params.proposer.metadata
                            .icons[0]
                        }
                        alt={
                          currentSessionProposal.params.proposer.metadata.name
                        }
                        boxSize="48px"
                        borderRadius="md"
                        mr={4}
                      />
                    )}
                  <Box>
                    <Heading size="md">
                      {currentSessionProposal.params.proposer.metadata.name}
                    </Heading>
                    <Text fontSize="sm" color="whiteAlpha.700">
                      {currentSessionProposal.params.proposer.metadata.url}
                    </Text>
                  </Box>
                </Flex>

                <Divider />

                <Box>
                  <Text fontWeight="bold" mb={2}>
                    Description:
                  </Text>
                  <Text>
                    {
                      currentSessionProposal.params.proposer.metadata
                        .description
                    }
                  </Text>
                </Box>

                <Box>
                  <Text fontWeight="bold" mb={2}>
                    Requested Permissions:
                  </Text>
                  <VStack spacing={2} align="stretch">
                    {Object.entries(
                      currentSessionProposal.params.requiredNamespaces
                    ).map(([key, value]) => (
                      <Box
                        key={key}
                        p={3}
                        borderWidth={1}
                        borderRadius="md"
                        borderColor="whiteAlpha.300"
                        bg="whiteAlpha.100"
                      >
                        <Text fontWeight="bold">{key}</Text>
                        <Text fontSize="sm">
                          Chains: {value.chains.join(", ")}
                        </Text>
                        <Text fontSize="sm">
                          Methods: {value.methods.join(", ")}
                        </Text>
                        <Text fontSize="sm">
                          Events: {value.events.join(", ")}
                        </Text>
                      </Box>
                    ))}
                  </VStack>
                </Box>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter borderTopWidth="1px" borderColor="whiteAlpha.200">
            <Button colorScheme="red" mr={3} onClick={rejectSessionProposal}>
              Reject
            </Button>
            <Button colorScheme="blue" onClick={approveSessionProposal}>
              Approve
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Session Request Modal */}
      <Modal
        isOpen={isSessionRequestOpen}
        onClose={handleSessionRequestClose}
        isCentered
        size="lg"
        closeOnOverlayClick={!pendingRequest && !isSwitchingChain}
        closeOnEsc={!pendingRequest && !isSwitchingChain}
        blockScrollOnMount={false}
      >
        <ModalOverlay bg="none" backdropFilter="auto" backdropBlur="5px" />
        <ModalContent
          bg="bg.900"
          color="white"
          maxW={{
            base: "90%",
            sm: "30rem",
            md: "40rem",
          }}
          zIndex="1400"
        >
          <ModalHeader borderBottomWidth="1px" borderColor="whiteAlpha.200">
            Session Request
          </ModalHeader>
          <ModalCloseButton isDisabled={pendingRequest || isSwitchingChain} />
          <ModalBody>
            {currentSessionRequest && (
              <VStack spacing={4} align="stretch">
                <Box>
                  <Text fontWeight="bold">Method:</Text>
                  <Code
                    p={2}
                    borderRadius="md"
                    fontSize="md"
                    width="100%"
                    bg="whiteAlpha.200"
                    color="white"
                  >
                    {currentSessionRequest.params.request.method}
                  </Code>
                </Box>

                {/* Transaction Request */}
                {currentSessionRequest.params.request.method ===
                  "eth_sendTransaction" && (
                  <Box
                    p={3}
                    borderWidth={1}
                    borderRadius="md"
                    bg="whiteAlpha.100"
                    borderColor="whiteAlpha.300"
                  >
                    <Heading size="sm" mb={2} color="white">
                      Transaction Details
                    </Heading>
                    <VStack spacing={1} align="stretch">
                      <Flex justifyContent="space-between">
                        <Text fontWeight="bold" color="white">
                          To:
                        </Text>
                        <Text color="white">
                          {currentSessionRequest.params.request.params[0].to}
                        </Text>
                      </Flex>
                      {currentSessionRequest.params.request.params[0].value && (
                        <Flex justifyContent="space-between">
                          <Text fontWeight="bold" color="white">
                            Value:
                          </Text>
                          <Text color="white">
                            {formatEther(
                              BigInt(
                                currentSessionRequest.params.request.params[0]
                                  .value
                              )
                            )}{" "}
                            ETH
                          </Text>
                        </Flex>
                      )}
                      {currentSessionRequest.params.request.params[0].gas && (
                        <Flex justifyContent="space-between">
                          <Text fontWeight="bold" color="white">
                            Gas Limit:
                          </Text>
                          <Text color="white">
                            {BigInt(
                              currentSessionRequest.params.request.params[0].gas
                            ).toString()}
                          </Text>
                        </Flex>
                      )}

                      {currentSessionRequest.params.request.params[0].data && (
                        <Box
                          mt={4}
                          pt={3}
                          borderTopWidth={1}
                          borderTopColor="whiteAlpha.300"
                        >
                          <Flex justifyContent="space-between" mb={2}>
                            <Text fontWeight="bold" color="white">
                              Transaction Data:
                            </Text>
                            {isDecodingTx && (
                              <Text fontSize="sm" color="whiteAlpha.700">
                                Decoding...
                              </Text>
                            )}
                          </Flex>

                          <Tabs
                            variant="soft-rounded"
                            colorScheme="blue"
                            size="sm"
                          >
                            <TabList mb={3}>
                              <Tab>Decoded</Tab>
                              <Tab>Raw</Tab>
                            </TabList>
                            <TabPanels>
                              <TabPanel p={0}>
                                {isDecodingTx ? (
                                  <Box
                                    p={4}
                                    bg="whiteAlpha.100"
                                    borderRadius="md"
                                  >
                                    <SkeletonText
                                      mt={2}
                                      noOfLines={2}
                                      spacing={4}
                                      skeletonHeight="4"
                                    />
                                    <Skeleton height="20px" mt={4} />
                                    <Skeleton height="20px" mt={2} />
                                    <SkeletonText
                                      mt={4}
                                      noOfLines={3}
                                      spacing={4}
                                      skeletonHeight="4"
                                    />
                                  </Box>
                                ) : decodedTxData ? (
                                  <Box>
                                    {decodedTxData.functionName && (
                                      <Flex
                                        justifyContent="space-between"
                                        mb={3}
                                        p={2}
                                        bg="blue.800"
                                        borderRadius="md"
                                      >
                                        <Text fontWeight="bold" color="white">
                                          Function:
                                        </Text>
                                        <Text
                                          color="white"
                                          fontFamily="monospace"
                                        >
                                          {decodedTxData.functionName}
                                        </Text>
                                      </Flex>
                                    )}
                                    <Box
                                      bg="whiteAlpha.100"
                                      borderRadius="md"
                                      p={3}
                                      maxH="300px"
                                      overflowY="auto"
                                      overflowX="hidden"
                                      sx={{
                                        "::-webkit-scrollbar": {
                                          w: "8px",
                                        },
                                        "::-webkit-scrollbar-track": {
                                          bg: "whiteAlpha.100",
                                          rounded: "md",
                                        },
                                        "::-webkit-scrollbar-thumb": {
                                          bg: "whiteAlpha.300",
                                          rounded: "md",
                                        },
                                        "& > div > div": {
                                          maxWidth: "100%",
                                        },
                                        ".uint-select-container": {
                                          position: "relative",
                                          zIndex: 9999,
                                        },
                                        ".chakra-react-select": {
                                          zIndex: 9999,
                                        },
                                        ".chakra-react-select__menu": {
                                          zIndex: 9999,
                                          position: "absolute !important",
                                        },
                                      }}
                                      position="relative"
                                    >
                                      <Stack spacing={4} width="100%">
                                        {decodedTxData.args.map(
                                          (arg: any, i: number) => {
                                            const chainIdStr =
                                              currentSessionRequest.params.chainId.split(
                                                ":"
                                              )[1];
                                            const chainIdNum =
                                              parseInt(chainIdStr);
                                            return renderParams(
                                              i,
                                              arg,
                                              chainIdNum
                                            );
                                          }
                                        )}
                                      </Stack>
                                    </Box>
                                  </Box>
                                ) : (
                                  <Text
                                    color="whiteAlpha.700"
                                    fontStyle="italic"
                                    p={2}
                                  >
                                    Could not decode transaction data
                                  </Text>
                                )}
                              </TabPanel>
                              <TabPanel p={0}>
                                <Box
                                  p={3}
                                  bg="whiteAlpha.100"
                                  borderRadius="md"
                                  maxH="300px"
                                  overflowY="auto"
                                  overflowX="hidden"
                                  sx={{
                                    "::-webkit-scrollbar": {
                                      w: "8px",
                                    },
                                    "::-webkit-scrollbar-track": {
                                      bg: "whiteAlpha.100",
                                      rounded: "md",
                                    },
                                    "::-webkit-scrollbar-thumb": {
                                      bg: "whiteAlpha.300",
                                      rounded: "md",
                                    },
                                    "& > div > div": {
                                      maxWidth: "100%",
                                    },
                                  }}
                                >
                                  <Code
                                    p={2}
                                    borderRadius="md"
                                    fontSize="sm"
                                    width="100%"
                                    whiteSpace="pre-wrap"
                                    bg="transparent"
                                    color="white"
                                    fontFamily="monospace"
                                  >
                                    {
                                      currentSessionRequest.params.request
                                        .params[0].data
                                    }
                                  </Code>
                                </Box>
                              </TabPanel>
                            </TabPanels>
                          </Tabs>
                        </Box>
                      )}
                    </VStack>
                  </Box>
                )}

                {/* Message Signing Request (personal_sign or eth_sign) */}
                {(currentSessionRequest.params.request.method ===
                  "personal_sign" ||
                  currentSessionRequest.params.request.method === "eth_sign") &&
                  decodedSignatureData?.type === "message" && (
                    <Box
                      p={3}
                      borderWidth={1}
                      borderRadius="md"
                      bg="whiteAlpha.100"
                      borderColor="whiteAlpha.300"
                    >
                      <Heading size="sm" mb={2} color="white">
                        Message to Sign
                      </Heading>

                      <Tabs variant="soft-rounded" colorScheme="blue" size="sm">
                        <TabList mb={3}>
                          <Tab>Decoded</Tab>
                          <Tab>Raw</Tab>
                        </TabList>
                        <TabPanels>
                          <TabPanel p={0}>
                            <Box
                              p={3}
                              borderRadius="md"
                              bg="whiteAlpha.200"
                              whiteSpace="pre-wrap"
                              wordBreak="break-word"
                              fontSize="sm"
                            >
                              {decodedSignatureData.decoded.decoded}
                              {decodedSignatureData.decoded.type !==
                                "unknown" && (
                                <Badge ml={2} colorScheme="blue" fontSize="xs">
                                  {decodedSignatureData.decoded.type}
                                </Badge>
                              )}
                            </Box>
                          </TabPanel>
                          <TabPanel p={0}>
                            <Code
                              p={2}
                              borderRadius="md"
                              fontSize="sm"
                              width="100%"
                              whiteSpace="pre-wrap"
                              wordBreak="break-word"
                              bg="whiteAlpha.200"
                              color="white"
                            >
                              {currentSessionRequest.params.request.method ===
                              "personal_sign"
                                ? currentSessionRequest.params.request.params[0]
                                : currentSessionRequest.params.request
                                    .params[1]}
                            </Code>
                          </TabPanel>
                        </TabPanels>
                      </Tabs>
                    </Box>
                  )}

                {/* Typed Data Signing Request */}
                {(currentSessionRequest.params.request.method ===
                  "eth_signTypedData" ||
                  currentSessionRequest.params.request.method ===
                    "eth_signTypedData_v3" ||
                  currentSessionRequest.params.request.method ===
                    "eth_signTypedData_v4") &&
                  decodedSignatureData?.type === "typedData" && (
                    <Box
                      p={3}
                      borderWidth={1}
                      borderRadius="md"
                      bg="whiteAlpha.100"
                      borderColor="whiteAlpha.300"
                    >
                      <Heading size="sm" mb={2} color="white">
                        Typed Data to Sign
                      </Heading>

                      <Tabs variant="soft-rounded" colorScheme="blue" size="sm">
                        <TabList mb={3}>
                          <Tab>Formatted</Tab>
                          <Tab>Raw</Tab>
                        </TabList>
                        <TabPanels>
                          <TabPanel p={0}>
                            {decodedSignatureData.decoded ? (
                              <VStack spacing={3} align="stretch">
                                {/* Domain Section */}
                                <Box>
                                  <Text fontWeight="bold" fontSize="sm">
                                    Domain:
                                  </Text>
                                  <Code
                                    p={2}
                                    borderRadius="md"
                                    fontSize="xs"
                                    width="100%"
                                    whiteSpace="pre-wrap"
                                    wordBreak="break-word"
                                    bg="whiteAlpha.200"
                                    color="white"
                                  >
                                    {JSON.stringify(
                                      decodedSignatureData.decoded.domain,
                                      null,
                                      2
                                    )}
                                  </Code>
                                </Box>

                                {/* Primary Type */}
                                <Box>
                                  <Text fontWeight="bold" fontSize="sm">
                                    Primary Type:
                                  </Text>
                                  <Badge colorScheme="purple">
                                    {decodedSignatureData.decoded.primaryType}
                                  </Badge>
                                </Box>

                                {/* Message Data */}
                                <Box>
                                  <Text fontWeight="bold" fontSize="sm">
                                    Message:
                                  </Text>
                                  <Code
                                    p={2}
                                    borderRadius="md"
                                    fontSize="xs"
                                    width="100%"
                                    whiteSpace="pre-wrap"
                                    wordBreak="break-word"
                                    bg="whiteAlpha.200"
                                    color="white"
                                  >
                                    {JSON.stringify(
                                      decodedSignatureData.decoded.message,
                                      null,
                                      2
                                    )}
                                  </Code>
                                </Box>

                                {/* Types */}
                                <Box>
                                  <Text fontWeight="bold" fontSize="sm">
                                    Types:
                                  </Text>
                                  <Accordion allowToggle>
                                    {Object.entries(
                                      decodedSignatureData.decoded.types || {}
                                    ).map(([typeName, typeProps]) => (
                                      <AccordionItem
                                        key={typeName}
                                        border="none"
                                        mb={1}
                                      >
                                        <AccordionButton
                                          bg="whiteAlpha.200"
                                          borderRadius="md"
                                          _hover={{ bg: "whiteAlpha.300" }}
                                        >
                                          <Box
                                            flex="1"
                                            textAlign="left"
                                            fontWeight="medium"
                                          >
                                            {typeName}
                                          </Box>
                                          <AccordionIcon />
                                        </AccordionButton>
                                        <AccordionPanel
                                          pb={4}
                                          bg="whiteAlpha.100"
                                          borderRadius="md"
                                          mt={1}
                                        >
                                          <Code
                                            p={2}
                                            borderRadius="md"
                                            fontSize="xs"
                                            width="100%"
                                            whiteSpace="pre-wrap"
                                            wordBreak="break-word"
                                            bg="transparent"
                                            color="white"
                                          >
                                            {JSON.stringify(typeProps, null, 2)}
                                          </Code>
                                        </AccordionPanel>
                                      </AccordionItem>
                                    ))}
                                  </Accordion>
                                </Box>
                              </VStack>
                            ) : (
                              <Text color="red.300">
                                Failed to decode typed data
                              </Text>
                            )}
                          </TabPanel>
                          <TabPanel p={0}>
                            <Code
                              p={2}
                              borderRadius="md"
                              fontSize="sm"
                              width="100%"
                              whiteSpace="pre-wrap"
                              wordBreak="break-word"
                              bg="whiteAlpha.200"
                              color="white"
                            >
                              {JSON.stringify(
                                currentSessionRequest.params.request.params[1],
                                null,
                                2
                              )}
                            </Code>
                          </TabPanel>
                        </TabPanels>
                      </Tabs>
                    </Box>
                  )}

                {/* For other request types, show raw params */}
                {![
                  "eth_sendTransaction",
                  "personal_sign",
                  "eth_sign",
                  "eth_signTypedData",
                  "eth_signTypedData_v3",
                  "eth_signTypedData_v4",
                ].includes(currentSessionRequest.params.request.method) && (
                  <Box>
                    <Text fontWeight="bold">Params:</Text>
                    <Code
                      p={2}
                      borderRadius="md"
                      fontSize="md"
                      width="100%"
                      whiteSpace="pre-wrap"
                      bg="whiteAlpha.200"
                      color="white"
                    >
                      {JSON.stringify(
                        currentSessionRequest.params.request.params,
                        null,
                        2
                      )}
                    </Code>
                  </Box>
                )}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter borderTopWidth="1px" borderColor="whiteAlpha.200">
            <Button
              colorScheme="red"
              mr={3}
              onClick={() => handleSessionRequest(false)}
              isDisabled={pendingRequest || isSwitchingChain}
            >
              Reject
            </Button>

            {needsChainSwitch && targetChainId ? (
              <Button
                colorScheme="orange"
                onClick={handleChainSwitch}
                isLoading={isSwitchingChain}
                loadingText="Switching..."
              >
                Switch to{" "}
                {chainIdToChain[targetChainId]?.name ||
                  `Chain ID: ${targetChainId}`}
              </Button>
            ) : (
              <Button
                colorScheme="blue"
                onClick={() => handleSessionRequest(true)}
                isLoading={pendingRequest}
                loadingText="Processing..."
                isDisabled={needsChainSwitch || isSwitchingChain}
              >
                Approve
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
}
