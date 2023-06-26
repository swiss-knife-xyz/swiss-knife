export const txExplorers: {
  [label: string]: {
    baseUrl: string;
  };
} = {
  Arbiscan: {
    baseUrl: "https://arbiscan.io/tx/",
  },
  Avaxscan: {
    baseUrl: "https://snowtrace.io/tx/",
  },
  BlockSec: {
    baseUrl: "https://phalcon.blocksec.com/tx/eth/", // TODO: add option to select networks
  },
  Bloxy: {
    baseUrl: "https://bloxy.info/tx/",
  },
  Celoscan: {
    baseUrl: "https://celoscan.io/tx/",
  },
  Cruise: {
    baseUrl: "https://cruise.supremacy.team/detail/?tx=",
  },
  EigenPhi: {
    baseUrl: "https://tx.eigenphi.io/analyseTransaction?chain=ALL&tx=",
  },
  Etherscan: {
    baseUrl: "https://etherscan.io/tx/",
  },
  "Ethtx.info": {
    baseUrl: "https://ethtx.info/mainnet/", // TODO: add option to select networks
  },
  FTMscan: {
    baseUrl: "https://ftmscan.com/tx/",
  },
  Openchain: {
    baseUrl: "https://openchain.xyz/trace/ethereum/",
  },
  Optiscan: {
    baseUrl: "https://optimistic.etherscan.io/tx/",
  },
  Polyscan: {
    baseUrl: "https://polygonscan.com/tx/",
  },
  Tenderly: {
    baseUrl: "https://dashboard.tenderly.co/tx/mainnet/", // TODO: add option to select networks
  },
  Viewblock: {
    baseUrl: "https://viewblock.io/starknet/tx/",
  },
};
