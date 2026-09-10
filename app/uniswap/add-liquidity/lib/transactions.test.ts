import assert from "node:assert/strict";
import test from "node:test";
import {
  Address,
  decodeAbiParameters,
  decodeFunctionData,
  zeroAddress,
} from "viem";
import {
  UniV4PM_MintPositionAbi,
  UniV4PM_SettlePairAbi,
  UniV4PM_SweepAbi,
  UniV4PositionManagerAbi,
} from "../../lib/constants";
import {
  buildAddLiquidityPositionCalldata,
  buildMintPositionActionPlan,
} from "./transactions";

const TOKEN = "0x1000000000000000000000000000000000000000" as Address;
const OTHER_TOKEN = "0x2000000000000000000000000000000000000000" as Address;
const OWNER = "0x3000000000000000000000000000000000000000" as Address;
const HOOKS = "0x0000000000000000000000000000000000000000" as Address;

const mintParams = {
  poolKey: {
    currency0: zeroAddress,
    currency1: TOKEN,
    fee: 3_000,
    tickSpacing: 60,
    hooks: HOOKS,
  },
  tickLower: -120,
  tickUpper: 120,
  liquidity: 10_000n,
  amount0Max: 1_000n,
  amount1Max: 2_000n,
  owner: OWNER,
  hookData: "0x" as const,
};

test("native add-liquidity sweeps unused msg.value back to the owner", () => {
  const plan = buildMintPositionActionPlan(mintParams);

  assert.equal(plan.actions, "0x020d14");
  assert.equal(plan.params.length, 3);
  const mint = decodeAbiParameters(UniV4PM_MintPositionAbi, plan.params[0]);
  assert.deepEqual(mint, [
    mintParams.poolKey,
    mintParams.tickLower,
    mintParams.tickUpper,
    mintParams.liquidity,
    mintParams.amount0Max,
    mintParams.amount1Max,
    mintParams.owner,
    mintParams.hookData,
  ]);
  assert.deepEqual(decodeAbiParameters(UniV4PM_SettlePairAbi, plan.params[1]), [
    {
      currency0: mintParams.poolKey.currency0,
      currency1: mintParams.poolKey.currency1,
    },
  ]);
  assert.deepEqual(decodeAbiParameters(UniV4PM_SweepAbi, plan.params[2]), [
    zeroAddress,
    OWNER,
  ]);
});

test("ERC20-only add-liquidity does not add an unrelated sweep", () => {
  const plan = buildMintPositionActionPlan({
    ...mintParams,
    poolKey: {
      ...mintParams.poolKey,
      currency0: TOKEN,
      currency1: OTHER_TOKEN,
    },
  });

  assert.equal(plan.actions, "0x020d");
  assert.equal(plan.params.length, 2);
});

test("pool initialization and first mint are one on-chain multicall", () => {
  const calldata = buildAddLiquidityPositionCalldata({
    ...mintParams,
    deadline: 1_000n,
    initializeSqrtPriceX96: 2n ** 96n,
  });
  const outer = decodeFunctionData({
    abi: UniV4PositionManagerAbi,
    data: calldata,
  });

  assert.equal(outer.functionName, "multicall");
  const [innerCalls] = outer.args;
  assert.equal(innerCalls.length, 2);
  assert.equal(
    decodeFunctionData({
      abi: UniV4PositionManagerAbi,
      data: innerCalls[0],
    }).functionName,
    "initializePool"
  );
  assert.equal(
    decodeFunctionData({
      abi: UniV4PositionManagerAbi,
      data: innerCalls[1],
    }).functionName,
    "modifyLiquidities"
  );
});

test("initialized pools call modifyLiquidities directly", () => {
  const calldata = buildAddLiquidityPositionCalldata({
    ...mintParams,
    deadline: 1_000n,
  });

  assert.equal(
    decodeFunctionData({ abi: UniV4PositionManagerAbi, data: calldata })
      .functionName,
    "modifyLiquidities"
  );
});

test("mint encoding rejects invalid ticks, liquidity, and initial price", () => {
  assert.throws(() =>
    buildAddLiquidityPositionCalldata({
      ...mintParams,
      tickUpper: 100,
      deadline: 1_000n,
    })
  );
  assert.throws(() =>
    buildAddLiquidityPositionCalldata({
      ...mintParams,
      liquidity: 0n,
      deadline: 1_000n,
    })
  );
  assert.throws(() =>
    buildAddLiquidityPositionCalldata({
      ...mintParams,
      deadline: 1_000n,
      initializeSqrtPriceX96: 0n,
    })
  );
});
