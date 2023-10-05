export const txExplorers: {
  [label: string]: {
    baseUrl: string;
    isTestnet?: boolean;
  };
} = {
  Arbiscan: {
    baseUrl: "https://arbiscan.io/tx/",
  },
  Avaxscan: {
    baseUrl: "https://snowtrace.io/tx/",
  },
  "BlockSec (Mainnet)": {
    baseUrl: "https://phalcon.blocksec.com/tx/eth/", // TODO: add option to select networks
  },
  "BlockSec (Arbitrum)": {
    baseUrl: "https://phalcon.blocksec.com/tx/arbitrum/",
  },
  "BlockSec (Avalanche)": {
    baseUrl: "https://phalcon.blocksec.com/tx/avax/",
  },
  "BlockSec (BSC)": {
    baseUrl: "https://phalcon.blocksec.com/tx/bsc/",
  },
  "BlockSec (Cronos)": {
    baseUrl: "https://phalcon.blocksec.com/tx/cro/",
  },
  "BlockSec (Fantom)": {
    baseUrl: "https://phalcon.blocksec.com/tx/ftm/",
  },
  "BlockSec (Optimism)": {
    baseUrl: "https://phalcon.blocksec.com/tx/optimism/",
  },
  "BlockSec (Goerli)": {
    baseUrl: "https://phalcon.blocksec.com/tx/goerli/",
    isTestnet: true,
  },
  "BlockSec (Polygon)": {
    baseUrl: "https://phalcon.blocksec.com/tx/polygon/",
  },
  "BlockSec (Sepolia)": {
    baseUrl: "https://phalcon.blocksec.com/tx/sepolia/",
    isTestnet: true,
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
  "Etherscan (Mainnet)": {
    baseUrl: "https://etherscan.io/tx/",
  },
  "Etherscan (Goerli)": {
    baseUrl: "https://goerli.etherscan.io/tx/",
    isTestnet: true,
  },
  "Etherscan (Sepolia)": {
    baseUrl: "https://sepolia.etherscan.io/tx/",
    isTestnet: true,
  },
  "Ethtx.info (Mainnet)": {
    baseUrl: "https://ethtx.info/mainnet/", // TODO: add option to select networks
  },
  "Ethtx.info (Goerli)": {
    baseUrl: "https://ethtx.info/goerli/",
    isTestnet: true,
  },
  FTMscan: {
    baseUrl: "https://ftmscan.com/tx/",
  },
  "Openchain (Mainnet)": {
    baseUrl: "https://openchain.xyz/trace/ethereum/",
  },
  "Openchain (Arbitrum)": {
    baseUrl: "https://openchain.xyz/trace/arbitrum/",
  },
  "Openchain (Avalanche)": {
    baseUrl: "https://openchain.xyz/trace/avalanche/",
  },
  "Openchain (BSC)": {
    baseUrl: "https://openchain.xyz/trace/binance/",
  },
  "Openchain (Fantom)": {
    baseUrl: "https://openchain.xyz/trace/fantom/",
  },
  "Openchain (Optimism)": {
    baseUrl: "https://openchain.xyz/trace/optimism/",
  },
  "Openchain (Polygon)": {
    baseUrl: "https://openchain.xyz/trace/polygon/",
  },
  Optiscan: {
    baseUrl: "https://optimistic.etherscan.io/tx/",
  },
  Polyscan: {
    baseUrl: "https://polygonscan.com/tx/",
  },
  "Tenderly (Mainnet)": {
    baseUrl: "https://dashboard.tenderly.co/tx/mainnet/", // TODO: add option to select networks
  },
  "Tenderly (Arbitrum)": {
    baseUrl: "https://dashboard.tenderly.co/tx/arbitrum/",
  },
  "Tenderly (Avalanche)": {
    baseUrl: "https://dashboard.tenderly.co/tx/avalanche-mainnet/",
  },
  "Tenderly (BSC)": {
    baseUrl: "https://dashboard.tenderly.co/tx/bsc-mainnet/",
  },
  "Tenderly (Cronos)": {
    baseUrl: "https://dashboard.tenderly.co/tx/cronos/",
  },
  "Tenderly (Fantom)": {
    baseUrl: "https://dashboard.tenderly.co/tx/fantom/",
  },
  "Tenderly (Gnosis)": {
    baseUrl: "https://dashboard.tenderly.co/tx/gnosis-chain/",
  },
  "Tenderly (Goerli)": {
    baseUrl: "https://dashboard.tenderly.co/tx/goerli/",
    isTestnet: true,
  },
  "Tenderly (Optimism)": {
    baseUrl: "https://dashboard.tenderly.co/tx/optimistic/",
  },
  "Tenderly (Polygon)": {
    baseUrl: "https://dashboard.tenderly.co/tx/polygon/",
  },
  "Tenderly (Sepolia)": {
    baseUrl: "https://dashboard.tenderly.co/tx/sepolia/",
    isTestnet: true,
  },
  TokenFlow: {
    baseUrl: "https://app.tokenflow.live/anytx/mainnet/",
  },
  Viewblock: {
    baseUrl: "https://viewblock.io/starknet/tx/",
  },
};
