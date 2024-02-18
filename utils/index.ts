import { createPublicClient, http, Hex } from "viem";
import { mainnet } from "viem/chains";
import { ADDRESS_KEY, CHAINLABEL_KEY, TX_KEY } from "@/data/common";
import { ExplorerData, ExplorerType } from "@/types";
import axios from "axios";

export const getPath = (subdomain: string) => {
  return process.env.NEXT_PUBLIC_DEVELOPMENT === "true"
    ? `/${subdomain}/`
    : `https://${subdomain}.swiss-knife.xyz/`;
};

export const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

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

export const ethFormatOptions = ["ETH", "Wei"];

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
