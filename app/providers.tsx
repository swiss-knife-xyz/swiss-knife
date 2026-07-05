"use client";

import { ChakraProvider, type ToastProviderProps } from "@chakra-ui/react";
import theme from "@/style/theme";
import { EthToast } from "@/components/EthToast";
import "@rainbow-me/rainbowkit/styles.css";
import { AppProgressProvider as ProgressProvider } from "@bprogress/next";
import { NuqsAdapter } from "nuqs/adapters/next/app";

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
import { AddressBookProvider } from "@/contexts/AddressBookContext";
import {
  AddressBookDrawer,
  AddressBookSelector,
} from "@/components/AddressBook";
import { getRpcUrlForChain } from "@/data/common";
export { walletChains };

const appName = "ETH.sh";
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
      transport[chain.id] = http(getRpcUrlForChain(chain.id));
      return transport;
    },
    {}
  ),
});

const queryClient = new QueryClient();
const toastOptions = {
  defaultOptions: {
    position: "bottom-right",
    duration: 6000,
    isClosable: true,
    toastComponent: EthToast,
    containerStyle: {
      maxWidth: "min(560px, calc(100vw - 32px))",
      minWidth: "auto",
    },
  } as ToastProviderProps["defaultOptions"] & {
    toastComponent: typeof EthToast;
  },
} satisfies ToastProviderProps;

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
      <ChakraProvider theme={theme} toastOptions={toastOptions}>
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider theme={darkTheme()} modalSize={"compact"}>
              <AddressBookProvider>
                <NuqsAdapter>{children}</NuqsAdapter>
                <ModalComponent />
                <ImpersonatorFloatingButton />
                <AddressBookDrawer />
                <AddressBookSelector />
              </AddressBookProvider>
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </ChakraProvider>
    </ProgressProvider>
  );
};
