// Successful Ethereum mainnet transactions. samples.test.ts checks captured
// public receipts and inputs; the task handoff includes the live-render comparison.
// `preview` is static display copy only: samples.test.ts verifies every
// function/parameter name and claim against the captured transaction.
export const decoderSamples = [
  {
    id: "nft-mint",
    label: "NFT mint · Zora",
    chainId: 1,
    hash: "0xb0f5a58df0ced3e28f113af534b0e6327e7be66539a9d794f95034fc28cd3647",
    explorerUrl:
      "https://etherscan.io/tx/0xb0f5a58df0ced3e28f113af534b0e6327e7be66539a9d794f95034fc28cd3647",
    preview: {
      calls: [{ name: "mint", args: ["data", "bidShares"] }],
      // Fields of the `data` tuple argument.
      detail: {
        arg: "data",
        fields: ["tokenURI", "metadataURI", "contentHash", "metadataHash"],
      },
      tokenId: 20000,
      note: "Mints Zora token #20000",
    },
  },
  {
    id: "safe-multicall",
    label: "Safe multicall · USDC supply",
    chainId: 1,
    hash: "0x86091a6ec8e5e370cd01bf5fbf25e260ef177800b4ce57fd24d699cfc5ea9b06",
    explorerUrl:
      "https://etherscan.io/tx/0x86091a6ec8e5e370cd01bf5fbf25e260ef177800b4ce57fd24d699cfc5ea9b06",
    preview: {
      calls: [
        { name: "approve", args: ["spender", "value"] },
        { name: "supply", args: ["asset", "amount"] },
      ],
      outer: "execTransaction",
      note: "2 calls inside Safe execTransaction",
    },
  },
] as const;
