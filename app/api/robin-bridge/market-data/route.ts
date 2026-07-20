import { NextRequest, NextResponse } from "next/server";
import { erc20Abi, formatUnits, isAddress, type Address } from "viem";
import { getPublicClient } from "@/lib/publicClient";
import { BASE_CHAIN_ID } from "@/app/robin-bridge/lib/oft";
import type { RobinMarketData } from "@/app/robin-bridge/lib/liquidity";

const GECKO_API = "https://api.geckoterminal.com/api/v2";
const COINGECKO_API = "https://api.coingecko.com/api/v3";
const BASE_WETH = "0x4200000000000000000000000000000000000006";
const NATIVE_ETH = "0x0000000000000000000000000000000000000000";
const CACHE_MS = 30_000;

type CacheEntry = { expiresAt: number; data: RobinMarketData };
const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<RobinMarketData>>();

type GeckoPool = {
  attributes?: {
    address?: string;
    name?: string;
    base_token_price_native_currency?: string;
    quote_token_price_native_currency?: string;
    reserve_in_usd?: string;
  };
  relationships?: {
    base_token?: { data?: { id?: string } };
    quote_token?: { data?: { id?: string } };
    dex?: { data?: { id?: string } };
  };
};

const relationshipAddress = (id?: string) =>
  id?.split("_").at(-1)?.toLowerCase();

const finiteNumber = (value: unknown) => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

async function fetchMarketData(
  baseToken: Address,
  fresh = false
): Promise<RobinMarketData> {
  const poolsUrl = `${GECKO_API}/networks/base/tokens/${baseToken}/pools?include=base_token,quote_token&page=1`;
  const ethUrl = `${COINGECKO_API}/simple/price?ids=ethereum&vs_currencies=usd&include_last_updated_at=true`;
  const baseClient = getPublicClient(BASE_CHAIN_ID);

  const [tokenReads, ethResponse, poolsResult] = await Promise.all([
    baseClient.multicall({
      allowFailure: false,
      contracts: [
        { address: baseToken, abi: erc20Abi, functionName: "decimals" },
        { address: baseToken, abi: erc20Abi, functionName: "totalSupply" },
      ],
    }),
    fetch(ethUrl, fresh ? { cache: "no-store" } : { next: { revalidate: 30 } }),
    fetch(poolsUrl, {
      headers: { Accept: "application/json", "Accept-Version": "20230302" },
      ...(fresh
        ? { cache: "no-store" as const }
        : { next: { revalidate: 30 } }),
    }).then(async (response) => ({
      ok: response.ok,
      status: response.status,
      body: response.ok
        ? ((await response.json()) as { data?: GeckoPool[] })
        : null,
    })),
  ]);

  if (!ethResponse.ok) {
    throw new Error(`CoinGecko returned ${ethResponse.status}`);
  }
  const ethPayload = (await ethResponse.json()) as {
    ethereum?: { usd?: number; last_updated_at?: number };
  };
  const ethUsd = finiteNumber(ethPayload.ethereum?.usd);
  if (!ethUsd || ethUsd <= 0)
    throw new Error("CoinGecko ETH price was unavailable");

  const [baseDecimals, totalSupplyRaw] = tokenReads;
  const totalSupplyFormatted = formatUnits(totalSupplyRaw, baseDecimals);
  const totalSupply = Number(totalSupplyFormatted);
  if (!Number.isFinite(totalSupply) || totalSupply <= 0) {
    throw new Error("Base token total supply was invalid");
  }

  let referencePool: RobinMarketData["referencePool"] = null;
  let poolLookupError: string | undefined;
  if (!poolsResult.ok) {
    poolLookupError = `GeckoTerminal returned ${poolsResult.status}`;
  } else {
    const tokenLower = baseToken.toLowerCase();
    for (const pool of poolsResult.body?.data ?? []) {
      const baseAddress = relationshipAddress(
        pool.relationships?.base_token?.data?.id
      );
      const quoteAddress = relationshipAddress(
        pool.relationships?.quote_token?.data?.id
      );
      const tokenIsBase = baseAddress === tokenLower;
      const tokenIsQuote = quoteAddress === tokenLower;
      const pairAddress = tokenIsBase
        ? quoteAddress
        : tokenIsQuote
          ? baseAddress
          : null;
      if (pairAddress !== BASE_WETH && pairAddress !== NATIVE_ETH) continue;

      const tokenEth = finiteNumber(
        tokenIsBase
          ? pool.attributes?.base_token_price_native_currency
          : pool.attributes?.quote_token_price_native_currency
      );
      if (!tokenEth || tokenEth <= 0 || !pool.attributes?.address) continue;
      referencePool = {
        address: pool.attributes.address,
        name: pool.attributes.name ?? "Base ETH pool",
        dex: pool.relationships?.dex?.data?.id ?? "unknown",
        reserveUsd: finiteNumber(pool.attributes.reserve_in_usd),
        tokenEth,
      };
      break;
    }
  }

  const tokenUsd = referencePool ? referencePool.tokenEth * ethUsd : null;
  const fdvUsd = tokenUsd ? tokenUsd * totalSupply : null;
  return {
    baseToken,
    baseDecimals,
    totalSupply: totalSupplyFormatted,
    ethUsd,
    tokenUsd,
    fdvUsd,
    referencePool,
    updatedAt: new Date(
      (ethPayload.ethereum?.last_updated_at ?? Date.now() / 1000) * 1000
    ).toISOString(),
    ...(poolLookupError ? { poolLookupError } : {}),
  };
}

async function getMarketData(baseToken: Address, fresh = false) {
  const key = baseToken.toLowerCase();
  const cached = cache.get(key);
  if (!fresh && cached && cached.expiresAt > Date.now()) return cached.data;

  const pending = inFlight.get(key);
  if (!fresh && pending) return pending;

  const request = fetchMarketData(baseToken, fresh)
    .then((data) => {
      if (cache.size >= 100) cache.delete(cache.keys().next().value as string);
      cache.set(key, { data, expiresAt: Date.now() + CACHE_MS });
      return data;
    })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, request);
  return request;
}

export async function GET(request: NextRequest) {
  const baseToken = request.nextUrl.searchParams.get("baseToken");
  if (!baseToken || !isAddress(baseToken)) {
    return NextResponse.json(
      { error: "Invalid Base token address." },
      { status: 400 }
    );
  }

  try {
    const data = await getMarketData(
      baseToken,
      request.nextUrl.searchParams.get("fresh") === "1"
    );
    return NextResponse.json(data, {
      headers: {
        "Cache-Control":
          "public, max-age=15, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Market data unavailable.",
      },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}
