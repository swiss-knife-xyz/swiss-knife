import {
  FetchContractAbiResponse,
  fetchContractAbiResponseSchema,
  fetchFunctionInterface4ByteSchema,
  fetchFunctionInterfaceOpenApiSchema,
} from "@/data/schemas";
import { startHexWith0x } from "@/utils";
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
import { hexToBigInt } from "viem";

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
    const fetchedAbi = await fetchContractAbi({ address, chainId });
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
    console.error(
      `Failed to fetch decode calldata ${calldata} for contract ${address} on chain ${chainId}`
    );
    return null;
  }
}

export async function decodeWithSelector({
  calldata,
}: {
  calldata: string;
}): Promise<TransactionDescription | any | null> {
  // extracts selector from calldata
  const selector = calldata.slice(0, 10);
  console.log(`Decoding calldata with selector ${selector}`);
  try {
    // tries to find function signature from openchain and 4bytes
    const result = await fetchFunctionInterface({ selector });
    if (!result) {
      throw new Error("");
    }
    // decodes calldata with all possible function signatures
    const decodedTransactions = decodeAllPossibilities({
      functionSignatures: [result],
      calldata,
    });

    if (decodedTransactions.length === 0) {
      throw new Error("Failed to decode calldata with function signature");
    }

    return decodedTransactions[0];
  } catch (error) {
    console.error(`Failed to find function interface for selector ${selector}`);
  }

  try {
    console.log("Attempting to decode as SafeMultiSend transactions param");
    return decodeSafeMultiSendTransactionsParam(calldata);
  } catch (error) {
    console.error(
      `Failed to decode calldata as SafeMultiSend transactions param`
    );
    console.error(error);
  }

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
      signature: "abi.encode",
      selector: selector,
      value: BigInt(0),
      fragment,
    } satisfies TransactionDescription;
    return result;
  } catch (error) {
    console.error(
      `Failed to decode using guessed function fragment for calldata ${calldata}`
    );
    console.error(error);
  }

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
    return result;
  } catch (error) {
    console.error(`Failed to guess ABI encoded data for calldata ${calldata}`);
    console.error(error);

    return null;
  }
}

// multiSend function: https://etherscan.io/address/0x40a2accbd92bca938b02010e17a5b8929b49130d#code#F1#L21
const decodeSafeMultiSendTransactionsParam = (bytes: string) => {
  // remove initial "0x"
  const transactionsParam = bytes.slice(2);

  const txs: any[] = [];

  let i = 0;
  for (; i < transactionsParam.length; ) {
    const operationEnd = i + 1 * 2; // uint8
    const operation = transactionsParam.slice(i, operationEnd);

    const toEnd = operationEnd + 20 * 2; // address
    const to = "0x" + transactionsParam.slice(operationEnd, toEnd);

    const valueEnd = toEnd + 32 * 2; // uint256
    const value = hexToBigInt(
      startHexWith0x(transactionsParam.slice(toEnd, valueEnd))
    ).toString();

    const dataLengthEnd = valueEnd + 32 * 2; // uint256
    const dataLength = transactionsParam.slice(valueEnd, dataLengthEnd);
    const dataLengthFormatted = hexToBigInt(
      startHexWith0x(dataLength)
    ).toString();

    const dataEnd = dataLengthEnd + parseInt(dataLength, 16) * 2;
    const data = "0x" + transactionsParam.slice(dataLengthEnd, dataEnd);

    txs.push([operation, to, value, dataLengthFormatted, data]);

    i = dataEnd;
  }
  console.log({ txs });
  if (i !== transactionsParam.length) {
    // for cases where the calldata is not encoded safe multisend
    throw new Error(
      `Failed to decode calldata as SafeMultiSend transactions param`
    );
  }

  const result = {
    name: "",
    args: new Result(txs),
    signature: "transactions",
    selector: "",
    value: BigInt(0),
    fragment: {
      name: "transactions",
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
  return result;
};

export async function fetchContractAbi({
  address,
  chainId,
}: {
  address: string;
  chainId: number;
}) {
  const response = await fetch(
    `https://anyabi.xyz/api/get-abi/${chainId}/${address}`
  );
  const data = await response.json();
  const parsedData = fetchContractAbiResponseSchema.parse(data);
  return {
    abi: parsedData.abi as InterfaceAbi,
    name: parsedData.name,
  };
}

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
}: {
  calldata: string;
  address?: string;
  chainId?: number;
}) {
  let parsedTransaction: TransactionDescription | null;
  if (address && chainId) {
    parsedTransaction = await decodeWithAddress({ calldata, address, chainId });
  } else {
    parsedTransaction = await decodeWithSelector({ calldata });
  }

  if (parsedTransaction) {
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
            }),
          };
        })
      ),
    };
  } else {
    return null;
  }
}

const decodeParamTypes = async ({
  input,
  value,
  address,
  chainId,
}: {
  input: ParamType;
  value: any;
  address?: string;
  chainId?: number;
}): Promise<any> => {
  if (input.baseType.includes("int")) {
    // covers uint
    return BigInt(value).toString();
  } else if (input.baseType === "address") {
    return value;
  } else if (input.baseType.includes("bytes")) {
    return await decodeBytesParam({ value, address, chainId });
  } else if (input.baseType === "tuple") {
    return await decodeTupleParam({ input, value, address, chainId });
  } else if (input.baseType === "array") {
    return await decodeArrayParam({ value, input, address, chainId });
  } else {
    return value;
  }
};

const decodeBytesParam = async ({
  value,
  address,
  chainId,
}: {
  value: any;
  address?: string;
  chainId?: number;
}) => {
  if (value.length < 10) {
    return value;
  }
  return {
    decoded: await decodeRecursive({ calldata: value, address, chainId }),
  };
};

const decodeTupleParam = async ({
  input,
  value,
  address,
  chainId,
}: {
  input: ParamType;
  value: any;
  address?: string;
  chainId?: number;
}): Promise<any> => {
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
}: {
  value: any;
  input: ParamType;
  address?: string;
  chainId?: number;
}) => {
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
        }),
      };
    })
  );
};
