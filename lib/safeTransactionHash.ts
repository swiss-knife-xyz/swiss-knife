import { getAddress, TypedDataEncoder } from "ethers";

/** Safe 1.3.0 / 1.4.1 use the same SafeTx schema and chain-bound domain.
 * https://github.com/safe-global/safe-smart-account/blob/v1.4.1/contracts/Safe.sol
 * VERSION is deliberately NOT a domain field. verifyingContract is the Safe proxy,
 * not its singleton/implementation. No provider, wallet or signing is involved.
 */
export const SAFE_TRANSACTION_TYPES = {
  SafeTx: [
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "data", type: "bytes" },
    { name: "operation", type: "uint8" },
    { name: "safeTxGas", type: "uint256" },
    { name: "baseGas", type: "uint256" },
    { name: "gasPrice", type: "uint256" },
    { name: "gasToken", type: "address" },
    { name: "refundReceiver", type: "address" },
    { name: "nonce", type: "uint256" },
  ],
};

export type SafeTransactionInput = {
  version: string;
  chainId: string;
  safeAddress: string;
  to: string;
  value: string;
  data: string;
  operation: string;
  safeTxGas: string;
  baseGas: string;
  gasPrice: string;
  gasToken: string;
  refundReceiver: string;
  nonce: string;
};

// Bounded local hashing protects the UI from accidental multi-megabyte pastes.
export const SAFE_DATA_MAX_BYTES = 128 * 1024;
const MAX_UINT256 = (1n << 256n) - 1n;

function uint256(value: string, field: string): string {
  if (
    typeof value !== "string" ||
    value.length > 100 ||
    !/^(?:[0-9]+|0x[0-9a-fA-F]+)$/.test(value)
  ) {
    throw new Error(
      `${field}: enter an unsigned decimal or 0x hexadecimal integer (no spaces, fractions or exponents).`
    );
  }
  const integer = BigInt(value);
  if (integer > MAX_UINT256) throw new Error(`${field}: exceeds uint256.`);
  return integer.toString();
}

function address(value: string, field: string): string {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(value)) {
    throw new Error(
      `${field}: enter a full 20-byte 0x address, not an ENS name or chain-prefixed address.`
    );
  }
  try {
    return getAddress(value);
  } catch {
    throw new Error(`${field}: invalid mixed-case address checksum.`);
  }
}

export function computeSafeTransactionHash(input: SafeTransactionInput) {
  if (input.version !== "1.3.0" && input.version !== "1.4.1") {
    throw new Error(
      "version: only Safe 1.3.0 and 1.4.1 are supported. Older versions use a different domain."
    );
  }
  const chainId = uint256(input.chainId, "chainId");
  if (chainId === "0") throw new Error("chainId: must be positive.");
  const domain = {
    chainId,
    verifyingContract: address(input.safeAddress, "safeAddress"),
  };
  const operation = uint256(input.operation, "operation");
  if (operation !== "0" && operation !== "1")
    throw new Error("operation: use 0 (Call) or 1 (DelegateCall).");
  if (
    typeof input.data !== "string" ||
    input.data.length > 2 + SAFE_DATA_MAX_BYTES * 2 ||
    !/^0x(?:[0-9a-fA-F]{2})*$/.test(input.data)
  ) {
    throw new Error(
      "data: enter even-length 0x hex bytes (0x for empty), at most 128 KiB."
    );
  }
  const message = {
    to: address(input.to, "to"),
    value: uint256(input.value, "value"),
    data: input.data,
    operation,
    safeTxGas: uint256(input.safeTxGas, "safeTxGas"),
    baseGas: uint256(input.baseGas, "baseGas"),
    gasPrice: uint256(input.gasPrice, "gasPrice"),
    gasToken: address(input.gasToken, "gasToken"),
    refundReceiver: address(input.refundReceiver, "refundReceiver"),
    nonce: uint256(input.nonce, "nonce"),
  };
  const typedData = {
    domain,
    types: SAFE_TRANSACTION_TYPES,
    primaryType: "SafeTx",
    message,
  };
  return {
    domainHash: TypedDataEncoder.hashDomain(domain),
    messageHash: TypedDataEncoder.hashStruct(
      "SafeTx",
      SAFE_TRANSACTION_TYPES,
      message
    ),
    safeTxHash: TypedDataEncoder.hash(domain, SAFE_TRANSACTION_TYPES, message),
    typedData,
  };
}
