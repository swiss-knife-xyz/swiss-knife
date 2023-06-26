export const addressExplorers: {
  [label: string]: {
    baseUrl: string;
    forContracts?: boolean;
  };
} = {
  ABIw1nt3r: {
    baseUrl: "https://abi.w1nt3r.xyz/mainnet/",
    forContracts: true,
  },
  Arbiscan: {
    baseUrl: "https://arbiscan.io/address/",
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
  Dedaub: {
    baseUrl: "https://library.dedaub.com/ethereum/address/",
  },
  Etherscan: {
    baseUrl: "https://etherscan.io/address/",
  },
  Ethtective: {
    baseUrl: "https://ethtective.com/address/",
  },
  FTMScan: {
    baseUrl: "https://ftmscan.com/address/",
  },
  GemAccount: {
    baseUrl: "https://www.gem.xyz/profile/",
  },
  GemCollection: {
    baseUrl: "https://www.gem.xyz/collection/",
  },
  GnosisScan: {
    baseUrl: "https://gnosisscan.io/address/",
  },
  Impersonator: {
    baseUrl: "https://www.impersonator.xyz/?address=",
  },
  Nansen: {
    baseUrl: "https://pro.nansen.ai/wallet-profiler?address=",
  },
  OpenSea: {
    baseUrl: "https://opensea.io/",
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
  Solidlint: {
    baseUrl: "https://www.solidlint.com/address/",
  },
  Zapper: {
    baseUrl: "https://zapper.fi/account/",
  },
  Zerion: {
    baseUrl: "https://app.zerion.io/",
  },
};
