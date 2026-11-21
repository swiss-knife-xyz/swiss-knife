import assert from "node:assert/strict";
import test from "node:test";
import {
  loadGasCostEstimate,
  type GasCostReaders,
} from "./gasCostEstimateRead";

const hash = `0x${"ab".repeat(32)}` as const;
const source = {
  id: 1,
  name: "Ethereum",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
};
const target = {
  id: 137,
  name: "Polygon",
  nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
};
function fixture(): { readers: GasCostReaders; calls: string[] } {
  const calls: string[] = [];
  const readers: GasCostReaders = {
    getClient: (id) => ({
      getChainId: async () => {
        calls.push(`chain:${id}`);
        return id;
      },
      getTransactionReceipt: async ({ hash: requested }) => {
        calls.push(`receipt:${id}:${requested}`);
        return {
          transactionHash: hash,
          blockNumber: 123n,
          gasUsed: 21000n,
          status: "success",
        };
      },
      getGasPrice: async () => {
        calls.push(`gas:${id}`);
        return 30000000000n;
      },
    }),
    getUsdPrice: async (chain) => {
      calls.push(`usd:${chain.id}`);
      return 0.5;
    },
    now: () => 1000,
  };
  return { readers, calls };
}

test("reads only a historical receipt, chain identity, current gas price and optional target USD", async () => {
  const { readers, calls } = fixture();
  const result = await loadGasCostEstimate({ hash, source, target }, readers);
  assert.equal(result.nativeAmount, "0.00063");
  assert.equal(result.usd, "$0.000315");
  assert.equal(result.target.nativeCurrency.symbol, "POL");
  assert.equal(result.gasPriceReadAt, 1000);
  assert.equal(result.sourceStatus, "success");
  assert.deepEqual(
    calls.sort(),
    ["chain:1", "chain:137", `receipt:1:${hash}`, "gas:137", "usd:137"].sort()
  );
});

test("invalid hash or native metadata makes no RPC/feed calls", async () => {
  for (const input of [
    { hash: "0x123", source, target },
    { hash: "", source, target },
    { hash, source: { ...source, id: NaN }, target },
    {
      hash,
      source,
      target: {
        ...target,
        nativeCurrency: {
          ...target.nativeCurrency,
          decimals: undefined as unknown as number,
        },
      },
    },
    {
      hash,
      source,
      target: {
        ...target,
        nativeCurrency: { ...target.nativeCurrency, symbol: "" },
      },
    },
  ]) {
    const { readers, calls } = fixture();
    await assert.rejects(
      loadGasCostEstimate(input, readers),
      /hash|chain|native/i
    );
    assert.deepEqual(calls, []);
  }
});

test("chain mismatch rejects before receipt or gas quote is trusted", async () => {
  for (const wrongId of [1, 137]) {
    const { readers } = fixture();
    const original = readers.getClient;
    readers.getClient = (id) => ({
      ...original(id),
      getChainId: async () => (id === wrongId ? 56 : id),
    });
    await assert.rejects(
      loadGasCostEstimate({ hash, source, target }, readers),
      /chain.*mismatch/i
    );
  }
});

test("missing, pending, malformed or unrelated receipt cannot yield an estimate", async () => {
  for (const override of [
    null,
    { blockNumber: null },
    { gasUsed: undefined },
    { gasUsed: 0n },
    { transactionHash: `0x${"cd".repeat(32)}` },
    { status: undefined },
  ]) {
    const { readers } = fixture();
    const original = readers.getClient;
    readers.getClient = (id) => ({
      ...original(id),
      getTransactionReceipt: async () =>
        override === null
          ? (null as never)
          : ({
              transactionHash: hash,
              blockNumber: 123n,
              gasUsed: 21000n,
              status: "success",
              ...override,
            } as never),
    });
    await assert.rejects(
      loadGasCostEstimate({ hash, source, target }, readers),
      /receipt|gas used|mined/i
    );
  }
});

test("RPC failures explain which side failed and USD failures preserve native estimate", async () => {
  for (const side of ["source", "target"] as const) {
    const { readers } = fixture();
    const original = readers.getClient;
    readers.getClient = (id) => ({
      ...original(id),
      ...(side === "source"
        ? {
            getTransactionReceipt: async () => {
              throw Error("private RPC details");
            },
          }
        : {
            getGasPrice: async () => {
              throw Error("private RPC details");
            },
          }),
    });
    await assert.rejects(
      loadGasCostEstimate({ hash, source, target }, readers),
      side === "source" ? /source.*receipt/i : /target.*gas price/i
    );
  }
  const { readers } = fixture();
  readers.getUsdPrice = async () => {
    throw Error("rate limited");
  };
  const result = await loadGasCostEstimate({ hash, source, target }, readers);
  assert.equal(result.nativeAmount, "0.00063");
  assert.equal(result.usd, undefined);
});

test("reverted mined transactions still have gas used; never implies successful replay", async () => {
  const { readers } = fixture();
  const original = readers.getClient;
  readers.getClient = (id) => ({
    ...original(id),
    getTransactionReceipt: async () => ({
      transactionHash: hash.toUpperCase().replace("0X", "0x") as typeof hash,
      blockNumber: 123n,
      gasUsed: 50000n,
      status: "reverted",
    }),
  });
  const result = await loadGasCostEstimate({ hash, source, target }, readers);
  assert.equal(result.sourceStatus, "reverted");
  assert.equal(result.baseUnits, 1500000000000000n);
});

test("gas quote timestamp reflects gas-price arrival, not a slow receipt lookup", async () => {
  const { readers } = fixture();
  let time = 1000;
  readers.now = () => time;
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  const original = readers.getClient;
  readers.getClient = (id) => ({
    ...original(id),
    getTransactionReceipt: async (args) => {
      await waiting;
      return original(id).getTransactionReceipt(args);
    },
  });
  const pending = loadGasCostEstimate({ hash, source, target }, readers);
  await new Promise((resolve) => setImmediate(resolve));
  time = 2000;
  release();
  assert.equal((await pending).gasPriceReadAt, 1000);
});
