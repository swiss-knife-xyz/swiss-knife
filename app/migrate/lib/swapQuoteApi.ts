/**
 * Walletchan swap-quote client. Mirrors the relevant subset of
 * `SwapQuoteResponse` from `wchan/walletchan/apps/extension/src/chrome/swapApi.ts`.
 *
 * The native sentinel used by the upstream API is the all-Es address
 * (`0xEeeE...EeeE`); our PortfolioToken model uses the literal string
 * "native". Callers must translate before passing addresses in.
 */

export const NATIVE_TOKEN_ADDRESS_0X =
  "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

export interface SwapQuoteParams {
  chainId: number;
  sellToken: string; // checksum or "native" — translated at request build
  buyToken: string;
  sellAmountWei: bigint;
  taker: string;
  slippageBps?: number;
  /** Alternate destination for the bought tokens. Defaults to taker on 0x's
   *  side when omitted. Not supported by 0x for wrap/unwrap pairs. */
  recipient?: string;
}

export interface SwapQuoteResponse {
  buyAmount: string; // wei
  sellAmount: string; // wei
  buyToken: string;
  sellToken: string;
  gas?: string;
  gasPrice?: string;
  totalNetworkFee?: string;
  liquidityAvailable?: boolean;
  minBuyAmount?: string;
  allowanceTarget?: string;
  transaction?: {
    to: string;
    data: string;
    value: string;
    gas?: string;
    gasPrice?: string;
  };
  /** Walletchan/0x integrator fee — what *we* skim per swap. The singular
   *  `integratorFee` is what 0x returns; `integratorFees` is the array form
   *  walletchan's response sometimes uses. Read either. */
  fees?: {
    integratorFee?: SwapFeeEntry | null;
    integratorFees?: SwapFeeEntry[];
    zeroExFee?: SwapFeeEntry | null;
    gasFee?: SwapFeeEntry | null;
  };
  /** True when the taker qualifies for the reduced premium tier
   *  (sWCHAN staker — 0.3% instead of 0.8%). */
  isPremiumFee?: boolean;
}

export interface SwapFeeEntry {
  amount: string; // wei, in `token`'s decimals
  token: string;
  type: string; // "volume" | "gas" | ...
}

const ENDPOINT = "/api/wallet-migrate-swap-quote";

function toUpstreamAddress(address: string): string {
  if (address.toLowerCase() === "native") return NATIVE_TOKEN_ADDRESS_0X;
  return address;
}

export async function fetchSwapQuote(
  params: SwapQuoteParams,
  signal?: AbortSignal
): Promise<SwapQuoteResponse> {
  const qs = new URLSearchParams({
    chainId: params.chainId.toString(),
    sellToken: toUpstreamAddress(params.sellToken),
    buyToken: toUpstreamAddress(params.buyToken),
    sellAmount: params.sellAmountWei.toString(),
    taker: params.taker,
  });
  if (params.slippageBps !== undefined) {
    qs.set("slippageBps", params.slippageBps.toString());
  }
  if (params.recipient) {
    qs.set("recipient", params.recipient);
  }
  const res = await fetch(`${ENDPOINT}?${qs.toString()}`, { signal });
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.error ? `: ${body.error}` : "";
    } catch {
      // ignore
    }
    throw new Error(`Quote fetch failed (${res.status})${detail}`);
  }
  return (await res.json()) as SwapQuoteResponse;
}
