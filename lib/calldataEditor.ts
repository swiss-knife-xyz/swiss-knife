import { FunctionFragment, ParamType } from "ethers";
import type { Abi, AbiParameter, Hex } from "viem";
import type {
  Arg,
  DecodeBytesParamResult,
  DecodeRecursiveResult,
} from "@/types";
import {
  encodeFunction,
  encodeSafeMultiSendTransactions,
  encodeStandard,
} from "./encoder";

/** Drafts are separate from the decoder's (sometimes synthetic) presentation nodes. */
export type CalldataDraft = {
  kind: "function" | "safe-multisend";
  original: Hex;
  fragment?: FunctionFragment;
  params: ParameterDraft[];
};
export type ParameterDraft = {
  id: string;
  input: ParamType;
  value: string;
  children?: ParameterDraft[];
  call?: CalldataDraft;
  rawMode?: boolean;
  dirty?: boolean;
  note?: string;
};
export class CalldataEditError extends Error {
  constructor(
    public parameterId: string,
    message: string
  ) {
    super(message);
  }
}
let sequence = 0;
const nextId = () => `calldata-edit-${++sequence}`;
const sameBytes = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const childArgs = (arg?: Arg) =>
  Array.isArray(arg?.value) ? (arg.value as Arg[]) : [];
const nestedDecode = (arg?: Arg) =>
  (arg?.value as DecodeBytesParamResult | undefined)?.decoded;

function parameter(
  input: ParamType,
  value: unknown,
  arg?: Arg
): ParameterDraft {
  const draft: ParameterDraft = { id: nextId(), input, value: "" };
  if (input.baseType === "array") {
    draft.children = (value as unknown[]).map((v, i) =>
      parameter(input.arrayChildren!, v, childArgs(arg)[i])
    );
  } else if (input.baseType === "tuple") {
    draft.children = input.components!.map((component, i) =>
      parameter(component, (value as unknown[])[i], childArgs(arg)[i])
    );
  } else {
    draft.value = String(value);
    if (input.type === "bytes" && nestedDecode(arg)) {
      draft.call = createCalldataDraft(nestedDecode(arg)!, draft.value);
      if (!draft.call)
        draft.note =
          "Structured editing unavailable for this payload. Edit the raw bytes.";
    }
  }
  return draft;
}

/** Exact selector/schema and byte round-trip are required, including for nested calls. */
export function createCalldataDraft(
  result: NonNullable<DecodeRecursiveResult>,
  original: string
): CalldataDraft | undefined {
  if (
    result.kind === "revert" ||
    result.decoding === "heuristic" ||
    !/^0x(?:[\da-f]{2})*$/i.test(original)
  )
    return;
  try {
    let draft: CalldataDraft;
    if (result.functionName === "SafeMultiSend transactions") {
      const txs = (result.rawArgs[0] as unknown[][]).map((tx, i) => {
        const decoded = nestedDecode(result.args[i]);
        const dataArg = decoded?.args[3];
        return {
          value: [String(parseInt(String(tx[0]), 16)), tx[1], tx[2], tx[4]],
          arg: {
            name: "",
            type: "tuple",
            baseType: "tuple",
            rawValue: null,
            value: [
              {
                name: "operation",
                type: "uint8",
                baseType: "uint8",
                rawValue: tx[0],
                value: String(parseInt(String(tx[0]), 16)),
              },
              decoded?.args[1],
              decoded?.args[2],
              dataArg,
            ],
          } as Arg,
        };
      });
      const input = ParamType.from(
        "tuple(uint8 operation,address to,uint256 value,bytes data)[] transactions"
      );
      const transactions = parameter(
        input,
        txs.map((tx) => tx.value),
        {
          name: "transactions",
          type: input.type,
          baseType: "array",
          rawValue: null,
          value: txs.map((tx) => tx.arg),
        }
      );
      draft = {
        kind: "safe-multisend",
        original: original as Hex,
        params: [transactions],
      };
    } else {
      const fragment = FunctionFragment.from(`function ${result.signature}`);
      if (!sameBytes(fragment.selector, original.slice(0, 10))) return;
      // Names come from the decoded ABI; types and field order come from the signature.
      const withNames = (input: ParamType, arg?: Arg): ParamType => {
        const json = JSON.parse(input.format("json"));
        json.name = arg?.name || input.name || "";
        if (input.baseType === "array") {
          const child = withNames(input.arrayChildren!, childArgs(arg)[0]);
          const childJson = JSON.parse(child.format("json"));
          if (childJson.components) json.components = childJson.components;
        }
        if (input.baseType === "tuple")
          json.components = input.components!.map((c, i) =>
            JSON.parse(withNames(c, childArgs(arg)[i]).format("json"))
          );
        return ParamType.from(json);
      };
      const params = fragment.inputs.map((input, i) =>
        parameter(
          withNames(input, result.args[i]),
          result.rawArgs[i],
          result.args[i]
        )
      );
      const namedFragment = FunctionFragment.from({
        ...JSON.parse(fragment.format("json")),
        inputs: params.map((param) => JSON.parse(param.input.format("json"))),
      });
      draft = {
        kind: "function",
        original: original as Hex,
        fragment: namedFragment,
        params,
      };
    }
    if (!sameBytes(encodeDraft(draft, true), original)) return;
    return draft;
  } catch {
    return;
  }
}

export function parameterIsDirty(param: ParameterDraft): boolean {
  return (
    !!param.dirty ||
    !!param.children?.some(parameterIsDirty) ||
    !!param.call?.params.some(parameterIsDirty)
  );
}

function valueFor(param: ParameterDraft, verify: boolean): unknown {
  const { input } = param;
  try {
    if (input.baseType === "array" || input.baseType === "tuple") {
      if (
        input.baseType === "array" &&
        input.arrayLength !== -1 &&
        param.children?.length !== input.arrayLength
      )
        throw new Error(`Expected ${input.arrayLength} items.`);
      return param.children!.map((child) => valueFor(child, verify));
    }
    if (input.type === "bytes" && param.call && !param.rawMode)
      return encodeDraft(param.call, verify);
    if (/^u?int\d*$/.test(input.type)) {
      if (!/^(?:-?\d+|0x[\da-f]+)$/i.test(param.value))
        throw new Error("Enter an explicit integer in base units.");
      const value = BigInt(param.value);
      encodeStandard([JSON.parse(input.format("json"))], [value]);
      return value;
    }
    if (input.type === "bool") {
      if (param.value !== "true" && param.value !== "false")
        throw new Error("Choose true or false.");
      return param.value === "true";
    }
    if (/^bytes\d*$/.test(input.type)) {
      if (!/^0x(?:[\da-f]{2})*$/i.test(param.value))
        throw new Error("Enter even-length, 0x-prefixed hex bytes.");
    }
    encodeStandard(
      [JSON.parse(input.format("json")) as AbiParameter],
      [param.value]
    );
    return param.value;
  } catch (error) {
    if (error instanceof CalldataEditError) throw error;
    throw new CalldataEditError(
      param.id,
      `${input.name || input.type}: ${error instanceof Error ? error.message.split("\n")[0] : "Invalid value"}`
    );
  }
}

export function encodeDraft(draft: CalldataDraft, verify = false): Hex {
  // Preserve original bytes in every untouched nested payload.
  if (!verify && !draft.params.some(parameterIsDirty)) return draft.original;
  const args = draft.params.map((param) => valueFor(param, verify));
  if (draft.kind === "safe-multisend") {
    const txs = args[0] as [bigint, string, bigint, string][];
    txs.forEach((tx, i) => {
      if (tx[0] !== 0n && tx[0] !== 1n)
        throw new CalldataEditError(
          draft.params[0].children![i].children![0].id,
          "Operation must be 0 (CALL) or 1 (DELEGATECALL)."
        );
    });
    return encodeSafeMultiSendTransactions(
      txs.map(([operation, to, value, data]) => ({
        operation: Number(operation) as 0 | 1,
        to,
        value: String(value),
        data,
      }))
    );
  }
  return encodeFunction(
    [JSON.parse(draft.fragment!.format("json"))] as Abi,
    draft.fragment!.name,
    args
  );
}

/** Immutable updates keep edits out of live results and frozen example snapshots. */
export function updateDraft(
  draft: CalldataDraft,
  id: string,
  update: (param: ParameterDraft) => ParameterDraft
): CalldataDraft {
  const visit = (param: ParameterDraft): ParameterDraft => {
    if (param.id === id) return update(param);
    return {
      ...param,
      ...(param.children ? { children: param.children.map(visit) } : {}),
      ...(param.call ? { call: updateDraft(param.call, id, update) } : {}),
    };
  };
  return { ...draft, params: draft.params.map(visit) };
}

export function emptyParameter(input: ParamType): ParameterDraft {
  const empty = (type: ParamType): unknown => {
    if (type.baseType === "array")
      return Array.from(
        { length: type.arrayLength === -1 ? 0 : type.arrayLength! },
        () => empty(type.arrayChildren!)
      );
    if (type.baseType === "tuple") return type.components!.map(empty);
    return type.type === "bool" ? "false" : type.type === "bytes" ? "0x" : "";
  };
  return parameter(input, empty(input));
}

/** Project the draft into the existing tree, retaining a path-to-draft index for controls. */
export function draftTree(draft: CalldataDraft) {
  const fields = new Map<string, ParameterDraft>();
  const parents = new Map<string, ParameterDraft>();
  const visit = (
    param: ParameterDraft,
    path: string,
    parent?: ParameterDraft
  ): Arg => {
    fields.set(path, param);
    if (parent) parents.set(path, parent);
    const children = param.children?.map((child, i) =>
      visit(child, `${path}.${i}`, param)
    );
    const nested = param.call
      ? {
          functionName:
            param.call.kind === "safe-multisend"
              ? "SafeMultiSend transactions"
              : param.call.fragment!.name,
          signature:
            param.call.fragment?.format("sighash") ??
            "SafeMultiSend transactions",
          rawArgs: [],
          args: param.call.params.map((child, i) =>
            visit(child, `${path}.${i}`)
          ),
        }
      : null;
    return {
      name: param.input.name,
      type: param.input.type,
      baseType: param.input.baseType,
      rawValue: param.value,
      value:
        children ??
        (param.input.type.startsWith("bytes")
          ? { decoded: nested }
          : param.value),
      decodeNote: param.note,
    };
  };
  return {
    args: draft.params.map((param, i) => visit(param, `args.${i}`)),
    fields,
    parents,
  };
}

export function draftFunctionDefinitions(draft: CalldataDraft): string[] {
  const definitions = new Set<string>();
  const visit = (call: CalldataDraft) => {
    if (call.fragment) definitions.add(call.fragment.format("full"));
    const param = (p: ParameterDraft) => {
      p.children?.forEach(param);
      if (p.call && !p.rawMode) visit(p.call);
    };
    call.params.forEach(param);
  };
  visit(draft);
  return [...definitions];
}
