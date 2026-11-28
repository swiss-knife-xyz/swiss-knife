import { Fragment, type InterfaceAbi } from "ethers";
import { fetchContractAbi } from "@/utils";
import verificationNetworks from "@/lib/verification/networks.json";
import { readJson } from "@/lib/verification/transport";

export type TraceAbi = {
  abi: InterfaceAbi;
  name: string;
  source?: "explorer" | "blockscout";
};
type Identity = { address: string; chainId: number };
const networks: Record<string, { name: string; blockscout?: string }> =
  verificationNetworks;
const ADDRESS = /^0x[\da-f]{40}$/i;
function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
async function primaryDeadline(promise: Promise<TraceAbi>): Promise<TraceAbi> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Primary ABI lookup timed out")),
          10000
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/** Fixed provider catalog only: saved explorer URLs and user RPCs are never fetched here. */
export async function fetchVerifiedBlockscoutAbi(
  { address, chainId }: Identity,
  fetcher: typeof fetch = fetch
): Promise<TraceAbi | null> {
  if (!Number.isSafeInteger(chainId) || chainId <= 0 || !ADDRESS.test(address))
    return null;
  const base = networks[String(chainId)]?.blockscout;
  if (!base) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const url = new URL(
      `${base.replace(/\/$/, "")}/api/v2/smart-contracts/${address.toLowerCase()}`
    );
    const response = await fetcher(url, {
      signal: controller.signal,
      credentials: "omit",
      redirect: "error",
      referrerPolicy: "no-referrer",
    });
    if (!response.ok) return null;
    const data = await readJson(
      response.body,
      4 * 1024 * 1024,
      controller.signal
    );
    if (
      !object(data) ||
      data.is_verified !== true ||
      data.is_fully_verified !== true ||
      data.is_partially_verified === true ||
      data.is_changed_bytecode === true ||
      data.verified_twin_address_hash != null ||
      data.is_blueprint === true ||
      !Array.isArray(data.abi) ||
      data.abi.length > 2000 ||
      typeof data.name !== "string" ||
      !data.name.trim() ||
      data.name.length > 256
    )
      return null;
    // Fragment.from throws for malformed entries instead of silently dropping them.
    const abi = data.abi.map((raw) => {
      if (!object(raw)) throw new Error("Invalid ABI entry");
      const fragment = Fragment.from(raw);
      if (!fragment) throw new Error("Invalid ABI entry");
      return JSON.parse(fragment.format("json"));
    });
    return { abi, name: data.name, source: "blockscout" };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Keep the shared explorer/Sourcify lookup first. */
export async function fetchTraceAbi(
  identity: Identity,
  dependencies: {
    primary?: (identity: Identity) => Promise<TraceAbi>;
    fallback?: (identity: Identity) => Promise<TraceAbi | null>;
  } = {}
): Promise<TraceAbi> {
  if (
    !Number.isSafeInteger(identity.chainId) ||
    identity.chainId <= 0 ||
    !ADDRESS.test(identity.address)
  )
    throw new Error("Invalid contract identity");
  const lookup: (identity: Identity) => Promise<TraceAbi> =
    dependencies.primary ?? fetchContractAbi;
  try {
    const primary = await primaryDeadline(lookup(identity));
    return { ...primary, source: primary.source ?? "explorer" };
  } catch {
    const fallback = await (
      dependencies.fallback ?? fetchVerifiedBlockscoutAbi
    )(identity);
    if (fallback) return fallback;
    throw new Error("No verified contract ABI available");
  }
}
