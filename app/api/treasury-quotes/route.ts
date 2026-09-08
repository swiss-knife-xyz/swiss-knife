import { NextResponse } from "next/server";
import {
  TREASURY_QUOTE_SYMBOLS,
  type TreasuryQuote,
  type TreasuryQuoteSymbol,
  type TreasuryQuotesResponse,
} from "@/lib/treasury-quotes";

export const dynamic = "force-dynamic";

const FINNHUB_QUOTE_URL = "https://finnhub.io/api/v1/quote";
const SERVER_CACHE_TTL_MS = 30 * 60 * 1000;
const BROWSER_CACHE_SECONDS = 5 * 60;
const CDN_CACHE_SECONDS = 30 * 60;
const CDN_STALE_SECONDS = 60 * 60;

type CachedQuotes = {
  data: TreasuryQuotesResponse;
  expiresAtMs: number;
};

type FinnhubQuote = {
  c?: unknown;
  d?: unknown;
  dp?: unknown;
  pc?: unknown;
  t?: unknown;
};

let quoteCache: CachedQuotes | null = null;
let inFlightQuotes: Promise<TreasuryQuotesResponse> | null = null;

function jsonHeaders(cacheStatus: "HIT" | "MISS" | "STALE" | "ERROR") {
  return {
    "Cache-Control": `public, max-age=${BROWSER_CACHE_SECONDS}, s-maxage=${CDN_CACHE_SECONDS}, stale-while-revalidate=${CDN_STALE_SECONDS}`,
    "X-ETHSH-Quote-Cache": cacheStatus,
  };
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  const normalized = value.replace(/[,%()]/g, "").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeQuote(
  symbol: TreasuryQuoteSymbol,
  rawQuote: FinnhubQuote
): TreasuryQuote | null {
  const price = toNumber(rawQuote.c);
  const previousClose = toNumber(rawQuote.pc);
  const explicitChange = toNumber(rawQuote.d);
  const change =
    explicitChange ??
    (price !== null && previousClose !== null ? price - previousClose : null);
  const explicitPercent = toNumber(rawQuote.dp);
  const changesPercentage =
    explicitPercent ??
    (change !== null && previousClose && previousClose !== 0
      ? (change / previousClose) * 100
      : null);

  if (
    price === null ||
    price <= 0 ||
    change === null ||
    changesPercentage === null
  ) {
    return null;
  }

  const timestamp = toNumber(rawQuote.t);
  const updatedAt =
    timestamp && timestamp > 0
      ? new Date(timestamp * 1000).toISOString()
      : new Date().toISOString();

  return {
    symbol,
    price,
    change,
    changesPercentage,
    currency: "USD",
    updatedAt,
    provider: "finnhub",
  };
}

async function fetchFinnhubQuote(
  symbol: TreasuryQuoteSymbol,
  apiKey: string
): Promise<TreasuryQuote | null> {
  const url = new URL(FINNHUB_QUOTE_URL);
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("token", apiKey);

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(
      `Finnhub quote request for ${symbol} failed with ${response.status}`
    );
  }

  const payload = (await response.json()) as unknown;
  if (!payload || typeof payload !== "object") {
    throw new Error(`Finnhub quote response for ${symbol} was invalid`);
  }

  return normalizeQuote(symbol, payload as FinnhubQuote);
}

async function fetchFinnhubQuotes(): Promise<TreasuryQuotesResponse> {
  const apiKey = process.env.FINNHUB_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("FINNHUB_API_KEY is not configured");
  }

  const quoteResults = await Promise.all(
    TREASURY_QUOTE_SYMBOLS.map((symbol) => fetchFinnhubQuote(symbol, apiKey))
  );

  const quotes = quoteResults.reduce<TreasuryQuotesResponse["quotes"]>(
    (acc, quote) => {
      if (quote) acc[quote.symbol] = quote;
      return acc;
    },
    {}
  );

  if (Object.keys(quotes).length === 0) {
    throw new Error("Finnhub quote response did not include treasury symbols");
  }

  const now = Date.now();
  const data: TreasuryQuotesResponse = {
    source: "finnhub",
    cachedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + SERVER_CACHE_TTL_MS).toISOString(),
    stale: false,
    quotes,
  };

  quoteCache = {
    data,
    expiresAtMs: now + SERVER_CACHE_TTL_MS,
  };

  return data;
}

async function getFreshQuotes() {
  if (!inFlightQuotes) {
    inFlightQuotes = fetchFinnhubQuotes().finally(() => {
      inFlightQuotes = null;
    });
  }

  return inFlightQuotes;
}

export async function GET() {
  const now = Date.now();

  if (quoteCache && now < quoteCache.expiresAtMs) {
    return NextResponse.json(quoteCache.data, {
      headers: jsonHeaders("HIT"),
    });
  }

  try {
    const data = await getFreshQuotes();
    return NextResponse.json(data, {
      headers: jsonHeaders("MISS"),
    });
  } catch (error) {
    if (quoteCache) {
      return NextResponse.json(
        {
          ...quoteCache.data,
          stale: true,
        },
        { headers: jsonHeaders("STALE") }
      );
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Treasury quote fetch failed: ${message}` },
      {
        status: message.includes("FINNHUB_API_KEY") ? 503 : 502,
        headers: {
          "Cache-Control": "no-store",
          "X-ETHSH-Quote-Cache": "ERROR",
        },
      }
    );
  }
}
