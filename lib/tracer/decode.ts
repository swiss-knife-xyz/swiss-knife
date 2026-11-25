import {
  Interface,
  AbiCoder,
  Indexed,
  type LogDescription,
  type InterfaceAbi,
  type FunctionFragment,
} from "ethers";
import type { Arg, DecodeRecursiveResult, DecodeEventResult } from "@/types";
import {
  decodeRecursive,
  decodeAbiValues,
  decodeEventWithABI,
  fetchFunctionInterfaces,
} from "@/lib/decoder";
import { fetchTraceAbi, type TraceAbi } from "./abi";
import type { TraceCall, TraceLog } from "./model";

export interface DecodedTraceCall {
  input: DecodeRecursiveResult;
  inputInferred: boolean;
  outputs?: Arg[];
  revert: DecodeRecursiveResult;
  logs: Record<number, DecodeEventResult>;
  codeAddress?: string;
  contractName?: string;
  abiSource?: "explorer" | "blockscout" | "provided";
  note: string;
}
export type TraceAbis = Record<string, InterfaceAbi>;
type Contract = {
  abi: InterfaceAbi;
  name?: string;
  source: "explorer" | "blockscout" | "provided";
};

export { traceCodeAddress } from "./codeAddress";
import { traceCodeAddress } from "./codeAddress";
async function limited<T>(
  promise: Promise<T>,
  fallback: T,
  timeout = 10000
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), timeout);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
function matchedFunction(
  abi: InterfaceAbi,
  call: TraceCall
): { iface: Interface; fragment: FunctionFragment } | null {
  try {
    const iface = new Interface(abi);
    const fragment = iface.getFunction(call.input.slice(0, 10));
    if (!fragment) return null;
    const args = iface.decodeFunctionData(fragment, call.input);
    if (
      iface.encodeFunctionData(fragment, args).toLowerCase() !==
      call.input.toLowerCase()
    )
      return null;
    return { iface, fragment };
  } catch {
    return null;
  }
}

function canonicalEvent(event: LogDescription, log: TraceLog): boolean {
  try {
    const coder = AbiCoder.defaultAbiCoder();
    const values = event.args.toArray();
    const plain = event.fragment.inputs.flatMap((param, index) =>
      param.indexed ? [] : [{ param, value: values[index] }]
    );
    if (
      coder
        .encode(
          plain.map((item) => item.param),
          plain.map((item) => item.value)
        )
        .toLowerCase() !== log.data.toLowerCase()
    )
      return false;
    const topics = event.fragment.anonymous ? [] : [event.fragment.topicHash];
    event.fragment.inputs.forEach((param, index) => {
      if (param.indexed)
        topics.push(
          Indexed.isIndexed(values[index])
            ? values[index].hash!
            : coder.encode([param], [values[index]])
        );
    });
    return (
      topics.length === log.topics.length &&
      topics.every(
        (topic, index) =>
          topic.toLowerCase() === log.topics[index].toLowerCase()
      )
    );
  } catch {
    return false;
  }
}

/** A trace-scoped decoder: ABI, selector and equivalent-frame work are deduplicated. */
export function createTraceDecoder(
  chainId?: number,
  provided: TraceAbis = {},
  dependencies: {
    fetchAbi?: (identity: {
      address: string;
      chainId: number;
    }) => Promise<TraceAbi>;
    fetchSignatures?: typeof fetchFunctionInterfaces;
  } = {}
) {
  const lookupAbi = dependencies.fetchAbi ?? fetchTraceAbi;
  const lookupSignatures =
    dependencies.fetchSignatures ?? fetchFunctionInterfaces;
  const overrides = new Map(
    Object.entries(provided).map(([address, abi]) => [
      address.toLowerCase(),
      abi,
    ])
  );
  const contracts = new Map<string, Promise<Contract | null>>();
  const signatures = new Map<
    string,
    Promise<Awaited<ReturnType<typeof fetchFunctionInterfaces>>>
  >();
  const frames = new Map<string, Promise<DecodedTraceCall>>();
  function contract(address?: string): Promise<Contract | null> {
    if (!address) return Promise.resolve(null);
    const key = address.toLowerCase();
    if (overrides.has(key))
      return Promise.resolve({ abi: overrides.get(key)!, source: "provided" });
    if (!chainId) return Promise.resolve(null);
    let result = contracts.get(key);
    if (!result) {
      result = limited(
        lookupAbi({ address, chainId })
          .then((value) => ({
            ...value,
            source: value.source ?? ("explorer" as const),
          }))
          .catch(() => null),
        null,
        20000
      );
      contracts.set(key, result);
    }
    return result;
  }
  async function decode(call: TraceCall): Promise<DecodedTraceCall> {
    const codeAddress = traceCodeAddress(call);
    const key = JSON.stringify([
      codeAddress?.toLowerCase(),
      call.type,
      call.input,
      call.output,
      call.error,
      call.logs,
    ]);
    const cached = frames.get(key);
    if (cached) return cached;
    const result = decodeFrame(call, codeAddress);
    frames.set(key, result);
    return result;
  }
  async function decodeFrame(
    call: TraceCall,
    codeAddress?: string
  ): Promise<DecodedTraceCall> {
    const base = {
      input: null,
      inputInferred: false,
      revert: null,
      logs: {},
      codeAddress,
      note: "",
    } satisfies DecodedTraceCall;
    if (["CREATE", "CREATE2", "SELFDESTRUCT"].includes(call.type)) {
      return {
        ...base,
        revert: call.error
          ? await decodeRecursive({
              calldata: call.output,
              mode: "revert",
            }).catch(() => null)
          : null,
        note:
          call.type === "SELFDESTRUCT"
            ? "SELFDESTRUCT has no function arguments."
            : "Creation data is initcode / deployed bytecode.",
      };
    }
    if (
      call.input === "0x" &&
      call.output === "0x" &&
      !call.error &&
      call.logs.length === 0
    )
      return base;
    let metadata = await contract(codeAddress);
    let match =
      metadata && call.input.length >= 10
        ? matchedFunction(metadata.abi, call)
        : null;
    let inputAbi = match ? metadata?.abi : undefined;
    let ambiguous = false;
    if (!match && call.input.length >= 10) {
      const selector = call.input.slice(0, 10).toLowerCase();
      if (!signatures.has(selector))
        signatures.set(
          selector,
          limited(
            lookupSignatures({ selector }).catch(() => []),
            []
          )
        );
      const candidates = await signatures.get(selector)!;
      const matches = new Map<string, InterfaceAbi>();
      for (const candidate of candidates) {
        const name = typeof candidate === "string" ? candidate : candidate.name;
        try {
          const abi = [
            name.startsWith("function ") ? name : `function ${name}`,
          ];
          const found = matchedFunction(abi, call);
          if (found) matches.set(found.fragment.format("sighash"), abi);
        } catch {
          /* Invalid registry entries cannot establish a decoding. */
        }
      }
      ambiguous = matches.size > 1;
      if (matches.size === 1) inputAbi = [...matches.values()][0];
    }
    const [decodedInput, revert] = await Promise.all([
      call.input.length >= 10 && !ambiguous
        ? limited(
            decodeRecursive({
              calldata: call.input,
              chainId,
              abi: inputAbi,
            }).catch(() => null),
            null,
            15000
          )
        : Promise.resolve(null),
      call.error
        ? limited(
            decodeRecursive({
              calldata: call.output,
              abi: metadata?.abi,
              mode: "revert",
            }).catch(() => null),
            null
          )
        : Promise.resolve(null),
    ]);
    let input = decodedInput;
    // Call input and error data share the same encoding. Execution context wins.
    if (input?.kind === "revert") {
      const functionMatch = inputAbi ? matchedFunction(inputAbi, call) : null;
      if (!functionMatch) input = null;
      else {
        const values = functionMatch.iface.decodeFunctionData(
          functionMatch.fragment,
          call.input
        );
        input = {
          functionName: functionMatch.fragment.name,
          signature: functionMatch.fragment.format("sighash"),
          rawArgs: values,
          args: await decodeAbiValues({
            params: functionMatch.fragment.inputs,
            values,
            chainId,
            abi: inputAbi,
          }),
        };
      }
    }
    let outputs: Arg[] | undefined;
    if (!call.error && match) {
      try {
        const values = match.iface.decodeFunctionResult(
          match.fragment,
          call.output
        );
        if (
          match.iface
            .encodeFunctionResult(match.fragment, values)
            .toLowerCase() === call.output.toLowerCase()
        ) {
          outputs = await decodeAbiValues({
            params: match.fragment.outputs,
            values,
            chainId,
            abi: metadata?.abi,
            namePrefix: "result",
          });
        }
      } catch {
        /* No guessed return types: retain the raw bytes when the ABI doesn't match. */
      }
    }
    const logs: Record<number, DecodeEventResult> = {};
    for (const [index, log] of call.logs.slice(0, 200).entries()) {
      let logAbi = metadata?.abi;
      let event = logAbi
        ? decodeEventWithABI({
            abi: logAbi,
            topics: log.topics,
            data: log.data,
          })
        : null;
      if (!event && log.address.toLowerCase() !== codeAddress?.toLowerCase()) {
        logAbi = (await contract(log.address))?.abi;
        event = logAbi
          ? decodeEventWithABI({
              abi: logAbi,
              topics: log.topics,
              data: log.data,
            })
          : null;
      }
      if (!event || !canonicalEvent(event, log)) continue;
      try {
        logs[index] = {
          eventName: event.name,
          signature: event.signature,
          args: await decodeAbiValues({
            params: event.fragment.inputs,
            values: event.args,
            chainId,
            abi: logAbi,
          }),
        };
      } catch {
        /* A malformed event cannot hide other logs. */
      }
    }
    return {
      input,
      inputInferred:
        !!input &&
        (!match ||
          !!input.guessedFunctionName ||
          input.decoding === "heuristic"),
      outputs,
      revert,
      logs,
      codeAddress,
      contractName: metadata?.name,
      abiSource: metadata?.source,
      note: ambiguous
        ? "Multiple signatures match this selector. Supply an ABI to disambiguate."
        : metadata?.source === "provided"
          ? "Decoded using your ABI."
          : metadata?.source === "blockscout" && match
            ? "Decoded using a fully verified Blockscout ABI at the executed code address. Historical implementations may differ."
            : match
              ? "Decoded using the available ABI at the executed code address. Historical implementations may differ."
              : "Signature/type inference. No matching verified ABI; unknown returns remain raw.",
    };
  }
  return {
    decode,
    setAbi(address: string, abi: InterfaceAbi) {
      overrides.set(address.toLowerCase(), abi);
      frames.clear();
    },
  };
}

export async function decodeTraceCall(
  call: TraceCall,
  chainId?: number
): Promise<DecodedTraceCall> {
  return createTraceDecoder(chainId).decode(call);
}
