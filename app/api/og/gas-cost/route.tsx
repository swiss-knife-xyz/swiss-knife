import { toolOgImage } from "@/lib/seoOg";

export const runtime = "edge";

export function GET() {
  return toolOgImage(
    "Cross-chain Gas Cost",
    "Same gas used × current destination gas price. Native token + optional USD. Estimate only, not a simulation."
  );
}
