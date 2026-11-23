import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ContractResponse } from "@/types";

const address = "0xabcdef0000000000000000000000000000000001";
const metadata = (name = "Token", implementation = ""): ContractResponse => ({
  status: "1",
  message: "OK",
  result: [
    {
      ContractName: name,
      SourceCode: "contract Token {}",
      ABI: '[{"type":"function","name":"balanceOf","inputs":[]}]',
      Implementation: implementation,
    },
  ],
});
beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal("indexedDB", new IDBFactory());
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("persists source and ABI across module reloads without fetching again, normalizing address case", async () => {
  const load = vi.fn(async () => metadata());
  const first = await import("./contractMetadataCache");
  expect(await first.cachedContractMetadata(1, address, load)).toEqual(
    metadata()
  );
  vi.resetModules();
  const next = await import("./contractMetadataCache");
  expect(
    await next.cachedContractMetadata(1, address.toUpperCase(), load)
  ).toEqual(metadata());
  expect(load).toHaveBeenCalledTimes(1);
  await next.cachedContractMetadata(10, address, load);
  expect(load).toHaveBeenCalledTimes(2);
});
it("deduplicates simultaneous ABI and source requests", async () => {
  const { cachedContractMetadata } = await import("./contractMetadataCache");
  const load = vi.fn(async () => metadata());
  await Promise.all([
    cachedContractMetadata(1, address, load),
    cachedContractMetadata(1, address, load),
  ]);
  expect(load).toHaveBeenCalledTimes(1);
});
it("does not retain unverified responses or rejected requests", async () => {
  const { cachedContractMetadata } = await import("./contractMetadataCache");
  const load = vi
    .fn()
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce({ status: "0", result: [] })
    .mockResolvedValue(metadata());
  await expect(cachedContractMetadata(1, address, load)).rejects.toThrow(
    "offline"
  );
  await cachedContractMetadata(1, address, load);
  await cachedContractMetadata(1, address, load);
  expect(load).toHaveBeenCalledTimes(3);
});
it("never expires verified regular contracts and never persists proxy metadata", async () => {
  const { cachedContractMetadata } = await import("./contractMetadataCache");
  const now = vi.spyOn(Date, "now").mockReturnValue(1_000_000);
  const proxy = vi.fn(async () => metadata("Proxy", address));
  const direct = vi.fn(async () => metadata());
  await cachedContractMetadata(1, address, proxy);
  await cachedContractMetadata(10, address, direct);
  await cachedContractMetadata(1, address, proxy);
  expect(proxy).toHaveBeenCalledTimes(2);
  now.mockReturnValue(1_000_000 + 10 * 365 * 24 * 60 * 60 * 1000);
  await cachedContractMetadata(10, address, direct);
  expect(direct).toHaveBeenCalledTimes(1);
});
it("loads normally when browser storage is unavailable", async () => {
  vi.stubGlobal("indexedDB", undefined);
  const { cachedContractMetadata } = await import("./contractMetadataCache");
  const load = vi.fn(async () => metadata());
  expect(await cachedContractMetadata(1, address, load)).toEqual(metadata());
  expect(await cachedContractMetadata(1, address, load)).toEqual(metadata());
  expect(load).toHaveBeenCalledTimes(2);
  vi.stubGlobal("indexedDB", new IDBFactory());
  await cachedContractMetadata(1, address, load);
  await cachedContractMetadata(1, address, load);
  expect(load).toHaveBeenCalledTimes(3);
});
it("retains verified contracts beyond the former fifty-entry limit", async () => {
  const { cachedContractMetadata } = await import("./contractMetadataCache");
  const load = vi.fn(async () => metadata());
  for (let chain = 1; chain <= 51; chain++)
    await cachedContractMetadata(chain, address, load);
  await cachedContractMetadata(1, address, load);
  expect(load).toHaveBeenCalledTimes(51);
});
it("shares the fetched response between the real ABI and source helpers", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json(metadata()))
  );
  const { fetchContractAbiRaw, getSourceCode } = await import("@/utils");
  const [abi, source] = await Promise.all([
    fetchContractAbiRaw({ chainId: 1, address }),
    getSourceCode(1, address),
  ]);
  expect(abi.name).toBe("Token");
  expect(source).toEqual({ Token: "contract Token {}" });
  expect(fetch).toHaveBeenCalledTimes(1);
  await fetchContractAbiRaw({ chainId: 1, address });
  await getSourceCode(1, address);
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("ignores corrupt persisted records and refetches", async () => {
  const { cachedContractMetadata } = await import("./contractMetadataCache");
  const load = vi.fn(async () => metadata());
  await cachedContractMetadata(1, address, load);
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open("ethsh-contract-metadata", 2);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction("contracts", "readwrite");
      tx.objectStore("contracts").put({
        key: `1:${address}`,
        savedAt: Date.now(),
        data: { result: [] },
      });
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onabort = () => reject(tx.error);
    };
  });
  expect(await cachedContractMetadata(1, address, load)).toEqual(metadata());
  expect(load).toHaveBeenCalledTimes(2);
});

it("returns network data when a cache write exceeds browser quota", async () => {
  const { IDBObjectStore } = await import("fake-indexeddb");
  vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(() => {
    throw new DOMException("Storage full", "QuotaExceededError");
  });
  const { cachedContractMetadata } = await import("./contractMetadataCache");
  const load = vi.fn(async () => metadata());
  expect(await cachedContractMetadata(1, address, load)).toEqual(metadata());
});

it("refreshes a proxy's implementation identity while caching each implementation separately", async () => {
  const firstImplementation = "0x0000000000000000000000000000000000000002";
  const nextImplementation = "0x0000000000000000000000000000000000000003";
  let activeImplementation = firstImplementation;
  const fetchMock = vi.fn(async (input: string) => {
    const requested = new URL(input, "https://eth.sh").searchParams.get(
      "address"
    );
    return Response.json(
      requested === address
        ? metadata("Proxy", activeImplementation)
        : metadata(requested === firstImplementation ? "First" : "Next")
    );
  });
  vi.stubGlobal("fetch", fetchMock);
  const { fetchContractAbiRaw, getSourceCode } = await import("@/utils");
  expect(
    (await fetchContractAbiRaw({ chainId: 1, address })).implementation?.name
  ).toBe("First");
  await getSourceCode(1, firstImplementation);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  activeImplementation = nextImplementation;
  expect(
    (await fetchContractAbiRaw({ chainId: 1, address })).implementation?.name
  ).toBe("Next");
  await getSourceCode(1, nextImplementation);
  expect(fetchMock).toHaveBeenCalledTimes(4);
});

it("restores inferred functions across reloads, isolates identity, and removes them on verification", async () => {
  let cache = await import("./contractMetadataCache");
  const inferred = {
    abi: [{ type: "function", name: "guessed" }],
    name: address,
    isDecoded: true as const,
  };
  await cache.cacheDecompiledContractAbi(1, address, inferred);
  vi.resetModules();
  cache = await import("./contractMetadataCache");
  expect(
    await cache.readDecompiledContractAbi(1, address.toUpperCase())
  ).toEqual(inferred);
  expect(await cache.readDecompiledContractAbi(10, address)).toBeUndefined();
  expect(
    await cache.readDecompiledContractAbi(
      1,
      "0x0000000000000000000000000000000000000002"
    )
  ).toBeUndefined();
  await cache.cachedContractMetadata(1, address, async () => metadata());
  expect(await cache.readDecompiledContractAbi(1, address)).toBeUndefined();
});

it("does not persist ABI-only responses or proxies without an implementation address", async () => {
  const { cachedContractMetadata } = await import("./contractMetadataCache");
  const abiOnly = metadata();
  abiOnly.result[0].SourceCode = "";
  const proxy = metadata();
  Object.assign(proxy.result[0], { Proxy: "1" });
  for (const response of [abiOnly, proxy]) {
    const load = vi.fn(async () => response);
    await cachedContractMetadata(1, address, load);
    await cachedContractMetadata(1, address, load);
    expect(load).toHaveBeenCalledTimes(2);
  }
});

it("migrates the old cache while rejecting its previously cached proxy records", async () => {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open("ethsh-contract-metadata", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("contracts", { keyPath: "key" });
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction("contracts", "readwrite");
      tx.objectStore("contracts").put({
        key: `1:${address}`,
        data: metadata("Old proxy", address),
        savedAt: Date.now(),
        bytes: 100,
      });
      tx.objectStore("contracts").put({
        key: `10:${address}`,
        data: metadata("Regular"),
        savedAt: 1,
        bytes: 100,
      });
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onabort = () => reject(tx.error);
    };
  });
  const cache = await import("./contractMetadataCache");
  const load = vi.fn(async () => metadata("Fresh proxy", address));
  expect(
    (await cache.cachedContractMetadata(1, address, load)).result[0]
      .ContractName
  ).toBe("Fresh proxy");
  await cache.cachedContractMetadata(1, address, load);
  expect(load).toHaveBeenCalledTimes(2);
  expect(
    (await cache.cachedContractMetadata(10, address, load)).result[0]
      .ContractName
  ).toBe("Regular");
  expect(load).toHaveBeenCalledTimes(2);
});
