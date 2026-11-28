import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { createRequire } from "node:module";
import https from "node:https";
import axios from "axios";
import { traceExamples } from "../app/trace/examples";
import { createTraceDecoder, traceCodeAddress } from "../lib/tracer/decode";
import { flattenCalls, normalizeTrace } from "../lib/tracer/model";
import { fetchVerifiedBlockscoutAbi, type TraceAbi } from "../lib/tracer/abi";
import { decoderSamples } from "../app/calldata/decoder/samples";
import { getExampleSnapshot } from "../app/calldata/decoder/exampleSnapshots";
import { fetchContractMetadata } from "../lib/contractMetadata";
import type { TraceDecodeEntry } from "../lib/tracer/decodingStore";

// Explicit offline-fixture capture only. This endpoint never becomes a tool RPC.
// Usage: pnpm exec tsx scripts/captureTraceExamples.ts <RPC URL> <scratch cache directory>
const run = promisify(execFile);
async function main() {
  const [rpc, cacheDir] = process.argv.slice(2);
  assert(rpc && cacheDir, "Supply a tracing RPC URL and a scratch cache directory");
  createRequire(require.resolve("next/package.json"))("@next/env").loadEnvConfig(process.cwd(), true);
  await mkdir(cacheDir, { recursive: true });
  let requests = 0;
  async function request(url: string, body?: unknown): Promise<unknown> {
    const key = createHash("sha256").update(url + JSON.stringify(body ?? null)).digest("hex");
    const path = join(cacheDir, `${key}.json`);
    try { return JSON.parse(await readFile(path, "utf8")); } catch {}
    assert(++requests <= 150, "Capture request budget exhausted");
    const args = ["-fsS", "--max-time", "20", "--max-filesize", "10485760", url];
    if (body) args.push("-H", "Content-Type: application/json", "--data", JSON.stringify(body));
    const { stdout } = await run("curl", args, { maxBuffer: 10 * 1024 * 1024 });
    const data = JSON.parse(stdout);
    await writeFile(path, JSON.stringify(data));
    return data;
  }
  const contracts = new Map<string, Promise<TraceAbi | null>>();
  // Optional capture-only DNS recovery; never changes the application's resolver.
  const ip = process.env.CAPTURE_ETHERSCAN_IP;
  assert(!ip || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(ip), "Invalid capture resolver address");
  const agent = ip ? new https.Agent({ autoSelectFamily: false,
    lookup: (_host, _options, callback) => callback(null, ip, 4),
  }) : undefined;
  const contract = (address: string) => {
    const key = address.toLowerCase();
    if (!contracts.has(key)) contracts.set(key, (async () => {
      if (process.env.ETHERSCAN_API_KEY) {
        const response = await fetchContractMetadata({ chainId: 1, address: key, isRoutescan: false },
          (url, options) => axios.get(url, { ...options, httpsAgent: new URL(url).hostname === "api.etherscan.io" ? agent : undefined }));
        const record = response.body.result[0];
        if (response.statusCode === 200 && record) return { abi: JSON.parse(record.ABI), name: record.ContractName, source: "explorer" as const };
      }
      return fetchVerifiedBlockscoutAbi(
        { chainId: 1, address: key },
        async (input) => Response.json(await request(String(input)))
      );
    })());
    return contracts.get(key)!;
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = new URL(String(input), "https://eth.sh");
    if (url.pathname === "/api/source-code") {
      assert.equal(url.searchParams.get("chainId"), "1");
      const data = await contract(url.searchParams.get("address")!);
      return Response.json({ result: data ? [{ ABI: JSON.stringify(data.abi), ContractName: data.name, Implementation: "" }] : [] });
    }
    assert(["api.4byte.sourcify.dev", "www.4byte.directory"].includes(url.hostname), `Unexpected capture request: ${url.hostname}`);
    return Response.json(await request(url.toString()));
  };
  try {
    const snapshots = [];
    for (const example of traceExamples) {
      const rpcRequest = async (method: string, params: unknown[]) => {
        const payload = await request(rpc, { jsonrpc: "2.0", id: 1, method, params }) as { result?: unknown; error?: unknown };
        assert(payload.result && !payload.error, `RPC failed: ${method} for ${example.hash}`);
        return payload.result;
      };
      const raw = await rpcRequest("debug_traceTransaction", [example.hash, { tracer: "callTracer", tracerConfig: { withLog: true }, timeout: "20s" }]);
      const receipt = await rpcRequest("eth_getTransactionReceipt", [example.hash]) as { transactionHash: string; status: string; logs: unknown[]; blockHash: string };
      assert.equal(receipt.transactionHash.toLowerCase(), example.hash);
      const document = { ...normalizeTrace(raw), chainId: 1, transactionHash: example.hash };
      const calls = flattenCalls(document.call);
      assert.equal(calls.reduce((n, call) => n + call.logs.length, 0), receipt.logs.length, "Trace logs must match the receipt");
      assert.equal(!!document.call.error, receipt.status === "0x0");
      const addresses = [...new Set(calls.flatMap((call) => [traceCodeAddress(call), ...call.logs.map((log) => log.address)]).filter((address): address is string => !!address))];
      // Keep capture requests sequential and cache each verified contract across examples.
      for (const address of addresses) await contract(address);
      const decoder = createTraceDecoder(1, {}, { fetchAbi: async ({ address }) => {
        const data = await contract(address);
        if (!data) throw new Error("No verified ABI");
        return data;
      } });
      const entries: Record<string, TraceDecodeEntry> = {};
      for (const call of calls) entries[call.id] = { status: "ready", data: await decoder.decode(call) };
      for (const call of calls) {
        assert(entries[call.id].data?.contractName, `Missing contract name for ${call.id}`);
        assert.equal(Object.keys(entries[call.id].data!.logs).length, call.logs.length, `Unresolved logs in ${call.id}`);
      }
      const abis: Record<string, unknown> = {};
      const labels: Record<string, { labels: readonly string[] }> = {};
      for (const [address, pending] of contracts) {
        const data = await pending;
        if (data) { abis[address] = data.abi; labels[`1:${address}`] = { labels: [data.name] }; }
      }
      const sample = decoderSamples.find((sample) => sample.hash === example.hash);
      const enrichment = sample ? getExampleSnapshot(sample) : undefined;
      // Reuse the decoder examples' fully resolved nested calldata for the same input.
      if (enrichment?.result) for (const call of calls) {
        const data = entries[call.id].data!;
        if (call.input === document.call.input && data.input?.signature === enrichment.result.signature)
          data.input = enrichment.result;
      }
      snapshots.push({
        version: 1, chainId: 1, hash: example.hash, document, entries, abis,
        addresses: { ...enrichment?.addresses, ...labels }, urls: enrichment?.urls ?? {},
        clearSigning: enrichment?.clearSigning,
        capture: {
          at: new Date().toISOString(), source: "debug_traceTransaction(callTracer, withLog)",
          metadataSource: "ETH.sh explorer/Sourcify policy; fully verified Blockscout fallback",
          blockHash: receipt.blockHash, receiptStatus: receipt.status, receiptLogCount: receipt.logs.length,
          traceSha256: createHash("sha256").update(JSON.stringify(raw)).digest("hex"),
        },
      });
      console.log(`${example.title}: ${calls.length} calls, ${receipt.logs.length} logs, all decoded`);
    }
    await writeFile("app/trace/examples.v1.json", JSON.stringify(snapshots, (_key, value) => typeof value === "bigint" ? { $bigint: value.toString() } : value, 2) + "\n");
  } finally { globalThis.fetch = originalFetch; }
}
main().catch((error) => { console.error(String(error.message).replace(/https?:\/\/[^\s]+/g, "[endpoint]")); process.exitCode = 1; });
