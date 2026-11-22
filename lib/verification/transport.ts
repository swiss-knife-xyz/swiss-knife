import { VerificationError } from "./source";
/** Bounded streaming read: never parse unlimited provider or caller data. */
export async function readJson(
  body: ReadableStream<Uint8Array> | null,
  max: number,
  signal: AbortSignal
): Promise<unknown> {
  if (!body) throw new VerificationError("UNAVAILABLE");
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  let abort: (() => void) | undefined;
  try {
    const aborted = new Promise<never>((_, reject) => {
      abort = () => {
        void reader.cancel().catch(() => {});
        reject(new VerificationError("UNAVAILABLE"));
      };
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) abort();
    });
    for (;;) {
      const { done, value } = await Promise.race([reader.read(), aborted]);
      if (done) break;
      bytes += value.byteLength;
      if (bytes > max) throw new VerificationError("UNAVAILABLE");
      chunks.push(value);
    }
    signal.throwIfAborted();
    const joined = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) {
      joined.set(chunk, offset);
      offset += chunk.length;
    }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(joined));
  } finally {
    if (abort) signal.removeEventListener("abort", abort);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
/** Next may normalize request.url to localhost; CSRF binds Origin to real Host.
 * Forwarded host/protocol headers are deliberately not trusted for authorization.
 */
export function isSameOrigin(request: Request) {
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
function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
