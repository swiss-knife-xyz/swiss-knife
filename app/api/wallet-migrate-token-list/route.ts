import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side proxy to walletchan.eth.sh's swap token-list endpoint.
 *
 * Same CORS rationale as the portfolio proxy — the upstream doesn't emit
 * cross-origin headers, so we hop through our own origin. Adds a generous
 * upstream cache (1h) since the token list is stable over the day; clients
 * still get their own `staleTime` via react-query.
 *
 * WalletChan's extension now powers its swap/bridge token picker from the
 * Bungee token catalog. Keep 0x's list as the primary source, but fall back
 * to Bungee for chains where the quote endpoint works yet the swap token-list
 * endpoint has not been enabled (Avalanche is the current example).
 */
const SWAP_UPSTREAM = "https://walletchan.eth.sh/api/swap/token-list";
const BRIDGE_TOKENS_UPSTREAM = "https://walletchan.eth.sh/api/bridge/tokens";

interface TokenListEntry {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI: string;
}

interface BungeeToken {
  address?: string;
  name?: string;
  symbol?: string;
  decimals?: number;
  logoURI?: string;
  icon?: string;
}

interface BungeeTokenListResponse {
  result?: Record<string, BungeeToken[]>;
}

function normalizeBungeeToken(token: BungeeToken): TokenListEntry | null {
  if (!token.address || !token.symbol) return null;
  return {
    address: token.address,
    name: token.name ?? token.symbol,
    symbol: token.symbol,
    decimals: token.decimals ?? 18,
    logoURI: token.logoURI ?? token.icon ?? "",
  };
}

function jsonHeaders() {
  return {
    "Content-Type": "application/json",
    "Cache-Control":
      "public, max-age=3600, s-maxage=3600, stale-while-revalidate=21600",
  };
}

async function fetchBridgeTokenList(
  chainId: string
): Promise<TokenListEntry[] | null> {
  try {
    const res = await fetch(
      `${BRIDGE_TOKENS_UPSTREAM}?chainId=${encodeURIComponent(chainId)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;

    const data = (await res.json()) as BungeeTokenListResponse;
    const tokens = data.result?.[chainId] ?? [];
    const normalized = tokens
      .map(normalizeBungeeToken)
      .filter((token): token is TokenListEntry => token !== null);

    return normalized.length > 0 ? normalized : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const chainId = request.nextUrl.searchParams.get("chainId");
  if (!chainId) {
    return NextResponse.json(
      { error: "chainId parameter is required" },
      { status: 400 }
    );
  }

  try {
    const upstream = `${SWAP_UPSTREAM}?chainId=${encodeURIComponent(chainId)}`;
    const res = await fetch(upstream, { cache: "no-store" });
    const body = await res.text();

    if (!res.ok) {
      const fallbackTokens = await fetchBridgeTokenList(chainId);
      if (fallbackTokens) {
        return NextResponse.json(
          {
            tokens: fallbackTokens,
            chainId: Number(chainId),
            updatedAt: new Date().toISOString(),
            source: "bridge",
          },
          { headers: jsonHeaders() }
        );
      }
    }

    return new NextResponse(body, {
      status: res.status,
      headers: {
        "Content-Type":
          res.headers.get("content-type") ?? "application/json",
        // 1h browser cache, 1h CDN; refresh in background after 6h.
        "Cache-Control":
          "public, max-age=3600, s-maxage=3600, stale-while-revalidate=21600",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Upstream token-list fetch failed: ${message}` },
      { status: 502 }
    );
  }
}
