import { unstable_cache } from "next/cache";
import committed from "@/data/clearsigning-index.json";
import {
  refreshRegistrySnapshot,
  REGISTRY_REVALIDATE_SECONDS,
  type RegistrySnapshot,
} from "@/lib/clearSigningRegistry";

// Shared Data Cache survives serverless instance restarts and deployments.
// Throw on refresh failure: Next retains the last successful value and retries
// on subsequent traffic. Never cache a fallback as a successful refresh.
let refreshing: Promise<RegistrySnapshot> | undefined;
let retryAfter = 0;

function refresh(): Promise<RegistrySnapshot> {
  if (refreshing) return refreshing;
  if (Date.now() < retryAfter)
    return Promise.reject(new Error("Registry refresh retry backoff"));
  refreshing = refreshRegistrySnapshot()
    .catch((error) => {
      retryAfter = Date.now() + 60_000;
      throw error;
    })
    .finally(() => {
      refreshing = undefined;
    });
  return refreshing;
}

const readLiveIndex = unstable_cache(
  refresh,
  ["clear-signing-registry-index-v1"],
  { revalidate: REGISTRY_REVALIDATE_SECONDS }
);

export async function getRegistrySnapshot(): Promise<RegistrySnapshot> {
  try {
    return await readLiveIndex();
  } catch (error) {
    console.warn(
      "[clear-signing] index unavailable; using committed snapshot",
      error
    );
    return committed;
  }
}
