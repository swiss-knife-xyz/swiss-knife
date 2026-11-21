import { test } from "node:test";
import assert from "node:assert/strict";
import * as registry from "./signatureRegistry";
import { id, FunctionFragment } from "ethers";

// Existing import-response tests exercise the POST after a confirmed missing lookup.
function withMissingLookup(fetcher: typeof fetch): typeof fetch {
  return (async (url, init) => {
    if (init?.method === "GET") {
      const selector = new URL(String(url)).searchParams.get("function")!;
      return new Response(
        JSON.stringify({ ok: true, result: { function: { [selector]: null } } })
      );
    }
    return fetcher(url, init);
  }) as typeof fetch;
}

for (const status of ["imported", "duplicated"] as const) {
  test(`confirms ${status} for exactly the submitted pair`, async () => {
    const details = {
      imported: {},
      duplicated: {},
      invalid: [],
      [status]: { "ping()": id("ping()").slice(0, 10) },
    };
    const mock = (async () =>
      new Response(
        JSON.stringify({ ok: true, result: { function: details } })
      )) as typeof fetch;
    assert.equal(
      await registry.submitSignatureImport(
        "ping()",
        id("ping()").slice(0, 10),
        true,
        withMissingLookup(mock)
      ),
      status
    );
  });
}
for (const [name, value, status] of [
  ["false ok", { ok: false }, 200],
  ["missing result", { ok: true }, 200],
  [
    "wrong selector",
    {
      ok: true,
      result: {
        function: {
          imported: { "ping()": "0x00000000" },
          duplicated: {},
          invalid: [],
        },
      },
    },
    200,
  ],
  [
    "unrelated signature",
    {
      ok: true,
      result: {
        function: {
          imported: { "other()": "0x5c36b186" },
          duplicated: {},
          invalid: [],
        },
      },
    },
    200,
  ],
  [
    "invalid submitted signature",
    {
      ok: true,
      result: {
        function: { imported: {}, duplicated: {}, invalid: ["ping()"] },
      },
    },
    200,
  ],
  [
    "malformed details",
    {
      ok: true,
      result: { function: { imported: [], duplicated: {}, invalid: [] } },
    },
    200,
  ],
  ["rate limit", { ok: true }, 429],
  ["service error", { ok: false }, 500],
] as const) {
  test(`does not claim success for ${name} or retry`, async () => {
    let calls = 0;
    const mock = (async () => {
      calls++;
      return new Response(JSON.stringify(value), { status });
    }) as typeof fetch;
    await assert.rejects(
      () =>
        registry.submitSignatureImport(
          "ping()",
          "0x5c36b186",
          true,
          withMissingLookup(mock)
        ),
      /not confirmed/
    );
    assert.equal(calls, 1);
  });
}
for (const body of ["not JSON", "x".repeat(65537)]) {
  test(`rejects ${body.length > 100 ? "oversize" : "non-JSON"} response`, async () => {
    await assert.rejects(
      () =>
        registry.submitSignatureImport(
          "ping()",
          "0x5c36b186",
          true,
          withMissingLookup((async () => new Response(body)) as typeof fetch)
        ),
      /not confirmed/
    );
  });
}
test("network failure is uncertain and is never automatically retried", async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      registry.submitSignatureImport(
        "ping()",
        "0x5c36b186",
        true,
        withMissingLookup((async () => {
          calls++;
          throw new Error("private upstream detail");
        }) as typeof fetch)
      ),
    /may have reached Sourcify/
  );
  assert.equal(calls, 1);
});
test("timeout aborts a hung request without a retry", async (t) => {
  const realSetTimeout = globalThis.setTimeout;
  t.mock.method(
    globalThis,
    "setTimeout",
    (callback: () => void, delay: number) => {
      assert.equal(delay, 10000);
      return realSetTimeout(callback, 0);
    }
  );
  let signal: AbortSignal | undefined;
  const promise = registry.submitSignatureImport(
    "ping()",
    "0x5c36b186",
    true,
    withMissingLookup(
      (async (_url, init) =>
        new Promise((_resolve, reject) => {
          signal = init?.signal as AbortSignal;
          signal.addEventListener("abort", () => reject(new Error("aborted")), {
            once: true,
          });
        })) as typeof fetch
    )
  );
  await assert.rejects(() => promise, /not confirmed/);
  assert.equal(signal?.aborted, true);
});
test("uppercase selector hex is accepted without changing the public payload", () => {
  assert.equal(
    registry.previewSignatureImport("transfer(address,uint256)", "0xA9059CBB")
      .selector,
    FunctionFragment.from("transfer(address,uint256)").selector
  );
});

for (const signature of [
  "ping()",
  "nested((address,uint256[])[],bytes32[2])",
]) {
  test(`accepts canonical ${signature}`, () => {
    assert.equal(
      registry.previewSignatureImport(signature, id(signature).slice(0, 10))
        .signature,
      signature
    );
  });
}
for (const signature of [
  "transfer(address,uint)",
  "transfer(address to,uint256 amount)",
  " transfer(address,uint256)",
  "function transfer(address,uint256)",
  "transfer(address,uint256) returns (bool)",
  "foo(bytes33)",
  "foo(uint7)",
  "foo(uint256[0])",
  "transfer(address,uint256);",
  "x".repeat(2049),
]) {
  test(`rejects noncanonical/malformed ${signature.slice(0, 65)}`, () => {
    let selector: string;
    try {
      selector = FunctionFragment.from(signature).selector;
    } catch {
      selector = id(signature).slice(0, 10);
    }
    assert.throws(() => registry.previewSignatureImport(signature, selector));
  });
}
for (const selector of [
  "0xa9059cbc",
  "a9059cbb",
  "0xa9059cbb00",
  "0xzzzzzzzz",
  "0xa9059cb",
  " 0xa9059cbb",
]) {
  test(`rejects mismatch/malformed selector ${selector}`, () => {
    assert.throws(() =>
      registry.previewSignatureImport("transfer(address,uint256)", selector)
    );
  });
}

test("submits only with explicit consent to fixed destination using no credentials or referrer", async () => {
  assert.equal(typeof registry.submitSignatureImport, "function");
  const calls: { url: unknown; init: RequestInit | undefined }[] = [];
  const fetchMock = (async (url, init) => {
    calls.push({ url, init });
    return new Response(
      JSON.stringify({
        ok: true,
        result: {
          function: {
            imported: { "transfer(address,uint256)": "0xa9059cbb" },
            duplicated: {},
            invalid: [],
          },
        },
      })
    );
  }) as typeof fetch;
  await assert.rejects(() =>
    registry.submitSignatureImport(
      "transfer(address,uint256)",
      "0xa9059cbb",
      false,
      withMissingLookup(fetchMock)
    )
  );
  await assert.rejects(() =>
    registry.submitSignatureImport(
      "wrong()",
      "0xa9059cbb",
      true,
      withMissingLookup(fetchMock)
    )
  );
  assert.equal(calls.length, 0);
  assert.equal(
    await registry.submitSignatureImport(
      "transfer(address,uint256)",
      "0xa9059cbb",
      true,
      withMissingLookup(fetchMock)
    ),
    "imported"
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, registry.SIGNATURE_IMPORT_URL);
  assert.equal(calls[0].init?.method, "POST");
  assert.equal(
    calls[0].init?.body,
    '{"function":["transfer(address,uint256)"]}'
  );
  assert.equal(calls[0].init?.credentials, "omit");
  assert.equal(calls[0].init?.referrerPolicy, "no-referrer");
  assert.equal(calls[0].init?.redirect, "error");
  assert.ok(calls[0].init?.signal);
});

test("rejects zero-length fixed arrays even with a matching hash", () => {
  assert.throws(() =>
    registry.previewSignatureImport(
      "foo(uint256[0])",
      id("foo(uint256[0])").slice(0, 10)
    )
  );
});

test("previews a canonical signature only when it matches the exact selector", () => {
  assert.equal(typeof registry.previewSignatureImport, "function");
  assert.deepEqual(
    registry.previewSignatureImport("transfer(address,uint256)", "0xa9059cbb"),
    {
      signature: "transfer(address,uint256)",
      selector: "0xa9059cbb",
      destination:
        "https://api.4byte.sourcify.dev/signature-database/v1/import",
      body: { function: ["transfer(address,uint256)"] },
    }
  );
});

test("skips the import when the exact signature already exists, including filtered matches", async () => {
  const calls: RequestInit[] = [];
  const fetcher = (async (url, init) => {
    calls.push(init!);
    const parsed = new URL(String(url));
    assert.equal(
      parsed.origin + parsed.pathname,
      registry.SIGNATURE_LOOKUP_URL
    );
    assert.equal(parsed.searchParams.get("function"), "0xa9059cbb");
    assert.equal(parsed.searchParams.get("filter"), "false");
    return new Response(
      JSON.stringify({
        ok: true,
        result: {
          function: {
            "0xa9059cbb": [
              { name: "transfer(address,uint256)", filtered: true },
            ],
          },
        },
      })
    );
  }) as typeof fetch;
  assert.equal(
    await registry.submitSignatureImport(
      "transfer(address,uint256)",
      "0xA9059CBB",
      true,
      fetcher
    ),
    "duplicated"
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, "GET");
  assert.equal(calls[0].cache, "no-store");
  assert.equal(calls[0].credentials, "omit");
  assert.equal(calls[0].referrerPolicy, "no-referrer");
  assert.equal(calls[0].redirect, "error");
});

test("a colliding selector with a different signature does not suppress the import", async () => {
  const methods: string[] = [];
  const fetcher = (async (_url, init) => {
    methods.push(init!.method!);
    return new Response(
      JSON.stringify(
        init?.method === "GET"
          ? {
              ok: true,
              result: {
                function: {
                  "0xa9059cbb": [{ name: "many_msg_babbage(bytes1)" }],
                },
              },
            }
          : {
              ok: true,
              result: {
                function: {
                  imported: { "transfer(address,uint256)": "0xa9059cbb" },
                  duplicated: {},
                  invalid: [],
                },
              },
            }
      )
    );
  }) as typeof fetch;
  assert.equal(
    await registry.submitSignatureImport(
      "transfer(address,uint256)",
      "0xa9059cbb",
      true,
      fetcher
    ),
    "imported"
  );
  assert.deepEqual(methods, ["GET", "POST"]);
});

for (const [name, body, status] of [
  [
    "missing selector",
    JSON.stringify({ ok: true, result: { function: {} } }),
    200,
  ],
  [
    "invalid entries",
    JSON.stringify({ ok: true, result: { function: { "0x5c36b186": [{}] } } }),
    200,
  ],
  ["non-JSON", "not JSON", 200],
  ["oversize", "x".repeat(65537), 200],
  ["rate limit", "{}", 429],
] as const) {
  test(`a failed lookup (${name}) never sends an import`, async () => {
    let calls = 0;
    const fetcher = (async (_url, init) => {
      calls++;
      assert.equal(init?.method, "GET");
      return new Response(body, { status });
    }) as typeof fetch;
    await assert.rejects(
      () =>
        registry.submitSignatureImport("ping()", "0x5c36b186", true, fetcher),
      /Could not check Sourcify. Nothing was submitted/
    );
    assert.equal(calls, 1);
  });
}
