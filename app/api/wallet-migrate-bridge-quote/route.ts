import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side proxy to walletchan.eth.sh's bridge quote endpoint.
 *
 * Forwards query params verbatim. Required params are validated upstream:
 * userAddress, receiverAddress, originChainId, destinationChainId, inputToken,
 * outputToken, inputAmount, and optional slippage.
 */
const UPSTREAM = "https://walletchan.eth.sh/api/bridge/quote";

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
        "Content-Type": res.headers.get("content-type") ?? "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Upstream bridge quote fetch failed: ${message}` },
      { status: 502 }
    );
  }
}
