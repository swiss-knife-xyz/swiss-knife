import { ExplorersData, ExplorerData } from "@/types";
import { CHAINLABEL_KEY, ADDRESS_KEY, c, explorerChains } from "./common";

export const addressExplorers: ExplorersData = {
  ABINinja: {
    forContracts: true,
    urlLayout: `https://abi.ninja/${ADDRESS_KEY}/${CHAINLABEL_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: c.mainnet.id.toString(),
      [c.arbitrum.id]: c.arbitrum.id.toString(),
      [c.base.id]: c.base.id.toString(),
      [c.baseSepolia.id]: c.baseSepolia.id.toString(),
      [c.gnosis.id]: c.gnosis.id.toString(),
      [c.optimism.id]: c.optimism.id.toString(),
      [c.polygon.id]: c.polygon.id.toString(),
      [c.sepolia.id]: c.sepolia.id.toString(),
      [c.scroll.id]: c.scroll.id.toString(),
      [c.scrollSepolia.id]: c.scrollSepolia.id.toString(),
      [c.zkSync.id]: c.zkSync.id.toString(),
      [c.zkSyncSepoliaTestnet.id]: c.zkSyncSepoliaTestnet.id.toString(),
    },
  },
  "address.vision": {
    urlLayout: `https://address.vision/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "",
    },
    faviconUrl:
      "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='80'>👀</text></svg>",
  },
  AnyABI: {
    forContracts: true,
    urlLayout: `https://anyabi.xyz/api/get-abi/${CHAINLABEL_KEY}/${ADDRESS_KEY}`,
    // Supports all EVM chains
    chainIdToLabel: (() => {
      let res: ExplorerData["chainIdToLabel"] = {};

      explorerChains.map((val) => {
        res[val.id] = val.id.toString();
      });
      return res;
    })(),
  },
  Arbitrum: {
    urlLayout: `https://${CHAINLABEL_KEY}arbiscan.io/address/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.arbitrum.id]: "",
      [c.arbitrumNova.id]: "nova.",
      [c.arbitrumSepolia.id]: "sepolia.",
    },
  },
  Arkham: {
    urlLayout: `https://arkm.com/explorer/address/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "",
      [c.arbitrum.id]: "",
      [c.avalanche.id]: "",
      [c.base.id]: "",
      [c.blast.id]: "",
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
    urlLayout: `https://${CHAINLABEL_KEY}basescan.org/address/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.base.id]: "",
      [c.baseSepolia.id]: "sepolia.",
    },
  },
  Blockscan: {
    urlLayout: `https://blockscan.com/address/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "",
    },
  },
  Blockscout: {
    urlLayout: `https://${CHAINLABEL_KEY}.blockscout.com/address/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "eth",
      [c.hoodi.id]: "eth-hoodi",
      [c.celoSepolia.id]: "celo-sepolia",
      [c.base.id]: "base",
      [c.optimism.id]: "optimism",
      [c.optimismSepolia.id]: "optimism-sepolia",
      [c.polygonZkEvm.id]: "zkevm",
      [c.zkSync.id]: "zksync",
      [c.zkSyncSepoliaTestnet.id]: "zksync-sepolia",
      [c.megaeth.id]: "megaeth",
    },
  },
  Bitquery: {
    urlLayout: `https://explorer.bitquery.io/ethereum/address/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "",
    },
  },
  Bubblemaps: {
    forContracts: true,
    urlLayout: `https://v2.bubblemaps.io/map?address=${ADDRESS_KEY}&chain=${CHAINLABEL_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "eth",
      [c.avalanche.id]: "avalanche",
      [c.bsc.id]: "bsc",
      [c.polygon.id]: "polygon",
    },
  },
  Breadcrumbs: {
    urlLayout: `https://breadcrumbs.app/reports/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "",
      [c.polygon.id]: "",
    },
  },
  BscScan: {
    urlLayout: `https://${CHAINLABEL_KEY}bscscan.com/address/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.bsc.id]: "",
      [c.bscTestnet.id]: "testnet",
    },
  },
  Bytegraph: {
    forContracts: true,
    urlLayout: `https://bytegraph.xyz/contract/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "",
    },
  },
  CeloScan: {
    urlLayout: `https://${CHAINLABEL_KEY}celoscan.io/address/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.celo.id]: "",
    },
  },
  Codeslaw: {
    forContracts: true,
    urlLayout: `https://www.codeslaw.app/contracts/${CHAINLABEL_KEY}/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "ethereum",
      [c.arbitrum.id]: "arbitrum",
      [c.base.id]: "base",
      [c.bsc.id]: "bnbchain",
      [c.optimism.id]: "optimism",
      [c.polygon.id]: "polygon",
      [c.scroll.id]: "scroll",
      [c.sepolia.id]: "sepolia",
    },
  },
  ContractReader: {
    forContracts: true,
    urlLayout: `https://contractreader.io/contract/${CHAINLABEL_KEY}/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "mainnet",
      [c.arbitrum.id]: "arbitrum",
      [c.base.id]: "base",
      [c.bsc.id]: "bsc",
      [c.optimism.id]: "optimism",
      [c.polygon.id]: "polygon",
      [c.sepolia.id]: "sepolia",
    },
  },
  Debank: {
    urlLayout: `https://debank.com/profile/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "",
      [c.arbitrum.id]: "",
      [c.arbitrumNova.id]: "",
      [c.avalanche.id]: "",
      [c.aurora.id]: "",
      [c.boba.id]: "",
      [c.bsc.id]: "",
      [c.canto.id]: "",
      [c.celo.id]: "",
      [c.confluxESpace.id]: "",
      [c.cronos.id]: "",
      [c.dfk.id]: "",
      [c.dogechain.id]: "",
      [c.evmos.id]: "",
      [c.fantom.id]: "",
      [c.fuse.id]: "",
      [c.gnosis.id]: "",
      [c.harmonyOne.id]: "",
      [c.iotex.id]: "",
      [c.klaytn.id]: "",
      [c.metis.id]: "",
      [c.moonbeam.id]: "",
      [c.moonriver.id]: "",
      [c.okc.id]: "",
      [c.optimism.id]: "",
      [c.polygon.id]: "",
      [c.telos.id]: "",
      [c.wanchain.id]: "",
    },
  },
  Dedaub: {
    forContracts: true,
    urlLayout: `https://library.dedaub.com/${CHAINLABEL_KEY}/address/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "ethereum",
      [c.arbitrum.id]: "arbitrum",
      [c.base.id]: "base",
      [c.fantom.id]: "fantom",
    },
  },
  DethCode: {
    forContracts: true,
    urlLayout: `https://${CHAINLABEL_KEY}.deth.net/address/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "etherscan",
      [c.base.id]: "basescan",
      [c.bsc.id]: "bscscan",
      [c.bscTestnet.id]: "testnet.bscscan",
      [c.cronos.id]: "cronoscan",
      [c.fantom.id]: "ftmscan",
      [c.fantomTestnet.id]: "testnet.ftmscan",
      [c.gnosis.id]: "gnosisscan",
      [c.optimism.id]: "optimistic.etherscan",
    },
  },
  Etherscan: {
    urlLayout: `https://etherscan.io/address/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "",
    },
  },
  "Etherscan (Testnet)": {
    urlLayout: `https://${CHAINLABEL_KEY}.etherscan.io/address/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.sepolia.id]: "sepolia",
      [c.hoodi.id]: "hoodi",
    },
  },
  Ethtective: {
    urlLayout: `https://ethtective.com/address/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "",
    },
  },
  EVMCodes: {
    forContracts: true,
    urlLayout: `https://www.evm.codes/contract?address=${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "",
    },
  },
  EVMole: {
    forContracts: true,
    urlLayout: `https://evmole.xyz/#${ADDRESS_KEY}/${CHAINLABEL_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "eth",
      [c.bsc.id]: "bnb",
      [c.arbitrum.id]: "arb",
      [c.base.id]: "base",
      [c.optimism.id]: "op",
      [c.polygon.id]: "matic",
    },
  },
  "evm.now": {
    urlLayout: `https://evm.now/address/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "",
    },
  },
  FTMScan: {
    urlLayout: `https://explorer.fantom.network/address/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.fantom.id]: "",
    },
  },
  GnosisScan: {
    urlLayout: `https://gnosisscan.io/address/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.gnosis.id]: "",
    },
  },
  Impersonator: {
    urlLayout: `https://impersonator.xyz/?address=${ADDRESS_KEY}`,
    // Supports all EVM chains
    chainIdToLabel: (() => {
      let res: ExplorerData["chainIdToLabel"] = {};

      explorerChains.map((val) => {
        res[val.id] = "";
      });
      return res;
    })(),
  },
  MetaSleuth: {
    urlLayout: `https://metasleuth.io/result/${CHAINLABEL_KEY}/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "eth",
      [c.arbitrum.id]: "arbitrum",
      [c.avalanche.id]: "avalanche",
      [c.base.id]: "base",
      [c.bsc.id]: "bsc",
      [c.cronos.id]: "cronos",
      [c.fantom.id]: "fantom",
      [c.linea.id]: "linea",
      [c.moonbeam.id]: "moonbeam",
      [c.optimism.id]: "optimism",
      [c.polygon.id]: "polygon",
    },
  },
  "Citrea Explorer": {
    urlLayout: `https://explorer.mainnet.citrea.xyz/address/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.citrea.id]: "",
    },
  },
  "Citrea Explorer (Testnet)": {
    urlLayout: `https://explorer.testnet.citrea.xyz/address/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.citreaTestnet.id]: "",
    },
  },
  "MegaETH Explorer": {
    urlLayout: `https://mega.etherscan.io/address/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.megaeth.id]: "",
    },
  },
  SeiScan: {
    urlLayout: `https://${CHAINLABEL_KEY}seiscan.io/address/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.sei.id]: "",
      [c.seiTestnet.id]: "testnet.",
    },
  },
  Monobase: {
    forContracts: true,
    faviconUrl: "/explorerIcons/monobase.png",
    urlLayout: `https://monobase.xyz/${CHAINLABEL_KEY}/address/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "ethereum",
      [c.base.id]: "base",
      [c.sepolia.id]: "sepolia",
    },
  },
  Nansen: {
    urlLayout: `https://pro.nansen.ai/wallet-profiler?address=${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "",
      [c.arbitrum.id]: "",
      [c.avalanche.id]: "",
      [c.bsc.id]: "",
      [c.celo.id]: "",
      [c.fantom.id]: "",
      [c.linea.id]: "",
      [c.polygon.id]: "",
      [c.ronin.id]: "",
    },
  },
  OpenSea: {
    urlLayout: `https://opensea.io/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "",
      [c.arbitrum.id]: "",
      [c.avalanche.id]: "",
      [c.base.id]: "",
      [c.bsc.id]: "",
      [c.klaytn.id]: "",
      [c.optimism.id]: "",
      [c.polygon.id]: "",
      [c.zora.id]: "",
    },
  },
  OptimismScan: {
    urlLayout: `https://${CHAINLABEL_KEY}etherscan.io/address/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.optimism.id]: "optimistic.",
      [c.optimismSepolia.id]: "sepolia-optimism.",
    },
  },
  Otterscan: {
    urlLayout: `https://sepolia.otterscan.io/address/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.sepolia.id]: "",
    },
  },
  PolygonScan: {
    urlLayout: `https://${CHAINLABEL_KEY}polygonscan.com/address/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.polygon.id]: "",
      [c.polygonAmoy.id]: "amoy.",
    },
    faviconUrl: "/explorerIcons/polygonscan.png",
  },
  Remix: {
    forContracts: true,
    urlLayout: `https://remix.ethereum.org/#address=${ADDRESS_KEY}`,
    // Supports all EVM chains
    chainIdToLabel: (() => {
      let res: ExplorerData["chainIdToLabel"] = {};

      explorerChains.map((val) => {
        res[val.id] = "";
      });
      return res;
    })(),
  },
  Snowtrace: {
    urlLayout: `https://${CHAINLABEL_KEY}snowtrace.io/address/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.avalanche.id]: "",
      [c.avalancheFuji.id]: "testnet.",
    },
  },
  Sonicscan: {
    urlLayout: `https://sonicscan.org/address/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.sonic.id]: "",
    },
  },
  Sourcify: {
    urlLayout: `https://repo.sourcify.dev/${CHAINLABEL_KEY}/${ADDRESS_KEY}`,
    // Supports all EVM chains
    chainIdToLabel: (() => {
      let res: ExplorerData["chainIdToLabel"] = {};
      explorerChains.map((val) => {
        res[val.id] = val.id.toString();
      });
      return res;
    })(),
    forContracts: true,
  },
  Tenderly: {
    forContracts: true,
    urlLayout: `https://dashboard.tenderly.co/contract/${CHAINLABEL_KEY}/${ADDRESS_KEY}`,
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
  Thirdweb: {
    forContracts: true,
    urlLayout: `https://thirdweb.com/${CHAINLABEL_KEY}/${ADDRESS_KEY}`,
    // Supports all EVM chains
    chainIdToLabel: (() => {
      let res: ExplorerData["chainIdToLabel"] = {};

      explorerChains.map((val) => {
        res[val.id] = val.id.toString();
      });
      return res;
    })(),
  },
  VFatScan: {
    urlLayout: `https://scan.vf.at/address/${CHAINLABEL_KEY}/${ADDRESS_KEY}`,
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
  Zerion: {
    urlLayout: `https://app.zerion.io/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "",
      [c.arbitrum.id]: "",
      [c.aurora.id]: "",
      [c.avalanche.id]: "",
      [c.bsc.id]: "",
      [c.fantom.id]: "",
      [c.gnosis.id]: "",
      [c.optimism.id]: "",
      [c.polygon.id]: "",
    },
  },
};
