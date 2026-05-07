// Canonical viem PublicClient factory. Every public client in the app — ad-hoc
// or module-scoped — must come from here so that env-configured custom RPC
// URLs (see `chainIdToCustomRpcUrl` in `data/common.ts`) are always honored.
//
// Direct `createPublicClient`/bare `http()` usage is banned by ESLint outside
// this file; if a new chain needs a custom RPC, add an entry to
// `chainIdToCustomRpcUrl` rather than hand-rolling a client elsewhere.
import {
  createPublicClient,
  http,
  type Chain,
  type HttpTransport,
  type PublicClient,
} from "viem";
import { chainIdToChain, getRpcUrlForChain } from "@/data/common";

type GetPublicClientOptions = {
  // Disable EIP-3668 CCIP-read so callers handle the OffchainLookup error themselves.
  ccipRead?: false;
};

// Typed with `Chain` (not `Chain | undefined`) so consumers that call
// chain-specific actions like `publicActionsL2().buildDepositTransaction`
// don't need to re-narrow the chain type at the call site.
type ChainPublicClient = PublicClient<HttpTransport, Chain>;

const cache: Record<number, ChainPublicClient> = {};

export const getPublicClient = (
  chainId: number,
  options?: GetPublicClientOptions
): ChainPublicClient => {
  // Only the option-less form is cached; option variants build a fresh client.
  if (!options && cache[chainId]) return cache[chainId];

  const chain = chainIdToChain[chainId];
  if (!chain) {
    throw new Error(`getPublicClient: unsupported chainId ${chainId}`);
  }

  const rpcUrl = getRpcUrlForChain(chainId);
  const client = createPublicClient({
    chain,
    transport: http(rpcUrl),
    ...(options?.ccipRead === false ? { ccipRead: false } : {}),
  }) as ChainPublicClient;

  if (!options) cache[chainId] = client;
  return client;
};

// Escape hatch for the rare case where a caller has an explicit RPC URL
// string (e.g. user-supplied RPC under test in /7702beat). Prefer
// `getPublicClient(chainId)` for normal flows so env-configured RPCs apply.
export const createPublicClientForRpcUrl = (rpcUrl: string): PublicClient =>
  createPublicClient({ transport: http(rpcUrl) }) as PublicClient;
