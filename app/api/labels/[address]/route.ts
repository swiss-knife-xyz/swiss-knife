import { NextRequest } from "next/server";
import axios from "axios";
import { getAddress, isAddress, type Hex } from "viem";
import { getPublicClient } from "@/lib/publicClient";
import { chainIdToChain, etherscanChains } from "@/data/common";

const MAX_LABELS = 3;

// keccak256("eip1967.proxy.implementation") - 1
const EIP1967_IMPLEMENTATION_SLOT =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc" as Hex;

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

type EthLabelEntry = {
  address: string;
  chainId: number;
  label: string;
  nameTag?: string;
  name?: string;
  symbol?: string;
  website?: string;
  image?: string | null;
};

const fetchEthLabels = async (
  address: string,
  chainId: number | undefined
): Promise<string[]> => {
  try {
    const res = await axios.get(
      `https://eth-labels-production.up.railway.app/labels/${address}`
    );
    let data = res.data as EthLabelEntry[];
    if (chainId !== undefined) {
      data = data.filter((item) => item.chainId === chainId);
    }

    const seen = new Set<string>();
    const labels: string[] = [];
    const pushAll = (values: Array<string | undefined>) => {
      values.forEach((v) => {
        if (v && !seen.has(v)) {
          seen.add(v);
          labels.push(v);
        }
      });
    };
    pushAll(data.map((i) => i.nameTag));
    pushAll(data.map((i) => i.label));
    pushAll(data.map((i) => i.symbol));
    pushAll(data.map((i) => i.name));
    return labels;
  } catch {
    return [];
  }
};

const resolveProxyImplementation = async (
  chainId: number,
  address: `0x${string}`
): Promise<`0x${string}` | null> => {
  try {
    const client = getPublicClient(chainId);
    const raw = await client.getStorageAt({
      address,
      slot: EIP1967_IMPLEMENTATION_SLOT,
    });
    if (!raw || /^0x0*$/.test(raw)) return null;
    const impl = ("0x" + raw.slice(-40)) as `0x${string}`;
    if (/^0x0+$/.test(impl)) return null;
    return getAddress(impl);
  } catch {
    return null;
  }
};

const fetchSourcifyName = async (
  chainId: number,
  address: `0x${string}`
): Promise<string | null> => {
  const tryMatch = async (
    match: "full_match" | "partial_match"
  ): Promise<string | null> => {
    try {
      const url = `https://repo.sourcify.dev/contracts/${match}/${chainId}/${address}/metadata.json`;
      const res = await axios.get(url, {
        validateStatus: (s) => s === 200,
      });
      const target = res.data?.settings?.compilationTarget as
        | Record<string, string>
        | undefined;
      if (!target) return null;
      const names = Object.values(target);
      return names[0] ?? null;
    } catch {
      return null;
    }
  };
  return (await tryMatch("full_match")) ?? (await tryMatch("partial_match"));
};

const fetchEtherscanContractInfo = async (
  chainId: number,
  address: string
): Promise<{ name: string | null; implementation: string | null }> => {
  const chain = Object.values(etherscanChains).find((c) => c.id === chainId);
  const isRoutescan = chain?.isRoutescan === true;
  const apiUrl = isRoutescan
    ? `https://api.routescan.io/v2/network/mainnet/evm/${chainId}/etherscan/api?module=contract&action=getsourcecode&address=${address}`
    : `https://api.etherscan.io/v2/api?apikey=${process.env.ETHERSCAN_API_KEY}&chainid=${chainId}&module=contract&action=getsourcecode&address=${address}`;

  try {
    const res = await axios.get(apiUrl);
    const result = res.data?.result?.[0];
    if (!result) return { name: null, implementation: null };
    const name = (result.ContractName as string | undefined) || null;
    const implementationRaw = (result.Implementation as string | undefined) || "";
    const implementation = implementationRaw.length > 0 ? implementationRaw : null;
    return { name, implementation };
  } catch {
    return { name: null, implementation: null };
  }
};

const fetchEtherscanNames = async (
  chainId: number,
  address: string
): Promise<string[]> => {
  const first = await fetchEtherscanContractInfo(chainId, address);
  if (first.implementation) {
    const impl = await fetchEtherscanContractInfo(chainId, first.implementation);
    const names: string[] = [];
    if (impl.name) names.push(impl.name);
    if (first.name && first.name !== impl.name) names.push(first.name);
    return names;
  }
  return first.name ? [first.name] : [];
};

export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) => {
  const { address } = await params;
  const chainIdParam = request.nextUrl.searchParams.get("chainId");
  const chainId = chainIdParam ? parseInt(chainIdParam) : undefined;

  if (!address || !isAddress(address)) {
    return new Response(
      JSON.stringify({ error: "Address not provided or invalid" }),
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    const primary = await fetchEthLabels(address, chainId);
    if (primary.length > 0) {
      return new Response(JSON.stringify(primary.slice(0, MAX_LABELS)), {
        headers: corsHeaders,
      });
    }

    if (chainId === undefined || !chainIdToChain[chainId]) {
      return new Response(JSON.stringify(primary), { headers: corsHeaders });
    }

    const checksummed = getAddress(address);
    const implAddress = await resolveProxyImplementation(chainId, checksummed);
    const sourcifyTarget = implAddress ?? checksummed;
    const sourcifyName = await fetchSourcifyName(chainId, sourcifyTarget);
    if (sourcifyName) {
      return new Response(JSON.stringify([sourcifyName]), {
        headers: corsHeaders,
      });
    }

    const etherscanNames = await fetchEtherscanNames(chainId, address);
    return new Response(JSON.stringify(etherscanNames.slice(0, MAX_LABELS)), {
      headers: corsHeaders,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Error fetching data", walletLabelsError: error }),
      { status: 400, headers: corsHeaders }
    );
  }
};
