export const CUSTOM_CHAINS_KEY = "eth-sh:custom-chains:v1";
export const CUSTOM_CHAINS_NAMESPACE = "custom-chains:v1";
export type CustomChain = {
  id: number;
  name: string;
  rpcUrl: string;
  symbol: string;
  decimals: number;
  explorerUrl?: string;
  testnet: boolean;
};
export function webUrl(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length > 2048)
    throw new Error(`${label} is invalid.`);
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error(`Enter a valid ${label.toLowerCase()}.`);
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error(
      `${label} must be an HTTP or HTTPS URL without embedded credentials.`
    );
  url.hash = "";
  return url.href;
}
export function parseCustomChain(value: unknown): CustomChain {
  if (!value || typeof value !== "object")
    throw new Error("Invalid chain configuration.");
  const input = value as Record<string, unknown>;
  if (!Number.isSafeInteger(input.id) || Number(input.id) <= 0)
    throw new Error("Enter a positive, safe integer chain ID.");
  if (
    typeof input.name !== "string" ||
    !input.name.trim() ||
    input.name.trim().length > 80
  )
    throw new Error("Enter a chain name of up to 80 characters.");
  if (
    typeof input.symbol !== "string" ||
    !/^[A-Za-z0-9._-]{1,16}$/.test(input.symbol)
  )
    throw new Error("Enter a currency symbol of up to 16 letters or numbers.");
  if (
    !Number.isInteger(input.decimals) ||
    Number(input.decimals) < 0 ||
    Number(input.decimals) > 255
  )
    throw new Error("Currency decimals must be between 0 and 255.");
  return {
    id: Number(input.id),
    name: input.name.trim(),
    rpcUrl: webUrl(input.rpcUrl, "RPC URL"),
    symbol: input.symbol,
    decimals: Number(input.decimals),
    testnet: input.testnet === true,
    ...(input.explorerUrl
      ? { explorerUrl: webUrl(input.explorerUrl, "Explorer URL") }
      : {}),
  };
}
export function parseCustomChains(value: unknown): CustomChain[] {
  if (!Array.isArray(value) || value.length > 50)
    throw new Error("Invalid saved networks.");
  const entries = value.map(parseCustomChain);
  if (new Set(entries.map((chain) => chain.id)).size !== entries.length)
    throw new Error("Duplicate saved chain IDs.");
  return entries;
}
export type CustomChainRequest = {
  namespace: typeof CUSTOM_CHAINS_NAMESPACE;
  id: string;
  action: "GET_ALL" | "UPSERT" | "REMOVE";
  payload?: unknown;
};
export function handleCustomChainRequest(
  storage: Pick<Storage, "getItem" | "setItem">,
  request: CustomChainRequest
) {
  try {
    let entries = parseCustomChains(
      JSON.parse(storage.getItem(CUSTOM_CHAINS_KEY) ?? "[]")
    );
    if (request.action === "UPSERT") {
      const entry = parseCustomChain(request.payload);
      entries = [...entries.filter((chain) => chain.id !== entry.id), entry];
      if (entries.length > 50)
        throw new Error("You can save up to 50 custom chains.");
    } else if (request.action === "REMOVE") {
      if (!Number.isSafeInteger(request.payload))
        throw new Error("Invalid chain ID.");
      entries = entries.filter((chain) => chain.id !== request.payload);
    } else if (request.action !== "GET_ALL")
      throw new Error("Unknown storage action.");
    if (request.action !== "GET_ALL")
      storage.setItem(CUSTOM_CHAINS_KEY, JSON.stringify(entries));
    return {
      namespace: CUSTOM_CHAINS_NAMESPACE,
      id: request.id,
      success: true,
      data: entries,
    };
  } catch (error) {
    return {
      namespace: CUSTOM_CHAINS_NAMESPACE,
      id: request.id,
      success: false,
      error: error instanceof Error ? error.message : "Unable to save chains.",
    };
  }
}
export function isStorageOriginAllowed(
  origin: string,
  hubHostname: string
): boolean {
  try {
    const url = new URL(origin);
    if (url.origin !== origin) return false;
    if (
      url.protocol === "https:" &&
      (url.hostname === "eth.sh" || url.hostname.endsWith(".eth.sh"))
    )
      return true;
    return (
      (hubHostname === "localhost" ||
        hubHostname === "127.0.0.1" ||
        hubHostname.endsWith(".localhost")) &&
      ["http:", "https:"].includes(url.protocol) &&
      (url.hostname === "localhost" ||
        url.hostname === "127.0.0.1" ||
        url.hostname.endsWith(".localhost"))
    );
  } catch {
    return false;
  }
}
export async function fetchRpcChainId(
  rpcUrl: string,
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch
) {
  const response = await fetcher(webUrl(rpcUrl, "RPC URL"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_chainId",
      params: [],
    }),
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(8000)])
      : AbortSignal.timeout(8000),
    credentials: "omit",
    cache: "no-store",
    referrerPolicy: "no-referrer",
  });
  if (!response.ok) throw new Error("The RPC did not respond successfully.");
  const result = await response.json();
  if (
    result?.error ||
    typeof result?.result !== "string" ||
    !/^0x[\da-f]+$/i.test(result.result)
  )
    throw new Error("The RPC did not return a valid chain ID.");
  const id = BigInt(result.result);
  if (id <= 0n || id > BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error("The RPC returned an unsupported chain ID.");
  return Number(id);
}
export async function verifyCustomChain(
  chain: CustomChain,
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch
) {
  const id = await fetchRpcChainId(chain.rpcUrl, signal, fetcher);
  if (id !== chain.id)
    throw new Error(`This RPC reports chain ID ${id}, not ${chain.id}.`);
}
