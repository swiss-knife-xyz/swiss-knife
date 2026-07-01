import subdomains from "@/subdomains";

export const subdomainToInfo = {
  [subdomains.CALLDATA.base]: {
    emoji: "📞",
    label: "Calldata",
    description:
      "Decode calldata into human-readable format without needing contract ABI",
  },
  [subdomains.CONTRACT.base]: {
    emoji: "📄",
    label: "Contract Explorer",
    description:
      "Interact with any smart contract - read & write functions, storage slots, and raw calldata",
  },
  [subdomains.APPS.base]: {
    emoji: "🏪",
    label: "Web3 App Store",
    description:
      "Access any dapp with the power of ETH.sh decoder as middleware",
  },
  [subdomains.WALLET.base]: {
    emoji: "💰",
    label: "Wallet Bridge",
    description: "Connect your wallet from one browser to another",
  },
  [subdomains.MIGRATE.base]: {
    emoji: "🚚",
    label: "Migrate",
    description: "Sweep tokens from your wallet to another address in a batch",
  },
  [subdomains["7702BEAT"].base]: {
    emoji: "👑",
    label: "7702 Beat",
    description:
      "Stats about 7702 adoption across EVM chains, Wallets and Dapps",
  },
  [subdomains.USDC_PAY.base]: {
    emoji: "💵",
    label: "USDC Pay",
    description: "Create shareable payment links for USDC transfers",
  },
  [subdomains.TRANSACT.base]: {
    emoji: "💸",
    label: "Transact",
    description:
      "Send custom calldata to any contract or deploy a new contract",
  },
  [subdomains.UNISWAP.base]: {
    emoji: "🦄",
    label: "Uniswap V4",
    description:
      "Convert ticks to prices, calculate swap amounts & provide liquidity",
  },
  [subdomains.EXPLORER.base]: {
    emoji: "🔍",
    label: "Explorer",
    description:
      "View any address/ENS or transaction across all EVM explorers instantly",
  },
  [subdomains.STORAGE_SLOTS.base]: {
    emoji: "🗄️",
    label: "Storage Slots",
    description:
      "Query custom, EIP-1967, or ERC-7201 storage slots for any EVM contract",
  },
  [subdomains.CONTRACT_DIFF.base]: {
    emoji: "⚖️",
    label: "Contract Diff",
    description:
      "Compare and highlight differences between deployed smart contracts",
  },
  [subdomains.SAFE.base]: {
    emoji: "🔒",
    label: "Safe",
    description: "Verify signatures & calldata for your Safe{Wallet}",
  },
  [subdomains.CONVERTER.base]: {
    emoji: "🔄",
    label: "Converter",
    description:
      "Convert between wei, gwei, ether, hex, decimal, keccak256, and more",
  },
  [subdomains.SOLIDITY.base]: {
    emoji: "📜",
    label: "Solidity",
    description: "Compile Solidity contracts directly in your browser",
  },
  [subdomains.ENS.base]: {
    emoji: "🔗",
    label: "ENS",
    description: "View ENS history & CCIP resolve visualization",
  },
  [subdomains.DETERMINE_ADDRESS.base]: {
    emoji: "📝",
    label: "Determine Address",
    description: "Calculate contract address using CREATE or CREATE2 opcode",
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
  [subdomains.CHARACTER_COUNTER.base]: {
    emoji: "🔢",
    label: "Character Counter",
    description: "Count characters in any string or substring",
  },
  [subdomains.FOUNDRY.base]: {
    emoji: "🛠️",
    label: "Foundry",
    description: "Visualize and collapse Foundry stack traces and more",
  },
  [subdomains.SIWE.base]: {
    emoji: "🔐",
    label: "SIWE Validator",
    description:
      "Validate EIP-4361 Sign-In With Ethereum messages with auto-fix and signing",
  },
  [subdomains.FAUCET.base]: {
    emoji: "🚰",
    label: "Faucets",
    description:
      "Find live testnet faucets and track when each faucet is ready to claim again",
  },
};
