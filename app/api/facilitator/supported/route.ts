import { NextRequest, NextResponse } from "next/server";
import { USDC_ADDRESSES, USDC_DECIMALS } from "@/data/tokens";

/**
 * Facilitator Proxy - /supported endpoint
 * 
 * This endpoint proxies PayAI's facilitator but adds proper EIP-712 asset details
 * that x402-axios needs to create correct signatures
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const chainId = searchParams.get("chainId");
  const tokenAddress = searchParams.get("tokenAddress");


  // Determine network and USDC address
  const network = chainId === "84532" ? "base-sepolia" : chainId === "8453" ? "base" : "base-sepolia";
  const usdcAddress = network === "base-sepolia" ? USDC_ADDRESSES.BASE_SEPOLIA : USDC_ADDRESSES.BASE;
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

  return NextResponse.json(response);
}

