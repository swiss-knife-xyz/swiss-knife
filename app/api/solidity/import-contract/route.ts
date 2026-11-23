import {
  fetchVerifiedContract,
  VerifiedContractImportError,
} from "@/lib/solidity/verifiedContractServer";
import { VerificationError } from "@/lib/verification/source";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 25;
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  try {
    const contract = await fetchVerifiedContract(
      params.get("chainId") ?? "",
      params.get("address") ?? "",
      AbortSignal.any([request.signal, AbortSignal.timeout(20_000)]),
      {
        etherscan: process.env.ETHERSCAN_API_KEY,
        blockscout: process.env.BLOCKSCOUT_API_KEY,
        routescan: process.env.ROUTESCAN_API_KEY,
      }
    );
    return Response.json(contract, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const code = error instanceof VerificationError ? error.code : undefined;
    const message =
      code === "INVALID_INPUT"
        ? "Select a supported network and enter a valid contract address."
        : code === "UNSUPPORTED_SOURCE"
          ? "No complete verified Solidity source was found for this address."
          : code === "RATE_LIMITED"
            ? "The explorer is rate limiting requests. Try again shortly."
            : code === "UNSUPPORTED_ROUTE"
              ? "Source imports aren't available for this network."
              : code
                ? "Couldn't fetch verified source. Try again."
                : error instanceof VerifiedContractImportError
                  ? error.message
                  : "The source lookup timed out. Try again.";
    return Response.json(
      { error: message },
      {
        status: code === "INVALID_INPUT" ? 400 : 422,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}
