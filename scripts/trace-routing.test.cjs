const assert = require("node:assert/strict");
const { test } = require("node:test");
const { unstable_getResponseFromNextConfig } = require("next/experimental/testing/server");
const config = require("../next.config.js");

const query = `tx=0x${"ab".repeat(32)}&chainId=8453&keep=yes`;
for (const [source, destination] of [
  ["https://calldata.eth.sh/trace", "https://trace.eth.sh/"],
  ["https://eth.sh/calldata/trace", "https://trace.eth.sh/"],
  ["https://www.eth.sh/calldata/trace", "https://trace.eth.sh/"],
  ["http://localhost:3215/calldata/trace", "http://localhost:3215/trace"],
  ["https://review.vercel.app/calldata/trace", "https://review.vercel.app/trace"],
]) {
  test(`${source} preserves linked transactions when redirecting`, async () => {
    const url = new URL(`${source}?${query}`);
    const response = await unstable_getResponseFromNextConfig({
      url: url.href, headers: { host: url.host }, nextConfig: config,
    });
    assert.equal(response.status, 308);
    const target = new URL(response.headers.get("location"), url);
    assert.equal(`${target.origin}${target.pathname}`, destination);
    assert.deepEqual([...target.searchParams], [...url.searchParams]);
  });
}

test("trace.eth.sh serves the standalone tool with its transaction parameters", async () => {
  const response = await unstable_getResponseFromNextConfig({
    url: `https://trace.eth.sh/?${query}`,
    headers: { host: "trace.eth.sh" }, nextConfig: config,
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("location"), null);
  const target = new URL(response.headers.get("x-middleware-rewrite"));
  assert.equal(target.pathname, "/trace/");
  assert.deepEqual([...target.searchParams], [...new URLSearchParams(query)]);
});

test("lookalike hosts do not trigger the calldata subdomain redirect", async () => {
  const response = await unstable_getResponseFromNextConfig({
    url: "https://calldata.eth.sh.attacker.example/trace",
    headers: { host: "calldata.eth.sh.attacker.example" }, nextConfig: config,
  });
  assert.equal(response.headers.get("location"), null);
});
