/**
 * Walletchan swap token-list client. Mirrors `TokenListEntry` from
 * `wchan/walletchan/apps/extension/src/chrome/swapApi.ts` and is fetched via
 * our own proxy route (CORS) at `/api/wallet-migrate-token-list`.
 */
import { TargetTokenEntry } from "./swapTypes";

export interface TokenListEntry {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI: string;
}

interface TokenListResponse {
  tokens: TokenListEntry[];
  chainId: number;
  updatedAt: string;
}

const ENDPOINT = "/api/wallet-migrate-token-list";

export async function fetchSwapTokenList(
  chainId: number,
  signal?: AbortSignal
): Promise<TokenListEntry[]> {
  const url = `${ENDPOINT}?chainId=${chainId}`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.error ? `: ${body.error}` : "";
    } catch {
      // ignore
    }
    throw new Error(`Token list fetch failed (${res.status})${detail}`);
  }
  const data = (await res.json()) as TokenListResponse;
  return data.tokens ?? [];
}

/** Convert a TokenListEntry into the TargetTokenEntry shape the picker uses. */
export function tokenListEntryToTarget(
  entry: TokenListEntry
): TargetTokenEntry {
  return {
    address: entry.address,
    symbol: entry.symbol,
    name: entry.name,
    decimals: entry.decimals,
    logoUrl: entry.logoURI,
  };
}
