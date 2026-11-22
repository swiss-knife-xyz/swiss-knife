import assert from "node:assert/strict";
import test from "node:test";
import { Address, decodeFunctionData, erc20Abi, zeroAddress } from "viem";
import { base } from "viem/chains";
import { Permit2Abi, UniversalRouterAddress } from "../../lib/constants";
import { SwapQuoteSnapshot } from "./quoteState";
import { buildSwapCalls } from "./transactions";

const TOKEN = "0x1000000000000000000000000000000000000000" as Address;
const OUTPUT = "0x2000000000000000000000000000000000000000" as Address;
const SENDER = "0x3000000000000000000000000000000000000000" as Address;

const quote = (currencyIn: Address): SwapQuoteSnapshot => ({
  requestKey: "request",
  chainId: base.id,
  tokenOut: OUTPUT,
  routingPath: [],
  amountOut: 2_000n,
  quoteParams: {
    exactAmount: 1_000n,
    exactCurrency: currencyIn,
    path: [
      {
        intermediateCurrency: OUTPUT,
        fee: 3_000,
        tickSpacing: 60,
        hooks: zeroAddress,
        hookData: "0x",
      },
    ],
  },
});

test("native swap sends exactly the immutable quoted input", () => {
  const calls = buildSwapCalls({
    quote: quote(zeroAddress),
    chainId: base.id,
    sender: SENDER,
    slippageBps: 50,
    nowSeconds: 1_000,
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].to, UniversalRouterAddress[base.id]);
  assert.equal(calls[0].value, 1_000n);
});

test("ERC20 swap approvals are limited to the immutable quoted input", () => {
  const calls = buildSwapCalls({
    quote: quote(TOKEN),
    chainId: base.id,
    sender: SENDER,
    slippageBps: 0,
    nowSeconds: 1_000,
    erc20Allowance: 0n,
  });
  assert.equal(calls.length, 3);

  const erc20Approval = decodeFunctionData({
    abi: erc20Abi,
    data: calls[0].data!,
  });
  assert.deepEqual(erc20Approval.args, [calls[1].to, 1_000n]);

  const permit2Approval = decodeFunctionData({
    abi: Permit2Abi,
    data: calls[1].data!,
  });
  assert.equal(permit2Approval.args[0], TOKEN);
  assert.equal(permit2Approval.args[2], 1_000n);
  assert.equal(permit2Approval.args[3], 4_600);
  assert.equal(calls[2].value, undefined);
});

test("sufficient ERC20 and unexpired Permit2 allowances skip approvals", () => {
  const calls = buildSwapCalls({
    quote: quote(TOKEN),
    chainId: base.id,
    sender: SENDER,
    slippageBps: 0,
    nowSeconds: 1_000,
    erc20Allowance: 1_000n,
    permit2Allowance: { amount: 1_000n, expiration: 2_200 },
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].to, UniversalRouterAddress[base.id]);
});

test("nonzero insufficient allowance resets before exact approval", () => {
  const calls = buildSwapCalls({
    quote: quote(TOKEN),
    chainId: base.id,
    sender: SENDER,
    slippageBps: 0,
    nowSeconds: 1_000,
    erc20Allowance: 1n,
    permit2Allowance: { amount: 1_000n, expiration: 2_199 },
  });
  assert.equal(calls.length, 4);
  assert.deepEqual(
    decodeFunctionData({ abi: erc20Abi, data: calls[0].data! }).args,
    [calls[2].to, 0n]
  );
  assert.deepEqual(
    decodeFunctionData({ abi: erc20Abi, data: calls[1].data! }).args,
    [calls[2].to, 1_000n]
  );
  assert.equal(
    decodeFunctionData({ abi: Permit2Abi, data: calls[2].data! }).functionName,
    "approve"
  );
});

test("swap calls reject cross-chain quotes and zero minimum output", () => {
  assert.throws(
    () =>
      buildSwapCalls({
        quote: quote(TOKEN),
        chainId: 84532,
        sender: SENDER,
        slippageBps: 50,
        nowSeconds: 1_000,
      }),
    /different chain/
  );
  assert.throws(
    () =>
      buildSwapCalls({
        quote: { ...quote(TOKEN), amountOut: 1n },
        chainId: base.id,
        sender: SENDER,
        slippageBps: 50,
        nowSeconds: 1_000,
      }),
    /rounds to zero/
  );
});
