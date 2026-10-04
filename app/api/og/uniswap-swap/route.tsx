import { toolOgImage } from "@/lib/seoOg";

export const runtime = "edge";

export function GET() {
  return toolOgImage("Uniswap V4 Swap", "Inspect pools, quote swaps, and swap tokens using Uniswap v4.");
}
