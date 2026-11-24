import { NATIVE_TOKEN_ADDRESS_0X } from "./swapQuoteApi";
import type { TargetTokenEntry } from "./swapTypes";

export const BRIDGE_NATIVE_TOKEN_ADDRESS =
  "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

export enum BridgeStatusCode {
  PENDING = 0,
  ASSIGNED = 1,
  EXTRACTED = 2,
  FULFILLED = 3,
  SETTLED = 4,
  EXPIRED = 5,
  CANCELLED = 6,
  REFUNDED = 7,
}

export const TERMINAL_BRIDGE_STATUS_CODES = new Set<number>([
  BridgeStatusCode.FULFILLED,
  BridgeStatusCode.SETTLED,
  BridgeStatusCode.EXPIRED,
  BridgeStatusCode.CANCELLED,
  BridgeStatusCode.REFUNDED,
]);

export interface BridgeToken {
  chainId?: number;
  address: string;
  name?: string;
  symbol?: string;
  decimals?: number;
  icon?: string;
  logoURI?: string;
}

export interface BridgeNativeCurrency {
  address?: string;
  icon?: string;
  logoURI?: string;
  name?: string;
  symbol?: string;
  decimals?: number;
  minNativeCurrencyForGas?: string;
}

export interface BridgeChain {
  chainId: number;
  name: string;
  icon?: string;
  logoURI?: string;
  currency?: BridgeNativeCurrency;
  explorers?: string[];
  sendingEnabled?: boolean;
  receivingEnabled?: boolean;
  bgColor?: string;
}

export interface BridgeChainsResponse {
  success: boolean;
  result: BridgeChain[];
}

export interface BridgeTokenListResponse {
  success: boolean;
  result: Record<string, BridgeToken[]>;
}

export interface BridgeAmountAndUsd {
  token: BridgeToken;
  amount: string;
  priceInUsd?: number;
  valueInUsd?: number;
  minAmountOut?: string;
}

export interface BridgeApprovalData {
  amount: string;
  tokenAddress: string;
  spenderAddress: string;
  userAddress: string;
}

export interface BridgeTxData {
  to: string;
  data: string;
  value: string;
  chainId: number;
  gas?: string;
  gasPrice?: string;
}

export interface BridgeManualRoute {
  output: BridgeAmountAndUsd;
  quoteId: string;
  quoteExpiry?: number;
  expiresAt?: number;
  statusCheck?: {
    maxDurationSec?: number;
    [key: string]: unknown;
  };
  gasFee?: {
    gasAmount?: string;
    feesInUsd?: number;
    feeInUsd?: number;
    gasToken?: BridgeToken;
    gasLimit?: string;
    gasPrice?: string;
    estimatedFee?: string;
  };
  routeDetails?: {
    name?: string;
    logoURI?: string;
  };
  estimatedTime?: number;
  approvalData?: BridgeApprovalData | null;
  txData?: BridgeTxData;
  socketRoute?: Record<string, unknown>;
}

export interface BridgeQuoteResponse {
  success: boolean;
  result: {
    input: BridgeAmountAndUsd;
    routes?: Record<string, unknown>[];
    manualRoutes: BridgeManualRoute[];
    quoteId?: string;
    quoteExpiry?: number;
  };
  isPremiumFee?: boolean;
  feeBps?: string;
}

export interface BridgeStatusEntry {
  hash?: string;
  quoteId?: string;
  status?: string;
  statusCode?: string;
  bungeeStatusCode: BridgeStatusCode;
  originData?: {
    txHash?: string;
    originChainId?: number;
    status?: string;
    userAddress?: string;
    timestamp?: number;
  };
  destinationData?: {
    txHash?: string;
    destinationChainId?: number;
    receiverAddress?: string;
    status?: string;
    timestamp?: number;
  };
  refund?: {
    txHash?: string;
    chainId?: number;
    originChainId?: number;
  } | null;
  routeDetails?: {
    name?: string;
    logoURI?: string;
  };
  socketStatus?: Record<string, unknown>;
}

export interface BridgeStatusResponse {
  success: boolean;
  result: BridgeStatusEntry[];
}

export interface BridgeQuoteParams {
  userAddress: string;
  receiverAddress?: string;
  originChainId: number;
  destinationChainId: number;
  inputToken: string;
  outputToken: string;
  inputAmountWei: bigint;
  slippageBps?: number;
}

export interface BridgeStatusParams {
  requestHash?: string;
  quoteId?: string;
  txHash?: string;
}

const CHAINS_ENDPOINT = "/api/wallet-migrate-bridge-chains";
const TOKENS_ENDPOINT = "/api/wallet-migrate-bridge-tokens";
const QUOTE_ENDPOINT = "/api/wallet-migrate-bridge-quote";
const STATUS_ENDPOINT = "/api/wallet-migrate-bridge-status";

export function toBridgeAddress(address: string): string {
  const lower = address.toLowerCase();
  if (lower === "native") return NATIVE_TOKEN_ADDRESS_0X;
  if (lower === BRIDGE_NATIVE_TOKEN_ADDRESS) return NATIVE_TOKEN_ADDRESS_0X;
  return address;
}

export function bridgeTokenToTarget(token: BridgeToken): TargetTokenEntry {
  const address =
    token.address.toLowerCase() === BRIDGE_NATIVE_TOKEN_ADDRESS ||
    token.address.toLowerCase() === NATIVE_TOKEN_ADDRESS_0X.toLowerCase()
      ? "native"
      : token.address;
  return {
    address,
    symbol: token.symbol ?? "TOKEN",
    name: token.name ?? token.symbol ?? "Unknown token",
    decimals: token.decimals ?? 18,
    logoUrl: token.logoURI ?? token.icon,
  };
}

export async function fetchBridgeChains(
  signal?: AbortSignal
): Promise<BridgeChain[]> {
  const res = await fetch(CHAINS_ENDPOINT, { signal });
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.error ? `: ${body.error}` : "";
    } catch {
      // ignore
    }
    throw new Error(`Bridge chains fetch failed (${res.status})${detail}`);
  }
  const data = (await res.json()) as BridgeChainsResponse;
  return data.result ?? [];
}

export async function fetchBridgeTokenList(
  chainId: number,
  signal?: AbortSignal
): Promise<BridgeToken[]> {
  const res = await fetch(`${TOKENS_ENDPOINT}?chainId=${chainId}`, { signal });
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.error ? `: ${body.error}` : "";
    } catch {
      // ignore
    }
    throw new Error(`Bridge token list fetch failed (${res.status})${detail}`);
  }
  const data = (await res.json()) as BridgeTokenListResponse;
  return data.result?.[String(chainId)] ?? [];
}

export async function fetchBridgeQuote(
  params: BridgeQuoteParams,
  signal?: AbortSignal
): Promise<BridgeQuoteResponse> {
  const qs = new URLSearchParams({
    userAddress: params.userAddress,
    receiverAddress: params.receiverAddress ?? params.userAddress,
    originChainId: params.originChainId.toString(),
    destinationChainId: params.destinationChainId.toString(),
    inputToken: toBridgeAddress(params.inputToken),
    outputToken: toBridgeAddress(params.outputToken),
    inputAmount: params.inputAmountWei.toString(),
  });
  if (params.slippageBps !== undefined) {
    qs.set("slippage", (params.slippageBps / 100).toString());
  }

  const res = await fetch(`${QUOTE_ENDPOINT}?${qs.toString()}`, { signal });
  const data = await res.json();
  if (!res.ok) {
    const detail = data?.error || data?.message || data?.reason;
    throw new Error(
      `Bridge quote fetch failed (${res.status})${detail ? `: ${detail}` : ""}`
    );
  }
  if (!data?.success || !data?.result?.manualRoutes?.length) {
    throw new Error("No bridge routes available for this pair");
  }
  return data as BridgeQuoteResponse;
}

export async function fetchBridgeStatus(
  params: BridgeStatusParams,
  signal?: AbortSignal
): Promise<BridgeStatusResponse> {
  const qs = new URLSearchParams();
  const quoteId = params.quoteId ?? params.requestHash;
  if (quoteId) qs.set("requestHash", quoteId);
  if (params.txHash) qs.set("txHash", params.txHash);

  const res = await fetch(`${STATUS_ENDPOINT}?${qs.toString()}`, { signal });
  const data = await res.json();
  if (!res.ok) {
    const detail = data?.error || data?.message || data?.reason;
    throw new Error(
      `Bridge status fetch failed (${res.status})${detail ? `: ${detail}` : ""}`
    );
  }
  return data as BridgeStatusResponse;
}
