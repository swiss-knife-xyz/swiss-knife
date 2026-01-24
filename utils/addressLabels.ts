import axios from "axios";

const STORAGE_KEY = "@swiss-knife/address-labels";
const CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

interface CachedLabel {
  labels: string[];
  timestamp: number;
}

interface LabelsCache {
  [key: string]: CachedLabel;
}

function getCacheKey(address: string, chainId?: number): string {
  return `${address.toLowerCase()}_${chainId ?? "all"}`;
}

function getCache(): LabelsCache {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function setCache(cache: LabelsCache): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage might be full or disabled
  }
}

export async function fetchAddressLabels(
  address: string,
  chainId?: number
): Promise<string[]> {
  const cacheKey = getCacheKey(address, chainId);
  const cache = getCache();

  // Check if we have a valid cached entry
  const cached = cache[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.labels;
  }

  // Fetch from API
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_DEVELOPMENT === "true"
        ? ""
        : "https://swiss-knife.xyz";
    const url = chainId
      ? `${baseUrl}/api/labels/${address}?chainId=${chainId}`
      : `${baseUrl}/api/labels/${address}`;

    const res = await axios.get(url);
    const labels: string[] = res.data;

    // Cache the result
    cache[cacheKey] = {
      labels,
      timestamp: Date.now(),
    };
    setCache(cache);

    return labels;
  } catch {
    // On error, return empty array but don't cache the failure
    return [];
  }
}
