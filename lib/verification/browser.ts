/** User-key workflows stay entirely in memory and talk only to explorer APIs.
 * No requests to ETH.sh, server key fallback, storage writes, or analytics.
 */
import { ProviderClient, type ProviderKeys } from "./providers";
import {
  PROVIDERS,
  VERIFICATION_CHAINS,
  VerificationError,
  verificationInput,
  providersFor,
  explorerUrl,
  type ImportedSource,
  type VerificationProvider,
  type VerificationReview,
  type VerificationStatus,
  type VerificationTarget,
  type VerificationState,
} from "./source";
type Target = VerificationTarget & { guid?: string; lastCheck?: number };
type BrowserJob = {
  review: VerificationReview;
  targets: Target[];
  submitted: boolean;
};
const code = (e: unknown) =>
  e instanceof VerificationError ? e.code : ("BROWSER_REQUEST_FAILED" as const);
const family = (p: unknown): p is VerificationProvider =>
  typeof p === "string" && Object.hasOwn(PROVIDERS, p);
const settled = (s: VerificationState) =>
  ["verified", "already_verified"].includes(s);
export class BrowserVerification {
  private job?: BrowserJob;
  private busy = false;
  constructor(
    private fetcher: typeof fetch = fetch,
    private now = Date.now
  ) {}
  adopt(review: VerificationReview, status?: VerificationStatus) {
    this.job = {
      review,
      targets: (status?.targets ?? review.targets ?? []).map((t) => ({ ...t })),
      submitted: !!status,
    };
  }
  private status(): VerificationStatus {
    const job = this.job!,
      targets = job.targets.map(({ guid: _guid, lastCheck: _last, ...t }) => t);
    const states = targets.map((t) => t.state);
    const state: VerificationState = states.every(
      (s) => s === "already_verified"
    )
      ? "already_verified"
      : states.every(settled)
        ? "verified"
        : states.includes("pending")
          ? "pending"
          : states.includes("submitting")
            ? "submitting"
            : states.includes("ready")
              ? "ready"
              : states.includes("unknown")
                ? "unknown"
                : "failed";
    return {
      id: job.review.id,
      destinationUrl: job.review.destinationUrl,
      state,
      targets,
    };
  }
  async handle(
    body: Record<string, any>,
    keys: ProviderKeys,
    signal: AbortSignal
  ): Promise<VerificationReview | VerificationStatus> {
    if (this.busy) throw new VerificationError("RATE_LIMITED");
    this.busy = true;
    try {
      return await this.execute(body, keys, signal);
    } finally {
      this.busy = false;
    }
  }
  private async execute(
    body: Record<string, any>,
    keys: ProviderKeys,
    signal: AbortSignal
  ): Promise<VerificationReview | VerificationStatus> {
    for (const [p, key] of Object.entries(keys))
      if (
        !family(p) ||
        p === "sourcify" ||
        !key ||
        !/^[A-Za-z0-9_-]{8,128}$/.test(key)
      )
        throw new VerificationError("INVALID_INPUT");
    const { chainId, address } = verificationInput(body.chainId, body.address);
    const client = new ProviderClient(
      this.fetcher,
      keys,
      signal,
      undefined,
      true
    );
    if (body.operation === "preview") {
      const requested = body.sourceProvider ?? "auto";
      if (
        requested !== "auto" &&
        (!family(requested) || !providersFor(chainId).includes(requested))
      )
        throw new VerificationError("UNSUPPORTED_ROUTE");
      const target = verificationInput(
        body.targetChainId ?? chainId,
        body.targetAddress ?? address
      );
      const different =
        target.chainId !== chainId || target.address !== address;
      if (
        different &&
        (typeof body.constructorArguments !== "string" ||
          !/^(?:0x)?(?:[a-fA-F0-9]{2})*$/.test(body.constructorArguments) ||
          body.constructorArguments.length > 1024)
      )
        throw new VerificationError("INVALID_INPUT");
      const destinations: VerificationProvider[] =
        body.destinations ?? providersFor(target.chainId);
      if (
        !Array.isArray(destinations) ||
        !destinations.length ||
        destinations.length > 4 ||
        new Set(destinations).size !== destinations.length ||
        destinations.some(
          (p) => !family(p) || !providersFor(target.chainId).includes(p)
        )
      )
        throw new VerificationError("UNSUPPORTED_ROUTE");
      const candidates: VerificationProvider[] =
        requested === "auto"
          ? (
              [
                "blockscout",
                "sourcify",
                "etherscan",
                "routescan",
              ] as VerificationProvider[]
            ).filter((p) => providersFor(chainId).includes(p))
          : [requested];
      let source: ImportedSource | undefined,
        sourceProvider: VerificationProvider | undefined,
        last: unknown;
      for (const p of candidates) {
        try {
          source = await client.source(p, chainId, address);
          sourceProvider = p;
          break;
        } catch (e) {
          last = e;
          if (requested !== "auto") throw e;
        }
      }
      if (!source || !sourceProvider)
        throw last ?? new VerificationError("UNSUPPORTED_SOURCE");
      if (different)
        source = {
          ...source,
          constructorArguments: body.constructorArguments.replace(/^0x/, ""),
        };
      const targets = await Promise.all(
        destinations.map(async (p) => {
          const result = {
            provider: p,
            destinationUrl: explorerUrl(p, target.chainId, target.address),
          };
          try {
            return {
              ...result,
              state:
                (p === sourceProvider && !different) ||
                (await client.verified(p, target.chainId, target.address))
                  ? ("already_verified" as const)
                  : ("ready" as const),
            };
          } catch (e) {
            return { ...result, state: "ready" as const, error: code(e) };
          }
        })
      );
      const id = Array.from(crypto.getRandomValues(new Uint8Array(32)), (v) =>
        v.toString(16).padStart(2, "0")
      ).join("");
      const review: VerificationReview = {
        ...source,
        id,
        chainId,
        address,
        targetChainId: target.chainId,
        targetAddress: target.address,
        sourceProvider,
        sourceUrl: explorerUrl(sourceProvider, chainId, address),
        destinationUrl: targets[0].destinationUrl,
        targets,
        expiresAt: new Date(this.now() + 600_000).toISOString(),
      };
      this.job = { review, targets, submitted: false };
      return review;
    }
    const job = this.job;
    if (
      !job ||
      body.id !== job.review.id ||
      chainId !== job.review.chainId ||
      address !== job.review.address ||
      (!job.submitted && new Date(job.review.expiresAt).getTime() <= this.now())
    )
      throw new VerificationError("EXPIRED");
    const targetChain = job.review.targetChainId ?? chainId,
      targetAddress = job.review.targetAddress ?? address;
    if (body.operation === "submit") {
      if (body.confirmed !== true)
        throw new VerificationError("CONFIRM_REQUIRED");
      const selected = body.providers;
      if (
        !Array.isArray(selected) ||
        !selected.length ||
        selected.some((p) => !job.targets.some((t) => t.provider === p))
      )
        throw new VerificationError("INVALID_INPUT");
      for (const target of [...job.targets].sort(
        (a, b) =>
          Number(a.provider === "sourcify") - Number(b.provider === "sourcify")
      )) {
        if (
          !selected.includes(target.provider) ||
          (target.state !== "ready" &&
            !(body.retry === true && target.state === "failed"))
        )
          continue;
        try {
          if (
            await client.verified(target.provider, targetChain, targetAddress)
          ) {
            target.state = "already_verified";
            delete target.error;
            continue;
          }
        } catch (e) {
          target.error = code(e);
          continue;
        }
        target.state = "submitting";
        job.submitted = true;
        delete target.error;
        try {
          const result = await client.submit(
            target.provider,
            targetChain,
            targetAddress,
            job.review
          );
          Object.assign(target, result);
        } catch (e) {
          const reason = code(e);
          const rejected = [
            "API_KEY_REQUIRED",
            "NOT_CONFIGURED",
            "PROVIDER_REJECTED",
            "RATE_LIMITED",
          ].includes(reason);
          target.state = rejected ? "ready" : "unknown";
          target.error = rejected ? reason : "UNKNOWN_DELIVERY";
        }
      }
    } else if (body.operation === "status") {
      for (const target of job.targets) {
        if (!["pending", "submitting", "unknown"].includes(target.state))
          continue;
        if (target.lastCheck != null && this.now() - target.lastCheck < 5000)
          continue;
        target.lastCheck = this.now();
        try {
          const result = await client.status(
            target.provider,
            targetChain,
            targetAddress,
            target.guid
          );
          target.state = result.state;
          target.error = result.error;
        } catch (e) {
          target.error = code(e);
        }
      }
    } else throw new VerificationError("INVALID_INPUT");
    return this.status();
  }
}
