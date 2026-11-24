import { MockTokenEtherscanVerification } from "@/lib/mockTokenEtherscanVerification";
import { configuredJobStore } from "@/lib/verification/store";
import { getPublicClient } from "@/lib/publicClient";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 25;
const service = new MockTokenEtherscanVerification({
  key: () => process.env.ETHERSCAN_API_KEY,
  store: configuredJobStore(),
  client: (chainId) => getPublicClient(chainId, { timeout: 10_000 }),
});
export function POST(request: Request) {
  return service.handle(request);
}
