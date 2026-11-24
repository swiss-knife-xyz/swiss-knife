import {
  mainnet,
  arbitrum,
  base,
  berachain,
  bsc,
  celo,
  gnosis,
  ink,
  linea,
  optimism,
  polygon,
  unichain,
  worldchain,
} from "viem/chains";
import { monad, citrea, megaeth, directoryNetworks, chainIdToChain, getNetworkName } from "@/data/networks";
const { endurance, katana, zircuit, stablechain } = directoryNetworks;

export interface SupportedChain {
  id: number;
  name: string;
  color: string;
  abbreviation?: string;
  chainObj: any; // Using any here for simplicity
}

export interface SupportedApp {
  name: string;
  logoUrl?: string;
  needsWhiteBg?: boolean;
  siteUrl?: string;
  supportedChainIds: number[];
  announcement?: {
    epochTimestamp: number;
    tweet: string;
  };
  filterSupportsAllChains?: boolean; // For filtering logic: if true, supports all chains in the global list
  twitterHandle?: string; // For Wall of Shame "Post on X" functionality
}

const getFaviconUrl = (url: string) => {
  return `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${url}&size=128`;
};

// All chains that support 7702
const supportedChains: SupportedChain[] = [
  {
    id: mainnet.id,
    name: "Ethereum",
    color: "blue.300",
    abbreviation: "ETH",
    chainObj: mainnet,
  },
  {
    id: arbitrum.id,
    name: "Arbitrum",
    color: "blue.300",
    abbreviation: "ARB",
    chainObj: arbitrum,
  },
  {
    id: base.id,
    name: "Base",
    color: "blue.400",
    abbreviation: "BASE",
    chainObj: base,
  },
  {
    id: berachain.id,
    name: "Berachain",
    color: "orange.600",
    abbreviation: "BERA",
    chainObj: berachain,
  },
  {
    id: bsc.id,
    name: "BNB Chain",
    color: "yellow.300",
    abbreviation: "BNB",
    chainObj: bsc,
  },
  {
    id: celo.id,
    name: "Celo",
    color: "yellow.200",
    abbreviation: "CELO",
    chainObj: celo,
  },
  {
    id: citrea.id,
    name: "Citrea",
    color: "orange.400",
    abbreviation: "CITREA",
    chainObj: citrea,
  },
  {
    id: endurance.id,
    name: "Endurance",
    color: "orange.400",
    abbreviation: "ACE",
    chainObj: endurance,
  },
  {
    id: gnosis.id,
    name: "Gnosis Chain",
    color: "green.300",
    abbreviation: "GNO",
    chainObj: gnosis,
  },
  {
    id: ink.id,
    name: "Ink",
    color: "purple.400",
    abbreviation: "INK",
    chainObj: ink,
  },
  {
    id: katana.id,
    name: "Katana",
    color: "yellow.400",
    abbreviation: "KATANA",
    chainObj: katana,
  },
  {
    id: linea.id,
    name: "Linea",
    color: "blue.500",
    abbreviation: "LINEA",
    chainObj: linea,
  },
  {
    id: megaeth.id,
    name: "MegaETH",
    color: "white",
    abbreviation: "MEGA",
    chainObj: megaeth,
  },
  {
    id: monad.id,
    name: "Monad",
    color: "purple.400",
    abbreviation: "MON",
    chainObj: {
      ...monad,
      iconBackground: "white",
    },
  },
  {
    id: optimism.id,
    name: "Optimism",
    color: "red.300",
    abbreviation: "OP",
    chainObj: optimism,
  },
  {
    id: polygon.id,
    name: "Polygon",
    color: "purple.500",
    abbreviation: "POL",
    chainObj: polygon,
  },
  {
    id: stablechain.id,
    name: "StableChain",
    color: "green.300",
    abbreviation: "STABLE",
    chainObj: stablechain,
  },
  {
    id: unichain.id,
    name: "UniChain",
    color: "pink.400",
    abbreviation: "UNI",
    chainObj: unichain,
  },
  {
    id: worldchain.id,
    name: "Worldchain",
    color: "white",
    abbreviation: "World",
    chainObj: worldchain,
  },
  {
    id: zircuit.id,
    name: "Zircuit",
    color: "green.400",
    abbreviation: "ZRC",
    chainObj: zircuit,
  },
];

export const chains: SupportedChain[] = supportedChains.map(chain => ({
  ...chain,
  name: getNetworkName(chain.id, chain.name),
  chainObj: { ...chain.chainObj, ...(chainIdToChain[chain.id] ?? {}) },
}));

export const wallets: SupportedApp[] = [
  {
    name: "Ambire",
    logoUrl: getFaviconUrl("https://ambire.com"),
    siteUrl: "https://www.ambire.com/",
    supportedChainIds: [
      mainnet.id,
      arbitrum.id,
      base.id,
      berachain.id, // https://x.com/AmbireWallet/status/1932042333157249209
      bsc.id,
      gnosis.id,
      ink.id,
      katana.id, // https://explorer.ambire.com/?chainId=747474&txnId=0xc7f0957c270dd47261c69228e72a4c689f9e1293a0def2bc06b9e2c7c45c0524
      linea.id,
      optimism.id,
      polygon.id,
      unichain.id,
    ],
    announcement: {
      epochTimestamp: 1742565360,
      tweet: "https://x.com/AmbireWallet/status/1903083304808857892",
    },
  },
  {
    name: "Metamask",
    logoUrl: getFaviconUrl("https://metamask.io"),
    siteUrl: "https://metamask.io/",
    supportedChainIds: [
      mainnet.id,
      arbitrum.id,
      base.id,
      berachain.id,
      bsc.id,
      gnosis.id,
      linea.id,
      optimism.id,
      // polygon.id,
      unichain.id,
      zircuit.id,
    ],
    announcement: {
      epochTimestamp: 1746028260,
      tweet: "https://x.com/danfinlay/status/1917607802631250094",
    },
  },
  {
    name: "OKX Wallet",
    logoUrl: getFaviconUrl("https://web3.okx.com/"),
    siteUrl: "https://web3.okx.com/",
    supportedChainIds: [
      mainnet.id,
      base.id,
      bsc.id,
      gnosis.id,
      ink.id,
      optimism.id,
      // polygon.id,
      unichain.id,
    ],
    announcement: {
      epochTimestamp: 1746608460,
      tweet: "https://x.com/wallet/status/1920041181410742474",
    },
  },
  {
    name: "Trust Wallet",
    logoUrl: getFaviconUrl("https://trustwallet.com/"),
    siteUrl: "https://trustwallet.com/",
    supportedChainIds: [mainnet.id, bsc.id],
    announcement: {
      epochTimestamp: 1746616860,
      tweet: "https://x.com/TrustWallet/status/1920076571064389771",
    },
  },
  {
    name: "Bitget",
    logoUrl: getFaviconUrl("https://web3.bitget.com/en"),
    siteUrl: "https://web3.bitget.com/en",
    // source: https://web3.bitget.com/en/assets
    supportedChainIds: [
      mainnet.id,
      arbitrum.id,
      base.id,
      berachain.id,
      bsc.id,
      optimism.id,
      polygon.id,
      unichain.id,
    ],
    announcement: {
      epochTimestamp: 1746627300,
      tweet: "https://x.com/BitgetWallet/status/1920120423293083832",
    },
  },
  {
    name: "Uniswap Wallet",
    logoUrl: getFaviconUrl("https://wallet.uniswap.org/"),
    siteUrl: "https://wallet.uniswap.org//",
    supportedChainIds: [
      mainnet.id,
      arbitrum.id,
      base.id,
      bsc.id,
      optimism.id,
      unichain.id,
    ],
    announcement: {
      epochTimestamp: 1749738240,
      tweet: "https://x.com/Uniswap/status/1933168423825035768",
    },
  },
  {
    name: "NuFi",
    logoUrl: getFaviconUrl("https://nu.fi"),
    siteUrl: "https://nu.fi/",
    supportedChainIds: [
      mainnet.id,
      arbitrum.id,
      base.id,
      berachain.id,
      bsc.id,
      optimism.id,
      polygon.id,
      unichain.id,
    ],
    announcement: {
      epochTimestamp: 1753812000,
      tweet: "https://x.com/nufiwallet/status/1950255004612202578",
    },
  },
  {
    name: "zWallet",
    logoUrl:
      "https://raw.githubusercontent.com/zammdefi/zWallet/refs/heads/main/extension/icon48.png",
    siteUrl: "https://zwallets.eth.limo/",
    supportedChainIds: [mainnet.id, base.id],
    announcement: {
      epochTimestamp: 1755698880,
      tweet: "https://x.com/z0r0zzz/status/1958169302315729282",
    },
  },
  {
    name: "Rewardy Wallet",
    logoUrl: "https://www.rewardywallet.com/meta/favicon_64.png",
    siteUrl: "https://www.rewardywallet.com/en",
    supportedChainIds: [mainnet.id, base.id],
    announcement: {
      epochTimestamp: 1764979200,
      tweet:
        "https://cointelegraph.com/press-releases/rewardy-unveils-erc-7702-based-wallet-delivering-smart-ux-without-changing-wallet-addresses",
    },
  },
  {
    name: "Rainbow Wallet",
    logoUrl: getFaviconUrl("https://rainbow.me"),
    siteUrl: "https://rainbow.me/",
    supportedChainIds: [
      mainnet.id,
      arbitrum.id,
      base.id,
      berachain.id,
      bsc.id,
      celo.id,
      gnosis.id,
      ink.id,
      optimism.id,
      polygon.id,
      unichain.id,
      katana.id,
    ],
    announcement: {
      epochTimestamp: 1772050680,
      tweet: "https://x.com/rainbowdotme/status/2026753700216127820",
    },
  },
  {
    name: "WalletChan",
    logoUrl: "https://walletchan.com/images/walletchan-icon-nobg.png",
    siteUrl: "https://walletchan.com",
    // source: wchan/walletchan/_docs/7702.md + chainRegistry/knownChains.generated.ts
    supportedChainIds: [
      mainnet.id,
      arbitrum.id,
      base.id,
      berachain.id,
      bsc.id,
      celo.id,
      citrea.id,
      gnosis.id,
      ink.id,
      katana.id,
      linea.id,
      megaeth.id,
      monad.id,
      optimism.id,
      polygon.id,
      unichain.id,
    ],
    announcement: {
      epochTimestamp: 1779886800,
      tweet: "https://x.com/walletchan_/status/2059620716228784407",
    },
  },
];

export const hardwareWallets: SupportedApp[] = [
  {
    name: "GridPlus",
    logoUrl: getFaviconUrl("https://gridplus.io"),
    siteUrl: "https://gridplus.io/",
    supportedChainIds: [
      mainnet.id,
      arbitrum.id,
      base.id,
      berachain.id,
      bsc.id,
      celo.id,
      endurance.id,
      gnosis.id,
      ink.id,
      katana.id,
      linea.id,
      megaeth.id,
      monad.id,
      optimism.id,
      polygon.id,
      stablechain.id,
      unichain.id,
      worldchain.id,
      zircuit.id,
    ],
    filterSupportsAllChains: true,
    announcement: {
      epochTimestamp: 1767884564,
      tweet: "https://x.com/ambire/status/2009264088606769348",
    },
  },
];

export const dapps: SupportedApp[] = [
  {
    name: "Ask Gina",
    logoUrl: getFaviconUrl("https://askgina.ai/"),
    siteUrl: "https://askgina.ai/",
    supportedChainIds: [mainnet.id, base.id, bsc.id, optimism.id],
  },
  {
    name: "Based Loans",
    logoUrl: getFaviconUrl("https://based.loans/"),
    siteUrl: "https://based.loans/",
    supportedChainIds: [base.id],
  },
  {
    name: "Bungee",
    logoUrl: getFaviconUrl("https://bungee.exchange/"),
    siteUrl: "https://bungee.exchange/",
    supportedChainIds: [
      mainnet.id,
      arbitrum.id,
      base.id,
      berachain.id,
      bsc.id,
      gnosis.id,
      ink.id,
      optimism.id,
      polygon.id,
      unichain.id,
    ],
  },
  {
    name: "Cabana",
    logoUrl: getFaviconUrl("https://app.cabana.fi/"),
    siteUrl: "https://app.cabana.fi/",
    supportedChainIds: [
      mainnet.id,
      arbitrum.id,
      base.id,
      gnosis.id,
      optimism.id,
    ],
  },
  {
    name: "DeFi Saver",
    logoUrl: getFaviconUrl("https://defisaver.com/"),
    siteUrl: "https://app.defisaver.com/exchange/swap",
    supportedChainIds: [mainnet.id, arbitrum.id, base.id, optimism.id],
  },
  {
    name: "Ekubo",
    logoUrl: getFaviconUrl("https://evm.ekubo.org/"),
    siteUrl: "https://evm.ekubo.org/",
    supportedChainIds: [mainnet.id],
  },
  {
    name: "Escher",
    logoUrl: getFaviconUrl("https://app.escher.finance/"),
    siteUrl: "https://app.escher.finance/",
    supportedChainIds: [mainnet.id],
  },
  {
    name: "Ethena",
    logoUrl: getFaviconUrl("https://app.ethena.fi/"),
    siteUrl: "https://app.ethena.fi/",
    supportedChainIds: [
      mainnet.id,
      arbitrum.id,
      base.id,
      bsc.id,
      berachain.id,
      optimism.id,
    ],
  },
  {
    name: "Euler",
    logoUrl: getFaviconUrl("https://app.euler.finance/"),
    siteUrl: "https://app.euler.finance/",
    supportedChainIds: [mainnet.id, base.id, berachain.id, bsc.id, unichain.id],
  },
  {
    name: "Fibrous",
    logoUrl: getFaviconUrl("https://app.fibrous.finance/"),
    siteUrl: "https://app.fibrous.finance/",
    supportedChainIds: [base.id],
  },
  {
    name: "Flaunch",
    logoUrl: getFaviconUrl("https://flaunch.gg/"),
    siteUrl: "https://flaunch.gg/",
    supportedChainIds: [base.id],
  },
  {
    name: "Fluid",
    logoUrl: getFaviconUrl("https://fluid.io"),
    siteUrl: "https://fluid.io",
    supportedChainIds: [mainnet.id, arbitrum.id, base.id],
  },
  {
    name: "Fundable",
    logoUrl: "https://evm.fundable.finance/favicon_io/favicon.ico",
    siteUrl: "https://evm.fundable.finance",
    supportedChainIds: [arbitrum.id, base.id, bsc.id, optimism.id],
  },
  {
    name: "GlueX",
    logoUrl: getFaviconUrl("https://dapp.gluex.xyz/"),
    siteUrl: "https://dapp.gluex.xyz/",
    supportedChainIds: [
      mainnet.id,
      arbitrum.id,
      base.id,
      berachain.id,
      bsc.id,
      gnosis.id,
      optimism.id,
      polygon.id,
      unichain.id,
      // NOTE: plasma & hyperEVM also supported
    ],
  },
  {
    name: "Infinit",
    logoUrl: getFaviconUrl("https://app.infinit.tech/en"),
    siteUrl: "https://app.infinit.tech/en",
    supportedChainIds: [mainnet.id, arbitrum.id, base.id, bsc.id],
    // NOTE: plasm & hyperEVM also supported
  },
  {
    name: "Jumper",
    logoUrl: getFaviconUrl("https://jumper.exchange/"),
    needsWhiteBg: true,
    siteUrl: "https://jumper.exchange/",
    supportedChainIds: [
      mainnet.id,
      arbitrum.id,
      base.id,
      bsc.id,
      gnosis.id,
      ink.id,
      optimism.id,
      polygon.id,
      unichain.id,
      zircuit.id,
    ],
  },
  {
    name: "Lido",
    logoUrl: getFaviconUrl("https://stake.lido.fi/"),
    siteUrl: "https://stake.lido.fi/",
    supportedChainIds: [mainnet.id],
  },
  {
    name: "LlamaSwap",
    logoUrl: getFaviconUrl("https://swap.defillama.com/"),
    siteUrl: "https://swap.defillama.com/",
    supportedChainIds: [
      mainnet.id,
      arbitrum.id,
      base.id,
      bsc.id,
      gnosis.id,
      optimism.id,
      unichain.id,
    ],
  },
  {
    name: "Matcha",
    logoUrl: getFaviconUrl("https://matcha.xyz/"),
    siteUrl: "https://matcha.xyz/",
    supportedChainIds: [
      mainnet.id,
      arbitrum.id,
      base.id,
      bsc.id,
      gnosis.id,
      optimism.id,
      polygon.id,
      unichain.id,
    ],
  },
  {
    name: "Militereum",
    logoUrl: getFaviconUrl("https://militereum.com/"),
    siteUrl: "https://militereum.com/",
    supportedChainIds: [mainnet.id, arbitrum.id, optimism.id, polygon.id],
  },
  {
    name: "PancakeSwap",
    logoUrl: getFaviconUrl("https://pancakeswap.finance/"),
    siteUrl: "https://pancakeswap.finance/",
    supportedChainIds: [mainnet.id, arbitrum.id, base.id, bsc.id],
  },
  {
    name: "PredictBase",
    logoUrl: getFaviconUrl("https://predictbase.app/"),
    siteUrl: "https://predictbase.app/",
    supportedChainIds: [base.id],
  },
  {
    name: "PWN",
    logoUrl: getFaviconUrl("https://app.pwn.xyz/"),
    siteUrl: "https://app.pwn.xyz/",
    supportedChainIds: [
      mainnet.id,
      arbitrum.id,
      base.id,
      gnosis.id,
      ink.id,
      optimism.id,
      unichain.id,
    ],
  },
  {
    name: "Relay",
    logoUrl: getFaviconUrl("https://relay.link/"),
    siteUrl: "https://relay.link/bridge",
    supportedChainIds: [
      mainnet.id,
      arbitrum.id,
      base.id,
      bsc.id,
      gnosis.id,
      ink.id,
      optimism.id,
      polygon.id,
      unichain.id,
      zircuit.id,
    ],
  },
  {
    name: "Reserve",
    logoUrl: getFaviconUrl("https://app.reserve.org/"),
    siteUrl: "https://app.reserve.org/",
    supportedChainIds: [mainnet.id, base.id],
  },
  {
    name: "Revoke.cash",
    logoUrl: getFaviconUrl("https://revoke.cash"),
    siteUrl: "https://revoke.cash/",
    supportedChainIds: [
      mainnet.id,
      arbitrum.id,
      berachain.id,
      base.id,
      bsc.id,
      gnosis.id,
      ink.id,
      optimism.id,
      polygon.id,
      unichain.id,
    ],
    filterSupportsAllChains: true,
  },
  {
    name: "Sky.money",
    logoUrl: getFaviconUrl("https://sky.money/"),
    siteUrl: "https://sky.money/",
    supportedChainIds: [
      mainnet.id,
      arbitrum.id,
      base.id,
      optimism.id,
      unichain.id,
    ],
  },
  {
    name: "Spark",
    logoUrl: getFaviconUrl("https://spark.fi/"),
    siteUrl: "https://spark.fi/",
    supportedChainIds: [
      mainnet.id,
      arbitrum.id,
      base.id,
      gnosis.id,
      optimism.id,
      unichain.id,
    ],
  },
  {
    name: "Uniswap",
    logoUrl: getFaviconUrl("https://app.uniswap.org"),
    siteUrl: "https://app.uniswap.org/",
    supportedChainIds: [
      mainnet.id,
      arbitrum.id,
      base.id,
      bsc.id,
      optimism.id,
      polygon.id,
      unichain.id,
    ],
  },
  {
    name: "Vaults.fyi",
    logoUrl: getFaviconUrl("https://app.vaults.fyi"),
    needsWhiteBg: true,
    siteUrl: "https://app.vaults.fyi/",
    supportedChainIds: [
      mainnet.id,
      arbitrum.id,
      base.id,
      berachain.id,
      celo.id,
      gnosis.id,
      optimism.id,
      unichain.id,
    ],
  },
  {
    name: "Velodrome",
    logoUrl: getFaviconUrl("https://velodrome.finance/"),
    siteUrl: "https://velodrome.finance/",
    supportedChainIds: [
      celo.id,
      ink.id,
      optimism.id,
      unichain.id,
      // NOTE: sonium, lisk, superseed, mode, metal l2, swellchain, fraxtal also supported (source: https://velodrome.finance/dash?settings=favorite-chains)
    ],
  },
  {
    name: "WalletConnect Staking",
    logoUrl: getFaviconUrl("https://staking.walletconnect.network/"),
    siteUrl: "https://staking.walletconnect.network/",
    supportedChainIds: [optimism.id],
  },
  {
    name: "ZAMM",
    logoUrl: "https://www.zamm.finance/zamm-logo.svg",
    siteUrl: "https://www.zamm.finance/",
    supportedChainIds: [mainnet.id],
  },
  {
    name: "Zora",
    logoUrl: getFaviconUrl("https://zora.co/"),
    siteUrl: "https://zora.co/",
    supportedChainIds: [base.id],
  },
];

// Wall of Shame data
export const shameChains: SupportedApp[] = [];

export const shameWallets: SupportedApp[] = [
  {
    name: "Rabby",
    logoUrl: getFaviconUrl("https://rabby.io"),
    siteUrl: "https://rabby.io/",
    supportedChainIds: [], // Empty since they don't support 7702
    twitterHandle: "rabby_io",
  },
  {
    name: "Phantom",
    logoUrl: getFaviconUrl("https://phantom.com/"),
    siteUrl: "https://phantom.com/",
    supportedChainIds: [], // Empty since they don't support 7702
    twitterHandle: "phantom",
  },
  {
    name: "Frame Wallet",
    logoUrl: getFaviconUrl("https://frame.sh/"),
    siteUrl: "https://frame.sh/",
    supportedChainIds: [], // Empty since they don't support 7702
    twitterHandle: "0xframe",
  },
];

export const shameHardwareWallets: SupportedApp[] = [
  {
    name: "Ledger",
    logoUrl: "/external/ledger-logo.png",
    siteUrl: "https://www.ledger.com/",
    supportedChainIds: [],
    twitterHandle: "Ledger",
  },
  {
    name: "Trezor",
    logoUrl: getFaviconUrl("https://trezor.io/"),
    siteUrl: "https://trezor.io/",
    supportedChainIds: [],
    twitterHandle: "Trezor",
  },
];

export const shameDapps: SupportedApp[] = [
  {
    name: "BSCscan",
    logoUrl: getFaviconUrl("https://bscscan.com"),
    needsWhiteBg: true,
    siteUrl: "https://bscscan.com/",
    supportedChainIds: [], // Empty since they don't support 7702
    twitterHandle: "etherscan",
  },
  {
    name: "Aave",
    logoUrl: getFaviconUrl("https://app.aave.com"),
    siteUrl: "https://app.aave.com/",
    supportedChainIds: [], // Empty since they don't support 7702
    twitterHandle: "aave",
  },
];
