import { test } from "node:test";
import assert from "node:assert/strict";
import { VerificationService } from "./server";
import { address, fixture } from "./fixtures";
const body = { operation: "preview", chainId: "1", address };
function req(signal?: AbortSignal) {
  return new Request("https://explorer.eth.sh/api/verification", {
    method: "POST",
    headers: {
      origin: "https://explorer.eth.sh",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    signal,
  });
}

test("oversized decompressed Blockscout response is cancelled before parsing", async () => {
  let cancelled = false;
  const service = new VerificationService({
    key: () => {
      throw new Error("no key on preview");
    },
    fetch: async () =>
      new Response(
        new ReadableStream({
          pull(controller) {
            controller.enqueue(new Uint8Array(1_000_000));
          },
          cancel() {
            cancelled = true;
          },
        })
      ),
  });
  const response = await service.handle(req());
  assert.equal(response.status, 422);
  assert.equal(cancelled, true);
});

test("aborted/stalled Blockscout body releases the concurrency gate", async () => {
  let calls = 0,
    cancelled = false;
  const service = new VerificationService({
    key: () => undefined,
    fetch: async () => {
      calls++;
      return calls === 1
        ? new Response(
            new ReadableStream({
              cancel() {
                cancelled = true;
              },
            })
          )
        : Response.json(fixture);
    },
  });
  const controller = new AbortController();
  const pending = service.handle(req(controller.signal));
  await new Promise((resolve) => setTimeout(resolve, 10));
  controller.abort();
  const response = await pending;
  assert.equal(response.status, 422);
  assert.equal(cancelled, true);
  assert.equal((await service.handle(req())).status, 200);
});

test("a different instance cannot authorize or poll a handle it did not issue", async () => {
  const a = new VerificationService({
    key: () => undefined,
    fetch: async () => Response.json(fixture),
  });
  const review = await (await a.handle(req())).json();
  const b = new VerificationService({
    key: () => undefined,
    fetch: async () => {
      throw new Error("must not fetch");
    },
  });
  const response = await b.handle(
    new Request("https://explorer.eth.sh/api/verification", {
      method: "POST",
      headers: {
        origin: "https://explorer.eth.sh",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        ...body,
        operation: "submit",
        id: review.id,
        confirmed: true,
      }),
    })
  );
  assert.equal(response.status, 410);
});
