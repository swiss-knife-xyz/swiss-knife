import subdomains from "@/subdomains";

export const subdomainToInfo = {
  [subdomains.CALLDATA.base]: {
    emoji: "📞",
    label: "Calldata",
    description:
      "Decode calldata into human-readable format without needing contract ABI",
  },
  [subdomains.EXPLORER.base]: {
    emoji: "🔍",
    label: "Explorer",
    description:
      "View any address/ENS or transaction across all EVM explorers instantly",
  },
  [subdomains.CONVERTER.base]: {
    emoji: "🔄",
    label: "Converter",
    description:
      "Convert between wei, gwei, ether, hex, decimal, keccak256, and more",
  },
  [subdomains.TRANSACT.base]: {
    emoji: "💸",
    label: "Transact",
    description:
      "Send custom calldata to any contract or deploy a new contract",
  },
  [subdomains.CONSTANTS.base]: {
    emoji: "📊",
    label: "Constants",
    description:
      "Common Ethereum constants like zero address, max uint256, and more",
  },
  [subdomains.EPOCH_CONVERTER.base]: {
    emoji: "⏰",
    label: "Epoch Converter",
    description:
      "Convert timestamps to dates or get Ethereum blocks for specific times",
  },
  [subdomains.STORAGE_SLOTS.base]: {
    emoji: "🗄️",
    label: "Storage Slots",
    description: "Query custom or EIP-1967 storage slots for any EVM contract",
  },
  [subdomains.UNISWAP.base]: {
    emoji: "🦄",
    label: "Uniswap V3",
    description: "Convert Uniswap V3 ticks to prices for any token pair",
  },
  [subdomains.CHARACTER_COUNTER.base]: {
    emoji: "🔢",
    label: "Character Counter",
    description: "Count characters in any string or substring",
  },
  [subdomains.CONTRACT_ADDRESS.base]: {
    emoji: "📝",
    label: "Contract Address",
    description: "Calculate contract address for a given deployer and nonce",
  },
  [subdomains.CONTRACT_DIFF.base]: {
    emoji: "⚖️",
    label: "Contract Diff",
    description:
      "Compare and highlight differences between deployed smart contracts",
  },
  [subdomains.FOUNDRY.base]: {
    emoji: "🛠️",
    label: "Foundry",
    description: "Visualize and collapse Foundry stack traces and more",
  },
};
