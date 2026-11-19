import { createPublicClientForRpcUrl } from "@/lib/publicClient";
import { traceInput, TRACE_ENDPOINT } from "@/lib/trace/model";
import {
  boundedFetch,
  fetchTrace,
  publicTraceError,
  TraceGate,
} from "@/lib/trace/rpc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
const gate = new TraceGate();
const headers = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

/** Read-only fixed Ethereum provider. No URL/method/credential comes from callers. */
export async function GET(request: Request) {
  let release: (() => void) | undefined;
  try {
    const params = new URL(request.url).searchParams;
    const { hash } = traceInput(params.get("chain"), params.get("hash"));
    release = gate.acquire();
    const signal = AbortSignal.any([
      request.signal,
      AbortSignal.timeout(25_000),
    ]);
    const client = createPublicClientForRpcUrl(TRACE_ENDPOINT, {
      retryCount: 0,
      timeout: 12_000,
      fetchFn: boundedFetch(fetch, signal),
    });
    const result = await fetchTrace("1", hash, (req) =>
      // The request union is narrower than viem's standard schema (debug is an extension).
      client.request(req as Parameters<typeof client.request>[0], {
        retryCount: 0,
      })
    );
    return Response.json(result, { headers });
  } catch (error) {
    const safe = publicTraceError(error);
    const status = ["INVALID_INPUT", "UNSUPPORTED"].includes(safe.code)
      ? 400
      : safe.code === "RATE_LIMITED"
        ? 429
        : safe.code === "NOT_CONFIRMED"
          ? 404
          : safe.code === "TIMEOUT"
            ? 504
            : 502;
    return Response.json(
      { error: { code: safe.code, message: safe.message } },
      {
        status,
        headers: {
          ...headers,
          ...(status === 429 ? { "Retry-After": "60" } : {}),
        },
      }
    );
  } finally {
    release?.();
  }
}
