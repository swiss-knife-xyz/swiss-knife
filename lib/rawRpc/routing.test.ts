import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { getCanonicalUrl, getPublicPageUrls } from "../seo";
import { toolOgCards } from "../toolOgCards";
import { metadata } from "../../app/rpc/layout";
import { POST, runtime, maxDuration } from "../../app/api/rpc/route";
test("root-host RPC metadata, dedicated OG and discovery agree", () => {
  assert.equal(getCanonicalUrl("/rpc"), "https://eth.sh/rpc");
  assert.ok(getPublicPageUrls().includes("https://eth.sh/rpc"));
  assert.deepEqual(metadata.alternates, { canonical: "https://eth.sh/rpc" });
  assert.match(
    JSON.stringify(metadata.openGraph),
    /https:\/\/eth.sh\/api\/og\/rpc/
  );
  assert.match(
    JSON.stringify(metadata.twitter),
    /https:\/\/eth.sh\/api\/og\/rpc/
  );
  assert.ok(
    readFileSync("components/HomePage/ToolsGrid/index.tsx", "utf8").includes(
      '"rpc"'
    )
  );
  assert.equal(toolOgCards.rpc.title, "Raw RPC Console");
});
test("actual route rejects bypass attempts without contacting upstream", async () => {
  assert.equal(runtime, "nodejs");
  assert.equal(maxDuration, 20);
  const response = await POST(
    new Request("https://eth.sh/api/rpc", {
      method: "POST",
      headers: {
        origin: "https://eth.sh",
        host: "eth.sh",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        chain: "1",
        request: {
          jsonrpc: "2.0",
          id: 1,
          method: "eth_sendRawTransaction",
          params: ["0x"],
        },
      }),
    })
  );
  assert.equal(response.status, 400);
});
