import { NextResponse } from "next/server";

/**
 * Server-side proxy to walletchan.eth.sh's Socket/Bungee bridge chain catalog.
 *
 * Keeps the browser on our origin and lets WalletChan own Socket API keys,
 * affiliate headers, fee handling, and response normalization.
 */
const UPSTREAM = "https://walletchan.eth.sh/api/bridge/chains";

let cache: { body: string; contentType: string; fetchedAt: number } | null =
  null;
const CACHE_TTL_MS = 60 * 60 * 1000;

export async function GET() {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return new NextResponse(cache.body, {
      headers: {
        "Content-Type": cache.contentType,
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  }

  try {
    const res = await fetch(UPSTREAM, { cache: "no-store" });
    const body = await res.text();
    const contentType = res.headers.get("content-type") ?? "application/json";

    if (res.ok) {
      cache = { body, contentType, fetchedAt: Date.now() };
    } else if (cache) {
      return new NextResponse(cache.body, {
        headers: {
          "Content-Type": cache.contentType,
          "Cache-Control": "public, max-age=300, s-maxage=300",
        },
      });
    }

    return new NextResponse(body, {
      status: res.status,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": res.ok
          ? "public, max-age=3600, s-maxage=3600"
          : "no-store",
      },
    });
  } catch (err) {
    if (cache) {
      return new NextResponse(cache.body, {
        headers: {
          "Content-Type": cache.contentType,
          "Cache-Control": "public, max-age=300, s-maxage=300",
        },
      });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Upstream bridge chains fetch failed: ${message}` },
      { status: 502 }
    );
  }
}
