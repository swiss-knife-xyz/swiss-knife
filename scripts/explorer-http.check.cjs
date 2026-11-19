const assert = require("node:assert/strict");
const http = require("node:http");
const { test } = require("node:test");
const port = Number(process.env.PORT || 3289);
const address = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
function request(host, path) {
  return new Promise((resolve, reject) => {
    const req = http.get(
      {
        hostname: "127.0.0.1",
        port,
        path,
        headers: { Host: host, "User-Agent": "Mozilla/5.0" },
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (x) => (body += x));
        res.on("end", () => {
          if (process.env.HTTP_EVIDENCE)
            require("node:fs").appendFileSync(
              process.env.HTTP_EVIDENCE,
              JSON.stringify({
                host,
                path,
                status: res.statusCode,
                location: res.headers.location ?? null,
                cacheControl: res.headers["cache-control"] ?? null,
                locs: [...body.matchAll(/<loc>(.*?)<\/loc>/g)].map((x) => x[1]),
                sitemaps: [...body.matchAll(/^Sitemap: (.*)$/gm)].map(
                  (x) => x[1]
                ),
              }) + "\n"
            );
          resolve({ status: res.statusCode, headers: res.headers, body });
        });
      }
    );
    req.setTimeout(180000, () => req.destroy(new Error("HTTP timeout")));
    req.on("error", reject);
  });
}
test("old explorer contract bookmark lands at new prefix-free canonical preserving query", async () => {
  const r = await request(
    "explorer.eth.sh",
    `/contract/1/${address}?function=balanceOf&data=0x1234`
  );
  assert.equal(r.status, 308);
  assert.equal(
    r.headers.location,
    `https://explorer.eth.sh/1/${address}?function=balanceOf&data=0x1234`
  );
});
test("crawler discovery is scoped to the requesting host", async () => {
  const r = await request("explorer.eth.sh", "/sitemap.xml?address=private");
  assert.equal(r.status, 200);
  assert.deepEqual(
    [...r.body.matchAll(/<loc>(.*?)<\/loc>/g)].map((x) => x[1]),
    ["https://explorer.eth.sh/"]
  );
  assert.match(r.headers["cache-control"], /no-store/);
  const robots = await request("explorer.eth.sh", "/robots.txt");
  assert.match(robots.body, /Sitemap: https:\/\/explorer.eth.sh\/sitemap.xml/);
  assert.ok(!robots.body.includes("Sitemap: https://eth.sh/"));
});
test("old address contract shortcuts preserve their selected chain", async () => {
  for (const [host, prefix] of [
    ["explorer.eth.sh", ""],
    ["eth.sh", "/explorer"],
    ["eth.sh", "/explorers"],
  ]) {
    const r = await request(
      host,
      `${prefix}/address/${address}/contract?chainId=8453&data=0x1234`
    );
    assert.equal(r.status, 308);
    const target = new URL(r.headers.location);
    assert.equal(
      target.origin + target.pathname,
      `https://explorer.eth.sh/8453/${address}`
    );
    assert.equal(target.searchParams.get("data"), "0x1234");
  }
});
test("legacy route matrix preserves query and never returns to an old cached source", async () => {
  const query = "?function=balanceOf&data=0x1234&value=0&abi=implementation";
  const cases = [
    ["contract.eth.sh", "/", "https://explorer.eth.sh/"],
    [
      "contract.eth.sh",
      `/1/${address}`,
      `https://explorer.eth.sh/1/${address}`,
    ],
    ["contract.eth.sh", "/contract", "https://explorer.eth.sh/"],
    [
      "contract.eth.sh",
      `/contract/8453/${address}`,
      `https://explorer.eth.sh/8453/${address}`,
    ],
    ["eth.sh", "/contract", "https://explorer.eth.sh/"],
    [
      "eth.sh",
      `/contract/1/${address}`,
      `https://explorer.eth.sh/1/${address}`,
    ],
    [
      "eth.sh",
      `/explorer/contract/1/${address}`,
      `https://explorer.eth.sh/1/${address}`,
    ],
    ["eth.sh", "/explorer", "https://eth.sh/explorers"],
    [
      "explorer.eth.sh",
      `/address/${address}`,
      `https://eth.sh/explorers/address/${address}`,
    ],
    [
      "explorer.eth.sh",
      "/tx/0x" + "a".repeat(64),
      "https://eth.sh/explorers/tx/0x" + "a".repeat(64),
    ],
    ["explorer.eth.sh", "/vitalik.eth", "https://eth.sh/explorers/vitalik.eth"],
    ["explorer.eth.sh", `/${address}`, `https://eth.sh/explorers/${address}`],
    ["explorer.swiss-knife.xyz", "/", "https://eth.sh/explorers"],
    [
      "contract.swiss-knife.xyz",
      `/1/${address}`,
      `https://explorer.eth.sh/1/${address}`,
    ],
    [
      "explorer.swiss-knife.xyz",
      `/contract/1/${address}`,
      `https://explorer.eth.sh/1/${address}`,
    ],
    [
      "swiss-knife.xyz",
      `/explorer/address/${address}`,
      `https://eth.sh/explorers/address/${address}`,
    ],
    ["orgs.eth.sh", "/", "https://eth.sh/orgs"],
  ];
  for (const [host, path, target] of cases) {
    const r = await request(host, path + query);
    assert.equal(r.status, 308, host + path);
    assert.equal(r.headers.location, target + query, host + path);
    assert.notEqual(r.headers.location, "https://" + host + path + query);
  }
  const directoryFilter = await request(
    "explorer.eth.sh",
    "/?forContracts=true"
  );
  assert.equal(
    directoryFilter.headers.location,
    "https://eth.sh/explorers?forContracts=true"
  );
});

test("host sitemap exact sets and unknown-host discovery exclusion", async () => {
  const expected = {
    "eth.sh": [
      "https://eth.sh/",
      "https://eth.sh/robin-bridge",
      "https://eth.sh/explorers",
      "https://eth.sh/orgs",
    ],
    "explorer.eth.sh": ["https://explorer.eth.sh/"],
    "solidity.eth.sh": ["https://solidity.eth.sh/compiler"],
    "contract.eth.sh": [],
    "orgs.eth.sh": [],
    "docs.eth.sh": [],
    "unknown.example": [],
    "explorer.eth.sh.attacker.example": [],
    explorerXethXsh: [],
    "localhost:3289": [],
  };
  for (const [host, urls] of Object.entries(expected)) {
    const r = await request(
      host,
      "/sitemap.xml?url=https://evil.example/private"
    );
    assert.equal(r.status, urls.length ? 200 : 404, host);
    assert.deepEqual(
      [...r.body.matchAll(/<loc>(.*?)<\/loc>/g)].map((x) => x[1]),
      urls,
      host
    );
    assert.match(r.headers["cache-control"], /no-store/, host);
    const robots = await request(host, "/robots.txt");
    const advertised = [...robots.body.matchAll(/^Sitemap: (.*)$/gm)].map(
      (x) => x[1]
    );
    assert.deepEqual(
      advertised,
      urls.length ? [`https://${host}/sitemap.xml`] : [],
      host
    );
    assert.match(robots.body, /Disallow: \/api\//);
    assert.match(robots.headers["cache-control"], /no-store/);
    assert.ok(!robots.body.includes("Disallow: /contract"));
  }
});

if (process.env.FULL_HTTP === "1") {
  test("real contract and directory roots render on their new canonical hosts", async () => {
    for (const [host, path, canonical, title, link] of [
      [
        "explorer.eth.sh",
        "/",
        "https://explorer.eth.sh/",
        "Contract Explorer",
        "https://eth.sh/explorers/",
      ],
      [
        "eth.sh",
        "/explorers",
        "https://eth.sh/explorers",
        "Explorer Directory",
        "https://explorer.eth.sh/",
      ],
      [
        "explorer.eth.sh",
        `/8453/${address}?data=0x1234`,
        `https://explorer.eth.sh/8453/${address}`,
        "Contract Explorer",
        "https://eth.sh/explorers/",
      ],
      [
        "eth.sh",
        `/explorers/address/${address}?forContracts=true`,
        `https://eth.sh/explorers/address/${address}`,
        "Explorer Directory",
        "https://explorer.eth.sh/",
      ],
    ]) {
      const r = await request(host, path);
      assert.equal(r.status, 200, host + path);
      assert.equal(r.headers.location, undefined);
      assert.ok(r.body.includes(title), host + path);
      assert.ok(
        r.body.includes(`rel="canonical" href="${canonical}"`),
        host + path
      );
      assert.ok(r.body.includes(`href="${link}"`), host + path);
      if (path.includes(address))
        assert.match(r.body, /name="robots" content="noindex, follow"/);
      else assert.match(r.body, /name="robots" content="index, follow"/);
    }
  });
}
module.exports = { request, address };
