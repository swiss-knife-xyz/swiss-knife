import { FunctionFragment, Interface, type JsonFragment } from "ethers";
import type { InferredFunctionInfo } from "./inferredContract";

export type FormCall = { signature: string; args: unknown[] };
export type CallReview = {
  data: string;
  value: string;
  abiMode: "contract" | "implementation";
  signature: string;
};

export function parseContractCallFragment(hash: string): CallReview | null {
  if (hash.length > 100000) throw new Error("Shared call link is too large.");
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  if (!params.has("call")) return null;
  const fields = ["call", "data", "value", "abi", "function"];
  if (
    [...params.keys()].some((key) => !fields.includes(key)) ||
    fields.some((key) => params.getAll(key).length !== 1) ||
    params.get("call") !== "1"
  ) {
    throw new Error("Invalid or unsupported shared call link.");
  }
  const data = params.get("data")!;
  validateCallData(data);
  const value = params.get("value")!;
  const abiMode = params.get("abi");
  const signature = params.get("function")!;
  if (
    !/^(0|[1-9][0-9]{0,77})$/.test(value) ||
    BigInt(value) >= 2n ** 256n ||
    (abiMode !== "contract" && abiMode !== "implementation") ||
    !signature ||
    signature.length > 2048
  ) {
    throw new Error("Invalid shared value, ABI context or function signature.");
  }
  return { data, value, abiMode, signature };
}

export function createContractCallLink(
  baseUrl: string,
  chainId: number,
  address: string,
  review: CallReview
): string {
  if (
    !Number.isSafeInteger(chainId) ||
    chainId <= 0 ||
    !/^0x[a-fA-F0-9]{40}$/.test(address)
  )
    throw new Error("Invalid contract route.");
  const url = new URL(baseUrl);
  url.pathname = `${url.pathname.replace(/\/$/, "")}/${chainId}/${address}`;
  url.search = "";
  url.hash = new URLSearchParams({
    call: "1",
    data: review.data,
    value: review.value,
    abi: review.abiMode,
    function: review.signature,
  }).toString();
  parseContractCallFragment(url.hash);
  return url.toString();
}
export const MAX_CALLDATA_BYTES = 16384;

export function contractFunctionSignature(func: JsonFragment): string {
  return FunctionFragment.from(func).format("sighash");
}

// Use positional arrays throughout: duplicate/unnamed tuple fields remain exact.
function formValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(formValue);
  return typeof value === "bigint" || typeof value === "boolean"
    ? String(value)
    : value;
}

export function validateCallData(data: string): void {
  if (
    !/^0x(?:[a-fA-F0-9]{2}){4,}$/.test(data) ||
    data.length > 2 + MAX_CALLDATA_BYTES * 2
  ) {
    throw new Error(
      `Enter 0x-prefixed, even-length calldata with a selector (maximum ${MAX_CALLDATA_BYTES} bytes).`
    );
  }
}

export function decodeContractCall(
  abi: readonly JsonFragment[],
  data: string
): FormCall {
  validateCallData(data);
  const matches = new Map<string, FormCall>();
  for (const func of abi) {
    // Inferred names/types cannot establish the contract's real signature.
    if (
      func.type !== "function" ||
      (func as InferredFunctionInfo).inputInference
    )
      continue;
    try {
      const signature = contractFunctionSignature(func);
      const iface = new Interface([func]);
      if (
        iface.getFunction(signature)?.selector.toLowerCase() !==
        data.slice(0, 10).toLowerCase()
      )
        continue;
      const args = iface.decodeFunctionData(signature, data);
      // Reject truncation, trailing bytes, noncanonical offsets/padding/booleans.
      if (
        iface.encodeFunctionData(signature, args).toLowerCase() !==
        data.toLowerCase()
      )
        continue;
      matches.set(signature, { signature, args: args.map(formValue) });
    } catch {
      /* A selector alone does not prove decodable arguments. */
    }
  }
  if (matches.size > 1)
    throw new Error(
      "Ambiguous calldata: multiple functions in the loaded ABI match. Nothing prefilled."
    );
  if (matches.size === 0)
    throw new Error(
      "Unknown selector or invalid arguments for the loaded ABI. Nothing prefilled; inferred signatures are not trusted for decoding."
    );
  return [...matches.values()][0];
}
