import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { FaucetRating } from "@/models/faucetRating";
import { faucets } from "@/app/faucet/faucets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_FIELD_LENGTH = 180;

type FaucetRatingPayload = {
  faucetId?: unknown;
  chain?: unknown;
  token?: unknown;
  worked?: unknown;
  cooldownHours?: unknown;
};

const cleanField = (value: unknown) =>
  typeof value === "string" ? value.trim().slice(0, MAX_FIELD_LENGTH) : "";

const unique = <T>(values: T[]) => Array.from(new Set(values));

const getTokenSymbols = (token: string) =>
  unique(
    token
      .toUpperCase()
      .split(/[^A-Z0-9]+/)
      .filter(Boolean)
      .filter((symbol) => symbol !== "OR")
  );

const getFaucetChains = (faucet: (typeof faucets)[number]) => {
  if (faucet.variants?.length) {
    return unique(faucet.variants.map((variant) => variant.chain));
  }

  return faucet.supportedChains?.length
    ? faucet.supportedChains
    : [faucet.chain];
};

const getFaucetTokenSymbols = (faucet: (typeof faucets)[number]) =>
  faucet.variants?.length
    ? unique(faucet.variants.map((variant) => variant.token))
    : getTokenSymbols(faucet.token);

const isValidRatingVariant = (
  faucet: (typeof faucets)[number],
  chain: string,
  token: string
) => {
  if (faucet.variants?.length) {
    return faucet.variants.some(
      (variant) => variant.chain === chain && variant.token === token
    );
  }

  return (
    getFaucetChains(faucet).includes(chain) &&
    getFaucetTokenSymbols(faucet).includes(token)
  );
};

const connectMongo = async () => {
  if (!process.env.MONGODB_URL) {
    throw new Error("MONGODB_URL is not configured");
  }

  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(process.env.MONGODB_URL);
};

const buildAggregateResponse = (
  aggregates: Array<{
    _id: string;
    total: number;
    worked: number;
    failed: number;
    lastRatedAt?: Date;
  }>
) => {
  const ratings = aggregates.reduce<
    Record<
      string,
      {
        total: number;
        worked: number;
        failed: number;
        successRate: number;
        score: number;
        lastRatedAt?: string;
      }
    >
  >((acc, item) => {
    const total = item.total || 0;
    const worked = item.worked || 0;
    const failed = item.failed || 0;

    acc[item._id] = {
      total,
      worked,
      failed,
      successRate: total > 0 ? worked / total : 0,
      score: (worked + 1) / (total + 2),
      lastRatedAt: item.lastRatedAt?.toISOString(),
    };

    return acc;
  }, {});

  return NextResponse.json(
    { ratings },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
};

export const GET = async () => {
  if (!process.env.MONGODB_URL) {
    return buildAggregateResponse([]);
  }

  await connectMongo();

  const aggregates = await FaucetRating.aggregate([
    {
      $group: {
        _id: "$faucetId",
        total: { $sum: 1 },
        worked: {
          $sum: {
            $cond: [{ $eq: ["$worked", true] }, 1, 0],
          },
        },
        failed: {
          $sum: {
            $cond: [{ $eq: ["$worked", false] }, 1, 0],
          },
        },
        lastRatedAt: { $max: "$createdAt" },
      },
    },
  ]);

  return buildAggregateResponse(aggregates);
};

export const POST = async (request: Request) => {
  if (!process.env.MONGODB_URL) {
    return NextResponse.json(
      { error: "MONGODB_URL is not configured" },
      { status: 503 }
    );
  }

  let body: FaucetRatingPayload;

  try {
    body = (await request.json()) as FaucetRatingPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const faucetId = cleanField(body.faucetId);
  const chain = cleanField(body.chain);
  const token = cleanField(body.token);
  const faucet = faucets.find((entry) => entry.id === faucetId);

  if (
    !faucet ||
    !chain ||
    !token ||
    typeof body.worked !== "boolean" ||
    !isValidRatingVariant(faucet, chain, token)
  ) {
    return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
  }

  const cooldownHours =
    typeof body.cooldownHours === "number" &&
    Number.isFinite(body.cooldownHours)
      ? Math.max(0.25, Math.min(body.cooldownHours, 24 * 30))
      : undefined;

  await connectMongo();

  await FaucetRating.create({
    faucetId,
    provider: faucet.provider,
    faucetName: faucet.name,
    url: faucet.url,
    chain,
    token,
    worked: body.worked,
    cooldownHours,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
};
