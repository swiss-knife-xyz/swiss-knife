import { toolOgImage } from "@/lib/seoOg";

export const runtime = "edge";

export function GET() {
  return toolOgImage("Uniswap V4 Positions", "View and manage your Uniswap v4 liquidity positions.");
}
