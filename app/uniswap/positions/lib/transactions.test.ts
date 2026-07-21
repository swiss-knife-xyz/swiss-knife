import assert from "node:assert/strict";
import test from "node:test";
import { TickMath } from "@uniswap/v3-sdk";
import {
  Address,
  decodeAbiParameters,
  decodeFunctionData,
  zeroAddress,
} from "viem";
import {
  DecreaseLiquidityParamsAbi,
  TakePairParamsAbi,
  UniV4PositionManagerAbi,
} from "../../lib/constants";
import {
  MSG_SENDER,
  buildRemoveLiquidityCalldata,
  calculateRemoveLiquidityMinimums,
} from "./transactions";

const TOKEN = "0x1000000000000000000000000000000000000000" as Address;
const sqrtAtTick = (tick: number) =>
  BigInt(TickMath.getSqrtRatioAtTick(tick).toString());

const removeParams = {
  tokenId: 42n,
  liquidity: 1_000_000_000_000n,
  poolKey: {
    currency0: zeroAddress,
    currency1: TOKEN,
    fee: 3_000,
    tickSpacing: 60,
    hooks: zeroAddress,
  },
  tickLower: -120,
  tickUpper: 120,
  currentSqrtPriceX96: sqrtAtTick(0),
  currentTick: 0,
  deadline: 10_000n,
  slippageBps: 50,
  hookData: "0x1234" as const,
};

const decodeRemoveCall = (
  calldata: ReturnType<typeof buildRemoveLiquidityCalldata>
) => {
  const outer = decodeFunctionData({
    abi: UniV4PositionManagerAbi,
    data: calldata,
  });
  assert.equal(outer.functionName, "modifyLiquidities");
  const [unlockData] = outer.args;
  const [actions, params] = decodeAbiParameters(
    [
      { type: "bytes", name: "actions" },
      { type: "bytes[]", name: "params" },
    ],
    unlockData
  );
  return { actions, params };
};

test("removal takes positive credits without trying to settle them", () => {
  const decoded = decodeRemoveCall(buildRemoveLiquidityCalldata(removeParams));

  assert.equal(decoded.actions, "0x0111");
  assert.equal(decoded.params.length, 2);
  assert.deepEqual(decodeAbiParameters(TakePairParamsAbi, decoded.params[1]), [
    zeroAddress,
    TOKEN,
    MSG_SENDER,
  ]);
});

test("removal encodes slippage-protected minima and caller hook data", () => {
  const minima = calculateRemoveLiquidityMinimums({
    liquidity: removeParams.liquidity,
    currentSqrtPriceX96: removeParams.currentSqrtPriceX96,
    currentTick: removeParams.currentTick,
    tickLower: removeParams.tickLower,
    tickUpper: removeParams.tickUpper,
    slippageBps: removeParams.slippageBps,
  });
  const decoded = decodeRemoveCall(buildRemoveLiquidityCalldata(removeParams));
  const decrease = decodeAbiParameters(
    DecreaseLiquidityParamsAbi,
    decoded.params[0]
  );

  assert.ok(minima.expectedAmount0 > 0n);
  assert.ok(minima.expectedAmount1 > 0n);
  assert.deepEqual(decrease, [
    removeParams.tokenId,
    removeParams.liquidity,
    minima.amount0Min,
    minima.amount1Min,
    removeParams.hookData,
  ]);
});

test("removal rejects unsafe or malformed transaction parameters", () => {
  assert.throws(
    () =>
      buildRemoveLiquidityCalldata({
        ...removeParams,
        slippageBps: 1_001,
      }),
    /Slippage/
  );
  assert.throws(
    () =>
      buildRemoveLiquidityCalldata({
        ...removeParams,
        tickUpper: 100,
      }),
    /spacing-aligned/
  );
  assert.throws(
    () =>
      buildRemoveLiquidityCalldata({
        ...removeParams,
        liquidity: 0n,
      }),
    /positive/
  );
  assert.throws(
    () =>
      buildRemoveLiquidityCalldata({
        ...removeParams,
        poolKey: {
          ...removeParams.poolKey,
          hooks: "0x0000000000000000000000000000000000000001",
        },
      }),
    /hook-specific/
  );
});
