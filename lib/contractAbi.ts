import { Fragment, FunctionFragment, type JsonFragment } from "ethers";
import { parseAbi } from "viem";

/** Accept explorer ABI JSON, compiler artifacts, or human-readable declarations. */
export function parseContractAbi(input: string): JsonFragment[] {
  const text = input.trim();
  if (!text) throw new Error("Enter an ABI or function declaration.");
  let entries: unknown;
  if (text.startsWith("[") || text.startsWith("{")) {
    const parsed = JSON.parse(text);
    entries = Array.isArray(parsed) ? parsed : parsed?.abi;
  } else {
    entries = parseAbi(
      text
        .split("\n")
        .map((line) => line.trim().replace(/;$/, ""))
        .filter(Boolean)
    );
  }
  if (!Array.isArray(entries))
    throw new Error("ABI must be an array or a JSON object with an abi array.");
  return entries.map((entry) => {
    if (!entry || (typeof entry !== "object" && typeof entry !== "string"))
      throw new Error("Each ABI entry must be a valid ABI definition.");
    const fragment = Fragment.from(entry);
    if (!fragment) throw new Error("Invalid ABI definition.");
    const normalized = JSON.parse(fragment.format("json")) as JsonFragment;
    return fragment.type === "function"
      ? {
          ...normalized,
          stateMutability: FunctionFragment.from(entry).stateMutability,
        }
      : normalized;
  });
}

export function contractAbiFunctionSelector(
  entry: JsonFragment
): string | null {
  if (entry.type !== "function") return null;
  const selector = (entry as JsonFragment & { selector?: string }).selector;
  if (selector && /^0x[a-fA-F0-9]{8}$/.test(selector))
    return selector.toLowerCase();
  try {
    return FunctionFragment.from(entry).selector;
  } catch {
    return null;
  }
}

function entryKey(entry: JsonFragment): string {
  if (["constructor", "receive", "fallback"].includes(entry.type ?? ""))
    return entry.type!;
  const selector = contractAbiFunctionSelector(entry);
  if (selector) return `function:${selector}`;
  try {
    return `${entry.type}:${Fragment.from(entry).format("sighash")}`;
  } catch {
    // Inferred entries may not have a fully known signature yet.
    return `${entry.type}:${entry.name}:${JSON.stringify(entry.inputs)}`;
  }
}

export function mergeContractAbi(
  current: JsonFragment[],
  incoming: JsonFragment[]
): JsonFragment[] {
  const merged = new Map(current.map((entry) => [entryKey(entry), entry]));
  for (const entry of incoming) merged.set(entryKey(entry), entry);
  return [...merged.values()];
}

export function parseAdditionalFunctions(input: string): JsonFragment[] {
  const abi = parseContractAbi(input);
  if (!abi.length || abi.some((entry) => entry.type !== "function"))
    throw new Error("Enter one or more function declarations.");
  // Validate overload identities, including tuple inputs.
  abi.forEach((entry) => FunctionFragment.from(entry));
  return abi;
}

export function compareContractFunctions(
  left: JsonFragment,
  right: JsonFragment
): number {
  const isUnnamed = (entry: JsonFragment) =>
    !entry.name || /^selector:\s*0x[0-9a-f]{8}$/i.test(entry.name);
  const unnamedOrder = Number(isUnnamed(left)) - Number(isUnnamed(right));
  if (unnamedOrder) return unnamedOrder;

  return (
    (left.name ?? "").localeCompare(right.name ?? "", "en", {
      sensitivity: "base",
    }) ||
    (contractAbiFunctionSelector(left) ?? "").localeCompare(
      contractAbiFunctionSelector(right) ?? ""
    )
  );
}


/** Identity of the definition used by a function card, independent of sorting or labels. */
export function contractFunctionStateKey(entry: JsonFragment, inferred: boolean): string {
  const parameterShape = (parameter: NonNullable<JsonFragment["inputs"]>[number]): unknown => ({
    type: parameter.type,
    components: parameter.components?.map(parameterShape),
  });
  return JSON.stringify({
    selector: contractAbiFunctionSelector(entry),
    name: entry.name,
    inputs: entry.inputs?.map(parameterShape) ?? [],
    outputs: entry.outputs?.map(parameterShape) ?? [],
    stateMutability: entry.stateMutability,
    inferred,
    unknownInputs: (entry as JsonFragment & { inputInference?: { source: string } }).inputInference?.source === "unknown",
  });
}
