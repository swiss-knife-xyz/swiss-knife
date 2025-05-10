"use client";

import { ChakraProvider } from "@chakra-ui/react";
import theme from "@/style/theme";
import "@rainbow-me/rainbowkit/styles.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, WagmiProvider, createConfig } from "wagmi";
import {
  connectorsForWallets,
  RainbowKitProvider,
  darkTheme,
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
  mainnet,
  arbitrum,
  arbitrumSepolia,
  avalanche,
  base,
  baseSepolia,
  bsc,
  canto,
  evmos,
  gnosis,
  linea,
  monadTestnet,
  optimism,
  polygon,
  polygonMumbai,
  pulsechain,
  sepolia,
  sonic,
  unichain,
  zora,
  Chain,
} from "wagmi/chains";

export const walletChains: readonly [Chain, ...Chain[]] = [
  // first chain is the default
  base,
  mainnet,
  arbitrum,
  avalanche,
  bsc,
  gnosis,
  optimism,
  polygon,
  pulsechain,
  sonic,
  unichain,
  zora,
  // testnets
  sepolia,
  arbitrumSepolia,
  baseSepolia,
  monadTestnet,
  polygonMumbai,
];

const appName = "Swiss-Knife.xyz";
const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID!;

const connectors = connectorsForWallets(
  [
    {
      groupName: "Popular",
      wallets: [
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
  return (
    <ChakraProvider theme={theme}>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider theme={darkTheme()} modalSize={"compact"}>
            {children}
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ChakraProvider>
  );
};
