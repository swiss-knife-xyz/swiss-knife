import { Interface } from "ethers";
import type { Abi } from "viem";

// Accept both JSON ABI objects and JSON arrays of human-readable signatures.
export function parseJsonAbi(value: string): Abi {
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed)) throw new Error("ABI must be a JSON array.");
  if (parsed.length > 0 && parsed.every((entry) => typeof entry === "string")) {
    // Interface normalizes signatures, including unnamed parameters and tuples,
    // into the JSON ABI consumed by the selector, field renderer and encoder.
    return JSON.parse(new Interface(parsed).formatJson()) as Abi;
  }
  if (
    parsed.some(
      (entry) => !entry || typeof entry !== "object" || Array.isArray(entry)
    )
  ) {
    throw new Error(
      "Use ABI objects or human-readable function signatures in a JSON array."
    );
  }
  return parsed as Abi;
}
