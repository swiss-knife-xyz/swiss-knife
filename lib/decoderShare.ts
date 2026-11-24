import { ErrorFragment, Fragment, FunctionFragment, Interface, type InterfaceAbi } from "ethers";
import type { DecodeRecursiveResult } from "@/types";

const MAX_FRAGMENT_LENGTH = 100_000;
const MAX_FUNCTIONS = 64;

export function parseDecoderShareFragment(hash: string): string[] | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  if (!params.has("decode")) return null;
  if (
    hash.length > MAX_FRAGMENT_LENGTH ||
    params.get("decode") !== "1" ||
    params.getAll("decode").length !== 1 ||
    params.getAll("functions").length !== 1 ||
    [...params.keys()].some((key) => key !== "decode" && key !== "functions")
  ) {
    throw new Error("Invalid or unsupported shared decode link.");
  }
  const functions: unknown = JSON.parse(params.get("functions")!);
  if (
    !Array.isArray(functions) ||
    functions.length === 0 ||
    functions.length > MAX_FUNCTIONS ||
    functions.some((value) => typeof value !== "string" || value.length > 4096)
  ) {
    throw new Error("Invalid shared function definitions.");
  }
  // Parse each entry directly: Interface silently ignores invalid ABI entries.
  for (const definition of functions) {
    const fragment = Fragment.from(definition);
    if (fragment.type !== "function" && fragment.type !== "error") throw new Error("Expected function or error definition.");
  }
  return functions;
}

export function createDecoderShareLink(
  baseUrl: string,
  calldata: string,
  result: DecodeRecursiveResult,
  abi?: InterfaceAbi
): string | null {
  if (!result || result.decoding === "heuristic") return null;
  const source = abi ? new Interface(abi) : null;
  const definitions = new Map<string, string>();
  const add = (decoded: NonNullable<DecodeRecursiveResult>) => {
    if (decoded.decoding === "heuristic") return;
    try {
      if (decoded.kind === "revert") {
        const error = source?.getError(decoded.signature) ?? ErrorFragment.from(`error ${decoded.signature}`);
        definitions.set(`error:${error.format("sighash")}`, error.format("full"));
        return;
      }
      const fragment =
        source?.getFunction(decoded.signature) ??
        FunctionFragment.from(`function ${decoded.signature}`);
      // Only the inputs are required; omit return types and unrelated ABI entries.
      const minimal = FunctionFragment.from({
        type: "function",
        name: fragment.name,
        inputs: fragment.inputs,
        stateMutability: "nonpayable",
      });
      definitions.set(minimal.format("sighash"), minimal.format("full"));
    } catch {
      /* Synthetic decodes (e.g. abi.encode) need no function definition. */
    }
  };
  const visit = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    const node = value as Record<string, unknown>;
    if (typeof node.signature === "string" && Array.isArray(node.args)) {
      add(node as NonNullable<DecodeRecursiveResult>);
      visit(node.args);
    } else if ("decoded" in node) visit(node.decoded);
    else if ("value" in node) visit(node.value);
  };
  visit(result);
  const functions = [...definitions.values()];
  const sharedAbi = new Interface(functions);
  const top = result.kind === "revert" ? sharedAbi.getError(result.signature) : sharedAbi.getFunction(result.signature);
  if (
    !top ||
    top.selector.toLowerCase() !== calldata.slice(0, 10).toLowerCase()
  )
    return null;
  const url = new URL(baseUrl);
  url.search = new URLSearchParams({ calldata, ...(result.kind === "revert" ? { mode: "revert" } : {}) }).toString();
  url.hash = new URLSearchParams({
    decode: "1",
    functions: JSON.stringify(functions),
  }).toString();
  parseDecoderShareFragment(url.hash);
  return url.toString();
}

/** Encoded-result navigation shared by decoder and transaction previews. */
export function createDecoderResultLink(
  baseUrl: string,
  calldata: string,
  result: DecodeRecursiveResult,
  abi?: InterfaceAbi,
  context?: { address?: string; chainId?: number }
): string {
  const url = new URL(baseUrl);
  url.search = "";
  url.hash = "";
  if (context?.address) {
    url.searchParams.set("calldata", calldata);
    url.searchParams.set("address", context.address);
    if (context.chainId !== undefined) url.searchParams.set("chainId", String(context.chainId));
    return url.toString();
  }
  try {
    const shared = createDecoderShareLink(url.toString(), calldata, result, abi);
    if (shared) return shared;
  } catch { /* Oversized or synthetic results can still open as raw calldata. */ }
  url.searchParams.set("calldata", calldata);
  return url.toString();
}
