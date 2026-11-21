import assert from "node:assert/strict";
import test from "node:test";
import { getCanonicalUrl, getPublicPageUrls } from "./seo";
import { metadata } from "../app/converter/gas-cost/layout";
import { GET } from "../app/api/og/gas-cost/route";

test("Gas Cost is discoverable and has page-specific canonical and social images", () => {
  const canonical = "https://converter.eth.sh/gas-cost";
  assert.equal(getCanonicalUrl("/converter/gas-cost"), canonical);
  assert.ok(getPublicPageUrls().includes(canonical));
  assert.deepEqual(metadata.alternates, { canonical });
  for (const key of ["openGraph", "twitter"] as const) {
    assert.deepEqual(metadata[key]?.images, ["https://eth.sh/api/og/gas-cost"]);
  }
});

test("actual gas-cost OG route renders a deterministic PNG", async () => {
  const response = GET();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /image\/png/);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.deepEqual(
    [...bytes.subarray(0, 8)],
    [137, 80, 78, 71, 13, 10, 26, 10]
  );
  assert.ok(bytes.length > 1000);
});
