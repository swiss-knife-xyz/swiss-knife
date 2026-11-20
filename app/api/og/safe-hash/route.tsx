import { toolOgImage } from "@/lib/seoOg";

export const runtime = "edge";

export function GET() {
  return toolOgImage(
    "Safe Transaction Hash",
    "Verify manual Safe transaction parameters and EIP-712 domain, message and transaction hashes locally."
  );
}
