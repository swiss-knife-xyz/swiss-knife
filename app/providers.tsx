"use client";

import { ChakraProvider } from "@chakra-ui/react";
import theme from "@/style/theme";
import "@rainbow-me/rainbowkit/styles.css";
import { AppProgressProvider as ProgressProvider } from "@bprogress/next";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, WagmiProvider, createConfig } from "wagmi";
import {
  getDefaultConfig,
  RainbowKitProvider,
  darkTheme,
  connectorsForWallets,
} from "@rainbow-me/rainbowkit";

import {
  metaMaskWallet,
  walletConnectWallet,
  rainbowWallet,
  safeWallet,
  coinbaseWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { frameConnector } from "@/utils/frameConnector";
import {
  impersonatorWallet,
  useImpersonatorModal,
  ImpersonatorFloatingButton,
} from "@/utils/impersonatorConnector";
import { walletChains } from "@/data/chains";
export { walletChains };

const appName = "Swiss-Knife.xyz";
const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID!;

// Create a global variable to store the modal opener function
let globalOpenImpersonatorModal: (() => Promise<any>) | null = null;

const connectors = connectorsForWallets(
  [
    {
      groupName: "Popular",
      wallets: [
        impersonatorWallet({
          openModal: () => {
            if (!globalOpenImpersonatorModal) {
              throw new Error("Impersonator modal not initialized");
            }
            return globalOpenImpersonatorModal();
          },
        }),
        metaMaskWallet,
        coinbaseWallet,
        // Use WalletConnect with a custom storage prefix
        // This is to prevent clashes with our walletkit in wallet/bridge.
        ({ projectId }) =>
          walletConnectWallet({
            projectId,
            options: {
              customStoragePrefix: "rainbowkit-client-role-",
            },
          }),
        rainbowWallet,
        safeWallet,
      ],
    },
  ],
  { appName, projectId }
);

export const config = createConfig({
  connectors: [frameConnector(), ...connectors],
  chains: walletChains,
  transports: walletChains.reduce<Record<number, ReturnType<typeof http>>>(
    (transport, chain) => {
      transport[chain.id] = http();
      return transport;
    },
    {}
  ),
});

const queryClient = new QueryClient();

export const Providers = ({ children }: { children: React.ReactNode }) => {
  // Set up impersonator modal hook
  const { openModal, ModalComponent } = useImpersonatorModal();

  // Set the global modal opener function
  globalOpenImpersonatorModal = openModal;

  return (
    <ProgressProvider
      height="2px"
      color="#e84142"
      options={{ showSpinner: false }}
      shallowRouting
    >
      <ChakraProvider theme={theme}>
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider theme={darkTheme()} modalSize={"compact"}>
              {children}
              <ModalComponent />
              <ImpersonatorFloatingButton />
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </ChakraProvider>
    </ProgressProvider>
  );
};
