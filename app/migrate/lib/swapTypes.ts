/**
 * Type definitions + hardcoded popular target list for the Swap tab. Live
 * quotes flow through `useSwapQuotes`; this file just defines the shape the
 * panel / preview modal consume and the static "popular chips" we seed the
 * dropdown with before the live token list lands.
 */
import { PortfolioToken } from "./portfolioApi";
import type { BridgeManualRoute, BridgeQuoteResponse } from "./bridgeApi";
import { SwapQuoteResponse } from "./swapQuoteApi";

export interface TargetTokenEntry {
  address: string; // "native" for the chain's native token
  symbol: string;
  name: string;
  decimals: number;
  logoUrl?: string;
  /** Static popularity rank — lower = shown first as a chip. */
  popularRank?: number;
}

export interface SwapQuote {
  /** Same-chain 0x route or cross-chain Socket/Bungee route. */
  routeKind?: "swap" | "bridge";
  /** Source token being swapped. */
  source: PortfolioToken;
  /** Amount of source being swapped (raw, in source decimals). */
  sourceAmountWei: bigint;
  /** Estimated output of target token (raw, in target decimals). 0n while
   *  the quote is still in flight or after a fetch error. */
  targetAmountWei: bigint;
  /** USD value of the target output. 0 while pending/errored. */
  targetUsd: number;
  /** Whether an ERC-20 approve is needed before the swap. Native swaps skip. */
  needsApprove: boolean;
  /** True while this row's quote is still loading. */
  isPending?: boolean;
  /** Populated when the quote fetch errored for this row. */
  errorMessage?: string;
  /** USD value of the walletchan integrator fee for this row, when we can
   *  price it. `undefined` when the fee token isn't priced or the row is a
   *  fee-free wrap/unwrap. */
  feeUsd?: number;
  /** True when the taker qualifies for the premium (sWCHAN-staker) fee
   *  tier. We bubble it up so the panel can label the tier accurately. */
  isPremiumFee?: boolean;
  /** Raw 0x quote response — needed downstream to execute the swap (carries
   *  `transaction` and `allowanceTarget`). Absent for wrap/unwrap rows; the
   *  builder synthesizes the call locally in that case. */
  quoteData?: SwapQuoteResponse;
  /** Raw Socket/Bungee quote response for bridge rows. */
  bridgeData?: BridgeQuoteResponse;
  /** Selected executable route from `bridgeData.result.manualRoutes[0]`. */
  bridgeRoute?: BridgeManualRoute;
  /** Destination chain for bridge rows. */
  destinationChainId?: number;
  destinationChainName?: string;
  routeName?: string;
  estimatedTimeSeconds?: number;
  gasFeeUsd?: number;
  feeBps?: string;
}

const NATIVE_ETH_LOGO = "/chainIcons/ethereum.svg";
const NATIVE_AVAX_LOGO = "/chainIcons/avalanche.svg";

/**
 * Hardcoded popular target tokens per chain. Mirrors walletchan's
 * POPULAR_PER_CHAIN list. Hydrated chains-of-interest land first in the
 * dropdown as chips; the live token list (see `useSwapTokenList`) supplies
 * the rest.
 *
 * Addresses are checksummed but compared lowercased in the dropdown.
 */
export const POPULAR_TARGETS_BY_CHAIN: Record<number, TargetTokenEntry[]> = {
  1: [
    { address: "native", symbol: "ETH", name: "Ether", decimals: 18, logoUrl: NATIVE_ETH_LOGO, popularRank: 0 },
    { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", symbol: "USDC", name: "USD Coin", decimals: 6, logoUrl: "https://assets.coingecko.com/coins/images/6319/small/usdc.png", popularRank: 1 },
    { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", symbol: "USDT", name: "Tether USD", decimals: 6, logoUrl: "https://assets.coingecko.com/coins/images/325/small/Tether.png", popularRank: 2 },
    { address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", symbol: "WBTC", name: "Wrapped BTC", decimals: 8, logoUrl: "https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png", popularRank: 3 },
    { address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", symbol: "WETH", name: "Wrapped Ether", decimals: 18, logoUrl: "https://assets.coingecko.com/coins/images/2518/small/weth.png", popularRank: 4 },
    { address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", symbol: "DAI", name: "Dai Stablecoin", decimals: 18, logoUrl: "https://assets.coingecko.com/coins/images/9956/small/Badge_Dai.png", popularRank: 5 },
  ],
  8453: [
    { address: "native", symbol: "ETH", name: "Ether", decimals: 18, logoUrl: NATIVE_ETH_LOGO, popularRank: 0 },
    { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", symbol: "USDC", name: "USD Coin", decimals: 6, logoUrl: "https://assets.coingecko.com/coins/images/6319/small/usdc.png", popularRank: 1 },
    { address: "0x4200000000000000000000000000000000000006", symbol: "WETH", name: "Wrapped Ether", decimals: 18, logoUrl: "https://assets.coingecko.com/coins/images/2518/small/weth.png", popularRank: 2 },
    // Pinned manually — mirrors walletchan's EXTRA_TOKENS_PER_CHAIN; the 0x
    // token list doesn't always include it. Logo asset copied locally so we
    // aren't dependent on walletchan.com remaining reachable.
    { address: "0xBa5ED0000e1CA9136a695f0a848012A16008B032", symbol: "WCHAN", name: "WalletChan", decimals: 18, logoUrl: "/external/walletchan-icon.png", popularRank: 3 },
  ],
  42161: [
    { address: "native", symbol: "ETH", name: "Ether", decimals: 18, logoUrl: NATIVE_ETH_LOGO, popularRank: 0 },
    { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", symbol: "USDC", name: "USD Coin", decimals: 6, logoUrl: "https://assets.coingecko.com/coins/images/6319/small/usdc.png", popularRank: 1 },
    { address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", symbol: "USDT", name: "Tether USD", decimals: 6, logoUrl: "https://assets.coingecko.com/coins/images/325/small/Tether.png", popularRank: 2 },
    { address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", symbol: "WETH", name: "Wrapped Ether", decimals: 18, logoUrl: "https://assets.coingecko.com/coins/images/2518/small/weth.png", popularRank: 3 },
  ],
  10: [
    { address: "native", symbol: "ETH", name: "Ether", decimals: 18, logoUrl: NATIVE_ETH_LOGO, popularRank: 0 },
    { address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", symbol: "USDC", name: "USD Coin", decimals: 6, logoUrl: "https://assets.coingecko.com/coins/images/6319/small/usdc.png", popularRank: 1 },
    { address: "0x4200000000000000000000000000000000000006", symbol: "WETH", name: "Wrapped Ether", decimals: 18, logoUrl: "https://assets.coingecko.com/coins/images/2518/small/weth.png", popularRank: 2 },
  ],
  137: [
    { address: "native", symbol: "POL", name: "Polygon", decimals: 18, popularRank: 0 },
    { address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", symbol: "USDC", name: "USD Coin", decimals: 6, logoUrl: "https://assets.coingecko.com/coins/images/6319/small/usdc.png", popularRank: 1 },
    { address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", symbol: "WETH", name: "Wrapped Ether", decimals: 18, logoUrl: "https://assets.coingecko.com/coins/images/2518/small/weth.png", popularRank: 2 },
  ],
  43114: [
    { address: "native", symbol: "AVAX", name: "Avalanche", decimals: 18, logoUrl: NATIVE_AVAX_LOGO, popularRank: 0 },
    { address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", symbol: "USDC", name: "USD Coin", decimals: 6, logoUrl: "https://assets.coingecko.com/coins/images/6319/small/usdc.png", popularRank: 1 },
    { address: "0x9702230A8Ea53601f5cD2dc00fdbc13d4dF4A8c7", symbol: "USDT", name: "Tether USD", decimals: 6, logoUrl: "https://assets.coingecko.com/coins/images/325/small/Tether.png", popularRank: 2 },
    { address: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", symbol: "WAVAX", name: "Wrapped AVAX", decimals: 18, popularRank: 3 },
  ],
};

export function getTargetTokensForChain(chainId: number): TargetTokenEntry[] {
  return POPULAR_TARGETS_BY_CHAIN[chainId] ?? [];
}

/** Sum target output across a list of quotes. Pending/errored rows
 *  contribute nothing so the running total only reflects settled quotes. */
export function sumQuotes(
  quotes: SwapQuote[],
  targetDecimals: number
): {
  totalTargetWei: bigint;
  totalUsd: number;
  pendingCount: number;
  totalFeeUsd: number;
  isPremiumFee: boolean;
} {
  let totalTargetWei = 0n;
  let totalUsd = 0;
  let pendingCount = 0;
  let totalFeeUsd = 0;
  // Premium tier applies per-taker so once any settled row reports it, the
  // whole batch is on the premium fee.
  let isPremiumFee = false;
  for (const q of quotes) {
    if (q.isPending || q.errorMessage) {
      if (q.isPending) pendingCount += 1;
      continue;
    }
    totalTargetWei += q.targetAmountWei;
    totalUsd += q.targetUsd;
    if (q.feeUsd !== undefined) totalFeeUsd += q.feeUsd;
    if (q.isPremiumFee) isPremiumFee = true;
  }
  // Suppress unused-param lint; decimals is part of the contract for callers
  // formatting the aggregate, even though the bigint sum doesn't need it.
  void targetDecimals;
  return { totalTargetWei, totalUsd, pendingCount, totalFeeUsd, isPremiumFee };
}
