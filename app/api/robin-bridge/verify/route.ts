import { NextRequest, NextResponse } from "next/server";
import { isAddress, isHash } from "viem";
import standardInput from "@/app/robin-bridge/lib/oftStandardInput.generated.json";

const SOURCIFY_API = "https://sourcify.dev/server/v2/verify";
const supportedContracts = {
  adapter: "RobinOFTAdapter.sol:RobinOFTAdapter",
  oft: "RobinOFT.sol:RobinOFT",
} as const;

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    chainId?: number;
    address?: string;
    transactionHash?: string;
    contract?: keyof typeof supportedContracts;
  };

  if (
    (body.chainId !== 8453 && body.chainId !== 4663) ||
    !body.address ||
    !isAddress(body.address) ||
    !body.transactionHash ||
    !isHash(body.transactionHash) ||
    !body.contract ||
    !(body.contract in supportedContracts)
  ) {
    return NextResponse.json(
      { error: "Invalid verification request." },
      { status: 400 }
    );
  }

  const response = await fetch(
    `${SOURCIFY_API}/${body.chainId}/${body.address}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stdJsonInput: standardInput,
        compilerVersion: "0.8.28+commit.7893614a",
        contractIdentifier: supportedContracts[body.contract],
        creationTransactionHash: body.transactionHash,
      }),
      cache: "no-store",
    }
  );
  const result = await response.json();

  if (!response.ok) {
    return NextResponse.json(
      {
        error:
          result?.message ?? result?.error ?? "Sourcify verification failed.",
      },
      { status: response.status }
    );
  }

  return NextResponse.json(result);
}
