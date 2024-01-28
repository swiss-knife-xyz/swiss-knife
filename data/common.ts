import {
  mainnet,
  arbitrum,
  arbitrumGoerli,
  arbitrumNova,
  avalanche,
  avalancheFuji,
  aurora,
  base,
  baseGoerli,
  baseSepolia,
  boba,
  bsc,
  bscTestnet,
  canto,
  celo,
  confluxESpace,
  cronos,
  dfk,
  dogechain,
  evmos,
  fantom,
  fantomTestnet,
  fuse,
  gnosis,
  goerli,
  harmonyOne,
  iotex,
  klaytn,
  linea,
  mantle,
  metis,
  moonbeam,
  moonriver,
  okc,
  optimism,
  optimismGoerli,
  polygon,
  polygonMumbai,
  polygonZkEvm,
  ronin,
  scroll,
  sepolia,
  telos,
  wanchain,
  zkSync,
  zora,
  zoraTestnet,
  Chain,
} from "viem/chains";

export const CHAINLABEL_KEY = "$SK_CHAINLABEL";
export const ADDRESS_KEY = "$SK_ADDRESS";
export const TX_KEY = "$SK_TX";

export const c = {
  mainnet,
  arbitrum,
  arbitrumGoerli,
  arbitrumNova,
  avalanche,
  avalancheFuji,
  aurora,
  base,
  baseGoerli,
  baseSepolia,
  boba,
  bsc,
  bscTestnet,
  canto,
  celo,
  confluxESpace,
  cronos,
  dfk,
  dogechain,
  evmos,
  fantom,
  fantomTestnet,
  fuse,
  gnosis,
  goerli,
  harmonyOne,
  iotex,
  klaytn,
  linea,
  mantle,
  metis,
  moonbeam,
  moonriver,
  okc,
  optimism,
  optimismGoerli,
  polygon,
  polygonMumbai,
  polygonZkEvm,
  ronin,
  scroll,
  sepolia,
  telos,
  wanchain,
  zkSync,
  zora,
  zoraTestnet,
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
