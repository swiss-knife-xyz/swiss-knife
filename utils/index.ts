import { Metadata } from "next";
import { createPublicClient, http, Hex } from "viem";
import { mainnet } from "viem/chains";
import { normalize } from "viem/ens";
import { ADDRESS_KEY, CHAINLABEL_KEY, TX_KEY } from "@/data/common";
import { ExplorerData, ExplorerType, SelectedOptionState } from "@/types";
import { formatUnits } from "ethers";
import { formatEther } from "viem";
import axios from "axios";

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
  transport: http(),
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

export const ethFormatOptions = [
  "ETH",
  "Wei",
  "10^6",
  "Unix",
  "Minutes",
  "Hours",
  "Days",
];

export const fetchFunctionInterface = async (
  selector: string
): Promise<any[]> => {
  // from api.openchain.xyz
  const response = await axios.get(
    "https://api.openchain.xyz/signature-database/v1/lookup",
    {
      params: {
        function: selector,
      },
    }
  );
  const results = response.data.result.function[selector].map(
    (f: { name: string }) => f.name
  );

  if (results.length > 0) {
    return results;
  } else {
    // from 4byte.directory
    const response = await axios.get(
      "https://www.4byte.directory/api/v1/signatures/",
      {
        params: {
          hex_signature: selector,
        },
      }
    );
    const results = response.data.results.map(
      (f: { text_signature: string }) => f.text_signature
    );

    return results;
  }
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

export function getConversion(
  selectedEthFormatOption: SelectedOptionState,
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
    case "10^6":
      return formatUnits(BigInt(value), 6);
    case "Unix":
      return new Date(value * 1000).toUTCString();
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
