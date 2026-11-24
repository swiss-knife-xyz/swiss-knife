import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side proxy to walletchan.eth.sh's swap quote endpoint. Same CORS
 * rationale as the portfolio and token-list proxies in this app.
 *
 * Forwards every query param verbatim — walletchan accepts chainId, sellToken,
 * buyToken, sellAmount, taker, slippageBps. No caching here: prices move and
 * a stale quote risks reverts at execution.
 */
const UPSTREAM = "https://walletchan.eth.sh/api/swap/quote";

export async function GET(request: NextRequest) {
  const qs = request.nextUrl.searchParams.toString();
  if (!qs) {
    return NextResponse.json(
      { error: "Missing query params" },
      { status: 400 }
    );
  }
  try {
    const res = await fetch(`${UPSTREAM}?${qs}`, { cache: "no-store" });
    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: {
        "Content-Type":
          res.headers.get("content-type") ?? "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Upstream quote fetch failed: ${message}` },
      { status: 502 }
    );
  }
}
