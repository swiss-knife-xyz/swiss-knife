import assert from "node:assert/strict";
import test from "node:test";
import { AbiCoder, Interface } from "ethers";
import { decodeUniversalRouter, decodeV3Path } from "./universalRouter";
import type {
  Arg,
  DecodeBytesParamResult,
  DecodeRecursiveResult,
} from "@/types";
const abi = AbiCoder.defaultAbiCoder();
const router = new Interface([
  "function execute(bytes commands,bytes[] inputs,uint256 deadline)",
  "function execute(bytes commands,bytes[] inputs)",
]);
const A = "0x1111111111111111111111111111111111111111";
const B = "0x2222222222222222222222222222222222222222";
const C = "0x3333333333333333333333333333333333333333";
const pool =
  "(address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks)";
const poolValue = [A, B, 3000n, -60n, C];
const opaque = `0x${"11".repeat(65)}`;
const path = A + "000bb8" + B.slice(2) + "0001f4" + C.slice(2);
const bytes = (arg: Arg) => (arg.value as DecodeBytesParamResult).decoded!;
const items = (arg: Arg) => arg.value as Arg[];
const input = (r: NonNullable<DecodeRecursiveResult>, i = 0) =>
  items(r.args[1])[i];
const pack = (commands: string, inputs: string[], deadline = false) =>
  router.encodeFunctionData(
    deadline ? "execute(bytes,bytes[],uint256)" : "execute(bytes,bytes[])",
    deadline ? [commands, inputs, 123n] : [commands, inputs]
  );
async function decode(
  commands: string,
  inputs: string[],
  version: "auto" | "v3" | "v4" = "auto"
) {
  const r = await decodeUniversalRouter({
    calldata: pack(commands, inputs),
    depth: 0,
    generic: async () => null,
    version,
  });
  assert.ok(r);
  return r;
}

test("both execute overloads decode offline with named fields and deadline", async () => {
  const payload = abi.encode(["address", "uint256"], [A, 4]);
  const r = await decodeUniversalRouter({
    calldata: pack("0x0b", [payload], true),
    depth: 0,
    generic: async () => {
      throw new Error("No RPC");
    },
  });
  assert.ok(r);
  assert.deepEqual(
    r.args.map((a) => a.name),
    ["commands", "inputs", "deadline"]
  );
  assert.equal(r.args[2].value, "123");
  assert.equal(bytes(input(r)).functionName, "WRAP_ETH");
});

test("V3 exact-in and reverse-encoded exact-out paths normalize multi-hop execution order", async () => {
  for (const exactOut of [false, true]) {
    const r = await decode(exactOut ? "0x01" : "0x00", [
      abi.encode(
        ["address", "uint256", "uint256", "bytes", "bool"],
        [A, 10, 9, path, true]
      ),
    ]);
    const decoded = bytes(input(r));
    assert.equal(decoded.args[4].type, "bool");
    assert.equal(decoded.args[4].value, true);
    const hops = items(bytes(decoded.args[3]).args[0]);
    assert.equal(hops.length, 2);
    assert.equal(items(hops[0])[0].value, exactOut ? C : A);
    assert.equal(items(hops[0])[2].value, exactOut ? B : B);
    assert.equal(items(hops[1])[2].value, exactOut ? A : C);
    assert.equal(items(hops[0])[1].type, "uint24");
  }
  assert.equal(decodeV3Path("0x1234"), null);
  assert.equal(decodeV3Path(path + "00"), null);
});

test("same 0x10 decodes Seaport in V3-era routers and nested swap actions in V4 routers", async () => {
  const legacy = await decode("0x10", [
    abi.encode(["uint256", "bytes"], [1, "0x12345678"]),
  ]);
  assert.equal(bytes(input(legacy)).functionName, "SEAPORT");
  const swap = abi.encode(
    [`(${pool},bool,uint128,uint128,bytes)`],
    [[poolValue, true, 10, 9, opaque]]
  );
  const v4 = await decode("0x10", [
    abi.encode(
      ["bytes", "bytes[]"],
      [
        "0x060c0f",
        [
          swap,
          abi.encode(["address", "uint256"], [A, 10]),
          abi.encode(["address", "uint256"], [B, 9]),
        ],
      ]
    ),
  ]);
  const actions = bytes(input(v4));
  assert.equal(actions.functionName, "V4_SWAP");
  const action = bytes(items(actions.args[1])[0]);
  assert.equal(action.functionName, "SWAP_EXACT_IN_SINGLE");
  const params = items(action.args[0]);
  assert.equal(params[2].type, "uint128");
  assert.equal(items(params[0])[3].type, "int24");
  assert.equal(items(params[0])[3].value, "-60");
  assert.equal(bytes(params[4]), null); // hookData is not calldata
  assert.equal(bytes(items(actions.args[1])[1]).functionName, "SETTLE_ALL");
  assert.equal(bytes(items(actions.args[1])[2]).functionName, "TAKE_ALL");
});

test("Permit2 single, batch and transfer arrays preserve narrow widths; signature bytes stay opaque", async () => {
  const details =
    "(address token,uint160 amount,uint48 expiration,uint48 nonce)";
  const single = abi.encode(
    [`(${details},address,uint256)`, "bytes"],
    [[[A, 1, 2, 3], B, 4], opaque]
  );
  const batch = abi.encode(
    [`(${details}[],address,uint256)`, "bytes"],
    [
      [
        [
          [A, 1, 2, 3],
          [B, 4, 5, 6],
        ],
        C,
        9,
      ],
      opaque,
    ]
  );
  const transfer = abi.encode(
    ["(address,address,uint160,address)[]"],
    [[[A, B, 8, C]]]
  );
  const r = await decode("0x0a030d", [single, batch, transfer]);
  assert.equal(bytes(input(r)).functionName, "PERMIT2_PERMIT");
  assert.equal(items(items(bytes(input(r)).args[0])[0])[3].type, "uint48");
  assert.equal(bytes(bytes(input(r)).args[1]), null);
  const entries = items(items(bytes(input(r, 1)).args[0])[0]);
  assert.equal(entries.length, 2);
  assert.equal(items(entries[1])[1].type, "uint160");
  assert.equal(items(items(bytes(input(r, 2)).args[0])[0])[2].type, "uint160");
});

test("flags, legacy reserved mask and recursive subplans preserve command/payload association", async () => {
  const wrap = abi.encode(["address", "uint256"], [A, 1]);
  const sub = abi.encode(["bytes", "bytes[]"], ["0x8b", [wrap]]);
  const r = await decode("0xa14b2b", [sub, wrap, wrap]);
  const subplan = input(r);
  assert.match(subplan.decodeNote!, /Allow revert/);
  assert.equal(bytes(subplan).functionName, "EXECUTE_SUB_PLAN");
  const inner = items(bytes(subplan).args[1])[0];
  assert.equal(bytes(inner).functionName, "WRAP_ETH");
  assert.match(inner.decodeNote!, /Allow revert/);
  assert.equal(bytes(input(r, 1)).functionName, "WRAP_ETH");
  assert.match(input(r, 1).decodeNote!, /reserved bits 0x40/);
  assert.equal(bytes(input(r, 2)).functionName, "WRAP_ETH");
  assert.match(input(r, 2).decodeNote!, /reserved bits 0x20/);
});

test("V4 multi-hop and current extended price-limit schemas decode without confusing older layouts", async () => {
  for (const id of [6, 7, 8, 9])
    for (const extended of [false, true]) {
      const exactIn = id < 8;
      const amounts = exactIn
        ? "uint128 amountIn,uint128 amountOutMinimum"
        : "uint128 amountOut,uint128 amountInMaximum";
      const type =
        id % 2 === 0
          ? `(${pool},bool,${amounts},${extended ? "uint256 minHopPriceX36," : ""}bytes hookData)`
          : `(address currency,(address intermediateCurrency,uint24 fee,int24 tickSpacing,address hooks,bytes hookData)[] path,${extended ? "uint256[] minHopPriceX36," : ""}${amounts})`;
      const value =
        id % 2 === 0
          ? [poolValue, true, 10, 9, ...(extended ? [123] : []), opaque]
          : [
              A,
              [[B, 3000, -60, C, opaque]],
              ...(extended ? [[123]] : []),
              10,
              9,
            ];
      const r = await decode("0x10", [
        abi.encode(
          ["bytes", "bytes[]"],
          [
            `0x${id.toString(16).padStart(2, "0")}`,
            [abi.encode([type], [value])],
          ]
        ),
      ]);
      const swap = bytes(items(bytes(input(r)).args[1])[0]);
      assert.match(swap.functionName, exactIn ? /EXACT_IN/ : /EXACT_OUT/);
      assert.ok(items(swap.args[0]).some((a) => a.type === "uint128"));
      if (extended)
        assert.ok(items(swap.args[0]).some((a) => a.name === "minHopPriceX36"));
    }
});

test("V4 initialization and position manager unlock actions recurse with liquidity tuples", async () => {
  const position = new Interface([
    "function modifyLiquidities(bytes unlockData,uint256 deadline)",
  ]);
  const mint = abi.encode(
    [
      pool,
      "int24",
      "int24",
      "uint256",
      "uint128",
      "uint128",
      "address",
      "bytes",
    ],
    [poolValue, -120, 120, 99, 10, 20, A, opaque]
  );
  const unlock = abi.encode(
    ["bytes", "bytes[]"],
    ["0x020d", [mint, abi.encode(["address", "address"], [A, B])]]
  );
  const r = await decode("0x1314", [
    abi.encode([pool, "uint160"], [poolValue, 100]),
    position.encodeFunctionData("modifyLiquidities", [unlock, 999]),
  ]);
  assert.equal(bytes(input(r)).functionName, "V4_INITIALIZE_POOL");
  const modify = bytes(bytes(input(r, 1)).args[0]);
  assert.equal(modify.functionName, "modifyLiquidities");
  const action = bytes(items(bytes(modify.args[0]).args[1])[0]);
  assert.equal(action.functionName, "MINT_POSITION");
  assert.equal(action.args[1].value, "-120");
  assert.equal(action.args[4].type, "uint128");
  assert.equal(bytes(action.args[7]), null);
});

test("unknowns, count mismatches, invalid ABI and overflow retain raw bytes instead of guessing known commands", async () => {
  const payload = abi.encode(["address", "uint256"], [A, 1]);
  const r = await decode("0x3f0b0b", [payload, payload + "00"]);
  assert.match(input(r).decodeNote!, /Unknown command/);
  assert.equal(input(r).rawValue, payload);
  assert.match(input(r, 1).decodeNote!, /Invalid command payload/);
  assert.match(r.args[0].decodeNote!, /count mismatch/);
  const narrowed = await decode("0x02", [
    abi.encode(["address", "address", "uint256"], [A, B, 2n ** 160n]),
  ]);
  assert.match(input(narrowed).decodeNote!, /Invalid command/);
  const boolBad = await decode("0x00", [
    abi.encode(
      ["address", "uint256", "uint256", "bytes", "uint256"],
      [A, 1, 2, path, 2]
    ),
  ]);
  assert.match(input(boolBad).decodeNote!, /Invalid command/);
  const extra = await decode("0x", [payload]);
  assert.equal(input(extra).name, "UNMATCHED_INPUT");
  const wrongVersion = await decode(
    "0x10",
    [abi.encode(["uint256", "bytes"], [1, "0x"])],
    "v4"
  );
  assert.equal(bytes(input(wrongVersion)), null);
});

test("V3 NFT commands and nested external calls use their own schemas", async () => {
  const r = await decode("0x1113141b22", [
    abi.encode(
      ["uint256", "bytes", "address", "address", "uint256"],
      [1, "0x12345678", A, B, 7]
    ),
    abi.encode(["uint256", "address", "uint256"], [5, A, 10]),
    abi.encode(
      ["uint256", "bytes", "address", "address", "uint256", "uint256"],
      [1, "0x12345678", A, B, 7, 2]
    ),
    abi.encode(
      ["uint256", "bytes", "address", "address", "uint256", "uint256"],
      [1, "0x12345678", A, B, 7, 2]
    ),
    abi.encode(["address", "uint256"], [A, 1]),
  ]);
  assert.deepEqual(
    items(r.args[1]).map((i) => bytes(i).functionName),
    [
      "LOOKS_RARE_721",
      "CRYPTOPUNKS",
      "LOOKS_RARE_1155",
      "X2Y2_1155",
      "APPROVE_ERC20",
    ]
  );
});

test("deep subplans are bounded and never recurse into the same payload", async () => {
  let commands = "0x0b",
    payloads = [abi.encode(["address", "uint256"], [A, 1])];
  for (let i = 0; i < 20; i++) {
    payloads = [abi.encode(["bytes", "bytes[]"], [commands, payloads])];
    commands = "0x21";
  }
  const r = await decode(commands, payloads);
  let leaf = input(r),
    depth = 0;
  while (bytes(leaf)) {
    depth++;
    leaf = items(bytes(leaf).args[1])[0];
  }
  assert.ok(depth <= 10);
  assert.match(leaf.decodeNote!, /depth limit/);
});

test("Across integration uses the full 7-bit command id and offset-prefixed struct", async () => {
  const type =
    "(address,address,address,address,uint256,uint256,uint256,address,uint32,uint32,uint32,bytes,bool)";
  const payload = abi.encode(
    [type],
    [[A, B, A, B, 10, 9, 8453, C, 1, 2, 3, opaque, false]]
  );
  const r = await decode("0x40", [payload]);
  assert.equal(bytes(input(r)).functionName, "ACROSS_V4_DEPOSIT_V3");
  const params = items(bytes(input(r)).args[0]);
  assert.equal(params[8].type, "uint32");
  assert.equal(bytes(params[11]), null);
  assert.equal(input(r).decodeNote, undefined);
});

test("common transfers, balance checks and V2 paths keep exact names and types", async () => {
  const vectors: [string, string[], unknown[], string][] = [
    [
      "02",
      ["address", "address", "uint160"],
      [A, B, 9],
      "PERMIT2_TRANSFER_FROM",
    ],
    ["04", ["address", "address", "uint256"], [A, B, 9], "SWEEP"],
    ["05", ["address", "address", "uint256"], [A, B, 9], "TRANSFER"],
    ["06", ["address", "address", "uint256"], [A, B, 9], "PAY_PORTION"],
    [
      "07",
      ["address", "address", "uint256"],
      [A, B, 9],
      "PAY_PORTION_FULL_PRECISION",
    ],
    [
      "08",
      ["address", "uint256", "uint256", "address[]", "bool"],
      [A, 10, 9, [A, B], true],
      "V2_SWAP_EXACT_IN",
    ],
    [
      "09",
      ["address", "uint256", "uint256", "address[]", "bool", "uint256[]"],
      [A, 10, 9, [A, B], true, [123]],
      "V2_SWAP_EXACT_OUT",
    ],
    ["0c", ["address", "uint256"], [A, 9], "UNWRAP_WETH"],
    ["0e", ["address", "address", "uint256"], [A, B, 9], "BALANCE_CHECK_ERC20"],
  ];
  for (const [id, types, values, name] of vectors) {
    const r = await decode("0x" + id, [abi.encode(types, values)]);
    assert.equal(bytes(input(r)).functionName, name);
    if (id === "09")
      assert.equal(bytes(input(r)).args[5].name, "minHopPriceX36");
  }
});

test("unknown and unsupported V4 actions remain indexed and keep raw payloads", async () => {
  const payload = abi.encode(["address", "uint256"], [A, 1]);
  const r = await decode("0x10", [
    abi.encode(["bytes", "bytes[]"], ["0xff0c0c", [payload, payload + "00"]]),
  ]);
  const actionArgs = items(bytes(input(r)).args[1]);
  assert.equal(actionArgs[0].name, "UNKNOWN_ACTION_0xff");
  assert.equal(actionArgs[0].rawValue, payload);
  assert.equal(bytes(actionArgs[0]), null);
  assert.match(actionArgs[1].decodeNote!, /Invalid action payload/);
  assert.match(input(r).decodeNote!, /count mismatch/);
});
