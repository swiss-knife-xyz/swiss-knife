import { ExplorerData, ExplorersData } from "@/types";
import { CHAINLABEL_KEY, TX_KEY, c } from "./common";

export const txExplorers: ExplorersData = {
  Arbitrum: {
    urlLayout: `https://${CHAINLABEL_KEY}arbiscan.io/tx/${TX_KEY}`,
    chainIdToLabel: {
      [c.arbitrum.id]: "",
      [c.arbitrumNova.id]: "nova.",
      [c.arbitrumSepolia.id]: "sepolia.",
    },
  },
  Basescan: {
    urlLayout: `https://${CHAINLABEL_KEY}basescan.org/tx/${TX_KEY}`,
    chainIdToLabel: {
      [c.base.id]: "",
      [c.baseSepolia.id]: "sepolia.",
    },
  },
  Blockhead: {
    urlLayout: `https://blockhead.info/explorer/${CHAINLABEL_KEY}/tx/${TX_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "ethereum",
      [c.arbitrum.id]: "arbitrum-one",
      [c.arbitrumSepolia.id]: "arbitrum-sepolia",
      [c.aurora.id]: "aurora",
      [c.avalanche.id]: "avalanche",
      [c.avalancheFuji.id]: "avalanche-fuji",
      [c.base.id]: "base",
      [c.bsc.id]: "bsc",
      [c.bscTestnet.id]: "bsc-testnet",
      [c.celo.id]: "celo",
      [c.celoAlfajores.id]: "celo-alfajores",
      [c.cronos.id]: "cronos",
      [c.evmos.id]: "evmos",
      [c.fantom.id]: "fantom",
      [c.filecoin.id]: "filecoin",
      [c.gnosis.id]: "gnosis",
      [c.klaytn.id]: "klaytn-cypress",
      [c.linea.id]: "linea",
      [c.mantle.id]: "mantle",
      [c.metis.id]: "metis",
      [c.moonbeam.id]: "moonbeam",
      [c.moonriver.id]: "moonriver",
      [c.okc.id]: "oktc",
      [c.opBNB.id]: "opbnb",
      [c.optimism.id]: "optimism",
      [c.optimismSepolia.id]: "optimism-sepolia",
      [c.polygon.id]: "polygon",
      [c.polygonMumbai.id]: "polygon-mumbai",
      [c.polygonZkEvm.id]: "polygon-zkevm",
      [c.scroll.id]: "scroll",
      [c.scrollSepolia.id]: "scroll-sepolia",
      [c.sepolia.id]: "ethereum-sepolia",
      [c.telos.id]: "telos",
      [c.wanchain.id]: "wanchain",
      [c.zora.id]: "zora",
      [c.zoraTestnet.id]: "zora-goerli",
    },
  },
  Blockscout: {
    urlLayout: `https://${CHAINLABEL_KEY}.blockscout.com/tx/${TX_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "eth",
      [c.base.id]: "base",
      [c.holesky.id]: "eth-holesky",
      [c.optimism.id]: "optimism",
      [c.optimismSepolia.id]: "optimism-sepolia",
      [c.polygonZkEvm.id]: "zkevm",
      [c.zkSync.id]: "zksync",
      [c.zkSyncSepoliaTestnet.id]: "zksync-sepolia",
    },
  },
  Bloxy: {
    urlLayout: `https://bloxy.info/tx/${TX_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "",
    },
  },
  Celoscan: {
    urlLayout: `https://${CHAINLABEL_KEY}celoscan.io/tx/${TX_KEY}`,
    chainIdToLabel: {
      [c.celo.id]: "",
      [c.celoAlfajores.id]: "alfajores.",
    },
  },
  // Cruise: {
  //   urlLayout: `https://cruise.supremacy.team/detail/?tx=${TX_KEY}`,
  //   chainIdToLabel: {
  //     [c.mainnet.id]: "",
  //   },
  // },
  EigenPhi: {
    urlLayout: `https://tx.eigenphi.io/analyseTransaction?chain=ALL&tx=${TX_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "",
      [c.arbitrum.id]: "",
      [c.avalanche.id]: "",
      [c.bsc.id]: "",
      [c.cronos.id]: "",
      [c.fantom.id]: "",
      [c.optimism.id]: "",
      [c.polygon.id]: "",
    },
  },
  Ethernow: {
    // "www" is required here, unless doesn't load
    urlLayout: `https://www.ethernow.xyz/tx/${TX_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "",
    },
  },
  Etherscan: {
    urlLayout: `https://etherscan.io/tx/${TX_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "",
    },
  },
  "Etherscan (Testnet)": {
    urlLayout: `https://${CHAINLABEL_KEY}.etherscan.io/tx/${TX_KEY}`,
    chainIdToLabel: {
      [c.goerli.id]: "goerli",
      [c.sepolia.id]: "sepolia",
    },
  },
  "Ethtx.info": {
    urlLayout: `https://ethtx.info/${CHAINLABEL_KEY}/${TX_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "mainnet",
      [c.goerli.id]: "goerli",
    },
  },
  FTMscan: {
    urlLayout: `https://${CHAINLABEL_KEY}ftmscan.com/tx/${TX_KEY}`,
    chainIdToLabel: {
      [c.fantom.id]: "",
      [c.fantomTestnet.id]: "testnet.",
    },
    faviconUrl: "https://ftmscan.com/assets/generic/html/favicon-light.ico",
    faviconWhite: true,
  },
  Openchain: {
    urlLayout: `https://openchain.xyz/trace/${CHAINLABEL_KEY}/${TX_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "ethereum",
      [c.arbitrum.id]: "arbitrum",
      [c.avalanche.id]: "avalanche",
      [c.bsc.id]: "binance",
      [c.cronos.id]: "cronos",
      [c.fantom.id]: "fantom",
      [c.optimism.id]: "optimism",
      [c.polygon.id]: "polygon",
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
  Parsec: {
    urlLayout: `https://parsec.fi/${CHAINLABEL_KEY}/tx/${TX_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "eth",
      [c.arbitrum.id]: "arb",
      [c.avalanche.id]: "avax",
      [c.base.id]: "base",
      [c.canto.id]: "canto",
      [c.manta.id]: "manta",
      [c.optimism.id]: "opt",
      [c.scroll.id]: "scroll",
      [c.zkSync.id]: "zksync",
    },
  },
  Phalcon: {
    urlLayout: `https://explorer.phalcon.xyz/tx/${CHAINLABEL_KEY}/${TX_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "eth",
      [c.arbitrum.id]: "arbitrum",
      [c.avalanche.id]: "avax",
      [c.bsc.id]: "bsc",
      [c.cronos.id]: "cro",
      [c.fantom.id]: "ftm",
      [c.goerli.id]: "goerli",
      [c.optimism.id]: "optimism",
      [c.polygon.id]: "polygon",
      [c.sepolia.id]: "sepolia",
    },
  },
  PolygonScan: {
    urlLayout: `https://${CHAINLABEL_KEY}polygonscan.com/tx/${TX_KEY}`,
    chainIdToLabel: {
      [c.polygon.id]: "",
      [c.polygonMumbai.id]: "mumbai.",
      [c.polygonZkEvm.id]: "zkevm.",
      [c.polygonZkEvmTestnet.id]: "testnet-zkevm.",
    },
    faviconUrl: "https://polygonscan.com/assets/generic/html/favicon-light.ico",
  },
  "0xPPL": {
    urlLayout: `https://0xppl.com/tx/${TX_KEY}`,
    // Supports all EVM chains
    chainIdToLabel: (() => {
      let res: ExplorerData["chainIdToLabel"] = {};

      Object.values(c).map((val) => {
        res[val.id] = "";
      });
      return res;
    })(),
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
      [c.moonbeam.id]: c.moonbeam.id.toString(),
      [c.okc.id]: c.okc.id.toString(),
      [c.optimism.id]: c.optimism.id.toString(),
      [c.polygon.id]: c.polygon.id.toString(),
      [c.polygonZkEvm.id]: c.polygonZkEvm.id.toString(),
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
      [c.goerli.id]: "goerli",
      [c.optimism.id]: "optimistic",
      [c.polygon.id]: "polygon",
      [c.sepolia.id]: "sepolia",
    },
  },
  TokenFlow: {
    urlLayout: `https://app.tokenflow.live/anytx/mainnet/${TX_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "",
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
      [c.canto.id]: c.canto.id.toString(),
      [c.celo.id]: c.celo.id.toString(),
      [c.cronos.id]: c.cronos.id.toString(),
      [c.dfk.id]: c.dfk.id.toString(),
      [c.dogechain.id]: c.dogechain.id.toString(),
      [c.evmos.id]: c.evmos.id.toString(),
      [c.fantom.id]: c.fantom.id.toString(),
      [c.fuse.id]: c.fuse.id.toString(),
      [c.gnosis.id]: c.gnosis.id.toString(),
      [c.harmonyOne.id]: c.harmonyOne.id.toString(),
      [c.iotex.id]: c.iotex.id.toString(),
      [c.klaytn.id]: c.klaytn.id.toString(),
      [c.linea.id]: c.linea.id.toString(),
      [c.mantle.id]: c.mantle.id.toString(),
      [c.metis.id]: c.metis.id.toString(),
      [c.moonbeam.id]: c.moonbeam.id.toString(),
      [c.moonriver.id]: c.moonriver.id.toString(),
      [c.okc.id]: c.okc.id.toString(),
      [c.optimism.id]: c.optimism.id.toString(),
      [c.polygon.id]: c.polygon.id.toString(),
      [c.polygonZkEvm.id]: c.polygonZkEvm.id.toString(),
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
};
