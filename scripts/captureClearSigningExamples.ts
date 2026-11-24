// Explicit maintenance capture: pnpm exec vitest run --config vitest/vitest.capture-clear-signing.config.ts
import { it } from "vitest";
import { readFile, writeFile } from "node:fs/promises";
import {
  renderDescriptor,
  type ClearSigningRequest,
  type ClearSigningResult,
} from "../lib/clearSigning/resolve";
import { getBuiltinCalldataDescriptor } from "../lib/clearSigning/builtinDescriptors";
import { verifyDescriptorContext } from "../lib/clearSigning/matchDescriptor";
import {
  runtimeTokenMetadataKey,
  type RenderedField,
  type TokenMetadataHint,
} from "../lib/clearSigning/applyFormat";
import { clearSigningRequestKey } from "../lib/clearSigning/requestKey";
import type { Erc7730Descriptor } from "../lib/clearSigning/types";

it("captures the genuine clear-signing results for both examples", async () => {
  const origin =
    process.env.CLEAR_SIGNING_CAPTURE_ORIGIN || "http://localhost:3210";
  const snapshotPath = "app/calldata/decoder/examples.v1.json";
  const fixtures = JSON.parse(
    await readFile("app/calldata/decoder/__fixtures__/samples.json", "utf8")
  );
  const snapshots = JSON.parse(await readFile(snapshotPath, "utf8"));
  const responses = new Map<string, Promise<any>>();
  async function get(url: string): Promise<any> {
    if (!responses.has(url))
      responses.set(
        url,
        (async () => {
          const response = await fetch(url, {
            signal: AbortSignal.timeout(25_000),
          });
          if (response.status === 404) return null;
          if (!response.ok) throw new Error(`${url}: ${response.status}`);
          return response.json();
        })()
      );
    return responses.get(url);
  }
  async function descriptorFor(
    request: ClearSigningRequest,
    address = request.to!
  ) {
    return get(
      `${origin}/api/clearsigning/descriptor?${new URLSearchParams({ chainId: String(request.chainId), address, kind: "calldata", selector: request.calldata.slice(0, 10) })}`
    ) as Promise<{ descriptor: Erc7730Descriptor; sourcePath: string } | null>;
  }
  async function resolve(
    request: ClearSigningRequest
  ): Promise<ClearSigningResult | null> {
    let remote = await descriptorFor(request);
    if (!remote) {
      // Capture verified proxy provenance from the public explorer; the live
      // renderer continues to use the user's RPC. Never infer deployments.
      const contract = await get(
        `https://eth.blockscout.com/api/v2/smart-contracts/${request.to}`
      );
      const implementation = contract?.implementations?.[0]?.address_hash;
      if (implementation) {
        const candidate = await descriptorFor(request, implementation);
        if (
          candidate &&
          verifyDescriptorContext(
            candidate.descriptor,
            "calldata",
            request.chainId!,
            implementation
          )
        ) {
          remote = structuredClone(candidate);
          remote.descriptor.context!.contract!.deployments!.push({
            chainId: request.chainId!,
            address: request.to!,
          });
        }
      }
    }
    let descriptor = remote?.descriptor;
    let result = descriptor
      ? renderDescriptor(request, descriptor, "registry", remote?.sourcePath)
      : null;
    if (!result) {
      descriptor =
        getBuiltinCalldataDescriptor(
          request.chainId!,
          request.to!,
          request.calldata
        ) ?? undefined;
      result = descriptor
        ? renderDescriptor(request, descriptor, "builtin")
        : null;
    }
    if (!result || !descriptor) return null;
    const metadata: Record<string, TokenMetadataHint> = {};
    async function collect(fields: RenderedField[]) {
      for (const field of fields) {
        for (const value of field.values) {
          if (
            (value.kind === "tokenAmount" || value.kind === "tokenTicker") &&
            value.tokenAddress
          ) {
            const token = await get(
              `https://eth.blockscout.com/api/v2/tokens/${value.tokenAddress}`
            );
            if (token?.symbol && token.decimals !== null)
              metadata[
                runtimeTokenMetadataKey(
                  value.chainId ?? request.chainId!,
                  value.tokenAddress
                )
              ] = { symbol: token.symbol, decimals: Number(token.decimals) };
          }
        }
        for (const group of field.groups ?? []) await collect(group);
      }
    }
    await collect(result.fields);
    return renderDescriptor(
      request,
      descriptor,
      result.source,
      result.sourcePath,
      metadata
    );
  }
  for (const snapshot of snapshots) {
    const fixture = Object.values(fixtures).find(
      (entry: any) => entry.eth_getTransactionByHash?.hash === snapshot.hash
    ) as any;
    const tx = fixture.eth_getTransactionByHash;
    const request: ClearSigningRequest = {
      calldata: tx.input,
      chainId: snapshot.chainId,
      to: tx.to,
      from: tx.from,
      value: BigInt(tx.value).toString(),
    };
    const cache: Record<string, ClearSigningResult | null> = {};
    async function capture(request: ClearSigningRequest, depth = 0) {
      const result = await resolve(request);
      cache[clearSigningRequestKey(request)] = result;
      if (depth === 0 && snapshot.result.functionName !== "mint" && !result)
        throw new Error(`No summary for ${snapshot.hash}`);
      console.log(
        snapshot.result.functionName,
        depth,
        result?.intent ?? "no descriptor"
      );
      if (result && depth < 3) {
        async function walk(fields: RenderedField[]) {
          for (const field of fields) {
            for (const value of field.values) {
              if (value.kind === "calldata")
                await capture(
                  {
                    calldata: value.data,
                    chainId: value.chainId ?? request.chainId,
                    to: value.callee,
                    value: value.amount,
                    from: value.from,
                  },
                  depth + 1
                );
            }
            for (const group of field.groups ?? []) await walk(group);
          }
        }
        await walk(result.fields);
      }
    }
    await capture(request);
    snapshot.clearSigningRequest = request;
    snapshot.clearSigning = cache;
    snapshot.stages.clearSigning = {
      at: new Date().toISOString(),
      status: "captured",
      source:
        "WalletChan ERC-7730 renderer; registry descriptors and public Blockscout proxy/token metadata",
    };
  }
  await writeFile(snapshotPath, JSON.stringify(snapshots, null, 2) + "\n");
}, 180_000);
