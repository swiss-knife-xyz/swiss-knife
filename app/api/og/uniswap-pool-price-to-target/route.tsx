import { toolOgImage } from "@/lib/seoOg";

export const runtime = "edge";

export function GET() {
  return toolOgImage("Uniswap V4 Pool Price to Target", "Calculate swaps needed to move a Uniswap v4 pool toward a target price.");
}
