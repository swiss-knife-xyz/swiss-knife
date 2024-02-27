import {
  FetchContractAbiResponse,
  fetchContractAbiResponseSchema,
  fetchFunctionInterface4ByteSchema,
  fetchFunctionInterfaceOpenApiSchema,
} from "@/data/schemas";
import { guessAbiEncodedData } from "@openchainxyz/abi-guesser";
import {
  AbiCoder,
  FunctionFragment,
  Interface,
  InterfaceAbi,
  TransactionDescription,
} from "ethers";

export async function decodeWithAddress({
  calldata,
  address,
  chainId,
}: {
  calldata: string;
  address: string;
  chainId: number;
}) {
  console.log(`Decoding calldata with address ${address} on chain ${chainId}`);
  try {
    const fetchedAbi = await fetchContractAbi({ address, chainId });
    const decodedFromAbi = decodeWithABI({
      abi: fetchedAbi.abi,
      calldata,
    });
    if (decodedFromAbi) {
      return [decodedFromAbi];
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

export async function decodeWithSelector({ calldata }: { calldata: string }) {
  // extracts selector from calldata
  const selector = calldata.slice(0, 10);
  console.log(`Decoding calldata with selector ${selector}`);
  try {
    // tries to find function signature from openchain and 4bytes
    const result = await fetchFunctionInterface({ selector });
    if (!result || result.length === 0) {
      return null;
    }
    // decodes calldata with all possible function signatures
    const decodedTransactions = decodeAllPossibilities({
      functionSignatures: result,
      calldata,
    });
    return decodedTransactions;
  } catch (error) {
    console.error(`Failed to find function interface for selector ${selector}`);
  }

  try {
    console.log("Attempting to guess ABI encoded data");
    const paramTypes = guessAbiEncodedData(calldata);
    if (!paramTypes) {
      throw new Error("Failed to guess ABI encoded data");
    }
    const abiCoder = AbiCoder.defaultAbiCoder();
    const decoded = abiCoder.decode(paramTypes, calldata);
    const reuslt = {
      name: "Unknown",
      args: decoded,
      signature: "abi.encode",
      selector: selector,
      value: BigInt(0),
      fragment: FunctionFragment.from({
        inputs: paramTypes,
        name: "Unknown",
        outputs: [],
        type: "function",
        stateMutability: "nonpayable",
      }),
    } satisfies TransactionDescription;
    return [reuslt];
  } catch (error) {
    console.error(`Failed to guess ABI encoded data for calldata ${calldata}`);
    return null;
  }
}

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
}) {
  const openChainDataPromise = fetchFunctionFromOpenchain({ selector });
  const fourByteDataPromise = fetchFunctionFrom4Bytes({ selector });
  const [openChainData, fourByteData] = await Promise.allSettled([
    openChainDataPromise,
    fourByteDataPromise,
  ]);
  const results: string[] = [];
  if (openChainData.status === "fulfilled") {
    openChainData.value?.forEach((v) => results.push(v.name));
  }
  if (fourByteData.status === "fulfilled") {
    fourByteData.value?.forEach((v) => results.push(v.text_signature));
  }
  return results;
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
    try {
      const parsedTransaction = decodeWithABI({
        abi: signature,
        calldata,
      });
      if (parsedTransaction) {
        results.push(parsedTransaction);
      }
    } catch (error) {
      console.error(error);
    }
  }
  return results;
}

export function decodeWithABI({
  abi,
  calldata,
}: {
  abi: InterfaceAbi;
  calldata: string;
}) {
  const abiInterface = new Interface(abi);
  const parsedTransaction = abiInterface.parseTransaction({ data: calldata });
  return parsedTransaction;
}
