import {
  mainnet,
  arbitrum,
  arbitrumNova,
  arbitrumSepolia,
  avalanche,
  avalancheFuji,
  aurora,
  base,
  baseSepolia,
  berachain,
  bitTorrent,
  boba,
  bsc,
  bscTestnet,
  celo,
  celoSepolia,
  citreaTestnet,
  confluxESpace,
  cronos,
  cronosTestnet,
  dfk,
  fantom,
  filecoin,
  fraxtal,
  fuse,
  gnosis,
  hoodi,
  iotex,
  linea,
  manta,
  mantle,
  metis,
  opBNB,
  opBNBTestnet,
  optimism,
  optimismSepolia,
  polygon,
  polygonAmoy,
  ronin,
  scroll,
  sei,
  seiTestnet,
  sepolia,
  sonic,
  telos,
  wanchain,
  wemix,
  wemixTestnet,
  zkSync,
  zkSyncSepoliaTestnet,
  zora,
  Chain,
  lineaSepolia,
  mantaSepoliaTestnet,
  taikoHoodi,
  zoraSepolia,
  kaia,
  unichain,
  ink,
  worldchain,
} from "viem/chains";
import { _chains } from "./_chains";
import { isRetiredChain } from "./retiredChains";

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

export const citrea = defineChain({
  id: 4114,
  name: "Citrea",
  nativeCurrency: {
    name: "Citrea BTC",
    symbol: "cBTC",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.mainnet.citrea.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "Citrea Explorer",
      url: "https://explorer.mainnet.citrea.xyz",
    },
  },
  testnet: false,
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

export const robinhood = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.mainnet.chain.robinhood.com"] },
  },
  blockExplorers: {
    default: {
      name: "Robinhood Chain Explorer",
      url: "https://robinhoodchain.blockscout.com",
    },
  },
  testnet: false,
});

// Current testnet definitions replace IDs whose official endpoints were reused.
export const fraxtalHoodi = defineChain({
  id: 2523,
  name: "Fraxtal Hoodi",
  testnet: true,
  nativeCurrency: { name: "Frax", symbol: "FRAX", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.frax.com"] } },
  blockExplorers: {
    default: { name: "Fraxscan", url: "https://hoodi.fraxscan.com" },
  },
});
export const bitTorrentDonau = defineChain({
  id: 1029,
  name: "BitTorrent Donau",
  testnet: true,
  nativeCurrency: { name: "BitTorrent", symbol: "BTT", decimals: 18 },
  rpcUrls: { default: { http: ["https://pre-rpc.bt.io"] } },
  blockExplorers: {
    default: { name: "BTTC Testnet Explorer", url: "https://testscan.bt.io" },
  },
});

export const CHAINLABEL_KEY = "$SK_CHAINLABEL";
export const ADDRESS_KEY = "$SK_ADDRESS";
export const TX_KEY = "$SK_TX";

const chainDefinitions: { [name: string]: Chain } = {
  mainnet: {
    ...mainnet,
  },
  sepolia: {
    ...sepolia,
    rpcUrls: { default: { http: ["https://sepolia.gateway.tenderly.co"] } }, // add custom rpcs. cloudflare doesn't support publicClient.getTransaction
  },
  arbitrum,
  arbitrumNova,
  arbitrumSepolia,
  avalanche,
  avalancheFuji,
  aurora,
  base,
  baseSepolia,
  berachain,
  bitTorrent,
  bitTorrentDonau,
  boba,
  bsc,
  bscTestnet,
  celo,
  celoSepolia,
  citrea,
  citreaTestnet,
  confluxESpace,
  cronos,
  cronosTestnet,
  dfk,
  fantom, // Shutdown reversed: https://www.soniclabs.com/blog/the-first-1/
  filecoin,
  fraxtal,
  fraxtalHoodi,
  fuse,
  gnosis,
  hoodi,
  iotex,
  klaytn: kaia, // Same chain ID, current Kaia name and RPC.
  linea,
  lineaSepolia,
  manta,
  mantaSepoliaTestnet,
  mantle,
  megaeth,
  metis,
  monad,
  opBNB,
  opBNBTestnet,
  optimism,
  optimismSepolia,
  plasma,
  robinhood,
  polygon,
  polygonAmoy,
  ronin,
  scroll,
  sei,
  seiTestnet,
  sonic,
  telos,
  wanchain,
  wemix,
  wemixTestnet,
  worldchain,
  zkSync,
  zkSyncSepoliaTestnet,
  zora,
  zoraSepolia,
  taikoHoodi,
};

export const c: Record<string, Chain> = Object.fromEntries(
  Object.entries(chainDefinitions).filter(
    ([, chain]) => !isRetiredChain(chain.id)
  )
);

// All shared registries exclude retired chains; reasons and sources live in retiredChains.ts.
export const explorerChains = Object.values(c);

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
  bitTorrentDonau,
  bsc,
  bscTestnet,
  celo,
  celoSepolia,
  cronos,
  cronosTestnet,
  fantom,
  fraxtal,
  fraxtalHoodi,
  gnosis,
  linea,
  lineaSepolia,
  mantle,
  manta,
  megaeth,
  opBNB,
  opBNBTestnet,
  optimism,
  optimismSepolia,
  plasma: { ...plasma, isRoutescan: true },
  polygon,
  scroll,
  sei,
  seiTestnet,
  sepolia,
  taikoHoodi,
  wemix,
  wemixTestnet,
  zkSync,
  zkSyncSepoliaTestnet,
  // xai,
  // xaiTestnet,
};

// Map of chainId -> custom RPC URL sourced from env vars.
// Add a new entry here when introducing a NEXT_PUBLIC_<CHAIN>_RPC_URL env var.
// Only NEXT_PUBLIC_* vars work in client code; server-only vars belong in their own server modules.
export const chainIdToCustomRpcUrl: Record<number, string | undefined> = {
  [mainnet.id]: process.env.NEXT_PUBLIC_MAINNET_RPC_URL,
  [base.id]: process.env.NEXT_PUBLIC_BASE_RPC_URL,
};

// TODO: these should be placed in provider and memoized
export const chainIdToChain = (() => {
  let res: {
    [chainId: number]: Chain;
  } = {};

  Object.values(c)
    .filter((chain) => !isRetiredChain(chain.id))
    .map((chain) => {
      const customRpcUrl = chainIdToCustomRpcUrl[chain.id];
      if (customRpcUrl) {
        res[chain.id] = {
          ...chain,
          rpcUrls: {
            ...chain.rpcUrls,
            default: {
              http: [customRpcUrl],
            },
          },
        };
      } else {
        res[chain.id] = chain;
      }

      // Override Polygon RPC URL
      if (chain.id === polygon.id) {
        res[chain.id] = {
          ...chain,
          rpcUrls: {
            ...chain.rpcUrls,
            default: {
              http: ["https://1rpc.io/matic"],
            },
          },
        };
      }
    });

  return res;
})();

// Returns the RPC URL to use for a given chain — the env-configured override
// when set, otherwise viem's default for that chain. Single source of truth
// for every public client and wagmi transport in the app.
export const getRpcUrlForChain = (chainId: number): string | undefined =>
  chainIdToCustomRpcUrl[chainId] ||
  chainIdToChain[chainId]?.rpcUrls.default?.http?.[0];

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

  const res: Record<number, string> = {};
  // Share each network's local artwork with its testnets instead of fetching
  // favicons from retired explorer domains. Asset sources are in chainIcons/SOURCES.md.
  const iconFamilies: [string, readonly Chain[]][] = [
    ["ethereum.svg", [mainnet, sepolia, hoodi]],
    ["arbitrum.svg", [arbitrum, arbitrumSepolia]],
    ["arbitrum-nova.svg", [arbitrumNova]],
    ["avalanche.svg", [avalanche, avalancheFuji]],
    ["aurora.svg", [aurora]],
    ["base.svg", [base, baseSepolia]],
    ["berachain.svg", [berachain]],

    ["boba.svg", [boba]],
    ["bsc.svg", [bsc, bscTestnet]],
    ["celo.webp", [celo, celoSepolia]],
    ["citrea.svg", [citrea, citreaTestnet]],
    ["conflux.svg", [confluxESpace]],
    ["cronos.svg", [cronos, cronosTestnet]],

    ["fantom.svg", [fantom]],
    ["filecoin.webp", [filecoin]],
    ["fraxtal.svg", [fraxtal, fraxtalHoodi]],
    ["fuse.svg", [fuse]],
    ["gnosis.webp", [gnosis]],

    ["ink.svg", [ink]],
    ["iotex.svg", [iotex]],
    ["kaia.svg", [kaia]],

    ["linea.svg", [linea, lineaSepolia]],
    ["manta-pacific.svg", [manta, mantaSepoliaTestnet]],
    ["mantle.svg", [mantle]],
    ["megaeth.svg", [megaeth]],
    ["metis-andromeda.svg", [metis]],
    ["monad.svg", [monad]],

    ["opbnb.png", [opBNB, opBNBTestnet]],
    ["optimism.svg", [optimism, optimismSepolia]],
    ["plasma.svg", [plasma]],
    ["polygon.svg", [polygon, polygonAmoy]],

    ["robinhood.svg", [robinhood]],
    ["ronin.svg", [ronin]],
    ["scroll.webp", [scroll]],
    ["sei.svg", [sei, seiTestnet]],
    ["sonic.svg", [sonic]],

    ["taiko.svg", [taikoHoodi]],
    ["telos.svg", [telos]],
    ["unichain.svg", [unichain]],
    ["wanchain.png", [wanchain]],
    ["wemix.svg", [wemix, wemixTestnet]],
    ["worldchain.svg", [worldchain]],
    ["zksync.webp", [zkSync, zkSyncSepoliaTestnet]],
    ["zora.svg", [zora, zoraSepolia]],
  ];
  for (const [file, chains] of iconFamilies) {
    for (const chain of chains) res[chain.id] = `${basePath}/${file}`;
  }
  res[48900] = `${basePath}/zircuit.svg`;

  Object.keys(chainIdToChain).map((_chainId) => {
    const chainId = Number(_chainId);

    if (!res[chainId]) {
      res[chainId] =
        `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&size=128&url=${chainIdToChain[chainId].blockExplorers?.default.url}`;
    }
  });

  return res;
})();

export const networkOptions: { label: string; value: number; image: string }[] =
  Object.keys(c)
    .filter((k) => !isRetiredChain(c[k].id))
    .map((k, i) => ({
      label: c[k].name,
      value: c[k].id,
      image: chainIdToImage[c[k].id],
    }));
