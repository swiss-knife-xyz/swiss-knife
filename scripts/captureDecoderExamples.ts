import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { erc20Abi, decodeFunctionResult, encodeFunctionData, type Hex } from "viem";
import { decoderSamples } from "../app/calldata/decoder/samples";
import { decodeEvents, decodeRecursive } from "../lib/decoder";
import type { Arg } from "../types";

const fixturePath = "app/calldata/decoder/__fixtures__/samples.json";
const nativeFetch = globalThis.fetch;
const sha256 = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");
const rpc = "https://ethereum-rpc.publicnode.com";
const artworkPath = "/decoder-examples/zora-20000.jpg";

async function main() {
  const [origin, output] = process.argv.slice(2);
  assert(origin && output, "Supply the ETH.sh app origin and a scratch output directory");
  const fixtures = JSON.parse(await readFile(fixturePath, "utf8"));
  const content = fixtures["content-and-label-checks"]["mint-20000"];
  const snapshots = [];
  let queue = Promise.resolve();
  let requests = 0;
  const deadline = Date.now() + 120_000;
  const request = (url: URL | string, init?: RequestInit) => {
    const pending = queue.then(async () => {
      const remaining = deadline - Date.now();
      assert(++requests <= 100 && remaining > 0, "Capture request budget exhausted");
      const res = await nativeFetch(url, {
        ...init,
        signal: AbortSignal.timeout(Math.min(5000, remaining)),
      });
      if (Number(res.headers.get("content-length")) > 2_000_000) {
        await res.body?.cancel();
        throw new Error("Response exceeds capture limit");
      }
      const reader = res.body?.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (reader) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 2_000_000) {
          await reader.cancel();
          throw new Error("Response exceeds capture limit");
        }
        chunks.push(value);
      }
      return { status: res.status, bytes: Buffer.concat(chunks) };
    });
    queue = pending.then(() => {}, () => {});
    return pending;
  };

  for (const [index, fixture] of ["mint-20000", "safe-supply"].entries()) {
    const sample = decoderSamples[index];
    const tx = fixtures[fixture].eth_getTransactionByHash;
    const receipt = fixtures[fixture].eth_getTransactionReceipt;
    assert.equal(tx.hash, sample.hash);
    assert.equal(Number(tx.chainId), sample.chainId);
    assert.equal(receipt.transactionHash, sample.hash);
    assert.equal(receipt.status, "0x1");
    const capturedAt = new Date().toISOString();
    const stages: Record<string, { at: string; status: string; source: string; sha256?: string }> = {};
    const record = (key: string, status: string, source: string, body?: string | Buffer) => {
      const at = new Date().toISOString();
      stages[key] = { at, status, source, ...(body ? { sha256: sha256(body) } : {}) };
      console.log(sample.id, at, key, status);
    };
    const memo = new Map<string, Promise<{ status: number; bytes: Buffer }>>();
    const decoderFetch: typeof fetch = async (input) => {
      const url = new URL(String(input), origin);
      const sourceCode = url.pathname === "/api/source-code";
      const allowed = ["api.4byte.sourcify.dev", "www.4byte.directory"];
      assert(sourceCode || allowed.includes(url.hostname), "Unexpected decoder fetch");
      const source = sourceCode ? "ETH.sh verified contract ABI route" : url.hostname;
      const key = sourceCode ? `abi:${url.searchParams.get("address")?.toLowerCase()}` : `${source}:${url.search}`;
      if (sourceCode) {
        const local = new URL(url.pathname + url.search, origin);
        url.href = local.href;
      }
      if (!memo.has(key)) {
        const load = async () => {
          if (!sourceCode) {
            const response = await request(url);
            record(key, response.status === 200 ? "captured" : `HTTP ${response.status}`, source, response.bytes);
            return response;
          }

          try {
            const response = await request(url);
            const { ABI, ContractName, Implementation } = JSON.parse(response.bytes.toString()).result[0];
            assert.equal(response.status, 200);
            assert(ABI?.startsWith("[") && typeof Implementation === "string");
            const bytes = Buffer.from(JSON.stringify({ result: [{ ABI, ContractName, Implementation }] }));
            record(key, "captured", source, bytes);
            return { status: 200, bytes };
          } catch {
            const address = url.searchParams.get("address");
            assert.match(address ?? "", /^0x[a-fA-F0-9]{40}$/);
            const publicUrl = `https://eth.blockscout.com/api/v2/smart-contracts/${address}`;
            const response = await request(publicUrl);
            const contract = JSON.parse(response.bytes.toString());
            assert(response.status === 200 && contract.is_verified && Array.isArray(contract.abi));
            const bytes = Buffer.from(JSON.stringify({ result: [{
              ABI: JSON.stringify(contract.abi),
              ContractName: contract.name,
              Implementation: contract.implementations?.[0]?.address_hash ?? "",
            }] }));
            record(key, "captured", publicUrl, bytes);
            return { status: 200, bytes };
          }
        };
        memo.set(key, load().catch((error) => {
          record(key, "unavailable", sourceCode ? `${source}; Blockscout verified contracts` : source);
          throw error;
        }));
      }
      const { bytes, status } = await memo.get(key)!;
      return new Response(new Uint8Array(bytes), { status });
    };

    globalThis.fetch = decoderFetch;
    const options = { address: tx.to, chainId: sample.chainId };
    let result, events;
    try {
      result = await decodeRecursive({ ...options, calldata: tx.input });
      assert(result);
      events = await decodeEvents({ ...options, logs: receipt.logs });
    } finally {
      globalThis.fetch = nativeFetch;
    }

    const nested: NonNullable<typeof result>[] = [];
    const addresses = new Set<string>();
    function visit(args: Arg[]) {
      for (const arg of args) {
        if (arg.baseType === "address") addresses.add(String(arg.value).toLowerCase());
        if (Array.isArray(arg.value)) visit(arg.value);
        else if (arg.value && typeof arg.value === "object" && "decoded" in arg.value && arg.value.decoded) {
          nested.push(arg.value.decoded);
          visit(arg.value.decoded.args);
        }
      }
    }
    visit(result.args);
    for (const event of events) visit(event.args);
    if (index === 0) {
      assert.equal(result.functionName, "mint");
      assert.deepEqual(result.args.map(({ name }) => name), ["data", "bidShares"]);
      assert(events.some(event => event.eventName === "Transfer" &&
        event.args.some(arg => arg.value === "20000")));
    } else {
      assert.equal(result.functionName, "execTransaction");
      assert.deepEqual(nested.map(call => call.functionName).filter(name => name !== "tx"),
        ["multiSend", "SafeMultiSend transactions", "approve", "supply"]);
      const approve = nested.find(call => call.functionName === "approve");
      const supply = nested.find(call => call.functionName === "supply");
      assert.equal(approve?.rawArgs[1], 2900000000000n);
      assert.equal(supply?.rawArgs[1], approve?.rawArgs[1]);
      assert(events.some(event => event.eventName === "ExecutionSuccess"));
    }
    const payload = JSON.stringify({ result, events }, (_key, value) => {
      return typeof value === "bigint" ? { $bigint: value.toString() } : value;
    });
    record("transaction", "captured", `${fixturePath}#${fixture}.eth_getTransactionByHash`, JSON.stringify(tx));
    record("receipt", "captured", `${fixturePath}#${fixture}.eth_getTransactionReceipt`, JSON.stringify(receipt));
    record("decode", "captured", "lib/decoder.ts decodeRecursive and decodeEvents", payload);

    const addressMetadata: Record<string, { labels: string[] }> = {};
    for (const address of addresses) {
      const key = `address:1:${address}`;
      if (/^0x0{40}$/.test(address)) {
        record(key, "unavailable", "zero address");
        continue;
      }
      let label: string | undefined;
      let source = rpc;
      try {
        const result = await request(rpc, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{
            to: address, data: encodeFunctionData({ abi: erc20Abi, functionName: "symbol" }),
          }, "latest"] }),
        });
        label = decodeFunctionResult({
          abi: erc20Abi, functionName: "symbol", data: JSON.parse(result.bytes.toString()).result as Hex,
        });
      } catch {
        source = "ETH.sh verified contract ABI route";
        try {
          const { fetchContractAbi } = await import("../utils");
          const captureFetch = globalThis.fetch;
          globalThis.fetch = decoderFetch;
          try {
            label = (await fetchContractAbi({ address, chainId: 1 })).name;
            source = stages[`abi:${address}`]?.source ?? source;
          } finally {
            globalThis.fetch = captureFetch;
          }
        } catch {}
      }
      if (label) addressMetadata[`1:${address}`] = { labels: [label] };
      record(key, label ? "captured" : "unavailable", source, label);
    }
    const urls: Record<string, { json?: unknown; image?: string }> = {};
    if (index === 0) {
      for (const type of ["metadata", "artwork"] as const) {
        const entry = content[type];
        try {
          const path = "/ipfs/" + entry.uri.slice("ipfs://".length);
          const gateways = [entry.gatewayUrl, `https://ipfs.io${path}`, `https://dweb.link${path}`];
          let bytes: Buffer | undefined;
          let gateway: string | undefined;
          for (const url of gateways) {
            try {
              const response = await request(url);
              if (response.status === 200 && sha256(response.bytes) === entry.sha256) {
                bytes = response.bytes;
                gateway = url;
                break;
              }
            } catch {}
          }
          if (!bytes && type === "artwork") {
            const localPath = `public${artworkPath}`;
            const local = await readFile(localPath);
            assert.equal(sha256(local), entry.sha256);
            bytes = local;
            gateway = `${localPath} (hash-verified local copy of ${entry.uri})`;
          }
          assert(bytes && gateway, "IPFS content unavailable or hash mismatch");
          if (type === "metadata") urls[entry.uri] = { json: JSON.parse(bytes.toString()) };
          else {
            await writeFile(resolve(output, "zora-20000.jpg"), bytes);
            urls[entry.uri] = { image: artworkPath };
          }
          record(type, "captured", gateway, bytes);
        } catch {
          if (type === "metadata") {
            urls[entry.uri] = { json: entry.data };
            record(type, "captured", `${fixturePath}#content-and-label-checks (previously hash-verified)`, JSON.stringify(entry.data));
          } else record(type, "unavailable", entry.gatewayUrl);
        }
      }
    }
    snapshots.push({ version: 1, chainId: sample.chainId, hash: sample.hash,
      capturedAt, stages, ...JSON.parse(payload), addresses: addressMetadata, urls });
  }

  await writeFile(resolve(output, "examples.v1.json"), JSON.stringify(snapshots, null, 2) + "\n");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack?.split("\n").filter(line => line.includes("captureDecoderExamples.ts")).join("\n") : "Capture error");
  console.error("Capture failed. Check the last reported stage and required decode assertions.");
  process.exitCode = 1;
});
