import type { JsonFragment } from "ethers";
import type { ContractResponse } from "@/types";
import { browserDatabase } from "@/lib/browser/database";

export type DecompiledContractAbi = {
  abi: JsonFragment[];
  name: string;
  isDecoded: true;
};
const openDatabase = browserDatabase(
  "ethsh-contract-metadata",
  2,
  (db) => {
    if (!db.objectStoreNames.contains("contracts"))
      db.createObjectStore("contracts", { keyPath: "key" });
    if (!db.objectStoreNames.contains("decompiled"))
      db.createObjectStore("decompiled", { keyPath: "key" });
  },
  "Contract cache is busy."
);
const pending = new Map<string, Promise<ContractResponse>>();
const keyFor = (chainId: number, address: string) =>
  `${chainId}:${address.toLowerCase()}`;

function cacheable(data: ContractResponse) {
  const result = data?.result?.[0];
  if (
    data?.status !== "1" ||
    !result ||
    typeof result.SourceCode !== "string" ||
    !result.SourceCode.trim() ||
    typeof result.ContractName !== "string" ||
    typeof result.ABI !== "string" ||
    result.Implementation !== "" ||
    (result as typeof result & { Proxy?: string }).Proxy === "1"
  )
    return false;
  try {
    return Array.isArray(JSON.parse(result.ABI));
  } catch {
    return false;
  }
}
async function readEntry<T>(store: string, key: string): Promise<{ data?: T; isProxy?: true } | undefined> {
  try {
    const db = await openDatabase();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(store);
      const request = tx.objectStore(store).get(key);
      tx.oncomplete = () => resolve(request.result);
      tx.onabort = tx.onerror = () => reject(tx.error);
    });
  } catch {
    return undefined;
  }
}
async function read<T>(store: string, key: string): Promise<T | undefined> {
  const entry = await readEntry<T>(store, key);
  return entry?.isProxy ? undefined : entry?.data;
}
async function write(store: string, key: string, data: unknown) {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([...new Set([store, "contracts"])], "readwrite");
      const current = tx.objectStore("contracts").get(key);
      current.onsuccess = () => {
        // A lookup started before live proxy detection must not recreate a stale
        // negative record after the proxy marker was committed.
        if (!current.result?.isProxy) tx.objectStore(store).put({ key, data });
      };
      tx.oncomplete = () => resolve();
      tx.onabort = tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* Browser quota/disabled storage must never prevent loading. */
  }
}

/** Retire legacy false negatives on discovery; never cache an implementation address. */
export async function markContractAsProxy(chainId: number, address: string) {
  try {
    const db = await openDatabase();
    const key = keyFor(chainId, address);
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["contracts", "decompiled"], "readwrite");
      tx.objectStore("contracts").put({ key, isProxy: true });
      tx.objectStore("decompiled").delete(key);
      tx.oncomplete = () => resolve();
      tx.onabort = tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* Live resolution remains authoritative when storage is unavailable. */
  }
}
export async function readVerifiedContractMetadata(
  chainId: number,
  address: string
): Promise<ContractResponse | undefined> {
  const data = await read<ContractResponse>(
    "contracts",
    keyFor(chainId, address)
  );
  return data && cacheable(data) ? data : undefined;
}
/** Only bytecode-derived ABIs for a previously resolved non-proxy are saved here. */
export async function readDecompiledContractAbi(
  chainId: number,
  address: string
): Promise<DecompiledContractAbi | undefined> {
  const data = await read<DecompiledContractAbi>(
    "decompiled",
    keyFor(chainId, address)
  );
  return data?.isDecoded === true &&
    typeof data.name === "string" &&
    Array.isArray(data.abi) &&
    data.abi.every((entry) => entry && typeof entry.type === "string")
    ? data
    : undefined;
}
export async function clearDecompiledContractAbi(
  chainId: number,
  address: string
) {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("decompiled", "readwrite");
      tx.objectStore("decompiled").delete(keyFor(chainId, address));
      tx.oncomplete = () => resolve();
      tx.onabort = tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* Best effort, like cache writes. */
  }
}
/** Call only after on-chain proxy/delegation detection identifies a regular contract. */
export async function cacheDecompiledContractAbi(
  chainId: number,
  address: string,
  data: DecompiledContractAbi
) {
  await write("decompiled", keyFor(chainId, address), data);
}

/** Verified regular contracts never expire. Proxies and failed lookups are never persisted. */
export async function cachedContractMetadata(
  chainId: number,
  address: string,
  load: () => Promise<ContractResponse>
): Promise<ContractResponse> {
  if (typeof window === "undefined") return load();
  const key = keyFor(chainId, address);
  const existing = pending.get(key);
  if (existing) return existing;
  const request = (async () => {
    // Also rejects proxy records written by the old expiring cache.
    const cached = await readVerifiedContractMetadata(chainId, address);
    if (cached) return cached;
    const data = await load();
    if (cacheable(data)) {
      await write("contracts", key, data);
      await clearDecompiledContractAbi(chainId, address);
    }
    return data;
  })();
  pending.set(key, request);
  try {
    return await request;
  } finally {
    pending.delete(key);
  }
}
