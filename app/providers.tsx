"use client";

import { ChakraProvider } from "@chakra-ui/react";
import theme from "@/style/theme";
import "@rainbow-me/rainbowkit/styles.css";

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
} from "@rainbow-me/rainbowkit/wallets";
import { configureChains, createConfig, WagmiConfig } from "wagmi";
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
} from "wagmi/chains";
import { publicProvider } from "wagmi/providers/public";

const { chains, publicClient } = configureChains(
  // the first chain is used by rainbowKit to determine which chain to use
  [
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
  ],
  [publicProvider()]
);

const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID!;
const connectors = connectorsForWallets([
  {
    groupName: "Recommended",
    wallets: [
      metaMaskWallet({ projectId, chains }),
      walletConnectWallet({ projectId, chains }),
      rainbowWallet({ projectId, chains }),
      safeWallet({ chains, allowedDomains: [/./s] }),
    ],
  },
]);

export const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
});

export const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <ChakraProvider theme={theme}>
      <WagmiConfig config={wagmiConfig}>
        <RainbowKitProvider
          chains={chains}
          theme={darkTheme()}
          modalSize={"compact"}
          coolMode={true}
        >
          {children}
        </RainbowKitProvider>
      </WagmiConfig>
    </ChakraProvider>
  );
};
