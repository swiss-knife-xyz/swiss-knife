// Server-only dependency: importing this module from a client build is unsupported.
import { randomBytes } from "node:crypto";
import {
  importBlockscoutSource,
  verificationInput,
  VERIFICATION_CHAINS,
  VerificationError,
  VERIFICATION_MESSAGES,
  type ImportedSource,
  type VerificationChain,
  type VerificationReview,
  type VerificationStatus,
  type VerificationState,
} from "./source";

const ETHERSCAN_ENDPOINT = "https://api.etherscan.io/v2/api";
const MINUTE = 60_000;
const headers = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};
type Job = {
  id: string;
  chainId: VerificationChain;
  address: string;
  destinationUrl: string;
  expires: number;
  state: VerificationState;
  source?: ImportedSource;
  guid?: string;
  lastCheck: number;
};
type Dependencies = {
  key: () => string | undefined;
  fetch?: typeof fetch;
  now?: () => number;
};

/** Bounded streaming read: never parse unlimited provider or caller data. */
async function readJson(
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
function isSameOrigin(request: Request) {
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

/**
 * Ephemeral, bounded per-instance reviews/jobs; no browser-provided source, GUID,
 * key, RPC, URL or arbitrary Etherscan action. No logging of fetch errors/URLs.
 * Restart/instance changes fail closed; explorer links are the recovery path.
 */
export class VerificationService {
  private jobs = new Map<string, Job>();
  private starts: number[] = [];
  private active = false;
  private etherscanStarts: number[] = [];
  private reserveEtherscan() {
    const now = this.now();
    this.etherscanStarts = this.etherscanStarts.filter((at) => now - at < 1000);
    if (this.etherscanStarts.length >= 2)
      throw new VerificationError("RATE_LIMITED");
    this.etherscanStarts.push(now);
  }
  private fetcher: typeof fetch;
  private now: () => number;
  constructor(private dependencies: Dependencies) {
    this.fetcher = dependencies.fetch ?? fetch;
    this.now = dependencies.now ?? Date.now;
  }
  private status(job: Job): VerificationStatus {
    return { id: job.id, state: job.state, destinationUrl: job.destinationUrl };
  }
  private acquire() {
    const now = this.now();
    this.starts = this.starts.filter((at) => now - at < MINUTE);
    if (this.active || this.starts.length >= 12)
      throw new VerificationError("RATE_LIMITED");
    this.starts.push(now);
    this.active = true;
  }
  private async upstream(
    url: string,
    init: RequestInit,
    max: number,
    signal: AbortSignal
  ) {
    // Call sites construct URLs exclusively from fixed constants and validated data.
    const response = await this.fetcher(url, {
      ...init,
      redirect: "error",
      credentials: "omit",
      cache: "no-store",
      signal,
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new VerificationError(
        response.status === 429 ? "RATE_LIMITED" : "UNAVAILABLE"
      );
    }
    return readJson(response.body, max, signal);
  }
  private async etherscan(
    job: Job,
    action: "verifysourcecode" | "checkverifystatus",
    signal: AbortSignal,
    form?: URLSearchParams
  ) {
    const key = this.dependencies.key();
    if (!key || !/^[A-Za-z0-9_-]{8,128}$/.test(key))
      throw new VerificationError("NOT_CONFIGURED");
    // Official V2 API: query auth. Only this server-to-Etherscan request has it.
    // Never serialize this URL, response text, exception or upstream GUID to clients/logs.
    const url = new URL(ETHERSCAN_ENDPOINT);
    url.search = new URLSearchParams({
      chainid: job.chainId,
      module: "contract",
      action,
      apikey: key,
    }).toString();
    if (action === "checkverifystatus") url.searchParams.set("guid", job.guid!);
    const raw = await this.upstream(
      url.href,
      {
        method: form ? "POST" : "GET",
        ...(form
          ? {
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: form.toString(),
            }
          : {}),
      },
      16_384,
      signal
    );
    if (
      !object(raw) ||
      !["0", "1"].includes(String(raw.status)) ||
      typeof raw.result !== "string"
    )
      throw new VerificationError("UNAVAILABLE");
    // Only a small known vocabulary ever crosses the trust boundary.
    const result = raw.result;
    if (
      /^(?:(?:Contract source code|Source code) already verified|Already Verified)$/i.test(
        result
      )
    )
      return { state: "already_verified" as const };
    if (
      action === "verifysourcecode" &&
      raw.status === "1" &&
      !result.includes(key) &&
      /^[A-Za-z0-9]{16,128}$/.test(result)
    )
      return { state: "pending" as const, guid: result };
    if (
      action === "checkverifystatus" &&
      raw.status === "1" &&
      result === "Pass - Verified"
    )
      return { state: "verified" as const };
    if (
      action === "checkverifystatus" &&
      raw.status === "0" &&
      /^(Pending in queue|In progress)$/.test(result)
    )
      return { state: "pending" as const };
    if (/rate limit|too many requests/i.test(result))
      throw new VerificationError("RATE_LIMITED");
    if (
      raw.status === "0" &&
      /^(Fail -|Error! Unable to verify|Unable to verify|Invalid constructor arguments)/i.test(
        result
      )
    )
      return { state: "failed" as const };
    throw new VerificationError("UNAVAILABLE");
  }
  async handle(request: Request): Promise<Response> {
    let acquired = false;
    try {
      if (
        request.method !== "POST" ||
        !isSameOrigin(request) ||
        request.headers.get("sec-fetch-site") === "cross-site" ||
        !/^application\/json(?:\s*;.*)?$/i.test(
          request.headers.get("content-type") ?? ""
        )
      )
        throw new VerificationError("INVALID_INPUT");
      this.acquire();
      acquired = true;
      const signal = AbortSignal.any([
        request.signal,
        AbortSignal.timeout(20_000),
      ]);
      let body: unknown;
      try {
        body = await readJson(request.body, 2048, signal);
      } catch {
        throw new VerificationError("INVALID_INPUT");
      }
      if (!object(body)) throw new VerificationError("INVALID_INPUT");
      const { chainId, address } = verificationInput(
        body.chainId,
        body.address
      );
      const allowed =
        body.operation === "preview"
          ? ["operation", "chainId", "address"]
          : body.operation === "submit"
            ? ["operation", "chainId", "address", "id", "confirmed"]
            : body.operation === "status"
              ? ["operation", "chainId", "address", "id"]
              : [];
      if (
        !allowed.length ||
        Object.keys(body).some((k) => !allowed.includes(k))
      )
        throw new VerificationError("INVALID_INPUT");
      const now = this.now();
      for (const [id, job] of this.jobs)
        if (job.expires <= now) this.jobs.delete(id);
      if (body.operation === "preview") {
        if (this.jobs.size >= 16) throw new VerificationError("RATE_LIMITED");
        const chain = VERIFICATION_CHAINS[chainId];
        const raw = await this.upstream(
          `${chain.blockscout}/api/v2/smart-contracts/${address}`,
          { method: "GET" },
          4_000_000,
          signal
        );
        const source = importBlockscoutSource(raw);
        const totalBytes = [...this.jobs.values()].reduce(
          (sum, job) => sum + (job.source?.sourceCode.length ?? 0),
          source.sourceCode.length
        );
        if (totalBytes > 8_000_000) throw new VerificationError("RATE_LIMITED");
        const id = randomBytes(32).toString("hex");
        const job: Job = {
          id,
          chainId,
          address,
          source,
          destinationUrl: `${chain.etherscan}/address/${address}#code`,
          state: "ready",
          expires: now + 10 * MINUTE,
          lastCheck: 0,
        };
        this.jobs.set(id, job);
        const review: VerificationReview = {
          ...source,
          id,
          chainId,
          address,
          sourceUrl: `${chain.blockscout}/address/${address}?tab=contract`,
          destinationUrl: job.destinationUrl,
          expiresAt: new Date(job.expires).toISOString(),
        };
        return Response.json(review, { headers });
      }
      if (typeof body.id !== "string" || !/^[a-f0-9]{64}$/.test(body.id))
        throw new VerificationError("INVALID_INPUT");
      const job = this.jobs.get(body.id);
      if (!job || job.chainId !== chainId || job.address !== address)
        throw new VerificationError("EXPIRED");
      if (body.operation === "submit") {
        if (body.confirmed !== true)
          throw new VerificationError("CONFIRM_REQUIRED");
        if (job.state !== "ready")
          return Response.json(this.status(job), { headers });
        // Check configuration before consuming consent; never retry a possibly sent POST.
        const configuredKey = this.dependencies.key();
        if (!configuredKey || !/^[A-Za-z0-9_-]{8,128}$/.test(configuredKey))
          throw new VerificationError("NOT_CONFIGURED");
        this.reserveEtherscan();
        const source = job.source!;
        const form = new URLSearchParams({
          contractaddress: address,
          sourceCode: source.sourceCode,
          contractname: source.contractName,
          compilerversion: source.compilerVersion,
          constructorArguments: source.constructorArguments,
          codeformat: "solidity-standard-json-input",
          licenseType: source.licenseType,
        });
        job.state = "submitting";
        job.source = undefined;
        job.expires = now + 24 * 60 * MINUTE;
        try {
          const result = await this.etherscan(
            job,
            "verifysourcecode",
            signal,
            form
          );
          job.state = result.state;
          job.guid = "guid" in result ? result.guid : undefined;
        } catch {
          job.state = "unknown";
          throw new VerificationError("UNKNOWN_DELIVERY");
        }
      } else if (job.state === "pending") {
        if (now - job.lastCheck < 5000)
          throw new VerificationError("RATE_LIMITED");
        this.reserveEtherscan();
        job.lastCheck = now;
        const result = await this.etherscan(job, "checkverifystatus", signal);
        job.state = result.state;
      }
      return Response.json(this.status(job), { headers });
    } catch (error) {
      // Do not echo any error message, cause, provider result, request URL or key.
      const code =
        error instanceof VerificationError ? error.code : "UNAVAILABLE";
      const status =
        code === "RATE_LIMITED"
          ? 429
          : code === "INVALID_INPUT" || code === "CONFIRM_REQUIRED"
            ? 400
            : code === "EXPIRED"
              ? 410
              : code === "NOT_CONFIGURED"
                ? 503
                : code === "UNKNOWN_DELIVERY"
                  ? 502
                  : 422;
      return Response.json(
        { error: { code, message: VERIFICATION_MESSAGES[code] } },
        {
          status,
          headers: {
            ...headers,
            ...(status === 429 ? { "Retry-After": "60" } : {}),
          },
        }
      );
    } finally {
      if (acquired) this.active = false;
    }
  }
}
