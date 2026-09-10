import assert from "node:assert/strict";
import test from "node:test";
import {
  Address,
  Hex,
  decodeAbiParameters,
  decodeFunctionData,
  zeroAddress,
} from "viem";
import { UniversalRouterAbi } from "./abi/UniversalRouter";
import { IV4RouterAbiExactInput } from "./abi/IV4RouterAbiExactInput";
import { getExactInputCalldata } from "./universalRouter";

const TOKEN = "0x1000000000000000000000000000000000000000" as Address;
const OUTPUT = "0x2000000000000000000000000000000000000000" as Address;
const RECIPIENT = "0x3000000000000000000000000000000000000000" as Address;
const quoteParams = {
  exactAmount: 1_000n,
  exactCurrency: TOKEN,
  path: [
    {
      intermediateCurrency: OUTPUT,
      fee: 3_000,
      tickSpacing: 60,
      hooks: zeroAddress,
      hookData: "0x1234" as const,
    },
  ],
};

test("Universal Router calldata uses the deadline overload", () => {
  const data = getExactInputCalldata({
    quoteParams,
    amountOutMin: 900n,
    tokenOut: OUTPUT,
    recipient: RECIPIENT,
    deadline: 12_345n,
  });
  const decoded = decodeFunctionData({ abi: UniversalRouterAbi, data });

  assert.equal(decoded.functionName, "execute");
  assert.equal(decoded.args.length, 3);
  assert.equal(decoded.args[0], "0x10");
  assert.equal(decoded.args[2], 12_345n);
});

test("V4 exact-input actions preserve the quoted route and protections", () => {
  const data = getExactInputCalldata({
    quoteParams,
    amountOutMin: 900n,
    tokenOut: OUTPUT,
    recipient: RECIPIENT,
    deadline: 12_345n,
  });
  const decoded = decodeFunctionData({ abi: UniversalRouterAbi, data });
  const [, inputs] = decoded.args as readonly [Hex, readonly Hex[], bigint];
  const [actions, actionParams] = decodeAbiParameters(
    [
      { type: "bytes", name: "actions" },
      { type: "bytes[]", name: "params" },
    ],
    inputs[0]
  );
  const [swap] = decodeAbiParameters(IV4RouterAbiExactInput, actionParams[0]);

  assert.equal(actions, "0x070c0f");
  assert.equal(actionParams.length, 3);
  assert.equal(swap.currencyIn, quoteParams.exactCurrency);
  assert.equal(swap.amountIn, quoteParams.exactAmount);
  assert.equal(swap.amountOutMinimum, 900n);
  assert.deepEqual(swap.path, quoteParams.path);
});

test("native exact-input swaps sweep any unspent input to the user", () => {
  const data = getExactInputCalldata({
    quoteParams: { ...quoteParams, exactCurrency: zeroAddress },
    amountOutMin: 900n,
    tokenOut: OUTPUT,
    recipient: RECIPIENT,
    deadline: 12_345n,
  });
  const decoded = decodeFunctionData({ abi: UniversalRouterAbi, data });
  const [commands, inputs] = decoded.args as readonly [
    Hex,
    readonly Hex[],
    bigint,
  ];

  assert.equal(commands, "0x1004");
  assert.equal(inputs.length, 2);
  assert.deepEqual(
    decodeAbiParameters(
      [
        { type: "address", name: "token" },
        { type: "address", name: "recipient" },
        { type: "uint256", name: "amountMinimum" },
      ],
      inputs[1]
    ),
    [zeroAddress, RECIPIENT, 0n]
  );
});

test("Universal Router rejects zero minimums and uint128 overflow", () => {
  assert.throws(
    () =>
      getExactInputCalldata({
        quoteParams,
        amountOutMin: 0n,
        tokenOut: OUTPUT,
        recipient: RECIPIENT,
        deadline: 1n,
      }),
    /uint128/
  );
});
