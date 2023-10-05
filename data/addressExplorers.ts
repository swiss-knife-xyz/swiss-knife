export const addressExplorers: {
  [label: string]: {
    baseUrl: string;
    forContracts?: boolean;
    isTestnet?: boolean;
  };
} = {
  ABIw1nt3r: {
    baseUrl: "https://abi.w1nt3r.xyz/mainnet/",
    forContracts: true,
  },
  Arbiscan: {
    baseUrl: "https://arbiscan.io/address/",
  },
  Basescan: {
    baseUrl: "https://basescan.org/address/",
  },
  Blockscan: {
    baseUrl: "https://blockscan.com/address/",
  },
  Breadcrumbs: {
    baseUrl: "https://www.breadcrumbs.app/reports/",
  },
  BscScan: {
    baseUrl: "https://bscscan.com/address/",
  },
  Bytegraph: {
    baseUrl: "https://bytegraph.xyz/contract/",
    forContracts: true,
  },
  CeloScan: {
    baseUrl: "https://celoscan.io/address/",
  },
  ContractReader: {
    baseUrl: "https://www.contractreader.io/contract/",
    forContracts: true,
  },
  Debank: {
    baseUrl: "https://debank.com/profile/",
  },
  "DecompileTools (Mainnet)": {
    baseUrl: "https://decompile.tools/contract/1/",
    forContracts: true,
  },
  "DecompileTools (Arbitrum)": {
    baseUrl: "https://decompile.tools/contract/42161/",
    forContracts: true,
  },
  "DecompileTools (Arbitrum Goerli)": {
    baseUrl: "https://decompile.tools/contract/42163/",
    forContracts: true,
    isTestnet: true,
  },
  "DecompileTools (Avalanche)": {
    baseUrl: "https://decompile.tools/contract/43114/",
    forContracts: true,
  },
  "DecompileTools (Avalanche Fuji Testnet)": {
    baseUrl: "https://decompile.tools/contract/43113/",
    forContracts: true,
    isTestnet: true,
  },
  "DecompileTools (BSC)": {
    baseUrl: "https://decompile.tools/contract/56/",
    forContracts: true,
  },
  "DecompileTools (BSC Testnet)": {
    baseUrl: "https://decompile.tools/contract/97/",
    forContracts: true,
    isTestnet: true,
  },
  "DecompileTools (Fantom)": {
    baseUrl: "https://decompile.tools/contract/250/",
    forContracts: true,
  },
  "DecompileTools (Fantom Testnet)": {
    baseUrl: "https://decompile.tools/contract/4002/",
    forContracts: true,
  },
  "DecompileTools (Goerli)": {
    baseUrl: "https://decompile.tools/contract/5/",
    forContracts: true,
    isTestnet: true,
  },
  "DecompileTools (Optimism)": {
    baseUrl: "https://decompile.tools/contract/10/",
    forContracts: true,
  },
  "DecompileTools (Optimism Goerli Testnet)": {
    baseUrl: "https://decompile.tools/contract/420/",
    forContracts: true,
    isTestnet: true,
  },
  "DecompileTools (Polygon)": {
    baseUrl: "https://decompile.tools/contract/137/",
    forContracts: true,
  },
  "DecompileTools (Polygon Mumbai Testnet)": {
    baseUrl: "https://decompile.tools/contract/80001/",
    forContracts: true,
    isTestnet: true,
  },
  Dedaub: {
    baseUrl: "https://library.dedaub.com/ethereum/address/",
    forContracts: true,
  },
  "Etherscan (Mainnet)": {
    baseUrl: "https://etherscan.io/address/",
  },
  "Etherscan (Goerli)": {
    baseUrl: "https://goerli.etherscan.io/address/",
    isTestnet: true,
  },
  "Etherscan (Sepolia)": {
    baseUrl: "https://sepolia.etherscan.io/address/",
    isTestnet: true,
  },
  Ethtective: {
    baseUrl: "https://ethtective.com/address/",
  },
  FTMScan: {
    baseUrl: "https://ftmscan.com/address/",
  },
  GnosisScan: {
    baseUrl: "https://gnosisscan.io/address/",
  },
  Impersonator: {
    baseUrl: "https://www.impersonator.xyz/?address=",
  },
  "MetaSleuth (Mainnet)": {
    baseUrl: "https://metasleuth.io/result/eth/",
  },
  "MetaSleuth (Arbitrum)": {
    baseUrl: "https://metasleuth.io/result/arbitrum/",
  },
  "MetaSleuth (Avalanche)": {
    baseUrl: "https://metasleuth.io/result/avalanche/",
  },
  "MetaSleuth (Base)": {
    baseUrl: "https://metasleuth.io/result/base/",
  },
  "MetaSleuth (BSC)": {
    baseUrl: "https://metasleuth.io/result/bsc/",
  },
  "MetaSleuth (Cronos)": {
    baseUrl: "https://metasleuth.io/result/cronos/",
  },
  "MetaSleuth (Fantom)": {
    baseUrl: "https://metasleuth.io/result/fantom/",
  },
  "MetaSleuth (Linea)": {
    baseUrl: "https://metasleuth.io/result/linea/",
  },
  "MetaSleuth (Moonbeam)": {
    baseUrl: "https://metasleuth.io/result/moonbeam/",
  },
  "MetaSleuth (Optimism)": {
    baseUrl: "https://metasleuth.io/result/optimism/",
  },
  "MetaSleuth (Polygon)": {
    baseUrl: "https://metasleuth.io/result/polygon/",
  },
  "MetaSleuth (Tron)": {
    baseUrl: "https://metasleuth.io/result/tron/",
  },
  Monobase: {
    baseUrl: "https://monobase.xyz/address/",
  },
  Nansen: {
    baseUrl: "https://pro.nansen.ai/wallet-profiler?address=",
  },
  OpenSea: {
    baseUrl: "https://opensea.io/",
  },
  "OpenSeaPro Profile": {
    baseUrl: "https://pro.opensea.io/profile/",
  },
  "OpenSeaPro Collection": {
    baseUrl: "https://pro.opensea.io/collection/",
  },
  OptimismScan: {
    baseUrl: "https://optimistic.etherscan.io/address/",
  },
  PolygonScan: {
    baseUrl: "https://polygonscan.com/address/",
  },
  Remix: {
    baseUrl: "https://remix.ethereum.org/#address=",
    forContracts: true,
  },
  SnowTrace: {
    baseUrl: "https://snowtrace.io/address/",
  },
  "Tenderly (Mainnet)": {
    baseUrl: "https://dashboard.tenderly.co/contract/mainnet/",
    forContracts: true,
  },
  "Tenderly (Arbitrum)": {
    baseUrl: "https://dashboard.tenderly.co/contract/arbitrum/",
    forContracts: true,
  },
  "Tenderly (Avalanche)": {
    baseUrl: "https://dashboard.tenderly.co/contract/avalanche-mainnet/",
    forContracts: true,
  },
  "Tenderly (BSC)": {
    baseUrl: "https://dashboard.tenderly.co/contract/bsc-mainnet/",
    forContracts: true,
  },
  "Tenderly (Cronos)": {
    baseUrl: "https://dashboard.tenderly.co/contract/cronos/",
    forContracts: true,
  },
  "Tenderly (Fantom)": {
    baseUrl: "https://dashboard.tenderly.co/contract/fantom/",
    forContracts: true,
  },
  "Tenderly (Gnosis)": {
    baseUrl: "https://dashboard.tenderly.co/contract/gnosis-chain/",
    forContracts: true,
  },
  "Tenderly (Goerli)": {
    baseUrl: "https://dashboard.tenderly.co/contract/goerli/",
    forContracts: true,
    isTestnet: true,
  },
  "Tenderly (Optimism)": {
    baseUrl: "https://dashboard.tenderly.co/contract/optimistic/",
    forContracts: true,
  },
  "Tenderly (Polygon)": {
    baseUrl: "https://dashboard.tenderly.co/contract/polygon/",
    forContracts: true,
  },
  "Tenderly (Sepolia)": {
    baseUrl: "https://dashboard.tenderly.co/contract/sepolia/",
    forContracts: true,
    isTestnet: true,
  },
  "UpgradeHub (Mainnet)": {
    baseUrl: "https://upgradehub.xyz/diffs/etherscan/",
    forContracts: true,
  },
  "UpgradeHub (Arbitrum)": {
    baseUrl: "https://upgradehub.xyz/diffs/arbiscan/",
    forContracts: true,
  },
  "UpgradeHub (Avalanche)": {
    baseUrl: "https://upgradehub.xyz/diffs/snowtrace/",
    forContracts: true,
  },
  "UpgradeHub (BSC)": {
    baseUrl: "https://upgradehub.xyz/diffs/bscscan/",
    forContracts: true,
  },
  "UpgradeHub (Cronos)": {
    baseUrl: "https://upgradehub.xyz/diffs/cronoscan/",
    forContracts: true,
  },
  "UpgradeHub (Fantom)": {
    baseUrl: "https://upgradehub.xyz/diffs/ftmscan/",
    forContracts: true,
  },
  "UpgradeHub (Moonbeam)": {
    baseUrl: "https://upgradehub.xyz/diffs/moonbeam/",
    forContracts: true,
  },
  "UpgradeHub (Optimism)": {
    baseUrl: "https://upgradehub.xyz/diffs/optimistic.etherscan/",
    forContracts: true,
  },
  "UpgradeHub (Polygon)": {
    baseUrl: "https://upgradehub.xyz/diffs/polygonscan/",
    forContracts: true,
  },
  Zapper: {
    baseUrl: "https://zapper.fi/account/",
  },
  Zerion: {
    baseUrl: "https://app.zerion.io/",
  },
};
