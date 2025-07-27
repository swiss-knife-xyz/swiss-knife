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
} from "ethers";
import {
  decodeAbiParameters,
  decodeFunctionData,
  encodeFunctionData,
  Hex,
  hexToBigInt,
  parseAbi,
} from "viem";

export async function decodeWithAddress({
  calldata,
  address,
  chainId,
}: {
  calldata: string;
  address: string;
  chainId: number;
}): Promise<TransactionDescription | null> {
  console.log(`Decoding calldata with address ${address} on chain ${chainId}`);
  try {
    const fetchedAbi = await fetchContractAbi({
      address,
      chainId,
    });
    const decodedFromAbi = decodeWithABI({
      abi: fetchedAbi.abi,
      calldata,
    });
    if (decodedFromAbi) {
      return decodedFromAbi;
    }
    console.log(
      `Failed to decode calldata with ABI for contract ${address} on chain ${chainId}, decoding with selector`
    );
    const decodedWithSelector = await decodeWithSelector({ calldata });
    return decodedWithSelector;
  } catch (error) {
    // fallback to decoding with selector
    return decodeWithSelector({ calldata });
  }
}

export async function decodeWithSelector({
  calldata,
}: {
  calldata: string;
}): Promise<TransactionDescription | any | null> {
  try {
    return decode7821Execute(calldata);
  } catch {
    try {
      return await _decodeWithSelector(calldata);
    } catch {
      try {
        return decodeSafeMultiSendTransactionsParam(calldata);
      } catch {
        try {
          return decodeUniversalRouterPath(calldata);
        } catch {
          try {
            return decodeABIEncodedData(calldata);
          } catch {
            try {
              return decodeUniversalRouterCommands(calldata);
            } catch {
              try {
                return decodeByGuessingFunctionFragment(calldata);
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

const _decodeWithSelector = async (calldata: string) => {
  const selector = calldata.slice(0, 10);
  console.log(`Decoding calldata with selector ${selector}`);
  try {
    // tries to find function signature from openchain and 4bytes
    const fnInterface = await fetchFunctionInterface({ selector });
    if (!fnInterface) {
      throw new Error("");
    }
    // decodes calldata with all possible function signatures
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

  // Format transactions array for 7821Execute
  // [to, value, data]
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

// multiSend function: https://etherscan.io/address/0x40a2accbd92bca938b02010e17a5b8929b49130d#code#F1#L21
const decodeSafeMultiSendTransactionsParam = (bytes: string) => {
  console.log("Attempting to decode as SafeMultiSend transactions param");

  try {
    // remove initial "0x"
    const transactionsParam = bytes.slice(2);

    const txs: any[] = [];

    let i = 0;
    for (; i < transactionsParam.length; ) {
      const operationEnd = i + 1 * 2; // uint8
      const operation = transactionsParam.slice(i, operationEnd);
      if (operation === "")
        throw new Error(
          "Failed to decode operation in SafeMultiSend transactions param"
        );

      const toEnd = operationEnd + 20 * 2; // address
      const _to = transactionsParam.slice(operationEnd, toEnd);
      if (_to === "")
        throw new Error(
          "Failed to decode to in SafeMultiSend transactions param"
        );
      const to = "0x" + _to;

      const valueEnd = toEnd + 32 * 2; // uint256
      const _value = transactionsParam.slice(toEnd, valueEnd);
      if (_value === "")
        throw new Error(
          "Failed to decode value in SafeMultiSend transactions param"
        );
      const value = hexToBigInt(startHexWith0x(_value)).toString();

      const dataLengthEnd = valueEnd + 32 * 2; // uint256
      const _dataLength = transactionsParam.slice(valueEnd, dataLengthEnd);
      if (_dataLength === "")
        throw new Error(
          "Failed to decode dataLength in SafeMultiSend transactions param"
        );
      const dataLength = hexToBigInt(startHexWith0x(_dataLength)).toString();

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
    if (i == 0 || i !== transactionsParam.length) {
      // for cases where the calldata is not encoded safe multisend
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
    if (decoded.length === 1 && decoded[0] === calldata) {
      // handling edge case where abiCoder.decode returns the same calldata
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
        name: "__abi_decoded__", // can't set name = "" here
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

const decodeUniversalRouterPath = (calldata: string) => {
  try {
    // remove initial "0x"
    const path = calldata.slice(2);

    const tokenAEnd = 20 * 2; // address
    const tokenA = "0x" + path.slice(0, tokenAEnd);

    const feeEnd = tokenAEnd + 3 * 2; // uint24
    const fee = hexToBigInt(
      startHexWith0x(path.slice(tokenAEnd, feeEnd))
    ).toString();

    const tokenBEnd = feeEnd + 20 * 2; // address
    const tokenB = "0x" + path.slice(feeEnd, tokenBEnd);

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

const decodeUniversalRouterCommands = (calldata: string) => {
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
    // remove initial "0x"
    const commandsBytes = calldata.slice(2);

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

export async function fetchFunctionInterface({
  selector,
}: {
  selector: string;
}): Promise<string | null> {
  const openChainData = await fetchFunctionFromOpenchain({ selector });

  let result: string | null = null;
  // giving priority to openchain data because it filters spam like: `mintEfficientN2M_001Z5BWH` for 0x00000000
  if (openChainData) {
    result = openChainData[0].name;
  } else {
    const fourByteData = await fetchFunctionFrom4Bytes({ selector });
    if (fourByteData) {
      result = fourByteData[0].text_signature;
    }
  }

  return result;
}

async function fetchFunctionFromOpenchain({ selector }: { selector: string }) {
  try {
    const requestUrl = new URL(
      "https://api.openchain.xyz/signature-database/v1/lookup"
    );
    requestUrl.searchParams.append("function", selector);
    const response = await fetch(requestUrl);
    const data = await response.json();
    const parsedData = fetchFunctionInterfaceOpenApiSchema.parse(data);
    if (!parsedData.ok) {
      throw new Error(
        `Openchain API failed to find function interface with selector ${selector}`
      );
    }
    return parsedData.result.function[selector];
  } catch (error) {
    console.error(error);
    return null;
  }
}

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

export async function decodeRecursive({
  calldata,
  address,
  chainId,
  abi,
  encodedAbi,
}: {
  calldata: string;
  address?: string;
  chainId?: number;
  abi?: any;
  encodedAbi?: any;
}): Promise<DecodeRecursiveResult> {
  let parsedTransaction: ParsedTransaction | null;
  if (encodedAbi) {
    parsedTransaction = decodeWithABI({ abi: encodedAbi, calldata });
  } else if (abi) {
    parsedTransaction = decodeWithABI({ abi, calldata });
  } else if (address && chainId) {
    parsedTransaction = await decodeWithAddress({ calldata, address, chainId });
  } else {
    parsedTransaction = await decodeWithSelector({ calldata });
  }

  console.log({ parsedTransaction });

  // separate decoding for SafeMultiSend and 7821Execute, using the `to` address to decode individual the calldatas
  if (parsedTransaction) {
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

            const operationIdToName: { [key: number]: string } = {
              0: "CALL",
              1: "DELEGATECALL",
              2: "CREATE",
            };

            // encode to and calldata into new calldata
            const encodedAbi = [
              {
                name: "tx",
                type: "function",
                stateMutability: "nonpayable",
                inputs: [
                  {
                    name: "OperationType",
                    type: "string",
                  },
                  {
                    name: "to",
                    type: "address",
                  },
                  {
                    name: "value",
                    type: "uint256",
                  },
                  {
                    name: "calldata",
                    type: "bytes",
                  },
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
              inputs: [
                {
                  name: "encodedCalldata",
                  type: "bytes",
                },
              ],
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
              }),
            };
          })
        ),
      };
    } else if (parsedTransaction.txType === "7821Execute") {
      return {
        functionName: parsedTransaction.fragment.name,
        signature: parsedTransaction.signature,
        rawArgs: parsedTransaction.args,
        args: await Promise.all(
          parsedTransaction.args[0].map(async (tx: string[], i: number) => {
            const to = tx[0];
            const value = tx[1];
            const calldata = tx[2];

            // encode to and calldata into new calldata
            const encodedAbi = [
              {
                name: "tx",
                type: "function",
                stateMutability: "nonpayable",
                inputs: [
                  {
                    name: "to",
                    type: "address",
                  },
                  {
                    name: "value",
                    type: "uint256",
                  },
                  {
                    name: "calldata",
                    type: "bytes",
                  },
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
              inputs: [
                {
                  name: "encodedCalldata",
                  type: "bytes",
                },
              ],
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
              }),
            };
          })
        ),
      };
    } else {
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

const decodeParamTypes = async ({
  input,
  value,
  address,
  chainId,
  abi,
  encodedAbi,
}: {
  input: ParamType;
  value: any;
  address?: string;
  chainId?: number;
  abi?: any;
  encodedAbi?: any;
}): Promise<DecodeParamTypesResult> => {
  if (input.baseType.includes("int")) {
    // covers uint
    return BigInt(value).toString();
  } else if (input.baseType === "address") {
    return value;
  } else if (input.baseType.includes("bytes")) {
    return await decodeBytesParam({ value, address, chainId, abi, encodedAbi });
  } else if (input.baseType === "tuple") {
    return await decodeTupleParam({ input, value, address, chainId, abi });
  } else if (input.baseType === "array") {
    return await decodeArrayParam({ value, input, address, chainId, abi });
  } else {
    return value;
  }
};

const decodeBytesParam = async ({
  value,
  address,
  chainId,
  abi,
  encodedAbi,
}: {
  value: any;
  address?: string;
  chainId?: number;
  abi?: any;
  encodedAbi?: any;
}): Promise<DecodeBytesParamResult> => {
  console.log("decoding bytes param", {
    callData: value,
    address,
    chainId,
    abi,
  });
  return {
    decoded: await decodeRecursive({
      calldata: value,
      address,
      chainId,
      abi,
      encodedAbi,
    }),
  };
};

const decodeTupleParam = async ({
  input,
  value,
  address,
  chainId,
  abi,
}: {
  input: ParamType;
  value: any;
  address?: string;
  chainId?: number;
  abi?: any;
}): Promise<DecodeTupleParamResult> => {
  if (!input.components) {
    return null;
  }
  if (input.components.length === 0) {
    return null;
  }

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
        }),
      };
    })
  );
};

const decodeArrayParam = async ({
  value,
  input,
  address,
  chainId,
  abi,
}: {
  value: any;
  input: ParamType;
  address?: string;
  chainId?: number;
  abi?: any;
}): Promise<DecodeArrayParamResult> => {
  if (!Array.isArray(value) || value.length === 0) {
    return [];
  }
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
        }),
      };
    })
  );
};
