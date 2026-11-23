import type { Abi } from "viem";
export type ConstructorAbi = Extract<Abi[number], { type: "constructor" }>;
/** Retain only constructor metadata; verification jobs do not need a full ABI. */
export function readConstructorAbi(value: unknown): ConstructorAbi | undefined {
  try {
    const abi = typeof value === "string" ? JSON.parse(value) : value;
    if (!Array.isArray(abi)) return;
    const entry = abi.find((item) => item?.type === "constructor");
    if (!entry || !Array.isArray(entry.inputs)) return;
    return {
      type: "constructor",
      inputs: entry.inputs,
      stateMutability:
        entry.stateMutability === "payable" ? "payable" : "nonpayable",
    };
  } catch {
    return;
  }
}
