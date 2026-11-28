import { getPublicClient } from "@/lib/publicClient";
import { waitForCustomChains } from "@/lib/customChains/store";
import { HASH, normalizeTrace, type TraceDocument } from "./model";
import {
  getNetworkName,
  getRuntimeCustomChain,
  preferAlchemyTrace,
  alchemyTraceNetworks,
  traceWithoutLogs,
} from "@/data/networks";
import { fetchHostedTrace } from "./hosted";

type TraceRpc = {
  Method: "debug_traceTransaction";
  Parameters: [
    string,
    { tracer: "callTracer"; timeout: string; tracerConfig?: { withLog: true } },
  ];
  ReturnType: unknown;
};

function traceFailure(error: unknown, chainId: number): Error {
  const codes = new Set<number>();
  const statuses = new Set<number>();
  const messages: string[] = [];
  const seen = new Set<unknown>();
  let current = error;
  // viem wraps provider errors; the useful RPC code may be in a nested cause.
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const entry = current as Record<string, unknown>;
    if (typeof entry.code === "number") codes.add(entry.code);
    if (typeof entry.status === "number") statuses.add(entry.status);
    for (const field of ["shortMessage", "details", "message"]) {
      if (typeof entry[field] === "string") messages.push(entry[field]);
    }
    current = entry.cause;
  }
  const detail = messages
    .join("\n")
    .replace(/https?:\/\/\S+/gi, "[RPC endpoint]");
  if (statuses.has(429) || /rate.?limit|too many requests/i.test(detail))
    return new Error(
      "RPC rate limit reached. Wait and retry, or choose another endpoint."
    );
  if (codes.has(-32005))
    return new Error(
      "RPC request exceeds provider limits. Try another endpoint."
    );
  if (
    statuses.has(401) ||
    statuses.has(403) ||
    codes.has(4100) ||
    /unauthori[sz]ed|forbidden|access denied|authentication (?:failed|required)|(?:invalid|missing|expired|revoked) api.?key|api.?key (?:is )?(?:invalid|missing|expired|revoked)|upgrade.*plan|not available.*plan|payment required/i.test(
      detail
    )
  )
    return new Error(
      "RPC access denied. Check the API key, provider plan and tracing permissions, or choose another endpoint."
    );
  if (
    codes.has(-32601) ||
    codes.has(-32004) ||
    codes.has(4200) ||
    /-32601|method(?:\s+["'`]?debug_traceTransaction["'`]?)?\s+(?:is\s+)?(?:not found|not supported|not available|does not exist|disabled|not enabled)|unsupported\s+(?:rpc\s+)?method|debug_traceTransaction["'`]?\s+(?:is\s+)?(?:not supported|not available|not enabled|disabled)|debug (?:api|namespace).*(?:disabled|not enabled|not available)/i.test(
      detail
    )
  )
    return new Error(
      "Tracing is unavailable on this RPC. Add a trace-enabled RPC or import callTracer JSON."
    );
  if (
    /unknown tracer|unsupported tracer|tracer.*(?:not found|not supported)|callTracer.*(?:not available|not supported|disabled)/i.test(
      detail
    )
  )
    return new Error(
      "This RPC does not support callTracer. Choose a callTracer-enabled RPC or import callTracer JSON."
    );
  if (
    /historical state|missing trie|pruned|state.*unavailable|historical.*(?:not available|not found)|required historical state/i.test(
      detail
    )
  )
    return new Error("Historical state is unavailable. Try an archive RPC.");
  if (
    /transaction.*(?:not found|unknown)|unknown transaction|transaction indexing is in progress/i.test(
      detail
    )
  )
    return new Error(
      "Transaction not found on this RPC. Check the network and hash, or retry once the transaction is mined and indexed."
    );
  if (/timeout|timed out/i.test(detail))
    return new Error(
      getRuntimeCustomChain(chainId)
        ? `${getNetworkName(chainId)} custom RPC timed out`
        : `${getNetworkName(chainId)} public RPC doesn't support debug traces`
    );
  return new Error(
    `Could not fetch trace. The ${getNetworkName(chainId)} RPC failed to complete debug_traceTransaction. Check the network and transaction hash, use an RPC with callTracer support, or import callTracer JSON.`
  );
}

export async function fetchTransactionTrace(
  chainId: number,
  transactionHash: string
): Promise<TraceDocument> {
  if (!HASH.test(transactionHash))
    throw new Error(
      "Enter a transaction hash (0x followed by 64 hex characters)."
    );
  await waitForCustomChains();
  // Saved endpoints are intentional overrides, including forks sharing a public ID.
  // They must never be sent to our server or fall back to an unrelated provider.
  const custom = !!getRuntimeCustomChain(chainId);
  const hostedFirst = !custom && preferAlchemyTrace.has(chainId);
  let hostedError: unknown;
  if (hostedFirst) {
    try {
      const result = await fetchHostedTrace(chainId, transactionHash);
      if (result) return result;
    } catch (error) {
      hostedError = error;
    }
  }
  try {
    return await fetchPublicTrace(chainId, transactionHash);
  } catch (error) {
    if (!custom && !hostedFirst && alchemyTraceNetworks[chainId]) {
      try {
        const result = await fetchHostedTrace(chainId, transactionHash);
        if (result) return result;
      } catch {
        /* Preserve the original endpoint error if the fallback also fails. */
      }
    }
    if (hostedError) throw hostedError;
    throw error;
  }
}

async function fetchPublicTrace(
  chainId: number,
  transactionHash: string
): Promise<TraceDocument> {
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
            ...(!traceWithoutLogs.has(chainId)
              ? { tracerConfig: { withLog: true as const } }
              : {}),
          },
        ],
      },
      { retryCount: 0 }
    );
    return { ...normalizeTrace(result), chainId, transactionHash };
  } catch (error) {
    throw traceFailure(error, chainId);
  }
}
