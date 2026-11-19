export const TRACE_LIMITS = {
  bytes: 1_000_000,
  frames: 512,
  depth: 32,
  timeoutMs: 12_000,
} as const;
export const TRACE_CHAIN_ID = 1;
export const TRACE_PROVIDER = "dRPC public Ethereum (experimental)";
export const TRACE_ENDPOINT = "https://eth.drpc.org";
export const TRACE_EXAMPLE =
  "0xe5182dd515bf1e872376372ef0c3a0996102e49f6a8195489598931ed9171893";
export type CallType =
  | "CALL"
  | "CALLCODE"
  | "STATICCALL"
  | "DELEGATECALL"
  | "CREATE"
  | "CREATE2"
  | "SELFDESTRUCT";
export interface CallFrame {
  path: string;
  type: CallType;
  from: string;
  to?: string;
  input: string;
  output?: string;
  value?: string;
  gas?: string;
  gasUsed?: string;
  error?: string;
  revertReason?: string;
  children: CallFrame[];
}
export interface TraceResult {
  chainId: number;
  hash: string;
  blockNumber: string;
  blockHash: string;
  status: "success" | "reverted";
  provider: string;
  method: "debug_traceTransaction / callTracer";
  fetchedAt: string;
  root: CallFrame;
}
export type TraceErrorCode =
  | "INVALID_INPUT"
  | "UNSUPPORTED"
  | "UNAVAILABLE"
  | "PRUNED"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "LIMIT"
  | "INVALID_TRACE"
  | "NOT_CONFIRMED"
  | "REORG";
export class TraceError extends Error {
  constructor(
    public code: TraceErrorCode,
    message: string
  ) {
    super(message);
    this.name = "TraceError";
  }
}
export function traceInput(chain: string | null, hash: string | null) {
  if (chain !== "1")
    throw new TraceError(
      "UNSUPPORTED",
      "Only Ethereum mainnet is currently allowlisted for experimental tracing."
    );
  if (!hash || !/^0x[0-9a-fA-F]{64}$/.test(hash))
    throw new TraceError(
      "INVALID_INPUT",
      "Enter a transaction hash: 0x followed by 64 hexadecimal characters."
    );
  return { chainId: TRACE_CHAIN_ID, hash: hash.toLowerCase() };
}
const address = /^0x[0-9a-fA-F]{40}$/;
const bytes = /^0x(?:[0-9a-fA-F]{2})*$/;
const quantity = /^0x[0-9a-fA-F]{1,64}$/;
function invalid(): never {
  throw new TraceError(
    "INVALID_TRACE",
    "Provider returned an incomplete or malformed call trace. No inferred trace is shown."
  );
}
function stringField(
  obj: Record<string, unknown>,
  key: string,
  re?: RegExp,
  required = false
): string | undefined {
  const value = obj[key];
  if (value === undefined && !required) return undefined;
  if (
    typeof value !== "string" ||
    (re && !re.test(value)) ||
    value.length > 262_144
  )
    invalid();
  return value;
}
export function normalizeCallTrace(raw: unknown): CallFrame {
  let count = 0;
  function visit(value: unknown, path: string, depth: number): CallFrame {
    if (++count > TRACE_LIMITS.frames || depth > TRACE_LIMITS.depth)
      throw new TraceError(
        "LIMIT",
        "Trace exceeds the 512-frame / 32-level viewer limit; no partial trace is shown."
      );
    if (!value || typeof value !== "object" || Array.isArray(value)) invalid();
    const obj = value as Record<string, unknown>;
    const type = obj.type as CallType;
    if (
      ![
        "CALL",
        "CALLCODE",
        "STATICCALL",
        "DELEGATECALL",
        "CREATE",
        "CREATE2",
        "SELFDESTRUCT",
      ].includes(type)
    )
      invalid();
    if (obj.calls !== undefined && !Array.isArray(obj.calls)) invalid();
    const error = stringField(obj, "error");
    const input = stringField(obj, "input", bytes, type !== "SELFDESTRUCT");
    const to = stringField(
      obj,
      "to",
      address,
      !["CREATE", "CREATE2"].includes(type)
    );
    // Failed creation may have no target yet. Successful creation must have one.
    if (!to && !error) invalid();
    return {
      path,
      type,
      from: stringField(obj, "from", address, true)!,
      to,
      input: input ?? "0x",
      output: stringField(obj, "output", bytes),
      value: stringField(obj, "value", quantity),
      gas: stringField(obj, "gas", quantity),
      gasUsed: stringField(obj, "gasUsed", quantity),
      error,
      revertReason: stringField(obj, "revertReason"),
      children: ((obj.calls ?? []) as unknown[]).map((child, i) =>
        visit(child, `${path}.${i}`, depth + 1)
      ),
    };
  }
  return visit(raw, "0", 0);
}
