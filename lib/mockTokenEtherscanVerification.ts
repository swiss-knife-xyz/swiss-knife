// Server-only: reconstruct verification input from our artifacts and the mined creation transaction.
import { createHash } from "node:crypto";
import { z } from "zod";
import type { Address, Hex } from "viem";
import compilerInput from "../public/mock-tokens-standard-input.json";
import { MOCK_ARTIFACTS, MOCK_COMPILER_VERSION } from "./mockTokens.generated";
import { MOCK_CHAINS } from "./mockTokens";
import { ProviderClient } from "./verification/providers";
import { isSameOrigin, readJson } from "./verification/transport";
import { type JobStore, type VerificationJob } from "./verification/store";
import { VerificationError, VERIFICATION_CHAINS } from "./verification/source";

const schema = z
  .object({
    operation: z.enum(["submit", "status"]),
    chainId: z.number().int(),
    standard: z.enum(["ERC20", "ERC721", "ERC1155"]),
    address: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
    hash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
    retry: z.boolean().optional(),
  })
  .strict();
type ChainClient = {
  getTransaction(parameters: {
    hash: Hex;
  }): Promise<{ to: Address | null; input: Hex }>;
  getTransactionReceipt(parameters: {
    hash: Hex;
  }): Promise<{ status: string; contractAddress?: string | null }>;
};
export class MockTokenEtherscanVerification {
  private starts: number[] = [];
  private active = 0;
  constructor(
    private dependencies: {
      key: () => string | undefined;
      store: JobStore;
      client: (chainId: number) => ChainClient;
      fetch?: typeof fetch;
      now?: () => number;
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
      const parsed = schema.safeParse(
        await readJson(request.body, 1024, signal)
      );
      if (!parsed.success) throw new VerificationError("INVALID_INPUT");
      const body = parsed.data;
      const chain = MOCK_CHAINS.find((chain) => chain.id === body.chainId);
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
      const id = `mock-${createHash("sha256").update(`${body.chainId}:${body.address.toLowerCase()}:${body.hash.toLowerCase()}:${body.standard}`).digest("hex")}`;
      release = await this.dependencies.store.lock(id);
      if (!release) return Response.json({ state: "pending" }, { headers });
      let job = await this.dependencies.store.get(id);
      if (!job) {
        if (body.operation !== "submit") throw new VerificationError("EXPIRED");
        const rpc = this.dependencies.client(body.chainId);
        const [transaction, receipt] = await Promise.all([
          rpc.getTransaction({ hash: body.hash as Hex }),
          rpc.getTransactionReceipt({ hash: body.hash as Hex }),
        ]);
        const artifact = MOCK_ARTIFACTS[body.standard];
        if (
          transaction.to !== null ||
          receipt.status !== "success" ||
          receipt.contractAddress?.toLowerCase() !==
            body.address.toLowerCase() ||
          !transaction.input
            .toLowerCase()
            .startsWith(artifact.bytecode.toLowerCase())
        )
          throw new VerificationError("INVALID_INPUT");
        job = {
          id,
          chainId: String(chain.id),
          address: body.address,
          sourceProvider: "etherscan",
          targetChainId: String(chain.id),
          targetAddress: body.address,
          expires: this.now() + 60 * 60_000,
          source: {
            contractName: `contracts/mocks/MockTokens.sol:${artifact.contractName}`,
            compilerVersion: `v${MOCK_COMPILER_VERSION}`,
            sourceCode: JSON.stringify(compilerInput),
            constructorArguments: transaction.input.slice(
              artifact.bytecode.length
            ),
            creationTransactionHash: body.hash,
            licenseType: "3",
            files: Object.keys(compilerInput.sources),
            partial: false,
          },
          targets: [
            {
              provider: "etherscan",
              state: "ready",
              destinationUrl: `${chain.blockExplorers.default.url}/address/${body.address}#code`,
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
          console.info("Mock token Etherscan verification", {
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
