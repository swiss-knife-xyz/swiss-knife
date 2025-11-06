import { NextRequest, NextResponse } from "next/server";

/**
 * Facilitator Proxy - /settle endpoint
 * 
 * Forwards settle requests to PayAI facilitator
 */
export async function POST(request: NextRequest) {
  const body = await request.json();

  const response = await fetch("https://facilitator.payai.network/settle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const result = await response.json();

  return NextResponse.json(result, { status: response.status });
}

