import assert from "node:assert/strict";
import test from "node:test";
import { getCanonicalUrl, getPublicPageUrls } from "./seo";
import { metadata } from "../app/converter/gas-cost/layout";
import { toolOgCards } from "./toolOgCards";

test("Gas Cost is discoverable and has page-specific canonical and social images", () => {
  const canonical = "https://converter.eth.sh/gas-cost";
  assert.equal(getCanonicalUrl("/converter/gas-cost"), canonical);
  assert.ok(getPublicPageUrls().includes(canonical));
  assert.deepEqual(metadata.alternates, { canonical });
  for (const key of ["openGraph", "twitter"] as const) {
    assert.deepEqual(metadata[key]?.images, ["https://eth.sh/api/og/gas-cost"]);
  }
});

test("gas-cost social card uses the shared tool template", () => {
  assert.equal(toolOgCards["gas-cost"].title, "Cross-chain Gas Cost");
  assert.equal(toolOgCards["gas-cost"].description.length, 2);
});
