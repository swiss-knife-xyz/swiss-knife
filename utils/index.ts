import { Metadata } from "next";
import {
  createPublicClient,
  http,
  Hex,
  parseEther,
  parseUnits,
  PublicClient,
} from "viem";
import { mainnet } from "viem/chains";
import { normalize } from "viem/ens";
import {
  ADDRESS_KEY,
  CHAINLABEL_KEY,
  erc3770ShortNameToChain,
  TX_KEY,
} from "@/data/common";
import {
  ContractResponse,
  ExplorerData,
  ExplorerType,
  SourceCode,
  EVMParameter,
} from "@/types";
import { formatEther, formatUnits } from "viem";

export const getPath = (subdomain: string, isRelativePath: boolean = false) => {
  if (subdomain.length === 0) {
    return process.env.NEXT_PUBLIC_DEVELOPMENT === "true"
      ? "/"
      : "https://swiss-knife.xyz/";
  }

  if (isRelativePath) {
    return process.env.NEXT_PUBLIC_DEVELOPMENT === "true"
      ? `/${subdomain}/`
      : `https://swiss-knife.xyz/${subdomain}/`;
  } else {
    return process.env.NEXT_PUBLIC_DEVELOPMENT === "true"
      ? `/${subdomain}/`
      : `https://${subdomain}.swiss-knife.xyz/`;
  }
};

export const apiBasePath =
  process.env.NEXT_PUBLIC_DEVELOPMENT === "true"
    ? ""
    : "https://swiss-knife.xyz";

export const getMetadata = (_metadata: {
  title: string;
  description: string;
  images: string;
}) => {
  const metadata: Metadata = {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_DEVELOPMENT === "true"
        ? "http://localhost:3000"
        : "https://swiss-knife.xyz"
    ),
    title: _metadata.title,
    description: _metadata.description,
    twitter: {
      card: "summary_large_image",
      creator: "@swissknifexyz",
      title: _metadata.title,
      description: _metadata.description,
      images: _metadata.images,
    },
    openGraph: {
      type: "website",
      title: _metadata.title,
      description: _metadata.description,
      images: _metadata.images,
    },
    robots: "index, follow",
  };

  return metadata;
};

export const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(process.env.NEXT_PUBLIC_MAINNET_RPC_URL),
});

export const getEnsAddress = async (name: string) => {
  return await publicClient.getEnsAddress({
    name: normalize(name),
  });
};

export const getEnsName = async (address: string) => {
  return await publicClient.getEnsName({
    address: address as Hex,
  });
};

export const getEnsAvatar = async (ensName: string) => {
  return await publicClient.getEnsAvatar({
    name: normalize(ensName),
  });
};

export const generateUrl = (
  urlLayout: string,
  chainLabel: string,
  addressOrTx: string,
  explorerType: ExplorerType
) => {
  let res = urlLayout.replace(CHAINLABEL_KEY, chainLabel);

  if (explorerType === ExplorerType.ADDRESS) {
    res = res.replace(ADDRESS_KEY, addressOrTx);
  } else {
    res = res.replace(TX_KEY, addressOrTx);
  }

  return res;
};

export const checkDifferentUrlsExist = (data: ExplorerData): boolean => {
  for (const chainId in data.chainIdToLabel) {
    if (data.chainIdToLabel.hasOwnProperty(chainId)) {
      if (data.chainIdToLabel[chainId].length > 0) {
        return true;
      }
    }
  }
  return false;
};

export const startHexWith0x = (hexValue?: string): Hex => {
  return hexValue
    ? hexValue.startsWith("0x")
      ? hexValue === "0x"
        ? "0x"
        : (hexValue as Hex)
      : `0x${hexValue}`
    : "0x";
};

export const slicedText = (txt: string, charCount: number = 6) => {
  return txt.length > charCount * 2 + 3 // check if text is long enough to need truncation
    ? `${txt.slice(0, charCount)}...${txt.slice(-charCount)}`
    : txt;
};
import { NextRequest } from "next/server";
import { InterfaceAbi } from "ethers";
import { fetchFunctionInterface } from "@/lib/decoder";
import { whatsabi } from "@shazow/whatsabi";

export default function getIP(request: Request | NextRequest) {
  const xff = request.headers.get("x-forwarded-for");

  return xff ? (Array.isArray(xff) ? xff[0] : xff.split(",")[0]) : "127.0.0.1";
}

export const swap = <T>(arr: T[], i: number, j: number): T[] => {
  const temp = arr[i];
  arr[i] = arr[j];
  arr[j] = temp;
  return arr;
};

export const ethFormatOptions = [
  "Wei",
  "ETH",
  "Gwei",
  "10^6",
  "Unix Time",
  "Bps ↔️ %",
  "Minutes",
  "Hours",
  "Days",
] as const;

export type EthFormatOption = (typeof ethFormatOptions)[number];

export interface ETHSelectedOptionState {
  label: EthFormatOption;
  value: EthFormatOption;
}

export function convertTo(
  selectedEthFormatOption: ETHSelectedOptionState,
  value: any
): string {
  if (!selectedEthFormatOption?.value) {
    return "";
  }

  switch (selectedEthFormatOption?.value) {
    case "Wei":
      return value;
    case "ETH":
      return formatEther(BigInt(value));
    case "Gwei":
      return value === "0" ? "0" : formatUnits(value, 9);
    case "10^6":
      return value === "0" ? "0" : formatUnits(BigInt(value), 6);
    case "Unix Time":
      return convertUnixSecondsToGMT(Number(value));
    case "Bps ↔️ %":
      return `${((parseFloat(value) * 1_00) / 10_000).toFixed(2)}%`;
    case "Days":
      return (value / 86400).toString();
    case "Hours":
      return (value / 3600).toString();
    case "Minutes":
      return (value / 60).toString();
    default:
      return "";
  }
}

export function convertFrom(
  selectedEthFormatOption: ETHSelectedOptionState,
  value: any
): string {
  if (!selectedEthFormatOption || !selectedEthFormatOption.value) {
    return "";
  }

  switch (selectedEthFormatOption.value) {
    case "Wei":
      return value.toString();
    case "ETH":
      return BigInt(parseEther(value)).toString();
    case "Gwei":
      return BigInt(parseUnits(value, 9)).toString();
    case "10^6":
      return BigInt(parseUnits(value, 6)).toString();
    case "Unix Time": {
      // value in unix seconds
      return BigInt(Math.floor(Number(value))).toString();
    }
    case "Bps ↔️ %":
      return BigInt(Math.floor((parseFloat(value) * 10_000) / 1_00)).toString();
    case "Days":
      return BigInt(Math.floor(Number(value) * 86400)).toString();
    case "Hours":
      return BigInt(Math.floor(Number(value) * 3600)).toString();
    case "Minutes":
      return BigInt(Math.floor(Number(value) * 60)).toString();
    default:
      return "";
  }
}

// input format = Thu, 01 Jan 1970 00:55:00 GMT
export const convertGMTToUnixSeconds = (gmtTime: string): number => {
  const date = new Date(gmtTime);
  return Math.floor(date.getTime() / 1000);
};

export const convertUnixSecondsToGMT = (unixSeconds: number): string => {
  return new Date(unixSeconds * 1000).toUTCString();
};

export const decodeBase64 = (
  value: string
): { content: string; isJson: boolean; isSvg: boolean } | null => {
  // Regular expression to match base64 content with optional MIME type prefix
  // Now allows for potentially truncated base64 content
  const base64Regex = /^(?:data:[^;]+;base64,)?([A-Za-z0-9+/=]*)$/;

  // Check if the input matches the base64 pattern
  let match;
  try {
    match = value.trim().match(base64Regex);
  } catch {
    return null;
  }
  if (!match) {
    return null; // Not a valid base64 string
  }

  // Extract the base64 content (without the MIME type prefix, if present)
  const base64Content = match[1];

  // If the base64 content is empty, return null
  if (!base64Content) {
    return null;
  }

  try {
    // Attempt to decode the base64 content
    const decodedContent = atob(base64Content);

    let isJson = false;
    let isSvg = false;

    // Check if the decoded content is valid JSON
    try {
      JSON.parse(decodedContent);
      isJson = true;
    } catch {
      // Not JSON, continue with other checks
    }

    // Check if the decoded content starts with "<svg" (case-insensitive)
    if (decodedContent.trim().toLowerCase().startsWith("<svg")) {
      isSvg = true;
    }

    // Return an object with the decoded content and flags
    return {
      content: decodedContent,
      isJson,
      isSvg,
    };
  } catch (error) {
    // If decoding fails, return null
    return null;
  }
};

export const resolveIPFS = (value: string) => {
  if (value.startsWith("ipfs://")) {
    return `https://gateway.pinata.cloud/ipfs/${value.slice(7)}`;
  }
  return value;
};

export const isValidJSON = (str: string): boolean => {
  try {
    JSON.parse(str);
    return (
      true &&
      ((str.startsWith("{") && str.endsWith("}")) ||
        (str.startsWith("[") && str.endsWith("]")))
    );
  } catch (e) {
    return false;
  }
};

export const getSourceCode = async (
  chainId: number,
  address: string
): Promise<Record<string, string> | undefined> => {
  const res = await fetch(
    `${apiBasePath}/api/source-code?address=${address}&chainId=${chainId}`
  );

  try {
    const data: ContractResponse = await res.json();
    const { SourceCode, ContractName } = data.result[0];
    const isMultiple = SourceCode.startsWith("{");
    if (isMultiple) {
      const { sources } = JSON.parse(
        SourceCode.substring(1, SourceCode.length - 1)
      ) as SourceCode;
      return Object.keys(sources).reduce(
        (acc, key) => ({ ...acc, [key]: sources[key].content }),
        {}
      );
    } else {
      return { [ContractName]: SourceCode };
    }
  } catch {}
};

export const fetchContractAbiRaw = async ({
  address,
  chainId,
}: {
  address: string;
  chainId: number;
}): Promise<{
  abi: InterfaceAbi;
  name: string;
  implementation?: {
    address: string;
    abi: InterfaceAbi;
    name: string;
  };
}> => {
  const res = await fetch(
    `${apiBasePath}/api/source-code?address=${address}&chainId=${chainId}`
  );

  const data: ContractResponse = await res.json();
  const { ABI, ContractName, Implementation } = data.result[0];

  if (Implementation.length > 0) {
    const res = await fetch(
      `${apiBasePath}/api/source-code?address=${Implementation}&chainId=${chainId}`
    );

    const implData: ContractResponse = await res.json();
    const { ABI: implAbi, ContractName: implName } = implData.result[0];

    return {
      abi: JSON.parse(ABI),
      name: ContractName,
      implementation: {
        address: Implementation,
        abi: JSON.parse(implAbi),
        name: implName,
      },
    };
  } else {
    return { abi: JSON.parse(ABI), name: ContractName };
  }
};

export const fetchContractAbi = async ({
  address,
  chainId,
}: {
  address: string;
  chainId: number;
}): Promise<{
  abi: InterfaceAbi;
  name: string;
}> => {
  const { abi, name, implementation } = await fetchContractAbiRaw({
    address,
    chainId,
  });

  if (implementation) {
    return { abi: implementation.abi, name: implementation.name };
  } else {
    return { abi, name };
  }
};

export const resolveERC3770Address = (
  input: string
): {
  chainId?: number;
  address: string;
} => {
  // trim spaces
  input = input.trim();
  // trim quotes if the input starts or ends with quotes
  input = input.replace(/^"|"$/g, "");

  // split input like eth:0xabc123...
  const parts = input.split(":");
  if (parts.length !== 2) {
    return { address: input };
  }

  const [shortName, address] = parts;

  const chain = erc3770ShortNameToChain[shortName];
  if (!chain) {
    return { address: input };
  }

  return { chainId: chain.id, address };
};

export const parseEVMoleInputTypes = (argsString: string): EVMParameter[] => {
  // Parse individual types recursively
  const parseType = (input: string, index?: number): EVMParameter => {
    input = input.trim();
    if (!input) throw new Error("Empty input type");

    // Extract array suffix if present
    const arrayMatch = input.match(/(\[\d*\])+$/);
    const arraySuffix = arrayMatch ? arrayMatch[0] : "";
    const baseType = arrayMatch ? input.slice(0, -arraySuffix.length) : input;

    // For tuples, recursively parse components
    if (baseType.startsWith("(") && baseType.endsWith(")")) {
      const inner = baseType.slice(1, -1);
      const components = splitComponents(inner).map((comp, idx) =>
        parseType(comp, arrayMatch ? undefined : idx)
      );

      return {
        type: `tuple${arraySuffix}`,
        ...(index !== undefined && { name: `arg${index}` }),
        components,
      };
    }

    // For basic types
    return {
      type: input,
      ...(index !== undefined && { name: `arg${index}` }),
    };
  };

  // Split tuple components while respecting nesting
  const splitComponents = (input: string): string[] => {
    const components: string[] = [];
    let current = "";
    let parenDepth = 0;
    let bracketDepth = 0;

    for (const char of input) {
      if (char === "(") parenDepth++;
      else if (char === ")") parenDepth--;
      else if (char === "[") bracketDepth++;
      else if (char === "]") bracketDepth--;
      else if (char === "," && parenDepth === 0 && bracketDepth === 0) {
        components.push(current.trim());
        current = "";
        continue;
      }
      current += char;
    }

    if (current.trim()) {
      components.push(current.trim());
    }

    return components;
  };

  // Start parsing from the top
  const trimmed = argsString.trim();
  if (trimmed === "" || trimmed === "()") return [];

  return [parseType(trimmed)];
};

export const processContractBytecode = async ({
  contractCode,
  evmole,
}: {
  contractCode: string;
  evmole: any;
}) => {
  // Get function selectors using evmole
  console.log("Attempting evmole decode...");
  const selectors = evmole.functionSelectors(contractCode);
  console.log("Function selectors:", selectors);

  if (!selectors || !Array.isArray(selectors)) {
    throw new Error("Invalid selectors format");
  }

  // Process and sort functions
  const processedAbi = await Promise.all(
    selectors.map(async (selector) => {
      const args = evmole.functionArguments(contractCode, selector);
      const stateMutability = evmole.functionStateMutability(
        contractCode,
        selector,
        0
      );

      // Try to fetch function interface
      const functionInterface = await fetchFunctionInterface({
        selector: startHexWith0x(selector),
      });

      let name: string | undefined;
      if (functionInterface) {
        name = functionInterface.split("(")[0].trim();
      }

      return {
        type: "function",
        name: name || `selector: ${startHexWith0x(selector)}`,
        inputs: args ? parseEVMoleInputTypes(args) : [],
        stateMutability,
        selector: startHexWith0x(selector),
      };
    })
  );

  return processedAbi.sort((a, b) => {
    const nameA = a.name?.toLowerCase();
    const nameB = b.name?.toLowerCase();
    const isSelectorA = nameA?.startsWith("selector: ");
    const isSelectorB = nameB?.startsWith("selector: ");
    if (isSelectorA && !isSelectorB) return 1;
    if (!isSelectorA && isSelectorB) return -1;
    return nameA && nameB ? nameA.localeCompare(nameB) : 0;
  });
};

export const getImplementationFromBytecodeIfProxy = async ({
  client,
  address,
}: {
  client: PublicClient;
  address: string;
}): Promise<
  | {
      implementationAddress: string;
      proxyName: string;
    }
  | undefined
> => {
  const result = await whatsabi.autoload(address, { provider: client });
  const followProxies = await result.followProxies;
  if (followProxies) {
    const proxies = await followProxies();
    const implementationAddress = proxies.address;
    return {
      implementationAddress,
      proxyName: result.proxies[0].name,
    };
  }
};

export const generateTenderlyUrl = (
  txData: {
    from: string;
    to: string;
    value: string;
    data: string;
  },
  chainId: number
) => {
  const baseUrl = "https://dashboard.tenderly.co/simulator/new";
  const encodedParams = [
    `from=${encodeURIComponent(txData.from)}`,
    `contractAddress=${encodeURIComponent(txData.to)}`,
    `value=${encodeURIComponent(txData.value)}`,
    `rawFunctionInput=${encodeURIComponent(txData.data)}`,
    `network=${encodeURIComponent(chainId)}`,
  ].join("&");

  return `${baseUrl}?${encodedParams}`;
};

export const isBigInt = (value: string): boolean => {
  try {
    BigInt(value);
    return true;
  } catch {
    return false;
  }
};
