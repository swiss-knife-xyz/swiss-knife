import { NextRequest, NextResponse } from "next/server";

/**
 * Facilitator Proxy - /settle endpoint
 *
 * Forwards settle requests to PayAI facilitator
 */

// Helper function to add CORS headers
function getCorsHeaders(origin: string | null) {
  const allowedOrigins = [
    "https://swiss-knife.xyz",
    "https://usdc-pay.swiss-knife.xyz",
    "http://localhost:3000",
  ];

  const corsOrigin =
    origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  return {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

// Handle OPTIONS preflight request
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: getCorsHeaders(request.headers.get("origin")),
    }
  );
}

export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request.headers.get("origin"));
  const body = await request.json();

  const response = await fetch("https://facilitator.payai.network/settle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const result = await response.json();

  return NextResponse.json(result, {
    status: response.status,
    headers: corsHeaders,
  });
}
