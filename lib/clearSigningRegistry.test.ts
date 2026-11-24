import assert from "node:assert/strict";
import test from "node:test";
import { gzipSync } from "node:zlib";
import { Header } from "tar";
import {
  buildRegistrySnapshot,
  fetchRegistryBytes,
  isRegistryPath,
  readRegistryArchive,
  REGISTRY_MAX_DESCRIPTOR_BYTES,
  REGISTRY_MAX_UNPACKED_BYTES,
  resolveRegistryInclude,
  type RegistryDescriptor,
} from "./clearSigningRegistry";

const address = "0x4D28D900e381eCE4B351302f1Abe588496793A2b";
const deployment = { chainId: 8453, address };
const descriptor: RegistryDescriptor = {
  context: { contract: { deployments: [deployment] } },
  display: { formats: { "supply(uint256 assets)": { intent: "Supply" } } },
};

function archiveFor(files: Record<string, unknown>): Buffer {
  const buffers: Buffer[] = [];
  for (const [file, value] of Object.entries(files)) {
    const data = Buffer.from(
      typeof value === "string" ? value : JSON.stringify(value)
    );
    const header = Buffer.alloc(512);
    new Header({
      path: `repo-master/${file}`,
      size: data.length,
      type: "File",
    }).encode(header);
    buffers.push(header, data, Buffer.alloc((512 - (data.length % 512)) % 512));
  }
  return gzipSync(
    Uint8Array.from(
      Buffer.concat(
        [...buffers, Buffer.alloc(1024)].map((chunk) => Uint8Array.from(chunk))
      )
    )
  );
}

test("builds a new contract index from archive descriptors, ignoring stale root indexes and tests", async () => {
  const files = await readRegistryArchive(
    archiveFor({
      "index.calldata.json": {},
      "registry/morpho/calldata-BlueBundlesV1.json": descriptor,
      "registry/morpho/testsv2/calldata-BlueBundlesV1.tests.json":
        "not descriptor JSON",
      "registry/morpho/tests/invalid.json": "not JSON",
    })
  );
  const snapshot = buildRegistrySnapshot(files);
  assert.deepEqual(snapshot.entries["8453"][address.toLowerCase()], {
    calldata: ["registry/morpho/calldata-BlueBundlesV1.json"],
  });
  assert.equal(files.size, 1);
});

test("inherits ERC templates and retains multiple candidates and both descriptor kinds", async () => {
  const snapshot = buildRegistrySnapshot(
    await readRegistryArchive(
      archiveFor({
        "ercs/calldata-template.json": { display: descriptor.display },
        "registry/protocol/common.json": {
          includes: "../../ercs/calldata-template.json",
        },
        "registry/protocol/calldata-a.json": {
          includes: "./common.json",
          context: descriptor.context,
        },
        "registry/protocol/calldata-b.json": descriptor,
        "registry/protocol/eip712.json": {
          context: { eip712: { deployments: [deployment] } },
          display: { formats: { "Permit(address owner)": {} } },
        },
      })
    )
  );
  assert.deepEqual(snapshot.entries["8453"][address.toLowerCase()], {
    calldata: [
      "registry/protocol/calldata-a.json",
      "registry/protocol/calldata-b.json",
    ],
    eip712: ["registry/protocol/eip712.json"],
  });
});

test("a failed include rejects the whole refresh instead of publishing an incomplete index", () => {
  const files = new Map([
    ["registry/valid.json", descriptor],
    ["registry/broken.json", { includes: "./missing.json" }],
  ]);
  assert.throws(() => buildRegistrySnapshot(files), /Missing registry include/);
  files.set("registry/broken.json", { includes: "./broken.json" });
  assert.throws(() => buildRegistrySnapshot(files), /cycle/);
});

test("rejects malformed deployment metadata and keeps calldata and typed-data deployments separate", () => {
  const files = new Map<string, RegistryDescriptor>([
    [
      "registry/example.json",
      {
        context: {
          contract: { deployments: [deployment] },
          eip712: { deployments: [{ ...deployment, chainId: 1 }] },
        },
        display: descriptor.display,
      },
    ],
  ]);
  const snapshot = buildRegistrySnapshot(files);
  assert.deepEqual(
    Object.keys(snapshot.entries["8453"][address.toLowerCase()]),
    ["calldata"]
  );
  assert.deepEqual(Object.keys(snapshot.entries["1"][address.toLowerCase()]), [
    "eip712",
  ]);
  for (const invalid of ["8453", 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    files.set("registry/example.json", {
      context: {
        contract: { deployments: [{ ...deployment, chainId: invalid }] },
      },
      display: descriptor.display,
    });
    assert.throws(
      () => buildRegistrySnapshot(files),
      /Invalid registry deployment/
    );
  }
});

test("rejects empty, malformed, oversized and truncated archives", async () => {
  await assert.rejects(
    readRegistryArchive(archiveFor({ "README.md": "nothing" })),
    /no descriptors/
  );
  await assert.rejects(
    readRegistryArchive(archiveFor({ "registry/bad.json": "{" }))
  );
  await assert.rejects(
    readRegistryArchive(archiveFor({ "registry/bad.json": { context: [] } })),
    /Invalid registry descriptor/
  );
  await assert.rejects(
    readRegistryArchive(
      archiveFor({
        "registry/big.json": "x".repeat(REGISTRY_MAX_DESCRIPTOR_BYTES + 1),
      })
    ),
    /oversized/
  );
  await assert.rejects(
    readRegistryArchive(
      gzipSync(new Uint8Array(REGISTRY_MAX_UNPACKED_BYTES + 1))
    )
  );
  await assert.rejects(
    readRegistryArchive(
      archiveFor({ "registry/valid.json": descriptor }).subarray(0, 80)
    )
  );
});

test("restricts include paths to registry and ERC JSON files", () => {
  assert.equal(
    resolveRegistryInclude(
      "registry/morpho/vault.json",
      "../../ercs/vault.json"
    ),
    "ercs/vault.json"
  );
  assert.equal(
    isRegistryPath("registry/morpho/calldata-mev_capital-USUALUSDC+.json"),
    true
  );
  for (const relative of [
    "../../../secret.json",
    "https://evil.example/x.json",
    "/registry/x.json",
    "../tests/x.json",
  ]) {
    assert.throws(() =>
      resolveRegistryInclude("registry/morpho/vault.json", relative)
    );
  }
  for (const path of [
    "registry/../bad.json",
    "registry/./bad.json",
    "registry/x.json?x",
    "registry/x.json#x",
  ]) {
    assert.equal(isRegistryPath(path), false);
  }
});

test("stream byte bounds cancel upstream reads, and failed HTTP responses reject", async () => {
  const original = globalThis.fetch;
  let cancelled = false;
  try {
    globalThis.fetch = async (_url, options) => {
      assert.equal(options?.redirect, "error");
      assert.equal(options?.credentials, "omit");
      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array(17));
          },
          cancel() {
            cancelled = true;
          },
        })
      );
    };
    await assert.rejects(
      fetchRegistryBytes("https://example.test", 16),
      /byte limit/
    );
    assert.equal(cancelled, true);
    globalThis.fetch = async () => new Response("unavailable", { status: 503 });
    await assert.rejects(fetchRegistryBytes("https://example.test", 16), /503/);
  } finally {
    globalThis.fetch = original;
  }
});

test("deadline includes stalled response body reads", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (_url, options) =>
      new Response(
        new ReadableStream({
          start(controller) {
            options?.signal?.addEventListener("abort", () =>
              controller.error(new Error("aborted"))
            );
          },
        })
      );
    await assert.rejects(
      fetchRegistryBytes("https://example.test", 16, 10),
      /aborted/
    );
  } finally {
    globalThis.fetch = original;
  }
});
