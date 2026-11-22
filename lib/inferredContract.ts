import { FunctionFragment, type JsonFragmentType } from "ethers";

export type InputInference = {
  source: "bytecode" | "signature" | "unknown";
  message: string;
};

export type InferredFunctionInfo = {
  selector?: string;
  inputInference?: InputInference;
};

function parameters(fragment: FunctionFragment): JsonFragmentType[] {
  return fragment.inputs.map((param, index) => ({
    ...JSON.parse(param.format("json")),
    name: `arg${index}`,
  }));
}

/** A selector database is a hint, not a verified ABI. Never pick a collision's first hit. */
export function inferFunctionInputs(
  selector: string,
  args: string | undefined,
  signatures: readonly string[],
) {
  const candidates = new Map<string, FunctionFragment>();
  for (const signature of signatures) {
    try {
      const fragment = FunctionFragment.from(`function ${signature}`);
      if (fragment.selector.toLowerCase() === selector.toLowerCase()) {
        candidates.set(fragment.format("sighash"), fragment);
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

  const matches = [...candidates.values()].filter(fragment =>
    !bytecode || JSON.stringify(parameters(fragment)) === JSON.stringify(parameters(bytecode)),
  );
  const signature = matches.length === 1 ? matches[0] : undefined;
  const fragment = bytecode ?? signature;
  const inputInference: InputInference = bytecode
    ? { source: "bytecode", message: "Input types inferred from bytecode; not a verified ABI." }
    : signature
      ? { source: "signature", message: "Input types inferred from a signature database; not a verified ABI. Selector collisions are possible." }
      : { source: "unknown", message: candidates.size > 1
          ? "Input types are ambiguous: multiple signatures match this selector. Supply an ABI or use Raw Calldata. Function actions are disabled."
          : "Input types are unknown; this does not imply zero parameters. Supply an ABI or use Raw Calldata. Function actions are disabled." };

  return {
    name: signature?.name ?? `selector: ${selector}`,
    inputs: fragment ? parameters(fragment) : [],
    inputInference,
  };
}
