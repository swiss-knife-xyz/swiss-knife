import { toolOgImage } from "@/lib/seoOg";

export const runtime = "edge";

export function GET() {
  return toolOgImage("Uniswap V4 Add Liquidity", "Configure price ranges and add liquidity to Uniswap v4 pools.");
}
