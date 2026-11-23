// @vitest-environment node
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { expect, it, vi } from "vitest";
const source = readFileSync(
  new URL("../../../public/worker/solc.worker.js", import.meta.url),
  "utf8"
);
async function load(cacheFails = false) {
  let listener: (event: { data: unknown }) => void;
  let finish!: (value: unknown) => void;
  const loaded = new Promise((resolve) => {
    finish = resolve;
  });
  const compile = vi.fn(() => JSON.stringify({ contracts: {} }));
  const scripts = vi.fn();
  const post = vi.fn((message) => finish(message));
  const put = vi.fn();
  const context = {
    URL: class extends URL {
      static createObjectURL = () => "blob:compiler";
      static revokeObjectURL = vi.fn();
    },
    Blob,
    self: {
      location: {
        href: "http://localhost/worker/solc.worker.js?version=soljson-v0.8.29%2Bcommit.ab55807c.js",
      },
      postMessage: post,
      addEventListener: (_name: string, fn: typeof listener) => {
        listener = fn;
      },
    },
    caches: {
      open: async () => {
        if (cacheFails) throw Error("No cache");
        return { match: async () => null, put, keys: async () => [] };
      },
    },
    fetch: vi.fn(async () => {
      if (cacheFails) throw Error("No fetch");
      return { ok: true, clone: () => ({}), text: async () => "compiler" };
    }),
    importScripts: scripts,
    Module: { cwrap: () => compile },
  };
  vm.runInNewContext(source, context);
  expect(await loaded).toEqual({ type: "ready" });
  return {
    context,
    compile,
    scripts,
    post,
    put,
    send: (data: unknown) => listener({ data }),
  };
}
it("loads the chosen version, caches its binary, and compiles the exact Standard JSON input", async () => {
  const { context, compile, send, post, put } = await load();
  expect(context.fetch).toHaveBeenCalledWith(
    "https://binaries.soliditylang.org/bin/soljson-v0.8.29+commit.ab55807c.js"
  );
  expect(put).toHaveBeenCalledOnce();
  const input = {
    language: "Solidity",
    sources: { "A.sol": { content: "contract A{}" } },
    settings: {
      optimizer: { enabled: true, runs: 1000 },
      viaIR: true,
      evmVersion: "paris",
    },
  };
  send({ id: 7, input });
  expect(compile).toHaveBeenCalledWith(JSON.stringify(input), 0);
  expect(post).toHaveBeenLastCalledWith({
    id: 7,
    success: true,
    output: { contracts: {} },
  });
});
it("keeps compiling through classic script loading if optional caching/fetch fails", async () => {
  const { scripts } = await load(true);
  expect(scripts).toHaveBeenCalledWith(
    "https://binaries.soliditylang.org/bin/soljson-v0.8.29+commit.ab55807c.js"
  );
});
