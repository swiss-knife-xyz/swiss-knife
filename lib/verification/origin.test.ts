import { test } from "node:test";
import assert from "node:assert/strict";
import { VerificationService } from "./server";
import { address, fixture } from "./fixtures";
function req(
  origin: string,
  host: string,
  internalUrl = "http://localhost:3121/api/verification",
  extra = {}
) {
  return new Request(internalUrl, {
    method: "POST",
    headers: { origin, host, "content-type": "application/json", ...extra },
    body: JSON.stringify({ operation: "preview", chainId: "1", address }),
  });
}
test("Next's normalized internal URL must not reject the actual browser origin/Host pair", async () => {
  const service = new VerificationService({
    key: () => undefined,
    fetch: async () => Response.json(fixture),
  });
  assert.equal(
    (await service.handle(req("http://127.0.0.1:3121", "127.0.0.1:3121")))
      .status,
    200
  );
  assert.equal(
    (await service.handle(req("https://explorer.eth.sh", "explorer.eth.sh")))
      .status,
    200
  );
});
test("normalized internal origin and untrusted forwarding headers cannot override the actual Host", async () => {
  let calls = 0;
  const service = new VerificationService({
    key: () => undefined,
    fetch: async () => {
      calls++;
      return Response.json(fixture);
    },
  });
  for (const request of [
    req("http://localhost:3121", "127.0.0.1:3121"),
    req("https://evil.test", "explorer.eth.sh", undefined, {
      "x-forwarded-host": "evil.test",
    }),
    req("http://explorer.eth.sh", "explorer.eth.sh"),
    req("null", "explorer.eth.sh"),
    req("https://explorer.eth.sh/", "explorer.eth.sh"),
  ])
    assert.equal((await service.handle(request)).status, 400);
  assert.equal(calls, 0);
});
