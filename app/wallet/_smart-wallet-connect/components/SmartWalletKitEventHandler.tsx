import { useEffect } from "react";
import { useToast } from "@chakra-ui/react";
import { decodeRecursive } from "@/lib/decoder";
import {
  SessionProposal,
  SessionRequest,
  WalletKitInstance,
} from "../../bridge/types";
import {
  decodeSignMessage,
  filterActiveSessions,
  formatTypedData,
} from "../../bridge/utils";
import { buildApprovedNamespaces } from "@walletconnect/utils";
import { walletChains } from "@/app/providers";
import type { SmartWalletConfig } from "../types";

interface SmartWalletKitEventHandlerProps {
  config: SmartWalletConfig;
  walletKit: WalletKitInstance | null;
  address: string | undefined;
  walletAddress: string;
  setCurrentSessionProposal: (proposal: SessionProposal | null) => void;
  setCurrentSessionRequest: (request: SessionRequest | null) => void;
  setDecodedTxData: (data: any) => void;
  setIsDecodingTx: (isDecoding: boolean) => void;
  setDecodedSignatureData: (data: any) => void;
  setActiveSessions: (sessions: any[]) => void;
  onSessionProposalOpen: () => void;
  onSessionRequestOpen: () => void;
}

export default function SmartWalletKitEventHandler({
  config,
  walletKit,
  address,
  walletAddress,
  setCurrentSessionProposal,
  setCurrentSessionRequest,
  setDecodedTxData,
  setIsDecodingTx,
  setDecodedSignatureData,
  setActiveSessions,
  onSessionProposalOpen,
  onSessionRequestOpen,
}: SmartWalletKitEventHandlerProps) {
  const toast = useToast();

  useEffect(() => {
    if (!walletKit) return;

    const onSessionProposal = (
      args: { verifyContext: any } & Omit<any, "topic">
    ) => {
      const proposal = args as unknown as SessionProposal;
      console.log("Session proposal received:", proposal);
      console.log("Required namespaces:", proposal.params.requiredNamespaces);
      console.log("Optional namespaces:", proposal.params.optionalNamespaces);
      setCurrentSessionProposal(proposal);

      // Auto-approve the session proposal using the smart wallet address
      // instead of the connected wagmi (EOA) address.
      if (walletKit && address && walletAddress) {
        // Defer to next tick so that state updates have a chance to settle.
        setTimeout(async () => {
          try {
            const chains = walletChains.map((chain) => `eip155:${chain.id}`);
            const accounts = chains.map((chain) => `${chain}:${walletAddress}`);

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

            console.log(
              `Auto-approving session with ${config.shortName} namespaces:`,
              namespaces
            );

            await walletKit.approveSession({
              id: proposal.id,
              namespaces,
            });

            const sessions = walletKit.getActiveSessions();
            setActiveSessions(filterActiveSessions(Object.values(sessions)));

            toast({
              title: `Dapp connected to ${config.shortName}`,
              status: "success",
              duration: 3000,
              isClosable: true,
              position: "bottom-right",
            });
          } catch (error) {
            console.error("Failed to auto-approve session:", error);

            // Fall back to manual approval via modal.
            onSessionProposalOpen();

            toast({
              title: "Auto-approval failed",
              description: (error as Error).message,
              status: "error",
              duration: 5000,
              isClosable: true,
              position: "bottom-right",
            });
          }
        }, 100);
      } else {
        onSessionProposalOpen();
      }
    };

    const onSessionRequest = async (
      args: { verifyContext: any } & Omit<any, "topic">
    ) => {
      const request = args as unknown as SessionRequest;
      console.log("Session request received:", request);
      setCurrentSessionRequest(request);

      setDecodedTxData(null);
      setDecodedSignatureData(null);

      startTitleNotification();

      onSessionRequestOpen();

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
      } else if (
        request.params.request.method === "personal_sign" ||
        request.params.request.method === "eth_sign"
      ) {
        try {
          // For personal_sign, the message is the first parameter.
          // For eth_sign, the message is the second parameter (first is address).
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
      } else if (
        request.params.request.method === "eth_signTypedData" ||
        request.params.request.method === "eth_signTypedData_v3" ||
        request.params.request.method === "eth_signTypedData_v4"
      ) {
        try {
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

    const onSessionPing = (data: any) => {
      console.log("ping", data);
    };

    const onSessionDelete = (data: any) => {
      console.log("session_delete event received", data);
      const sessions = walletKit.getActiveSessions();
      setActiveSessions(filterActiveSessions(Object.values(sessions)));
    };

    const startTitleNotification = () => {
      const originalTitle = document.title;
      const notificationTitle = "🔔 (1) Request - Swiss Knife";
      let isOriginalTitle = false;

      const titleInterval = setInterval(() => {
        document.title = isOriginalTitle ? notificationTitle : originalTitle;
        isOriginalTitle = !isOriginalTitle;
      }, 500);

      const stopTitleNotification = () => {
        clearInterval(titleInterval);
        document.title = originalTitle;
      };

      window.addEventListener("focus", stopTitleNotification, { once: true });
      setTimeout(stopTitleNotification, 5 * 60 * 1000);
    };

    walletKit.on("session_proposal", onSessionProposal);
    walletKit.on("session_request", onSessionRequest);
    walletKit.on("session_delete", onSessionDelete);
    walletKit.engine.signClient.events.on("session_ping", onSessionPing);

    return () => {
      walletKit.off("session_proposal", onSessionProposal);
      walletKit.off("session_request", onSessionRequest);
      walletKit.off("session_delete", onSessionDelete);
      walletKit.engine.signClient.events.off("session_ping", onSessionPing);
    };
  }, [
    walletKit,
    address,
    walletAddress,
    config,
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
