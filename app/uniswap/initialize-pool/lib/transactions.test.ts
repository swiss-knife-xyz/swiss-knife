import assert from "node:assert/strict";
import test from "node:test";
import { Address, decodeFunctionData, zeroAddress } from "viem";
import { UniV4PositionManagerAbi } from "../../lib/constants";
import { buildInitializePoolCalldata } from "./transactions";

const TOKEN = "0x1000000000000000000000000000000000000000" as Address;
const poolKey = {
  currency0: zeroAddress,
  currency1: TOKEN,
  fee: 3_000,
  tickSpacing: 60,
  hooks: zeroAddress,
};

test("pool initialization encodes the validated key and exact sqrt price", () => {
  const sqrtPriceX96 = 2n ** 96n;
  const decoded = decodeFunctionData({
    abi: UniV4PositionManagerAbi,
    data: buildInitializePoolCalldata({ poolKey, sqrtPriceX96 }),
  });

  assert.equal(decoded.functionName, "initializePool");
  assert.deepEqual(decoded.args, [poolKey, sqrtPriceX96]);
});

test("pool initialization rejects malformed keys and prices", () => {
  assert.throws(() =>
    buildInitializePoolCalldata({
      poolKey: { ...poolKey, currency0: TOKEN, currency1: zeroAddress },
      sqrtPriceX96: 2n ** 96n,
    })
  );
  assert.throws(() =>
    buildInitializePoolCalldata({
      poolKey: { ...poolKey, fee: 1_000_000 },
      sqrtPriceX96: 2n ** 96n,
    })
  );
  assert.throws(() =>
    buildInitializePoolCalldata({
      poolKey: { ...poolKey, tickSpacing: 0 },
      sqrtPriceX96: 2n ** 96n,
    })
  );
  assert.throws(() =>
    buildInitializePoolCalldata({ poolKey, sqrtPriceX96: 0n })
  );
});
