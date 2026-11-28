import { verifyCustomChain, type CustomChain } from "./model";
import { getSavedCustomChain } from "./store";
import { beginCustomRpcRequest, settleCustomRpcRequest } from "./failures";
import {
  checkedResponse,
  parseRpcInput,
  RPC_LIMITS,
  RpcError,
} from "@/lib/rawRpc/model";

/** Custom and loopback endpoints are contacted by the user's browser, never the server proxy. */
export async function readCustomRpc(
  chain: CustomChain,
  request: unknown,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch
) {
  const saved = getSavedCustomChain(chain.id);
  const tracked = saved?.rpcUrl === chain.rpcUrl;
  const version = tracked ? beginCustomRpcRequest() : 0;
  let providerFailure: unknown;
  const checkedFetcher: typeof fetch = async (...args) => {
    const response = await fetcher(...args);
    if (!response.ok)
      providerFailure = { name: "HttpRequestError", status: response.status };
    return response;
  };
  const current = () =>
    tracked && getSavedCustomChain(chain.id)?.rpcUrl === chain.rpcUrl;
  try {
    const result = await readCustomRpcResponse(
      chain,
      request,
      signal,
      checkedFetcher
    );
    if (current()) settleCustomRpcRequest(chain.id, chain.rpcUrl, version);
    return result;
  } catch (error) {
    if (
      current() &&
      (!signal.aborted || signal.reason?.name === "TimeoutError")
    )
      settleCustomRpcRequest(
        chain.id,
        chain.rpcUrl,
        version,
        providerFailure ?? error
      );
    throw error;
  }
}

async function readCustomRpcResponse(
  chain: CustomChain,
  request: unknown,
  signal: AbortSignal,
  fetcher: typeof fetch
) {
  const input = parseRpcInput({ chain: String(chain.id), request }, [
    String(chain.id),
  ]);
  if (
    new TextEncoder().encode(JSON.stringify(input)).length >
    RPC_LIMITS.requestBytes
  )
    throw new RpcError("LIMIT");
  await verifyCustomChain(chain, signal, fetcher);
  const response = await fetcher(chain.rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input.request),
    signal,
    credentials: "omit",
    cache: "no-store",
    referrerPolicy: "no-referrer",
  });
  if (!response.ok || !response.body) throw new RpcError("UNAVAILABLE");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      signal.throwIfAborted();
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > RPC_LIMITS.responseBytes) throw new RpcError("LIMIT");
      chunks.push(value);
    }
    const data = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      data.set(chunk, offset);
      offset += chunk.length;
    }
    const rows = checkedResponse(
      JSON.parse(new TextDecoder().decode(data)),
      input.request
    );
    return Array.isArray(input.request) ? rows : rows[0];
  } finally {
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
