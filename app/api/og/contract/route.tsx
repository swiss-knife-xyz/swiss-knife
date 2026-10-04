import { toolOgImage } from "@/lib/seoOg";

export const runtime = "edge";
export function GET() {
  return toolOgImage("Contract Explorer", "Read and write smart contract functions, inspect storage, and use raw calldata.");
}
