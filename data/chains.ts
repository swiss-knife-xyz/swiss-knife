import {
  mainnet,
  arbitrum,
  arbitrumSepolia,
  avalanche,
  base,
  baseSepolia,
  bsc,
  citreaTestnet,
  gnosis,
  linea,
  ink,
  monadTestnet,
  optimism,
  polygon,
  pulsechain,
  sei,
  seiTestnet,
  sepolia,
  soneium,
  sonic,
  unichain,
  zora,
  Chain,
} from "wagmi/chains";
import {
  plasma,
  megaeth,
  citrea,
  monad,
  robinhood,
  chainIdToChain,
} from "./common";

const preferredWalletChains: readonly [Chain, ...Chain[]] = [
  // first chain is the default
  mainnet,
  base,
  robinhood,
  arbitrum,
  avalanche,
  bsc,
  citrea,
  gnosis,
  ink,
  megaeth,
  monad,
  optimism,
  polygon,
  sei,
  unichain,
  zora,
  // no icon
  plasma,
  pulsechain,
  soneium,
  sonic,
  // testnets
  seiTestnet,
  sepolia,
  arbitrumSepolia,
  baseSepolia,
  citreaTestnet,
  monadTestnet,
];

// Keep the familiar wallet ordering while allowing switches to every network
// available in the shared tool selectors.
export const walletChains: readonly [Chain, ...Chain[]] = [
  ...preferredWalletChains,
  ...Object.values(chainIdToChain).filter(
    (chain) =>
      !preferredWalletChains.some((preferred) => preferred.id === chain.id)
  ),
];
