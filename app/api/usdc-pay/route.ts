import { NextRequest, NextResponse } from "next/server";
import { USDC_ADDRESSES, USDC_DECIMALS } from "@/data/tokens";

/**
 * USDC Payment API with x402 Protocol
 *
 * Simple implementation that works directly with PayAI facilitator
 * for gasless USDC transfers on Base and Base Sepolia
 */

// Use our own facilitator proxy that includes proper EIP-712 details
const LOCAL_FACILITATOR_URL =
  process.env.NEXT_PUBLIC_DEVELOPMENT === "true"
    ? "http://localhost:3000/api/facilitator"
    : "https://swiss-knife.xyz/api/facilitator";

const PAYAI_FACILITATOR_ADDRESS = "0xc6699d2aada6c36dfea5c248dd70f9cb0235cb63";

export async function POST(request: NextRequest) {
  try {
    // Get payment data from X-PAYMENT header
    const paymentData = request.headers.get("x-payment");

    // Parse request body
    const body = await request.json();
    const { to, amount, network } = body;

    // Validate required parameters
    if (!to || !amount) {
      return NextResponse.json(
        { error: "Missing required parameters: to, amount" },
        { status: 400 }
      );
    }

    // Determine network settings
    const isTestnet = network === "base-sepolia";
    const networkName = isTestnet ? "base-sepolia" : "base";
    const chainId = isTestnet ? 84532 : 8453;
    const usdcAddress = isTestnet
      ? USDC_ADDRESSES.BASE_SEPOLIA
      : USDC_ADDRESSES.BASE;

    // Convert amount to atomic units
    const amountFloat = parseFloat(amount);
    if (isNaN(amountFloat) || amountFloat <= 0) {
      return NextResponse.json(
        { error: "Invalid amount. Must be a positive number." },
        { status: 400 }
      );
    }

    const atomicAmount = Math.floor(
      amountFloat * Math.pow(10, USDC_DECIMALS)
    ).toString();

    // Get resource URL
    const resourceUrl = new URL(
      request.url || "/api/usdc-pay",
      process.env.NEXT_PUBLIC_DEVELOPMENT === "true"
        ? "http://localhost:3000"
        : "https://swiss-knife.xyz"
    ).toString();

    // Construct payment requirements per x402 spec
    // x402 client reads extra.name and extra.version for EIP-712 domain
    const paymentRequirements = {
      scheme: "exact" as const,
      network: networkName,
      maxAmountRequired: atomicAmount,
      resource: resourceUrl,
      description: "USDC Payment",
      mimeType: "application/json",
      payTo: to,
      maxTimeoutSeconds: 300,
      asset: usdcAddress,
      extra: {
        name: "USD Coin", // Required for EIP-712 domain.name
        version: "2", // Required for EIP-712 domain.version
      },
    };

    // If no payment data, return 402 Payment Required
    if (!paymentData) {
      return NextResponse.json(
        {
          x402Version: 1,
          error: "payment_required",
          errorMessage: "Payment required to process USDC transfer",
          accepts: [paymentRequirements],
        },
        {
          status: 402,
          headers: {
            "Content-Type": "application/json",
            "X-Facilitator-Url": LOCAL_FACILITATOR_URL, // Point to our proxy with EIP-712 details
            "Access-Control-Expose-Headers": "X-Facilitator-Url", // Make sure client can read it
          },
        }
      );
    }

    // Decode payment data
    const decodedPayment = JSON.parse(
      Buffer.from(paymentData, "base64").toString("utf-8")
    );

    // Verify payment with PayAI
    const verifyPayload = {
      x402Version: 1,
      paymentPayload: decodedPayment,
      paymentRequirements: paymentRequirements,
    };

    // Use our local facilitator proxy which forwards to PayAI
    const verifyResponse = await fetch(`${LOCAL_FACILITATOR_URL}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(verifyPayload),
    });

    const verifyResult = await verifyResponse.json();

    if (!verifyResult.isValid) {
      return NextResponse.json(
        {
          x402Version: 1,
          error: verifyResult.invalidReason || "payment_verification_failed",
          errorMessage:
            verifyResult.errorMessage || "Payment verification failed",
          accepts: [paymentRequirements],
        },
        {
          status: 402,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Settle payment via our facilitator proxy
    const settleResponse = await fetch(`${LOCAL_FACILITATOR_URL}/settle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        x402Version: 1,
        paymentPayload: decodedPayment,
        paymentRequirements: paymentRequirements,
      }),
    });

    const settleResult = await settleResponse.json();

    if (!settleResult.success) {
      return NextResponse.json(
        {
          error: "Payment settlement failed",
          errorReason: settleResult.errorReason,
          details:
            settleResult.errorMessage ||
            settleResult.errorReason ||
            "Unknown error",
        },
        { status: 500 }
      );
    }

    // Return success
    return NextResponse.json(
      {
        success: true,
        message: "Payment processed successfully",
        transaction: settleResult.transaction,
        network: networkName,
      },
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Payment-Response": Buffer.from(
            JSON.stringify({
              success: true,
              transaction: settleResult.transaction,
              network: networkName,
              payer: verifyResult.payer,
            })
          ).toString("base64"),
        },
      }
    );
  } catch (error) {
    console.error("Error processing payment:", error);
    return NextResponse.json(
      {
        error: "Failed to process payment",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
