import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { getCanonicalUrl, getPublicPageUrls } from "../seo";
import { getSitemapUrls } from "../crawlerDiscovery";
import { getPath } from "../../utils";
import config from "../../next.config.js";
const {
  getPathMatch,
} = require("next/dist/shared/lib/router/utils/path-match");
test("native trace namespace bypasses explorer's generic contract rewrite without taking legacy tx bookmarks", () => {
  const route = config
    .rewrites()
    .beforeFiles.find((r: any) => r.destination === "/contract/:path*")!;
  const match = getPathMatch(route.source);
  for (const path of ["/trace", "/trace/", "/api/trace"])
    assert.equal(match(path), false, path);
  assert.ok(match("/1/0x" + "11".repeat(20)));
  assert.ok(
    config
      .redirects()
      .some(
        (r: any) =>
          r.source === "/tx/:tx" &&
          r.destination === "https://eth.sh/explorers/tx/:tx"
      )
  );
});
test("native trace has explorer-owned canonical discovery and preview-safe links", () => {
  assert.equal(getCanonicalUrl("/trace"), "https://explorer.eth.sh/trace");
  assert.ok(getPublicPageUrls().includes("https://explorer.eth.sh/trace"));
  assert.ok(
    getSitemapUrls("explorer.eth.sh").includes("https://explorer.eth.sh/trace")
  );
  assert.ok(
    !getSitemapUrls("eth.sh").includes("https://explorer.eth.sh/trace")
  );
  const previous = process.env.NEXT_PUBLIC_DEVELOPMENT;
  try {
    process.env.NEXT_PUBLIC_DEVELOPMENT = "true";
    assert.equal(getPath("trace"), "/trace/");
    process.env.NEXT_PUBLIC_DEVELOPMENT = "false";
    assert.equal(getPath("trace"), "https://explorer.eth.sh/trace/");
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_DEVELOPMENT;
    else process.env.NEXT_PUBLIC_DEVELOPMENT = previous;
  }
});
test("trace is linked from Explorer with page-specific metadata and OG image", () => {
  assert.match(
    readFileSync("app/contract/page.tsx", "utf8"),
    /getPath\("trace"\)/
  );
  const layout = readFileSync("app/trace/layout.tsx", "utf8");
  assert.match(layout, /https:\/\/explorer.eth.sh\/trace/);
  assert.match(layout, /api\/og\/trace/);
  assert.match(layout, /twitter/);
  assert.ok(readFileSync("app/api/og/trace/route.tsx", "utf8"));
});
