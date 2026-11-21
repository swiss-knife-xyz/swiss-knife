import { VerificationService } from "@/lib/verification/server";
import { configuredJobStore } from "@/lib/verification/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 25;
// Private runtime environment only. Never NEXT_PUBLIC_*, query input or client props.
const service = new VerificationService({
  key: () => process.env.ETHERSCAN_API_KEY,
  keys: () => ({
    blockscout: process.env.BLOCKSCOUT_API_KEY,
    routescan: process.env.ROUTESCAN_API_KEY,
  }),
  store: configuredJobStore(),
});
export function POST(request: Request) {
  return service.handle(request);
}
