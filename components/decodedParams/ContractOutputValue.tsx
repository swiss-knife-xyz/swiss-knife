"use client";

import { useEffect, useMemo, useState } from "react";
import { stringify, toFunctionSelector } from "viem";
import { decodeRecursive } from "@/lib/decoder";
import type { Arg, DecodeRecursiveResult } from "@/types";
import { CalldataTree } from "./CalldataTree";
import { ParamValue } from "./ParamValue";

// React's development render logger JSON-serializes primitive arrays in props.
// Keep display records serializable without changing the original RPC result.
const presentationArg = (arg: Arg): Arg => JSON.parse(stringify(arg));

/** Enrich ABI-decoded returns without treating the returning contract as the call target. */
export function ContractOutputValue({
  serializedArg,
  chainId,
}: {
  serializedArg: string;
  chainId: number;
}) {
  const source = useMemo(
    () => JSON.parse(serializedArg) as Arg,
    [serializedArg]
  );
  const [output, setOutput] = useState<{ source: Arg; chainId: number; arg: Arg }>();

  useEffect(() => {
    let cancelled = false;
    const pending = new Map<string, Promise<DecodeRecursiveResult>>();
    const enrich = async (arg: Arg): Promise<Arg> => {
      if (arg.baseType === "array" || arg.baseType === "tuple") {
        if (!Array.isArray(arg.value)) return arg;
        return { ...arg, value: await Promise.all(arg.value.map(enrich)) };
      }
      if (!arg.baseType.startsWith("bytes") ||
          typeof arg.rawValue !== "string" ||
          !/^0x(?:[0-9a-f]{2}){4,}$/i.test(arg.rawValue)) return arg;
      const calldata = arg.rawValue;
      const key = calldata.toLowerCase();
      let request = pending.get(key);
      if (!request) {
        request = decodeRecursive({ calldata, chainId }).catch(() => null);
        pending.set(key, request);
      }
      const decoded = await request;
      // Text, packed-data and generic ABI guesses are not function calldata.
      return decoded && decoded.decoding !== "heuristic" &&
        toFunctionSelector(decoded.signature).toLowerCase() === key.slice(0, 10)
        ? presentationArg({ ...arg, value: { decoded } }) : arg;
    };
    void enrich(source).then(arg => {
      if (!cancelled) setOutput({ source, chainId, arg });
    });
    return () => { cancelled = true; };
  }, [source, chainId]);

  const arg = output?.source === source && output.chainId === chainId
    ? output.arg : source;
  const hasTree = arg.baseType === "array" || arg.baseType === "tuple" ||
    (typeof arg.value === "object" && arg.value !== null && "decoded" in arg.value);
  return hasTree
    ? <CalldataTree args={[arg]} chainId={chainId} showControls={false} />
    : <ParamValue arg={arg} chainId={chainId} />;
}
