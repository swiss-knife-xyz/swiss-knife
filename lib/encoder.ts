/**
 * =============================================================================
 * CALLDATA ENCODER
 * =============================================================================
 *
 * Pure encoding functions for Ethereum calldata. This is the reverse of decoder.ts.
 * Supports standard ABI encoding, packed encoding, function calldata encoding,
 * constructor encoding, and Safe MultiSend packed format.
 */

import {
  Abi,
  AbiParameter,
  Hex,
  concat,
  encodeAbiParameters,
  encodeFunctionData,
  encodePacked,
  numberToHex,
  pad,
  size,
  toHex,
} from "viem";

// =============================================================================
// TYPES
// =============================================================================

export interface SafeMultiSendTx {
  operation: 0 | 1; // 0 = CALL, 1 = DELEGATECALL
  to: string;
  value: string;
  data: string;
}

// =============================================================================
// STANDARD ABI ENCODING
// =============================================================================

/**
 * Encodes values using standard ABI encoding (abi.encode).
 *
 * @param params - Array of ABI parameter definitions with types
 * @param values - Array of values matching the parameter types
 * @returns ABI-encoded hex string
 */
export function encodeStandard(
  params: readonly AbiParameter[],
  values: any[]
): Hex {
  return encodeAbiParameters(params, values);
}

// =============================================================================
// PACKED ENCODING
// =============================================================================

/**
 * Encodes values using Solidity packed encoding (abi.encodePacked).
 * Packed encoding does not pad values and is not ABI-decodable.
 *
 * @param types - Array of Solidity type strings (e.g. ["address", "uint256"])
 * @param values - Array of values matching the types
 * @returns Packed-encoded hex string
 */
export function encodePackedParams(
  types: readonly string[],
  values: any[]
): Hex {
  return encodePacked(
    types as any,
    values
  );
}

// =============================================================================
// FUNCTION CALLDATA ENCODING
// =============================================================================

/**
 * Encodes a function call with its arguments (4-byte selector + ABI-encoded args).
 *
 * @param abi - Contract ABI
 * @param functionName - Name of the function to encode
 * @param args - Function arguments
 * @returns Full calldata (selector + encoded args)
 */
export function encodeFunction(
  abi: Abi,
  functionName: string,
  args: any[]
): Hex {
  return encodeFunctionData({
    abi,
    functionName,
    args,
  });
}

// =============================================================================
// MANUAL FUNCTION CALLDATA ENCODING
// =============================================================================

/**
 * Encodes a function call from a manually specified function name and typed params.
 * Builds a minimal ABI on the fly and uses encodeFunctionData.
 *
 * @param functionName - The function name (e.g. "transfer")
 * @param params - Array of { type, value } for each param
 * @returns Full calldata (4-byte selector + ABI-encoded args)
 */
export interface ManualParamType {
  type: string;
  name: string;
  components?: readonly ManualParamType[];
}

export function encodeFunctionManual(
  functionName: string,
  types: readonly ManualParamType[],
  values: any[]
): Hex {
  const buildInput = (t: ManualParamType): any => ({
    name: t.name || "",
    type: t.type,
    ...(t.components?.length
      ? { components: t.components.map(buildInput) }
      : {}),
  });

  const abi = [
    {
      name: functionName,
      type: "function" as const,
      stateMutability: "nonpayable" as const,
      inputs: types.map(buildInput),
      outputs: [],
    },
  ];

  return encodeFunctionData({
    abi,
    functionName,
    args: values,
  });
}

// =============================================================================
// CONSTRUCTOR ENCODING
// =============================================================================

/**
 * Encodes constructor arguments (no selector, just ABI-encoded args).
 * This is appended to the contract bytecode during deployment.
 *
 * @param constructorInputs - Constructor parameter ABI definitions
 * @param args - Constructor arguments
 * @returns ABI-encoded constructor arguments
 */
export function encodeConstructorArgs(
  constructorInputs: readonly AbiParameter[],
  args: any[]
): Hex {
  return encodeAbiParameters(constructorInputs, args);
}

// =============================================================================
// SAFE MULTISEND ENCODING
// =============================================================================

/**
 * Encodes transactions in Safe MultiSend packed format.
 *
 * Each transaction is packed as:
 * - operation: uint8 (1 byte) - 0=CALL, 1=DELEGATECALL
 * - to: address (20 bytes)
 * - value: uint256 (32 bytes)
 * - dataLength: uint256 (32 bytes)
 * - data: bytes (dataLength bytes)
 *
 * The packed transactions are then wrapped in multiSend(bytes) calldata.
 *
 * @param txs - Array of transactions to encode
 * @returns Full multiSend calldata (selector + encoded packed bytes)
 *
 * @see https://github.com/safe-global/safe-contracts/blob/main/contracts/libraries/MultiSend.sol
 */
export function encodeSafeMultiSend(txs: SafeMultiSendTx[]): Hex {
  // Pack each transaction
  const packedParts: Hex[] = [];

  for (const tx of txs) {
    const dataHex = (tx.data.startsWith("0x") ? tx.data : `0x${tx.data}`) as Hex;
    const dataSize = size(dataHex);

    // operation (1 byte)
    const operationByte = numberToHex(tx.operation, { size: 1 });
    // to (20 bytes)
    const toBytes = pad(tx.to as Hex, { size: 20 });
    // value (32 bytes)
    const valueBytes = numberToHex(BigInt(tx.value || "0"), { size: 32 });
    // dataLength (32 bytes)
    const dataLengthBytes = numberToHex(dataSize, { size: 32 });

    packedParts.push(
      concat([operationByte, toBytes, valueBytes, dataLengthBytes, dataHex])
    );
  }

  const packedTransactions = concat(packedParts);

  // Wrap in multiSend(bytes) call
  const multiSendAbi = [
    {
      name: "multiSend",
      type: "function",
      stateMutability: "payable",
      inputs: [{ name: "transactions", type: "bytes" }],
      outputs: [],
    },
  ] as const;

  return encodeFunctionData({
    abi: multiSendAbi,
    functionName: "multiSend",
    args: [packedTransactions],
  });
}
