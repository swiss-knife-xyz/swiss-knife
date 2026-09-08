import {
  concat,
  decodeAbiParameters,
  decodeFunctionResult,
  encodeAbiParameters,
  encodeFunctionData,
  isAddress,
  parseAbi,
  toHex,
  zeroAddress,
  type Address,
  type Hex,
} from "viem";
import { mainnet } from "viem/chains";
import { namehash, normalize, packetToBytes } from "viem/ens";
import { getPublicClient } from "@/lib/publicClient";

const RESOLUTION_TIMEOUT_MS = 8_000;
const publicClient = getPublicClient(mainnet.id, {
  ccipRead: false,
  timeout: RESOLUTION_TIMEOUT_MS,
});

const universalResolverAbi = [
  {
    inputs: [{ internalType: "bytes", name: "name", type: "bytes" }],
    name: "findResolver",
    outputs: [
      { internalType: "address", name: "", type: "address" },
      { internalType: "bytes32", name: "", type: "bytes32" },
      { internalType: "uint256", name: "", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

const resolverAbi = [
  {
    inputs: [
      { internalType: "address", name: "sender", type: "address" },
      { internalType: "string[]", name: "urls", type: "string[]" },
      { internalType: "bytes", name: "callData", type: "bytes" },
      { internalType: "bytes4", name: "callbackFunction", type: "bytes4" },
      { internalType: "bytes", name: "extraData", type: "bytes" },
    ],
    name: "OffchainLookup",
    type: "error",
  },
  {
    inputs: [
      { internalType: "bytes", name: "name", type: "bytes" },
      { internalType: "bytes", name: "data", type: "bytes" },
    ],
    name: "resolve",
    outputs: [{ internalType: "bytes", name: "", type: "bytes" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const resolverRecordAbi = parseAbi([
  "function addr(bytes32 node) view returns (address)",
  "function text(bytes32 node, string key) view returns (string)",
  "function contenthash(bytes32 node) view returns (bytes)",
]);

export async function readEnsAddressRecord(name: string) {
  const normalizedName = normalize(name);
  const node = namehash(normalizedName);
  const result = await resolveEnsRecord(
    normalizedName,
    encodeFunctionData({
      abi: resolverRecordAbi,
      functionName: "addr",
      args: [node],
    })
  );
  const address = result
    ? (decodeFunctionResult({
        abi: resolverRecordAbi,
        functionName: "addr",
        data: result,
      }) as Address)
    : null;

  if (!address || !isAddress(address) || address === zeroAddress) {
    return null;
  }

  return address;
}

export async function readEnsTextRecord(name: string, key: string) {
  const normalizedName = normalize(name);
  const node = namehash(normalizedName);
  const result = await resolveEnsRecord(
    normalizedName,
    encodeFunctionData({
      abi: resolverRecordAbi,
      functionName: "text",
      args: [node, key],
    })
  );
  const value = result
    ? (decodeFunctionResult({
        abi: resolverRecordAbi,
        functionName: "text",
        data: result,
      }) as string)
    : null;

  return value ? value : null;
}

export async function readEnsContenthashRecord(name: string) {
  const normalizedName = normalize(name);
  const node = namehash(normalizedName);
  const result = await resolveEnsRecord(
    normalizedName,
    encodeFunctionData({
      abi: resolverRecordAbi,
      functionName: "contenthash",
      args: [node],
    })
  );
  const value = result
    ? (decodeFunctionResult({
        abi: resolverRecordAbi,
        functionName: "contenthash",
        data: result,
      }) as Hex)
    : null;

  return value && value !== "0x" ? value : null;
}

async function resolveEnsRecord(normalizedName: string, data: Hex) {
  const dnsEncodedName = toHex(packetToBytes(normalizedName));
  const [resolverAddress] = await withTimeout(
    publicClient.readContract({
      address: mainnet.contracts.ensUniversalResolver.address,
      abi: universalResolverAbi,
      functionName: "findResolver",
      args: [dnsEncodedName],
    }),
    "ENS resolver lookup timed out"
  );
  if (!resolverAddress || resolverAddress === zeroAddress) return null;

  try {
    const result = await withTimeout(
      publicClient.readContract({
        address: resolverAddress,
        abi: resolverAbi,
        functionName: "resolve",
        args: [dnsEncodedName, data],
      }),
      "ENS record lookup timed out"
    );
    return emptyHexToNull(result);
  } catch (error) {
    const offchainLookup = getOffchainLookupArgs(error);
    if (offchainLookup) {
      return emptyHexToNull(
        await resolveOffchainLookup(offchainLookup, "resolve")
      );
    }
  }

  try {
    const result = await withTimeout(
      publicClient.call({
        to: resolverAddress,
        data,
      }),
      "ENS record lookup timed out"
    );
    return emptyHexToNull(result.data);
  } catch (error) {
    const offchainLookup = getOffchainLookupArgs(error);
    if (!offchainLookup) throw error;

    return emptyHexToNull(await resolveOffchainLookup(offchainLookup, "raw"));
  }
}

async function resolveOffchainLookup(
  offchainLookup: OffchainLookupArgs,
  resultMode: "resolve" | "raw"
) {
  const gatewayData = await fetchOffchainLookupData(offchainLookup);
  const callbackCallData = concat([
    offchainLookup.callbackFunction,
    encodeAbiParameters(
      [{ type: "bytes" }, { type: "bytes" }],
      [gatewayData, offchainLookup.extraData]
    ),
  ]);
  const callbackReturn = await withTimeout(
    publicClient.call({
      to: offchainLookup.sender,
      data: callbackCallData,
    }),
    "ENS CCIP callback verification timed out"
  );

  if (resultMode === "raw") {
    return callbackReturn.data ?? "0x";
  }

  const [callbackResult] = decodeAbiParameters(
    [{ type: "bytes" }],
    callbackReturn.data ?? "0x"
  );
  return callbackResult;
}

function emptyHexToNull(value: Hex | undefined | null) {
  return value && value !== "0x" ? value : null;
}

function withTimeout<T>(promise: Promise<T>, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(message)),
      RESOLUTION_TIMEOUT_MS
    );

    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      }
    );
  });
}

type OffchainLookupArgs = {
  sender: Address;
  urls: string[];
  callData: Hex;
  callbackFunction: Hex;
  extraData: Hex;
};

function getOffchainLookupArgs(error: unknown): OffchainLookupArgs | null {
  const args =
    (error as any)?.cause?.data?.args ||
    (error as any)?.data?.args ||
    (error as any)?.cause?.args;

  if (!Array.isArray(args) || args.length < 5) return null;

  return {
    sender: args[0],
    urls: args[1],
    callData: args[2],
    callbackFunction: args[3],
    extraData: args[4],
  };
}

async function fetchOffchainLookupData({
  sender,
  urls,
  callData,
}: OffchainLookupArgs) {
  const gatewayUrl = urls.find((url) => url.startsWith("http"));
  if (!gatewayUrl) throw new Error("No HTTP gateway URL in OffchainLookup");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RESOLUTION_TIMEOUT_MS);

  try {
    const hasTemplate =
      gatewayUrl.includes("{sender}") || gatewayUrl.includes("{data}");
    const response = hasTemplate
      ? await fetch(
          gatewayUrl
            .replace("{sender}", sender.toLowerCase())
            .replace("{data}", callData),
          { signal: controller.signal }
        )
      : await fetch(gatewayUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sender, data: callData }),
          signal: controller.signal,
        });

    if (!response.ok) {
      throw new Error(`CCIP gateway returned HTTP ${response.status}`);
    }

    const data = (await response.json()) as { data?: Hex };
    if (!data.data)
      throw new Error("CCIP gateway response did not include data");
    return data.data;
  } finally {
    clearTimeout(timeout);
  }
}
