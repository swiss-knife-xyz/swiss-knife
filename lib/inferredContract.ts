import { FunctionFragment, type JsonFragmentType, type ParamType } from "ethers";

export type InputInference = {
  source: "bytecode" | "signature" | "unknown";
  message: string;
};

export type InferredFunctionInfo = {
  selector?: string;
  inputInference?: InputInference;
};

export type FunctionSignatureCandidate = string | {
  name: string;
  hasVerifiedContract?: boolean;
  corroborated?: boolean;
};

function parameters(fragment: FunctionFragment): JsonFragmentType[] {
  return fragment.inputs.map((param, index) => ({
    ...JSON.parse(param.format("json")),
    name: `arg${index}`,
  }));
}

/** EVMole reports storage/decoder shapes, which can be less specific than Solidity types. */
function compatibleParameter(inferred: ParamType, candidate: ParamType): boolean {
  if (inferred.baseType === "array" || candidate.baseType === "array") {
    return inferred.baseType === "array" && candidate.baseType === "array" &&
      inferred.arrayLength === candidate.arrayLength &&
      compatibleParameter(inferred.arrayChildren!, candidate.arrayChildren!);
  }
  if (inferred.baseType === "tuple" || candidate.baseType === "tuple") {
    return inferred.baseType === "tuple" && candidate.baseType === "tuple" &&
      inferred.components!.length === candidate.components!.length &&
      inferred.components!.every((input, index) =>
        compatibleParameter(input, candidate.components![index]));
  }
  if (inferred.type === candidate.type) return true;
  // Both dynamic byte sequences have the same ABI layout.
  if (inferred.type === "bytes" && candidate.type === "string") return true;
  // An unconstrained word does not distinguish integer, address, bool or bytes32.
  // Narrow integers and bytesN are otherwise kept strict (including alignment).
  return inferred.type === "uint256" &&
    /^(?:u?int(?:[0-9]+)|address|bool|bytes32)$/.test(candidate.type);
}

/** Prefer a unique verified-contract candidate after compatibility checks, never response order. */
export function inferFunctionInputs(
  selector: string,
  args: string | undefined,
  signatures: readonly FunctionSignatureCandidate[],
) {
  const candidates = new Map<string, { fragment: FunctionFragment; verified: boolean; corroborated: boolean }>();
  for (const candidate of signatures) {
    const signature = typeof candidate === "string" ? candidate : candidate.name;
    try {
      const fragment = FunctionFragment.from(`function ${signature}`);
      if (fragment.selector.toLowerCase() === selector.toLowerCase()) {
        const canonical = fragment.format("sighash");
        candidates.set(canonical, {
          fragment,
          corroborated: candidates.get(canonical)?.corroborated === true ||
            (typeof candidate !== "string" && candidate.corroborated === true),
          verified: candidates.get(canonical)?.verified === true ||
            (typeof candidate !== "string" && candidate.hasVerifiedContract === true),
        });
      }
    } catch {
      // Malformed/non-ABI signatures are not evidence of parameter types.
    }
  }

  let bytecode: FunctionFragment | undefined;
  if (typeof args === "string") {
    try {
      bytecode = FunctionFragment.from(`function inferred(${args})`);
    } catch {
      // Missing/unsupported types must not become a guessed string input.
    }
  }

  const matches = [...candidates.values()].filter(({ fragment }) =>
    !bytecode || (bytecode.inputs.length === fragment.inputs.length &&
      bytecode.inputs.every((input, index) => compatibleParameter(input, fragment.inputs[index]))),
  );
  const verifiedMatches = matches.filter(candidate => candidate.verified);
  const preferred = verifiedMatches.length ? verifiedMatches : matches;
  const corroborated = preferred.filter(candidate => candidate.corroborated);
  const signature = preferred.length === 1
    ? preferred[0].fragment
    : corroborated.length === 1 ? corroborated[0].fragment : undefined;
  const fragment = signature ?? bytecode;
  const inputInference: InputInference = signature
    ? { source: "signature", message: "Input types inferred from a signature database; not a verified ABI. Selector collisions are possible." }
    : bytecode
      ? { source: "bytecode", message: "Input types inferred from bytecode; not a verified ABI." }
      : { source: "unknown", message: candidates.size > 1
          ? "Input types are ambiguous: multiple signatures match this selector. Supply an ABI or use Raw Calldata. Function actions are disabled."
          : "Input types are unknown; this does not imply zero parameters. Supply an ABI or use Raw Calldata. Function actions are disabled." };

  return {
    name: signature?.name ?? `selector: ${selector}`,
    inputs: fragment ? parameters(fragment) : [],
    inputInference,
  };
}
