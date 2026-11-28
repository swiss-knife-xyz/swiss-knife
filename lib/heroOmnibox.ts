import {
  parseContractAddressInput,
  parseTransactionExplorerUrl,
} from "@/lib/contractExplorerInput";
import { normalize } from "viem/ens";
import { isXnsName } from "./xnsName";

export type OmniboxInput =
  | { kind: "address"; value: string; chainId: number }
  | { kind: "transaction"; value: string; chainId: number }
  | { kind: "calldata"; value: string }
  | { kind: "integer"; value: string }
  | { kind: "name"; value: string };

/** Prefer addresses and transaction hashes over their ambiguous bytes forms. */
export function detectOmniboxInput(input: string): OmniboxInput | null {
  const value = input.trim();
  if (!value) return null;
  if (value.includes("@"))
    return isXnsName(value) ? { kind: "name", value } : null;
  if (/\.(eth|gwei|wei)$/i.test(value)) {
    try {
      const name = normalize(value);
      if (name.split(".").length >= 2) return { kind: "name", value: name };
    } catch {
      /* Invalid names can still fall through to tool search. */
    }
  }
  const address = parseContractAddressInput(value);
  if (address)
    return {
      kind: "address",
      value: address.address,
      chainId: address.chainId,
    };
  const transaction = parseTransactionExplorerUrl(value);
  if (transaction)
    return {
      kind: "transaction",
      value: transaction.hash,
      chainId: transaction.chainId,
    };
  if (/^0x[\da-f]{40}$/i.test(value))
    return { kind: "address", value: `0x${value.slice(2)}`, chainId: 1 };
  if (/^0x[\da-f]{64}$/i.test(value))
    return { kind: "transaction", value: `0x${value.slice(2)}`, chainId: 1 };
  if (/^0x(?:[\da-f]{2})+$/i.test(value))
    return { kind: "calldata", value: `0x${value.slice(2)}` };
  if (/^[+-]?\d+$/.test(value))
    return { kind: "integer", value: BigInt(value).toString() };
  return null;
}
