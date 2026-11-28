// Ethereum mainnet transactions; hashes also link directly to their Etherscan records.
export const traceExamples = [
  {
    title: "Safe multicall",
    detail: "Approve USDC · supply to Compound",
    hash: "0x86091a6ec8e5e370cd01bf5fbf25e260ef177800b4ce57fd24d699cfc5ea9b06",
    chainId: 1,
  },
  {
    title: "Uniswap revert",
    detail: "Reverted router multicall",
    hash: "0xe7d46475f7999ca5f5aa8b44af29750edd6ac72c949a6a91c782d39863ca748a",
    chainId: 1,
  },
  {
    title: "Lido staking",
    detail: "ETH → stETH",
    hash: "0x666c758dc2e6133313cecb3f10209bfc21c090e5afd8952e4dad1411be9c7195",
    chainId: 1,
  },
  {
    title: "Zora NFT mint",
    detail: "Token #20000",
    hash: "0xb0f5a58df0ced3e28f113af534b0e6327e7be66539a9d794f95034fc28cd3647",
    chainId: 1,
  },
] as const;
