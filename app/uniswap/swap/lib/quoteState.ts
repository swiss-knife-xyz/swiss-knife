import { Address } from "viem";
import { PoolWithHookData, QuoteExactInputParams } from "@/lib/uniswap/types";

export interface SwapQuoteSnapshot {
  requestKey: string;
  chainId: number;
  tokenOut: Address;
  quoteParams: QuoteExactInputParams;
  routingPath: PoolWithHookData[];
  amountOut: bigint;
}

export const createQuoteRequestKey = ({
  chainId,
  tokenOut,
  quoteParams,
}: {
  chainId: number;
  tokenOut: Address;
  quoteParams: QuoteExactInputParams;
}): string =>
  JSON.stringify({
    chainId,
    tokenOut: tokenOut.toLowerCase(),
    exactCurrency: quoteParams.exactCurrency.toLowerCase(),
    exactAmount: quoteParams.exactAmount.toString(),
    path: quoteParams.path.map((segment) => ({
      intermediateCurrency: segment.intermediateCurrency.toLowerCase(),
      fee: segment.fee,
      tickSpacing: segment.tickSpacing,
      hooks: segment.hooks.toLowerCase(),
      hookData: segment.hookData.toLowerCase(),
    })),
  });

export const isQuoteSnapshotCurrent = (
  snapshot: SwapQuoteSnapshot | null,
  requestKey: string | null
) => snapshot !== null && snapshot.requestKey === requestKey;
