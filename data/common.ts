import {
  mainnet,
  arbitrum,
  arbitrumGoerli,
  arbitrumNova,
  arbitrumSepolia,
  avalanche,
  avalancheFuji,
  aurora,
  base,
  baseGoerli,
  baseSepolia,
  berachain,
  bitTorrent,
  bitTorrentTestnet,
  blast,
  blastSepolia,
  boba,
  bsc,
  bscTestnet,
  canto,
  celo,
  celoAlfajores,
  confluxESpace,
  cronos,
  cronosTestnet,
  dfk,
  dogechain,
  evmos,
  fantom,
  fantomTestnet,
  filecoin,
  fraxtal,
  fraxtalTestnet,
  fuse,
  gnosis,
  goerli,
  harmonyOne,
  holesky,
  iotex,
  klaytn,
  kroma,
  kromaSepolia,
  linea,
  lineaTestnet,
  manta,
  mantaTestnet,
  mantle,
  metis,
  moonbaseAlpha,
  moonbeam,
  moonriver,
  okc,
  opBNB,
  opBNBTestnet,
  optimism,
  optimismGoerli,
  optimismSepolia,
  polygon,
  polygonMumbai,
  polygonZkEvm,
  polygonZkEvmTestnet,
  ronin,
  scroll,
  scrollSepolia,
  sei,
  seiTestnet,
  sepolia,
  sonic,
  taikoJolnir,
  taikoTestnetSepolia,
  telos,
  wanchain,
  wemix,
  wemixTestnet,
  zkSync,
  zkSyncSepoliaTestnet,
  zora,
  zoraTestnet,
  Chain,
  unichain,
  ink,
  worldchain,
} from "viem/chains";
import { _chains } from "./_chains";

import { defineChain } from "viem";

// === New chains ===
// to avoid Upgrading viem + wagmi, as it results in breaking changes atm.
// source: https://github.com/wevm/viem/tree/main/src/chains/definitions
export const plasma = defineChain({
  id: 9745,
  name: "Plasma",
  nativeCurrency: {
    name: "Plasma",
    symbol: "XPL",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.plasma.to"],
    },
  },
  blockExplorers: {
    default: {
      name: "PlasmaScan",
      url: "https://plasmascan.to",
    },
  },
});
export const monad = defineChain({
  id: 143,
  name: "Monad",
  blockTime: 400,
  nativeCurrency: {
    name: "Monad",
    symbol: "MON",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.monad.xyz", "https://rpc1.monad.xyz"],
      webSocket: ["wss://rpc.monad.xyz", "wss://rpc1.monad.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "MonadVision",
      url: "https://monadvision.com",
    },
    monadscan: {
      name: "Monadscan",
      url: "https://monadscan.com",
      apiUrl: "https://api.monadscan.com/api",
    },
  },
  testnet: false,
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
      blockCreated: 9248132,
    },
  },
});

export const megaeth = defineChain({
  id: 4326,
  name: "MegaETH",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://mainnet.megaeth.com/rpc"],
    },
  },
  blockExplorers: {
    default: {
      name: "MegaETH Explorer",
      url: "https://mega.etherscan.io",
    },
  },
  testnet: false,
});

export const CHAINLABEL_KEY = "$SK_CHAINLABEL";
export const ADDRESS_KEY = "$SK_ADDRESS";
export const TX_KEY = "$SK_TX";

export const c: { [name: string]: Chain } = {
  mainnet: {
    ...mainnet,
  },
  sepolia: {
    ...sepolia,
    rpcUrls: { default: { http: ["https://sepolia.gateway.tenderly.co"] } }, // add custom rpcs. cloudflare doesn't support publicClient.getTransaction
  },
  arbitrum,
  arbitrumGoerli,
  arbitrumNova,
  arbitrumSepolia,
  avalanche,
  avalancheFuji,
  aurora,
  base,
  baseGoerli,
  baseSepolia,
  berachain,
  bitTorrent,
  bitTorrentTestnet,
  blast,
  blastSepolia,
  boba,
  bsc,
  bscTestnet,
  canto,
  celo,
  celoAlfajores,
  confluxESpace,
  cronos,
  cronosTestnet,
  dfk,
  dogechain,
  evmos,
  fantom,
  fantomTestnet,
  filecoin,
  fraxtal,
  fraxtalTestnet,
  fuse,
  gnosis,
  goerli,
  harmonyOne,
  holesky,
  iotex,
  klaytn,
  kroma,
  kromaSepolia,
  linea,
  lineaTestnet,
  manta,
  mantaTestnet,
  mantle,
  megaeth,
  metis,
  monad,
  moonbaseAlpha,
  moonbeam,
  moonriver,
  okc,
  opBNB,
  opBNBTestnet,
  optimism,
  optimismGoerli,
  optimismSepolia,
  plasma,
  polygon,
  polygonMumbai,
  polygonZkEvm,
  polygonZkEvmTestnet,
  ronin,
  scroll,
  scrollSepolia,
  sei,
  seiTestnet,
  sonic,
  taikoJolnir,
  taikoTestnetSepolia,
  telos,
  wanchain,
  wemix,
  wemixTestnet,
  worldchain,
  zkSync,
  zkSyncSepoliaTestnet,
  zora,
  zoraTestnet,
};

// Extended Chain type to include optional Routescan flag
type ExtendedChain = Chain & { isRoutescan?: boolean };

// source: https://docs.etherscan.io/etherscan-v2/getting-started/supported-chains
export const etherscanChains: { [name: string]: ExtendedChain } = {
  mainnet,
  arbitrum,
  arbitrumNova,
  arbitrumSepolia,
  avalanche,
  avalancheFuji,
  base,
  baseSepolia,
  bitTorrent,
  bitTorrentTestnet,
  blast,
  blastSepolia,
  bsc,
  bscTestnet,
  celo,
  celoAlfajores,
  cronos,
  cronosTestnet,
  fantom,
  fantomTestnet,
  fraxtal,
  fraxtalTestnet,
  gnosis,
  holesky,
  kroma,
  kromaSepolia,
  linea,
  lineaTestnet,
  mantle,
  manta,
  megaeth,
  moonbeam,
  moonriver,
  moonbaseAlpha,
  opBNB,
  opBNBTestnet,
  optimism,
  optimismSepolia,
  plasma: { ...plasma, isRoutescan: true },
  polygon,
  polygonMumbai,
  polygonZkEvm,
  polygonZkEvmTestnet,
  scroll,
  scrollSepolia,
  sei,
  seiTestnet,
  sepolia,
  taikoJolnir,
  taikoTestnetSepolia,
  wemix,
  wemixTestnet,
  zkSync,
  zkSyncSepoliaTestnet,
  // xai,
  // xaiTestnet,
};

// TODO: these should be placed in provider and memoized
export const chainIdToChain = (() => {
  let res: {
    [chainId: number]: Chain;
  } = {};

  Object.values(c).map((chain) => {
    res[chain.id] = chain;

    // Override mainnet RPC URL with env variable if available
    if (chain.id === mainnet.id && process.env.NEXT_PUBLIC_MAINNET_RPC_URL) {
      res[chain.id] = {
        ...chain,
        rpcUrls: {
          ...chain.rpcUrls,
          default: {
            http: [process.env.NEXT_PUBLIC_MAINNET_RPC_URL],
          },
        },
      };
    }
  });

  return res;
})();

// TODO: these should be placed in provider and memoized
export const erc3770ShortNameToChain = (() => {
  let res: {
    [shortName: string]: Chain;
  } = {};

  Object.entries(c).forEach(([key, chain]) => {
    const chainInfo = _chains.find(
      (c: { chainId: number; shortName: string }) => c.chainId === chain.id
    );

    if (chainInfo) {
      res[chainInfo.shortName] = chain;
    }
  });

  return res;
})();

// TODO: these should be placed in provider and memoized
export const chainIdToImage = (() => {
  const basePath = "/chainIcons";

  let res: {
    [chainId: number]: string;
  } = {
    // source: https://github.com/rainbow-me/rainbowkit/tree/main/packages/rainbowkit/src/components/RainbowKitProvider/chainIcons
    [arbitrum.id]: `${basePath}/arbitrum.svg`,
    [avalanche.id]: `${basePath}/avalanche.svg`,
    [base.id]: `${basePath}/base.svg`,
    [berachain.id]: `${basePath}/berachain.svg`,
    [bsc.id]: `${basePath}/bsc.svg`,
    [cronos.id]: `${basePath}/cronos.svg`,
    [goerli.id]: `${basePath}/ethereum.svg`,
    [ink.id]: `${basePath}/ink.svg`,
    [mainnet.id]: `${basePath}/ethereum.svg`,
    [megaeth.id]: `${basePath}/megaeth.svg`,
    [monad.id]: `${basePath}/monad.svg`,
    [optimism.id]: `${basePath}/optimism.svg`,
    [sei.id]: `${basePath}/sei.svg`,
    [seiTestnet.id]: `${basePath}/sei.svg`,
    [polygon.id]: `${basePath}/polygon.svg`,
    [sepolia.id]: `${basePath}/ethereum.svg`,
    [unichain.id]: `${basePath}/unichain.svg`,
    [worldchain.id]: `${basePath}/worldchain.svg`,
    [48900]: `${basePath}/zircuit.svg`, // Zircuit
    [zora.id]: `${basePath}/zora.svg`,
  };

  Object.keys(chainIdToChain).map((_chainId) => {
    const chainId = Number(_chainId);

    if (!res[chainId]) {
      res[chainId] =
        `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&size=128&url=${chainIdToChain[chainId].blockExplorers?.default.url}`;
    }
  });

  return res;
})();

export const networkOptions: { label: string; value: number }[] = Object.keys(
  c
).map((k, i) => ({
  label: c[k].name,
  value: c[k].id,
}));
