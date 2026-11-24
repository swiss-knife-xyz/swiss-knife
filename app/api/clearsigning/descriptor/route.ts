import { NextRequest, NextResponse } from "next/server";
import { toFunctionSelector } from "viem";
import {
  fetchRegistryBytes,
  isRegistryPath,
  mergeRegistryDescriptor,
  parseRegistryDescriptor,
  REGISTRY_MAX_DESCRIPTOR_BYTES,
  REGISTRY_RAW_BASE,
  resolveRegistryInclude,
  type DescriptorKind as Kind,
  type RegistryDescriptor as RawDescriptor,
  type RegistryEntry as IndexEntry,
} from "@/lib/clearSigningRegistry";
import { getRegistrySnapshot } from "./registry";

export const runtime = "nodejs";

// Descriptor JSON cache (post-include-resolution).
const descCache = new Map<string, { data: RawDescriptor; fetchedAt: number }>();
const DESCRIPTOR_TTL_MS = 24 * 3600 * 1000;

async function fetchAndResolve(p: string, depth = 0): Promise<RawDescriptor> {
  if (depth > 3) throw new Error("include depth exceeded");
  const cached = descCache.get(p);
  if (cached && Date.now() - cached.fetchedAt < DESCRIPTOR_TTL_MS)
    return cached.data;

  if (!isRegistryPath(p)) throw new Error("Invalid registry descriptor path");
  let desc = parseRegistryDescriptor(
    JSON.parse(
      (
        await fetchRegistryBytes(
          `${REGISTRY_RAW_BASE}/${p}`,
          REGISTRY_MAX_DESCRIPTOR_BYTES
        )
      ).toString("utf8")
    )
  );

  if (desc.includes) {
    const inner = await fetchAndResolve(
      resolveRegistryInclude(p, desc.includes),
      depth + 1
    );
    desc = mergeRegistryDescriptor(inner, desc);
  }

  descCache.set(p, { data: desc, fetchedAt: Date.now() });
  return desc;
}

function pathsFor(entry: IndexEntry, kind: Kind | ""): string[] {
  const value = kind ? entry[kind] : entry.calldata || entry.eip712;
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function stripParamNames(sig: string): string {
  return sig
    .replace(/\s+(?:indexed\s+)?[A-Za-z_$][A-Za-z0-9_$]*(?=\s*[,)])/g, "")
    .replace(/\s+/g, "");
}

function descriptorMatchesHint(
  desc: RawDescriptor,
  kind: Kind,
  selector: string | null,
  formatKey: string | null
): boolean {
  const formats = desc.display?.formats;
  if (!formats) return false;

  if (kind === "eip712") {
    if (!formatKey) return true;
    const normalizedWant = formatKey.replace(/\s+/g, "");
    return Object.keys(formats).some(
      (key) => key === formatKey || key.replace(/\s+/g, "") === normalizedWant
    );
  }

  if (!selector) return true;
  const want = selector.toLowerCase();
  for (const key of Object.keys(formats)) {
    try {
      if (toFunctionSelector(stripParamNames(key)).toLowerCase() === want) {
        return true;
      }
    } catch {
      // Ignore malformed registry signatures and keep scanning candidates.
    }
  }
  return false;
}

async function resolveDescriptorPath(
  paths: string[],
  kind: Kind,
  selector: string | null,
  formatKey: string | null
): Promise<{ desc: RawDescriptor; path: string } | null> {
  let firstResolved: { desc: RawDescriptor; path: string } | null = null;
  let lastError: unknown;

  for (const path of paths) {
    try {
      const desc = await fetchAndResolve(path);
      firstResolved ??= { desc, path };
      if (descriptorMatchesHint(desc, kind, selector, formatKey)) {
        return { desc, path };
      }
    } catch (err) {
      lastError = err;
      console.warn(
        `descriptor candidate failed for ${path}: ${(err as Error).message}`
      );
    }
  }

  // Backward-compatible fallback for callers that do not send a selector or
  // EIP-712 encoded type yet.
  if (!selector && !formatKey) return firstResolved;
  if (!firstResolved && lastError) throw lastError;
  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const chainId = searchParams.get("chainId");
  const addressRaw = searchParams.get("address");
  const kind = (searchParams.get("kind") || "") as Kind | "";
  const selectorRaw = searchParams.get("selector");
  const selector = selectorRaw ? selectorRaw.toLowerCase() : null;
  const formatKey = searchParams.get("formatKey");

  if (!chainId || !/^\d+$/.test(chainId)) {
    return NextResponse.json(
      { error: "Missing or invalid chainId" },
      { status: 400 }
    );
  }
  if (!addressRaw || !/^0x[0-9a-fA-F]{40}$/.test(addressRaw)) {
    return NextResponse.json(
      { error: "Missing or invalid address" },
      { status: 400 }
    );
  }
  if (kind && kind !== "calldata" && kind !== "eip712") {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }
  if (selector && !/^0x[0-9a-f]{8}$/.test(selector)) {
    return NextResponse.json({ error: "Invalid selector" }, { status: 400 });
  }
  if (formatKey && formatKey.length > 8192) {
    return NextResponse.json({ error: "Invalid formatKey" }, { status: 400 });
  }

  const address = addressRaw.toLowerCase();

  const snapshot = await getRegistrySnapshot();
  const entry = snapshot.entries[chainId]?.[address];
  if (!entry) {
    return NextResponse.json(
      { error: "no descriptor" },
      { status: 404, headers: { "Cache-Control": "public, s-maxage=3600" } }
    );
  }

  const resolvedKind: Kind =
    kind ||
    (formatKey
      ? "eip712"
      : selector
        ? "calldata"
        : entry.calldata
          ? "calldata"
          : "eip712");
  const paths = pathsFor(entry, resolvedKind);
  if (paths.length === 0) {
    return NextResponse.json(
      { error: "no descriptor for kind" },
      { status: 404, headers: { "Cache-Control": "public, s-maxage=3600" } }
    );
  }

  try {
    const resolved = await resolveDescriptorPath(
      paths,
      resolvedKind,
      selector,
      formatKey
    );
    if (!resolved) {
      return NextResponse.json(
        { error: "no descriptor for requested format" },
        { status: 404, headers: { "Cache-Control": "public, s-maxage=3600" } }
      );
    }
    const descriptor = resolved.desc;
    return NextResponse.json(
      {
        descriptor,
        sourcePath: resolved.path,
        kind: resolvedKind,
      },
      { headers: { "Cache-Control": "public, s-maxage=86400" } }
    );
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 502 }
    );
  }
}
