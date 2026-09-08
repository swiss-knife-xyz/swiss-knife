import { useEffect } from "react";
import { Core } from "@walletconnect/core";
import { WalletKit } from "@reown/walletkit";
import { useToast } from "@chakra-ui/react";
import { WalletKitInstance } from "../types";
import { filterActiveSessions } from "../utils";

interface WalletKitInitializerProps {
  isConnected: boolean;
  address: string | undefined;
  setWalletKit: (walletKit: WalletKitInstance) => void;
  setActiveSessions: (sessions: any[]) => void;
  setIsInitializing: (isInitializing: boolean) => void;
  isInitializing: boolean;
}

export default function WalletKitInitializer({
  isConnected,
  address,
  setWalletKit,
  setActiveSessions,
  setIsInitializing,
  isInitializing,
}: WalletKitInitializerProps) {
  const toast = useToast();

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
            name: "ETH.sh Wallet",
            description: "A simple wallet for WalletConnect",
            url: "https://eth.sh",
            icons: ["https://eth.sh/icon.png"],
          },
        });

        setWalletKit(kit);

        // Load existing sessions
        const sessions = kit.getActiveSessions();
        setActiveSessions(filterActiveSessions(Object.values(sessions)));

        setIsInitializing(false);
      } catch (error) {
        console.error("Failed to initialize WalletKit:", error);
        toast({
          title: "Failed to initialize WalletKit",
          description: (error as Error).message,
          status: "error",
          duration: 5000,
          isClosable: true,
          position: "bottom-right",
        });
        setIsInitializing(false);
      }
    };

    initializeWalletKit();
  }, [
    isConnected,
    address,
    toast,
    setWalletKit,
    setActiveSessions,
    setIsInitializing,
  ]);

  return null;
}
