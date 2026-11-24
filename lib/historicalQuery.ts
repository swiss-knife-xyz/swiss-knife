import type { PublicClient } from "viem";

export type HistoricalMode = "block" | "time";
export type HistoricalTarget =
  | { mode: "block"; blockNumber: bigint }
  | { mode: "time"; timestamp: bigint };
export type HistoricalBlock = { number: bigint; timestamp: bigint };
export type HistoricalQueryResult = {
  data: unknown;
  block: HistoricalBlock;
  contextKey: string;
  mode: HistoricalMode;
  client: PublicClient;
};

export function parseHistoricalTarget(
  mode: HistoricalMode,
  value: string,
  now = Date.now()
): HistoricalTarget {
  if (mode === "block") {
    if (!/^\d{1,78}$/.test(value.trim()))
      throw new Error("Enter a whole, non-negative block number.");
    const blockNumber = BigInt(value.trim());
    if (blockNumber >= 2n ** 256n)
      throw new Error("Block number is too large.");
    return { mode, blockNumber };
  }
  // datetime-local is deliberately interpreted as UTC, independent of browser timezone.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(?:\.\d{1,3})?)?$/.test(value))
    throw new Error("Enter a date and time in UTC.");
  const milliseconds = Date.parse(`${value}Z`);
  const normalized =
    value.length === 16
      ? `${value}:00.000`
      : value.includes(".")
        ? value.padEnd(23, "0")
        : `${value}.000`;
  if (
    !Number.isFinite(milliseconds) ||
    new Date(milliseconds).toISOString().slice(0, -1) !== normalized
  )
    throw new Error("Enter a valid date and time in UTC.");
  if (milliseconds > now)
    throw new Error("Choose a date and time in the past.");
  return { mode, timestamp: BigInt(Math.floor(milliseconds / 1000)) };
}

// Cache only old headers, bounded per client/RPC. Recent headers are re-read so
// a reorg near the head does not reuse a previous timestamp-to-number mapping.
const headers = new WeakMap<
  object,
  { rpcKey: string; blocks: Map<bigint, HistoricalBlock> }
>();
export async function resolveHistoricalBlock(
  client: Pick<PublicClient, "getBlock">,
  target: HistoricalTarget,
  { signal, rpcKey = "" }: { signal?: AbortSignal; rpcKey?: string } = {}
): Promise<HistoricalBlock> {
  const check = () => {
    if (signal?.aborted)
      throw new DOMException("Query cancelled", "AbortError");
  };
  check();
  const latest = await client.getBlock({
    blockTag: "latest",
    includeTransactions: false,
  });
  check();
  if (latest.number === null)
    throw new Error("The RPC did not return a mined block.");
  const head = { number: latest.number, timestamp: latest.timestamp };
  let cache = headers.get(client);
  if (!cache || cache.rpcKey !== rpcKey) {
    cache = { rpcKey, blocks: new Map() };
    headers.set(client, cache);
  }
  const blocks = cache.blocks;
  const get = async (number: bigint): Promise<HistoricalBlock> => {
    check();
    if (number === head.number) return head;
    const old = number + 256n < head.number;
    const cached = old ? blocks.get(number) : undefined;
    if (cached) return cached;
    const block = await client.getBlock({
      blockNumber: number,
      includeTransactions: false,
    });
    check();
    if (block.number !== number)
      throw new Error("The RPC returned a different block than requested.");
    const result = { number, timestamp: block.timestamp };
    if (old) {
      if (blocks.size >= 256) blocks.delete(blocks.keys().next().value!);
      blocks.set(number, result);
    }
    return result;
  };
  if (target.mode === "block") {
    if (target.blockNumber > head.number)
      throw new Error(
        `Block ${target.blockNumber} has not been mined. Latest block is ${head.number}.`
      );
    return get(target.blockNumber);
  }
  if (target.timestamp >= head.timestamp) return head;
  let low = await get(0n);
  if (target.timestamp < low.timestamp)
    throw new Error("This time is before the network's first block.");
  let high = head;
  let iterations = 0;
  while (high.number - low.number > 1n) {
    check();
    const span = high.number - low.number;
    // Interpolation makes regular chains fast; periodic bisection guarantees
    // progress across long outages, changing block times and equal timestamps.
    let offset =
      high.timestamp > low.timestamp && ++iterations % 4 !== 0
        ? ((target.timestamp - low.timestamp) * span) /
          (high.timestamp - low.timestamp)
        : span / 2n;
    if (offset < 1n) offset = 1n;
    if (offset >= span) offset = span - 1n;
    const middle = await get(low.number + offset);
    if (middle.timestamp <= target.timestamp) low = middle;
    else high = middle;
  }
  return low;
}

export function historicalQueryError(error: unknown): {
  message: string;
  needsArchiveRpc: boolean;
} {
  const messages: string[] = [];
  let cause = error;
  for (
    let depth = 0;
    cause && typeof cause === "object" && depth < 8;
    depth++
  ) {
    const item = cause as {
      message?: string;
      shortMessage?: string;
      cause?: unknown;
    };
    messages.push(item.shortMessage ?? "", item.message ?? "");
    cause = item.cause;
  }
  const text = messages.join(" ");
  const needsArchiveRpc =
    /missing trie node|historical (?:state|data).*?(?:unavailable|not available)|(?:state|history).*?(?:pruned|not available)|archive(?: node| rpc| state)|required historical state/i.test(
      text
    );
  if (needsArchiveRpc)
    return {
      message:
        "This RPC cannot serve state at that block. Configure an archive-capable RPC for this network and try again.",
      needsArchiveRpc,
    };
  if (/returned no data|zero data|could not decode|no return data/i.test(text))
    return {
      message:
        "No return data at this block. The contract may not yet exist, or its historical interface may differ from the loaded ABI.",
      needsArchiveRpc: false,
    };
  return {
    message:
      messages.find(Boolean) ||
      "Historical query failed. Check the selected block and RPC, then try again.",
    needsArchiveRpc: false,
  };
}

export function formatHistoricalTimestamp(timestamp: bigint) {
  if (timestamp > 8640000000000n || timestamp < -8640000000000n)
    return `${timestamp} Unix seconds`;
  return new Date(Number(timestamp) * 1000)
    .toISOString()
    .replace("T", " ")
    .replace(".000Z", " UTC");
}
