import { FunctionFragment, Interface, type JsonFragment, type JsonFragmentType } from "ethers";
import type { InferredFunctionInfo } from "./inferredContract";

export type FormCall = { signature: string; args: unknown[] };
export type CallReview = {
  data: string;
  value: string;
  abiMode: "contract" | "implementation";
  signature: string;
};

export type SharedFunctionForm = Omit<CallReview, "data"> & { args: unknown[] };

export function parseContractCallFragment(hash: string): CallReview | SharedFunctionForm | null {
  if (hash.length > 100000) throw new Error("Shared call link is too large.");
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  if (!params.has("call")) return null;
  const isForm = params.get("call") === "2";
  const fields = ["call", isForm ? "args" : "data", "value", "abi", "function"];
  if (
    [...params.keys()].some((key) => !fields.includes(key)) ||
    fields.some((key) => params.getAll(key).length !== 1) ||
    (!isForm && params.get("call") !== "1")
  ) {
    throw new Error("Invalid or unsupported shared call link.");
  }
  const data = params.get("data")!;
  let args: unknown[] | undefined;
  if (isForm) {
    args = JSON.parse(params.get("args")!);
    if (!Array.isArray(args) || !validFormValue(args))
      throw new Error("Invalid shared function parameters.");
  } else validateCallData(data);
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
  return args ? { args, value, abiMode, signature } : { data, value, abiMode, signature };
}

export function createContractCallLink(
  baseUrl: string,
  chainId: number,
  address: string,
  review: CallReview | SharedFunctionForm
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
    ...("args" in review
      ? { call: "2", args: JSON.stringify(review.args) }
      : { call: "1", data: review.data }),
    value: review.value,
    abi: review.abiMode,
    function: review.signature,
  }).toString();
  parseContractCallFragment(url.hash);
  return url.toString();
}
// Form links preserve unfinished inputs without trying to ABI-encode them.
function validFormValue(value: unknown, depth = 0): boolean {
  if (depth > 32) return false;
  return value === null || typeof value === "string" || typeof value === "boolean" ||
    (typeof value === "number" && Number.isSafeInteger(value)) ||
    (Array.isArray(value) && value.every(item => validFormValue(item, depth + 1)));
}

export function restoreSharedFunctionForm(
  abi: readonly JsonFragment[],
  shared: SharedFunctionForm
): FormCall {
  const matches = abi.filter(func => {
    try { return func.type === "function" && contractFunctionSignature(func) === shared.signature; }
    catch { return false; }
  });
  if (matches.length !== 1 || shared.args.length !== (matches[0].inputs?.length ?? 0) ||
    !shared.args.every((value, i) => matchesFormShape(value, matches[0].inputs![i])))
    throw new Error("Shared function parameters do not match the loaded ABI.");
  return { signature: shared.signature, args: shared.args };
}

function matchesFormShape(value: unknown, input: JsonFragmentType): boolean {
  if (value === null || value === "") return true;
  const array = input.type?.match(/^(.*)\[\d*\]$/);
  if (array)
    return Array.isArray(value) && value.every(item => matchesFormShape(item, { ...input, type: array[1] }));
  if (input.type === "tuple")
    return Array.isArray(value) && value.length === input.components?.length &&
      value.every((item, i) => matchesFormShape(item, input.components![i]));
  return !Array.isArray(value);
}

export const MAX_CALLDATA_BYTES = 16384;

function callDefinition(func: JsonFragment) {
  const inferred = func as JsonFragment & InferredFunctionInfo;
  if (inferred.inputInference?.source === "unknown") {
    throw new Error("Input types are unavailable for this function.");
  }
  const fragment = FunctionFragment.from({
    ...func,
    name: func.name?.startsWith("selector: ") ? "inferred" : func.name,
  });
  const selector = (
    inferred.inputInference && inferred.selector
      ? inferred.selector
      : fragment.selector
  ).toLowerCase();
  if (!/^0x[0-9a-f]{8}$/.test(selector))
    throw new Error("Invalid function selector.");
  const canonical = fragment.format("sighash");
  // Nameless inferred functions keep their on-chain selector as their identity.
  // Two functions with identical input types must not prefill each other.
  const signature =
    selector === fragment.selector
      ? canonical
      : `${selector}${canonical.slice(canonical.indexOf("("))}`;
  return { fragment, selector, signature };
}

export function contractFunctionSignature(func: JsonFragment): string {
  return callDefinition(func).signature;
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
    if (func.type !== "function") continue;
    try {
      const { fragment, selector, signature } = callDefinition(func);
      if (selector !== data.slice(0, 10).toLowerCase()) continue;
      const iface = new Interface([fragment]);
      // A nameless function uses a temporary ABI name only for argument parsing.
      const args = iface.decodeFunctionData(
        fragment,
        `${fragment.selector}${data.slice(10)}`
      );
      const encoded = iface.encodeFunctionData(fragment, args);
      // Reject truncation, trailing bytes and noncanonical arguments for all ABIs.
      if (
        `${selector}${encoded.slice(10)}`.toLowerCase() !== data.toLowerCase()
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
      "No matching function with complete input types could decode this calldata."
    );
  return [...matches.values()][0];
}
