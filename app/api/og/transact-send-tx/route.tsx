import { toolOgImage } from "@/lib/seoOg";

export const runtime = "edge";

export function GET() {
  return toolOgImage("Send Transaction", "Send custom calldata to a contract or deploy a contract with raw bytecode.");
}
