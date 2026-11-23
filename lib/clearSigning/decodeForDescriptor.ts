/**
 * Decode calldata using the descriptor's own format key (the human-readable
 * function signature). We don't rely on the broader CalldataDecoder pipeline
 * because:
 *   - the descriptor already tells us the exact signature,
 *   - we want a synchronous, no-network decode at clear-signing time.
 *
 * Output is a normalized object keyed by parameter name, ready for
 * `resolvePath` to walk.
 */

import { decodeFunctionData, parseAbiItem, type AbiParameter } from "viem";

import { MULTISEND_FORMAT_KEY } from "./builtinDescriptors";

export function decodeCalldataForDescriptor(
  formatKey: string,
  calldata: string
): Record<string, unknown> | null {
  if (!calldata?.startsWith("0x")) return null;
  let abiItem: ReturnType<typeof parseAbiItem>;
  try {
    abiItem = parseAbiItem(`function ${formatKey}`);
  } catch (err) {
    return null;
  }
  if (abiItem.type !== "function") return null;

  let decoded: { functionName: string; args?: readonly unknown[] };
  try {
    decoded = decodeFunctionData({
      abi: [abiItem],
      data: calldata as `0x${string}`,
    });
  } catch (err) {
    return null;
  }

  const result = zipInputs(abiItem.inputs, decoded.args || []);

  // MultiSend's `transactions` param is custom packed bytes, NOT standard
  // ABI. Override the raw hex with the unpacked tuple array so the
  // descriptor's `transactions.[].data` path resolves to real inner
  // calldata. See `unpackMultiSendTransactions` for the layout.
  if (
    formatKey === MULTISEND_FORMAT_KEY &&
    typeof result.transactions === "string"
  ) {
    const unpacked = unpackMultiSendTransactions(result.transactions);
    if (unpacked) result.transactions = unpacked;
  }

  return result;
}

/**
 * Unpack a Safe `MultiSend.multiSend(bytes transactions)` payload into a
 * normalized array. The packed layout per inner call (from the contract):
 *   operation : uint8   (1 byte)   — must be 0 for MultiSendCallOnly
 *   to        : address (20 bytes)
 *   value     : uint256 (32 bytes)
 *   dataLen   : uint256 (32 bytes)
 *   data      : bytes   (dataLen bytes)
 * …concatenated until the bytes run out. Returns null on any structural
 * inconsistency so the caller can leave the raw hex in place.
 */
interface MultiSendInnerCall {
  operation: number;
  to: string;
  value: string;
  data: string;
}

function unpackMultiSendTransactions(hex: string): MultiSendInnerCall[] | null {
  if (typeof hex !== "string" || !hex.startsWith("0x")) return null;
  const body = hex.slice(2);
  if (body.length === 0) return [];

  const out: MultiSendInnerCall[] = [];
  let i = 0;
  while (i < body.length) {
    if (i + 2 > body.length) return null;
    const operation = parseInt(body.slice(i, i + 2), 16);
    // The readable inner-call model represents CALL. Delegatecalls keep the
    // ordinary decoder view rather than being mislabeled as direct calls.
    if (operation !== 0) return null;
    i += 2;

    if (i + 40 > body.length) return null;
    const to = `0x${body.slice(i, i + 40).toLowerCase()}`;
    i += 40;

    if (i + 64 > body.length) return null;
    const value = BigInt(`0x${body.slice(i, i + 64)}`).toString();
    i += 64;

    if (i + 64 > body.length) return null;
    const dataLen = Number(BigInt(`0x${body.slice(i, i + 64)}`));
    i += 64;

    const dataHexLen = dataLen * 2;
    if (i + dataHexLen > body.length) return null;
    const data = `0x${body.slice(i, i + dataHexLen)}`;
    i += dataHexLen;

    out.push({ operation, to, value, data });
  }

  return i === body.length ? out : null;
}

function zipInputs(
  inputs: readonly AbiParameter[],
  args: readonly unknown[]
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  inputs.forEach((input, i) => {
    const name = input.name || String(i);
    out[name] = normalize(input, args[i]);
  });
  return out;
}

function normalize(input: AbiParameter, value: unknown): unknown {
  const type = input.type;

  // Tuples — viem returns named tuples as plain objects when the components
  // have names; positional arrays when they don't.
  if (type === "tuple") {
    const components =
      (input as { components?: readonly AbiParameter[] }).components || [];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const obj: Record<string, unknown> = {};
      for (const comp of components) {
        const k = comp.name || "";
        obj[k] = normalize(comp, (value as Record<string, unknown>)[k]);
      }
      return obj;
    }
    if (Array.isArray(value)) {
      const obj: Record<string, unknown> = {};
      components.forEach((comp, i) => {
        obj[comp.name || String(i)] = normalize(comp, (value as unknown[])[i]);
      });
      return obj;
    }
    return value;
  }

  // Arrays (`type[]`, `type[N]`, `tuple[]`, …).
  if (type.endsWith("]") && Array.isArray(value)) {
    const inner = type.replace(/\[[^\]]*\]$/, "");
    const innerInput = {
      ...input,
      type: inner,
    } as AbiParameter;
    return (value as unknown[]).map((v) => normalize(innerInput, v));
  }

  if (typeof value === "bigint") return value.toString();
  return value;
}
