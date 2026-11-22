import { activeExplorers } from "./activeExplorers";
import { ExplorerData, ExplorersData } from "@/types";
import { CHAINLABEL_KEY, TX_KEY, c, explorerChains } from "./common";

export const txExplorers: ExplorersData = activeExplorers({
  Arbitrum: {
    urlLayout: `https://${CHAINLABEL_KEY}arbiscan.io/tx/${TX_KEY}`,
    chainIdToLabel: {
      [c.arbitrum.id]: "",
      [c.arbitrumNova.id]: "nova.",
      [c.arbitrumSepolia.id]: "sepolia.",
    },
  },
  Arkham: {
    urlLayout: `https://arkm.com/explorer/tx/${TX_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "",
      [c.arbitrum.id]: "",
      [c.avalanche.id]: "",
      [c.base.id]: "",
      [c.bsc.id]: "",
      [c.linea.id]: "",
      [c.manta.id]: "",
      [c.mantle.id]: "",
      [c.optimism.id]: "",
      [c.polygon.id]: "",
      [c.sonic.id]: "",
    },
  },
  Basescan: {
    urlLayout: `https://${CHAINLABEL_KEY}basescan.org/tx/${TX_KEY}`,
    chainIdToLabel: {
      [c.base.id]: "",
      [c.baseSepolia.id]: "sepolia.",
    },
  },
  Blockscout: {
    urlLayout: `https://${CHAINLABEL_KEY}.blockscout.com/tx/${TX_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "eth",
      [c.hoodi.id]: "eth-hoodi",
      [c.celoSepolia.id]: "celo-sepolia",
      [c.base.id]: "base",
      [c.optimism.id]: "optimism",
      [c.optimismSepolia.id]: "optimism-sepolia",
      [c.zkSync.id]: "zksync",
      [c.zkSyncSepoliaTestnet.id]: "zksync-sepolia",
      [c.megaeth.id]: "megaeth",
    },
  },
  Bitquery: {
    urlLayout: `https://explorer.bitquery.io/ethereum/tx/${TX_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "",
    },
  },
  Celoscan: {
    urlLayout: `https://${CHAINLABEL_KEY}celoscan.io/tx/${TX_KEY}`,
    chainIdToLabel: {
      [c.celo.id]: "",
    },
  },
  // Cruise: {
  //   urlLayout: `https://cruise.supremacy.team/detail/?tx=${TX_KEY}`,
  //   chainIdToLabel: {
  //     [c.mainnet.id]: "",
  //   },
  // },
  Etherscan: {
    urlLayout: `https://etherscan.io/tx/${TX_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "",
    },
  },
  "Etherscan (Testnet)": {
    urlLayout: `https://${CHAINLABEL_KEY}.etherscan.io/tx/${TX_KEY}`,
    chainIdToLabel: {
      [c.sepolia.id]: "sepolia",
      [c.hoodi.id]: "hoodi",
    },
  },
  "evm.now": {
    urlLayout: `https://evm.now/tx/${TX_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "",
    },
  },
  "Citrea Explorer": {
    urlLayout: `https://explorer.mainnet.citrea.xyz/tx/${TX_KEY}`,
    chainIdToLabel: {
      [c.citrea.id]: "",
    },
  },
  "Citrea Explorer (Testnet)": {
    urlLayout: `https://explorer.testnet.citrea.xyz/tx/${TX_KEY}`,
    chainIdToLabel: {
      [c.citreaTestnet.id]: "",
    },
  },
  "MegaETH Explorer": {
    urlLayout: `https://mega.etherscan.io/tx/${TX_KEY}`,
    chainIdToLabel: {
      [c.megaeth.id]: "",
    },
  },
  SeiScan: {
    urlLayout: `https://${CHAINLABEL_KEY}seiscan.io/tx/${TX_KEY}`,
    chainIdToLabel: {
      [c.sei.id]: "",
      [c.seiTestnet.id]: "testnet.",
    },
  },
  FTMscan: {
    urlLayout: `https://explorer.fantom.network/transactions/${TX_KEY}`,
    chainIdToLabel: {
      [c.fantom.id]: "",
    },
  },
  OptimismScan: {
    urlLayout: `https://${CHAINLABEL_KEY}etherscan.io/tx/${TX_KEY}`,
    chainIdToLabel: {
      [c.optimism.id]: "optimistic.",
      [c.optimismSepolia.id]: "sepolia-optimism.",
    },
  },
  Otterscan: {
    urlLayout: `https://sepolia.otterscan.io/tx/${TX_KEY}`,
    chainIdToLabel: {
      [c.sepolia.id]: "",
    },
  },
  Phalcon: {
    urlLayout: `https://app.blocksec.com/phalcon/explorer/tx/${CHAINLABEL_KEY}/${TX_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "eth",
      [c.arbitrum.id]: "arbitrum",
      [c.avalanche.id]: "avax",
      [c.bsc.id]: "bsc",
      [c.cronos.id]: "cro",
      [c.fantom.id]: "ftm",
      [c.optimism.id]: "optimism",
      [c.polygon.id]: "polygon",
      [c.sepolia.id]: "sepolia",
    },
  },
  PolygonScan: {
    urlLayout: `https://${CHAINLABEL_KEY}polygonscan.com/tx/${TX_KEY}`,
    chainIdToLabel: {
      [c.polygon.id]: "",
      [c.polygonAmoy.id]: "amoy.",
    },
    faviconUrl: "/explorerIcons/polygonscan.png",
  },
  Sentio: {
    urlLayout: `https://app.sentio.xyz/tx/${CHAINLABEL_KEY}/${TX_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: c.mainnet.id.toString(),
      [c.arbitrum.id]: c.arbitrum.id.toString(),
      [c.avalanche.id]: c.avalanche.id.toString(),
      [c.aurora.id]: c.aurora.id.toString(),
      [c.bsc.id]: c.bsc.id.toString(),
      [c.cronos.id]: c.cronos.id.toString(),
      [c.fantom.id]: c.fantom.id.toString(),
      [c.optimism.id]: c.optimism.id.toString(),
      [c.polygon.id]: c.polygon.id.toString(),
      [c.zkSync.id]: c.zkSync.id.toString(),
    },
    faviconUrl: "https://app.sentio.xyz/favicon.ico",
  },
  Snowtrace: {
    urlLayout: `https://${CHAINLABEL_KEY}snowtrace.io/tx/${TX_KEY}`,
    chainIdToLabel: {
      [c.avalanche.id]: "",
      [c.avalancheFuji.id]: "testnet.",
    },
  },
  Sonicscan: {
    urlLayout: `https://sonicscan.org/tx/${TX_KEY}`,
    chainIdToLabel: {
      [c.sonic.id]: "",
    },
  },
  Tenderly: {
    urlLayout: `https://dashboard.tenderly.co/tx/${CHAINLABEL_KEY}/${TX_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "mainnet",
      [c.arbitrum.id]: "arbitrum",
      [c.avalanche.id]: "avalanche-mainnet",
      [c.bsc.id]: "bsc-mainnet",
      [c.cronos.id]: "cronos",
      [c.fantom.id]: "fantom",
      [c.gnosis.id]: "gnosis-chain",
      [c.optimism.id]: "optimistic",
      [c.polygon.id]: "polygon",
      [c.sepolia.id]: "sepolia",
    },
  },
  VFatScan: {
    urlLayout: `https://scan.vf.at/tx/${CHAINLABEL_KEY}/${TX_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: c.mainnet.id.toString(),
      [c.arbitrum.id]: c.arbitrum.id.toString(),
      [c.arbitrumNova.id]: c.arbitrumNova.id.toString(),
      [c.aurora.id]: c.aurora.id.toString(),
      [c.avalanche.id]: c.avalanche.id.toString(),
      [c.base.id]: c.base.id.toString(),
      [c.boba.id]: c.boba.id.toString(),
      [c.bsc.id]: c.bsc.id.toString(),
      [c.celo.id]: c.celo.id.toString(),
      [c.cronos.id]: c.cronos.id.toString(),
      [c.dfk.id]: c.dfk.id.toString(),
      [c.fantom.id]: c.fantom.id.toString(),
      [c.fuse.id]: c.fuse.id.toString(),
      [c.gnosis.id]: c.gnosis.id.toString(),
      [c.iotex.id]: c.iotex.id.toString(),
      [c.klaytn.id]: c.klaytn.id.toString(),
      [c.linea.id]: c.linea.id.toString(),
      [c.mantle.id]: c.mantle.id.toString(),
      [c.metis.id]: c.metis.id.toString(),
      [c.optimism.id]: c.optimism.id.toString(),
      [c.polygon.id]: c.polygon.id.toString(),
      [c.ronin.id]: c.ronin.id.toString(),
      [c.scroll.id]: c.scroll.id.toString(),
      [c.telos.id]: c.telos.id.toString(),
      [c.wanchain.id]: c.wanchain.id.toString(),
      [c.zkSync.id]: c.zkSync.id.toString(),
    },
    faviconUrl: "https://scan.vf.at/favicon.ico",
  },
  // Viewblock: {
  //   urlLayout: `https://viewblock.io/starknet/tx/${TX_KEY}`,
  //   chainIdToLabel: {
  //     [c.starknet.id]: "",
  //   },
  // },
});
