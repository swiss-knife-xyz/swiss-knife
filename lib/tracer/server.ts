// Server-only tracing transport. Import from API routes, never client components.
import { alchemyTraceNetworks, traceWithoutLogs } from "@/data/networks";
import { isSameOrigin, readJson } from "@/lib/verification/transport";
import { HASH, MAX_TRACE_BYTES, normalizeTrace } from "./model";

const headers = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
class TraceProviderError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}
function providerError(code: unknown, message: unknown): TraceProviderError {
  const detail = typeof message === "string" ? message : "";
  if (/not enabled for this app/i.test(detail))
    return new TraceProviderError(
      503,
      "Tracing is not enabled for this chain on the hosted provider."
    );
  if (
    code === -32601 ||
    /not supported|not available|not whitelisted|method not found/i.test(detail)
  )
    return new TraceProviderError(
      422,
      "Hosted RPC doesn't support debug traces for this chain."
    );
  if (/transaction.*not found|unknown transaction/i.test(detail))
    return new TraceProviderError(
      404,
      "Transaction not found. Check the chain and hash, or retry once it is indexed."
    );
  if (
    /historical state|missing trie|pruned|historical.*unavailable/i.test(detail)
  )
    return new TraceProviderError(
      422,
      "Historical state is unavailable on the tracing provider."
    );
  if (
    code === 429 ||
    /rate.?limit|too many requests|compute units/i.test(detail)
  )
    return new TraceProviderError(
      429,
      "Tracing provider rate limit reached. Try again shortly."
    );
  if (
    /unauthorized|forbidden|api.?key|access denied|upgrade.*plan/i.test(detail)
  )
    return new TraceProviderError(502, "Tracing provider access denied.");
  return new TraceProviderError(
    502,
    "Tracing provider could not complete this trace."
  );
}

/** Fixed method/hosts/options only. User RPC URLs and upstream errors are never forwarded. */
export function createHostedTraceHandler(
  deps: {
    key?: () => string | undefined;
    fetch?: typeof fetch;
    now?: () => number;
    timeoutMs?: number;
  } = {}
) {
  const fetcher = deps.fetch ?? fetch;
  const now = deps.now ?? Date.now;
  let active = 0;
  let starts: number[] = [];
  return async (request: Request) => {
    const reply = (value: unknown, status = 200) =>
      Response.json(value, { status, headers });
    if (request.method !== "POST" || !isSameOrigin(request))
      return reply({ error: "Same-origin POST required." }, 403);
    if (
      request.headers
        .get("content-type")
        ?.split(";")[0]
        .trim()
        .toLowerCase() !== "application/json"
    )
      return reply({ error: "JSON body required." }, 400);
    const controller = new AbortController();
    const cancel = () => controller.abort();
    request.signal.addEventListener("abort", cancel, { once: true });
    const timer = setTimeout(() => controller.abort(), deps.timeoutMs ?? 25000);
    let acquired = false;
    try {
      if (request.signal.aborted) controller.abort();
      let input: unknown;
      try {
        input = await readJson(request.body, 1024, controller.signal);
      } catch {
        return reply({ error: "Invalid trace request." }, 400);
      }
      if (
        !object(input) ||
        Object.keys(input).some((key) => !["chainId", "hash"].includes(key)) ||
        typeof input.chainId !== "number" ||
        !Number.isSafeInteger(input.chainId) ||
        input.chainId <= 0 ||
        typeof input.hash !== "string" ||
        !HASH.test(input.hash)
      )
        return reply({ error: "Invalid trace request." }, 400);
      const { chainId, hash } = input;
      const network = alchemyTraceNetworks[chainId];
      if (!network)
        return reply(
          {
            error: "Hosted tracing is unavailable for this chain.",
            unavailable: true,
          },
          404
        );
      const key = (deps.key ?? (() => process.env.ALCHEMY_API_KEY))()?.trim();
      if (!key)
        return reply(
          { error: "Hosted tracing is not configured.", unavailable: true },
          503
        );
      starts = starts.filter((time) => now() - time < 60000);
      if (active >= 3 || starts.length >= 60)
        return reply({ error: "Tracing is busy. Try again shortly." }, 429);
      starts.push(now());
      active++;
      acquired = true;
      const url = `https://${network}.g.alchemy.com/v2/${encodeURIComponent(key)}`;
      async function rpc(method: string, params: unknown[], limit: number) {
        const response = await fetcher(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
          signal: controller.signal,
          cache: "no-store",
          redirect: "error",
          credentials: "omit",
        });
        if (!response.ok) {
          void response.body?.cancel().catch(() => {});
          throw new TraceProviderError(
            response.status === 429 ? 429 : 502,
            response.status === 429
              ? "Tracing provider rate limit reached. Try again shortly."
              : "Tracing provider is unavailable."
          );
        }
        const payload = await readJson(response.body, limit, controller.signal);
        if (!object(payload)) throw new Error("Invalid upstream response");
        if (object(payload.error))
          throw providerError(payload.error.code, payload.error.message);
        return payload.result;
      }
      const identity = await rpc("eth_chainId", [], 1024);
      if (
        typeof identity !== "string" ||
        !/^0x[\da-f]+$/i.test(identity) ||
        BigInt(identity) !== BigInt(chainId)
      )
        throw new TraceProviderError(
          502,
          "Tracing provider returned the wrong chain."
        );
      const trace = await rpc(
        "debug_traceTransaction",
        [
          hash,
          {
            tracer: "callTracer",
            timeout: "20s",
            ...(!traceWithoutLogs.has(chainId)
              ? { tracerConfig: { withLog: true } }
              : {}),
          },
        ],
        MAX_TRACE_BYTES
      );
      return reply({
        ...normalizeTrace(trace),
        chainId,
        transactionHash: hash,
      });
    } catch (error) {
      if (controller.signal.aborted)
        return reply(
          { error: "Tracing provider timed out. Try again shortly." },
          504
        );
      return reply(
        {
          error:
            error instanceof TraceProviderError
              ? error.message
              : "Tracing provider is unavailable.",
        },
        error instanceof TraceProviderError ? error.status : 502
      );
    } finally {
      clearTimeout(timer);
      request.signal.removeEventListener("abort", cancel);
      if (acquired) active--;
    }
  };
}
