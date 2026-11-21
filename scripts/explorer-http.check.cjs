const assert = require("node:assert/strict");
const http = require("node:http");
const { test } = require("node:test");
const port = Number(process.env.PORT || 3000);
function request(host, path) {
  return new Promise((resolve, reject) => {
    const req = http.get({ hostname: "127.0.0.1", port, path, headers: { Host: host, "User-Agent": "Mozilla/5.0" } }, res => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", chunk => body += chunk);
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.setTimeout(60000, () => req.destroy(new Error("HTTP timeout")));
    req.on("error", reject);
  });
}

test("current explorer and directory routes render directly locally and on their public hosts", async () => {
  for (const [host, path, canonical, title] of [
    ["localhost", "/explorer", "https://explorer.eth.sh/", "Contract Explorer"],
    ["explorer.eth.sh", "/", "https://explorer.eth.sh/", "Contract Explorer"],
    ["localhost", "/explorers", "https://eth.sh/explorers", "Explorer Directory"],
    ["eth.sh", "/explorers", "https://eth.sh/explorers", "Explorer Directory"],
  ]) {
    const response = await request(host, path);
    assert.equal(response.status, 200, host + path);
    assert.equal(response.headers.location, undefined, host + path);
    assert.ok(response.body.includes(title), host + path);
    const tag = response.body.match(/rel="canonical" href="([^\"]+)"/);
    assert.ok(tag, host + path);
    assert.equal(new URL(tag[1]).href, new URL(canonical).href);
  }
});

test("sitemap and robots advertise the current explorer host and directory path", async () => {
  const sitemap = await request("explorer.eth.sh", "/sitemap.xml");
  assert.equal(sitemap.status, 200);
  assert.deepEqual([...sitemap.body.matchAll(/<loc>(.*?)<\/loc>/g)].map(x => x[1]), ["https://explorer.eth.sh/"]);
  const robots = await request("explorer.eth.sh", "/robots.txt");
  assert.match(robots.body, /Sitemap: https:\/\/explorer.eth.sh\/sitemap.xml/);
});
module.exports = { request };
