import { toolOgImage } from "@/lib/seoOg";
export const runtime = "edge";
export function GET() {
  return toolOgImage(
    "Deploy Mock Tokens",
    "ERC20 · ERC721 · ERC1155 · explicit network & gas review"
  );
}
