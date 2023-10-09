import { ExplorersData, ExplorerData } from "@/types";
import { CHAINLABEL_KEY, ADDRESS_KEY, c } from "./common";

export const addressExplorers: ExplorersData = {
  ABIw1nt3r: {
    urlLayout: `https://abi.w1nt3r.xyz/mainnet/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "",
    },
    forContracts: true,
  },
  AnyABI: {
    urlLayout: `https://anyabi.xyz/api/get-abi/${CHAINLABEL_KEY}/${ADDRESS_KEY}`,
    // Supports all EVM chains
    chainIdToLabel: (() => {
      let res: ExplorerData["chainIdToLabel"] = {};

      Object.values(c).map((val) => {
        res[val.id] = val.id.toString();
      });
      return res;
    })(),
    forContracts: true,
  },
  Arbiscan: {
    urlLayout: `https://arbiscan.io/address/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.arbitrum.id]: "",
    },
  },
  Basescan: {
    urlLayout: `https://basescan.org/address/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.base.id]: "",
    },
  },
  Blockscan: {
    urlLayout: `https://blockscan.com/address/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "",
    },
  },
  Bloxy: {
    urlLayout: `https://bloxy.info/address/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "",
    },
  },
  Bubblemaps: {
    urlLayout: `https://app.bubblemaps.io/${CHAINLABEL_KEY}/token/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "eth",
      [c.arbitrum.id]: "arbi",
      [c.avalanche.id]: "avax",
      [c.bsc.id]: "bsc",
      [c.cronos.id]: "cro",
      [c.fantom.id]: "ftm",
      [c.polygon.id]: "poly",
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
    urlLayout: `https://bscscan.com/address/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.bsc.id]: "",
    },
  },
  Bytegraph: {
    urlLayout: `https://bytegraph.xyz/contract/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "",
    },
    forContracts: true,
  },
  CeloScan: {
    urlLayout: `https://celoscan.io/address/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.celo.id]: "",
    },
  },
  ContractReader: {
    urlLayout: `https://www.contractreader.io/contract/${CHAINLABEL_KEY}/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "mainnet",
      [c.arbitrum.id]: "arbitrum",
      [c.base.id]: "base",
      [c.bsc.id]: "bsc",
      [c.goerli.id]: "goerli",
      [c.optimism.id]: "optimism",
      [c.polygon.id]: "polygon",
      [c.sepolia.id]: "sepolia",
    },
    forContracts: true,
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
  DecompileTools: {
    urlLayout: `https://decompile.tools/contract/${CHAINLABEL_KEY}/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: c.mainnet.id.toString(),
      [c.arbitrum.id]: c.arbitrum.id.toString(),
      [c.arbitrumGoerli.id]: c.arbitrumGoerli.id.toString(),
      [c.avalanche.id]: c.avalanche.id.toString(),
      [c.avalancheFuji.id]: c.avalancheFuji.id.toString(),
      [c.bsc.id]: c.bsc.id.toString(),
      [c.bscTestnet.id]: c.bscTestnet.id.toString(),
      [c.fantom.id]: c.fantom.id.toString(),
      [c.fantomTestnet.id]: c.fantomTestnet.id.toString(),
      [c.goerli.id]: c.goerli.id.toString(),
      [c.optimism.id]: c.optimism.id.toString(),
      [c.optimismGoerli.id]: c.optimismGoerli.id.toString(),
      [c.polygon.id]: c.polygon.id.toString(),
      [c.polygonMumbai.id]: c.polygonMumbai.id.toString(),
    },
    forContracts: true,
  },
  Dedaub: {
    urlLayout: `https://library.dedaub.com/${CHAINLABEL_KEY}/address/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "ethereum",
      [c.arbitrum.id]: "arbitrum",
      [c.base.id]: "base",
      [c.fantom.id]: "fantom",
    },
    forContracts: true,
  },
  DethCode: {
    urlLayout: `https://${CHAINLABEL_KEY}.deth.net/address/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "etherscan",
      [c.base.id]: "basescan",
      [c.baseGoerli.id]: "goerli.basescan",
      [c.bsc.id]: "bscscan",
      [c.bscTestnet.id]: "testnet.bscscan",
      [c.cronos.id]: "cronoscan",
      [c.fantom.id]: "ftmscan",
      [c.fantomTestnet.id]: "testnet.ftmscan",
      [c.gnosis.id]: "gnosisscan",
      [c.goerli.id]: "goerli.etherscan",
      [c.optimism.id]: "optimistic.etherscan",
    },
  },
  EarniFi: {
    urlLayout: `https://earni.fi/?address=${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "",
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
      [c.goerli.id]: "goerli",
      [c.sepolia.id]: "sepolia",
    },
  },
  Ethtective: {
    urlLayout: `https://ethtective.com/address/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "",
    },
  },
  FTMScan: {
    urlLayout: `https://ftmscan.com/address/${ADDRESS_KEY}`,
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
    chainIdToLabel: {
      [c.mainnet.id]: "",
    },
  },
  Llamafolio: {
    urlLayout: `https://llamafolio.com/address/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "",
    },
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
  Monobase: {
    urlLayout: `https://${CHAINLABEL_KEY}monobase.xyz/address/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "",
      [c.goerli.id]: "goerli.",
      [c.sepolia.id]: "sepolia.",
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
  "OpenSeaPro Profile": {
    urlLayout: `https://pro.opensea.io/profile/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "",
    },
  },
  "OpenSeaPro Collection": {
    urlLayout: `https://pro.opensea.io/collection/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "",
    },
    forContracts: true,
  },
  "OpenSea Testnet": {
    urlLayout: `https://testnets.opensea.io/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.goerli.id]: "",
      [c.arbitrumGoerli.id]: "",
      [c.avalancheFuji.id]: "",
      [c.baseGoerli.id]: "",
      [c.bscTestnet.id]: "",
      [c.optimismGoerli.id]: "",
      [c.polygonMumbai.id]: "",
      [c.sepolia.id]: "",
      [c.zoraTestnet.id]: "",
    },
  },
  OptimismScan: {
    urlLayout: `https://optimistic.etherscan.io/address/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.optimism.id]: "",
    },
  },
  PolygonScan: {
    urlLayout: `https://polygonscan.com/address/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.polygon.id]: "",
    },
  },
  Remix: {
    urlLayout: `https://remix.ethereum.org/#address=${ADDRESS_KEY}`,
    // Supports all EVM chains
    chainIdToLabel: (() => {
      let res: ExplorerData["chainIdToLabel"] = {};

      Object.values(c).map((val) => {
        res[val.id] = "";
      });
      return res;
    })(),
    forContracts: true,
  },
  Scopescan: {
    urlLayout: `https://scopescan.ai/address/${ADDRESS_KEY}?network=${CHAINLABEL_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "eth",
      [c.bsc.id]: "bsc",
      [c.arbitrum.id]: "arb",
      [c.polygon.id]: "polygon",
    },
  },
  SnowTrace: {
    urlLayout: `https://snowtrace.io/address/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.avalanche.id]: "",
    },
  },
  Tenderly: {
    urlLayout: `https://dashboard.tenderly.co/contract/${CHAINLABEL_KEY}/${ADDRESS_KEY}`,
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
    forContracts: true,
  },
  UpgradeHub: {
    urlLayout: `https://upgradehub.xyz/diffs/${CHAINLABEL_KEY}/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "etherscan",
      [c.arbitrum.id]: "arbiscan",
      [c.avalanche.id]: "snowtrace",
      [c.bsc.id]: "bscscan",
      [c.cronos.id]: "cronoscan",
      [c.fantom.id]: "ftmscan",
      [c.moonbeam.id]: "moonbeam",
      [c.optimism.id]: "optimistic.etherscan",
      [c.polygon.id]: "polygonscan",
    },
    forContracts: true,
  },
  Zapper: {
    urlLayout: `https://zapper.xyz/account/${ADDRESS_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "",
      [c.avalanche.id]: "",
      [c.arbitrum.id]: "",
      [c.aurora.id]: "",
      [c.bsc.id]: "",
      [c.base.id]: "",
      [c.celo.id]: "",
      [c.cronos.id]: "",
      [c.fantom.id]: "",
      [c.gnosis.id]: "",
      [c.moonriver.id]: "",
      [c.optimism.id]: "",
      [c.polygon.id]: "",
    },
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
