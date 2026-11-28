import { alchemyTraceNetworks } from "@/data/networks";
import { readJson } from "@/lib/verification/transport";
import { MAX_TRACE_BYTES, normalizeTrace, type TraceDocument } from "./model";

export async function fetchHostedTrace(
  chainId: number,
  hash: string
): Promise<TraceDocument | null> {
  if (!alchemyTraceNetworks[chainId]) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch("/api/trace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ chainId, hash }),
      signal: controller.signal,
      cache: "no-store",
      redirect: "error",
    });
    const body = (await readJson(
      response.body,
      MAX_TRACE_BYTES,
      controller.signal
    )) as Record<string, unknown>;
    if (
      (response.status === 404 || response.status === 503) &&
      body?.unavailable === true
    )
      return null;
    if (!response.ok)
      throw new Error(
        typeof body?.error === "string" ? body.error : "Hosted tracing failed."
      );
    const document = normalizeTrace(body);
    if (
      document.chainId !== chainId ||
      document.transactionHash?.toLowerCase() !== hash.toLowerCase()
    )
      throw new Error("Hosted trace identity mismatch.");
    return document;
  } finally {
    clearTimeout(timer);
  }
}
