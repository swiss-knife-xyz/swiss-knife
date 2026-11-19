import {
  normalizeCallTrace,
  traceInput,
  TraceError,
  TRACE_PROVIDER,
  TRACE_ENDPOINT,
  TRACE_LIMITS,
  type TraceResult,
} from "./model";
export type TraceRequest = {
  method:
    | "eth_chainId"
    | "eth_getTransactionReceipt"
    | "debug_traceTransaction";
  params?: unknown[];
};
export type TraceRequester = (req: TraceRequest) => Promise<unknown>;

/** Only sanitized categories cross the API boundary, never RPC bodies/URLs. */
export function publicTraceError(error: unknown): TraceError {
  const parts: string[] = [];
  let current = error;
  for (let i = 0; i < 8 && current && typeof current === "object"; i++) {
    if (current instanceof TraceError) return current;
    const e = current as Record<string, unknown>;
    parts.push(
      String(e.code ?? ""),
      String(e.name ?? ""),
      String(e.message ?? ""),
      String(e.details ?? "")
    );
    current = e.cause;
  }
  const text = parts.join(" ");
  if (/429|rate.?limit|too many requests/i.test(text))
    return new TraceError(
      "RATE_LIMITED",
      "Trace provider is rate-limiting requests. Wait a minute before retrying."
    );
  if (
    /-32601|method.*(not found|not available|does not exist)|unsupported method/i.test(
      text
    )
  )
    return new TraceError(
      "UNSUPPORTED",
      "This provider does not currently support callTracer tracing. No receipt- or calldata-derived substitute is shown."
    );
  if (
    /missing trie|pruned|historical state|state.*unavailable|reexec/i.test(text)
  )
    return new TraceError(
      "PRUNED",
      "Historical execution state is pruned or unavailable at this provider. Try a more recent confirmed transaction."
    );
  if (/timeout|timed out|abort/i.test(text))
    return new TraceError(
      "TIMEOUT",
      "Trace request timed out. Large or historical transactions may not be available from this public provider."
    );
  return new TraceError(
    "UNAVAILABLE",
    "Public trace provider is unavailable or access-restricted. Tracing is experimental; no substitute trace is shown."
  );
}

/** Limit decompressed bytes before viem's JSON parser, including stalled bodies. */
export function boundedFetch(
  fetcher: typeof fetch = fetch,
  outerSignal?: AbortSignal
): typeof fetch {
  return async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url !== TRACE_ENDPOINT && url !== `${TRACE_ENDPOINT}/`)
      throw new TraceError("UNAVAILABLE", "Trace endpoint is not allowlisted.");
    const signals = [
      AbortSignal.timeout(TRACE_LIMITS.timeoutMs),
      ...(outerSignal ? [outerSignal] : []),
      ...(init?.signal ? [init.signal] : []),
    ];
    const signal = AbortSignal.any(signals);
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    let onAbort: (() => void) | undefined;
    try {
      const response = await fetcher(TRACE_ENDPOINT, {
        ...init,
        signal,
        redirect: "error",
        credentials: "omit",
        cache: "no-store",
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new TraceError(
          response.status === 429 ? "RATE_LIMITED" : "UNAVAILABLE",
          response.status === 429
            ? "Trace provider is rate-limiting requests. Wait a minute before retrying."
            : "Trace provider is unavailable or access-restricted."
        );
      }
      if (Number(response.headers.get("content-length")) > TRACE_LIMITS.bytes) {
        await response.body?.cancel();
        throw new TraceError(
          "LIMIT",
          "Trace response exceeds the 1 MB viewer limit. No partial trace is shown."
        );
      }
      reader = response.body?.getReader();
      if (!reader)
        throw new TraceError(
          "INVALID_TRACE",
          "Provider returned an empty response."
        );
      const chunks: Uint8Array[] = [];
      let size = 0;
      const aborted = new Promise<never>((_, reject) => {
        onAbort = () => {
          void reader?.cancel().catch(() => {});
          reject(new TraceError("TIMEOUT", "Trace request timed out."));
        };
        signal.addEventListener("abort", onAbort, { once: true });
        if (signal.aborted) onAbort();
      });
      for (;;) {
        const { done, value } = await Promise.race([reader.read(), aborted]);
        if (done) break;
        size += value.byteLength;
        if (size > TRACE_LIMITS.bytes)
          throw new TraceError(
            "LIMIT",
            "Trace response exceeds the 1 MB viewer limit. No partial trace is shown."
          );
        chunks.push(value);
      }
      signal.throwIfAborted();
      const body = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        body.set(chunk, offset);
        offset += chunk.length;
      }
      return new Response(body, {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    } catch (error) {
      await reader?.cancel().catch(() => {});
      throw publicTraceError(error);
    } finally {
      if (onAbort) signal.removeEventListener("abort", onAbort);
      reader?.releaseLock();
    }
  };
}

/** Deliberately global per process, not a user/IP map or arbitrary RPC proxy. */
export class TraceGate {
  private active = false;
  private starts: number[] = [];
  acquire(now = Date.now()): () => void {
    this.starts = this.starts.filter((at) => now - at < 60_000);
    if (this.active || this.starts.length >= 6)
      throw new TraceError(
        "RATE_LIMITED",
        "Tracer is busy or at its public request limit. Wait a minute before retrying."
      );
    this.active = true;
    this.starts.push(now);
    let released = false;
    return () => {
      if (!released) {
        this.active = false;
        released = true;
      }
    };
  }
}

function receiptOf(raw: unknown, hash: string) {
  if (raw === null)
    throw new TraceError(
      "NOT_CONFIRMED",
      "Transaction is missing or not yet confirmed on Ethereum mainnet."
    );
  if (!raw || typeof raw !== "object")
    throw new TraceError(
      "INVALID_TRACE",
      "Invalid transaction receipt from provider."
    );
  const r = raw as Record<string, unknown>;
  if (
    typeof r.transactionHash !== "string" ||
    r.transactionHash.toLowerCase() !== hash ||
    typeof r.blockNumber !== "string" ||
    !/^0x[0-9a-fA-F]{1,64}$/.test(r.blockNumber) ||
    typeof r.blockHash !== "string" ||
    !/^0x[0-9a-fA-F]{64}$/.test(r.blockHash) ||
    !["0x0", "0x1"].includes(String(r.status))
  )
    throw new TraceError(
      "INVALID_TRACE",
      "Invalid confirmed transaction receipt from provider."
    );
  return {
    blockHash: r.blockHash.toLowerCase(),
    blockNumber: BigInt(r.blockNumber).toString(),
    status: r.status,
    from: r.from,
    to: r.to,
  };
}
export async function fetchTrace(
  chain: string | null,
  txHash: string | null,
  request: TraceRequester
): Promise<TraceResult> {
  const { hash, chainId } = traceInput(chain, txHash);
  if ((await request({ method: "eth_chainId", params: [] })) !== "0x1")
    throw new TraceError(
      "UNAVAILABLE",
      "Trace provider returned the wrong network. No trace is shown."
    );
  const receipt = receiptOf(
    await request({ method: "eth_getTransactionReceipt", params: [hash] }),
    hash
  );
  const root = normalizeCallTrace(
    await request({
      method: "debug_traceTransaction",
      params: [
        hash,
        {
          tracer: "callTracer",
          timeout: "8s",
          tracerConfig: { onlyTopCall: false, withLog: false },
        },
      ],
    })
  );
  if (
    typeof receipt.from !== "string" ||
    root.from.toLowerCase() !== receipt.from.toLowerCase() ||
    (receipt.to != null &&
      (typeof receipt.to !== "string" ||
        root.to?.toLowerCase() !== receipt.to.toLowerCase()))
  )
    throw new TraceError(
      "INVALID_TRACE",
      "Trace root does not match the transaction receipt."
    );
  if ((receipt.status === "0x0") !== !!root.error)
    throw new TraceError(
      "INVALID_TRACE",
      "Trace root status contradicts the transaction receipt."
    );
  const recheck = receiptOf(
    await request({ method: "eth_getTransactionReceipt", params: [hash] }),
    hash
  );
  if (recheck.blockHash !== receipt.blockHash)
    throw new TraceError(
      "REORG",
      "Transaction changed blocks while tracing. Try again once confirmed."
    );
  return {
    chainId,
    hash,
    blockHash: receipt.blockHash,
    blockNumber: receipt.blockNumber,
    status: receipt.status === "0x1" ? "success" : "reverted",
    provider: TRACE_PROVIDER,
    method: "debug_traceTransaction / callTracer",
    fetchedAt: new Date().toISOString(),
    root,
  };
}
