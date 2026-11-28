import type { CustomChain } from "@/lib/customChains/model";
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
  pulsechain,
  soneium,
  monadTestnet,
} from "viem/chains";
import { _chains } from "./_chains";
import { isRetiredChain } from "./retiredChains";

import { defineChain } from "viem";

// Display-only identities from https://routescan.io/chains (reviewed 2026-11-27).
// These do not enable RPC access or establish support in individual tools.
export const providerNetworkMetadata: Record<number, { name: string; testnet: boolean }> = {
  151: { name: "Redbelly Mainnet", testnet: false },
  153: { name: "Redbelly Testnet", testnet: true },
  1015: { name: "PHASE", testnet: false },
  3011: { name: "PLAYA3ULL Games", testnet: false },
  5566: { name: "StraitsX", testnet: false },
  6900: { name: "Nibiru", testnet: false },
  6911: { name: "Nibiru Testnet-2", testnet: true },
  8227: { name: "Space", testnet: false },
  10507: { name: "Numbers Mainnet", testnet: false },
  13322: { name: "FIFA Blockchain", testnet: false },
  28882: { name: "Boba Sepolia", testnet: true },
  68414: { name: "Henesys", testnet: false },
  84358: { name: "Titan", testnet: false },
  88882: { name: "Chiliz Spicy Testnet", testnet: true },
  88888: { name: "Chiliz Mainnet", testnet: false },
};

// Directory-only networks are known identities without enabling RPC tools or wallet
// switching. Keep their existing provider metadata until RPC support is added.
export const directoryNetworks = {
  endurance: {
    id: 648,
    name: "Endurance",
    iconUrl: "https://ace.fusionist.io/apple-touch-icon.png",
    iconBackground: "white.400",
    blockExplorers: {
      default: {
        name: "Endurance Explorer",
        url: "https://explorer-endurance.fusionist.io",
      },
    },
  },
  katana: {
    id: 747474,
    name: "Katana",
    iconUrl: "https://katana.network/meta/favicon-96x96.png",
    iconBackground: "blue.400",
  },
  zircuit: {
    id: 48900,
    name: "Zircuit",
    iconUrl: "/chainIcons/zircuit.svg",
    iconBackground: "transparent",
    blockExplorers: {
      default: {
        name: "Zircuit Explorer",
        url: "https://explorer.zircuit.com",
      },
    },
  },
  stablechain: {
    id: 988,
    name: "StableChain",
    iconUrl: "/chainIcons/stable.svg",
    iconBackground: "white",
    nativeCurrency: {
      name: "USDT0",
      symbol: "USDT0",
      decimals: 6,
    },
    rpcUrls: {
      default: {
        http: ["https://rpc.stable.xyz"],
      },
    },
    blockExplorers: {
      default: {
        name: "StableScan",
        url: "https://stablescan.xyz",
      },
    },
  },
};

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
  ink,
  unichain,
  pulsechain,
  soneium,
  monadTestnet,
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
// Map of chainId -> custom RPC URL sourced from env vars.
// Add a new entry here when introducing a NEXT_PUBLIC_<CHAIN>_RPC_URL env var.
// Only NEXT_PUBLIC_* vars work in client code; server-only vars belong in their own server modules.
export const chainIdToCustomRpcUrl: Record<number, string | undefined> = {
  [mainnet.id]: process.env.NEXT_PUBLIC_MAINNET_RPC_URL,
  [base.id]: process.env.NEXT_PUBLIC_BASE_RPC_URL,
};

// Fixed Alchemy network identifiers for server-owned tracing, never user RPC URLs.
// https://www.alchemy.com/docs/reference/node-supported-chains
export const alchemyTraceNetworks: Readonly<Partial<Record<number, string>>> = Object.freeze({
  [mainnet.id]: "eth-mainnet",
  [sepolia.id]: "eth-sepolia",
  [hoodi.id]: "eth-hoodi",
  [base.id]: "base-mainnet",
  [baseSepolia.id]: "base-sepolia",
  [arbitrum.id]: "arb-mainnet",
  [arbitrumSepolia.id]: "arb-sepolia",
  [optimism.id]: "opt-mainnet",
  [optimismSepolia.id]: "opt-sepolia",
  [gnosis.id]: "gnosis-mainnet",
  [polygon.id]: "polygon-mainnet",
  [polygonAmoy.id]: "polygon-amoy",
  [bsc.id]: "bnb-mainnet",
  [bscTestnet.id]: "bnb-testnet",
  [avalanche.id]: "avax-mainnet",
  [avalancheFuji.id]: "avax-fuji",
  [sonic.id]: "sonic-mainnet",
  [sei.id]: "sei-mainnet",
  [seiTestnet.id]: "sei-testnet",
  [linea.id]: "linea-mainnet",
  [lineaSepolia.id]: "linea-sepolia",
  [mantle.id]: "mantle-mainnet",
  [scroll.id]: "scroll-mainnet",
  [ronin.id]: "ronin-mainnet",
  [opBNB.id]: "opbnb-mainnet",
  [opBNBTestnet.id]: "opbnb-testnet",
  [celo.id]: "celo-mainnet",
  [celoSepolia.id]: "celo-sepolia",
  [berachain.id]: "berachain-mainnet",
  [worldchain.id]: "worldchain-mainnet",
  [unichain.id]: "unichain-mainnet",
  [ink.id]: "ink-mainnet",
  [zora.id]: "zora-mainnet",
  [zoraSepolia.id]: "zora-sepolia",
  [monad.id]: "monad-mainnet",
  [monadTestnet.id]: "monad-testnet",
  [plasma.id]: "plasma-mainnet",
  [megaeth.id]: "megaeth-mainnet",
  [robinhood.id]: "robinhood-mainnet",
  [zkSync.id]: "zksync-mainnet",
  [zkSyncSepoliaTestnet.id]: "zksync-sepolia",
  [fraxtal.id]: "frax-mainnet",
  [fraxtalHoodi.id]: "frax-hoodi",
  [metis.id]: "metis-mainnet",
  [boba.id]: "boba-mainnet",
  [soneium.id]: "soneium-mainnet",
  [citrea.id]: "citrea-mainnet",
  [citreaTestnet.id]: "citrea-testnet",
});

// Public tracing failed or omitted logs in the mainnet RPC audit. Other mapped
// networks try their existing endpoint first, then the hosted tracing endpoint.
export const preferAlchemyTrace: ReadonlySet<number> = new Set([
  mainnet.id, base.id, bsc.id, arbitrum.id, optimism.id, avalanche.id,
  sonic.id, mantle.id, scroll.id, berachain.id, sei.id, worldchain.id,
  unichain.id, celo.id, ronin.id, robinhood.id, zkSync.id, opBNB.id, linea.id,
]);

// zkSync rejects Geth tracerConfig.withLog; its callTracer still returns calls.
export const traceWithoutLogs: ReadonlySet<number> = new Set([zkSync.id, zkSyncSepoliaTestnet.id]);

const activeChainsById: Record<number, Chain> = Object.fromEntries(
  Object.values(c).map((chain) => [chain.id, chain])
);

// Public endpoints are kept separate from configured overrides so the RPC console
// can expose only catalogued public URLs, and normal clients can retain fallbacks.
const publicRpcOverrides: Record<number, readonly string[]> = {
  [mainnet.id]: ["https://eth.drpc.org"],
  [base.id]: ["https://mainnet.base.org"],
  [arbitrum.id]: ["https://arb1.arbitrum.io/rpc"],
  [optimism.id]: ["https://mainnet.optimism.io"],
  [sepolia.id]: ["https://ethereum-sepolia-rpc.publicnode.com"],
  [polygon.id]: ["https://1rpc.io/matic"],
};

const runtimeCustomChains = new Map<number, CustomChain>();

export function getRpcUrlsForChain(
  chainId: number,
  policy: "configured" | "public" = "configured"
): string[] {
  if (policy === "configured" && runtimeCustomChains.has(chainId))
    return [runtimeCustomChains.get(chainId)!.rpcUrl];
  const chain = activeChainsById[chainId];
  if (!chain) return [];
  return [
    ...new Set(
      [
        ...(policy === "configured" && chainIdToCustomRpcUrl[chainId]
          ? [chainIdToCustomRpcUrl[chainId]!]
          : []),
        ...(publicRpcOverrides[chainId] ?? []),
        ...chain.rpcUrls.default.http,
      ].filter(Boolean)
    ),
  ];
}

export const chainIdToChain: Record<number, Chain> = Object.fromEntries(
  Object.values(c).map((chain) => [
    chain.id,
    {
      ...chain,
      rpcUrls: {
        ...chain.rpcUrls,
        default: {
          ...chain.rpcUrls.default,
          http: getRpcUrlsForChain(chain.id),
        },
      },
    },
  ])
);

export const etherscanChains: Record<string, ExtendedChain> =
  Object.fromEntries(
    [
      "mainnet",
      "arbitrum",
      "arbitrumNova",
      "arbitrumSepolia",
      "avalanche",
      "avalancheFuji",
      "base",
      "baseSepolia",
      "bitTorrent",
      "bitTorrentDonau",
      "bsc",
      "bscTestnet",
      "celo",
      "celoSepolia",
      "cronos",
      "cronosTestnet",
      "fantom",
      "fraxtal",
      "fraxtalHoodi",
      "gnosis",
      "linea",
      "lineaSepolia",
      "mantle",
      "manta",
      "megaeth",
      "opBNB",
      "opBNBTestnet",
      "optimism",
      "optimismSepolia",
      "plasma",
      "polygon",
      "scroll",
      "sei",
      "seiTestnet",
      "sepolia",
      "taikoHoodi",
      "wemix",
      "wemixTestnet",
      "zkSync",
      "zkSyncSepoliaTestnet",
    ]
      .filter((key) => c[key])
      .map((key) => [
        key,
        key === "plasma"
          ? { ...chainIdToChain[c[key].id], isRoutescan: true }
          : chainIdToChain[c[key].id],
      ])
  );

export const getRpcUrlForChain = (chainId: number): string | undefined =>
  getRpcUrlsForChain(chainId)[0];

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
  const iconFamilies: [string, readonly { id: number }[]][] = [
    ["abstract.svg", [{ id: 2741 }]],
    ["arc.svg", [{ id: 5042 }]],
    ["ethereum.svg", [mainnet, sepolia, hoodi]],
    ["arbitrum.svg", [arbitrum, arbitrumSepolia]],
    ["arbitrum-nova.svg", [arbitrumNova]],
    ["avalanche.svg", [avalanche, avalancheFuji]],
    ["aurora.svg", [aurora]],
    ["base.svg", [base, baseSepolia]],
    ["berachain.svg", [berachain, { id: 80069 }]],
    ["beam.svg", [{ id: 4337 }, { id: 13337 }]],

    ["boba.svg", [boba, { id: 28882 }]],
    ["bsc.svg", [bsc, bscTestnet]],
    ["celo.webp", [celo, celoSepolia]],
    ["citrea.svg", [citrea, citreaTestnet]],
    ["chiliz.svg", [{ id: 88888 }, { id: 88882 }]],
    ["conflux.svg", [confluxESpace]],
    ["cronos.svg", [cronos, cronosTestnet]],

    ["fantom.svg", [fantom]],
    ["filecoin.webp", [filecoin]],
    ["fraxtal.svg", [fraxtal, fraxtalHoodi]],
    ["fuse.svg", [fuse]],
    ["gnosis.webp", [gnosis, { id: 10200 }]],
    ["gunz.svg", [{ id: 43419 }]],
    ["hemi.svg", [{ id: 43111 }, { id: 743111 }]],

    ["ink.svg", [ink, { id: 763373 }]],
    ["iotex.svg", [iotex]],
    ["kaia.svg", [kaia]],
    ["katana.svg", [{ id: 737373 }]],

    ["linea.svg", [linea, lineaSepolia]],
    ["manta-pacific.svg", [manta, mantaSepoliaTestnet]],
    ["mantle.svg", [mantle, { id: 5003 }]],
    ["megaeth.svg", [megaeth, { id: 6343 }]],
    ["metis-andromeda.svg", [metis]],
    ["monad.svg", [monad]],
    ["nibiru.svg", [{ id: 6900 }, { id: 6911 }]],

    ["opbnb.png", [opBNB, opBNBTestnet]],
    ["optimism.svg", [optimism, optimismSepolia]],
    ["plasma.svg", [plasma, { id: 9746 }]],
    ["polygon.svg", [polygon, polygonAmoy]],

    ["robinhood.svg", [robinhood]],
    ["ronin.svg", [ronin]],
    ["scroll.webp", [scroll]],
    ["sei.svg", [sei, seiTestnet]],
    ["sonic.svg", [sonic, { id: 14601 }]],
    ["step.svg", [{ id: 1234 }]],
    ["mode.svg", [{ id: 34443 }, { id: 919 }]],
    ["soneium.svg", [{ id: 1868 }, { id: 1946 }]],

    ["taiko.svg", [taikoHoodi, { id: 167000 }]],
    ["telos.svg", [telos]],
    ["unichain.svg", [unichain, { id: 1301 }]],
    ["wanchain.png", [wanchain]],
    ["wemix.svg", [wemix, wemixTestnet]],
    ["worldchain.svg", [worldchain, { id: 4801 }]],
    ["xdc.svg", [{ id: 50 }, { id: 51 }]],
    ["zksync.webp", [zkSync, zkSyncSepoliaTestnet]],
    ["zora.svg", [zora, zoraSepolia]],
  ];
  for (const [file, chains] of iconFamilies) {
    for (const chain of chains) res[chain.id] = `${basePath}/${file}`;
  }
  for (const chain of Object.values(directoryNetworks))
    res[chain.id] = chain.iconUrl;

  Object.keys(chainIdToChain).map((_chainId) => {
    const chainId = Number(_chainId);

    if (!res[chainId]) {
      res[chainId] =
        `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&size=128&url=${chainIdToChain[chainId].blockExplorers?.default.url}`;
    }
  });

  return res;
})();

/** All active networks, deduplicated by chain ID. Selection stays with each caller. */
export const networks = Object.values(chainIdToChain);
export const networkRegistry = chainIdToChain;

export type NetworkIdentity = { id: number; name: string; testnet?: boolean };
export type NetworkOption = { label: string; value: number; image?: string };
const directoryNetworksById = Object.fromEntries(
  Object.values(directoryNetworks).map((chain) => [chain.id, chain])
);
export const getNetworkName = (chainId: number, fallback?: string) =>
  networkRegistry[chainId]?.name ??
  directoryNetworksById[chainId]?.name ??
  providerNetworkMetadata[chainId]?.name ??
  fallback ??
  `Chain ${chainId}`;
export const getNetworkIcon = (chainId: number, fallback?: string) =>
  chainIdToImage[chainId] ?? fallback;

/** Provider-only networks may supply a name without becoming RPC-supported. */
export function getNetworkOptions(
  allowed: readonly (number | NetworkIdentity)[] = networks
): NetworkOption[] {
  const seen = new Set<number>();
  return allowed
    .flatMap((entry) => {
      const id = typeof entry === "number" ? entry : entry.id;
      if (seen.has(id) || (isRetiredChain(id) && !runtimeCustomChains.has(id)))
        return [];
      const network =
        networkRegistry[id] ?? (typeof entry === "number" ? undefined : entry);
      if (!network) return [];
      seen.add(id);
      return [
        {
          value: id,
          label: getNetworkName(id, network.name),
          image: getNetworkIcon(id, "/chainIcons/network.svg"),
        },
      ];
    })
    .sort((a, b) =>
      a.value === 1 ? -1 : b.value === 1 ? 1 : a.label.localeCompare(b.label)
    );
}

export function getGroupedNetworkOptions(
  allowed: readonly NetworkIdentity[] = networks,
  testnetsFirst = false
) {
  const byId = new Map(allowed.map((chain) => [chain.id, chain]));
  return (testnetsFirst ? [true, false] : [false, true]).map((testnet) => ({
    label: testnet ? "Testnets" : "Mainnets",
    options: getNetworkOptions(allowed).filter(
      (option) =>
        Boolean(
          networkRegistry[option.value]?.testnet ??
            byId.get(option.value)?.testnet
        ) === testnet
    ),
  }));
}

export const networkOptions = getNetworkOptions();

// Browser-owned definitions are installed only after shared storage is loaded.
// Built-in snapshots stay separate so removing an override restores the catalog.
export const builtinNetworks = { ...chainIdToChain };
export function getRuntimeCustomChain(id: number) {
  return runtimeCustomChains.get(id);
}
export function applyCustomNetworks(entries: readonly CustomChain[]) {
  if (typeof window === "undefined") return;
  for (const id of runtimeCustomChains.keys()) {
    if (builtinNetworks[id]) chainIdToChain[id] = builtinNetworks[id];
    else delete chainIdToChain[id];
  }
  runtimeCustomChains.clear();
  for (const entry of entries) {
    runtimeCustomChains.set(entry.id, entry);
    chainIdToChain[entry.id] = defineChain({
      id: entry.id,
      name: entry.name,
      nativeCurrency: {
        name: entry.symbol,
        symbol: entry.symbol,
        decimals: entry.decimals,
      },
      rpcUrls: { default: { http: [entry.rpcUrl] } },
      ...(entry.explorerUrl
        ? {
            blockExplorers: {
              default: {
                name: `${entry.name} Explorer`,
                url: entry.explorerUrl,
              },
            },
          }
        : {}),
      testnet: entry.testnet,
    });
  }
  networks.splice(0, networks.length, ...Object.values(chainIdToChain));
  networkOptions.splice(0, networkOptions.length, ...getNetworkOptions());
}
