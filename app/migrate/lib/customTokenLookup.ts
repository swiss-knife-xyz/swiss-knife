/**
 * Onchain ERC-20 metadata reader for arbitrary pasted addresses. Mirrors
 * walletchan's `fetchTokenInfoOnchain` — three parallel calls to `name`,
 * `symbol`, `decimals`. Returns null when any read reverts (not an ERC-20).
 *
 * No off-chain logo lookup: matches walletchan's behavior of relying on the
 * pre-fetched token list / local pinned map for icons. Unknown tokens render
 * with the symbol-initials fallback.
 */
import { Address, erc20Abi } from "viem";
import { getPublicClient } from "@/lib/publicClient";

export interface CustomTokenMetadata {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  chainId: number;
}

export async function fetchCustomTokenMetadata(
  address: string,
  chainId: number
): Promise<CustomTokenMetadata | null> {
  const client = getPublicClient(chainId);
  try {
    const [name, symbol, decimals] = await Promise.all([
      client.readContract({
        address: address as Address,
        abi: erc20Abi,
        functionName: "name",
      }),
      client.readContract({
        address: address as Address,
        abi: erc20Abi,
        functionName: "symbol",
      }),
      client.readContract({
        address: address as Address,
        abi: erc20Abi,
        functionName: "decimals",
      }),
    ]);
    return {
      address,
      name: String(name),
      symbol: String(symbol),
      decimals: Number(decimals),
      chainId,
    };
  } catch {
    return null;
  }
}
