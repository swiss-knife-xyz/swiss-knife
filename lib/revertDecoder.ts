import { ErrorFragment, FunctionFragment, Interface, TransactionDescription, type InterfaceAbi } from "ethers";
import type { ParsedTransaction } from "@/types";

const builtinErrors = new Interface([
  "error Error(string reason)",
  "error Panic(uint256 code)",
]);
const panicReasons: Record<string, string> = {
  "0": "Compiler-inserted panic.",
  "1": "Assertion failed.",
  "17": "Arithmetic overflow or underflow.",
  "18": "Division or modulo by zero.",
  "33": "Invalid enum conversion.",
  "34": "Incorrectly encoded storage byte array.",
  "49": "pop() called on an empty array.",
  "50": "Array index out of bounds.",
  "65": "Too much memory allocated or array too large.",
  "81": "Called an uninitialized internal function.",
};

/** Error and function selectors share the same encoding. Only ABI errors,
 * built-ins, or an explicit revert context establish the result's kind. */
export function parseRevert(data: string, abi?: InterfaceAbi): ParsedTransaction | null {
  if (!/^0x(?:[0-9a-f]{2}){4,}$/i.test(data)) return null;
  const selector = data.slice(0, 10).toLowerCase();
  const builtin = selector === "0x08c379a0" || selector === "0x4e487b71";
  const iface = builtin ? builtinErrors : abi ? new Interface(abi) : null;
  if (!iface) return null;
  const fragment = builtin
    ? ErrorFragment.from(selector === "0x08c379a0" ? "error Error(string reason)" : "error Panic(uint256 code)")
    : iface.getError(selector);
  if (!fragment) return null;
  // Force deferred ABI errors and reject truncated, trailing or noncanonical data.
  const args = iface.decodeErrorResult(fragment, data);
  if (iface.encodeErrorResult(fragment, args).toLowerCase() !== data.toLowerCase()) {
    throw new Error("Malformed revert data: arguments do not match the error ABI.");
  }
  const parsed: ParsedTransaction = new TransactionDescription(
    FunctionFragment.from({ type: "function", name: fragment.name, inputs: fragment.inputs }),
    selector, args, 0n,
  );
  parsed.kind = "revert";
  if (builtin && fragment.name === "Error") parsed.decodeNote = String(args[0]);
  if (builtin && fragment.name === "Panic") {
    const code = BigInt(args[0]);
    parsed.decodeNote = `Panic 0x${code.toString(16)}: ${panicReasons[code.toString()] ?? "Unknown panic code."}`;
  }
  return parsed;
}

export function errorAbiFromSignature(signature: string): string {
  return ErrorFragment.from(`error ${signature}`).format("full");
}
