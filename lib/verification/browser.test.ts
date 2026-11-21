import { test } from "node:test";
import assert from "node:assert/strict";
import { BrowserVerification } from "./browser";
import { harness, key, guid, req } from "./testHelpers";
import { VerificationService } from "./server";
import { address } from "./fixtures";
import type {
  VerificationReview,
  VerificationStatus,
  VerificationProvider,
} from "./source";
const keys = {
  etherscan: key,
  blockscout: "FAKE_BLOCKSCOUT_KEY_121",
  routescan: "FAKE_ROUTESCAN_KEY_121",
};
const families: VerificationProvider[] = [
  "etherscan",
  "blockscout",
  "routescan",
  "sourcify",
];
for (const sourceProvider of families)
  test(`browser-only ${sourceProvider} import, submission and polling never use ETH.sh or browser storage`, async () => {
    const h = harness();
    h.published.add(sourceProvider);
    const flow = new BrowserVerification(h.fetcher, h.now);
    const review = (await flow.handle(
      {
        operation: "preview",
        chainId: "1",
        address,
        sourceProvider,
        destinations: families,
      },
      keys,
      AbortSignal.timeout(5000)
    )) as VerificationReview;
    assert.equal(review.sourceProvider, sourceProvider);
    const result = (await flow.handle(
      {
        operation: "submit",
        chainId: "1",
        address,
        id: review.id,
        confirmed: true,
        providers: families,
      },
      keys,
      AbortSignal.timeout(5000)
    )) as VerificationStatus;
    assert.equal(result.state, "pending");
    const postCount = h.calls.filter((c) => c.init?.method === "POST").length;
    assert.equal(postCount, 3);
    await flow.handle(
      {
        operation: "submit",
        chainId: "1",
        address,
        id: review.id,
        confirmed: true,
        providers: families,
      },
      keys,
      AbortSignal.timeout(5000)
    );
    assert.equal(
      h.calls.filter((c) => c.init?.method === "POST").length,
      postCount
    );
    h.tick();
    const status = (await flow.handle(
      { operation: "status", chainId: "1", address, id: review.id },
      keys,
      AbortSignal.timeout(5000)
    )) as VerificationStatus;
    assert.equal(status.state, "verified");
    for (const call of h.calls) {
      assert.ok(
        !["localhost", "eth.sh", "explorer.eth.sh"].includes(call.url.hostname)
      );
      assert.equal(call.init?.credentials, "omit");
      assert.equal(call.init?.redirect, "error");
      assert.equal(call.init?.referrerPolicy, "no-referrer");
      assert.equal(new Headers(call.init?.headers).has("User-Agent"), false);
      const used = call.url.searchParams.get("apikey");
      if (used) assert.equal(used, keys[call.family as keyof typeof keys]);
    }
    assert.equal(JSON.stringify(review).includes(key), false);
    assert.equal(JSON.stringify(status).includes(key), false);
    assert.equal(JSON.stringify(status).includes(guid), false);
  });
test("a browser/CORS source failure is sanitized and never falls back to an ETH.sh proxy", async () => {
  const calls: string[] = [];
  const flow = new BrowserVerification(async (input) => {
    calls.push(String(input));
    throw new TypeError(`Failed to fetch ${key}`);
  });
  await assert.rejects(
    flow.handle(
      {
        operation: "preview",
        chainId: "1",
        address,
        sourceProvider: "etherscan",
        destinations: ["etherscan"],
      },
      keys,
      AbortSignal.timeout(5000)
    ),
    (e) =>
      e instanceof Error &&
      e.message === "Could not reach this explorer from your browser."
  );
  assert.equal(calls.length, 1);
  assert.equal(new URL(calls[0]).hostname, "api.etherscan.io");
});
test("lost browser submission can be checked without exposing the key or re-sending", async () => {
  const h = harness(async (_url, init, p) => {
    if (p === "etherscan" && init?.method === "POST") throw new TypeError(key);
    return undefined;
  });
  h.published.add("blockscout");
  const flow = new BrowserVerification(h.fetcher, h.now);
  const review = (await flow.handle(
    {
      operation: "preview",
      chainId: "1",
      address,
      sourceProvider: "blockscout",
      destinations: ["etherscan"],
    },
    keys,
    AbortSignal.timeout(5000)
  )) as VerificationReview;
  const payload = {
    operation: "submit",
    chainId: "1",
    address,
    id: review.id,
    confirmed: true,
    providers: ["etherscan"],
    retry: true,
  };
  assert.equal(
    (
      (await flow.handle(
        payload,
        keys,
        AbortSignal.timeout(5000)
      )) as VerificationStatus
    ).state,
    "unknown"
  );
  await flow.handle(payload, keys, AbortSignal.timeout(5000));
  assert.equal(h.calls.filter((c) => c.init?.method === "POST").length, 1);
  h.published.add("etherscan");
  h.tick();
  assert.equal(
    (
      (await flow.handle(
        { ...payload, operation: "status" },
        keys,
        AbortSignal.timeout(5000)
      )) as VerificationStatus
    ).state,
    "verified"
  );
});
test("switching from a server review to a user key can submit directly without contacting the old job", async () => {
  const h = harness();
  h.published.add("blockscout");
  const review = await (
    await h.send("preview", { destinations: ["etherscan"] })
  ).json();
  h.calls.length = 0;
  const flow = new BrowserVerification(h.fetcher, h.now);
  flow.adopt(review);
  const result = (await flow.handle(
    {
      operation: "submit",
      chainId: "1",
      address,
      id: review.id,
      confirmed: true,
      providers: ["etherscan"],
    },
    keys,
    AbortSignal.timeout(5000)
  )) as VerificationStatus;
  assert.equal(result.state, "pending");
  assert.ok(h.calls.every((c) => c.url.hostname === "api.etherscan.io"));
});
test("the backend rejects even syntactically valid user API keys before any provider call", async () => {
  let calls = 0;
  const service = new VerificationService({
    key: () => {
      throw new Error("must not read configuration");
    },
    fetch: async () => {
      calls++;
      throw new Error("must not fetch");
    },
  });
  for (const operation of ["preview", "submit", "status", "resume"]) {
    const response = await service.handle(
      req({
        operation,
        chainId: "1",
        address,
        id: "a".repeat(64),
        keys: { etherscan: key },
      })
    );
    assert.equal(response.status, 400);
    assert.equal((await response.text()).includes(key), false);
  }
  assert.equal(calls, 0);
});

test("provider fetch preserves the browser native fetch receiver", async () => {
  const h = harness();
  h.published.add("blockscout");
  const nativeLikeFetch: typeof fetch = async function (
    this: unknown,
    input,
    init
  ) {
    assert.equal(this, globalThis);
    return h.fetcher(input, init);
  };
  const flow = new BrowserVerification(nativeLikeFetch, h.now);
  const review = (await flow.handle(
    {
      operation: "preview",
      chainId: "1",
      address,
      sourceProvider: "blockscout",
      destinations: ["etherscan"],
    },
    keys,
    AbortSignal.timeout(5000)
  )) as VerificationReview;
  assert.equal(review.contractName, "contracts/Example.sol:Example");
});
