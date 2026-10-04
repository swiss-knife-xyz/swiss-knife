import { toolOgImage } from "@/lib/seoOg";

export const runtime = "edge";

export function GET() {
  return toolOgImage("Uniswap V4 Tick to Price", "Convert Uniswap v4 ticks into prices for any token pair.");
}
