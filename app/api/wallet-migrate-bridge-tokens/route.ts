import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side proxy to walletchan.eth.sh's Socket/Bungee bridge token catalog.
 */
const UPSTREAM = "https://walletchan.eth.sh/api/bridge/tokens";

const cache = new Map<
  string,
  { body: string; contentType: string; fetchedAt: number }
>();
const CACHE_TTL_MS = 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const chainId = request.nextUrl.searchParams.get("chainId");
  if (!chainId || !/^\d+$/.test(chainId)) {
    return NextResponse.json(
      { error: "Missing or invalid chainId" },
      { status: 400 }
    );
  }

  const cached = cache.get(chainId);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return new NextResponse(cached.body, {
      headers: {
        "Content-Type": cached.contentType,
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  }

  try {
    const url = `${UPSTREAM}?chainId=${encodeURIComponent(chainId)}`;
    const res = await fetch(url, { cache: "no-store" });
    const body = await res.text();
    const contentType = res.headers.get("content-type") ?? "application/json";

    if (res.ok) {
      cache.set(chainId, { body, contentType, fetchedAt: Date.now() });
    } else if (cached) {
      return new NextResponse(cached.body, {
        headers: {
          "Content-Type": cached.contentType,
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
    if (cached) {
      return new NextResponse(cached.body, {
        headers: {
          "Content-Type": cached.contentType,
          "Cache-Control": "public, max-age=300, s-maxage=300",
        },
      });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Upstream bridge tokens fetch failed: ${message}` },
      { status: 502 }
    );
  }
}
