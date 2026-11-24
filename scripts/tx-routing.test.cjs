const assert = require("node:assert/strict");
const { test } = require("node:test");
const { unstable_getResponseFromNextConfig } = require("next/experimental/testing/server");
const config = require("../next.config.js");

// The Next config test utility flattens repeated keys. The live HTTP suite
// in seo-local-redirects.test.py covers those separately.
const query = "chainId=8453&calldata=0xa9059cbb&eth=0.01&tag=a&empty=&url=https%3A%2F%2Fexample.com%2Fa%3Fx%3D1%26y%3D2";
const cases = [
  ["https://tx.eth.sh/send-tx", "https://tx.eth.sh/"],
  ["https://eth.sh/tx/send-tx", "https://tx.eth.sh/"],
  ["http://localhost:3210/tx/send-tx", "http://localhost:3210/tx"],
  ["https://transact.eth.sh/", "https://tx.eth.sh/"],
  ["https://transact.eth.sh/send-tx", "https://tx.eth.sh/"],
  ["https://transact.eth.sh/nested/path", "https://tx.eth.sh/nested/path"],
  ["https://eth.sh/transact", "https://tx.eth.sh/"],
  ["https://www.eth.sh/transact/send-tx", "https://tx.eth.sh/"],
  ["http://localhost:3210/transact", "http://localhost:3210/tx"],
  ["http://localhost:3210/transact/send-tx", "http://localhost:3210/tx"],
  ["https://review.vercel.app/transact/send-tx", "https://review.vercel.app/tx"],
];

for (const [source, destination] of cases) {
  test(`${source} permanently redirects with query values intact`, async () => {
    const url = new URL(`${source}?${query}`);
    const response = await unstable_getResponseFromNextConfig({ url: url.href, headers: { host: url.host }, nextConfig: config });
    assert.equal(response.status, 308);
    const target = new URL(response.headers.get("location"), url);
    assert.equal(`${target.origin}${target.pathname}`, destination);
    assert.deepEqual([...target.searchParams], [...url.searchParams]);
  });
}

test("the new tx host rewrites to the moved page without a migration redirect", async () => {
  const response = await unstable_getResponseFromNextConfig({ url: `https://tx.eth.sh/?${query}`, headers: { host: "tx.eth.sh" }, nextConfig: config });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("location"), null);
  const target = new URL(response.headers.get("x-middleware-rewrite"));
  assert.equal(target.pathname, "/tx/");
  assert.deepEqual([...target.searchParams], [...new URLSearchParams(query)]);
});

test("lookalike hosts do not trigger the legacy subdomain redirect", async () => {
  const response = await unstable_getResponseFromNextConfig({ url: "https://transact.eth.sh.attacker.example/send-tx", headers: { host: "transact.eth.sh.attacker.example" }, nextConfig: config });
  assert.equal(response.headers.get("location"), null);
});
