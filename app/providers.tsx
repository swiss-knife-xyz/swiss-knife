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
  fantom,
  gnosis,
  goerli,
  linea,
  optimism,
  polygon,
  polygonMumbai,
  sepolia,
  zora,
  Chain,
} from "wagmi/chains";

const chains: readonly [Chain, ...Chain[]] = [
  // first chain is the default
  mainnet,
  arbitrum,
  arbitrumSepolia,
  avalanche,
  base,
  baseSepolia,
  bsc,
  fantom,
  gnosis,
  goerli,
  optimism,
  polygon,
  polygonMumbai,
  sepolia,
  zora,
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
        walletConnectWallet,
        rainbowWallet,
        safeWallet,
      ],
    },
  ],
  { appName, projectId }
);

export const config = createConfig({
  connectors,
  chains,
  transports: chains.reduce<Record<number, ReturnType<typeof http>>>(
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
          <RainbowKitProvider
            theme={darkTheme()}
            modalSize={"compact"}
            coolMode={true}
          >
            {children}
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ChakraProvider>
  );
};
