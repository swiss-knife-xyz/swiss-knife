import { test } from "node:test";
import assert from "node:assert/strict";
import { address, fixture } from "./fixtures";

test("actual POST route uses private runtime configuration, never exposes the sentinel or upstream GUID", async () => {
  const oldFetch = globalThis.fetch;
  const sentinel = "FAKE_SENTINEL_ROUTE_PRIVATE_121";
  const guid = "abcdef1234567890abcdef1234567890abcdef1234567890";
  const calls: { url: string; init?: RequestInit }[] = [];
  // No real credentials or real Etherscan access: the entire upstream is mocked.
  process.env.ETHERSCAN_API_KEY = sentinel;
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    if (
      String(url).startsWith(
        "https://eth.blockscout.com/api/v2/smart-contracts/"
      )
    )
      return Response.json(fixture);
    assert.ok(String(url).startsWith("https://api.etherscan.io/v2/api?"));
    if (String(url).includes("getsourcecode"))
      return Response.json({ status: "1", result: [{ SourceCode: "" }] });
    return Response.json({
      status: "1",
      result: String(url).includes("checkverifystatus")
        ? "Pass - Verified"
        : guid,
    });
  };
  try {
    const { POST } = await import("../../app/api/verification/route");
    const send = async (operation: string, extra = {}) => {
      const response = await POST(
        new Request("https://explorer.eth.sh/api/verification", {
          method: "POST",
          headers: {
            origin: "https://explorer.eth.sh",
            "content-type": "application/json",
          },
          body: JSON.stringify({ operation, chainId: "1", address, ...extra }),
        })
      );
      const text = await response.text();
      assert.equal(text.includes(sentinel), false);
      assert.equal(text.includes(guid), false);
      assert.equal(response.headers.get("location"), null);
      assert.equal(response.headers.get("cache-control"), "no-store");
      return { response, body: JSON.parse(text) };
    };
    const review = await send("preview");
    assert.equal(calls.length, 1);
    assert.equal(review.response.status, 200);
    const submitted = await send("submit", {
      id: review.body.id,
      confirmed: true,
    });
    assert.equal(submitted.body.state, "pending");
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const status = await send("status", { id: review.body.id });
    assert.equal(status.body.state, "verified");
    assert.equal(calls.length, 5);
    assert.equal(calls[0].url.includes(sentinel), false);
    for (const call of calls.slice(1)) {
      const url = new URL(call.url);
      assert.equal(
        url.origin + url.pathname,
        "https://api.etherscan.io/v2/api"
      );
      assert.equal(url.searchParams.get("apikey"), sentinel);
      assert.equal(call.init?.redirect, "error");
    }
  } finally {
    globalThis.fetch = oldFetch;
    delete process.env.ETHERSCAN_API_KEY;
  }
});
