import { test } from "node:test";
import assert from "node:assert/strict";
import { VerificationService } from "./server";
import { address, fixture } from "./fixtures";
import {
  harness,
  req,
  key,
  guid,
  etherscanFixture,
  sourcifyFixture,
} from "./testHelpers";
import { type VerificationProvider } from "./source";
const families: VerificationProvider[] = [
  "blockscout",
  "etherscan",
  "routescan",
  "sourcify",
];
for (const sourceProvider of families)
  test(`${sourceProvider} source can be reviewed and submitted to every other family`, async () => {
    const h = harness();
    h.published.add(sourceProvider);
    const preview = await h.send("preview", {
      sourceProvider,
      destinations: families,
    });
    assert.equal(preview.status, 200);
    const review = await preview.json();
    assert.equal(review.sourceProvider, sourceProvider);
    assert.equal(review.targets.length, 4);
    assert.equal(
      review.targets.find((t: any) => t.provider === sourceProvider).state,
      "already_verified"
    );
    assert.equal(
      h.calls.some((c) => c.init?.method === "POST"),
      false
    );
    const denied = await h.send("submit", { id: review.id, confirmed: false });
    assert.equal(denied.status, 400);
    const submitted = await (
      await h.send("submit", { id: review.id, confirmed: true })
    ).json();
    assert.equal(
      submitted.targets.filter((t: any) => t.state === "pending").length,
      3
    );
    for (const call of h.calls.filter((c) => c.init?.method === "POST")) {
      assert.equal(call.init?.redirect, "error");
      assert.equal(call.init?.credentials, "omit");
      if (call.family === "sourcify") {
        const body = JSON.parse(String(call.init?.body));
        assert.deepEqual(body.stdJsonInput, JSON.parse(review.sourceCode));
        assert.equal(body.contractIdentifier, review.contractName);
      } else {
        const form = new URLSearchParams(String(call.init?.body));
        assert.equal(form.get("sourceCode"), review.sourceCode);
        assert.equal(form.get("constructorArguments"), "1234");
        assert.equal(form.get("contractaddress"), address);
      }
    }
    const count = h.calls.filter((c) => c.init?.method === "POST").length;
    await h.send("submit", { id: review.id, confirmed: true });
    assert.equal(
      h.calls.filter((c) => c.init?.method === "POST").length,
      count
    );
    h.tick();
    const status = await (await h.send("status", { id: review.id })).json();
    assert.equal(status.state, "verified");
    assert.equal(JSON.stringify(status).includes(key), false);
    assert.equal(JSON.stringify(status).includes(guid), false);
  });
test("auto-detection skips unavailable providers and imports Sourcify without an Etherscan key", async () => {
  const h = harness();
  h.published.add("sourcify");
  const response = await h.send("preview", {
    sourceProvider: "auto",
    destinations: ["blockscout", "sourcify"],
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).sourceProvider, "sourcify");
});
test("destination lookups are rechecked before submission and published contracts are skipped", async () => {
  const h = harness();
  h.published.add("blockscout");
  const review = await (
    await h.send("preview", {
      sourceProvider: "blockscout",
      destinations: ["etherscan"],
    })
  ).json();
  h.published.add("etherscan");
  const result = await (
    await h.send("submit", { id: review.id, confirmed: true })
  ).json();
  assert.equal(result.state, "already_verified");
  assert.equal(h.submitted.size, 0);
});
test("source failures, explicit provider rejection and uncertain delivery don't block other targets", async () => {
  const h = harness(async (_url, init, p) => {
    if (init?.method === "POST" && p === "etherscan") throw new Error(key);
    if (init?.method === "POST" && p === "routescan")
      return Response.json({ status: "0", result: "Invalid API Key " + key });
  });
  h.published.add("blockscout");
  const review = await (
    await h.send("preview", {
      sourceProvider: "blockscout",
      destinations: ["etherscan", "routescan", "sourcify"],
    })
  ).json();
  const result = await (
    await h.send("submit", { id: review.id, confirmed: true })
  ).json();
  assert.deepEqual(
    result.targets.map((t: any) => t.state),
    ["unknown", "ready", "pending"]
  );
  assert.equal(JSON.stringify(result).includes(key), false);
  const posts = h.calls.filter(
    (c) => c.init?.method === "POST" && c.family === "etherscan"
  ).length;
  await h.send("submit", { id: review.id, confirmed: true, retry: true });
  assert.equal(
    h.calls.filter((c) => c.init?.method === "POST" && c.family === "etherscan")
      .length,
    posts
  );
});
test("status can reconcile an uncertain POST via published source", async () => {
  const h = harness(async (_url, init, p) => {
    if (init?.method === "POST" && p === "etherscan") throw new Error("lost");
    return undefined;
  });
  h.published.add("blockscout");
  const review = await (
    await h.send("preview", { destinations: ["etherscan"] })
  ).json();
  assert.equal(
    (await (await h.send("submit", { id: review.id, confirmed: true })).json())
      .state,
    "unknown"
  );
  h.published.add("etherscan");
  h.tick();
  assert.equal(
    (await (await h.send("status", { id: review.id })).json()).state,
    "verified"
  );
});
test("shared job store survives a new service instance, supports resume and retains single-use submissions", async () => {
  const h = harness();
  h.published.add("blockscout");
  const review = await (
    await h.send("preview", { destinations: ["etherscan"] })
  ).json();
  const b = new VerificationService({
    key: () => key,
    fetch: h.fetcher,
    store: h.store,
    now: h.now,
  });
  const resume = await (
    await b.handle(
      req({ operation: "resume", chainId: "1", address, id: review.id })
    )
  ).json();
  assert.equal(resume.review.id, review.id);
  assert.equal(resume.review.sourceCode, review.sourceCode);
  h.tick();
  await h.send("submit", { id: review.id, confirmed: true });
  h.tick();
  const status = await (
    await b.handle(
      req({
        operation: "submit",
        chainId: "1",
        address,
        id: review.id,
        confirmed: true,
      })
    )
  ).json();
  assert.equal(status.state, "pending");
  assert.equal(h.calls.filter((c) => c.init?.method === "POST").length, 1);
});
test("failed target is retried only with explicit retry and an unchanged destination", async () => {
  let fail = true;
  const h = harness(async (_u, init, p) => {
    if (p === "etherscan" && init?.method === "POST" && fail)
      return Response.json({ status: "0", result: "Fail - Unable to verify" });
  });
  h.published.add("blockscout");
  const review = await (
    await h.send("preview", { destinations: ["etherscan"] })
  ).json();
  assert.equal(
    (await (await h.send("submit", { id: review.id, confirmed: true })).json())
      .state,
    "failed"
  );
  fail = false;
  h.tick();
  await h.send("submit", { id: review.id, confirmed: true });
  assert.equal(h.calls.filter((c) => c.init?.method === "POST").length, 1);
  h.tick();
  assert.equal(
    (
      await (
        await h.send("submit", { id: review.id, confirmed: true, retry: true })
      ).json()
    ).state,
    "pending"
  );
});

test("a different deployment uses the destination chain/address and its own constructor arguments", async () => {
  const targetAddress = "0x" + "22".repeat(20);
  const h = harness(async (url, init, p) => {
    if (p === "blockscout") return Response.json(fixture);
  });
  const response = await h.send("preview", {
    sourceProvider: "blockscout",
    targetChainId: "84532",
    targetAddress,
    constructorArguments: "0xabcd",
    destinations: ["etherscan", "sourcify"],
  });
  assert.equal(response.status, 200);
  const review = await response.json();
  assert.equal(review.targetChainId, "84532");
  assert.equal(review.targetAddress.toLowerCase(), targetAddress);
  assert.equal(review.constructorArguments, "abcd");
  await h.send("submit", { id: review.id, confirmed: true });
  const eth = h.calls.find(
    (c) => c.family === "etherscan" && c.init?.method === "POST"
  )!;
  assert.equal(eth.url.searchParams.get("chainid"), "84532");
  const form = new URLSearchParams(String(eth.init?.body));
  assert.equal(form.get("contractaddress"), targetAddress);
  assert.equal(form.get("constructorArguments"), "abcd");
  const sourcify = h.calls.find(
    (c) => c.family === "sourcify" && c.init?.method === "POST"
  )!;
  assert.ok(sourcify.url.pathname.includes(`/84532/${targetAddress}`));
});
test("a different deployment requires explicit constructor arguments and supports only that destination network's providers", async () => {
  const h = harness();
  h.published.add("blockscout");
  assert.equal(
    (
      await h.send("preview", {
        sourceProvider: "blockscout",
        targetChainId: "43113",
        destinations: ["etherscan"],
        constructorArguments: "",
      })
    ).status,
    400
  );
  assert.equal(
    (
      await h.send("preview", {
        sourceProvider: "blockscout",
        targetChainId: "84532",
        destinations: ["sourcify"],
      })
    ).status,
    400
  );
  assert.equal(h.calls.length, 0);
});
