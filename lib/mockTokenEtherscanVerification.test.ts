import { test } from "node:test";
import assert from "node:assert/strict";
import { MockTokenEtherscanVerification } from "./mockTokenEtherscanVerification";
import { MemoryJobStore } from "./verification/store";
import { buildMockDeployment } from "./mockTokens";
const address = "0x2222222222222222222222222222222222222222";
const hash = `0x${"ab".repeat(32)}` as const;
const key = "FAKE_PRIVATE_ETHERSCAN_KEY_219";
function fixture(standard = "ERC20") {
  let now = Date.now(),
    posts = 0,
    complete = false,
    loseResponse = false,
    indexing = false,
    denied = false,
    rateLimits = 0,
    statusCalls = 0;
  const deployment = buildMockDeployment({
    standard,
    chainId: "11155111",
    name: "Token",
    symbol: "TKN",
    initialSupply: "1000000",
    recipient: address,
    uri: "",
  });
  const chain = {
    getTransaction: async () => ({ to: null, input: deployment.data }),
    getTransactionReceipt: async () => ({
      status: "success",
      contractAddress: address,
    }),
  };
  const fetcher: typeof fetch = async (url, init) => {
    const target = new URL(String(url));
    assert.equal(target.hostname, "api.etherscan.io");
    assert.equal(target.searchParams.get("apikey"), key);
    if (init?.method === "POST") {
      posts++;
      const form = new URLSearchParams(String(init.body));
      assert.equal(
        form.get("contractname"),
        `contracts/mocks/MockTokens.sol:Mock${standard}`
      );
      assert.equal(form.get("compilerversion"), "v0.8.28+commit.7893614a");
      assert.equal(
        form.get("constructorArguments"),
        deployment.data.slice(deployment.artifact.bytecode.length)
      );
      assert.equal(form.get("licenseType"), "3");
      assert.ok(
        JSON.parse(form.get("sourceCode")!).sources[
          "contracts/mocks/MockTokens.sol"
        ]
      );
      if (indexing)
        return Response.json({
          status: "0",
          result: `Unable to locate ContractCode at ${address}`,
        });
      if (denied)
        return Response.json({
          status: "0",
          result: "Invalid compiler settings",
        });
      if (loseResponse) throw new Error(key);
      return Response.json({
        status: "1",
        message: "OK",
        result: "private-provider-job-id",
      });
    }
    if (target.searchParams.get("action") === "getsourcecode")
      return Response.json({
        status: "1",
        result: [{ SourceCode: complete ? "verified source" : "" }],
      });
    statusCalls++;
    if (rateLimits > 0) {
      rateLimits--;
      return Response.json({ status: "0", result: "Max rate limit reached" });
    }
    return Response.json(
      complete
        ? { status: "1", result: "Pass - Verified" }
        : { status: "0", result: "Pending in queue" }
    );
  };
  const service = new MockTokenEtherscanVerification({
    key: () => key,
    store: new MemoryJobStore(() => now),
    client: () => chain,
    fetch: fetcher,
    now: () => now,
  });
  const body = {
    operation: "submit",
    chainId: 11155111,
    address,
    hash,
    standard,
  };
  const request = (changes: object = {}, origin = "http://localhost:3000") =>
    new Request("http://localhost:3000/api/mock-tokens/verification", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify({ ...body, ...changes }),
    });
  return {
    service,
    chain,
    request,
    posts: () => posts,
    advance: (milliseconds = 2000) => {
      now += milliseconds;
    },
    rateLimit: (count: number) => {
      rateLimits = count;
    },
    statusCalls: () => statusCalls,
    finish: () => {
      complete = true;
    },
    setIndexing: (value: boolean) => {
      indexing = value;
    },
    deny: () => {
      denied = true;
    },
    loseResponse: () => {
      loseResponse = true;
    },
  };
}
for (const standard of ["ERC20", "ERC721", "ERC1155"])
  test(`verifies mined ${standard} deployments using the server key and exact constructor data`, async () => {
    const f = fixture(standard);
    let response = await f.service.handle(f.request());
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      state: "pending",
      phase: "queued",
    });
    assert.equal(f.posts(), 1);
    f.advance();
    response = await f.service.handle(f.request());
    assert.deepEqual(await response.json(), {
      state: "pending",
      phase: "queued",
      retryAfterMs: 5000,
    });
    assert.equal(f.posts(), 1);
    f.advance(6000);
    f.finish();
    response = await f.service.handle(f.request({ operation: "status" }));
    const text = await response.text();
    assert.equal(JSON.parse(text).state, "verified");
    assert.ok(!text.includes(key) && !text.includes("private-provider-job-id"));
  });
test("rejects unrelated transactions and mismatched contract addresses before using the key", async () => {
  const f = fixture();
  f.chain.getTransactionReceipt = async () => ({
    status: "success",
    contractAddress: "0x3333333333333333333333333333333333333333",
  });
  assert.equal((await f.service.handle(f.request())).status, 400);
  assert.equal(f.posts(), 0);
  f.chain.getTransactionReceipt = async () => ({
    status: "success",
    contractAddress: address,
  });
  f.chain.getTransaction = async () => ({ to: null, input: "0x1234" as any });
  assert.equal((await f.service.handle(f.request())).status, 400);
  assert.equal(f.posts(), 0);
});
test("rejects cross-origin requests, unsupported chains and caller-supplied source or keys", async () => {
  const f = fixture();
  for (const req of [
    f.request({}, "https://evil.example"),
    f.request({ chainId: 9007199254740991 }),
    f.request({ apiKey: key }),
    f.request({ sourceCode: "arbitrary" }),
  ])
    assert.equal((await f.service.handle(req)).status, 400);
  assert.equal(f.posts(), 0);
});
test("reports missing server configuration without exposing credentials or sending a request", async () => {
  const f = fixture();
  const service = new MockTokenEtherscanVerification({
    key: () => undefined,
    store: new MemoryJobStore(),
    client: () => f.chain,
    fetch: async () => {
      throw new Error("Unexpected request");
    },
  });
  const response = await service.handle(f.request());
  assert.equal(response.status, 503);
  assert.equal((await response.json()).state, "failed");
});

test("a lost submission response never leaks the key or silently submits twice", async () => {
  const f = fixture();
  f.loseResponse();
  let response = await f.service.handle(f.request());
  let text = await response.text();
  assert.equal(JSON.parse(text).state, "unknown");
  assert.ok(!text.includes(key));
  f.advance();
  response = await f.service.handle(f.request());
  text = await response.text();
  assert.equal(JSON.parse(text).state, "failed");
  assert.equal(JSON.parse(text).error, "UNKNOWN_DELIVERY");
  assert.ok(!text.includes(key));
  assert.equal(f.posts(), 1);
});

test("waits for explorer indexing and safely resubmits only its explicit not-indexed rejection", async () => {
  const f = fixture();
  f.setIndexing(true);
  let response = await f.service.handle(f.request());
  assert.deepEqual(await response.json(), {
    state: "pending",
    error: "CONTRACT_NOT_INDEXED",
  });
  f.advance();
  response = await f.service.handle(f.request({ operation: "status" }));
  assert.equal((await response.json()).state, "pending");
  assert.equal(f.posts(), 1);
  f.advance();
  f.advance();
  f.setIndexing(false);
  response = await f.service.handle(f.request({ operation: "status" }));
  assert.deepEqual(await response.json(), {
    state: "pending",
    phase: "queued",
  });
  assert.equal(f.posts(), 2);
  f.advance();
  f.finish();
  response = await f.service.handle(f.request({ operation: "status" }));
  assert.equal((await response.json()).state, "verified");
});
test("surfaces explicit provider rejection as a retryable failure rather than unknown", async () => {
  const f = fixture();
  f.deny();
  const response = await f.service.handle(f.request());
  assert.deepEqual(await response.json(), {
    state: "failed",
    error: "SUBMISSION_REJECTED",
  });
});

test("rate-limited status checks preserve the accepted job and back off without another submission", async () => {
  const f = fixture();
  await f.service.handle(f.request());
  f.rateLimit(2);
  f.advance();
  let response = await f.service.handle(f.request({ operation: "status" }));
  assert.deepEqual(await response.json(), {
    state: "pending",
    phase: "queued",
    error: "RATE_LIMITED",
    retryAfterMs: 10000,
  });
  assert.equal(f.statusCalls(), 1);
  f.advance();
  response = await f.service.handle(f.request({ operation: "status" }));
  assert.equal((await response.json()).retryAfterMs, 8000);
  assert.equal(f.statusCalls(), 1);
  f.advance(8000);
  response = await f.service.handle(f.request({ operation: "status" }));
  assert.equal((await response.json()).retryAfterMs, 20000);
  f.advance(20000);
  f.finish();
  response = await f.service.handle(f.request({ operation: "status" }));
  assert.equal((await response.json()).state, "verified");
  assert.equal(f.posts(), 1);
});
