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
  bitTorrent,
  bitTorrentTestnet,
  // TODO: upgrade package and add these chains:
  // blast,
  // blastTestnet,
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
  sepolia,
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
} from "viem/chains";
import { _chains } from "./_chains";

export const CHAINLABEL_KEY = "$SK_CHAINLABEL";
export const ADDRESS_KEY = "$SK_ADDRESS";
export const TX_KEY = "$SK_TX";

export const c: { [name: string]: Chain } = {
  mainnet: {
    ...mainnet,
    rpcUrls: { default: { http: ["https://rpc.ankr.com/eth"] } }, // add custom rpcs. cloudflare doesn't support publicClient.getTransaction
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
  bitTorrent,
  bitTorrentTestnet,
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
};

// source: https://docs.etherscan.io/etherscan-v2/getting-started/supported-chains
export const etherscanChains: { [name: string]: Chain } = {
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
  // TODO: upgrade package and add these chains:
  // blast,
  // blastTestnet,
  bsc,
  bscTestnet,
  celo,
  celoAlfajores,
  cronos,
  cronosTestnet,
  fantom,
  fantomTestnet,
  // frax,
  // fraxTestnet,
  gnosis,
  holesky,
  kroma,
  kromaSepolia,
  linea,
  lineaTestnet,
  mantle,
  mantaTestnet,
  moonbeam,
  moonriver,
  moonbaseAlpha,
  opBNB,
  opBNBTestnet,
  optimism,
  optimismSepolia,
  polygon,
  polygonMumbai,
  polygonZkEvm,
  polygonZkEvmTestnet,
  scroll,
  scrollSepolia,
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
    [arbitrum.id]: `${basePath}/arbitrum.svg`,
    [avalanche.id]: `${basePath}/avalanche.svg`,
    [base.id]: `${basePath}/base.svg`,
    [bsc.id]: `${basePath}/bsc.svg`,
    [cronos.id]: `${basePath}/cronos.svg`,
    [goerli.id]: `${basePath}/ethereum.svg`,
    [mainnet.id]: `${basePath}/ethereum.svg`,
    [optimism.id]: `${basePath}/optimism.svg`,
    [polygon.id]: `${basePath}/polygon.svg`,
    [sepolia.id]: `${basePath}/ethereum.svg`,
    [zora.id]: `${basePath}/zora.svg`,
  };

  Object.keys(chainIdToChain).map((_chainId) => {
    const chainId = Number(_chainId);

    if (!res[chainId]) {
      res[
        chainId
      ] = `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&size=128&url=${chainIdToChain[chainId].blockExplorers?.default.url}`;
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
