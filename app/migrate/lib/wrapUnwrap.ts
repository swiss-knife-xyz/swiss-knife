/**
 * Detect wrap/unwrap pairs (native ↔ wrapped-native) per chain. These swap
 * 1:1 with no DEX fee and no slippage, so we synthesize the quote locally
 * rather than burning a 0x API call (and sidestep 0x's "recipient not
 * supported for wrap/unwrap" rejection).
 *
 * Addresses sourced from walletchan's `preferredFeeTokens.ts`. Lowercased
 * for case-insensitive comparison at call sites.
 */

export const WRAPPED_NATIVE_BY_CHAIN: Record<number, string> = {
  1: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", // WETH
  10: "0x4200000000000000000000000000000000000006", // WETH on Optimism
  56: "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c", // WBNB
  130: "0x4200000000000000000000000000000000000006", // WETH on Unichain
  137: "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270", // WPOL
  8453: "0x4200000000000000000000000000000000000006", // WETH on Base
  42161: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1", // WETH on Arbitrum
  43114: "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7", // WAVAX
  57073: "0x4200000000000000000000000000000000000006", // WETH on Ink
  59144: "0xe5d7c2a44ffddf6b295a15c148167daaaf5cf34f", // WETH on Linea
  81457: "0x4300000000000000000000000000000000000004", // WETH on Blast
  534352: "0x5300000000000000000000000000000000000004", // WETH on Scroll
  7777777: "0x4200000000000000000000000000000000000006", // WETH on Zora
};

export type WrapDirection = "wrap" | "unwrap";

/** Returns "wrap" for native→wrapped, "unwrap" for wrapped→native, else null. */
export function detectWrapUnwrap(
  chainId: number,
  sellToken: string,
  buyToken: string
): WrapDirection | null {
  const wrapped = WRAPPED_NATIVE_BY_CHAIN[chainId];
  if (!wrapped) return null;

  const sell = sellToken.toLowerCase();
  const buy = buyToken.toLowerCase();

  const sellIsNative = sell === "native";
  const buyIsNative = buy === "native";

  if (sellIsNative && buy === wrapped) return "wrap";
  if (sell === wrapped && buyIsNative) return "unwrap";
  return null;
}
