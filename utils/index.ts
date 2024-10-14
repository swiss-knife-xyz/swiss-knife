import { Metadata } from "next";
import { createPublicClient, http, Hex, parseEther, parseUnits } from "viem";
import { mainnet } from "viem/chains";
import { normalize } from "viem/ens";
import { ADDRESS_KEY, CHAINLABEL_KEY, TX_KEY } from "@/data/common";
import { ExplorerData, ExplorerType, SelectedOptionState } from "@/types";
import { formatEther, formatUnits } from "viem";

export const getPath = (subdomain: string) => {
  return process.env.NEXT_PUBLIC_DEVELOPMENT === "true"
    ? `/${subdomain}/`
    : `https://${subdomain}.swiss-knife.xyz/`;
};

export const getMetadata = (_metadata: {
  title: string;
  description: string;
  images: string;
}) => {
  const metadata: Metadata = {
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
  transport: http(process.env.MAINNET_RPC_URL),
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

export const slicedText = (txt: string) => {
  return txt.length > 10
    ? `${txt.slice(0, 6)}...${txt.slice(txt.length - 4, txt.length)}`
    : txt;
};
import { NextRequest } from "next/server";

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
) {
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
      return `${((parseFloat(value) * 1_00) / 10_000).toFixed(2).toString()}%`;
    case "Days":
      return value / 86400;
    case "Hours":
      return value / 3600;
    case "Minutes":
      return value / 60;
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
