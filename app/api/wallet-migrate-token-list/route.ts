import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side proxy to walletchan.com's swap token-list endpoint.
 *
 * Same CORS rationale as the portfolio proxy — walletchan.com doesn't emit
 * cross-origin headers, so we hop through our own origin. Adds a generous
 * upstream cache (1h) since the token list is stable over the day; clients
 * still get their own `staleTime` via react-query.
 */
const UPSTREAM = "https://walletchan.com/api/swap/token-list";

export async function GET(request: NextRequest) {
  const chainId = request.nextUrl.searchParams.get("chainId");
  if (!chainId) {
    return NextResponse.json(
      { error: "chainId parameter is required" },
      { status: 400 }
    );
  }

  try {
    const upstream = `${UPSTREAM}?chainId=${encodeURIComponent(chainId)}`;
    const res = await fetch(upstream, { cache: "no-store" });
    const body = await res.text();
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
