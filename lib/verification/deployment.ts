// Shared, server-only submission/polling engine for saved deployment builds.
import { createHash } from "node:crypto";
import type { Address, Hex } from "viem";
import { chainIdToChain } from "@/data/common";
import { ProviderClient } from "./providers";
import { isSameOrigin, readJson } from "./transport";
import { type JobStore, type VerificationJob } from "./store";
import {
  VerificationError,
  VERIFICATION_CHAINS,
  type ImportedSource,
} from "./source";
export type DeploymentVerificationRequest = {
  operation: "submit" | "status";
  chainId: number;
  address: string;
  hash: string;
  retry?: boolean;
  identity: string;
  source?: ImportedSource;
  bytecode?: string;
};
export type ChainClient = {
  getTransaction(parameters: {
    hash: Hex;
  }): Promise<{ to: Address | null; input: Hex }>;
  getTransactionReceipt(parameters: {
    hash: Hex;
  }): Promise<{ status: string; contractAddress?: string | null }>;
};
export class EtherscanDeploymentVerification {
  private starts: number[] = [];
  private active = 0;
  constructor(
    private dependencies: {
      key: () => string | undefined;
      store: JobStore;
      client: (chainId: number) => ChainClient;
      fetch?: typeof fetch;
      now?: () => number;
      parse: (input: unknown) => DeploymentVerificationRequest;
      source: (
        body: DeploymentVerificationRequest,
        client: ChainClient
      ) => Promise<ImportedSource>;
      bodyLimit?: number;
      namespace?: string;
    }
  ) {}
  private now() {
    return this.dependencies.now?.() ?? Date.now();
  }
  async handle(request: Request) {
    const headers = {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    };
    let release: (() => Promise<void>) | undefined;
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
      this.starts = this.starts.filter((at) => this.now() - at < 60_000);
      if (this.active >= 4 || this.starts.length >= 40)
        throw new VerificationError("RATE_LIMITED");
      this.active++;
      acquired = true;
      this.starts.push(this.now());
      const signal = AbortSignal.any([
        request.signal,
        AbortSignal.timeout(20_000),
      ]);
      const body = this.dependencies.parse(
        await readJson(
          request.body,
          this.dependencies.bodyLimit ?? 1024,
          signal
        )
      );
      const chain = chainIdToChain[body.chainId];
      if (!chain?.blockExplorers) throw new VerificationError("INVALID_INPUT");
      if (!VERIFICATION_CHAINS[String(chain.id)]?.etherscan)
        throw new VerificationError("UNSUPPORTED_ROUTE");
      const key = this.dependencies.key();
      if (!key) throw new VerificationError("NOT_CONFIGURED");
      const identity = createHash("sha256").update(key).digest("hex");
      const client = new ProviderClient(
        this.dependencies.fetch ?? fetch,
        { etherscan: key },
        signal,
        (provider) => this.dependencies.store.reserve(provider, identity)
      );
      const id = `${this.dependencies.namespace ?? "deployment"}-${createHash("sha256").update(`${body.chainId}:${body.address.toLowerCase()}:${body.hash.toLowerCase()}:${body.identity}`).digest("hex")}`;
      release = await this.dependencies.store.lock(id);
      if (!release) return Response.json({ state: "pending" }, { headers });
      let job = await this.dependencies.store.get(id);
      if (!job) {
        if (body.operation !== "submit") throw new VerificationError("EXPIRED");
        const source = await this.dependencies.source(
          body,
          this.dependencies.client(body.chainId)
        );
        job = {
          id,
          chainId: String(chain.id),
          address: body.address,
          sourceProvider: "etherscan",
          targetChainId: String(chain.id),
          targetAddress: body.address,
          expires: this.now() + 60 * 60_000,
          source,
          targets: [
            {
              provider: "etherscan",
              state: "ready",
              destinationUrl: `${chain.blockExplorers!.default.url}/address/${body.address}#code`,
            },
          ],
        } satisfies VerificationJob;
        await this.dependencies.store.set(job);
      }
      const target = job.targets[0];
      if (
        (body.operation === "submit" &&
          (target.state === "ready" ||
            (body.retry && target.state === "failed"))) ||
        (body.operation === "status" &&
          target.state === "failed" &&
          ((target.error === "CONTRACT_NOT_INDEXED" &&
            this.now() - (target.lastCheck ?? 0) >= 5000) ||
            (target.error === "RATE_LIMITED" &&
              this.now() >= (target.nextCheckAt ?? 0))))
      ) {
        if (await client.verified("etherscan", job.chainId, job.address))
          target.state = "already_verified";
        else {
          // Persist before POST: a lost response is reconciled by polling, never silently resubmitted.
          target.state = "submitting";
          await this.dependencies.store.set(job);
          try {
            const result = await client.submit(
              "etherscan",
              job.chainId,
              job.address,
              job.source
            );
            target.state = result.state;
            target.guid = result.guid;
            target.error = result.error;
          } catch (error) {
            if (
              error instanceof VerificationError &&
              error.code !== "UNAVAILABLE" &&
              error.code !== "BROWSER_REQUEST_FAILED"
            ) {
              target.state = "failed";
              target.error = error.code;
              if (error.code === "RATE_LIMITED") {
                target.backoffMs = Math.min(
                  60_000,
                  Math.max(10_000, (target.backoffMs ?? 5000) * 2)
                );
                target.nextCheckAt = this.now() + target.backoffMs;
              }
            } else {
              target.state = "unknown";
              target.error = "UNKNOWN_DELIVERY";
            }
          }
          target.lastCheck = this.now();
          console.info("Deployment Etherscan verification", {
            chainId: job.chainId,
            address: job.address,
            state: target.state,
            code: target.error ?? null,
          });
        }
      } else if (
        ["pending", "unknown", "submitting"].includes(target.state) &&
        this.now() >= (target.nextCheckAt ?? 0)
      ) {
        try {
          const checkPublished =
            !target.guid || this.now() - (target.lastCheck ?? 0) >= 30_000;
          const result = await client.status(
            "etherscan",
            job.chainId,
            job.address,
            target.guid,
            { checkPublished }
          );
          if (checkPublished) target.lastCheck = this.now();
          target.state = result.state;
          target.error = result.error;
          target.backoffMs = undefined;
          target.nextCheckAt = this.now() + 5000;
          if (target.state === "unknown" && !target.guid) {
            target.state = "failed";
            target.error = "UNKNOWN_DELIVERY";
          }
        } catch (error) {
          if (
            error instanceof VerificationError &&
            error.code === "RATE_LIMITED"
          ) {
            target.error = "RATE_LIMITED";
            target.backoffMs = Math.min(
              60_000,
              Math.max(10_000, (target.backoffMs ?? 5000) * 2)
            );
            target.nextCheckAt = this.now() + target.backoffMs;
          } else if (
            !(error instanceof VerificationError) ||
            error.code === "UNAVAILABLE" ||
            error.code === "BROWSER_REQUEST_FAILED"
          ) {
            target.backoffMs = Math.min(
              30_000,
              Math.max(5000, (target.backoffMs ?? 2500) * 2)
            );
            target.nextCheckAt = this.now() + target.backoffMs;
          } else {
            throw error;
          }
        }
      }
      await this.dependencies.store.set(job);
      const waitingForIndex = target.error === "CONTRACT_NOT_INDEXED";
      const waitingForRateLimit =
        target.state === "failed" && target.error === "RATE_LIMITED";
      return Response.json(
        {
          state:
            target.state === "submitting" ||
            waitingForIndex ||
            waitingForRateLimit
              ? "pending"
              : target.state,
          ...(target.state === "pending" && target.guid
            ? { phase: "queued" }
            : {}),
          ...(target.nextCheckAt &&
          (target.state === "pending" || waitingForRateLimit)
            ? { retryAfterMs: Math.max(0, target.nextCheckAt - this.now()) }
            : {}),
          ...(target.error ? { error: target.error } : {}),
        },
        { headers }
      );
    } catch (error) {
      const code =
        error instanceof VerificationError ? error.code : "UNAVAILABLE";
      if (code === "RATE_LIMITED")
        return Response.json(
          { state: "pending", error: code, retryAfterMs: 10_000 },
          { status: 429, headers: { ...headers, "Retry-After": "10" } }
        );
      return Response.json(
        { state: "failed", error: code },
        {
          status:
            code === "INVALID_INPUT"
              ? 400
              : code === "NOT_CONFIGURED"
                ? 503
                : 502,
          headers,
        }
      );
    } finally {
      try {
        await release?.();
      } catch {
        /* The persisted job remains consumed; the lock expires. */
      }
      if (acquired) this.active--;
    }
  }
}
