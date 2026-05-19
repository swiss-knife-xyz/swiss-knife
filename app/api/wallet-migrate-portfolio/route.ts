import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side proxy to walletchan.com's portfolio endpoint.
 *
 * Reason for proxying instead of calling walletchan directly from the
 * browser: walletchan.com does not currently emit CORS headers, so a
 * cross-origin XHR from this app's origin is blocked by the browser. Doing
 * the fetch server-side sidesteps CORS and keeps the upstream URL and any
 * future auth concerns out of the client bundle.
 */
const UPSTREAM = "https://walletchan.com/api/portfolio";

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");
  if (!address) {
    return NextResponse.json(
      { error: "Address parameter is required" },
      { status: 400 }
    );
  }

  try {
    const upstream = `${UPSTREAM}?address=${encodeURIComponent(address)}`;
    const res = await fetch(upstream, {
      // Don't cache at the fetch layer; rely on the upstream Cache-Control.
      cache: "no-store",
    });
    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: {
        "Content-Type":
          res.headers.get("content-type") ?? "application/json",
        "Cache-Control": "public, max-age=30",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Upstream portfolio fetch failed: ${message}` },
      { status: 502 }
    );
  }
}
