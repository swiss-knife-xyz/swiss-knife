/**
 * Walletchan portfolio API client. Mirrors the relevant subset of types from
 * `wchan/walletchan/apps/website/app/api/portfolio/providers/types.ts`.
 */
import { parseUnits } from "viem";

export const NATIVE_SENTINEL = "native";

export interface PortfolioToken {
  symbol: string;
  name: string;
  contractAddress: string; // lowercased; "native" for native tokens
  chainId: number;
  decimals: number;
  balance: string; // raw wei as string
  balanceFormatted: string;
  priceUsd: number;
  valueUsd: number;
  logoUrl?: string;
}

export interface PortfolioResponse {
  tokens: PortfolioToken[];
  defiPositions: unknown[]; // intentionally ignored
  totalValueUsd: number;
  source?: string;
}

// Server-side proxy in this app (avoids CORS — see app/api/wallet-migrate-portfolio/route.ts).
const PORTFOLIO_ENDPOINT = "/api/wallet-migrate-portfolio";

export async function fetchPortfolio(
  address: string,
  signal?: AbortSignal
): Promise<PortfolioResponse> {
  const url = `${PORTFOLIO_ENDPOINT}?address=${encodeURIComponent(address)}`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.error ? `: ${body.error}` : "";
    } catch {
      // ignore
    }
    throw new Error(`Portfolio fetch failed (${res.status})${detail}`);
  }
  return (await res.json()) as PortfolioResponse;
}

export function isNativeToken(token: PortfolioToken): boolean {
  return token.contractAddress === NATIVE_SENTINEL;
}

export function tokenKey(token: PortfolioToken): string {
  return `${token.chainId}:${token.contractAddress}`;
}

/**
 * The upstream API is inconsistent: some providers return `balance` as raw
 * wei ("123456789"), others as a decimal-formatted string ("0.83962"). Parse
 * both safely so callers can always work in wei.
 */
export function getBalanceWei(token: PortfolioToken): bigint {
  const raw = token.balance?.trim() ?? "";
  if (!raw) return 0n;
  if (/^[0-9]+$/.test(raw)) {
    try {
      return BigInt(raw);
    } catch {
      return 0n;
    }
  }
  try {
    return parseUnits(
      raw.replace(/,/g, "") as `${number}`,
      token.decimals
    );
  } catch {
    return 0n;
  }
}
