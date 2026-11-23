// Reference limits, not a chain-support assertion. Some networks use different limits.
// https://eips.ethereum.org/EIPS/eip-170
// https://eips.ethereum.org/EIPS/eip-3860 (transaction initcode includes constructor arguments)
export const RUNTIME_SIZE_LIMIT = 24_576;
export const INITCODE_SIZE_LIMIT = 49_152;

/** solc link placeholders occupy exactly 20 bytes, just like their linked address. */
export function bytecodeSize(bytecode: string): number | null {
  const code = bytecode
    .replace(/^0x/i, "")
    .replace(/__[^\s]{36}__/g, "0".repeat(40));
  if (code.length % 2 || !/^[\da-f]*$/i.test(code)) return null;
  return code.length / 2;
}

export function sizeStatus(
  bytes: number,
  limit: number
): "normal" | "near" | "over" {
  return bytes > limit ? "over" : bytes >= limit * 0.9 ? "near" : "normal";
}
export const formatBytes = (bytes: number) => bytes.toLocaleString("en-US");
