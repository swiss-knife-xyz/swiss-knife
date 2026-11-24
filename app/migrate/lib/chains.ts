import { Chain } from "viem";
import { chainIdToChain, chainIdToImage } from "@/data/common";
import { walletChains } from "@/data/chains";

const SUPPORTED_WALLET_CHAIN_IDS = new Set<number>(
  walletChains.map((c) => c.id)
);

export interface ChainInfo {
  chainId: number;
  name: string;
  logo: string;
  viemChain: Chain | undefined;
  supported: boolean; // true if user can switch to this chain in our RainbowKit setup
}

export function getChainInfo(chainId: number): ChainInfo {
  const viemChain = chainIdToChain[chainId];
  return {
    chainId,
    name: viemChain?.name ?? `Chain ${chainId}`,
    logo: chainIdToImage[chainId] ?? "",
    viemChain,
    supported: SUPPORTED_WALLET_CHAIN_IDS.has(chainId),
  };
}

/**
 * Static per-call native-gas reserve, used as a floor when a live gas price
 * isn't available (RPC failure, chain not in wagmi config, etc.). Tuned at
 * "one ERC-20 transfer's worth at moderately elevated gas prices."
 */
const STATIC_NATIVE_GAS_PER_CALL_WEI: Record<number, bigint> = {
  1: 500_000_000_000_000n, // Mainnet — 0.0005 ETH/call
  10: 70_000_000_000_000n, // Optimism — 0.00007 ETH/call
  56: 300_000_000_000_000n, // BSC — 0.0003 BNB/call
  100: 2_000_000_000_000_000n, // Gnosis — 0.002 xDAI/call
  130: 70_000_000_000_000n, // Unichain — 0.00007 ETH/call
  137: 35_000_000_000_000_000n, // Polygon — 0.035 POL/call
  146: 17_000_000_000_000_000n, // Sonic — 0.017 S/call
  324: 70_000_000_000_000n, // zkSync — 0.00007 ETH/call
  1329: 35_000_000_000_000_000n, // Sei — 0.035 SEI/call
  8453: 70_000_000_000_000n, // Base — 0.00007 ETH/call
  42161: 70_000_000_000_000n, // Arbitrum — 0.00007 ETH/call
  43114: 17_000_000_000_000_000n, // Avalanche — 0.017 AVAX/call
  57073: 70_000_000_000_000n, // Ink — 0.00007 ETH/call
  7777777: 70_000_000_000_000n, // Zora — 0.00007 ETH/call
};

const DEFAULT_STATIC_PER_CALL_WEI = 200_000_000_000_000n; // 0.0002 native/call

// Conservative per-call gas estimate. Bounds an ERC-20 transfer (~50–65k)
// plus headroom; native transfers are cheaper but the over-estimate is cheap
// since the user can always rescue leftover native from their wallet directly.
const GAS_UNITS_PER_CALL = 80_000n;

// Multiply the live estimate by this ratio so a price spike between the
// fetch and the broadcast still leaves the tx funded. 2x is loose but the
// downside of over-reserving (a few cents of native left behind) is much
// smaller than the downside of an out-of-gas mid-batch.
const LIVE_BUFFER_NUMERATOR = 2n;
const LIVE_BUFFER_DENOMINATOR = 1n;

/**
 * Native gas reserve to leave behind when sweeping the full native balance.
 * Scales with the number of tokens being migrated and (when a live gas price
 * is supplied) with current network conditions.
 *
 * Strategy:
 *   • Dynamic: `gasPrice * GAS_UNITS_PER_CALL * count * 2`.
 *   • Static fallback: per-chain table × count.
 *   • Final reserve is the **max of dynamic and static** — i.e., the static
 *     value acts as a floor so a near-zero or missing live price can't make
 *     us under-reserve.
 *
 * @param chainId    chain id
 * @param tokenCount number of tokens being migrated on this chain (≥ 1)
 * @param gasPriceWei live gas price from the RPC, or `undefined` if unknown
 */
export function getNativeGasReserveWei(
  chainId: number,
  tokenCount: number,
  gasPriceWei?: bigint
): bigint {
  const count = BigInt(Math.max(1, tokenCount));
  const staticPerCall =
    STATIC_NATIVE_GAS_PER_CALL_WEI[chainId] ?? DEFAULT_STATIC_PER_CALL_WEI;
  const staticReserve = staticPerCall * count;

  if (!gasPriceWei || gasPriceWei <= 0n) return staticReserve;

  const dynamicReserve =
    (gasPriceWei * GAS_UNITS_PER_CALL * count * LIVE_BUFFER_NUMERATOR) /
    LIVE_BUFFER_DENOMINATOR;

  return dynamicReserve > staticReserve ? dynamicReserve : staticReserve;
}
