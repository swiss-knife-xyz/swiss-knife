import { test } from "node:test";
import assert from "node:assert/strict";
import { VerificationService } from "./server";
import { address, fixture } from "./fixtures";
const sentinel = "FAKE_SENTINEL_PRIVATE_KEY_121";
const guid = "a7lpxkm9kpcpicx7daftmjifrfhiuhf5vqqnawhkfhzfrcpnxj";
const payload = { chainId: "1", address };
function req(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://explorer.eth.sh/api/verification", {
    method: "POST",
    headers: {
      origin: "https://explorer.eth.sh",
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}
function harness(
  upstream: (url: string, init?: RequestInit) => Promise<Response>,
  key = sentinel
) {
  let now = 100_000;
  let calls = 0;
  const service = new VerificationService({
    key: () => key,
    now: () => now,
    fetch: async (url, init) => {
      calls++;
      return upstream(String(url), init);
    },
  });
  const send = (
    operation: string,
    extra: object = {},
    headers?: Record<string, string>
  ) => service.handle(req({ ...payload, operation, ...extra }, headers));
  const preview = async () => {
    const response = await send("preview");
    assert.equal(response.status, 200);
    return response.json();
  };
  return {
    service,
    send,
    preview,
    calls: () => calls,
    tick: (ms = 6000) => {
      now += ms;
    },
  };
}

test("rejects cross-origin, malformed and proxy-like inputs without upstream access", async () => {
  const h = harness(async () => {
    throw new Error("must not fetch");
  });
  const cases: [unknown, Record<string, string>?][] = [
    [{ ...payload, operation: "preview", url: "https://evil.test" }],
    [{ ...payload, operation: "preview", apikey: sentinel }],
    [{ ...payload, operation: "preview", action: "getsourcecode" }],
    [{ ...payload, operation: "preview", chainId: "999" }],
    [{ ...payload, operation: "preview" }, { origin: "https://evil.test" }],
    [{ ...payload, operation: "preview" }, { "sec-fetch-site": "cross-site" }],
    [{ ...payload, operation: "preview" }, { "content-type": "text/plain" }],
    [{ ...payload, operation: "unknown" }],
    [{ ...payload, operation: "status", id: "https://evil.test" }],
    [{ ...payload, operation: "preview", address: "a".repeat(3000) }],
  ];
  for (const [body, headers] of cases) {
    const response = await h.service.handle(req(body, headers));
    assert.equal(response.status, 400);
    assert.equal((await response.text()).includes(sentinel), false);
  }
  assert.equal(h.calls(), 0);
});

test("preview is read-only and does not even access the private key", async () => {
  const service = new VerificationService({
    key: () => {
      throw new Error("key must not be read");
    },
    fetch: async (url, init) => {
      assert.match(
        String(url),
        /^https:\/\/eth\.blockscout\.com\/api\/v2\/smart-contracts\/0x[0-9a-fA-F]{40}$/
      );
      assert.equal(init?.method, "GET");
      assert.equal(init?.redirect, "error");
      return Response.json(fixture);
    },
  });
  assert.equal(
    (await service.handle(req({ ...payload, operation: "preview" }))).status,
    200
  );
});

test("requires exact consent and binds review to chain/address, with expiry", async () => {
  const h = harness(async () => Response.json(fixture));
  const review = await h.preview();
  for (const extra of [
    { confirmed: undefined },
    { confirmed: "true" },
    { confirmed: true, chainId: "10" },
    { confirmed: true, address: "0x2222222222222222222222222222222222222222" },
  ]) {
    const response = await h.send("submit", { id: review.id, ...extra });
    assert.ok([400, 410].includes(response.status));
  }
  h.tick(600_001);
  assert.equal(
    (await h.send("submit", { id: review.id, confirmed: true })).status,
    410
  );
  assert.equal(h.calls(), 1);
});

test("malformed private configuration never consumes consent or sends a request", async () => {
  const h = harness(async () => Response.json(fixture), "bad");
  const review = await h.preview();
  assert.equal(
    (await h.send("submit", { id: review.id, confirmed: true })).status,
    503
  );
  assert.equal(
    (await (await h.send("status", { id: review.id })).json()).state,
    "ready"
  );
  assert.equal(h.calls(), 1);
});

test("missing key never submits and leaves the preview available", async () => {
  const h = harness(async () => Response.json(fixture), "");
  const review = await h.preview();
  assert.equal(
    (await h.send("submit", { id: review.id, confirmed: true })).status,
    503
  );
  assert.equal(
    (await (await h.send("status", { id: review.id })).json()).state,
    "ready"
  );
  assert.equal(h.calls(), 1);
});

for (const failure of [
  "body",
  "exception",
  "redirect",
  "oversize",
  "malformed",
] as const) {
  test(`submission ${failure} is sanitized and uncertain; retry cannot duplicate a POST`, async () => {
    const logs: unknown[] = [];
    const oldError = console.error,
      oldLog = console.log,
      oldWarn = console.warn;
    console.error =
      console.log =
      console.warn =
        (...args) => {
          logs.push(args);
        };
    try {
      const h = harness(async (url) => {
        if (url.includes("blockscout")) return Response.json(fixture);
        if (failure === "exception")
          throw new Error(`fetch failed at ${url} ${sentinel}`);
        if (failure === "redirect")
          return new Response(null, {
            status: 302,
            headers: { location: `https://evil.test/?apikey=${sentinel}` },
          });
        if (failure === "oversize")
          return new Response("x".repeat(17000) + sentinel);
        if (failure === "malformed")
          return new Response(`<html>${sentinel}</html>`);
        return Response.json({
          status: "1",
          result: sentinel,
          message: sentinel,
        });
      });
      const review = await h.preview();
      const response = await h.send("submit", {
        id: review.id,
        confirmed: true,
      });
      const text = await response.text();
      assert.equal(response.status, 502);
      assert.equal(JSON.parse(text).error.code, "UNKNOWN_DELIVERY");
      assert.equal(text.includes(sentinel), false);
      assert.equal(response.headers.get("location"), null);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.equal(
        (
          await (
            await h.send("submit", { id: review.id, confirmed: true })
          ).json()
        ).state,
        "unknown"
      );
      assert.equal(
        (await (await h.send("status", { id: review.id })).json()).state,
        "unknown"
      );
      assert.equal(h.calls(), 2);
      assert.equal(JSON.stringify(logs).includes(sentinel), false);
      assert.equal(logs.length, 0);
    } finally {
      console.error = oldError;
      console.log = oldLog;
      console.warn = oldWarn;
    }
  });
}

for (const [result, status, expected] of [
  ["Fail - Unable to verify. " + sentinel, "0", "failed"],
  ["Source code already verified", "0", "already_verified"],
  ["Contract source code already verified", "0", "already_verified"],
] as const) {
  test(`known submission result becomes ${expected} without echoing details`, async () => {
    const h = harness(async (url) =>
      Response.json(url.includes("blockscout") ? fixture : { status, result })
    );
    const review = await h.preview();
    const response = await h.send("submit", { id: review.id, confirmed: true });
    const text = await response.text();
    assert.equal(JSON.parse(text).state, expected);
    assert.equal(text.includes(sentinel), false);
  });
}

test("status failures preserve the GUID and pending state; polling is throttled and sanitizes errors", async () => {
  let statusCalls = 0;
  const h = harness(async (url) => {
    if (url.includes("blockscout")) return Response.json(fixture);
    if (url.includes("verifysourcecode"))
      return Response.json({ status: "1", result: guid });
    statusCalls++;
    if (statusCalls === 1)
      return Response.json({
        status: "0",
        result: "Max rate limit reached " + sentinel,
      });
    return Response.json({ status: "0", result: "Fail - Unable to verify" });
  });
  const review = await h.preview();
  await h.send("submit", { id: review.id, confirmed: true });
  let response = await h.send("status", { id: review.id });
  assert.equal((await response.text()).includes(sentinel), false);
  assert.ok([422, 429].includes(response.status));
  assert.equal((await h.send("status", { id: review.id })).status, 429);
  h.tick();
  response = await h.send("status", { id: review.id });
  assert.equal((await response.json()).state, "failed");
  assert.equal(statusCalls, 2);
});

test("Etherscan budget also prevents subsecond bursts across distinct consent handles", async () => {
  const h = harness(async (url) =>
    Response.json(
      url.includes("blockscout") ? fixture : { status: "1", result: guid }
    )
  );
  const reviews = [await h.preview(), await h.preview(), await h.preview()];
  for (const review of reviews.slice(0, 2))
    assert.equal(
      (await h.send("submit", { id: review.id, confirmed: true })).status,
      200
    );
  assert.equal(
    (await h.send("submit", { id: reviews[2].id, confirmed: true })).status,
    429
  );
  assert.equal(h.calls(), 5);
  assert.equal(
    (await (await h.send("status", { id: reviews[2].id })).json()).state,
    "ready"
  );
  h.tick(1001);
  assert.equal(
    (await h.send("submit", { id: reviews[2].id, confirmed: true })).status,
    200
  );
  assert.equal(h.calls(), 6);
});

test("global per-instance request budget and concurrency are bounded", async () => {
  const h = harness(async () => Response.json(fixture));
  for (let i = 0; i < 12; i++)
    assert.equal((await h.send("preview")).status, 200);
  const limited = await h.send("preview");
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "60");
  let resolve!: (response: Response) => void;
  const slow = harness(
    () =>
      new Promise((r) => {
        resolve = r;
      })
  );
  const pending = slow.send("preview");
  await new Promise((r) => setTimeout(r, 10));
  assert.equal((await slow.send("preview")).status, 429);
  resolve(Response.json(fixture));
  assert.equal((await pending).status, 200);
});
