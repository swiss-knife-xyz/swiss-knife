import { useEffect } from "react";
import { useToast } from "@chakra-ui/react";
import { decodeRecursive } from "@/lib/decoder";
import { SessionProposal, SessionRequest, WalletKitInstance } from "../types";
import { decodeSignMessage, formatTypedData } from "../utils";
import { buildApprovedNamespaces } from "@walletconnect/utils";
import { walletChains } from "@/app/providers";

interface WalletKitEventHandlerProps {
  walletKit: WalletKitInstance | null;
  address: string | undefined;
  setCurrentSessionProposal: (proposal: SessionProposal | null) => void;
  setCurrentSessionRequest: (request: SessionRequest | null) => void;
  setDecodedTxData: (data: any) => void;
  setIsDecodingTx: (isDecoding: boolean) => void;
  setDecodedSignatureData: (data: any) => void;
  setActiveSessions: (sessions: any[]) => void;
  onSessionProposalOpen: () => void;
  onSessionRequestOpen: () => void;
}

export default function WalletKitEventHandler({
  walletKit,
  address,
  setCurrentSessionProposal,
  setCurrentSessionRequest,
  setDecodedTxData,
  setIsDecodingTx,
  setDecodedSignatureData,
  setActiveSessions,
  onSessionProposalOpen,
  onSessionRequestOpen,
}: WalletKitEventHandlerProps) {
  const toast = useToast();

  // Set up event listeners for WalletKit
  useEffect(() => {
    if (!walletKit) return;

    // Handle session proposal
    const onSessionProposal = (
      args: { verifyContext: any } & Omit<any, "topic">
    ) => {
      // Convert the args to our SessionProposal type
      const proposal = args as unknown as SessionProposal;
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
    const onSessionRequest = async (
      args: { verifyContext: any } & Omit<any, "topic">
    ) => {
      // Convert the args to our SessionRequest type
      const request = args as unknown as SessionRequest;
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
  }, [
    walletKit,
    address,
    setCurrentSessionProposal,
    setCurrentSessionRequest,
    setDecodedTxData,
    setIsDecodingTx,
    setDecodedSignatureData,
    setActiveSessions,
    onSessionProposalOpen,
    onSessionRequestOpen,
    toast,
  ]);

  return null;
}
