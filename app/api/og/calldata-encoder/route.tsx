import { toolOgImage } from "@/lib/seoOg";

export const runtime = "edge";

export function GET() {
  return toolOgImage("Calldata Encoder", "Encode smart contract function arguments into Ethereum transaction calldata.");
}
