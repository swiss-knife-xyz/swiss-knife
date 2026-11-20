// Private transport: no environment keys, client URLs or incoming headers reach providers.
import {
  parseRpcInput,
  record,
  RpcError,
  RPC_LIMITS,
  type RpcRequest,
} from "./model";
const ENDPOINTS: Record<string, string> = Object.freeze({
  "1": "https://eth.drpc.org",
  "8453": "https://mainnet.base.org",
  "42161": "https://arb1.arbitrum.io/rpc",
  "10": "https://mainnet.optimism.io",
  "11155111": "https://ethereum-sepolia-rpc.publicnode.com",
});
const HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};
function sameOrigin(request: Request) {
  try {
    const header = request.headers.get("origin");
    if (!header) return false;
    const origin = new URL(header);
    const host = request.headers.get("host") ?? new URL(request.url).host;
    return (
      header === origin.origin &&
      origin.host === host.toLowerCase() &&
      (origin.protocol === "https:" ||
        (origin.protocol === "http:" &&
          ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname)))
    );
  } catch {
    return false;
  }
}
/** Byte bounds apply to decompressed streams, including chunked and stalled bodies. */
async function jsonStream(
  body: ReadableStream<Uint8Array> | null,
  max: number,
  signal: AbortSignal,
  invalid: "INVALID" | "UNAVAILABLE"
) {
  if (!body) throw new RpcError(invalid);
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let abort: (() => void) | undefined;
  try {
    const aborted = new Promise<never>((_, reject) => {
      abort = () => {
        void reader.cancel().catch(() => {});
        reject(new RpcError("TIMEOUT"));
      };
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) abort();
    });
    for (;;) {
      const { done, value } = await Promise.race([reader.read(), aborted]);
      if (done) break;
      size += value.byteLength;
      if (size > max) throw new RpcError("LIMIT");
      chunks.push(value);
    }
    signal.throwIfAborted();
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    try {
      return JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(bytes)
      ) as unknown;
    } catch {
      throw new RpcError(invalid);
    }
  } finally {
    if (abort) signal.removeEventListener("abort", abort);
    // Cancellation is best-effort: a stalled source must not hold the handler/gate.
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
function checkedResponse(raw: unknown, request: RpcRequest | RpcRequest[]) {
  const batch = Array.isArray(request);
  const requests = batch ? request : [request];
  if (batch !== Array.isArray(raw)) throw new RpcError("UNAVAILABLE");
  const rows = Array.isArray(raw) ? raw : [raw];
  if (rows.length !== requests.length) throw new RpcError("UNAVAILABLE");
  const remaining = new Set(requests.map((r) => r.id));
  return rows.map((row) => {
    if (
      !record(row) ||
      row.jsonrpc !== "2.0" ||
      !remaining.delete(row.id as string | number) ||
      Object.hasOwn(row, "result") === Object.hasOwn(row, "error")
    )
      throw new RpcError("UNAVAILABLE");
    if (Object.hasOwn(row, "result"))
      return { jsonrpc: "2.0", id: row.id, result: row.result };
    if (!record(row.error) || !Number.isSafeInteger(row.error.code))
      throw new RpcError("UNAVAILABLE");
    // Provider diagnostic text/data can contain infrastructure details. Only the code crosses the boundary.
    return {
      jsonrpc: "2.0",
      id: row.id,
      error: {
        code: row.error.code,
        message:
          "Provider rejected this read query. Check parameters, historical state and method availability.",
      },
    };
  });
}
/** Bounded process-wide gate, not an unbounded per-user/IP map; not a distributed quota. */
export function createRpcHandler(
  deps: { fetch?: typeof fetch; now?: () => number; timeoutMs?: number } = {}
) {
  const fetcher = deps.fetch ?? fetch;
  const now = deps.now ?? Date.now;
  let active = 0;
  let starts: number[] = [];
  return async (request: Request) => {
    let acquired = false;
    try {
      if (
        request.method !== "POST" ||
        !sameOrigin(request) ||
        request.headers
          .get("content-type")
          ?.split(";")[0]
          .trim()
          .toLowerCase() !== "application/json"
      )
        throw new RpcError("ORIGIN");
      const signal = AbortSignal.any([
        request.signal,
        AbortSignal.timeout(deps.timeoutMs ?? RPC_LIMITS.timeoutMs),
      ]);
      const at = now();
      starts = starts.filter((t) => at - t < 60_000);
      if (active >= 2 || starts.length >= 30) throw new RpcError("BUSY");
      active++;
      acquired = true;
      starts.push(at);
      if (
        Number(request.headers.get("content-length")) > RPC_LIMITS.requestBytes
      )
        throw new RpcError("LIMIT");
      const input = parseRpcInput(
        await jsonStream(
          request.body,
          RPC_LIMITS.requestBytes,
          signal,
          "INVALID"
        )
      );
      const endpoint = ENDPOINTS[input.chain];
      if (!endpoint) throw new RpcError("INVALID");
      const upstream = async (body: RpcRequest | RpcRequest[]) => {
        const response = await fetcher(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal,
          redirect: "error",
          credentials: "omit",
          cache: "no-store",
        });
        if (!response.ok) {
          void response.body?.cancel().catch(() => {});
          throw new RpcError(response.status === 429 ? "BUSY" : "UNAVAILABLE");
        }
        if (
          Number(response.headers.get("content-length")) >
          RPC_LIMITS.responseBytes
        ) {
          void response.body?.cancel().catch(() => {});
          throw new RpcError("LIMIT");
        }
        return checkedResponse(
          await jsonStream(
            response.body,
            RPC_LIMITS.responseBytes,
            signal,
            "UNAVAILABLE"
          ),
          body
        );
      };
      const probe = await upstream({
        jsonrpc: "2.0",
        id: "chain-check",
        method: "eth_chainId",
        params: [],
      });
      if (probe[0].result !== `0x${BigInt(input.chain).toString(16)}`)
        throw new RpcError("UNAVAILABLE");
      const cap = (r: RpcRequest): RpcRequest =>
        r.method === "eth_call"
          ? {
              ...r,
              params: [
                {
                  ...(r.params[0] as object),
                  gas:
                    (r.params[0] as Record<string, unknown>).gas ?? "0x1e8480",
                },
                r.params[1],
              ],
            }
          : r;
      const outgoing = Array.isArray(input.request)
        ? input.request.map(cap)
        : cap(input.request);
      const result = await upstream(outgoing);
      signal.throwIfAborted();
      return Response.json(Array.isArray(input.request) ? result : result[0], {
        headers: HEADERS,
      });
    } catch (error) {
      const safe =
        error instanceof RpcError
          ? error
          : new RpcError(
              error instanceof Error &&
              ["AbortError", "TimeoutError"].includes(error.name)
                ? "TIMEOUT"
                : "UNAVAILABLE"
            );
      const status = {
        INVALID: 400,
        PARAMS: 400,
        LIMIT: 413,
        ORIGIN: 403,
        BUSY: 429,
        TIMEOUT: 504,
        UNAVAILABLE: 502,
      }[safe.code];
      return Response.json(
        { error: { code: safe.code, message: safe.message } },
        {
          status,
          headers: {
            ...HEADERS,
            ...(status === 429 ? { "Retry-After": "60" } : {}),
          },
        }
      );
    } finally {
      if (acquired) active--;
    }
  };
}
