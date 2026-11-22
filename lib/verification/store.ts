import { randomBytes } from "node:crypto";
import { Redis } from "@upstash/redis";
import {
  VerificationError,
  type ImportedSource,
  type VerificationProvider,
  type VerificationTarget,
} from "./source";
export type StoredTarget = VerificationTarget & {
  guid?: string;
  lastCheck?: number;
};
export type VerificationJob = {
  id: string;
  chainId: string;
  address: string;
  sourceProvider: VerificationProvider;
  targetChainId: string;
  targetAddress: string;
  source: ImportedSource;
  targets: StoredTarget[];
  expires: number;
};
export interface JobStore {
  reserve(provider: string, identity: string): Promise<void>;
  get(id: string): Promise<VerificationJob | undefined>;
  set(job: VerificationJob): Promise<void>;
  lock(id: string): Promise<(() => Promise<void>) | undefined>;
}
/** Development/test fallback; production uses the existing Upstash connection. */
export class MemoryJobStore implements JobStore {
  private jobs = new Map<string, VerificationJob>();
  private locks = new Set<string>();
  private budgets = new Map<string, number[]>();
  constructor(private now = Date.now) {}
  async reserve(provider: string, identity: string) {
    const key = `${provider}:${identity}`,
      now = this.now();
    const times = (this.budgets.get(key) ?? []).filter((t) => now - t < 1000);
    if (times.length >= (provider === "etherscan" ? 2 : 5))
      throw new VerificationError("RATE_LIMITED");
    times.push(now);
    this.budgets.set(key, times);
    if (this.budgets.size > 128)
      for (const [k, v] of this.budgets)
        if (now - v.at(-1)! >= 1000) this.budgets.delete(k);
  }
  async get(id: string) {
    const job = this.jobs.get(id);
    if (!job || job.expires <= this.now()) {
      this.jobs.delete(id);
      return;
    }
    return structuredClone(job);
  }
  async set(job: VerificationJob) {
    for (const [id, item] of this.jobs)
      if (item.expires <= this.now()) this.jobs.delete(id);
    const bytes = [...this.jobs.values()]
      .filter((j) => j.id !== job.id)
      .reduce(
        (n, j) => n + j.source.sourceCode.length,
        job.source.sourceCode.length
      );
    if ((!this.jobs.has(job.id) && this.jobs.size >= 32) || bytes > 8_000_000)
      throw new VerificationError("RATE_LIMITED");
    this.jobs.set(job.id, structuredClone(job));
  }
  async lock(id: string) {
    if (this.locks.has(id)) return;
    this.locks.add(id);
    return async () => {
      this.locks.delete(id);
    };
  }
}
export class RedisJobStore implements JobStore {
  constructor(private redis: Redis) {}
  private async bounded<T>(operation: Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        operation,
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new VerificationError("UNAVAILABLE")),
            4000
          );
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  async reserve(provider: string, identity: string) {
    const count = await this.bounded(
      this.redis.eval(
        "local n = redis.call('incr', KEYS[1]); if n == 1 then redis.call('pexpire', KEYS[1], 1000) end; return n",
        [`verification:v2:budget:${provider}:${identity}`],
        []
      )
    );
    if (Number(count) > (provider === "etherscan" ? 2 : 5))
      throw new VerificationError("RATE_LIMITED");
  }
  async get(id: string) {
    return (
      (await this.bounded(
        this.redis.get<VerificationJob>(`verification:v2:job:${id}`)
      )) ?? undefined
    );
  }
  async set(job: VerificationJob) {
    await this.bounded(
      this.redis.set(`verification:v2:job:${job.id}`, job, {
        ex: Math.max(1, Math.ceil((job.expires - Date.now()) / 1000)),
      })
    );
  }
  async lock(id: string) {
    const key = `verification:v2:lock:${id}`,
      token = randomBytes(16).toString("hex");
    if (!(await this.bounded(this.redis.set(key, token, { nx: true, ex: 60 }))))
      return;
    return async () => {
      await this.bounded(
        this.redis.eval(
          "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
          [key],
          [token]
        )
      );
    };
  }
}
export function configuredJobStore(): JobStore {
  // Local review should not depend on production storage credentials. Opt in to
  // Redis locally when testing worker recovery; production always requires it.
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.VERIFICATION_JOB_STORE !== "redis"
  )
    return new MemoryJobStore();
  if (
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  )
    return new RedisJobStore(Redis.fromEnv({ retry: { retries: 0 } }));
  const unavailable = async (): Promise<never> => {
    throw new VerificationError("NOT_CONFIGURED");
  };
  return {
    get: unavailable,
    set: unavailable,
    lock: unavailable,
    reserve: unavailable,
  };
}
