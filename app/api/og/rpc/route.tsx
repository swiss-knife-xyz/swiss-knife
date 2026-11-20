import { toolOgImage } from "@/lib/seoOg";
export const runtime = "edge";
export function GET() {
  return toolOgImage(
    "Raw RPC Console",
    "Read-only JSON-RPC · safe batches · no wallet"
  );
}
