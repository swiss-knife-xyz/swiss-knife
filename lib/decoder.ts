/**
 * =============================================================================
 * CALLDATA DECODER
 * =============================================================================
 *
 * This module provides comprehensive Ethereum calldata decoding capabilities.
 * It can decode function calls, event logs, and nested data structures.
 *
 * ## Architecture Overview
 *
 * The decoder uses a multi-strategy approach to decode calldata:
 *
 * 1. **ABI-based decoding** (most reliable)
 *    - Uses contract's verified ABI from block explorers
 *    - Provides accurate function names and parameter types
 *
 * 2. **Selector-based decoding** (fallback)
 *    - Looks up function signature from 4byte.directory or Sourcify
 *    - Works when ABI is unavailable but selector is known
 *
 * 3. **Heuristic decoding** (fallback, TOP-LEVEL ONLY)
 *    - Tries to guess the encoding structure
 *    - Can produce false positives, so only used for top-level calldata
 *
 * 4. **UTF-8 text decoding** (final fallback, TOP-LEVEL ONLY)
 *    - Interprets hex bytes as UTF-8 encoded text message
 *    - Validates that result contains mostly printable characters
 *
 * ## Recursive Decoding & Depth Tracking
 *
 * The decoder recursively decodes nested `bytes` parameters, which may contain
 * additional calldata (e.g., Safe multicall, ERC-7821 execute batches).
 *
 * **IMPORTANT**: The `_depth` parameter tracks recursion level:
 * - `_depth = 0`: Top-level calldata (use all decoders including heuristics)
 * - `_depth > 0`: Nested bytes (skip heuristic decoders to prevent false positives)
 *
 * This prevents infinite loops where heuristic decoders incorrectly match
 * arbitrary bytes and produce more bytes to decode endlessly.
 *
 * ## Supported Special Formats
 *
 * - Safe MultiSend transactions (packed bytes format)
 * - ERC-7821 execute batches
 * - Uniswap Universal Router paths and commands
 * - Generic ABI-encoded data
 *
 * =============================================================================
 */

import {
  FetchContractAbiResponse,
  fetchContractAbiResponseSchema,
  fetchFunctionInterface4ByteSchema,
  fetchFunctionInterfaceOpenApiSchema,
} from "@/data/schemas";
import {
  DecodeArrayParamResult,
  DecodeBytesParamResult,
  DecodeParamTypesResult,
  DecodeRecursiveResult,
  DecodeTupleParamResult,
  DecodeEventResult,
  ParsedTransaction,
} from "@/types";
import { fetchContractAbi, startHexWith0x } from "@/utils";
import { guessAbiEncodedData, guessFragment } from "@openchainxyz/abi-guesser";
import {
  AbiCoder,
  FunctionFragment,
  Interface,
  InterfaceAbi,
  ParamType,
  Result,
  TransactionDescription,
  LogDescription,
} from "ethers";
import {
  decodeAbiParameters,
  decodeFunctionData,
  encodeFunctionData,
  Hex,
  hexToBigInt,
  hexToString,
  parseAbi,
} from "viem";

// =============================================================================
// PRIMARY DECODING FUNCTIONS
// =============================================================================

/**
 * Decodes calldata using a contract's verified ABI fetched from block explorers.
 *
 * This is the preferred decoding method when the contract address and chain are known,
 * as it provides the most accurate results with proper function names and parameter types.
 *
 * @param calldata - The hex-encoded calldata to decode
 * @param address - The contract address (used to fetch ABI from explorers)
 * @param chainId - The chain ID where the contract is deployed
 * @param _depth - Recursion depth (0 = top-level, >0 = nested bytes)
 * @returns Decoded transaction description or null if decoding fails
 */
export async function decodeWithAddress({
  calldata,
  address,
  chainId,
  _depth = 0,
}: {
  calldata: string;
  address: string;
  chainId: number;
  _depth?: number;
}): Promise<TransactionDescription | null> {
  console.log(`Decoding calldata with address ${address} on chain ${chainId}`);
  try {
    // Step 1: Fetch the contract's verified ABI from block explorers
    const fetchedAbi = await fetchContractAbi({
      address,
      chainId,
    });

    // Step 2: Try to decode using the fetched ABI
    const decodedFromAbi = decodeWithABI({
      abi: fetchedAbi.abi,
      calldata,
    });

    if (decodedFromAbi) {
      return decodedFromAbi;
    }

    // Step 3: If ABI decode fails (e.g., proxy with different implementation),
    // fall back to selector-based decoding
    console.log(
      `Failed to decode calldata with ABI for contract ${address} on chain ${chainId}, decoding with selector`
    );
    const decodedWithSelector = await decodeWithSelector({ calldata, _depth });
    return decodedWithSelector;
  } catch (error) {
    // If ABI fetch fails entirely, fall back to selector-based decoding
    return decodeWithSelector({ calldata, _depth });
  }
}

/**
 * Decodes calldata by trying multiple decoding strategies in order of reliability.
 *
 * ## Decoding Strategy Order:
 *
 * ### Always Tried (require specific patterns/selectors):
 * 1. ERC-7821 Execute - requires selector 0xe9ae5c53
 * 2. Selector lookup from 4byte/Sourcify - requires matching function signature
 *
 * ### Only for Top-Level (skipped when _depth > 0):
 * These "aggressive" decoders can match arbitrary bytes and cause false positives:
 * 3. Safe MultiSend transactions - parses packed transaction format
 * 4. Universal Router path - parses swap path format
 * 5. ABI-encoded data guessing - uses heuristics
 * 6. Universal Router commands - parses command bytes
 * 7. Function fragment guessing - uses heuristics
 * 8. UTF-8 text message - interprets hex as text (final fallback)
 *
 * @param calldata - The hex-encoded calldata to decode
 * @param _depth - Recursion depth (0 = top-level, >0 = nested bytes)
 * @returns Decoded transaction or null if all strategies fail
 */
export async function decodeWithSelector({
  calldata,
  _depth = 0,
}: {
  calldata: string;
  _depth?: number;
}): Promise<TransactionDescription | any | null> {
  // For nested bytes (depth > 0), only try decoders that require specific selectors.
  // Skip aggressive fallback decoders that can match arbitrary bytes and cause:
  // 1. False positive decodes (random bytes interpreted as valid calldata)
  // 2. Infinite recursion (decoded "calldata" has more bytes that get decoded)
  const isNestedDecode = _depth > 0;

  // Strategy 1: ERC-7821 Execute (requires specific selector 0xe9ae5c53)
  try {
    return decode7821Execute(calldata);
  } catch {
    // Strategy 2: Selector lookup from signature databases
    try {
      return await _decodeWithSelector(calldata);
    } catch {
      // =================================================================
      // AGGRESSIVE FALLBACK DECODERS - Only for top-level calldata
      // These can match arbitrary bytes and must be skipped for nested
      // decoding to prevent false positives and infinite recursion.
      // =================================================================
      if (isNestedDecode) {
        return null;
      }

      // Strategy 3: Safe MultiSend packed transaction format
      try {
        return decodeSafeMultiSendTransactionsParam(calldata);
      } catch {
        // Strategy 4: Uniswap Universal Router swap path
        try {
          return decodeUniversalRouterPath(calldata);
        } catch {
          // Strategy 5: Heuristic ABI-encoded data guessing
          try {
            return decodeABIEncodedData(calldata);
          } catch {
            // Strategy 6: Universal Router command bytes
            try {
              return decodeUniversalRouterCommands(calldata);
            } catch {
                // Strategy 7: Heuristic function fragment guessing
                try {
                  return decodeByGuessingFunctionFragment(calldata);
                } catch {
                  // Strategy 8: UTF-8 text message (final fallback)
                  // Interpret the hex bytes as a UTF-8 encoded text message
                  try {
                    return decodeAsUtf8Text(calldata);
                  } catch {
                    return null;
                  }
                }
            }
          }
        }
      }
    }
  }
}

/**
 * Decodes calldata by looking up the function selector in signature databases.
 *
 * Uses Sourcify's 4byte API (preferred) and 4byte.directory as fallback
 * to find the function signature matching the selector.
 *
 * @param calldata - The hex-encoded calldata (must start with 4-byte selector)
 * @returns Decoded transaction or throws if selector not found
 */
const _decodeWithSelector = async (calldata: string) => {
  const selector = calldata.slice(0, 10); // "0x" + 4 bytes = 10 chars
  console.log(`Decoding calldata with selector ${selector}`);

  // Skip the null selector to avoid spam results
  if (selector === "0x00000000") {
    throw new Error("Skipping to decode calldata with selector 0x00000000");
  }

  try {
    // Look up function signature from signature databases
    const fnInterface = await fetchFunctionInterface({ selector });
    if (!fnInterface) {
      throw new Error("");
    }

    // Try to decode with the found signature
    const decodedTransactions = decodeAllPossibilities({
      functionSignatures: [fnInterface],
      calldata,
    });

    if (decodedTransactions.length === 0) {
      throw new Error("Failed to decode calldata with function signature");
    }

    const result = decodedTransactions[0];
    console.log({ _decodeWithSelector: result });
    return result;
  } catch (error) {
    throw new Error(
      `Failed to find function interface for selector ${selector}`
    );
  }
};

// =============================================================================
// SPECIAL FORMAT DECODERS
// =============================================================================

/**
 * Decodes ERC-7821 execute() calldata.
 *
 * ERC-7821 is a standard for minimal batch executor interface.
 * Selector: 0xe9ae5c53
 * Signature: execute(bytes32 mode, bytes calldata executionData)
 *
 * The executionData contains an array of (to, value, data) tuples.
 *
 * @see https://eips.ethereum.org/EIPS/eip-7821
 */
const decode7821Execute = (calldata: string) => {
  const selector = calldata.slice(0, 10);
  if (selector !== "0xe9ae5c53") {
    throw new Error("Failed to decode calldata as 7821Execute");
  }

  const decodedParams = decodeFunctionData({
    abi: parseAbi([
      "function execute(bytes32 mode, bytes calldata executionData) external",
    ]),
    data: calldata as Hex,
  });
  const mode = decodedParams.args[0];
  const executionData = decodedParams.args[1];

  // Decode the executionData as an array of call tuples
  const calls = decodeAbiParameters(
    [
      {
        type: "tuple[]",
        components: [
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "data", type: "bytes" },
        ],
      },
    ],
    executionData as Hex
  )[0];

  // Format transactions array: [to, value, data]
  const txs = calls.map((call: any) => {
    return [call.to, call.value.toString(), call.data];
  });

  const result = {
    txType: "7821Execute",
    name: "execute",
    args: new Result(txs),
    signature: "execute(bytes32,bytes)",
    selector: selector,
    value: BigInt(0),
    fragment: {
      name: "ERC-7821 execute",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        {
          name: "",
          type: "tuple(uint256,address,uint256,uint256,bytes)[]",
          baseType: "array",
          arrayLength: -1,
          arrayChildren: {
            name: "",
            type: "tuple(uint256,address,uint256,uint256,bytes)",
            baseType: "tuple",
            components: [
              {
                name: "operation",
                type: "uint256",
                baseType: "uint256",
                indexed: null,
                components: null,
                arrayLength: null,
                arrayChildren: null,
              },
              {
                name: "to",
                type: "address",
                indexed: null,
                components: null,
                arrayLength: null,
                arrayChildren: null,
                baseType: "address",
              },
              {
                name: "value",
                type: "uint256",
                indexed: null,
                components: null,
                arrayLength: null,
                arrayChildren: null,
                baseType: "uint256",
              },
              {
                name: "dataLength",
                type: "uint256",
                indexed: null,
                components: null,
                arrayLength: null,
                arrayChildren: null,
                baseType: "uint256",
              },
              {
                name: "data",
                type: "bytes",
                indexed: null,
                components: null,
                arrayLength: null,
                arrayChildren: null,
                baseType: "bytes",
              },
            ],
          },
        },
      ],
      outputs: [],
    },
  };

  console.log({ decode7821Execute: result });
  return result;
};

/**
 * Decodes Safe MultiSend transactions parameter.
 *
 * Safe's MultiSend contract uses a packed encoding format (not standard ABI):
 * - operation: uint8 (1 byte) - 0=CALL, 1=DELEGATECALL
 * - to: address (20 bytes)
 * - value: uint256 (32 bytes)
 * - dataLength: uint256 (32 bytes)
 * - data: bytes (dataLength bytes)
 *
 * Multiple transactions are packed sequentially without padding.
 *
 * @see https://github.com/safe-global/safe-contracts/blob/main/contracts/libraries/MultiSend.sol
 *
 * ⚠️ WARNING: This is an "aggressive" decoder that can match arbitrary bytes.
 * Only use for top-level calldata, not nested bytes.
 */
const decodeSafeMultiSendTransactionsParam = (bytes: string) => {
  console.log("Attempting to decode as SafeMultiSend transactions param");

  try {
    // Remove "0x" prefix for easier byte manipulation
    const transactionsParam = bytes.slice(2);

    const txs: any[] = [];

    let i = 0;
    for (; i < transactionsParam.length; ) {
      // Parse operation (1 byte = 2 hex chars)
      const operationEnd = i + 1 * 2;
      const operation = transactionsParam.slice(i, operationEnd);
      if (operation === "")
        throw new Error(
          "Failed to decode operation in SafeMultiSend transactions param"
        );

      // Parse to address (20 bytes = 40 hex chars)
      const toEnd = operationEnd + 20 * 2;
      const _to = transactionsParam.slice(operationEnd, toEnd);
      if (_to === "")
        throw new Error(
          "Failed to decode to in SafeMultiSend transactions param"
        );
      const to = "0x" + _to;

      // Parse value (32 bytes = 64 hex chars)
      const valueEnd = toEnd + 32 * 2;
      const _value = transactionsParam.slice(toEnd, valueEnd);
      if (_value === "")
        throw new Error(
          "Failed to decode value in SafeMultiSend transactions param"
        );
      const value = hexToBigInt(startHexWith0x(_value)).toString();

      // Parse dataLength (32 bytes = 64 hex chars)
      const dataLengthEnd = valueEnd + 32 * 2;
      const _dataLength = transactionsParam.slice(valueEnd, dataLengthEnd);
      if (_dataLength === "")
        throw new Error(
          "Failed to decode dataLength in SafeMultiSend transactions param"
        );
      const dataLength = hexToBigInt(startHexWith0x(_dataLength)).toString();

      // Parse data (dataLength bytes)
      const dataEnd = dataLengthEnd + parseInt(dataLength) * 2;
      const _data = transactionsParam.slice(dataLengthEnd, dataEnd);
      if (parseInt(dataLength) !== 0 && _data === "")
        throw new Error(
          "Failed to decode data in SafeMultiSend transactions param"
        );
      const data = "0x" + _data;

      txs.push([operation, to, value, dataLength, data]);

      i = dataEnd;
    }

    console.log({ txs, i, transactionsParamLength: transactionsParam.length });

    // Validate that we consumed exactly all bytes
    if (i == 0 || i !== transactionsParam.length) {
      throw new Error(
        `Failed to decode calldata as SafeMultiSend transactions param`
      );
    }

    const result = {
      txType: "safeMultiSend",
      name: "",
      args: new Result(txs),
      signature: "transactions(tuple(uint256,address,uint256,uint256,bytes)[])",
      selector: "",
      value: BigInt(0),
      fragment: {
        name: "SafeMultiSend transactions",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
          {
            name: "",
            type: "tuple(address,uint256,bytes)[]",
            baseType: "array",
            arrayLength: -1,
            arrayChildren: {
              name: "",
              type: "tuple(address,uint256,bytes)",
              baseType: "tuple",
              components: [
                {
                  name: "to",
                  type: "address",
                  indexed: null,
                  components: null,
                  arrayLength: null,
                  arrayChildren: null,
                  baseType: "address",
                },
                {
                  name: "value",
                  type: "uint256",
                  indexed: null,
                  components: null,
                  arrayLength: null,
                  arrayChildren: null,
                  baseType: "uint256",
                },
                {
                  name: "data",
                  type: "bytes",
                  indexed: null,
                  components: null,
                  arrayLength: null,
                  arrayChildren: null,
                  baseType: "bytes",
                },
              ],
            },
          },
        ],
        outputs: [],
      },
    };
    console.log({ decodeSafeMultiSendTransactionsParam: result });
    return result;
  } catch (error) {
    console.error(error);
    throw new Error(
      `Failed to decode calldata as SafeMultiSend transactions param`
    );
  }
};

/**
 * Decodes calldata by guessing the function fragment structure using heuristics.
 *
 * Uses the @openchainxyz/abi-guesser library to analyze the calldata structure
 * and infer the parameter types.
 *
 * ⚠️ WARNING: This is an "aggressive" decoder that can match arbitrary bytes.
 * Only use for top-level calldata, not nested bytes.
 */
const decodeByGuessingFunctionFragment = (calldata: string) => {
  const selector = calldata.slice(0, 10);
  try {
    console.log("Attempting to guess function fragment");
    const frag = guessFragment(calldata);
    if (!frag) {
      throw new Error("Failed to guess function fragment");
    }
    const paramTypes = frag.format();
    const fragment = FunctionFragment.from(paramTypes);
    const abiCoder = AbiCoder.defaultAbiCoder();
    const decoded = abiCoder.decode(
      fragment.inputs,
      "0x" + calldata.substring(10)
    );
    const result = {
      name: "",
      args: decoded,
      signature: `abi.encode${fragment.inputs
        .map((input) => input.type)
        .join(",")}`,
      selector: selector,
      value: BigInt(0),
      fragment,
    } satisfies TransactionDescription;
    console.log({ decodeByGuessingFunctionFragment: result });
    return result;
  } catch (error) {
    console.error(error);
    throw new Error(
      `Failed to decode using guessed function fragment for calldata ${calldata}`
    );
  }
};

/**
 * Decodes ABI-encoded data by guessing the parameter types.
 *
 * Uses the @openchainxyz/abi-guesser library to analyze the encoding structure.
 * Useful for decoding abi.encode() or abi.encodePacked() output.
 *
 * ⚠️ WARNING: This is an "aggressive" decoder that can match arbitrary bytes.
 * Only use for top-level calldata, not nested bytes.
 */
const decodeABIEncodedData = (calldata: string) => {
  const selector = calldata.slice(0, 10);

  try {
    console.log("Attempting to guess ABI encoded data");
    const paramTypes = guessAbiEncodedData(calldata);
    if (!paramTypes) {
      throw new Error("Failed to guess ABI encoded data");
    }
    const abiCoder = AbiCoder.defaultAbiCoder();
    const decoded = abiCoder.decode(paramTypes, calldata);

    // Edge case: decoder sometimes returns the original calldata unchanged
    if (decoded.length === 1 && decoded[0] === calldata) {
      throw new Error("Failed to decode ABI encoded data");
    }

    const result = {
      name: "",
      args: decoded,
      signature: "abi.encode",
      selector: selector,
      value: BigInt(0),
      fragment: FunctionFragment.from({
        inputs: paramTypes,
        name: "__abi_decoded__", // Placeholder name (can't be empty string)
        outputs: [],
        type: "function",
        stateMutability: "nonpayable",
      }),
    } satisfies TransactionDescription;
    console.log({ decodeABIEncodedData: result });
    return result;
  } catch (error) {
    console.error(error);
    throw new Error(
      `Failed to guess ABI encoded data for calldata ${calldata}`
    );
  }
};

/**
 * Decodes Uniswap Universal Router swap path.
 *
 * Path format: tokenA (20 bytes) + fee (3 bytes) + tokenB (20 bytes)
 * Total: 43 bytes = 86 hex chars
 *
 * ⚠️ WARNING: This is an "aggressive" decoder that can match arbitrary bytes
 * of the exact length. Only use for top-level calldata, not nested bytes.
 */
const decodeUniversalRouterPath = (calldata: string) => {
  try {
    const path = calldata.slice(2); // Remove "0x"

    // Parse tokenA (20 bytes = 40 hex chars)
    const tokenAEnd = 20 * 2;
    const tokenA = "0x" + path.slice(0, tokenAEnd);

    // Parse fee (3 bytes = 6 hex chars)
    const feeEnd = tokenAEnd + 3 * 2;
    const fee = hexToBigInt(
      startHexWith0x(path.slice(tokenAEnd, feeEnd))
    ).toString();

    // Parse tokenB (20 bytes = 40 hex chars)
    const tokenBEnd = feeEnd + 20 * 2;
    const tokenB = "0x" + path.slice(feeEnd, tokenBEnd);

    // Validate exact length match
    if (tokenBEnd !== path.length) {
      throw new Error("Failed to decode calldata as UniversalRouter path");
    }

    const result = {
      name: "",
      args: new Result(tokenA, fee, tokenB),
      signature: "path(address,uint24,address)",
      selector: "",
      fragment: {
        name: "path",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
          {
            name: "tokenA",
            type: "address",
            indexed: null,
            components: null,
            arrayLength: null,
            arrayChildren: null,
            baseType: "address",
            _isParamType: true,
          },
          {
            name: "fee",
            type: "uint24",
            indexed: null,
            components: null,
            arrayLength: null,
            arrayChildren: null,
            baseType: "uint24",
            _isParamType: true,
          },
          {
            name: "tokenB",
            type: "address",
            indexed: null,
            components: null,
            arrayLength: null,
            arrayChildren: null,
            baseType: "address",
            _isParamType: true,
          },
        ],
        outputs: [],
      },
    };
    console.log({ decodeUniversalRouterPath: result });
    return result;
  } catch (error) {
    console.error(error);
    throw new Error(`Failed to decode calldata as UniversalRouter path`);
  }
};

/**
 * Decodes Uniswap Universal Router command bytes.
 *
 * Each byte represents a specific command type in the Universal Router.
 * All bytes must be valid command identifiers for decoding to succeed.
 *
 * ⚠️ WARNING: This decoder validates each byte against known commands,
 * but short byte sequences might accidentally match. Only use for
 * top-level calldata, not nested bytes.
 */
const decodeUniversalRouterCommands = (calldata: string) => {
  // Mapping of command byte to human-readable name
  const commandByteToString: { [command: string]: string } = {
    "00": "V3_SWAP_EXACT_IN",
    "01": "V3_SWAP_EXACT_OUT",
    "02": "PERMIT2_TRANSFER_FROM",
    "03": "PERMIT2_PERMIT_BATCH",
    "04": "SWEEP",
    "05": "TRANSFER",
    "06": "PAY_PORTION",
    "08": "V2_SWAP_EXACT_IN",
    "09": "V2_SWAP_EXACT_OUT",
    "0a": "PERMIT2_PERMIT",
    "0b": "WRAP_ETH",
    "0c": "UNWRAP_WETH",
    "0d": "PERMIT2_TRANSFER_FROM_BATCH",
    "0e": "BALANCE_CHECK_ERC20",
    "10": "SEAPORT_V1_5",
    "11": "LOOKS_RARE_V2",
    "12": "NFTX",
    "13": "CRYPTOPUNKS",
    "15": "OWNER_CHECK_721",
    "16": "OWNER_CHECK_1155",
    "17": "SWEEP_ERC721",
    "18": "X2Y2_721",
    "19": "SUDOSWAP",
    "1a": "NFT20",
    "1b": "X2Y2_1155",
    "1c": "FOUNDATION",
    "1d": "SWEEP_ERC1155",
    "1e": "ELEMENT_MARKET",
    "20": "SEAPORT_V1_4",
    "21": "EXECUTE_SUB_PLAN",
    "22": "APPROVE_ERC20",
  };

  try {
    const commandsBytes = calldata.slice(2); // Remove "0x"

    let commands: string[] = [];
    for (let i = 0; i < commandsBytes.length; i += 2) {
      const command = commandByteToString[commandsBytes.slice(i, i + 2)];
      if (command === undefined) {
        throw new Error(
          "Failed to decode calldata as UniversalRouter commands"
        );
      }
      commands.push(command);
    }

    const result = {
      name: "",
      args: new Result(commands),
      signature: "commands(string[])",
      selector: "",
      value: BigInt(0),
      fragment: {
        name: "",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
          {
            name: "commands",
            type: "string[]",
            indexed: null,
            components: null,
            arrayLength: -1,
            arrayChildren: {
              name: null,
              type: "string",
              indexed: null,
              components: null,
              arrayLength: null,
              arrayChildren: null,
              baseType: "string",
              _isParamType: true,
            },
            baseType: "array",
            _isParamType: true,
          },
        ],
        outputs: [],
      },
    };
    console.log({ decodeUniversalRouterCommands: result });
    return result;
  } catch (error) {
    console.error(error);
    throw new Error(`Failed to decode calldata as UniversalRouter path`);
  }
};

/**
 * Decodes hex bytes as a UTF-8 text message.
 *
 * This is the final fallback decoder for calldata that might simply be
 * a text message encoded as hex bytes (e.g., "gm UniV4!" -> 0x676d20556e69563421).
 *
 * Validation criteria:
 * - Must be at least 1 byte
 * - Must successfully decode as UTF-8
 * - Must contain primarily printable ASCII characters (letters, numbers, punctuation, spaces)
 * - Must not be mostly control characters or binary data
 *
 * ⚠️ WARNING: This is the last-resort "aggressive" decoder.
 * Only use for top-level calldata, not nested bytes.
 */
const decodeAsUtf8Text = (calldata: string) => {
  try {
    // Remove "0x" prefix and ensure we have content
    const hexData = calldata.startsWith("0x") ? calldata : `0x${calldata}`;

    if (hexData.length < 4) {
      // Need at least 1 byte (0x + 2 hex chars)
      throw new Error("Calldata too short to be a text message");
    }

    // Decode hex to string
    const text = hexToString(hexData as Hex);

    if (!text || text.length === 0) {
      throw new Error("Empty text after decoding");
    }

    // Validate that the result looks like readable text
    // Count printable ASCII characters (space to tilde, plus common extended chars)
    // Also allow newlines, tabs, and common UTF-8 characters
    const printableCount = [...text].filter((char) => {
      const code = char.charCodeAt(0);
      // Printable ASCII (32-126), tab (9), newline (10), carriage return (13)
      // Also allow common UTF-8 characters (code > 127 but valid unicode)
      return (
        (code >= 32 && code <= 126) ||
        code === 9 ||
        code === 10 ||
        code === 13 ||
        code > 127
      );
    }).length;

    const printableRatio = printableCount / text.length;

    // Require at least 80% printable characters to consider it valid text
    if (printableRatio < 0.8) {
      throw new Error(
        `Low printable character ratio (${(printableRatio * 100).toFixed(1)}%)`
      );
    }

    // Also reject if it contains null bytes (common in binary data)
    if (text.includes("\0")) {
      throw new Error("Contains null bytes - likely binary data");
    }

    console.log(`Decoded as UTF-8 text: "${text}"`);

    const result = {
      txType: "utf8TextMessage",
      name: "UTF-8 Text Message",
      args: new Result(text),
      signature: "text(string)",
      selector: "",
      value: BigInt(0),
      fragment: {
        name: "UTF-8 Text Message",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
          {
            name: "text",
            type: "string",
            indexed: null,
            components: null,
            arrayLength: null,
            arrayChildren: null,
            baseType: "string",
            _isParamType: true,
          },
        ],
        outputs: [],
      },
    };

    console.log({ decodeAsUtf8Text: result });
    return result;
  } catch (error) {
    console.error(error);
    throw new Error(`Failed to decode calldata as UTF-8 text message`);
  }
};

// =============================================================================
// FUNCTION SIGNATURE LOOKUP
// =============================================================================

/**
 * Fetches function signature from signature databases given a 4-byte selector.
 *
 * Tries Sourcify's database first (higher quality, filters spam),
 * then falls back to 4byte.directory.
 *
 * @param selector - The 4-byte function selector (e.g., "0x12345678")
 * @returns Function signature string or null if not found
 */
export async function fetchFunctionInterface({
  selector,
}: {
  selector: string;
}): Promise<string | null> {
  // Try Sourcify first (preferred - filters spam signatures)
  const sourcifyData = await fetchFunctionFromSourcify({ selector });

  let result: string | null = null;
  if (sourcifyData) {
    result = sourcifyData[0].name;
  } else {
    // Fallback to 4byte.directory
    const fourByteData = await fetchFunctionFrom4Bytes({ selector });
    if (fourByteData) {
      result = fourByteData[0].text_signature;
    }
  }

  return result;
}

/**
 * Fetches function signature from Sourcify's 4byte API.
 */
async function fetchFunctionFromSourcify({ selector }: { selector: string }) {
  try {
    const requestUrl = new URL(
      "https://api.4byte.sourcify.dev/signature-database/v1/lookup"
    );
    requestUrl.searchParams.append("function", selector);
    const response = await fetch(requestUrl);
    const data = await response.json();
    const parsedData = fetchFunctionInterfaceOpenApiSchema.parse(data);
    if (!parsedData.ok) {
      throw new Error(
        `Sourcify 4byte API failed to find function interface with selector ${selector}`
      );
    }
    return parsedData.result.function[selector];
  } catch (error) {
    console.error(error);
    return null;
  }
}

/**
 * Fetches function signature from 4byte.directory.
 */
async function fetchFunctionFrom4Bytes({ selector }: { selector: string }) {
  try {
    const requestUrl = new URL(
      "https://www.4byte.directory/api/v1/signatures/"
    );
    requestUrl.searchParams.append("hex_signature", selector);
    const response = await fetch(requestUrl);
    const data = await response.json();
    const parsedData = fetchFunctionInterface4ByteSchema.parse(data);
    if (parsedData.count === 0) {
      throw new Error(
        `4bytes API failed to find function interface with selector ${selector}`
      );
    }
    return parsedData.results;
  } catch (error) {
    console.error(error);
    return null;
  }
}

// =============================================================================
// ABI-BASED DECODING UTILITIES
// =============================================================================

/**
 * Tries to decode calldata with multiple function signatures.
 *
 * @param functionSignatures - Array of function signatures to try
 * @param calldata - The calldata to decode
 * @returns Array of successful decode results
 */
function decodeAllPossibilities({
  functionSignatures,
  calldata,
}: {
  functionSignatures: string[];
  calldata: string;
}) {
  const results: TransactionDescription[] = [];
  for (const signature of functionSignatures) {
    console.log(`Decoding calldata with signature ${signature}`);
    try {
      const parsedTransaction = decodeWithABI({
        abi: [`function ${signature}`],
        calldata,
      });
      if (parsedTransaction) {
        results.push(parsedTransaction);
      }
    } catch (error) {
      console.error(
        `Failed to decode calldata with signature ${signature}, skipping`
      );
    }
  }
  console.log(`Decoded calldata with ${results.length} signatures`);
  return results;
}

/**
 * Decodes calldata using a provided ABI.
 *
 * This is the most reliable decoding method when the exact ABI is known.
 *
 * @param abi - The contract ABI (can be full ABI or just the function definition)
 * @param calldata - The hex-encoded calldata
 * @returns Decoded transaction description or null
 */
export function decodeWithABI({
  abi,
  calldata,
}: {
  abi: InterfaceAbi;
  calldata: string;
}): TransactionDescription | null {
  const abiInterface = new Interface(abi);
  const parsedTransaction = abiInterface.parseTransaction({ data: calldata });
  return parsedTransaction;
}

/**
 * Decodes event log data using a provided ABI.
 *
 * @param abi - The contract ABI containing event definitions
 * @param topics - Array of log topics (first is event signature hash)
 * @param data - The log data (non-indexed parameters)
 * @returns Decoded log description or null
 */
export function decodeEventWithABI({
  abi,
  topics,
  data,
}: {
  abi: InterfaceAbi;
  topics: string[];
  data: string;
}): LogDescription | null {
  try {
    const abiInterface = new Interface(abi);
    const parsedEvent = abiInterface.parseLog({ topics, data });
    return parsedEvent;
  } catch {
    return null;
  }
}

// =============================================================================
// RECURSIVE DECODING (Main Entry Point)
// =============================================================================

/**
 * Recursively decodes calldata, including nested bytes parameters.
 *
 * This is the main entry point for the decoder. It:
 * 1. Decodes the top-level function call
 * 2. Recursively decodes any `bytes` parameters that might contain calldata
 * 3. Handles special formats (Safe MultiSend, ERC-7821) with their nested calls
 *
 * ## Depth Tracking
 *
 * The `_depth` parameter is crucial for preventing infinite loops:
 * - At depth 0 (top-level): All decoding strategies are available
 * - At depth > 0 (nested): Heuristic decoders are skipped to prevent false positives
 *
 * @param calldata - The hex-encoded calldata to decode
 * @param address - Optional contract address for ABI lookup
 * @param chainId - Optional chain ID for ABI lookup
 * @param abi - Optional ABI to use directly (skips lookup)
 * @param encodedAbi - Optional encoded ABI for special formats
 * @param _depth - Current recursion depth (default 0, do not set manually)
 * @returns Decoded result with function name, signature, and decoded arguments
 */
export async function decodeRecursive({
  calldata,
  address,
  chainId,
  abi,
  encodedAbi,
  _depth = 0,
}: {
  calldata: string;
  address?: string;
  chainId?: number;
  abi?: any;
  encodedAbi?: any;
  _depth?: number;
}): Promise<DecodeRecursiveResult> {
  // Step 1: Decode the function call using the best available method
  let parsedTransaction: ParsedTransaction | null;

  if (encodedAbi) {
    // Use the provided encoded ABI (for special formats like SafeMultiSend)
    parsedTransaction = decodeWithABI({ abi: encodedAbi, calldata });
  } else if (abi) {
    // Use the provided ABI directly
    parsedTransaction = decodeWithABI({ abi, calldata });
  } else if (address && chainId) {
    // Fetch ABI from explorers and decode
    parsedTransaction = await decodeWithAddress({ calldata, address, chainId, _depth });
  } else {
    // Fall back to selector-based decoding
    parsedTransaction = await decodeWithSelector({ calldata, _depth });
  }

  // Step 2: Process the decoded result and recursively decode nested bytes
  if (parsedTransaction) {
    // Special handling for Safe MultiSend - decode each inner transaction
    if (parsedTransaction.txType === "safeMultiSend") {
      return {
        functionName: parsedTransaction.fragment.name,
        signature: parsedTransaction.signature,
        rawArgs: parsedTransaction.args,
        args: await Promise.all(
          parsedTransaction.args[0].map(async (tx: string[], i: number) => {
            const operation = tx[0];
            const to = tx[1];
            const value = tx[2];
            const calldata = tx[4];

            // Map operation codes to human-readable names
            const operationIdToName: { [key: number]: string } = {
              0: "CALL",
              1: "DELEGATECALL",
              2: "CREATE",
            };

            // Re-encode the transaction for recursive decoding
            const encodedAbi = [
              {
                name: "tx",
                type: "function",
                stateMutability: "nonpayable",
                inputs: [
                  { name: "OperationType", type: "string" },
                  { name: "to", type: "address" },
                  { name: "value", type: "uint256" },
                  { name: "calldata", type: "bytes" },
                ],
                outputs: [],
              },
            ] as const;

            const encodedCalldata = await encodeFunctionData({
              abi: encodedAbi,
              functionName: "tx",
              args: [
                operationIdToName[Number(operation)],
                to as Hex,
                BigInt(value),
                calldata as Hex,
              ],
            });

            const fragment = FunctionFragment.from({
              name: "tx",
              type: "function",
              stateMutability: "nonpayable",
              inputs: [{ name: "encodedCalldata", type: "bytes" }],
              outputs: [],
            });

            return {
              name: `tx #${i}`,
              baseType: "bytes",
              type: "bytes",
              rawValue: `${to}, ${value}, ${calldata}`,
              value: await decodeParamTypes({
                input: fragment.inputs[0],
                value: encodedCalldata,
                address: to,
                chainId,
                encodedAbi,
                _depth,
              }),
            };
          })
        ),
      };
    }

    // Special handling for ERC-7821 Execute - decode each inner transaction
    else if (parsedTransaction.txType === "7821Execute") {
      return {
        functionName: parsedTransaction.fragment.name,
        signature: parsedTransaction.signature,
        rawArgs: parsedTransaction.args,
        args: await Promise.all(
          parsedTransaction.args[0].map(async (tx: string[], i: number) => {
            const to = tx[0];
            const value = tx[1];
            const calldata = tx[2];

            // Re-encode the transaction for recursive decoding
            const encodedAbi = [
              {
                name: "tx",
                type: "function",
                stateMutability: "nonpayable",
                inputs: [
                  { name: "to", type: "address" },
                  { name: "value", type: "uint256" },
                  { name: "calldata", type: "bytes" },
                ],
                outputs: [],
              },
            ] as const;

            const encodedCalldata = await encodeFunctionData({
              abi: encodedAbi,
              functionName: "tx",
              args: [to as Hex, BigInt(value), calldata as Hex],
            });

            const fragment = FunctionFragment.from({
              name: "tx",
              type: "function",
              stateMutability: "nonpayable",
              inputs: [{ name: "encodedCalldata", type: "bytes" }],
              outputs: [],
            });

            return {
              name: `tx #${i}`,
              baseType: "bytes",
              type: "bytes",
              rawValue: `${to}, ${value}, ${calldata}`,
              value: await decodeParamTypes({
                input: fragment.inputs[0],
                value: encodedCalldata,
                address: to,
                chainId,
                encodedAbi,
                _depth,
              }),
            };
          })
        ),
      };
    }

    // Standard function call - recursively decode each parameter
    else {
      return {
        functionName: parsedTransaction.fragment.name,
        signature: parsedTransaction.signature,
        rawArgs: parsedTransaction.args,
        args: await Promise.all(
          parsedTransaction.fragment.inputs.map(async (input, i) => {
            const value = parsedTransaction!.args[i];

            return {
              name: input.name,
              baseType: input.baseType,
              type: input.type,
              rawValue: value,
              value: await decodeParamTypes({
                input,
                value,
                address,
                chainId,
                abi,
                _depth,
              }),
            };
          })
        ),
      };
    }
  } else {
    return null;
  }
}

// =============================================================================
// EVENT LOG DECODING
// =============================================================================

/**
 * Decodes Ethereum event logs for a contract.
 *
 * Fetches the contract's ABI and decodes all matching event logs.
 *
 * @param logs - Array of log objects with topics and data
 * @param chainId - Chain ID where the contract is deployed
 * @param address - Contract address for ABI lookup
 * @returns Array of decoded event objects
 */
export async function decodeEvents({
  logs,
  chainId,
  address,
}: {
  logs: Array<{ topics: string[]; data: string }>;
  chainId: number;
  address: string;
}): Promise<DecodeEventResult[]> {
  let fetchedAbi;

  try {
    fetchedAbi = await fetchContractAbi({ address, chainId });
  } catch (error) {
    console.log("Failed to fetch contract ABI:", error);
    return [];
  }

  const decodedEvents: DecodeEventResult[] = [];

  for (const log of logs) {
    try {
      const decodedEvent = decodeEventWithABI({
        abi: fetchedAbi.abi,
        topics: log.topics,
        data: log.data,
      });

      if (!decodedEvent) continue;

      const fragment = decodedEvent.fragment;

      // Recursively decode event parameters
      const args = await Promise.all(
        fragment.inputs.map(async (input, i) => {
          const rawValue = decodedEvent.args[i];

          return {
            name: input.name,
            baseType: input.baseType,
            type: input.type,
            rawValue,
            value: await decodeParamTypes({
              input,
              value: rawValue,
              address,
              chainId,
              abi: fetchedAbi.abi,
            }),
          };
        })
      );

      decodedEvents.push({
        eventName: decodedEvent.name,
        signature: decodedEvent.signature,
        args,
      });
    } catch (error) {
      console.log("Failed to decode event log:", error);
      continue;
    }
  }

  return decodedEvents;
}

// =============================================================================
// PARAMETER TYPE DECODERS
// =============================================================================

/**
 * Recursively decodes a function parameter based on its type.
 *
 * Handles all Solidity types:
 * - Primitives: int/uint (formatted as string), address, bool, string
 * - Complex: bytes (recursively decoded), tuple, array
 *
 * @param input - The parameter type definition from ABI
 * @param value - The decoded value to process
 * @param address - Contract address for nested calldata decoding
 * @param chainId - Chain ID for nested calldata decoding
 * @param abi - ABI for nested calldata decoding
 * @param encodedAbi - Encoded ABI for special formats
 * @param _depth - Current recursion depth
 */
const decodeParamTypes = async ({
  input,
  value,
  address,
  chainId,
  abi,
  encodedAbi,
  _depth = 0,
}: {
  input: ParamType;
  value: any;
  address?: string;
  chainId?: number;
  abi?: any;
  encodedAbi?: any;
  _depth?: number;
}): Promise<DecodeParamTypesResult> => {
  // Integer types (int8-256, uint8-256) - format as string for display
  if (input.baseType.includes("int")) {
    return BigInt(value).toString();
  }

  // Address type - return as-is
  else if (input.baseType === "address") {
    return value;
  }

  // Bytes types (bytes, bytes1-32) - try to decode as nested calldata
  else if (input.baseType.includes("bytes")) {
    return await decodeBytesParam({ value, address, chainId, abi, encodedAbi, _depth });
  }

  // Tuple type - recursively decode each component
  else if (input.baseType === "tuple") {
    return await decodeTupleParam({ input, value, address, chainId, abi, _depth });
  }

  // Array type - recursively decode each element
  else if (input.baseType === "array") {
    return await decodeArrayParam({ value, input, address, chainId, abi, _depth });
  }

  // Other types (bool, string, etc.) - return as-is
  else {
    return value;
  }
};

/**
 * Decodes a bytes parameter by attempting to decode it as nested calldata.
 *
 * This is where recursive decoding happens - bytes parameters might contain
 * additional function calls that need to be decoded.
 *
 * @param value - The bytes value (hex string)
 * @param _depth - Current recursion depth (incremented for nested decode)
 */
const decodeBytesParam = async ({
  value,
  address,
  chainId,
  abi,
  encodedAbi,
  _depth = 0,
}: {
  value: any;
  address?: string;
  chainId?: number;
  abi?: any;
  encodedAbi?: any;
  _depth?: number;
}): Promise<DecodeBytesParamResult> => {
  return {
    // Attempt to decode the bytes as calldata, incrementing depth
    decoded: await decodeRecursive({
      calldata: value,
      address,
      chainId,
      abi,
      encodedAbi,
      _depth: _depth + 1, // Increment depth for nested decoding
    }),
  };
};

/**
 * Decodes a tuple parameter by recursively decoding each component.
 *
 * @param input - The tuple type definition with components
 * @param value - The decoded tuple value (array of component values)
 */
const decodeTupleParam = async ({
  input,
  value,
  address,
  chainId,
  abi,
  _depth = 0,
}: {
  input: ParamType;
  value: any;
  address?: string;
  chainId?: number;
  abi?: any;
  _depth?: number;
}): Promise<DecodeTupleParamResult> => {
  if (!input.components) {
    return null;
  }
  if (input.components.length === 0) {
    return null;
  }

  // Decode each component of the tuple
  return await Promise.all(
    input.components.map(async (component, i) => {
      return {
        name: component.name,
        baseType: component.baseType,
        type: component.type,
        rawValue: value[i],
        value: await decodeParamTypes({
          input: component,
          value: value[i],
          address,
          chainId,
          abi,
          _depth,
        }),
      };
    })
  );
};

/**
 * Decodes an array parameter by recursively decoding each element.
 *
 * @param input - The array type definition with arrayChildren
 * @param value - The decoded array value
 */
const decodeArrayParam = async ({
  value,
  input,
  address,
  chainId,
  abi,
  _depth = 0,
}: {
  value: any;
  input: ParamType;
  address?: string;
  chainId?: number;
  abi?: any;
  _depth?: number;
}): Promise<DecodeArrayParamResult> => {
  if (!Array.isArray(value) || value.length === 0) {
    return [];
  }

  // Decode each element of the array
  return await Promise.all(
    value.map(async (v: any) => {
      return {
        name: input.arrayChildren!.name,
        baseType: input.arrayChildren!.baseType,
        type: input.arrayChildren!.type,
        rawValue: v,
        value: await decodeParamTypes({
          input: input.arrayChildren!,
          value: v,
          address,
          chainId,
          abi,
          _depth,
        }),
      };
    })
  );
};
