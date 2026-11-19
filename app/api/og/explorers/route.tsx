import { toolOgImage } from "@/lib/seoOg";

export const runtime = "edge";
export function GET() {
  return toolOgImage(
    "Explorer Directory",
    "View any address/ENS or transaction across EVM explorers."
  );
}
