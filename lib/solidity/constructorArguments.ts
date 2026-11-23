import { decodeAbiParameters, type AbiParameter, type Hex } from "viem";
export function decodeConstructorArguments(
  inputs: readonly AbiParameter[],
  encoded: Hex
): readonly unknown[] | undefined {
  try {
    return decodeAbiParameters(inputs, encoded);
  } catch {
    return;
  }
}
export function stringifyConstructorValues(value: unknown, space?: number) {
  return JSON.stringify(
    value,
    (_key, item) => (typeof item === "bigint" ? item.toString() : item),
    space
  );
}
