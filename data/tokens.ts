/**
 * Token addresses for various networks
 */

/**
 * USDC token addresses
 * Source: https://developers.circle.com/stablecoins/docs/usdc-on-main-networks
 */
export const USDC_ADDRESSES = {
  // Base Mainnet
  BASE: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const,
  // Base Sepolia Testnet
  BASE_SEPOLIA: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const,
} as const;

/**
 * USDC ABI for common operations
 */
export const USDC_ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    type: "function",
  },
] as const;

/**
 * USDC token decimals (standard across all networks)
 */
export const USDC_DECIMALS = 6;
