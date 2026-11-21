import { test } from "node:test";
import assert from "node:assert/strict";
import { VerificationService } from "./server";
import { MemoryJobStore } from "./store";
import { address, fixture } from "./fixtures";
import { harness, req, key } from "./testHelpers";
const payload = { chainId: "1", address, operation: "preview" };
test("rejects cross-origin, arbitrary URL, action, credentials and prototype-like routes before upstream access", async () => {
  const h = harness();
  for (const [body, headers] of [
    [{ ...payload, url: "https://evil.test" }, {}],
    [{ ...payload, apikey: key }, {}],
    [{ ...payload, action: "getsourcecode" }, {}],
    [{ ...payload, chainId: "__proto__" }, {}],
    [{ ...payload, chainId: "999999999999999999999" }, {}],
    [payload, { origin: "https://evil.test" }],
    [payload, { "sec-fetch-site": "cross-site" }],
    [payload, { "content-type": "text/plain" }],
    [{ ...payload, sourceProvider: "__proto__" }, {}],
    [{ ...payload, destinations: ["blockscout", "blockscout"] }, {}],
    [{ ...payload, operation: "status", id: "https://evil.test" }, {}],
    [{ ...payload, keys: { etherscan: "x\nInjected" } }, {}],
  ] as [object, Record<string, string>][]) {
    const r = await h.service.handle(req(body, headers));
    assert.equal(r.status, 400);
    assert.equal((await r.text()).includes(key), false);
  }
  assert.equal(h.calls.length, 0);
});
test("default Blockscout preview never needs a private key or sends a POST", async () => {
  const s = new VerificationService({
    key: () => {
      throw new Error("key must not be read");
    },
    fetch: async (_url, init) => {
      assert.equal(init?.method, "GET");
      return Response.json(fixture);
    },
  });
  assert.equal((await s.handle(req(payload))).status, 200);
});
test("consent, reviewed destinations and exact chain/address binding are enforced", async () => {
  const h = harness();
  h.published.add("blockscout");
  const review = await (
    await h.send("preview", { destinations: ["etherscan"] })
  ).json();
  for (const extra of [
    { confirmed: "true" },
    { confirmed: undefined },
    { confirmed: true, address: "0x" + "22".repeat(20) },
    { confirmed: true, chainId: "10" },
    { confirmed: true, providers: ["sourcify"] },
  ]) {
    const r = await h.send("submit", { id: review.id, ...extra });
    assert.ok([400, 410].includes(r.status));
  }
  assert.equal(h.submitted.size, 0);
  h.tick(600_001);
  assert.equal(
    (await h.send("submit", { id: review.id, confirmed: true })).status,
    410
  );
});
test("missing and rejected keys yield per-target errors without swallowing a working destination", async () => {
  const h = harness();
  h.published.add("blockscout");
  const s = new VerificationService({
    key: () => undefined,
    fetch: h.fetcher,
    now: h.now,
  });
  const review = await (
    await s.handle(req({ ...payload, destinations: ["etherscan", "sourcify"] }))
  ).json();
  assert.equal(review.targets[0].error, "API_KEY_REQUIRED");
  h.tick();
  const status = await (
    await s.handle(
      req({ ...payload, operation: "submit", id: review.id, confirmed: true })
    )
  ).json();
  assert.equal(status.targets[0].state, "ready");
  assert.equal(status.targets[1].state, "pending");
});
for (const failure of [
  "exception",
  "redirect",
  "oversize",
  "malformed",
  "secret-guid",
]) {
  test(`uncertain ${failure} never echoes provider details and never resubmits`, async () => {
    const h = harness(async (_url, init, p) => {
      if (init?.method !== "POST" || p !== "etherscan") return;
      if (failure === "exception") throw new Error(key);
      if (failure === "redirect")
        return new Response(null, {
          status: 302,
          headers: { location: `https://evil.test/${key}` },
        });
      if (failure === "oversize") return new Response("x".repeat(17000) + key);
      if (failure === "malformed") return new Response(`<html>${key}</html>`);
      return Response.json({ status: "1", result: key });
    });
    h.published.add("blockscout");
    const review = await (
      await h.send("preview", { destinations: ["etherscan"] })
    ).json();
    const result = await h.send("submit", { id: review.id, confirmed: true });
    const text = await result.text();
    assert.equal(JSON.parse(text).state, "unknown");
    assert.equal(text.includes(key), false);
    assert.equal(result.headers.get("location"), null);
    await h.send("submit", { id: review.id, confirmed: true, retry: true });
    assert.equal(h.calls.filter((c) => c.init?.method === "POST").length, 1);
  });
}
test("provider request budgets are independent and shared by service workers using one store", async () => {
  let now = 1000;
  const store = new MemoryJobStore(() => now);
  await store.reserve("etherscan", "same-key");
  await store.reserve("etherscan", "same-key");
  await assert.rejects(
    store.reserve("etherscan", "same-key"),
    /Too many requests/
  );
  await store.reserve("routescan", "same-key");
  await store.reserve("etherscan", "other-key");
  now += 1001;
  await store.reserve("etherscan", "same-key");
});
test("job locking is exclusive and releases before the next submission", async () => {
  const h = harness();
  h.published.add("blockscout");
  const review = await (
    await h.send("preview", { destinations: ["etherscan"] })
  ).json();
  const unlock = await h.store.lock(review.id);
  assert.ok(unlock);
  assert.equal(
    (await h.send("submit", { id: review.id, confirmed: true })).status,
    429
  );
  await unlock();
  h.tick();
  assert.equal(
    (await h.send("submit", { id: review.id, confirmed: true })).status,
    200
  );
});
