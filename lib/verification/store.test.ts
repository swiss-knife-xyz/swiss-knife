import { test } from "node:test";
import assert from "node:assert/strict";
import { configuredJobStore, type VerificationJob } from "./store";

test("accepted verification jobs survive development store recreation during Fast Refresh", async () => {
  const previous = {
    node: process.env.NODE_ENV,
    store: process.env.VERIFICATION_JOB_STORE,
  };
  const runtime = globalThis as typeof globalThis & {
    __ethVerificationJobs?: unknown;
  };
  const oldStore = runtime.__ethVerificationJobs;
  try {
    Object.assign(process.env, { NODE_ENV: "development" });
    delete process.env.VERIFICATION_JOB_STORE;
    delete runtime.__ethVerificationJobs;
    const first = configuredJobStore();
    const job: VerificationJob = {
      id: "dev-refresh-fixture",
      chainId: "11155111",
      address: "0x1111111111111111111111111111111111111111",
      sourceProvider: "etherscan",
      targetChainId: "11155111",
      targetAddress: "0x1111111111111111111111111111111111111111",
      source: {
        contractName: "Token",
        compilerVersion: "v0.8.28",
        sourceCode: "{}",
        constructorArguments: "",
        licenseType: "3",
        files: [],
        partial: false,
      },
      targets: [
        {
          provider: "etherscan",
          state: "pending",
          destinationUrl: "https://sepolia.etherscan.io",
          guid: "accepted-provider-job",
        },
      ],
      expires: Date.now() + 60_000,
    };
    await first.set(job);
    const recreated = configuredJobStore();
    assert.deepEqual(await recreated.get(job.id), job);
  } finally {
    if (previous.node === undefined)
      Reflect.deleteProperty(process.env, "NODE_ENV");
    else Object.assign(process.env, { NODE_ENV: previous.node });
    if (previous.store === undefined) delete process.env.VERIFICATION_JOB_STORE;
    else process.env.VERIFICATION_JOB_STORE = previous.store;
    if (oldStore === undefined) delete runtime.__ethVerificationJobs;
    else runtime.__ethVerificationJobs = oldStore;
  }
});
