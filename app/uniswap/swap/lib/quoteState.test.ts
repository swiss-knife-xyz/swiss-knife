import assert from "node:assert/strict";
import test from "node:test";
import { Address, zeroAddress } from "viem";
import { QuoteExactInputParams } from "@/lib/uniswap/types";
import {
  SwapQuoteSnapshot,
  createQuoteRequestKey,
  isQuoteSnapshotCurrent,
} from "./quoteState";

const TOKEN = "0x1000000000000000000000000000000000000000" as Address;
const OTHER = "0x2000000000000000000000000000000000000000" as Address;
const quoteParams: QuoteExactInputParams = {
  exactAmount: 1n,
  exactCurrency: zeroAddress,
  path: [
    {
      intermediateCurrency: TOKEN,
      fee: 3_000,
      tickSpacing: 60,
      hooks: zeroAddress,
      hookData: "0x",
    },
  ],
};

const key = (overrides: Partial<QuoteExactInputParams> = {}, chainId = 8453) =>
  createQuoteRequestKey({
    chainId,
    tokenOut: TOKEN,
    quoteParams: { ...quoteParams, ...overrides },
  });

test("quote request keys change with amount, path, output, or chain", () => {
  assert.notEqual(key({ exactAmount: 2n }), key());
  assert.notEqual(key({}, 84532), key());
  assert.notEqual(
    createQuoteRequestKey({
      chainId: 8453,
      tokenOut: OTHER,
      quoteParams,
    }),
    key()
  );
  assert.notEqual(
    key({
      path: [{ ...quoteParams.path[0], fee: 500 }],
    }),
    key()
  );
});

test("only a snapshot for the active request can be executed", () => {
  const snapshot = {
    requestKey: key(),
    chainId: 8453,
    tokenOut: TOKEN,
    quoteParams,
    routingPath: [],
    amountOut: 10n,
  } satisfies SwapQuoteSnapshot;

  assert.equal(isQuoteSnapshotCurrent(snapshot, key()), true);
  assert.equal(
    isQuoteSnapshotCurrent(snapshot, key({ exactAmount: 2n })),
    false
  );
  assert.equal(isQuoteSnapshotCurrent(null, key()), false);
});
