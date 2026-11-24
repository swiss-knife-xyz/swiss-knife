"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { CustomChainsProvider } from "@/contexts/CustomChainsProvider";
import { useCustomChains } from "@/lib/customChains/store";
import { chainIdToChain, networks } from "@/data/networks";
import { ChakraProvider } from "@chakra-ui/react";
import theme from "@/style/theme";
import { toastOptions } from "@/components/Toast";
import "@rainbow-me/rainbowkit/styles.css";
import { AppProgressProvider as ProgressProvider } from "@bprogress/next";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig } from "wagmi";
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
import { getLiveRpcTransport } from "@/lib/rpcTransport";
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

const walletTransports = Object.fromEntries(
  walletChains.map((chain) => [chain.id, getLiveRpcTransport(chain.id)])
);
export const config = createConfig({
  connectors: [frameConnector(), ...connectors],
  chains: walletChains,
  transports: walletTransports,
});

const queryClient = new QueryClient();

function SyncCustomWalletChains() {
  const saved = useCustomChains();
  useEffect(() => {
    if (!saved.ready) return;
    const ids = [
      ...new Set([
        ...walletChains.map((chain) => chain.id),
        ...networks.map((chain) => chain.id),
      ]),
    ];
    const chains = ids.flatMap((id) =>
      chainIdToChain[id] ? [chainIdToChain[id]] : []
    ) as typeof walletChains;
    for (const chain of chains)
      walletTransports[chain.id] = getLiveRpcTransport(chain.id);
    walletChains.splice(0, walletChains.length, ...chains);
    config._internal.chains.setState(chains);
    if (saved.revision > 0) void queryClient.invalidateQueries();
  }, [saved.ready, saved.revision]);
  return null;
}
export const Providers = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  // Storage frames must not initialize application providers or recursively create more frames.
  return pathname === "/_storage" ? (
    children
  ) : (
    <ToolProviders>{children}</ToolProviders>
  );
};
const ToolProviders = ({ children }: { children: React.ReactNode }) => {
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
              <CustomChainsProvider>
                <SyncCustomWalletChains />
                <AddressBookProvider>
                  <NuqsAdapter>{children}</NuqsAdapter>
                  <ModalComponent />
                  <ImpersonatorFloatingButton />
                  <AddressBookDrawer />
                  <AddressBookSelector />
                </AddressBookProvider>
              </CustomChainsProvider>
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </ChakraProvider>
    </ProgressProvider>
  );
};
