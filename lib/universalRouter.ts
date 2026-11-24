import { AbiCoder, FunctionFragment, Interface, ParamType } from "ethers";
import type {
  Arg,
  DecodeParamTypesResult,
  DecodeRecursiveResult,
} from "@/types";

// Schema sources and version boundaries: ./universalRouter.sources.md.
// No router SDK/runtime dependency: only ABI schemas and packed path parsing.
const coder = AbiCoder.defaultAbiCoder();
const execute = new Interface([
  "function execute(bytes commands, bytes[] inputs, uint256 deadline)",
  "function execute(bytes commands, bytes[] inputs)",
]);
const positionManager = new Interface([
  "function modifyLiquidities(bytes unlockData,uint256 deadline)",
  "function modifyLiquiditiesWithoutUnlock(bytes actions,bytes[] params)",
  "function permit(address spender,uint256 tokenId,uint256 deadline,uint8 v,bytes32 r,bytes32 s)",
  "function decreaseLiquidity((uint256 tokenId,uint128 liquidity,uint256 amount0Min,uint256 amount1Min,uint256 deadline) params)",
  "function collect((uint256 tokenId,address recipient,uint128 amount0Max,uint128 amount1Max) params)",
  "function burn(uint256 tokenId)",
  "function multicall(bytes[] data)",
]);
const POOL =
  "(address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks)";
const PATH =
  "(address intermediateCurrency,uint24 fee,int24 tickSpacing,address hooks,bytes hookData)";
const DETAILS = "(address token,uint160 amount,uint48 expiration,uint48 nonce)";
type Schema = {
  name: string;
  params: readonly string[];
  kind?: "subplan" | "v4" | "call";
  path?: "in" | "out";
};
const schema = (
  name: string,
  params: readonly string[],
  extra: Partial<Schema> = {}
): Schema => ({ name, params, ...extra });
const common: Record<number, Schema> = {
  0x00: schema(
    "V3_SWAP_EXACT_IN",
    [
      "address recipient",
      "uint256 amountIn",
      "uint256 amountOutMin",
      "bytes path",
      "bool payerIsUser",
    ],
    { path: "in" }
  ),
  0x01: schema(
    "V3_SWAP_EXACT_OUT",
    [
      "address recipient",
      "uint256 amountOut",
      "uint256 amountInMax",
      "bytes path",
      "bool payerIsUser",
    ],
    { path: "out" }
  ),
  0x02: schema("PERMIT2_TRANSFER_FROM", [
    "address token",
    "address recipient",
    "uint160 amount",
  ]),
  0x03: schema("PERMIT2_PERMIT_BATCH", [
    `(${DETAILS}[] details,address spender,uint256 sigDeadline) permit`,
    "bytes signature",
  ]),
  0x04: schema("SWEEP", [
    "address token",
    "address recipient",
    "uint256 amountMin",
  ]),
  0x05: schema("TRANSFER", [
    "address token",
    "address recipient",
    "uint256 value",
  ]),
  0x06: schema("PAY_PORTION", [
    "address token",
    "address recipient",
    "uint256 bips",
  ]),
  0x08: schema("V2_SWAP_EXACT_IN", [
    "address recipient",
    "uint256 amountIn",
    "uint256 amountOutMin",
    "address[] path",
    "bool payerIsUser",
  ]),
  0x09: schema("V2_SWAP_EXACT_OUT", [
    "address recipient",
    "uint256 amountOut",
    "uint256 amountInMax",
    "address[] path",
    "bool payerIsUser",
  ]),
  0x0a: schema("PERMIT2_PERMIT", [
    `(${DETAILS} details,address spender,uint256 sigDeadline) permit`,
    "bytes signature",
  ]),
  0x0b: schema("WRAP_ETH", ["address recipient", "uint256 amountMin"]),
  0x0c: schema("UNWRAP_WETH", ["address recipient", "uint256 amountMin"]),
  0x0d: schema("PERMIT2_TRANSFER_FROM_BATCH", [
    "(address from,address to,uint160 amount,address token)[] transfers",
  ]),
  0x0e: schema("BALANCE_CHECK_ERC20", [
    "address owner",
    "address token",
    "uint256 minBalance",
  ]),
  0x21: schema("EXECUTE_SUB_PLAN", ["bytes commands", "bytes[] inputs"], {
    kind: "subplan",
  }),
};
const valueData = ["uint256 value", "bytes data"];
const nft721 = [
  ...valueData,
  "address recipient",
  "address token",
  "uint256 tokenId",
];
const legacy: Record<number, Schema> = {
  0x10: schema("SEAPORT", valueData),
  0x11: schema("LOOKS_RARE_V2", valueData),
  0x12: schema("NFTX", valueData),
  0x13: schema("CRYPTOPUNKS", [
    "uint256 punkId",
    "address recipient",
    "uint256 value",
  ]),
  0x14: schema("LOOKS_RARE_1155", [...nft721, "uint256 amount"]),
  0x15: schema("OWNER_CHECK_721", [
    "address owner",
    "address token",
    "uint256 tokenId",
  ]),
  0x16: schema("OWNER_CHECK_1155", [
    "address owner",
    "address token",
    "uint256 tokenId",
    "uint256 minBalance",
  ]),
  0x17: schema("SWEEP_ERC721", [
    "address token",
    "address recipient",
    "uint256 tokenId",
  ]),
  0x18: schema("X2Y2_721", nft721),
  0x19: schema("SUDOSWAP", valueData),
  0x1a: schema("NFT20", valueData),
  0x1b: schema("X2Y2_1155", [...nft721, "uint256 amount"]),
  0x1c: schema("FOUNDATION", nft721),
  0x1d: schema("SWEEP_ERC1155", [
    "address token",
    "address recipient",
    "uint256 tokenId",
    "uint256 amount",
  ]),
  0x1e: schema("ELEMENT_MARKET", valueData),
  0x20: schema("SEAPORT_V1_4", valueData),
  0x22: schema("APPROVE_ERC20", ["address token", "uint256 spender"]),
};
const modern: Record<number, Schema> = {
  0x07: schema("PAY_PORTION_FULL_PRECISION", [
    "address token",
    "address recipient",
    "uint256 portion",
  ]),
  0x10: schema("V4_SWAP", ["bytes actions", "bytes[] params"], { kind: "v4" }),
  0x11: schema("V3_POSITION_MANAGER_PERMIT", [], { kind: "call" }),
  0x12: schema("V3_POSITION_MANAGER_CALL", [], { kind: "call" }),
  0x13: schema("V4_INITIALIZE_POOL", [
    `${POOL} poolKey`,
    "uint160 sqrtPriceX96",
  ]),
  0x14: schema("V4_POSITION_MANAGER_CALL", [], { kind: "call" }),
  0x40: schema("ACROSS_V4_DEPOSIT_V3", [
    "(address depositor,address recipient,address inputToken,address outputToken,uint256 inputAmount,uint256 outputAmount,uint256 destinationChainId,address exclusiveRelayer,uint32 quoteTimestamp,uint32 fillDeadline,uint32 exclusivityDeadline,bytes message,bool useNative) params",
  ]),
};
const actions: Record<number, Schema> = {
  0x00: schema("INCREASE_LIQUIDITY", [
    "uint256 tokenId",
    "uint256 liquidity",
    "uint128 amount0Max",
    "uint128 amount1Max",
    "bytes hookData",
  ]),
  0x01: schema("DECREASE_LIQUIDITY", [
    "uint256 tokenId",
    "uint256 liquidity",
    "uint128 amount0Min",
    "uint128 amount1Min",
    "bytes hookData",
  ]),
  0x02: schema("MINT_POSITION", [
    `${POOL} poolKey`,
    "int24 tickLower",
    "int24 tickUpper",
    "uint256 liquidity",
    "uint128 amount0Max",
    "uint128 amount1Max",
    "address owner",
    "bytes hookData",
  ]),
  0x03: schema("BURN_POSITION", [
    "uint256 tokenId",
    "uint128 amount0Min",
    "uint128 amount1Min",
    "bytes hookData",
  ]),
  0x04: schema("INCREASE_LIQUIDITY_FROM_DELTAS", [
    "uint256 tokenId",
    "uint128 amount0Max",
    "uint128 amount1Max",
    "bytes hookData",
  ]),
  0x05: schema("MINT_POSITION_FROM_DELTAS", [
    `${POOL} poolKey`,
    "int24 tickLower",
    "int24 tickUpper",
    "uint128 amount0Max",
    "uint128 amount1Max",
    "address owner",
    "bytes hookData",
  ]),
  0x0a: schema("DONATE", [
    "uint256 amount0",
    "uint256 amount1",
    "bytes hookData",
  ]),
  0x0b: schema("SETTLE", [
    "address currency",
    "uint256 amount",
    "bool payerIsUser",
  ]),
  0x0c: schema("SETTLE_ALL", ["address currency", "uint256 maxAmount"]),
  0x0d: schema("SETTLE_PAIR", ["address currency0", "address currency1"]),
  0x0e: schema("TAKE", [
    "address currency",
    "address recipient",
    "uint256 amount",
  ]),
  0x0f: schema("TAKE_ALL", ["address currency", "uint256 minAmount"]),
  0x10: schema("TAKE_PORTION", [
    "address currency",
    "address recipient",
    "uint256 bips",
  ]),
  0x11: schema("TAKE_PAIR", [
    "address currency0",
    "address currency1",
    "address recipient",
  ]),
  0x12: schema("CLOSE_CURRENCY", ["address currency"]),
  0x13: schema("CLEAR_OR_TAKE", ["address currency", "uint256 amountMax"]),
  0x14: schema("SWEEP", ["address currency", "address recipient"]),
  0x15: schema("WRAP", ["uint256 amount"]),
  0x16: schema("UNWRAP", ["uint256 amount"]),
  0x17: schema("MINT_6909", [
    "address currency",
    "address recipient",
    "uint256 amount",
  ]),
  0x18: schema("BURN_6909", ["address currency", "uint256 amount"]),
};
for (const [id, name, single, exactIn] of [
  [6, "SWAP_EXACT_IN_SINGLE", true, true],
  [7, "SWAP_EXACT_IN", false, true],
  [8, "SWAP_EXACT_OUT_SINGLE", true, false],
  [9, "SWAP_EXACT_OUT", false, false],
] as const) {
  const amounts = exactIn
    ? "uint128 amountIn,uint128 amountOutMinimum"
    : "uint128 amountOut,uint128 amountInMaximum";
  actions[id] = schema(name, [
    single
      ? `(${POOL} poolKey,bool zeroForOne,${amounts},bytes hookData) swap`
      : `(address ${exactIn ? "currencyIn" : "currencyOut"},${PATH}[] path,${amounts}) swap`,
  ]);
}

export type RouterVersion = "auto" | "v3" | "v4";
type Decoded = NonNullable<DecodeRecursiveResult>;
type GenericDecoder = (
  calldata: string,
  depth: number
) => Promise<DecodeRecursiveResult>;
type Match = {
  schema: Schema;
  types: ParamType[];
  values: readonly any[];
  version: "shared" | "v3" | "v4";
  call?: FunctionFragment;
};
const hexId = (id: number) => `0x${id.toString(16).padStart(2, "0")}`;
const rawBytes = (
  name: string,
  rawValue: string,
  decoded: DecodeRecursiveResult = null,
  decodeNote?: string
): Arg => ({
  name,
  type: "bytes",
  baseType: "bytes",
  rawValue,
  value: { decoded },
  ...(decodeNote ? { decodeNote } : {}),
});
const result = (name: string, args: Arg[], rawArgs: any = []): Decoded => ({
  functionName: name,
  signature: name,
  args,
  rawArgs,
});

// Roundtrip rejects padding violations, trailing data, truncated offsets, invalid
// bools and narrowed integer overflow. A plausible prefix is not a schema match.
function matchSchema(
  def: Schema,
  data: string,
  version: Match["version"]
): Match | undefined {
  try {
    const types = def.params.map((p) => ParamType.from(p));
    const values = coder.decode(types, data);
    if (coder.encode(types, values).toLowerCase() !== data.toLowerCase())
      return;
    return { schema: def, types, values, version };
  } catch {
    return;
  }
}
function variants(def: Schema, id: number, v4Action = false): Schema[] {
  if (!v4Action && [0, 1, 8, 9].includes(id))
    return [
      def,
      { ...def, params: [...def.params, "uint256[] minHopPriceX36"] },
    ];
  if (v4Action && id >= 6 && id <= 9) {
    const p = def.params[0];
    const extended =
      id === 6 || id === 8
        ? p.replace(
            ",bytes hookData)",
            ",uint256 minHopPriceX36,bytes hookData)"
          )
        : p.replace("[] path,", "[] path,uint256[] minHopPriceX36,");
    return [def, { ...def, params: [extended] }];
  }
  return [def];
}
function candidates(id: number, data: string): Match[] {
  if (common[id])
    return variants(common[id], id).flatMap(
      (def) =>
        matchSchema(
          def,
          data,
          def.params.length > common[id].params.length ? "v4" : "shared"
        ) ?? []
    );
  const matches: Match[] = [];
  // 0x11 was LOOKS_RARE_721 in the initial V3-era router.
  const old =
    id === 0x11 ? [legacy[id], schema("LOOKS_RARE_721", nft721)] : [legacy[id]];
  for (const def of old.filter(Boolean)) {
    const found = matchSchema(def, data, "v3");
    if (found) matches.push(found);
  }
  const def = modern[id];
  if (def?.kind === "call") {
    try {
      const call = positionManager.parseTransaction({ data });
      const allowed =
        id === 0x11
          ? ["permit"]
          : id === 0x12
            ? ["decreaseLiquidity", "collect", "burn", "multicall"]
            : ["modifyLiquidities", "modifyLiquiditiesWithoutUnlock"];
      if (
        call &&
        allowed.includes(call.name) &&
        positionManager
          .encodeFunctionData(call.fragment, call.args)
          .toLowerCase() === data.toLowerCase()
      )
        matches.push({
          schema: def,
          types: Array.from(call.fragment.inputs),
          values: call.args,
          version: "v4",
          call: call.fragment,
        });
    } catch {
      /* preserve raw on unrecognized selector */
    }
  } else if (def) {
    const found = matchSchema(def, data, "v4");
    if (found) matches.push(found);
  }
  return matches;
}

async function typedArg(
  type: ParamType,
  rawValue: any,
  depth: number,
  generic: GenericDecoder
): Promise<Arg> {
  let value: DecodeParamTypesResult;
  if (type.baseType === "tuple")
    value = await Promise.all(
      type.components!.map((p, i) => typedArg(p, rawValue[i], depth, generic))
    );
  else if (type.baseType === "array")
    value = await Promise.all(
      Array.from(rawValue, (v) =>
        typedArg(type.arrayChildren!, v, depth, generic)
      )
    );
  else if (type.baseType.includes("bytes")) {
    // Signatures, hashes, hookData and arbitrary bridge messages are opaque.
    value = {
      decoded:
        ["data", "calldata"].includes(type.name) && depth < 10
          ? await generic(rawValue, depth + 1)
          : null,
    };
  } else if (/^u?int/.test(type.type)) value = BigInt(rawValue).toString();
  else value = rawValue;
  return {
    name: type.name,
    type: type.type,
    baseType: type.baseType,
    rawValue,
    value,
  };
}
async function argumentsFor(
  match: Match,
  depth: number,
  generic: GenericDecoder
): Promise<Arg[]> {
  return Promise.all(
    match.types.map((p, i) => typedArg(p, match.values[i], depth, generic))
  );
}

export function decodeV3Path(data: string, exactOut = false): Decoded | null {
  if (!/^0x[\da-f]+$/i.test(data)) return null;
  const bytes = (data.length - 2) / 2;
  if (bytes < 43 || (bytes - 20) % 23 !== 0) return null;
  const hops: { tokenIn: string; tokenOut: string; fee: number }[] = [];
  for (let offset = 2; offset + 86 <= data.length; offset += 46) {
    const a = `0x${data.slice(offset, offset + 40)}`;
    const fee = parseInt(data.slice(offset + 40, offset + 46), 16);
    const b = `0x${data.slice(offset + 46, offset + 86)}`;
    hops.push({ tokenIn: exactOut ? b : a, tokenOut: exactOut ? a : b, fee });
  }
  if (exactOut) hops.reverse();
  const values = hops.map((hop) => [hop.tokenIn, hop.fee, hop.tokenOut]);
  const hopType = ParamType.from(
    "(address tokenIn,uint24 fee,address tokenOut)[] hops"
  );
  // This packed representation has no selector; expose the execution direction
  // and hop fields without ever passing path bytes to calldata heuristics.
  return result(
    exactOut ? "V3_PATH_EXACT_OUT" : "V3_PATH_EXACT_IN",
    [
      {
        name: "hops",
        type: hopType.type,
        baseType: "array",
        rawValue: values,
        value: hops.map((hop) => ({
          name: "",
          type: "tuple",
          baseType: "tuple",
          rawValue: [hop.tokenIn, hop.fee, hop.tokenOut],
          value: [
            {
              name: "tokenIn",
              type: "address",
              baseType: "address",
              rawValue: hop.tokenIn,
              value: hop.tokenIn,
            },
            {
              name: "fee",
              type: "uint24",
              baseType: "uint24",
              rawValue: hop.fee,
              value: String(hop.fee),
            },
            {
              name: "tokenOut",
              type: "address",
              baseType: "address",
              rawValue: hop.tokenOut,
              value: hop.tokenOut,
            },
          ],
        })),
      },
    ],
    values
  );
}

async function v4Plan(
  data: string,
  depth: number,
  generic: GenericDecoder,
  position = false
): Promise<Decoded | null> {
  if (depth > 10) return null;
  const decoded = matchSchema(
    schema("V4_ACTIONS", ["bytes actions", "bytes[] params"]),
    data,
    "v4"
  );
  if (!decoded) return null;
  const [codes, params] = decoded.values as [string, readonly string[]];
  const ids =
    codes
      .slice(2)
      .match(/../g)
      ?.map((x) => parseInt(x, 16)) ?? [];
  const args = await argumentsFor(decoded, depth, generic);
  const items = await Promise.all(
    params.map(async (payload, i) => {
      const id = ids[i];
      if (id === undefined)
        return rawBytes(
          "UNMATCHED_INPUT",
          payload,
          null,
          "No corresponding action"
        );
      const def = actions[id];
      const allowed = position
        ? [
            0, 1, 2, 3, 4, 5, 0x0b, 0x0d, 0x0e, 0x11, 0x12, 0x13, 0x14, 0x15,
            0x16,
          ]
        : [6, 7, 8, 9, 0x0b, 0x0c, 0x0e, 0x0f, 0x10];
      const match =
        def &&
        variants(def, id, true)
          .map((s) => matchSchema(s, payload, "v4"))
          .find(Boolean);
      const note = !allowed.includes(id)
        ? "Unsupported action in this context"
        : !match
          ? "Invalid action payload"
          : undefined;
      const value =
        match && depth < 10
          ? result(
              def.name,
              await argumentsFor(match, depth + 1, generic),
              match.values
            )
          : null;
      return rawBytes(
        value ? "" : (def?.name ?? `UNKNOWN_ACTION_${hexId(id)}`),
        payload,
        value,
        note
      );
    })
  );
  args[0] = rawBytes(
    "actions",
    codes,
    result(
      "V4_ACTIONS",
      ids.map((id, i) => ({
        name: `[${i}]`,
        type: "string",
        baseType: "string",
        rawValue: hexId(id),
        value: `${hexId(id)} ${actions[id]?.name ?? "UNKNOWN_ACTION"}`,
      }))
    )
  );
  args[1] = { ...args[1], value: items };
  return {
    ...result("V4_ACTIONS", args, decoded.values),
    ...(ids.length !== params.length
      ? { decodeNote: "Action/input count mismatch" }
      : {}),
  };
}

async function callArgs(
  match: Match,
  depth: number,
  generic: GenericDecoder
): Promise<Arg[]> {
  const args = await argumentsFor(match, depth, generic);
  if (match.call?.name === "modifyLiquidities")
    args[0] = rawBytes(
      "unlockData",
      match.values[0],
      await v4Plan(match.values[0], depth + 1, generic, true)
    );
  if (match.call?.name === "modifyLiquiditiesWithoutUnlock") {
    const plan = await v4Plan(
      coder.encode(["bytes", "bytes[]"], match.values),
      depth + 1,
      generic,
      true
    );
    if (plan) return plan.args;
  }
  if (match.call?.name === "multicall") {
    args[0].value = await Promise.all(
      (match.values[0] as string[]).map(async (payload) => {
        const next = candidates(0x12, payload)[0];
        return rawBytes(
          "",
          payload,
          next && depth < 10
            ? result(
                next.call!.name,
                await callArgs(next, depth + 1, generic),
                next.values
              )
            : null
        );
      })
    );
  }
  return args;
}

async function plan(
  commands: string,
  inputs: readonly string[],
  depth: number,
  generic: GenericDecoder,
  version: RouterVersion
): Promise<Arg[]> {
  const ids =
    commands
      .slice(2)
      .match(/../g)
      ?.map((x) => parseInt(x, 16)) ?? [];
  const commandId = (code: number, payload: string) => {
    const id = code & 0x7f;
    if (candidates(id, payload).length) return id;
    // V1.6/V2.0 ignore bit 0x40; V1.0 also ignores bit 0x20.
    // Prefer the newer interpretation whenever its complete schema matches.
    const masks = version === "v4" ? [0x3f] : [0x3f, 0x1f];
    for (const mask of masks) {
      const masked = code & mask;
      if (masked !== id && candidates(masked, payload).length) return masked;
    }
    return id;
  };
  const matches = inputs.map((payload, i) =>
    candidates(commandId(ids[i] ?? 0xff, payload), payload)
  );
  const evidence = new Set<"v3" | "v4">();
  for (const match of matches) {
    if (match.length === 1 && match[0].version !== "shared")
      evidence.add(match[0].version);
  }
  const detected =
    version !== "auto"
      ? version
      : evidence.size === 1
        ? [...evidence][0]
        : undefined;
  const names: string[] = [];
  const items = await Promise.all(
    inputs.map(async (payload, i) => {
      const code = ids[i];
      if (code === undefined)
        return rawBytes(
          "UNMATCHED_INPUT",
          payload,
          null,
          "No corresponding command"
        );
      const id = commandId(code, payload);
      const defs = [common[id], legacy[id], modern[id]].filter(Boolean);
      const valid = matches[i].filter(
        (m) => !detected || m.version === "shared" || m.version === detected
      );
      const match = valid.length === 1 ? valid[0] : undefined;
      const label =
        match?.schema.name ??
        (defs.length === 1
          ? defs[0].name
          : defs.length
            ? `COMMAND_${hexId(id)}`
            : `UNKNOWN_COMMAND_${hexId(id)}`);
      names[i] = label;
      const suffix = code & 0x80 ? " · allow revert" : "";
      if (depth >= 10)
        return rawBytes(label + suffix, payload, null, "Decode depth limit");
      if (!match) {
        // Keep #161/fork support, but never disguise a heuristic as a known schema.
        const guessed = !defs.length ? await generic(payload, depth + 1) : null;
        return rawBytes(
          label + suffix,
          payload,
          guessed,
          valid.length > 1
            ? "Ambiguous router version"
            : defs.length
              ? "Invalid command payload"
              : guessed?.decoding === "heuristic"
                ? "Unknown command · inferred payload"
                : guessed
                  ? "Unknown command · nested call"
                  : "Unknown command"
        );
      }
      let args: Arg[];
      if (match.schema.kind === "subplan")
        args = await plan(
          match.values[0],
          match.values[1],
          depth + 1,
          generic,
          detected ?? "auto"
        );
      else if (match.schema.kind === "v4") {
        const decoded = await v4Plan(payload, depth + 1, generic);
        args = decoded?.args ?? [];
      } else if (match.schema.kind === "call")
        args = [
          rawBytes(
            "calldata",
            payload,
            result(
              match.call!.name,
              await callArgs(match, depth + 1, generic),
              match.values
            )
          ),
        ];
      else args = await argumentsFor(match, depth + 1, generic);
      if (match.schema.path) {
        const path = args.find((a) => a.name === "path")!;
        path.value = {
          decoded: decodeV3Path(path.rawValue, match.schema.path === "out"),
        };
        if (!(path.value as { decoded: unknown }).decoded)
          path.decodeNote = "Invalid V3 path";
      }
      // V4 plan errors stay attached to the command, while retaining every raw input.
      const note =
        match.schema.kind === "subplan" &&
        match.values[0].length / 2 - 1 !== match.values[1].length
          ? "Command/input count mismatch"
          : match.schema.kind === "v4" &&
              (match.values[0].length - 2) / 2 !== match.values[1].length
            ? "Action/input count mismatch"
            : undefined;
      return rawBytes(
        "",
        payload,
        result(label, args, match.values),
        [
          note,
          code & 0x80 ? "Allow revert" : undefined,
          id !== (code & 0x7f)
            ? `Legacy reserved bits ${hexId((code & 0x7f) ^ id)}`
            : undefined,
        ]
          .filter(Boolean)
          .join(" · ") || undefined
      );
    })
  );
  const commandsArg = rawBytes(
    "commands",
    commands,
    result(
      "COMMANDS",
      ids.map((code, i) => ({
        name: `[${i}]`,
        type: "string",
        baseType: "string",
        rawValue: hexId(code),
        value: `${hexId(code)} ${names[i] ?? `UNKNOWN_COMMAND_${hexId(code & 0x7f)}`}${code & 0x80 ? " · allow revert" : ""}`,
      }))
    )
  );
  if (ids.length !== inputs.length)
    commandsArg.decodeNote = "Command/input count mismatch";
  else if (evidence.size > 1)
    commandsArg.decodeNote = "Mixed router-version layouts";
  return [
    commandsArg,
    {
      name: "inputs",
      type: "bytes[]",
      baseType: "array",
      rawValue: inputs,
      value: items,
    },
  ];
}

export async function decodeUniversalRouter({
  calldata,
  depth,
  generic,
  version = "auto",
}: {
  calldata: string;
  depth: number;
  generic: GenericDecoder;
  version?: RouterVersion;
}): Promise<DecodeRecursiveResult> {
  if (
    depth > 10 ||
    !["0x3593564c", "0x24856bc3"].includes(calldata.slice(0, 10).toLowerCase())
  )
    return null;
  try {
    const call = execute.parseTransaction({ data: calldata });
    if (
      !call ||
      execute.encodeFunctionData(call.fragment, call.args).toLowerCase() !==
        calldata.toLowerCase()
    )
      return null;
    const args = await plan(
      call.args[0],
      call.args[1],
      depth,
      generic,
      version
    );
    if (call.args.length === 3)
      args.push(
        await typedArg(
          ParamType.from("uint256 deadline"),
          call.args[2],
          depth,
          generic
        )
      );
    return {
      functionName: "execute",
      signature: call.signature,
      rawArgs: call.args,
      args,
    };
  } catch {
    return null;
  }
}
