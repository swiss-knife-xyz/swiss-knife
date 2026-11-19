import { toolOgImage } from "@/lib/seoOg";
export const runtime = "edge";
export function GET() {
  return toolOgImage(
    "Transaction Tracer",
    "Real nested execution · internal calls · reverts · Ethereum"
  );
}
