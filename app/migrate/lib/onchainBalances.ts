/**
 * Live on-chain balance refresh via Multicall3. The portfolio API can lag a
 * few minutes behind reality; this pass corrects balances right before the
 * user kicks off transfers so they don't accidentally send a stale amount.
 *
 * One multicall per chain, batching:
 *   • native balance  → Multicall3.getEthBalance(addr)
 *   • ERC-20 balance  → balanceOf(addr) on each token contract
 *
 * Failed sub-calls (scam tokens reverting on balanceOf, missing contracts)
 * are silently dropped — we just keep the API value for those rows.
 */
import {
  erc20Abi,
  formatUnits,
  type Address,
  type ContractFunctionParameters,
} from "viem";
import { getPublicClient } from "@/lib/publicClient";
import {
  PortfolioToken,
  isNativeToken,
  tokenKey,
} from "./portfolioApi";

const MULTICALL3_ADDRESS: Address =
  "0xcA11bde05977b3631167028862bE2a173976CA11";

const multicall3Abi = [
  {
    type: "function",
    name: "getEthBalance",
    stateMutability: "view",
    inputs: [{ name: "addr", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }],
  },
] as const;

// Cap calls per multicall round-trip. Most RPCs handle 100 fine; chunking
// keeps us safe on stricter providers.
const MULTICALL_BATCH_SIZE = 100;

export interface LiveBalance {
  balanceRawString: string; // base-unit string ("1234567890")
  balanceFormatted: string; // decimal string ("1.23456")
  valueUsd: number; // recomputed against the API priceUsd
}

/**
 * Fetch live balances for the given tokens. Returns a map keyed by
 * `tokenKey(token)`; only tokens with a successful multicall result appear.
 */
export async function fetchLiveBalances(
  address: Address,
  tokens: PortfolioToken[]
): Promise<Map<string, LiveBalance>> {
  const out = new Map<string, LiveBalance>();

  // Group by chain so we make one multicall per chain.
  const byChain = new Map<number, PortfolioToken[]>();
  for (const t of tokens) {
    const list = byChain.get(t.chainId);
    if (list) list.push(t);
    else byChain.set(t.chainId, [t]);
  }

  await Promise.all(
    Array.from(byChain.entries()).map(async ([chainId, chainTokens]) => {
      let client;
      try {
        client = getPublicClient(chainId);
      } catch {
        return; // chain not in our config — nothing we can do
      }

      const calls: ContractFunctionParameters[] = chainTokens.map((t) =>
        isNativeToken(t)
          ? {
              address: MULTICALL3_ADDRESS,
              abi: multicall3Abi,
              functionName: "getEthBalance",
              args: [address],
            }
          : {
              address: t.contractAddress as Address,
              abi: erc20Abi,
              functionName: "balanceOf",
              args: [address],
            }
      );

      for (let i = 0; i < calls.length; i += MULTICALL_BATCH_SIZE) {
        const chunkCalls = calls.slice(i, i + MULTICALL_BATCH_SIZE);
        const chunkTokens = chainTokens.slice(i, i + MULTICALL_BATCH_SIZE);
        try {
          const results = await client.multicall({
            contracts: chunkCalls,
            multicallAddress: MULTICALL3_ADDRESS,
            allowFailure: true,
          });
          results.forEach((r, j) => {
            if (r.status !== "success") return;
            const token = chunkTokens[j];
            const raw = r.result as bigint;
            const formatted = formatUnits(raw, token.decimals);
            const numeric = Number(formatted);
            out.set(tokenKey(token), {
              balanceRawString: raw.toString(),
              balanceFormatted: formatted,
              valueUsd:
                token.priceUsd > 0 && Number.isFinite(numeric)
                  ? numeric * token.priceUsd
                  : 0,
            });
          });
        } catch {
          // Whole chunk failed (RPC down, etc.). Leave API values in place.
        }
      }
    })
  );

  return out;
}

/**
 * Apply a live-balance map back onto a token. Returns a new token with
 * `balance` / `balanceFormatted` / `valueUsd` overridden, or the original
 * token if the map doesn't have an entry for it.
 */
export function applyLiveBalance(
  token: PortfolioToken,
  live: Map<string, LiveBalance>
): PortfolioToken {
  const entry = live.get(tokenKey(token));
  if (!entry) return token;
  return {
    ...token,
    balance: entry.balanceRawString,
    balanceFormatted: entry.balanceFormatted,
    valueUsd: entry.valueUsd,
  };
}
