import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getCanonicalUrl, getPublicPageUrls } from "../seo";
import { getSitemapUrls } from "../crawlerDiscovery";
import { getPath } from "../../utils";
import config from "../../next.config.js";
const {
  getPathMatch,
} = require("next/dist/shared/lib/router/utils/path-match");
test("verification has an explorer-owned reserved namespace and discoverable metadata", () => {
  const rewrite = config
    .rewrites()
    .beforeFiles.find((r: any) => r.destination === "/explorer/:path*")!;
  const match = getPathMatch(rewrite.source);
  assert.ok(match("/verify"));
  assert.equal(match("/api/verification"), false);
  assert.ok(match("/1/0x" + "11".repeat(20)));
  assert.equal(getCanonicalUrl("/explorer/verify"), "https://explorer.eth.sh/verify");
  assert.ok(getPublicPageUrls().includes("https://explorer.eth.sh/verify"));
  assert.ok(
    getSitemapUrls("explorer.eth.sh").includes("https://explorer.eth.sh/verify")
  );
  assert.ok(
    !getSitemapUrls("eth.sh").includes("https://explorer.eth.sh/verify")
  );
  const before = process.env.NEXT_PUBLIC_DEVELOPMENT;
  try {
    process.env.NEXT_PUBLIC_DEVELOPMENT = "true";
    assert.equal(`${getPath("explorer")}verify`, "/explorer/verify");
    process.env.NEXT_PUBLIC_DEVELOPMENT = "false";
    assert.equal(`${getPath("explorer")}verify`, "https://explorer.eth.sh/verify");
  } finally {
    if (before === undefined) delete process.env.NEXT_PUBLIC_DEVELOPMENT;
    else process.env.NEXT_PUBLIC_DEVELOPMENT = before;
  }
  assert.match(
    readFileSync("components/ContractStart.tsx", "utf8"),
    /Cross-explorer Verification/
  );
  const layout = readFileSync("app/explorer/verify/layout.tsx", "utf8");
  assert.match(layout, /https:\/\/explorer.eth.sh\/verify/);
  assert.match(layout, /api\/og\/verify/);
  assert.match(layout, /twitter/);
  assert.ok(readFileSync("app/api/og/verify/route.tsx", "utf8"));
});
