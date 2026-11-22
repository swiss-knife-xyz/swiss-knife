import type { Hex } from "viem";
import { nativeUsdPriceId } from "./gasCostPrice";
import { gasCostDelta } from "./gasCostDelta";
import { estimateGasCost } from "./gasCostEstimate";

export type GasCostChain = {
  id: number;
  name: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  testnet?: boolean;
};
export type GasCostInput = {
  hash: string;
  source: GasCostChain;
  target: GasCostChain;
};
export type GasCostReceipt = {
  transactionHash: Hex;
  blockNumber: bigint | null;
  gasUsed: bigint;
  effectiveGasPrice?: bigint;
  status: "success" | "reverted";
};
export type GasCostReaders = {
  getClient: (chainId: number) => {
    getChainId: () => Promise<number>;
    getTransactionReceipt: (args: { hash: Hex }) => Promise<GasCostReceipt>;
    getGasPrice: () => Promise<bigint>;
  };
  getUsdPrice: (chain: GasCostChain) => Promise<number | undefined>;
  now: () => number;
};

/** No transaction replay, simulation, wallet connection or writes. */
export async function loadGasCostEstimate(
  input: GasCostInput,
  readers: GasCostReaders
) {
  const { hash, source, target } = input;
  if (!/^0x[\da-fA-F]{64}$/.test(hash)) {
    throw new Error("Enter a complete 0x-prefixed 32-byte transaction hash.");
  }
  for (const chain of [source, target]) {
    if (!Number.isSafeInteger(chain?.id) || chain.id <= 0) {
      throw new Error("Select a supported chain.");
    }
    if (
      !chain.nativeCurrency?.symbol ||
      !Number.isInteger(chain.nativeCurrency.decimals) ||
      chain.nativeCurrency.decimals < 0 ||
      chain.nativeCurrency.decimals > 255
    ) {
      throw new Error(
        "Native token information is unavailable for this chain."
      );
    }
  }
  const sourceClient = readers.getClient(source.id);
  const targetClient = readers.getClient(target.id);
  const [receipt, quote, sourceId, targetId] = await Promise.all([
    sourceClient.getTransactionReceipt({ hash: hash as Hex }).catch(() => {
      throw new Error(
        "Source transaction receipt unavailable. Check the source chain and hash; pending transactions have no mined gas used."
      );
    }),
    targetClient
      .getGasPrice()
      .then((gasPrice) => ({ gasPrice, gasPriceReadAt: readers.now() }))
      .catch(() => {
        throw new Error(
          "Target current gas price unavailable. Try again later or choose another chain."
        );
      }),
    sourceClient.getChainId().catch(() => {
      throw new Error(
        "Source RPC chain identity unavailable. Try again later."
      );
    }),
    targetClient.getChainId().catch(() => {
      throw new Error(
        "Target RPC chain identity unavailable. Try again later."
      );
    }),
  ]);
  const { gasPrice, gasPriceReadAt } = quote;
  if (sourceId !== source.id || targetId !== target.id) {
    throw new Error("RPC chain identity mismatch. No estimate is available.");
  }
  if (
    !receipt ||
    typeof receipt.blockNumber !== "bigint" ||
    receipt.blockNumber < 0n ||
    typeof receipt.transactionHash !== "string" ||
    receipt.transactionHash.toLowerCase() !== hash.toLowerCase() ||
    (receipt.status !== "success" && receipt.status !== "reverted")
  ) {
    throw new Error("A matching mined transaction receipt is required.");
  }
  // Validate mandatory quantities before requesting the optional price feed.
  estimateGasCost({
    gasUsed: receipt.gasUsed,
    gasPrice,
    decimals: target.nativeCurrency.decimals,
  });
  const hasSourceFee =
    typeof receipt.effectiveGasPrice === "bigint" &&
    receipt.effectiveGasPrice >= 0n;
  const sameAsset =
    source.id === target.id ||
    Boolean(
      nativeUsdPriceId(source) &&
        nativeUsdPriceId(source) === nativeUsdPriceId(target)
    );
  const [usdPrice, sourceUsdPrice] = await Promise.all([
    readers.getUsdPrice(target).catch(() => undefined),
    hasSourceFee && !sameAsset
      ? readers.getUsdPrice(source).catch(() => undefined)
      : Promise.resolve(undefined),
  ]);
  const targetCost = estimateGasCost({
    gasUsed: receipt.gasUsed,
    gasPrice,
    decimals: target.nativeCurrency.decimals,
    usdPrice,
  });
  const sourceCost = hasSourceFee
    ? estimateGasCost({
        gasUsed: receipt.gasUsed,
        gasPrice: receipt.effectiveGasPrice!,
        decimals: source.nativeCurrency.decimals,
        usdPrice: sameAsset ? usdPrice : sourceUsdPrice,
      })
    : undefined;
  return {
    ...targetCost,
    sourceCost,
    sourceGasPrice: hasSourceFee ? receipt.effectiveGasPrice : undefined,
    delta: sourceCost
      ? gasCostDelta(
          sourceCost,
          targetCost,
          source.nativeCurrency.decimals,
          target.nativeCurrency.decimals,
          sameAsset
        )
      : undefined,
    hash,
    source,
    target,
    gasUsed: receipt.gasUsed,
    sourceBlock: receipt.blockNumber,
    sourceStatus: receipt.status,
    gasPrice,
    gasPriceReadAt,
  };
}

export type GasCostResult = Awaited<ReturnType<typeof loadGasCostEstimate>>;
