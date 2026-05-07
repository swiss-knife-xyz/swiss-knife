const networkInfo = [
  {
    chainID: 1,
    name: "Ethereum Mainnet",
    api: `https://api.etherscan.io/api?module=contract&action=getabi&apikey=${process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY}`,
  },
  {
    chainID: 42161,
    name: "Arbitrum One",
    api: `https://api.arbiscan.io/api?module=contract&action=getabi&apikey=${process.env.NEXT_PUBLIC_ARBISCAN_API_KEY}`,
  },
  {
    chainID: 43114,
    name: "Avalanche",
    api: `https://api.snowtrace.io/api?module=contract&action=getabi&apikey=${process.env.NEXT_PUBLIC_SNOWTRACE_API_KEY}`,
  },
  {
    chainID: 56,
    name: "Binance Smart Chain",
    api: `https://api.bscscan.com/api?module=contract&action=getabi&apikey=${process.env.NEXT_PUBLIC_BSCSCAN_API_KEY}`,
  },
  {
    chainID: 250,
    name: "Fantom Opera",
    api: `https://api.ftmscan.com/api?module=contract&action=getabi&apikey=${process.env.NEXT_PUBLIC_FTMSCAN_API_KEY}`,
  },
  {
    chainID: 10,
    name: "Optimism",
    api: `https://api-optimistic.etherscan.io/api?module=contract&action=getabi&apikey=${process.env.NEXT_PUBLIC_OPTIMISM_API_KEY}`,
  },
  {
    chainID: 137,
    name: "Polygon",
    api: `https://api.polygonscan.com/api?module=contract&action=getabi&apikey=${process.env.NEXT_PUBLIC_POLYGONSCAN_API_KEY}`,
  },
  {
    chainID: 4326,
    name: "MegaETH",
    api: `https://api.etherscan.io/v2/api?chainid=4326&module=contract&action=getabi&apikey=${process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY}`,
  },
  {
    chainID: 1329,
    name: "Sei",
    api: `https://api.etherscan.io/v2/api?chainid=1329&module=contract&action=getabi&apikey=${process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY}`,
  },
  {
    chainID: 1328,
    name: "Sei Testnet",
    api: `https://api.etherscan.io/v2/api?chainid=1328&module=contract&action=getabi&apikey=${process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY}`,
  },
  {
    chainID: 11155111,
    name: "Sepolia Testnet",
    api: `https://api.etherscan.io/api?module=contract&action=getabi&apikey=${process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY}`,
    apikey: process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY,
  },
  {
    chainID: 5,
    name: "Goerli Testnet",
    api: `https://api.etherscan.io/api?module=contract&action=getabi&apikey=${process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY}`,
    apikey: process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY,
  },
];

// TODO: add missing major chains

export default networkInfo;
