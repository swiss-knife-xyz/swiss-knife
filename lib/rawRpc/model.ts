import { RPC_CHAINS } from "./chains";
export { RPC_CHAINS } from "./chains";
export const RPC_LIMITS = {
  requestBytes: 32_768,
  responseBytes: 524_288,
  batch: 10,
  timeoutMs: 12_000,
} as const;
export const RPC_METHODS = [
  "eth_chainId",
  "eth_blockNumber",
  "eth_gasPrice",
  "eth_maxPriorityFeePerGas",
  "eth_getBalance",
  "eth_getTransactionCount",
  "eth_getCode",
  "eth_getStorageAt",
  "eth_getBlockByNumber",
  "eth_getBlockByHash",
  "eth_getTransactionByHash",
  "eth_getTransactionReceipt",
  "eth_getBlockTransactionCountByNumber",
  "eth_getBlockTransactionCountByHash",
  "eth_call",
] as const;
export type RpcId = string | number;
export type RpcRequest = {
  jsonrpc: "2.0";
  id: RpcId;
  method: string;
  params: unknown[];
};
export type RpcInput = { chain: string; request: RpcRequest | RpcRequest[] };
export const RPC_MESSAGES = {
  INVALID:
    "Invalid request. Use JSON-RPC 2.0, unique string/integer IDs, positional params and an allowed read method. The whole batch was rejected; nothing was queried.",
  PARAMS:
    "Invalid read parameters. Check the method reference, exact parameter count, hex addresses/quantities and eth_call limits. Nothing was queried.",
  LIMIT:
    "Request or response exceeds the console limit. Narrow the query or batch; no partial result is shown.",
  ORIGIN: "Use this console from the same site with application/json.",
  BUSY: "Public RPC console is busy or rate limited. Wait a minute before retrying.",
  UNAVAILABLE:
    "Public RPC is unavailable, returned invalid data or the wrong chain. Try again later; no automatic retries.",
  TIMEOUT: "RPC request timed out. No automatic retry was made.",
} as const;
export class RpcError extends Error {
  constructor(public readonly code: keyof typeof RPC_MESSAGES) {
    super(RPC_MESSAGES[code]);
  }
}
export function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function keys(value: Record<string, unknown>, allowed: string[]) {
  return Object.keys(value).every((k) => allowed.includes(k));
}
const address = (v: unknown) =>
  typeof v === "string" && /^0x[0-9a-fA-F]{40}$/.test(v);
const hash = (v: unknown) =>
  typeof v === "string" && /^0x[0-9a-fA-F]{64}$/.test(v);
const quantity = (v: unknown): v is string =>
  typeof v === "string" && /^0x(?:0|[1-9a-fA-F][0-9a-fA-F]{0,63})$/.test(v);
const block = (v: unknown) =>
  quantity(v) ||
  ["latest", "earliest", "pending", "safe", "finalized"].includes(v as string);
const data = (v: unknown) =>
  typeof v === "string" &&
  v.length <= 16_386 &&
  /^0x(?:[0-9a-fA-F]{2})*$/.test(v);
function validParams(method: string, p: unknown[]) {
  switch (method) {
    case "eth_chainId":
    case "eth_blockNumber":
    case "eth_gasPrice":
    case "eth_maxPriorityFeePerGas":
      return p.length === 0;
    case "eth_getBalance":
    case "eth_getTransactionCount":
    case "eth_getCode":
      return p.length === 2 && address(p[0]) && block(p[1]);
    case "eth_getStorageAt":
      return p.length === 3 && address(p[0]) && quantity(p[1]) && block(p[2]);
    case "eth_getBlockByNumber":
      return p.length === 2 && block(p[0]) && typeof p[1] === "boolean";
    case "eth_getBlockByHash":
      return p.length === 2 && hash(p[0]) && typeof p[1] === "boolean";
    case "eth_getTransactionByHash":
    case "eth_getTransactionReceipt":
    case "eth_getBlockTransactionCountByHash":
      return p.length === 1 && hash(p[0]);
    case "eth_getBlockTransactionCountByNumber":
      return p.length === 1 && block(p[0]);
    case "eth_call": {
      const call = p[0];
      return (
        p.length === 2 &&
        record(call) &&
        address(call.to) &&
        block(p[1]) &&
        keys(call, ["to", "from", "data", "gas", "value"]) &&
        (call.from === undefined || address(call.from)) &&
        (call.data === undefined || data(call.data)) &&
        (call.gas === undefined ||
          (quantity(call.gas) &&
            BigInt(call.gas) > 0n &&
            BigInt(call.gas) <= 2_000_000n)) &&
        (call.value === undefined || quantity(call.value))
      );
    }
    default:
      return false;
  }
}
/** Server callers use the fixed catalog. Only direct browser reads pass saved custom IDs. */
export function parseRpcInput(value: unknown, allowedChains: readonly string[] = RPC_CHAINS.map(chain => chain.id)): RpcInput {
  if (
    !record(value) ||
    !keys(value, ["chain", "request"]) ||
    !allowedChains.includes(value.chain as string)
  )
    throw new RpcError("INVALID");
  const requests = Array.isArray(value.request)
    ? value.request
    : [value.request];
  if (!requests.length || requests.length > RPC_LIMITS.batch)
    throw new RpcError("INVALID");
  const ids = new Set<RpcId>();
  for (const r of requests) {
    if (
      !record(r) ||
      !keys(r, ["jsonrpc", "id", "method", "params"]) ||
      r.jsonrpc !== "2.0" ||
      !(typeof r.id === "string"
        ? r.id.length > 0 && r.id.length <= 64
        : Number.isSafeInteger(r.id)) ||
      ids.has(r.id as RpcId) ||
      !RPC_METHODS.includes(r.method as (typeof RPC_METHODS)[number]) ||
      !Array.isArray(r.params)
    )
      throw new RpcError("INVALID");
    ids.add(r.id as RpcId);
    if (!validParams(r.method as string, r.params))
      throw new RpcError("PARAMS");
  }
  // A fresh JSON value prevents prototype/accessor/alias mutation at the transport boundary.
  return JSON.parse(JSON.stringify(value)) as RpcInput;
}
export const RPC_EXAMPLES = {
  "Chain ID": { jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] },
  "Latest block": {
    jsonrpc: "2.0",
    id: 1,
    method: "eth_getBlockByNumber",
    params: ["latest", false],
  },
  Balance: {
    jsonrpc: "2.0",
    id: 1,
    method: "eth_getBalance",
    params: ["0x0000000000000000000000000000000000000000", "latest"],
  },
  "Read call": {
    jsonrpc: "2.0",
    id: 1,
    method: "eth_call",
    params: [
      {
        to: "0x0000000000000000000000000000000000000000",
        data: "0x",
        gas: "0x186a0",
      },
      "latest",
    ],
  },
  Batch: [
    { jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] },
    { jsonrpc: "2.0", id: 2, method: "eth_blockNumber", params: [] },
  ],
};

export function checkedResponse(raw: unknown, request: RpcRequest | RpcRequest[]) {
  const batch = Array.isArray(request);
  const requests = batch ? request : [request];
  if (batch !== Array.isArray(raw)) throw new RpcError("UNAVAILABLE");
  const rows = Array.isArray(raw) ? raw : [raw];
  if (rows.length !== requests.length) throw new RpcError("UNAVAILABLE");
  const remaining = new Set(requests.map((r) => r.id));
  return rows.map((row) => {
    if (
      !record(row) ||
      row.jsonrpc !== "2.0" ||
      !remaining.delete(row.id as string | number) ||
      Object.hasOwn(row, "result") === Object.hasOwn(row, "error")
    )
      throw new RpcError("UNAVAILABLE");
    if (Object.hasOwn(row, "result"))
      return { jsonrpc: "2.0", id: row.id, result: row.result };
    if (!record(row.error) || !Number.isSafeInteger(row.error.code))
      throw new RpcError("UNAVAILABLE");
    // Provider diagnostic text/data can contain infrastructure details. Only the code crosses the boundary.
    return {
      jsonrpc: "2.0",
      id: row.id,
      error: {
        code: row.error.code,
        message:
          "Provider rejected this read query. Check parameters, historical state and method availability.",
      },
    };
  });
}
