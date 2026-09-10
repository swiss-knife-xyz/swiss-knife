export const TREASURY_QUOTE_SYMBOLS = ["SBET", "BMNR"] as const;

export type TreasuryQuoteSymbol = (typeof TREASURY_QUOTE_SYMBOLS)[number];

export type TreasuryQuote = {
  symbol: TreasuryQuoteSymbol;
  price: number;
  change: number;
  changesPercentage: number;
  currency: "USD";
  updatedAt: string;
  provider: "finnhub";
};

export type TreasuryQuotesResponse = {
  source: "finnhub";
  cachedAt: string;
  expiresAt: string;
  stale: boolean;
  quotes: Partial<Record<TreasuryQuoteSymbol, TreasuryQuote>>;
};
