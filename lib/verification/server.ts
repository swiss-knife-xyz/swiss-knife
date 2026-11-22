// Server-only: upstream credentials and provider job IDs never reach the client.
import { randomBytes, createHash } from "node:crypto";
import {
  VERIFICATION_MESSAGES,
  VerificationError,
  PROVIDERS,
  providersFor,
  explorerUrl,
  verificationInput,
  type VerificationProvider,
  type VerificationReview,
  type VerificationStatus,
  type VerificationState,
} from "./source";
import { ProviderClient, type ProviderKeys } from "./providers";
import { MemoryJobStore, type JobStore, type VerificationJob } from "./store";
import { record } from "./normalize";
import { readJson, isSameOrigin } from "./transport";
const MINUTE = 60_000;
const headers = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};
type Dependencies = {
  key: () => string | undefined;
  keys?: () => ProviderKeys;
  fetch?: typeof fetch;
  now?: () => number;
  store?: JobStore;
};
const errorCode = (e: unknown) =>
  e instanceof VerificationError ? e.code : ("UNAVAILABLE" as const);
function provider(value: unknown): value is VerificationProvider {
  return typeof value === "string" && Object.hasOwn(PROVIDERS, value);
}
function overall(job: VerificationJob): VerificationState {
  const states = job.targets.map((t) => t.state);
  if (states.every((s) => s === "already_verified")) return "already_verified";
  if (states.every((s) => ["verified", "already_verified"].includes(s)))
    return "verified";
  if (states.includes("pending")) return "pending";
  if (states.includes("submitting")) return "submitting";
  if (states.includes("ready")) return "ready";
  if (states.includes("unknown")) return "unknown";
  return "failed";
}
export class VerificationService {
  private starts: number[] = [];
  private active = 0;
  private now: () => number;
  private store: JobStore;
  private fetcher: typeof fetch;
  constructor(private dependencies: Dependencies) {
    this.now = dependencies.now ?? Date.now;
    this.fetcher = dependencies.fetch ?? fetch;
    this.store = dependencies.store ?? new MemoryJobStore(this.now);
  }
  private status(job: VerificationJob): VerificationStatus {
    return {
      id: job.id,
      state: overall(job),
      destinationUrl: job.targets[0].destinationUrl,
      targets: job.targets.map(
        ({ provider, state, destinationUrl, error }) => ({
          provider,
          state,
          destinationUrl,
          ...(error ? { error } : {}),
        })
      ),
    };
  }
  async handle(request: Request): Promise<Response> {
    let acquired = false,
      release: (() => Promise<void>) | undefined;
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
      this.starts = this.starts.filter((at) => this.now() - at < MINUTE);
      if (this.active >= 4 || this.starts.length >= 60)
        throw new VerificationError("RATE_LIMITED");
      this.active++;
      acquired = true;
      this.starts.push(this.now());
      const signal = AbortSignal.any([
        request.signal,
        AbortSignal.timeout(20_000),
      ]);
      let body: any;
      try {
        body = await readJson(request.body, 4096, signal);
      } catch {
        throw new VerificationError("INVALID_INPUT");
      }
      if (!record(body)) throw new VerificationError("INVALID_INPUT");
      const allowed =
        body.operation === "preview"
          ? [
              "operation",
              "chainId",
              "address",
              "sourceProvider",
              "destinations",
              "targetChainId",
              "targetAddress",
              "constructorArguments",
            ]
          : body.operation === "submit"
            ? [
                "operation",
                "chainId",
                "address",
                "id",
                "confirmed",
                "providers",
                "retry",
              ]
            : ["status", "resume"].includes(body.operation)
              ? ["operation", "chainId", "address", "id"]
              : [];
      if (
        !allowed.length ||
        Object.keys(body).some((k) => !allowed.includes(k))
      )
        throw new VerificationError("INVALID_INPUT");
      const { chainId, address } = verificationInput(
        body.chainId,
        body.address
      );
      const configured = this.dependencies.keys?.() ?? {};
      // Only fetch the Etherscan key when a route actually needs it. Blockscout
      // and Sourcify imports remain usable without Etherscan configuration.
      let ethKey: string | undefined;
      const needsEth =
        body.operation !== "preview" ||
        body.sourceProvider === "etherscan" ||
        body.sourceProvider === "auto" ||
        body.destinations?.includes("etherscan");
      if (needsEth) ethKey = this.dependencies.key();
      const credentials = {
        ...configured,
        ...(ethKey ? { etherscan: ethKey } : {}),
      };
      const client = new ProviderClient(
        this.fetcher,
        credentials,
        signal,
        (p) =>
          this.store.reserve(
            p,
            createHash("sha256")
              .update(credentials[p] ?? "public")
              .digest("hex")
              .slice(0, 24)
          )
      );
      if (body.operation === "preview") {
        const requested = body.sourceProvider ?? "blockscout";
        if (
          requested !== "auto" &&
          (!provider(requested) || !providersFor(chainId).includes(requested))
        )
          throw new VerificationError("UNSUPPORTED_ROUTE");
        const targetInput = verificationInput(
          body.targetChainId ?? chainId,
          body.targetAddress ?? address
        );
        const targetChainId = targetInput.chainId,
          targetAddress = targetInput.address;
        const differentDeployment =
          targetChainId !== chainId || targetAddress !== address;
        if (
          differentDeployment &&
          (typeof body.constructorArguments !== "string" ||
            !/^(?:0x)?(?:[a-fA-F0-9]{2})*$/.test(body.constructorArguments) ||
            body.constructorArguments.length > 1024)
        )
          throw new VerificationError("INVALID_INPUT");
        const destinations = body.destinations ?? ["etherscan"];
        if (
          !Array.isArray(destinations) ||
          !destinations.length ||
          destinations.length > 4 ||
          new Set(destinations).size !== destinations.length ||
          destinations.some(
            (p) => !provider(p) || !providersFor(targetChainId).includes(p)
          )
        )
          throw new VerificationError("UNSUPPORTED_ROUTE");
        let source, sourceProvider: VerificationProvider | undefined;
        const candidates =
          requested === "auto"
            ? (
                [
                  "blockscout",
                  "sourcify",
                  "etherscan",
                  "routescan",
                ] as VerificationProvider[]
              ).filter((p) => providersFor(chainId).includes(p))
            : [requested as VerificationProvider];
        let lastError: unknown;
        for (const p of candidates) {
          try {
            source = await client.source(p, chainId, address);
            sourceProvider = p;
            break;
          } catch (e) {
            lastError = e;
            if (requested !== "auto") throw e;
          }
        }
        if (!source || !sourceProvider)
          throw lastError ?? new VerificationError("UNSUPPORTED_SOURCE");
        if (differentDeployment)
          source = {
            ...source,
            constructorArguments: body.constructorArguments.replace(/^0x/, ""),
          };
        const job: VerificationJob = {
          targetChainId,
          targetAddress,
          id: randomBytes(32).toString("hex"),
          chainId,
          address,
          sourceProvider,
          source,
          expires: this.now() + 10 * MINUTE,
          targets: [],
        };
        // Independent lookups: a missing key or unavailable explorer doesn't hide
        // other destinations. The import itself never submits verification.
        job.targets = await Promise.all(
          destinations.map(async (p: VerificationProvider) => {
            const target = {
              provider: p,
              destinationUrl: explorerUrl(p, targetChainId, targetAddress),
            };
            try {
              return {
                ...target,
                state:
                  (p === sourceProvider && !differentDeployment) ||
                  (await client.verified(p, targetChainId, targetAddress))
                    ? ("already_verified" as const)
                    : ("ready" as const),
              };
            } catch (e) {
              return {
                ...target,
                state: "ready" as const,
                error: errorCode(e),
              };
            }
          })
        );
        await this.store.set(job);
        const review: VerificationReview = {
          ...source,
          id: job.id,
          chainId,
          address,
          sourceProvider,
          targetChainId,
          targetAddress,
          sourceUrl: explorerUrl(sourceProvider, chainId, address),
          destinationUrl: job.targets[0].destinationUrl,
          targets: this.status(job).targets,
          expiresAt: new Date(job.expires).toISOString(),
        };
        return Response.json(review, { headers });
      }
      if (typeof body.id !== "string" || !/^[a-f0-9]{64}$/.test(body.id))
        throw new VerificationError("INVALID_INPUT");
      release = await this.store.lock(body.id);
      if (!release) throw new VerificationError("RATE_LIMITED");
      const job = await this.store.get(body.id);
      if (
        !job ||
        job.expires <= this.now() ||
        job.chainId !== chainId ||
        job.address !== address
      )
        throw new VerificationError("EXPIRED");
      if (body.operation === "resume") {
        const review: VerificationReview = {
          ...job.source,
          id: job.id,
          chainId,
          address,
          sourceProvider: job.sourceProvider,
          targetChainId: job.targetChainId,
          targetAddress: job.targetAddress,
          sourceUrl: explorerUrl(job.sourceProvider, chainId, address),
          destinationUrl: job.targets[0].destinationUrl,
          targets: this.status(job).targets,
          expiresAt: new Date(job.expires).toISOString(),
        };
        return Response.json({ review, status: this.status(job) }, { headers });
      }
      if (body.operation === "submit") {
        if (body.confirmed !== true)
          throw new VerificationError("CONFIRM_REQUIRED");
        const selected = body.providers ?? job.targets.map((t) => t.provider);
        if (
          !Array.isArray(selected) ||
          !selected.length ||
          selected.length > 4 ||
          new Set(selected).size !== selected.length ||
          selected.some(
            (p) => !provider(p) || !job.targets.some((t) => t.provider === p)
          ) ||
          (body.retry != null && typeof body.retry !== "boolean")
        )
          throw new VerificationError("INVALID_INPUT");
        // Submit Sourcify last, as it may forward to other providers itself.
        const targets = job.targets
          .filter((t) => selected.includes(t.provider))
          .sort(
            (a, b) =>
              Number(a.provider === "sourcify") -
              Number(b.provider === "sourcify")
          );
        for (const target of targets) {
          if (
            target.state !== "ready" &&
            !(body.retry === true && target.state === "failed")
          )
            continue;
          try {
            // Recheck at submission time, including when the review was stale or
            // another verifier has published this source in the meantime.
            if (
              await client.verified(
                target.provider,
                job.targetChainId,
                job.targetAddress
              )
            ) {
              target.state = "already_verified";
              delete target.error;
              await this.store.set(job);
              continue;
            }
          } catch (e) {
            target.error = errorCode(e);
            await this.store.set(job);
            continue;
          }
          // Persist the consumed intent before sending. A lost response or worker
          // termination can be checked later, never silently resent.
          target.state = "submitting";
          delete target.error;
          job.expires = this.now() + 24 * 60 * MINUTE;
          await this.store.set(job);
          try {
            const result = await client.submit(
              target.provider,
              job.targetChainId,
              job.targetAddress,
              job.source
            );
            target.state = result.state;
            target.guid = result.guid;
            target.error = result.error;
          } catch (e) {
            const code = errorCode(e);
            const rejected = [
              "API_KEY_REQUIRED",
              "NOT_CONFIGURED",
              "PROVIDER_REJECTED",
              "RATE_LIMITED",
            ].includes(code);
            target.state = rejected ? "ready" : "unknown";
            target.error = rejected ? code : "UNKNOWN_DELIVERY";
          }
          await this.store.set(job);
        }
      } else {
        for (const target of job.targets) {
          if (!["pending", "unknown", "submitting"].includes(target.state))
            continue;
          if (target.lastCheck != null && this.now() - target.lastCheck < 5000)
            continue;
          target.lastCheck = this.now();
          try {
            const result = await client.status(
              target.provider,
              job.targetChainId,
              job.targetAddress,
              target.guid
            );
            target.state = result.state;
            target.error = result.error;
          } catch (e) {
            target.error = errorCode(e);
          }
          await this.store.set(job);
        }
      }
      return Response.json(this.status(job), { headers });
    } catch (e) {
      const code = errorCode(e);
      const status =
        code === "RATE_LIMITED"
          ? 429
          : ["INVALID_INPUT", "CONFIRM_REQUIRED", "UNSUPPORTED_ROUTE"].includes(
                code
              )
            ? 400
            : code === "EXPIRED"
              ? 410
              : code === "NOT_CONFIGURED"
                ? 503
                : 422;
      return Response.json(
        { error: { code, message: VERIFICATION_MESSAGES[code] } },
        {
          status,
          headers: {
            ...headers,
            ...(status === 429 ? { "Retry-After": "10" } : {}),
          },
        }
      );
    } finally {
      if (release) await release().catch(() => {});
      if (acquired) this.active--;
    }
  }
}
