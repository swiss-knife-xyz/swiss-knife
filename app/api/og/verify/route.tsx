import { toolOgImage } from "@/lib/seoOg";
export const runtime = "edge";
export function GET() {
  return toolOgImage(
    "Cross-explorer Verification",
    "Etherscan · Blockscout · Routescan · Sourcify"
  );
}
