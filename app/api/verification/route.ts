import { VerificationService } from "@/lib/verification/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 25;
// Private runtime environment only. Never NEXT_PUBLIC_*, query input or client props.
const service = new VerificationService({
  key: () => process.env.ETHERSCAN_API_KEY,
});
export function POST(request: Request) {
  return service.handle(request);
}
