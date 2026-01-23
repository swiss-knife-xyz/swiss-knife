import { NextRequest, NextResponse } from "next/server";
import { USDC_ADDRESSES, USDC_DECIMALS } from "@/data/tokens";

/**
 * Facilitator Proxy - /supported endpoint
 *
 * This endpoint proxies PayAI's facilitator but adds proper EIP-712 asset details
 * that x402-axios needs to create correct signatures
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

export async function GET(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request.headers.get("origin"));
  const { searchParams } = new URL(request.url);
  const chainId = searchParams.get("chainId");
  const tokenAddress = searchParams.get("tokenAddress");

  // Determine network and USDC address
  const network =
    chainId === "84532"
      ? "base-sepolia"
      : chainId === "8453"
        ? "base"
        : "base-sepolia";
  const usdcAddress =
    network === "base-sepolia"
      ? USDC_ADDRESSES.BASE_SEPOLIA
      : USDC_ADDRESSES.BASE;
  const chainIdNum = parseInt(chainId || "84532");

  // Return proper supported response with full EIP-712 details
  const response = {
    kinds: [
      {
        x402Version: 1,
        scheme: "exact",
        network: network,
        extra: {
          defaultAsset: {
            address: usdcAddress,
            decimals: USDC_DECIMALS,
            eip712: {
              name: "USD Coin",
              version: "2",
              chainId: chainIdNum,
              verifyingContract: usdcAddress,
              primaryType: "TransferWithAuthorization",
            },
          },
          supportedAssets: [
            {
              address: usdcAddress,
              decimals: USDC_DECIMALS,
              eip712: {
                name: "USD Coin",
                version: "2",
                chainId: chainIdNum,
                verifyingContract: usdcAddress,
                primaryType: "TransferWithAuthorization",
              },
            },
          ],
        },
      },
    ],
  };

  return NextResponse.json(response, { headers: corsHeaders });
}
