import { erc20Abi, getAddress, padHex, type Address, type Hex } from "viem";
import { fetchSwapTokenList } from "@/app/migrate/lib/swapTokenList";
import { getPublicClient } from "@/lib/publicClient";
import {
  BASE_CHAIN_ID,
  BASE_EID,
  ROBINHOOD_CHAIN_ID,
  ROBINHOOD_EID,
  oappAdminAbi,
  type OftDeployment,
} from "./oft";

const MULTICALL3 = "0xcA11bde05977b3631167028862bE2a173976CA11" as Address;

const adapterAbi = [
  {
    type: "function",
    name: "token",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

export type ResolvedOftDeployment = {
  deployment: OftDeployment;
  baseMetadata: { name: string; symbol: string };
  robinMetadata: { name: string; symbol: string };
};

const peerAddress = (peer: Hex) => getAddress(`0x${peer.slice(-40)}`);

export async function resolveOftDeployment(
  baseToken: Address,
  robinToken: Address,
  options: { fallbackLogo?: string } = {}
): Promise<ResolvedOftDeployment> {
  const baseClient = getPublicClient(BASE_CHAIN_ID);
  const robinClient = getPublicClient(ROBINHOOD_CHAIN_ID);

  const [baseReads, robinReads, tokenList] = await Promise.all([
    baseClient.multicall({
      allowFailure: false,
      multicallAddress: MULTICALL3,
      contracts: [
        { address: baseToken, abi: erc20Abi, functionName: "name" },
        { address: baseToken, abi: erc20Abi, functionName: "symbol" },
        { address: baseToken, abi: erc20Abi, functionName: "decimals" },
      ],
    }),
    robinClient.multicall({
      allowFailure: false,
      multicallAddress: MULTICALL3,
      contracts: [
        { address: robinToken, abi: erc20Abi, functionName: "name" },
        { address: robinToken, abi: erc20Abi, functionName: "symbol" },
        {
          address: robinToken,
          abi: oappAdminAbi,
          functionName: "peers",
          args: [BASE_EID],
        },
      ],
    }),
    fetchSwapTokenList(BASE_CHAIN_ID).catch(() => []),
  ]);

  const adapter = peerAddress(robinReads[2]);
  const [adapterToken, adapterPeer] = await baseClient.multicall({
    allowFailure: false,
    multicallAddress: MULTICALL3,
    contracts: [
      { address: adapter, abi: adapterAbi, functionName: "token" },
      {
        address: adapter,
        abi: oappAdminAbi,
        functionName: "peers",
        args: [ROBINHOOD_EID],
      },
    ],
  });

  if (
    adapterToken.toLowerCase() !== baseToken.toLowerCase() ||
    adapterPeer.toLowerCase() !== padHex(robinToken, { size: 32 }).toLowerCase()
  ) {
    throw new Error("These tokens are not a reciprocal LayerZero OFT route.");
  }

  const logo = tokenList.find(
    (token) => token.address.toLowerCase() === baseToken.toLowerCase()
  )?.logoURI;
  const baseMetadata = {
    name: String(baseReads[0]),
    symbol: String(baseReads[1]),
  };
  const robinMetadata = {
    name: String(robinReads[0]),
    symbol: String(robinReads[1]),
  };

  return {
    deployment: {
      baseToken,
      adapter,
      robinToken,
      name: baseMetadata.name,
      symbol: baseMetadata.symbol,
      baseDecimals: Number(baseReads[2]),
      logo: logo || options.fallbackLogo || undefined,
    },
    baseMetadata,
    robinMetadata,
  };
}
