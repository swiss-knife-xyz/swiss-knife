import axios from "axios";
import type { ContractResponse, ContractResult } from "../types";

interface Lookup {
  chainId: number;
  address: string;
  isRoutescan: boolean;
}
interface MetadataResponse extends ContractResponse {
  verification?: {
    provider: "sourcify";
    match: "exact_match" | "match";
    chainId: number;
    address: string;
  };
  error?: string;
}
type Get = (
  url: string,
  options: { timeout: number; maxContentLength: number; maxRedirects: number }
) => Promise<{ data: unknown }>;
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const validAbi = (value: unknown): value is Record<string, unknown>[] =>
  Array.isArray(value) &&
  value.every(
    (item) =>
      object(item) &&
      [
        "function",
        "constructor",
        "event",
        "error",
        "fallback",
        "receive",
      ].includes(String(item.type))
  );

function primaryRecord(data: unknown): ContractResult | undefined {
  if (!object(data) || data.status !== "1" || !Array.isArray(data.result))
    return;
  const record = data.result[0];
  if (
    !object(record) ||
    typeof record.ABI !== "string" ||
    typeof record.SourceCode !== "string" ||
    typeof record.ContractName !== "string" ||
    typeof record.Implementation !== "string"
  )
    return;
  try {
    if (validAbi(JSON.parse(record.ABI)))
      return record as unknown as ContractResult;
  } catch {
    /* An unverified/error ABI must never become verified contract data. */
  }
}

/** Preserve explorer priority; accept Sourcify v2 runtime bytecode matches.
 * No cross-request cache: every upstream lookup is bound to this chain + address.
 */
export async function fetchContractMetadata(
  { chainId, address, isRoutescan }: Lookup,
  get: Get = axios.get
): Promise<{ statusCode: number; body: MetadataResponse }> {
  const options = {
    timeout: 8000,
    maxContentLength: 10 * 1024 * 1024,
    maxRedirects: 0,
  };
  const primaryUrl = isRoutescan
    ? `https://api.routescan.io/v2/network/mainnet/evm/${chainId}/etherscan/api?module=contract&action=getsourcecode&address=${address}`
    : `https://api.etherscan.io/v2/api?apikey=${process.env.ETHERSCAN_API_KEY}&chainid=${chainId}&module=contract&action=getsourcecode&address=${address}`;
  let primary: ContractResult | undefined;
  let unavailable = false;
  try {
    const { data } = await get(primaryUrl, options);
    primary = primaryRecord(data);
    if (primary?.SourceCode.trim()) {
      return { statusCode: 200, body: data as MetadataResponse };
    }
    // Explorer APIs return errors (including rate limits) in HTTP 200 bodies.
    unavailable =
      !primary &&
      !(
        object(data) &&
        Array.isArray(data.result) &&
        object(data.result[0]) &&
        data.result[0].SourceCode === "" &&
        data.result[0].ABI === "Contract source code not verified"
      );
  } catch {
    unavailable = true;
  }

  try {
    const { data } = await get(
      `https://sourcify.dev/server/v2/contract/${chainId}/${address}?fields=abi,sources,compilation`,
      options
    );
    if (
      object(data) &&
      (data.match === "exact_match" || data.match === "match") &&
      (data.runtimeMatch === "exact_match" || data.runtimeMatch === "match") &&
      data.chainId === String(chainId) &&
      typeof data.address === "string" &&
      data.address.toLowerCase() === address.toLowerCase() &&
      validAbi(data.abi) &&
      object(data.compilation) &&
      typeof data.compilation.name === "string" &&
      data.compilation.name.trim() &&
      object(data.sources) &&
      Object.keys(data.sources).length > 0 &&
      Object.values(data.sources).every(
        (file) => object(file) && typeof file.content === "string"
      )
    ) {
      return {
        statusCode: 200,
        body: {
          status: "1",
          message: "OK",
          result: [
            {
              ABI: JSON.stringify(data.abi),
              ContractName: data.compilation.name,
              // Match the existing Etherscan standard-JSON wrapper consumed by getSourceCode.
              SourceCode: `{${JSON.stringify({ sources: data.sources })}}`,
              // Retain an existing verified explorer's proxy target for the same lookup.
              // Sourcify-only results make no proxy-resolution claim.
              Implementation: primary?.Implementation ?? "",
            },
          ],
          verification: {
            provider: "sourcify",
            // Never label a metadata-independent bytecode match as exact.
            match: data.match === "exact_match" && data.runtimeMatch === "exact_match"
              ? "exact_match" : "match",
            chainId,
            address: address.toLowerCase(),
          },
        },
      };
    }
    // Missing runtime matches and payloads for another identity are disallowed.
    // They are not a usable verified result, even if they contain ABI/source fields.
  } catch (error) {
    if (!axios.isAxiosError(error) || error.response?.status !== 404)
      unavailable = true;
  }
  // Do not discard a usable explorer ABI when only its source was missing.
  if (primary)
    return {
      statusCode: 200,
      body: { status: "1", message: "OK", result: [primary] },
    };
  return {
    statusCode: unavailable ? 502 : 404,
    body: {
      status: "0",
      message: "NOTOK",
      result: [],
      error: unavailable
        ? "Contract metadata providers unavailable"
        : "No verified contract metadata found",
    },
  };
}
