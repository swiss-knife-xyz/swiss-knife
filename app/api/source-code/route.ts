import { sourceCodeRequestSchema } from "@/data/schemas";
import { etherscanChains } from "@/data/common";
import { fetchContractMetadata } from "@/lib/contractMetadata";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const OPTIONS = async (_request: Request) =>
  new Response(null, { headers });

export const GET = async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");
  const chainId = searchParams.get("chainId");

  try {
    if (
      !chainId ||
      !/^[1-9]\d*$/.test(chainId) ||
      !Number.isSafeInteger(Number(chainId)) ||
      !address ||
      !/^0x[a-fA-F0-9]{40}$/.test(address)
    )
      throw new Error("Invalid identity");
    sourceCodeRequestSchema.parse({ address, chainId: Number(chainId) });
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers,
    });
  }

  const targetChainId = parseInt(chainId!);
  const chain = Object.values(etherscanChains).find(
    (chain) => chain.id === targetChainId
  );
  const { body, statusCode } = await fetchContractMetadata({
    chainId: targetChainId,
    address: address!,
    isRoutescan: chain?.isRoutescan === true,
  });
  return new Response(JSON.stringify(body), { status: statusCode, headers });
};
