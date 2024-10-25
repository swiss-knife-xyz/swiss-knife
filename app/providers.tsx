"use client";

import { CacheProvider } from "@chakra-ui/next-js";
import { ChakraProvider } from "@chakra-ui/react";
import theme from "@/style/theme";
import "@rainbow-me/rainbowkit/styles.css";

import {
  getDefaultConfig,
  RainbowKitProvider,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";

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

const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID!;

export const wagmiConfig = getDefaultConfig({
  appName: "Swiss-Knife.xyz",
  projectId,
  chains:
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
});

export const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <CacheProvider>
      <ChakraProvider theme={theme}>
        <WagmiProvider config={wagmiConfig}>
          <RainbowKitProvider
            theme={darkTheme()}
            modalSize={"compact"}
            coolMode={true}
          >
            {children}
          </RainbowKitProvider>
        </WagmiProvider>
      </ChakraProvider>
    </CacheProvider>
  );
};
