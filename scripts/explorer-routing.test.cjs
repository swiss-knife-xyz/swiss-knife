const assert = require("node:assert/strict");
const { test } = require("node:test");
const config = require("../next.config.js");
const fs = require("node:fs");

test("contract canonical and social identity use the new host; directory owns apex path", () => {
  for (const path of [
    "app/contract/layout.tsx",
    "app/contract/[chainId]/[address]/layout.tsx",
    "app/contract/[chainId]/[address]/page.tsx",
  ]) {
    const source = fs.readFileSync(path, "utf8");
    assert.ok(source.includes("https://explorer.eth.sh/"), path);
    assert.ok(!source.includes("https://contract.eth.sh/"), path);
  }
  assert.ok(
    fs
      .readFileSync("app/explorers/layout.tsx", "utf8")
      .includes("https://eth.sh/explorers")
  );
});

test("both tools link directly to each other and dynamic inputs are not indexable", () => {
  assert.match(
    fs.readFileSync("app/contract/page.tsx", "utf8"),
    /Explorer Directory/
  );
  assert.match(
    fs.readFileSync("app/explorers/ExplorerLayout.tsx", "utf8"),
    /Contract Explorer/
  );
  for (const path of [
    "app/contract/[chainId]/[address]/layout.tsx",
    "app/contract/[chainId]/[address]/page.tsx",
    "app/explorers/address/[address]/layout.tsx",
    "app/explorers/tx/[tx]/layout.tsx",
  ]) {
    assert.match(fs.readFileSync(path, "utf8"), /index: false/);
  }
});

test("migration host matching rejects dotted-host lookalikes", () => {
  const {
    matchHas,
  } = require("next/dist/shared/lib/router/utils/prepare-destination");
  for (const host of [
    "explorerXethXsh",
    "contractXethXsh",
    "ethXsh",
    "explorer.eth.sh.attacker.example",
  ]) {
    for (const rule of config
      .redirects()
      .filter(
        (r) =>
          r.destination.startsWith("https://explorer.eth.sh") ||
          r.destination.startsWith("https://eth.sh/explorers")
      )) {
      assert.equal(
        matchHas({ headers: { host }, cookies: {} }, {}, rule.has),
        false,
        host
      );
    }
  }
});

test("explorer host rewrites to the existing contract tool, not the directory", () => {
  const route = config
    .rewrites()
    .beforeFiles.find((r) =>
      new RegExp(`^${r.has?.[0]?.value}$`).test("explorer.eth.sh")
    );
  assert.equal(route?.destination, "/contract/:path*");
});
