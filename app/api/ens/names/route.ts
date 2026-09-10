import { NextRequest, NextResponse } from "next/server";
import { getAddress, isAddress, type Address } from "viem";

const ENS_SUBGRAPH_ID = "5XqPmWe6gjyrJtFn9cLy237i4cWw2j9HcUJEXsP5qGtH";
const EMPTY_ADDRESS = "0x0000000000000000000000000000000000000000";
const ADDR_REVERSE_NODE =
  "0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2";
const DEFAULT_LIMIT = 18;
const MAX_LIMIT = 50;

type EnsSubgraphDomain = {
  id: string;
  labelName: string | null;
  name: string | null;
  owner?: { id: string } | null;
  registrant?: { id: string } | null;
  wrappedOwner?: { id: string } | null;
  parent?: { name: string | null } | null;
  registration?: { expiryDate: string | null } | null;
  wrappedDomain?: { expiryDate: string | null } | null;
};

type EnsOwnedName = {
  id: string;
  name: string;
  label: string;
  parentName: string | null;
  expiryDate: number | null;
  relation: {
    owner: boolean;
    registrant: boolean;
    wrappedOwner: boolean;
  };
};

type EnsNamesResponse = {
  data?: {
    domains?: EnsSubgraphDomain[];
  };
  errors?: Array<{ message?: string }>;
};

const getEnsSubgraphUrl = () => {
  const apiKey =
    process.env.THE_GRAPH_API_KEY ?? process.env.NEXT_PUBLIC_THE_GRAPH_API_KEY;

  if (!apiKey) return null;

  return `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/${ENS_SUBGRAPH_ID}`;
};

const normalizeLimit = (value: string | null) => {
  const parsed = value ? Number.parseInt(value, 10) : DEFAULT_LIMIT;
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, parsed));
};

const toOwnedName = (
  domain: EnsSubgraphDomain,
  address: Address
): EnsOwnedName | null => {
  const name = domain.name?.toLowerCase() ?? "";
  if (!name || !name.endsWith(".eth") || name.includes("[")) return null;

  const addressLower = address.toLowerCase();
  const expiryDate =
    domain.registration?.expiryDate ?? domain.wrappedDomain?.expiryDate ?? null;

  return {
    id: domain.id,
    name,
    label: name.slice(0, -4),
    parentName: domain.parent?.name ?? null,
    expiryDate: expiryDate ? Number(expiryDate) : null,
    relation: {
      owner: domain.owner?.id === addressLower,
      registrant: domain.registrant?.id === addressLower,
      wrappedOwner: domain.wrappedOwner?.id === addressLower,
    },
  };
};

export async function GET(request: NextRequest) {
  const addressParam = request.nextUrl.searchParams.get("address");

  if (!addressParam || !isAddress(addressParam)) {
    return NextResponse.json(
      { error: "address parameter is required" },
      { status: 400 }
    );
  }

  const subgraphUrl = getEnsSubgraphUrl();
  if (!subgraphUrl) {
    return NextResponse.json(
      { error: "The Graph API key is not configured" },
      { status: 503 }
    );
  }

  const address = getAddress(addressParam);
  const addressLower = address.toLowerCase();
  const limit = normalizeLimit(request.nextUrl.searchParams.get("limit"));
  const nowSeconds = `${Math.floor(Date.now() / 1_000)}`;

  const query = `
    query GetNamesForAddress($first: Int!, $whereFilter: Domain_filter) {
      domains(
        orderBy: expiryDate
        orderDirection: asc
        first: $first
        where: $whereFilter
      ) {
        id
        labelName
        name
        parent {
          name
        }
        owner {
          id
        }
        registrant {
          id
        }
        wrappedOwner {
          id
        }
        registration {
          expiryDate
        }
        wrappedDomain {
          expiryDate
        }
      }
    }
  `;

  const whereFilter = {
    and: [
      {
        or: [
          { owner: addressLower },
          { registrant: addressLower },
          { wrappedOwner: addressLower },
        ],
      },
      { parent_not: ADDR_REVERSE_NODE },
      {
        or: [{ expiryDate_gt: nowSeconds }, { expiryDate: null }],
      },
      {
        or: [
          { owner_not: EMPTY_ADDRESS },
          { resolver_not: null },
          {
            and: [
              { registrant_not: EMPTY_ADDRESS },
              { registrant_not: null },
            ],
          },
        ],
      },
    ],
  };

  try {
    const response = await fetch(subgraphUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        variables: {
          first: limit,
          whereFilter,
        },
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `ENS subgraph request failed with ${response.status}` },
        { status: 502 }
      );
    }

    const data = (await response.json()) as EnsNamesResponse;
    if (data.errors?.length) {
      return NextResponse.json(
        { error: data.errors[0]?.message ?? "ENS subgraph request failed" },
        { status: 502 }
      );
    }

    const seen = new Set<string>();
    const names = (data.data?.domains ?? [])
      .map((domain) => toOwnedName(domain, address))
      .filter((name): name is EnsOwnedName => {
        if (!name || seen.has(name.name)) return false;
        seen.add(name.name);
        return true;
      });

    return NextResponse.json(
      { names },
      {
        headers: {
          "Cache-Control":
            "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `ENS names fetch failed: ${message}` },
      { status: 502 }
    );
  }
}
