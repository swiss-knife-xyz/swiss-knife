/** Normalized Geth callTracer data. Quantities stay hex to preserve precision. */
export interface TraceCall {
  id: string;
  type: string;
  from: string;
  to?: string;
  input: string;
  output: string;
  value?: string;
  gas?: string;
  gasUsed?: string;
  error?: string;
  revertReason?: string;
  calls: TraceCall[];
  logs: TraceLog[];
}
export interface TraceLog {
  address: string;
  topics: string[];
  data: string;
  position?: number;
}
export interface TraceDocument {
  version: 1;
  chainId?: number;
  transactionHash?: string;
  call: TraceCall;
}
export const MAX_TRACE_BYTES = 8 * 1024 * 1024;
const TYPES = new Set([
  "CALL",
  "CALLCODE",
  "STATICCALL",
  "DELEGATECALL",
  "CREATE",
  "CREATE2",
  "SELFDESTRUCT",
]);
const ADDRESS = /^0x[\da-f]{40}$/i;
export const HASH = /^0x[\da-f]{64}$/i;

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Expected a callTracer object.");
  return value as Record<string, unknown>;
}
function hex(value: unknown, field: string, quantity = false): string {
  const pattern = quantity ? /^0x[\da-f]+$/i : /^0x(?:[\da-f]{2})*$/i;
  if (
    typeof value !== "string" ||
    value.length > (quantity ? 66 : MAX_TRACE_BYTES) ||
    !pattern.test(value)
  )
    throw new Error(`Invalid ${field} in trace.`);
  return value;
}
function address(value: unknown, field: string): string {
  if (typeof value !== "string" || !ADDRESS.test(value))
    throw new Error(`Invalid ${field} address in trace.`);
  return value;
}

/** Accept raw callTracer, JSON-RPC envelopes and our context-preserving exports. */
export function normalizeTrace(value: unknown): TraceDocument {
  const envelope = object(value);
  if (!envelope.type && envelope.error)
    throw new Error("The JSON-RPC response contains an error, not a trace.");
  const wrapped = envelope.version === 1;
  const root = wrapped ? envelope.call : (envelope.result ?? envelope);
  let count = 0;
  let logCount = 0;
  let bytes = 0;
  function visit(value: unknown, id: string, depth: number): TraceCall {
    if (++count > 5000 || depth > 64)
      throw new Error("Trace exceeds 5,000 calls or 64 levels.");
    const item = object(value);
    const type = typeof item.type === "string" ? item.type.toUpperCase() : "";
    if (!TYPES.has(type))
      throw new Error(
        "Unsupported trace format. Import Geth callTracer output, not opcode structLogs or Parity traces."
      );
    if (item.calls !== undefined && !Array.isArray(item.calls))
      throw new Error("Invalid child calls.");
    if (item.logs !== undefined && !Array.isArray(item.logs))
      throw new Error("Invalid logs.");
    logCount += Array.isArray(item.logs) ? item.logs.length : 0;
    if (logCount > 10000) throw new Error("Trace exceeds 10,000 logs.");
    const input = hex(item.input ?? "0x", "input");
    const output = hex(item.output ?? "0x", "output");
    bytes += input.length + output.length;
    const calls = ((item.calls as unknown[] | undefined) ?? []).map(
      (child, i) => visit(child, `${id}.${i}`, depth + 1)
    );
    const logs = ((item.logs as unknown[] | undefined) ?? []).map(
      (raw): TraceLog => {
        const log = object(raw);
        if (!Array.isArray(log.topics) || log.topics.length > 4)
          throw new Error("Invalid log topics.");
        const topics = log.topics.map((topic) => {
          if (typeof topic !== "string" || !HASH.test(topic))
            throw new Error("Invalid log topic.");
          return topic;
        });
        const data = hex(log.data ?? "0x", "log data");
        bytes += data.length + topics.join("").length;
        // Geth uses a JSON number; Anvil emits the same position as a hex quantity.
        const position =
          typeof log.position === "string" &&
          /^0x[\da-f]{1,16}$/i.test(log.position)
            ? Number(log.position)
            : log.position;
        if (
          position !== undefined &&
          (!Number.isSafeInteger(position) ||
            Number(position) < 0 ||
            Number(position) > calls.length)
        )
          throw new Error("Invalid log position.");
        return {
          address: address(log.address, "log"),
          data,
          topics,
          ...(log.position === undefined ? {} : { position: Number(position) }),
        };
      }
    );
    if (logs.length > 10000 || bytes > MAX_TRACE_BYTES)
      throw new Error("Trace data exceeds the viewer limit.");
    for (const field of ["error", "revertReason"] as const) {
      if (
        item[field] != null &&
        (typeof item[field] !== "string" || item[field].length > 10000)
      )
        throw new Error(`Invalid ${field}.`);
    }
    return {
      id,
      type,
      from: address(item.from, "from"),
      ...(item.to === undefined || item.to === null
        ? {}
        : { to: address(item.to, "to") }),
      input,
      output,
      calls,
      logs,
      ...Object.fromEntries(
        ["gas", "gasUsed", "value"].flatMap((field) =>
          item[field] === undefined
            ? []
            : [[field, hex(item[field], field, true)]]
        )
      ),
      ...(item.error == null ? {} : { error: item.error as string }),
      ...(item.revertReason == null
        ? {}
        : { revertReason: item.revertReason as string }),
    };
  }
  const call = visit(root, "0", 0);
  const chainId = wrapped ? envelope.chainId : undefined;
  if (
    chainId !== undefined &&
    (!Number.isSafeInteger(chainId) || Number(chainId) <= 0)
  )
    throw new Error("Invalid trace chain ID.");
  const transactionHash = wrapped ? envelope.transactionHash : undefined;
  if (
    transactionHash !== undefined &&
    (typeof transactionHash !== "string" || !HASH.test(transactionHash))
  )
    throw new Error("Invalid transaction hash.");
  return {
    version: 1,
    call,
    ...(chainId === undefined ? {} : { chainId: Number(chainId) }),
    ...(transactionHash === undefined
      ? {}
      : { transactionHash: transactionHash as string }),
  };
}

export function parseTraceJson(text: string): TraceDocument {
  if (new TextEncoder().encode(text).length > MAX_TRACE_BYTES)
    throw new Error("Trace JSON must be smaller than 8 MiB.");
  return normalizeTrace(JSON.parse(text));
}

export function flattenCalls(root: TraceCall): TraceCall[] {
  const result: TraceCall[] = [];
  function visit(call: TraceCall) {
    result.push(call);
    call.calls.forEach(visit);
  }
  visit(root);
  return result;
}
