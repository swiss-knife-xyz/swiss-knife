import { ExplorersData } from "@/types";
import { CHAINLABEL_KEY, TX_KEY, c } from "./common";

export const txExplorers: ExplorersData = {
  Arbiscan: {
    urlLayout: `https://arbiscan.io/tx/${TX_KEY}`,
    chainIdToLabel: {
      [c.arbitrum.id]: "",
    },
  },
  Avaxscan: {
    urlLayout: `https://snowtrace.io/tx/${TX_KEY}`,
    chainIdToLabel: {
      [c.avalanche.id]: "",
    },
  },
  Bloxy: {
    urlLayout: `https://bloxy.info/tx/${TX_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "",
    },
  },
  Celoscan: {
    urlLayout: `https://celoscan.io/tx/${TX_KEY}`,
    chainIdToLabel: {
      [c.celo.id]: "",
    },
  },
  Cruise: {
    urlLayout: `https://cruise.supremacy.team/detail/?tx=${TX_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "",
    },
  },
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
    urlLayout: `https://ethernow.xyz/tx/${TX_KEY}`,
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
    urlLayout: `https://ftmscan.com/tx/${TX_KEY}`,
    chainIdToLabel: {
      [c.fantom.id]: "",
    },
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
  Optiscan: {
    urlLayout: `https://optimistic.etherscan.io/tx/${TX_KEY}`,
    chainIdToLabel: {
      [c.optimism.id]: "",
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
  Polyscan: {
    urlLayout: `https://polygonscan.com/tx/${TX_KEY}`,
    chainIdToLabel: {
      [c.polygon.id]: "",
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
  Viewblock: {
    urlLayout: `https://viewblock.io/starknet/tx/${TX_KEY}`,
    chainIdToLabel: {
      [c.mainnet.id]: "",
    },
  },
};
