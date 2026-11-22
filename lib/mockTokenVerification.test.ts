import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import {
  submitMockVerification,
  mockEtherscanVerification,
} from "./mockTokenVerification";
import { buildMockDeployment } from "./mockTokens";
import { MOCK_COMPILER_VERSION } from "./mockTokens.generated";
const address = "0x2222222222222222222222222222222222222222";
const hash = `0x${"ab".repeat(32)}` as const;
const guid = "11111111-2222-3333-4444-555555555555";
const input = JSON.parse(
  readFileSync("public/mock-tokens-standard-input.json", "utf8")
);
for (const standard of ["ERC20", "ERC721", "ERC1155"]) {
  test(`verifies ${standard} with the exact compiler input, contract and creation transaction`, async () => {
    const deployment = buildMockDeployment({
      standard,
      chainId: "11155111",
      name: "Token",
      symbol: "TKN",
      initialSupply: "1000000",
      recipient: address,
      uri: "",
    });
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetcher: typeof fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      if (String(url) === "/mock-tokens-standard-input.json")
        return Response.json(input);
      if (init?.method === "GET") return new Response("", { status: 404 });
      assert.equal(
        String(url),
        `https://sourcify.dev/server/v2/verify/11155111/${address}`
      );
      assert.deepEqual(JSON.parse(String(init?.body)), {
        stdJsonInput: input,
        compilerVersion: MOCK_COMPILER_VERSION,
        contractIdentifier: `contracts/mocks/MockTokens.sol:Mock${standard}`,
        creationTransactionHash: hash,
      });
      return Response.json({ verificationId: guid });
    };
    assert.deepEqual(
      await submitMockVerification(deployment, address, hash, fetcher),
      { state: "pending", guid }
    );
    assert.equal(
      calls.filter((call) => call.init?.method === "POST").length,
      1
    );
    assert.equal(calls.at(-1)?.init?.credentials, "omit");
  });
}
test("does not submit again when the source is already verified", async () => {
  const deployment = buildMockDeployment({
    standard: "ERC721",
    chainId: "11155111",
    name: "Token",
    symbol: "TKN",
    initialSupply: "0",
    recipient: "",
    uri: "",
  });
  let calls = 0;
  const fetcher: typeof fetch = async (_, init) => {
    calls++;
    assert.equal(init?.method, "GET");
    return Response.json({ match: "exact_match" });
  };
  assert.deepEqual(
    await submitMockVerification(deployment, address, hash, fetcher),
    { state: "verified" }
  );
  assert.equal(calls, 1);
});

test("preserves the provider queue phase from the local API for the UI", async () => {
  const originalFetch = globalThis.fetch;
  const deployment = buildMockDeployment({
    standard: "ERC721",
    chainId: "11155111",
    name: "Token",
    symbol: "TKN",
    initialSupply: "0",
    recipient: "",
    uri: "",
  });
  try {
    globalThis.fetch = async () =>
      Response.json({ state: "pending", phase: "queued" });
    assert.deepEqual(
      await mockEtherscanVerification(deployment, address, hash, "status"),
      { state: "pending", phase: "queued" }
    );
    globalThis.fetch = async () =>
      Response.json(
        { state: "pending", error: "RATE_LIMITED", retryAfterMs: 10000 },
        { status: 429 }
      );
    assert.deepEqual(
      await mockEtherscanVerification(deployment, address, hash, "status"),
      { state: "pending", error: "RATE_LIMITED", retryAfterMs: 10000 }
    );
    globalThis.fetch = async () =>
      Response.json(
        { state: "failed", error: "NOT_CONFIGURED" },
        { status: 503 }
      );
    assert.deepEqual(
      await mockEtherscanVerification(deployment, address, hash, "submit"),
      { state: "failed", error: "NOT_CONFIGURED" }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
