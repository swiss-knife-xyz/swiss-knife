import { test } from "node:test";
import assert from "node:assert/strict";
import { VerificationService } from "./server";
import { address, fixture } from "./fixtures";
const key = "FAKE_SENTINEL_NEVER_EXPOSE_121";
function request(body: unknown) {
  return new Request("https://explorer.eth.sh/api/verification", {
    method: "POST",
    headers: {
      origin: "https://explorer.eth.sh",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}
test("review → explicit submit → pending → verified, with secret confined to fixed server upstream", async () => {
  let now = 100000;
  const calls: { url: URL; init?: RequestInit }[] = [];
  const replies = [
    fixture,
    {
      status: "1",
      message: "OK",
      result: "a7lpxkm9kpcpicx7daftmjifrfhiuhf5vqqnawhkfhzfrcpnxj",
    },
    { status: "0", message: "NOTOK", result: "Pending in queue" },
    { status: "1", message: "OK", result: "Pass - Verified" },
  ];
  const service = new VerificationService({
    key: () => key,
    now: () => now,
    fetch: async (url, init) => {
      calls.push({ url: new URL(String(url)), init });
      return Response.json(replies.shift());
    },
  });
  const response = await service.handle(
    request({ operation: "preview", chainId: "1", address })
  );
  const review = await response.json();
  assert.equal(response.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(review.address.toLowerCase(), address);
  assert.equal(
    review.destinationUrl,
    `https://etherscan.io/address/${address}#code`
  );
  assert.ok(review.sourceCode.includes(fixture.source_code));
  let result = await service.handle(
    request({
      operation: "submit",
      chainId: "1",
      address,
      id: review.id,
      confirmed: false,
    })
  );
  assert.equal(result.status, 400);
  assert.equal(calls.length, 1);
  result = await service.handle(
    request({
      operation: "submit",
      chainId: "1",
      address,
      id: review.id,
      confirmed: true,
    })
  );
  assert.equal((await result.json()).state, "pending");
  assert.equal(calls.length, 2);
  const submission = calls[1];
  assert.equal(
    submission.url.origin + submission.url.pathname,
    "https://api.etherscan.io/v2/api"
  );
  assert.equal(submission.url.searchParams.get("apikey"), key);
  assert.equal(submission.init?.method, "POST");
  assert.equal(submission.init?.redirect, "error");
  assert.equal(submission.init?.credentials, "omit");
  const form = new URLSearchParams(String(submission.init?.body));
  assert.equal(form.get("sourceCode"), review.sourceCode);
  assert.equal(form.get("contractaddress"), address);
  assert.equal(form.get("constructorArguments"), "1234");
  assert.equal(form.get("contractname"), review.contractName);
  // Replaying a consumed consent handle is idempotent, never another submission.
  await service.handle(
    request({
      operation: "submit",
      chainId: "1",
      address,
      id: review.id,
      confirmed: true,
    })
  );
  assert.equal(calls.length, 2);
  now += 6000;
  result = await service.handle(
    request({ operation: "status", chainId: "1", address, id: review.id })
  );
  assert.equal((await result.json()).state, "pending");
  now += 6000;
  result = await service.handle(
    request({ operation: "status", chainId: "1", address, id: review.id })
  );
  const text = await result.text();
  assert.equal(JSON.parse(text).state, "verified");
  assert.equal(text.includes(key), false);
  assert.equal(text.includes("a7lpxkm9"), false);
  assert.equal(calls[2].url.searchParams.get("action"), "checkverifystatus");
});
