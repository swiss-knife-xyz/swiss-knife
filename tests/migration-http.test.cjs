const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { getMigrationRedirect } = require("../lib/migration/redirect");
const origin = process.env.MIGRATION_TEST_ORIGIN;
const enabled = process.env.SWISS_KNIFE_MIGRATION_ENABLED === "true";
if (origin && !/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin))
  throw Error("Local test server required");
function request(host, path, method = "GET") {
  return new Promise((resolve, reject) => {
    const req = http.request(
      `${origin}${path}`,
      { method, headers: { Host: host } },
      (res) => {
        res.resume();
        res.on("end", () =>
          resolve({ status: res.statusCode, location: res.headers.location })
        );
      }
    );
    req.setTimeout(30000, () => req.destroy(Error("HTTP timeout")));
    req.on("error", reject);
    req.end();
  });
}
const address = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const cases = [
  ["contract-address.swiss-knife.xyz", "/?salt=0x1234&tag=one&tag=two"],
  ["determine-address.swiss-knife.xyz", "/"],
  ["swiss-knife.xyz", "/"],
  ["swiss-knife.xyz", "/?empty=&bare&space=+&tag=&tag=two&payload=a%2Bb%3D"],
  ["www.swiss-knife.xyz", "/converter/eth?wei=9007199254740993123456789"],
  ["calldata.swiss-knife.xyz", "/"],
  [
    "calldata.swiss-knife.xyz",
    "/decoder/?calldata=0x1234&chainId=1&tag=one&tag=two",
  ],
  [
    "transact.swiss-knife.xyz",
    "/send-tx?to=alice.eth&calldata=0x&eth=0.000000000000000001&chainId=8453",
  ],
  ["explorer.swiss-knife.xyz", `/address/${address}?chainId=8453`],
  ["explorer.swiss-knife.xyz", `/contract/${address}/8453`],
  ["explorer.swiss-knife.xyz", "/address/vitalik.eth"],
  [
    "wallet.swiss-knife.xyz",
    "/signatures/view?payload=a%2Bb%2Fc%3D%3D&returnParams=x%3D1%26y%3D2",
  ],
  ["apps.swiss-knife.xyz", "/?url=https%3A%2F%2Fdapp.test%2F%3Fa%3D1%26b%3D2"],
  ["safe.swiss-knife.xyz", "/eip-712-hash?json=%7B%22chainId%22%3A1%7D"],
  ["siwe.swiss-knife.xyz", "/?message=a%2Bb%2Fc%3D%3D"],
];
for (const [host, path] of cases) {
  test(
    `real Next middleware: ${host}${path}`,
    { skip: !origin || !enabled },
    async () => {
      const result = await request(host, path);
      assert.equal(result.status, 308);
      assert.equal(
        result.location,
        getMigrationRedirect(`https://${host}${path}`, { enabled: true })
      );
      assert.equal(new URL(result.location).hash, "");
    }
  );
}
test(
  "HEAD uses the same permanent redirect",
  { skip: !origin || !enabled },
  async () => {
    const result = await request("swiss-knife.xyz", "/", "HEAD");
    assert.equal(result.status, 308);
    assert.equal(result.location, "https://eth.sh/?migration=swiss-knife");
  }
);
test("assets bypass migration middleware", { skip: !origin }, async () => {
  for (const host of ["swiss-knife.xyz", "eth.sh"]) {
    const result = await request(host, "/favicon.ico");
    assert.equal(result.status, 200);
    assert.equal(result.location, undefined);
  }
});
test(
  "POST bodies are not forwarded to the new site",
  { skip: !origin },
  async () => {
    const result = await request("swiss-knife.xyz", "/favicon.ico", "POST");
    assert.equal(result.location, undefined);
  }
);
test(
  "disabled migration preserves the legacy homepage",
  { skip: !origin || enabled },
  async () => {
    const result = await request("swiss-knife.xyz", "/");
    assert.equal(result.status, 200);
    assert.equal(result.location, undefined);
  }
);
