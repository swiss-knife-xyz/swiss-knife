const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const config = require("../next.config.js");
const { matchHas } = require("next/dist/shared/lib/router/utils/prepare-destination");

test("explorer host serves the explorer route and the directory stays on the apex", () => {
  const routes = config.rewrites().beforeFiles;
  const route = routes.find(r => r.has && matchHas({ headers: { host: "explorer.eth.sh" }, cookies: {} }, {}, r.has));
  assert.equal(route?.destination, "/explorer/:path*");
  assert.ok(!routes.some(r => r.has && matchHas({ headers: { host: "explorers.eth.sh" }, cookies: {} }, {}, r.has)));
});

test("tool and directory pages have separate canonical metadata and images", () => {
  const explorer = fs.readFileSync("app/explorer/layout.tsx", "utf8");
  const directory = fs.readFileSync("app/explorers/layout.tsx", "utf8");
  assert.match(explorer, /https:\/\/explorer\.eth\.sh\//);
  assert.match(directory, /https:\/\/eth\.sh\/explorers/);
  assert.match(directory, /api\/og\/explorers/);
  for (const path of ["app/explorer/[chainId]/[address]/layout.tsx", "app/explorers/address/[address]/layout.tsx", "app/explorers/tx/[tx]/layout.tsx"])
    assert.match(fs.readFileSync(path, "utf8"), /index: false/);
});

test("explorer pages do not depend on bookmark redirects", () => {
  assert.ok(config.redirects().every(rule => !/explorer|contract/.test(rule.source + rule.destination)));
  assert.ok(fs.existsSync("app/explorer/page.tsx"));
  assert.ok(fs.existsSync("app/explorer/[chainId]/[address]/page.tsx"));
  assert.ok(!fs.existsSync("app/explorer/[[...path]]/page.tsx"));
});
