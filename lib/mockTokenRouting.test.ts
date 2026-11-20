import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getPublicPageUrls, getCanonicalUrl } from "./seo";
import { metadata } from "../app/mock-tokens/layout";
test("mock deployer has a discoverable canonical root-host page and dedicated social cards", () => {
  assert.equal(getCanonicalUrl("/mock-tokens"), "https://eth.sh/mock-tokens");
  assert.ok(getPublicPageUrls().includes("https://eth.sh/mock-tokens"));
  assert.equal(metadata.alternates?.canonical, "https://eth.sh/mock-tokens");
  assert.match(
    JSON.stringify(metadata.openGraph),
    /https:\/\/eth.sh\/api\/og\/mock-tokens/
  );
  assert.match(
    JSON.stringify(metadata.twitter),
    /https:\/\/eth.sh\/api\/og\/mock-tokens/
  );
  assert.ok(
    readFileSync(
      new URL("../app/api/og/mock-tokens/route.tsx", import.meta.url),
      "utf8"
    ).includes("toolOgImage")
  );
  assert.ok(
    readFileSync(
      new URL("../components/HomePage/ToolsGrid/index.tsx", import.meta.url),
      "utf8"
    ).includes('"mock-tokens"')
  );
});
