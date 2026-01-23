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
    label: "Uniswap V4",
    description:
      "Convert ticks to prices, calculate swap amounts & provide liquidity",
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
  [subdomains.WALLET.base]: {
    emoji: "💰",
    label: "Wallet",
    description: "Connect your wallet from one browser to another",
  },
  [subdomains.ENS.base]: {
    emoji: "🔗",
    label: "ENS",
    description: "View ENS history & CCIP resolve visualization",
  },
  [subdomains.SAFE.base]: {
    emoji: "🔒",
    label: "Safe",
    description: "Verify signatures & calldata for your Safe{Wallet}",
  },
  [subdomains["7702BEAT"].base]: {
    emoji: "👑",
    label: "7702 Beat",
    description:
      "Stats about 7702 adoption across EVM chains, Wallets and Dapps",
  },
  [subdomains.APPS.base]: {
    emoji: "🏪",
    label: "Web3 App Store",
    description:
      "Access any dapp with the power of ETH.sh decoder as middleware",
  },
  [subdomains.SOLIDITY.base]: {
    emoji: "📜",
    label: "Solidity",
    description: "Compile Solidity contracts directly in your browser",
  },
  [subdomains.USDC_PAY.base]: {
    emoji: "💵",
    label: "USDC Pay",
    description: "Create shareable payment links for USDC transfers",
  },
};
