export type ToolOgArtwork = "cow" | "apps" | "ens-ccip" | "usdc-pay";

export type ToolOgCard = {
  title: string;
  description: string[];
  artwork?: ToolOgArtwork;
  titleSize?: number;
  artworkSrc?: string;
  detail?: { label: string; value: string };
};

export const toolOgCards = {
  "calldata-cowswap": {
    title: "CowSwap TWAP Verifier",
    description: [
      "Decode a ComposableCoW TWAP order and",
      "verify its appData hash against the CoW API.",
    ],
    artwork: "cow",
  },
  "calldata-decoder": {
    title: "Calldata Decoder",
    description: ["Decode any calldata, even without an ABI ✨"],
  },
  "calldata-viem-error-simulate": {
    title: "Viem Error Simulate",
    description: [
      "Paste a viem contract error and",
      "simulate on Tenderly to debug 🪲",
    ],
  },
  "converter-eth": {
    title: "Ethereum Unit Converter",
    description: ["Convert Ether to Wei, Gwei and vice versa 🔀"],
    titleSize: 66,
  },
  "converter-hexadecimal": {
    title: "Hexadecimal Converter",
    description: ["Convert between hex, decimal, text and binary 🔢"],
    titleSize: 66,
  },
  "converter-keccak256": {
    title: "Keccak256 Converter",
    description: [
      "Hash strings or hex with keccak256",
      "and calculate 4-byte selectors.",
    ],
  },
  "converter-padding": {
    title: "Padding",
    description: ["Left or right pad any hex value to 32 bytes."],
  },
  "converter-address-checksum": {
    title: "Address Checksum",
    description: ["Convert Ethereum addresses to checksum format 🔬"],
  },
  converter: {
    title: "Converter",
    description: ["All your essential unit converters in one place 🧮"],
  },
  constants: {
    title: "Constants",
    description: [
      "Frequently used Ethereum constants",
      "in one place, ready to copy 📋",
    ],
  },
  "epoch-converter": {
    title: "Epoch Converter",
    description: [
      "Convert Unix timestamps to dates and",
      "find Ethereum blocks by date and time.",
    ],
  },
  "storage-slots": {
    title: "Storage Slots",
    description: [
      "Query custom, EIP-1967 and ERC-7201",
      "storage slots for any EVM smart contract 👀",
    ],
  },
  "character-counter": {
    title: "Character Counter",
    description: ["Get the length of any input string 📏"],
  },
  "determine-address": {
    title: "Determine Contract Address",
    description: ["Calculate contract addresses", "using CREATE or CREATE2 🧠"],
    titleSize: 61,
  },
  "contract-diff": {
    title: "Contract Diff",
    description: [
      "Compare and highlight source code differences",
      "between smart contracts across blockchains ⚖️",
    ],
  },
  foundry: {
    title: "Foundry",
    description: ["Tools to visualize and collapse", "Foundry stack traces 🔎"],
  },
  "foundry-forge-stack-tracer-ui": {
    title: "Forge Stack Tracer UI",
    description: ["Visualize and collapse Forge test stack traces 🔎"],
  },
  "wallet-bridge": {
    title: "Wallet Bridge 🌉",
    description: [
      "Connect your wallet to any desktop dapp,",
      "across browsers or from your phone.",
    ],
  },
  "wallet-ds-proxy": {
    title: "🛡️ DSProxy Connect",
    description: [
      "🔗 Connect your DSProxy contract to dapps",
      "and execute transactions.",
    ],
  },
  "wallet-coinbase-smart-wallet": {
    title: "Coinbase Smart Wallet",
    description: [
      "Connect your smart wallet to dapps",
      "and transact with your recovery address.",
    ],
    titleSize: 66,
  },
  "wallet-signatures": {
    title: "Signatures",
    description: ["🧮 Sign and verify messages", "and EIP-712 typed data."],
  },
  "ens-history": {
    title: "ENS History",
    description: [
      "Check IPFS content changes, ownership transfers",
      "and more over time 📜",
    ],
  },
  "ens-ccip": {
    title: "ENS CCIP Read Viz",
    description: [
      "Visualize off-chain ENS resolution",
      "and the delay at each step.",
    ],
    artwork: "ens-ccip",
  },
  "7702beat": {
    title: "7702 Beat",
    description: [
      "Track EIP-7702 adoption across",
      "EVM chains, wallets and dapps.",
    ],
  },
  "safe-calldata-decoder": {
    title: "Safe Calldata Decoder",
    description: [
      "Decode MultiSend transaction calldata",
      "from Safe wallets without an ABI ✨",
    ],
  },
  rpc: {
    title: "Raw RPC Console",
    description: ["Query blockchain data with JSON-RPC", "across Ethereum and EVM chains."],
  },
  "gas-cost": {
    title: "Cross-chain Gas Cost",
    description: [
      "Compare transaction gas costs across chains",
      "using current gas prices.",
    ],
  },
  "safe-eip-712-hash": {
    title: "Safe & EIP-712 Hashes",
    description: [
      "🧮 Calculate Safe transaction hashes",
      "and verify EIP-712 typed data locally.",
    ],
  },
  safe: {
    title: "Safe",
    description: ["Decode MultiSend calldata 👜", "and verify EIP-712 hashes."],
  },
  apps: {
    title: "Web3 App Store",
    description: [
      "Your Web3 operating system.",
      "Access dapps with the ETH.sh decoder.",
    ],
    artwork: "apps",
  },
  "solidity-compiler": {
    title: "🖨️ Solidity Compiler",
    description: ["Compile Solidity contracts", "and generate ABIs instantly."],
  },
  "usdc-pay": {
    title: "USDC Pay",
    description: [
      "Transfer USDC on Base without gas fees.",
      "Powered by x402.",
    ],
    artwork: "usdc-pay",
  },
  siwe: {
    title: "🔑 SIWE Validator",
    description: [
      "Validate, lint and debug",
      "Sign in with Ethereum messages.",
    ],
  },
  transact: {
    title: "Transact",
    description: [
      "Send custom calldata to any contract",
      "or deploy a new contract 💳",
    ],
  },
  uniswap: {
    title: "Uniswap",
    description: [
      "Calculate prices, manage liquidity",
      "and swap tokens on Uniswap 🧮",
    ],
  },
  contract: {
    title: "Explorer",
    description: [
      "Read and write smart contract functions,",
      "inspect storage and use raw calldata.",
    ],
  },
  verify: {
    title: "Cross-explorer Verification",
    description: [
      "Verify contracts across Etherscan,",
      "Blockscout, Routescan and Sourcify.",
    ],
    titleSize: 62,
  },
  "calldata-encoder": {
    title: "Calldata Encoder",
    description: [
      "Encode function arguments",
      "into Ethereum transaction calldata.",
    ],
  },
  explorers: {
    title: "Explorer Directory",
    description: [
      "Browse an address, ENS name or transaction",
      "across EVM explorers and dashboards.",
    ],
  },
  "transact-send-tx": {
    title: "Send Transaction",
    description: [
      "Send custom calldata to a contract",
      "or deploy a contract with raw bytecode.",
    ],
  },
  "uniswap-tick-to-price": {
    title: "Uniswap V4 Tick to Price",
    description: [
      "Convert Uniswap v4 ticks into prices",
      "for any token pair.",
    ],
    titleSize: 65,
  },
  "uniswap-pool-price-to-target": {
    title: "Uniswap V4 Pool Price to Target",
    description: [
      "Calculate the swaps needed to move",
      "a pool toward your target price.",
    ],
    titleSize: 54,
  },
  "uniswap-initialize-pool": {
    title: "Uniswap V4 Initialize Pool",
    description: [
      "Configure tokens, fees, tick spacing",
      "and initial prices for a new pool.",
    ],
    titleSize: 62,
  },
  "uniswap-add-liquidity": {
    title: "Uniswap V4 Add Liquidity",
    description: [
      "Configure price ranges and add liquidity",
      "to Uniswap v4 pools.",
    ],
    titleSize: 65,
  },
  "uniswap-swap": {
    title: "Uniswap V4 Swap",
    description: [
      "Inspect pools, quote swaps",
      "and swap tokens on Uniswap v4.",
    ],
  },
  "uniswap-positions": {
    title: "Uniswap V4 Positions",
    description: ["View and manage your", "Uniswap v4 liquidity positions."],
  },
} satisfies Record<string, ToolOgCard>;

export type ToolOgSlug = keyof typeof toolOgCards;
