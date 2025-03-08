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
} from "@chakra-ui/react";
import { ConnectButton } from "@/components/ConnectButton/ConnectButton";
import { Core } from "@walletconnect/core";
import { WalletKit } from "@reown/walletkit";
import { useAccount, useWalletClient } from "wagmi";
import { formatEther, parseEther } from "viem";
import { walletChains } from "@/app/providers";

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

export default function WalletSimplePage() {
  const toast = useToast();
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  // State for WalletConnect
  const [uri, setUri] = useState<string>("");
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
      onSessionProposalOpen();
    };

    // Handle session request
    const onSessionRequest = (request: SessionRequest) => {
      console.log("Session request received:", request);
      setCurrentSessionRequest(request);
      onSessionRequestOpen();
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
      const supportedChainIds = walletChains.map((chain) => chain.id);

      // Add support for common testnet chains that might not be in walletChains
      // These are the chains Aave is requesting in the example
      const additionalSupportedChainIds = [
        43113, // Avalanche Fuji Testnet
        84532, // Base Sepolia
        421614, // Arbitrum Sepolia
        534351, // Scroll Sepolia
        11155111, // Sepolia
        11155420, // Optimism Sepolia
      ];

      const allSupportedChainIds = [
        ...supportedChainIds,
        ...additionalSupportedChainIds,
      ];

      // Create namespaces object
      const namespaces: Record<string, any> = {};

      // Process both required and optional namespaces
      const allNamespaces = {
        ...currentSessionProposal.params.requiredNamespaces,
        ...currentSessionProposal.params.optionalNamespaces,
      };

      // For each namespace (e.g., 'eip155')
      Object.entries(allNamespaces).forEach(([namespace, nsValue]) => {
        if (namespace === "eip155") {
          // Filter chains to only include supported ones
          const supportedChains = nsValue.chains.filter((chainStr) => {
            // Extract chain ID from the chain string (e.g., "eip155:1" -> 1)
            const chainId = parseInt(chainStr.split(":")[1]);
            return allSupportedChainIds.includes(chainId);
          });

          if (supportedChains.length > 0) {
            // Format accounts as "eip155:chainId:address"
            const accounts = supportedChains.map(
              (chain) => `${chain}:${address}`
            );

            namespaces[namespace] = {
              accounts,
              methods: nsValue.methods,
              events: nsValue.events,
            };
          }
        }
      });

      console.log("Approving session with namespaces:", namespaces);

      // Check if namespaces is empty or doesn't have any accounts
      if (
        Object.keys(namespaces).length === 0 ||
        !Object.values(namespaces).some(
          (ns) => ns.accounts && ns.accounts.length > 0
        )
      ) {
        throw new Error("No supported chains found in the request");
      }

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

  // Handle session request (like eth_sendTransaction)
  const handleSessionRequest = useCallback(
    async (approve: boolean) => {
      if (!walletKit || !currentSessionRequest || !walletClient) return;

      try {
        const { id, topic, params } = currentSessionRequest;
        const { request } = params;

        if (approve) {
          let result;

          // Handle different request methods
          if (request.method === "eth_sendTransaction") {
            const txParams = request.params[0];

            // Send transaction using wagmi wallet client
            const hash = await walletClient.sendTransaction({
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
              message: { raw: message as `0x${string}` },
            });

            result = signature;
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
            description: `Method: ${request.method}`,
            status: "info",
            duration: 3000,
            isClosable: true,
          });
        }

        onSessionRequestClose();
        setCurrentSessionRequest(null);
      } catch (error) {
        console.error("Failed to handle session request:", error);
        toast({
          title: "Failed to handle request",
          description: (error as Error).message,
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
      onSessionRequestClose,
      toast,
    ]
  );

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

  return (
    <Container maxW="container.lg" py={8}>
      <VStack spacing={8} align="stretch">
        <Flex justifyContent="space-between" alignItems="center">
          <Heading size="lg">WalletConnect Simple</Heading>
          <ConnectButton />
        </Flex>

        {!isConnected ? (
          <Box p={6} borderWidth={1} borderRadius="lg" textAlign="center">
            <Text mb={4}>Please connect your wallet to use WalletConnect</Text>
            <ConnectButton />
          </Box>
        ) : isInitializing ? (
          <Box p={6} borderWidth={1} borderRadius="lg" textAlign="center">
            <Spinner size="xl" mb={4} />
            <Text>Initializing WalletKit...</Text>
          </Box>
        ) : (
          <>
            <Box p={6} borderWidth={1} borderRadius="lg">
              <Heading size="md" mb={4}>
                Connect to dApp
              </Heading>
              <VStack spacing={4}>
                <Input
                  placeholder="Enter WalletConnect URI (wc:...)"
                  value={uri}
                  onChange={(e) => setUri(e.target.value)}
                />
                <Button
                  colorScheme="blue"
                  width="100%"
                  onClick={connectToDapp}
                  isDisabled={!uri || !uri.startsWith("wc:")}
                >
                  Connect
                </Button>
              </VStack>
            </Box>

            <Box p={6} borderWidth={1} borderRadius="lg">
              <Heading size="md" mb={4}>
                Active Sessions ({activeSessions.length})
              </Heading>
              {activeSessions.length === 0 ? (
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
                      <HStack wrap="wrap" spacing={2}>
                        {Object.entries(session.namespaces).map(
                          ([key, value]: [string, any]) => (
                            <Badge key={key} colorScheme="blue">
                              {key}
                            </Badge>
                          )
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
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Session Proposal</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {currentSessionProposal && (
              <VStack spacing={4} align="stretch">
                <Flex alignItems="center">
                  {currentSessionProposal.params.proposer.metadata.icons && (
                    <Box
                      as="img"
                      src={
                        currentSessionProposal.params.proposer.metadata.icons[0]
                      }
                      alt={currentSessionProposal.params.proposer.metadata.name}
                      boxSize="48px"
                      borderRadius="md"
                      mr={4}
                    />
                  )}
                  <Box>
                    <Heading size="md">
                      {currentSessionProposal.params.proposer.metadata.name}
                    </Heading>
                    <Text fontSize="sm" color="gray.600">
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
                      <Box key={key} p={3} borderWidth={1} borderRadius="md">
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
          <ModalFooter>
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
        onClose={onSessionRequestClose}
        isCentered
        size="lg"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Session Request</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {currentSessionRequest && (
              <VStack spacing={4} align="stretch">
                <Box>
                  <Text fontWeight="bold">Method:</Text>
                  <Code p={2} borderRadius="md" fontSize="md" width="100%">
                    {currentSessionRequest.params.request.method}
                  </Code>
                </Box>

                <Box>
                  <Text fontWeight="bold">Chain ID:</Text>
                  <Code p={2} borderRadius="md" fontSize="md">
                    {currentSessionRequest.params.chainId}
                  </Code>
                </Box>

                <Box>
                  <Text fontWeight="bold">Params:</Text>
                  <Code
                    p={2}
                    borderRadius="md"
                    fontSize="md"
                    width="100%"
                    whiteSpace="pre-wrap"
                  >
                    {JSON.stringify(
                      currentSessionRequest.params.request.params,
                      null,
                      2
                    )}
                  </Code>
                </Box>

                {currentSessionRequest.params.request.method ===
                  "eth_sendTransaction" && (
                  <Box p={3} borderWidth={1} borderRadius="md" bg="gray.50">
                    <Heading size="sm" mb={2}>
                      Transaction Details
                    </Heading>
                    <VStack spacing={1} align="stretch">
                      <Flex justifyContent="space-between">
                        <Text fontWeight="bold">To:</Text>
                        <Text>
                          {currentSessionRequest.params.request.params[0].to}
                        </Text>
                      </Flex>
                      {currentSessionRequest.params.request.params[0].value && (
                        <Flex justifyContent="space-between">
                          <Text fontWeight="bold">Value:</Text>
                          <Text>
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
                          <Text fontWeight="bold">Gas Limit:</Text>
                          <Text>
                            {BigInt(
                              currentSessionRequest.params.request.params[0].gas
                            ).toString()}
                          </Text>
                        </Flex>
                      )}
                    </VStack>
                  </Box>
                )}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="red"
              mr={3}
              onClick={() => handleSessionRequest(false)}
            >
              Reject
            </Button>
            <Button
              colorScheme="blue"
              onClick={() => handleSessionRequest(true)}
            >
              Approve
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
}
