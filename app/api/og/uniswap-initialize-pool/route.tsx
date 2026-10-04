import { toolOgImage } from "@/lib/seoOg";

export const runtime = "edge";

export function GET() {
  return toolOgImage("Uniswap V4 Initialize Pool", "Configure tokens, fees, tick spacing, and initial prices for Uniswap v4 pools.");
}
