import { getPublicClient } from "@/lib/publicClient";
import { waitForCustomChains } from "@/lib/customChains/store";
import { HASH, normalizeTrace, type TraceDocument } from "./model";

type TraceRpc = {
  Method: "debug_traceTransaction";
  Parameters: [
    string,
    { tracer: "callTracer"; timeout: string; tracerConfig: { withLog: true } },
  ];
  ReturnType: unknown;
};

export async function fetchTransactionTrace(
  chainId: number,
  transactionHash: string
): Promise<TraceDocument> {
  if (!HASH.test(transactionHash))
    throw new Error(
      "Enter a transaction hash (0x followed by 64 hex characters)."
    );
  await waitForCustomChains();
  const client = getPublicClient(chainId, { timeout: 30000 });
  // User-saved endpoints stay in the browser and retain the shared no-fallback policy.
  const actualChainId = await client.getChainId().catch(() => {
    throw new Error(
      "RPC unavailable. Check its URL or choose another network."
    );
  });
  if (actualChainId !== chainId)
    throw new Error(
      `RPC chain mismatch: expected ${chainId}, received ${actualChainId}.`
    );
  try {
    const result = await client.request<TraceRpc>(
      {
        method: "debug_traceTransaction",
        params: [
          transactionHash,
          {
            tracer: "callTracer",
            timeout: "20s",
            tracerConfig: { withLog: true },
          },
        ],
      },
      { retryCount: 0 }
    );
    return { ...normalizeTrace(result), chainId, transactionHash };
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Unknown RPC error.";
    if (
      /method.*(not found|not supported|not available|does not exist)|unsupported.*method|-32601/i.test(
        detail
      )
    )
      throw new Error(
        "Tracing is unavailable on this RPC. Add a trace-enabled RPC or import callTracer JSON."
      );
    if (/historical state|missing trie|pruned|state.*unavailable/i.test(detail))
      throw new Error("Historical state is unavailable. Try an archive RPC.");
    if (/timeout|timed out/i.test(detail))
      throw new Error("RPC timed out. Try another endpoint.");
    throw new Error(
      "Could not fetch trace. Check the network, RPC and transaction hash."
    );
  }
}
