import { useEffect } from "react";
import { WalletKitInstance } from "../types";

interface ChainNotifierProps {
  walletKit: WalletKitInstance | null;
  isConnected: boolean;
  chainId: number | undefined;
  activeSessions: any[];
}

export default function ChainNotifier({
  walletKit,
  isConnected,
  chainId,
  activeSessions,
}: ChainNotifierProps) {
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

  return null;
}
