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
  Button,
  Center,
} from "@chakra-ui/react";
import { Global } from "@emotion/react";
import frameSdk, { Context } from "@farcaster/frame-sdk";
import { useAccount, useWalletClient, useChainId, useSwitchChain } from "wagmi";
import { base } from "viem/chains";
import { buildApprovedNamespaces } from "@walletconnect/utils";
import { createPublicClient, http } from "viem";
import {
  publicActionsL1,
  publicActionsL2,
  walletActionsL1,
  getL2TransactionHashes,
} from "viem/op-stack";
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
import ForceInclusionProgress from "./components/ForceInclusionProgress";
import { filterActiveSessions } from "./utils";
import { isOPStackChain, getL1ChainForL2 } from "./opstack-utils";

export default function WalletBridgePage() {
  const toast = useToast();
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();

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

  // Force inclusion state
  const [forceInclusionEnabled, setForceInclusionEnabled] =
    useState<boolean>(false);
  const [isOPStackTransaction, setIsOPStackTransaction] =
    useState<boolean>(false);
  const [forceInclusionProgress, setForceInclusionProgress] = useState<{
    isOpen: boolean;
    status:
      | "building"
      | "submitting"
      | "waiting-l1"
      | "waiting-l2"
      | "complete"
      | "error";
    l1Hash?: string;
    l2Hash?: string;
    error?: string;
    l1ChainId?: number;
    l2ChainId?: number;
    elapsedTime?: number;
    depositArgs?: any;
    gasLimit?: bigint;
    isGasEditable?: boolean;
    gasEstimationFailed?: boolean;
  }>({
    isOpen: false,
    status: "building",
  });

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

            // Extract chain ID
            const chainIdStr = params.chainId.split(":")[1];
            const l2ChainId = parseInt(chainIdStr);

            // Check if force inclusion is enabled for OP Stack chains
            if (forceInclusionEnabled && isOPStackChain(l2ChainId)) {
              // Close the request modal
              onSessionRequestClose();

              // Open force inclusion progress modal
              const l1ChainId = getL1ChainForL2(l2ChainId);
              if (!l1ChainId) {
                throw new Error("Could not determine L1 chain for this L2");
              }

              setForceInclusionProgress({
                isOpen: true,
                status: "building",
                l1ChainId,
                l2ChainId,
              });

              try {
                // Create L2 public client
                const l2Chain = chainIdToChain[l2ChainId];
                const publicClientL2 = createPublicClient({
                  chain: l2Chain,
                  transport: http(),
                }).extend(publicActionsL2());

                // Build deposit transaction
                setForceInclusionProgress((prev) => ({
                  ...prev,
                  status: "building",
                }));

                // Determine gas limit with proper estimation
                let gasLimit: bigint;
                let gasEstimationFailed = false;

                if (txParams.gas) {
                  // Use provided gas if available
                  gasLimit = BigInt(txParams.gas);
                } else {
                  // Try to estimate gas with 10% buffer
                  try {
                    const estimatedGas = await publicClientL2.estimateGas({
                      account: address as `0x${string}`,
                      to: txParams.to as `0x${string}`,
                      value: txParams.value ? BigInt(txParams.value) : 0n,
                      data: (txParams.data as `0x${string}`) || "0x",
                    });
                    // Add 10% buffer to estimated gas
                    gasLimit = (estimatedGas * BigInt(110)) / BigInt(100);
                  } catch (error) {
                    console.warn(
                      "Gas estimation failed, using fallback:",
                      error
                    );
                    // Use 8M as fallback but mark as editable
                    gasLimit = BigInt(8_000_000);
                    gasEstimationFailed = true;
                  }
                }

                // Update state with gas info
                setForceInclusionProgress((prev) => ({
                  ...prev,
                  gasLimit,
                  isGasEditable: gasEstimationFailed,
                  gasEstimationFailed,
                }));

                const depositArgs =
                  await publicClientL2.buildDepositTransaction({
                    mint: txParams.value ? BigInt(txParams.value) : 0n,
                    to: txParams.to as `0x${string}`,
                    data: (txParams.data as `0x${string}`) || "0x",
                    gas: gasLimit,
                    account: address as `0x${string}`,
                  });

                // Save deposit args for potential retry
                setForceInclusionProgress((prev) => ({
                  ...prev,
                  depositArgs,
                }));

                // Switch to L1 chain if needed
                setForceInclusionProgress((prev) => ({
                  ...prev,
                  status: "submitting",
                }));

                // Do both
                await switchChainAsync({ chainId: l1ChainId });
                await walletClient.switchChain({ id: l1ChainId });

                // Create L1 wallet client
                const l1Chain = chainIdToChain[l1ChainId];
                const publicClientL1 = createPublicClient({
                  chain: l1Chain,
                  transport: http(),
                }).extend(publicActionsL1());

                // Submit to L1
                setForceInclusionProgress((prev) => ({
                  ...prev,
                  status: "submitting",
                }));

                const l1Hash = await walletClient
                  .extend(walletActionsL1())
                  .depositTransaction({ ...depositArgs, chain: l1Chain });

                setForceInclusionProgress((prev) => ({
                  ...prev,
                  l1Hash,
                  status: "waiting-l1",
                }));

                // Wait for L1 receipt
                const l1Receipt =
                  await publicClientL1.waitForTransactionReceipt({
                    hash: l1Hash,
                  });

                // Get L2 hash
                const [l2Hash] = getL2TransactionHashes(l1Receipt);

                if (!l2Hash) {
                  throw new Error(
                    "Could not extract L2 transaction hash from L1 receipt"
                  );
                }

                // Switch back to L2 chain automatically
                try {
                  await switchChainAsync({ chainId: l2ChainId });
                  await walletClient.switchChain({ id: l2ChainId });
                } catch (error) {
                  console.warn("Failed to switch back to L2 chain:", error);
                  toast({
                    title: "Chain Switch",
                    description: `Please manually switch back to ${
                      chainIdToChain[l2ChainId]?.name || "L2"
                    } in your wallet`,
                    status: "warning",
                    duration: 7000,
                    isClosable: true,
                    position: "bottom-right",
                  });
                  // Don't fail the whole process if chain switch fails
                }

                // Update with L2 hash and move to waiting-l2 status
                setForceInclusionProgress((prev) => ({
                  ...prev,
                  l2Hash,
                  status: "waiting-l2",
                }));

                // Store result for early return option
                result = l2Hash;

                // Start elapsed time tracking
                const startTime = Date.now();
                let intervalId: NodeJS.Timeout | null = null;

                try {
                  intervalId = setInterval(() => {
                    setForceInclusionProgress((prev) => ({
                      ...prev,
                      elapsedTime: Math.floor((Date.now() - startTime) / 1000),
                    }));
                  }, 1000);

                  // Wait for L2 confirmation (with timeout)
                  await publicClientL2.waitForTransactionReceipt({
                    hash: l2Hash,
                    timeout: 10 * 60_000, // 10 minutes
                  });

                  // Capture final elapsed time before clearing interval
                  const finalElapsedTime = Math.floor(
                    (Date.now() - startTime) / 1000
                  );

                  clearInterval(intervalId);
                  intervalId = null;

                  setForceInclusionProgress((prev) => ({
                    ...prev,
                    status: "complete",
                    elapsedTime: finalElapsedTime,
                  }));
                } catch (error) {
                  if (intervalId) {
                    clearInterval(intervalId);
                    intervalId = null;
                  }
                  // If timeout or error, still consider it success since L2 hash is valid
                  // Preserve the elapsed time at timeout
                  console.warn("L2 receipt timeout or error:", error);
                  setForceInclusionProgress((prev) => ({
                    ...prev,
                    status: "complete",
                    // Keep the existing elapsedTime from prev
                  }));
                }
              } catch (error) {
                console.error("Force inclusion error:", error);

                // Extract concise error message using viem's error handling
                let errorMessage = "An unknown error occurred";
                if (error && typeof error === "object") {
                  try {
                    // Try to extract the most user-friendly error message
                    const viemError = error as any;
                    if (viemError.walk) {
                      const specificError = viemError.walk(
                        (err: any) => err?.shortMessage || err?.message
                      );
                      if (specificError) {
                        errorMessage =
                          specificError.shortMessage ||
                          specificError.message ||
                          String(specificError);
                      }
                    } else if (viemError.shortMessage) {
                      errorMessage = viemError.shortMessage;
                    } else if (viemError.message) {
                      errorMessage = viemError.message;
                    }

                    // Clean up common prefixes
                    errorMessage = errorMessage
                      .replace(/^(Error:|ContractFunctionRevertedError:)/, "")
                      .trim();
                  } catch (walkError) {
                    console.error("Error extracting error message:", walkError);
                  }
                }

                setForceInclusionProgress((prev) => ({
                  ...prev,
                  status: "error",
                  error: errorMessage,
                }));

                // Don't throw - we want to handle this gracefully
                return;
              }
            } else {
              // Normal transaction (not force inclusion)
              const hash = await walletClient.sendTransaction({
                account: address as `0x${string}`,
                to: txParams.to as `0x${string}`,
                value: txParams.value ? BigInt(txParams.value) : undefined,
                data: txParams.data as `0x${string}` | undefined,
                gas: txParams.gas ? BigInt(txParams.gas) : undefined,
              });

              result = hash;
            }
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
            const typedDataRaw = request.params[1]; // The typed data is usually the second parameter

            // Parse JSON if it's a string
            const typedData =
              typeof typedDataRaw === "string"
                ? JSON.parse(typedDataRaw)
                : typedDataRaw;

            // Infer primaryType if not provided (some dApps don't include it)
            let primaryType = typedData.primaryType;
            if (!primaryType && typedData.types) {
              const typeNames = Object.keys(typedData.types).filter(
                (t) => t !== "EIP712Domain"
              );
              if (typeNames.length === 1) {
                primaryType = typeNames[0];
              } else if (typeNames.length > 1 && typedData.message) {
                // Try to find the type that matches the message structure
                primaryType =
                  typeNames.find((typeName) => {
                    const typeFields = typedData.types[typeName];
                    return typeFields?.every(
                      (field: { name: string }) => field.name in typedData.message
                    );
                  }) || typeNames[0];
              }
            }

            // Remove EIP712Domain from types (viem adds it internally)
            const { EIP712Domain, ...typesWithoutDomain } = typedData.types || {};

            const signature = await walletClient.signTypedData({
              account: address as `0x${string}`,
              domain: typedData.domain,
              types: typesWithoutDomain,
              primaryType: primaryType,
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
          try {
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
          } catch {}

          toast({
            title: "Request rejected",
            status: "info",
            duration: 3000,
            isClosable: true,
            position: "bottom-right",
          });
        }

        // Close the modal and reset state
        onSessionRequestClose();
        setCurrentSessionRequest(null);
        setForceInclusionEnabled(false);
      } catch (error) {
        console.error("Error handling session request:", error);
        setPendingRequest(false);
        setIsSwitchingChain(false);
        setNeedsChainSwitch(false);
        setForceInclusionEnabled(false);
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
      forceInclusionEnabled,
    ]
  );

  // Custom close handler for session request modal
  const handleSessionRequestClose = useCallback(() => {
    // Reset force inclusion state when closing modal
    setForceInclusionEnabled(false);

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
      // Note: Only transactions require chain switching. Message signing operations
      // (personal_sign, eth_sign, eth_signTypedData*) are chain-agnostic.
      const requiresChainSwitch =
        chainId !== requestedChainId &&
        (request.method === "eth_sendTransaction" ||
          request.method === "eth_signTransaction");

      setNeedsChainSwitch(requiresChainSwitch);
      setTargetChainId(requiresChainSwitch ? requestedChainId : null);

      // Check if this is an OP Stack transaction
      setIsOPStackTransaction(
        request.method === "eth_sendTransaction" &&
          isOPStackChain(requestedChainId)
      );
    } else {
      setNeedsChainSwitch(false);
      setTargetChainId(null);
      setIsOPStackTransaction(false);
    }
  }, [currentSessionRequest, chainId]);

  // Handler for early return of L2 hash
  const handleEarlyReturn = useCallback(async () => {
    if (!walletKit || !currentSessionRequest || !forceInclusionProgress.l2Hash)
      return;

    try {
      const { id, topic } = currentSessionRequest;
      const result = forceInclusionProgress.l2Hash;

      // Respond to the request with L2 hash
      await walletKit.respondSessionRequest({
        topic,
        response: {
          id,
          jsonrpc: "2.0",
          result,
        },
      });

      toast({
        title: "L2 Hash Returned",
        description:
          "Transaction hash sent to dApp. L2 confirmation will continue in background.",
        status: "info",
        duration: 5000,
        isClosable: true,
        position: "bottom-right",
      });

      // Keep progress modal open but allow closing
      setForceInclusionProgress((prev) => ({
        ...prev,
        isOpen: true,
      }));
    } catch (error) {
      console.error("Error returning early:", error);
      toast({
        title: "Error",
        description: "Failed to return transaction hash to dApp",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom-right",
      });
    }
  }, [walletKit, currentSessionRequest, forceInclusionProgress.l2Hash, toast]);

  // Handler for retrying force inclusion after error
  const handleForceInclusionRetry = useCallback(async () => {
    const { depositArgs, l1ChainId, l2ChainId } = forceInclusionProgress;

    if (
      !depositArgs ||
      !l1ChainId ||
      !l2ChainId ||
      !walletClient ||
      !walletKit ||
      !currentSessionRequest
    ) {
      console.error("Missing data for retry");
      return;
    }

    try {
      // Reset to submitting status
      setForceInclusionProgress((prev) => ({
        ...prev,
        status: "submitting",
        error: undefined,
      }));

      // Create L1 and L2 clients
      const l1Chain = chainIdToChain[l1ChainId];
      const l2Chain = chainIdToChain[l2ChainId];
      const publicClientL1 = createPublicClient({
        chain: l1Chain,
        transport: http(),
      }).extend(publicActionsL1());
      const publicClientL2 = createPublicClient({
        chain: l2Chain,
        transport: http(),
      }).extend(publicActionsL2());

      // Ensure we're on L1 chain
      await switchChainAsync({ chainId: l1ChainId });
      await walletClient.switchChain({ id: l1ChainId });

      // Submit to L1
      const l1Hash = await walletClient
        .extend(walletActionsL1())
        .depositTransaction({ ...depositArgs, chain: l1Chain });

      setForceInclusionProgress((prev) => ({
        ...prev,
        l1Hash,
        status: "waiting-l1",
      }));

      // Wait for L1 receipt
      const l1Receipt = await publicClientL1.waitForTransactionReceipt({
        hash: l1Hash,
      });

      // Get L2 hash
      const [l2Hash] = getL2TransactionHashes(l1Receipt);

      if (!l2Hash) {
        throw new Error(
          "Could not extract L2 transaction hash from L1 receipt"
        );
      }

      // Switch back to L2 chain automatically
      try {
        await switchChainAsync({ chainId: l2ChainId });
        await walletClient.switchChain({ id: l2ChainId });
      } catch (error) {
        console.warn("Failed to switch back to L2 chain:", error);
        toast({
          title: "Chain Switch",
          description: `Please manually switch back to ${
            chainIdToChain[l2ChainId]?.name || "L2"
          } in your wallet`,
          status: "warning",
          duration: 7000,
          isClosable: true,
          position: "bottom-right",
        });
      }

      // Update with L2 hash and move to waiting-l2 status
      setForceInclusionProgress((prev) => ({
        ...prev,
        l2Hash,
        status: "waiting-l2",
      }));

      // Store result for potential early return
      const result = l2Hash;

      // Start elapsed time tracking
      const startTime = Date.now();
      let intervalId: NodeJS.Timeout | null = null;

      try {
        intervalId = setInterval(() => {
          setForceInclusionProgress((prev) => ({
            ...prev,
            elapsedTime: Math.floor((Date.now() - startTime) / 1000),
          }));
        }, 1000);

        // Wait for L2 confirmation (with timeout)
        await publicClientL2.waitForTransactionReceipt({
          hash: l2Hash,
          timeout: 10 * 60_000, // 10 minutes
        });

        // Capture final elapsed time before clearing interval
        const finalElapsedTime = Math.floor((Date.now() - startTime) / 1000);

        clearInterval(intervalId);
        intervalId = null;

        setForceInclusionProgress((prev) => ({
          ...prev,
          status: "complete",
          elapsedTime: finalElapsedTime,
        }));
      } catch (error) {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
        // If timeout or error, still consider it success since L2 hash is valid
        console.warn("L2 receipt timeout or error:", error);
        setForceInclusionProgress((prev) => ({
          ...prev,
          status: "complete",
        }));
      }

      // Respond to WalletConnect request
      const { id, topic } = currentSessionRequest;
      await walletKit.respondSessionRequest({
        topic,
        response: {
          id,
          jsonrpc: "2.0",
          result,
        },
      });

      toast({
        title: "Transaction complete",
        status: "success",
        duration: 5000,
        isClosable: true,
        position: "bottom-right",
      });
    } catch (error) {
      console.error("Retry force inclusion error:", error);

      // Extract concise error message
      let errorMessage = "An unknown error occurred";
      if (error && typeof error === "object") {
        try {
          const viemError = error as any;
          if (viemError.walk) {
            const specificError = viemError.walk(
              (err: any) => err?.shortMessage || err?.message
            );
            if (specificError) {
              errorMessage =
                specificError.shortMessage ||
                specificError.message ||
                String(specificError);
            }
          } else if (viemError.shortMessage) {
            errorMessage = viemError.shortMessage;
          } else if (viemError.message) {
            errorMessage = viemError.message;
          }

          errorMessage = errorMessage
            .replace(/^(Error:|ContractFunctionRevertedError:)/, "")
            .trim();
        } catch (walkError) {
          console.error("Error extracting error message:", walkError);
        }
      }

      setForceInclusionProgress((prev) => ({
        ...prev,
        status: "error",
        error: errorMessage,
      }));
    }
  }, [
    forceInclusionProgress,
    walletClient,
    walletKit,
    currentSessionRequest,
    switchChainAsync,
    toast,
  ]);

  // Handler for updating gas limit
  const handleGasLimitUpdate = useCallback(
    async (newGasLimit: bigint) => {
      const { l2ChainId } = forceInclusionProgress;
      const txParams = currentSessionRequest?.params.request.params[0];

      if (!l2ChainId || !txParams || !address) {
        console.error("Missing data for gas limit update");
        return;
      }

      try {
        // Rebuild deposit transaction with new gas limit
        const l2Chain = chainIdToChain[l2ChainId];
        const publicClientL2 = createPublicClient({
          chain: l2Chain,
          transport: http(),
        }).extend(publicActionsL2());

        const depositArgs = await publicClientL2.buildDepositTransaction({
          mint: txParams.value ? BigInt(txParams.value) : 0n,
          to: txParams.to as `0x${string}`,
          data: (txParams.data as `0x${string}`) || "0x",
          gas: newGasLimit,
          account: address as `0x${string}`,
        });

        // Update state with new gas limit and deposit args
        setForceInclusionProgress((prev) => ({
          ...prev,
          gasLimit: newGasLimit,
          depositArgs,
        }));
      } catch (error) {
        console.error("Error rebuilding deposit transaction:", error);
        toast({
          title: "Error updating gas limit",
          description: "Failed to rebuild transaction with new gas limit",
          status: "error",
          duration: 5000,
          isClosable: true,
          position: "bottom-right",
        });
      }
    },
    [forceInclusionProgress, currentSessionRequest, address, toast]
  );

  // Handler for closing force inclusion modal with rejection
  const handleForceInclusionClose = useCallback(async () => {
    const isError = forceInclusionProgress.status === "error";
    const l2ChainId = forceInclusionProgress.l2ChainId;

    // Switch back to L2 chain if we're in error state and have the chain ID
    if (isError && l2ChainId && walletClient) {
      try {
        await switchChainAsync({ chainId: l2ChainId });
        await walletClient.switchChain({ id: l2ChainId });
      } catch (error) {
        console.warn("Failed to switch back to L2 chain:", error);
        // Don't block the flow if chain switch fails
      }
    }

    // Close the modal
    setForceInclusionProgress((prev) => ({ ...prev, isOpen: false }));

    // If there was an error and we haven't sent a response yet, reject the request
    if (isError && walletKit && currentSessionRequest) {
      try {
        const { id, topic } = currentSessionRequest;
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

        // Clean up state
        setCurrentSessionRequest(null);
        setForceInclusionEnabled(false);
        onSessionRequestClose();
      } catch (error) {
        console.error("Error rejecting request:", error);
      }
    }
  }, [
    forceInclusionProgress.status,
    forceInclusionProgress.l2ChainId,
    walletKit,
    walletClient,
    currentSessionRequest,
    switchChainAsync,
    toast,
    onSessionRequestClose,
  ]);

  return (
    <Box w="full">
      {/* Banner for Web3 App Store */}
      <Center>
        <Box
          w="full"
          maxW={{ base: "100%", md: "80%" }}
          bg="blue.600"
          color="white"
          py={{ base: 2, md: 3 }}
          px={{ base: 1, md: 4 }}
          textAlign="center"
          borderBottomWidth={2}
          borderBottomColor="blue.700"
          rounded={"lg"}
        >
          <Flex
            direction={{ base: "column", md: "row" }}
            justifyContent="center"
            alignItems="center"
            gap={{ base: 3, md: 4 }}
          >
            <Text
              fontWeight="semibold"
              fontSize={{ base: "sm", md: "md" }}
              lineHeight="1.2"
            >
              New! Check out the Web3 App Store
            </Text>
            <Button
              as="a"
              href="https://apps.eth.sh/"
              size={{ base: "sm", md: "sm" }}
              bg="whiteAlpha.200"
              color="white"
              border="1px solid rgba(255, 255, 255, 0.3)"
              _hover={{
                bg: "whiteAlpha.300",
              }}
              _active={{
                bg: "whiteAlpha.400",
              }}
              display="inline-flex"
              alignItems="center"
              justifyContent="center"
              whiteSpace="nowrap"
              minW={{ base: "100px", md: "fit-content" }}
              px={{ base: 2, md: 4 }}
              py={{ base: 1, md: 2 }}
              borderRadius="md"
              fontSize={{ base: "xs", md: "sm" }}
              fontWeight="medium"
              minH={{ base: "22px", md: "auto" }}
            >
              Explore Apps
            </Button>
          </Flex>
        </Box>
      </Center>

      <Container
        mt={8}
        maxW="1400px"
        px={{ base: 4, sm: 4, md: 6 }}
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
            <Heading size={{ base: "xl", md: "xl" }}>Wallet Bridge</Heading>
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
          forceInclusionEnabled={forceInclusionEnabled}
          onForceInclusionToggle={setForceInclusionEnabled}
          isOPStackTransaction={isOPStackTransaction}
        />

        {/* Force Inclusion Progress Modal */}
        <ForceInclusionProgress
          isOpen={forceInclusionProgress.isOpen}
          onClose={handleForceInclusionClose}
          l1ChainId={forceInclusionProgress.l1ChainId || 1}
          l2ChainId={forceInclusionProgress.l2ChainId || 1}
          l1Hash={forceInclusionProgress.l1Hash}
          l2Hash={forceInclusionProgress.l2Hash}
          status={forceInclusionProgress.status}
          error={forceInclusionProgress.error}
          elapsedTime={forceInclusionProgress.elapsedTime}
          gasLimit={forceInclusionProgress.gasLimit}
          isGasEditable={forceInclusionProgress.isGasEditable}
          gasEstimationFailed={forceInclusionProgress.gasEstimationFailed}
          onReturnEarly={handleEarlyReturn}
          onRetry={handleForceInclusionRetry}
          onGasLimitUpdate={handleGasLimitUpdate}
        />
      </Container>
    </Box>
  );
}
