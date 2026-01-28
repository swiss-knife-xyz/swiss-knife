import { Address } from "viem";
import { base, baseSepolia } from "viem/chains";
import { UniversalRouterAbi } from "@/lib/uniswap/abi/UniversalRouter";

// ===== CONTRACT ADDRESSES =====

export const StateViewAddress: Record<number, Address> = {
  [baseSepolia.id]: "0x571291b572ed32ce6751a2Cb2486EbEe8DEfB9B4",
  [base.id]: "0xA3c0c9b65baD0b08107Aa264b0f3dB444b867A71",
};

export const Permit2Address: Record<number, Address> = {
  [baseSepolia.id]: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
  [base.id]: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
};

export const UniV4PositionManagerAddress: Record<number, Address> = {
  [baseSepolia.id]: "0x4B2C77d209D3405F41a037Ec6c77F7F5b8e2ca80",
  [base.id]: "0x7C5f5A4bBd8fD63184577525326123B519429bDc",
};

export const UniversalRouterAddress: Record<number, Address> = {
  [baseSepolia.id]: "0x492E6456D9528771018DeB9E87ef7750EF184104",
  [base.id]: "0x6fF5693b99212Da76ad316178A184AB56D299b43",
};

// ===== CONTRACT ABIS =====

export const StateViewAbi = [
  {
    inputs: [
      {
        internalType: "contract IPoolManager",
        name: "_poolManager",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [{ internalType: "PoolId", name: "poolId", type: "bytes32" }],
    name: "getFeeGrowthGlobals",
    outputs: [
      { internalType: "uint256", name: "feeGrowthGlobal0", type: "uint256" },
      { internalType: "uint256", name: "feeGrowthGlobal1", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "PoolId", name: "poolId", type: "bytes32" },
      { internalType: "int24", name: "tickLower", type: "int24" },
      { internalType: "int24", name: "tickUpper", type: "int24" },
    ],
    name: "getFeeGrowthInside",
    outputs: [
      {
        internalType: "uint256",
        name: "feeGrowthInside0X128",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "feeGrowthInside1X128",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "PoolId", name: "poolId", type: "bytes32" }],
    name: "getLiquidity",
    outputs: [{ internalType: "uint128", name: "liquidity", type: "uint128" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "PoolId", name: "poolId", type: "bytes32" },
      { internalType: "bytes32", name: "positionId", type: "bytes32" },
    ],
    name: "getPositionInfo",
    outputs: [
      { internalType: "uint128", name: "liquidity", type: "uint128" },
      {
        internalType: "uint256",
        name: "feeGrowthInside0LastX128",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "feeGrowthInside1LastX128",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "PoolId", name: "poolId", type: "bytes32" },
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "int24", name: "tickLower", type: "int24" },
      { internalType: "int24", name: "tickUpper", type: "int24" },
      { internalType: "bytes32", name: "salt", type: "bytes32" },
    ],
    name: "getPositionInfo",
    outputs: [
      { internalType: "uint128", name: "liquidity", type: "uint128" },
      {
        internalType: "uint256",
        name: "feeGrowthInside0LastX128",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "feeGrowthInside1LastX128",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "PoolId", name: "poolId", type: "bytes32" },
      { internalType: "bytes32", name: "positionId", type: "bytes32" },
    ],
    name: "getPositionLiquidity",
    outputs: [{ internalType: "uint128", name: "liquidity", type: "uint128" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "PoolId", name: "poolId", type: "bytes32" }],
    name: "getSlot0",
    outputs: [
      { internalType: "uint160", name: "sqrtPriceX96", type: "uint160" },
      { internalType: "int24", name: "tick", type: "int24" },
      { internalType: "uint24", name: "protocolFee", type: "uint24" },
      { internalType: "uint24", name: "lpFee", type: "uint24" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "PoolId", name: "poolId", type: "bytes32" },
      { internalType: "int16", name: "tick", type: "int16" },
    ],
    name: "getTickBitmap",
    outputs: [{ internalType: "uint256", name: "tickBitmap", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "PoolId", name: "poolId", type: "bytes32" },
      { internalType: "int24", name: "tick", type: "int24" },
    ],
    name: "getTickFeeGrowthOutside",
    outputs: [
      {
        internalType: "uint256",
        name: "feeGrowthOutside0X128",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "feeGrowthOutside1X128",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "PoolId", name: "poolId", type: "bytes32" },
      { internalType: "int24", name: "tick", type: "int24" },
    ],
    name: "getTickInfo",
    outputs: [
      { internalType: "uint128", name: "liquidityGross", type: "uint128" },
      { internalType: "int128", name: "liquidityNet", type: "int128" },
      {
        internalType: "uint256",
        name: "feeGrowthOutside0X128",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "feeGrowthOutside1X128",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "PoolId", name: "poolId", type: "bytes32" },
      { internalType: "int24", name: "tick", type: "int24" },
    ],
    name: "getTickLiquidity",
    outputs: [
      { internalType: "uint128", name: "liquidityGross", type: "uint128" },
      { internalType: "int128", name: "liquidityNet", type: "int128" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "poolManager",
    outputs: [
      { internalType: "contract IPoolManager", name: "", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const Permit2Abi = [
  {
    inputs: [
      { internalType: "address", name: "", type: "address" },
      { internalType: "address", name: "", type: "address" },
      { internalType: "address", name: "", type: "address" },
    ],
    name: "allowance",
    outputs: [
      { internalType: "uint160", name: "amount", type: "uint160" },
      { internalType: "uint48", name: "expiration", type: "uint48" },
      { internalType: "uint48", name: "nonce", type: "uint48" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint160", name: "amount", type: "uint160" },
      { internalType: "uint48", name: "expiration", type: "uint48" },
    ],
    name: "approve",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export const UniV4PositionManagerAbi = [
  {
    inputs: [
      {
        components: [
          { internalType: "Currency", name: "currency0", type: "address" },
          { internalType: "Currency", name: "currency1", type: "address" },
          { internalType: "uint24", name: "fee", type: "uint24" },
          { internalType: "int24", name: "tickSpacing", type: "int24" },
          { internalType: "contract IHooks", name: "hooks", type: "address" },
        ],
        internalType: "struct PoolKey",
        name: "key",
        type: "tuple",
      },
      { internalType: "uint160", name: "sqrtPriceX96", type: "uint160" },
    ],
    name: "initializePool",
    outputs: [{ internalType: "int24", name: "", type: "int24" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes", name: "unlockData", type: "bytes" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "modifyLiquidities",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  // Position-specific functions
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "positionInfo",
    outputs: [
      { internalType: "bytes25", name: "poolId", type: "bytes25" },
      { internalType: "int24", name: "tickLower", type: "int24" },
      { internalType: "int24", name: "tickUpper", type: "int24" },
      { internalType: "bool", name: "hasSubscriber", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes25", name: "poolId", type: "bytes25" }],
    name: "poolKeys",
    outputs: [
      {
        components: [
          { internalType: "Currency", name: "currency0", type: "address" },
          { internalType: "Currency", name: "currency1", type: "address" },
          { internalType: "uint24", name: "fee", type: "uint24" },
          { internalType: "int24", name: "tickSpacing", type: "int24" },
          { internalType: "contract IHooks", name: "hooks", type: "address" },
        ],
        internalType: "struct PoolKey",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "getPositionLiquidity",
    outputs: [{ internalType: "uint128", name: "liquidity", type: "uint128" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "tokenURI",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "getPoolAndPositionInfo",
    outputs: [
      {
        components: [
          { internalType: "Currency", name: "currency0", type: "address" },
          { internalType: "Currency", name: "currency1", type: "address" },
          { internalType: "uint24", name: "fee", type: "uint24" },
          { internalType: "int24", name: "tickSpacing", type: "int24" },
          { internalType: "contract IHooks", name: "hooks", type: "address" },
        ],
        internalType: "struct PoolKey",
        name: "poolKey",
        type: "tuple",
      },
      { internalType: "PositionInfo", name: "positionInfo", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Export UniversalRouter ABI
export { UniversalRouterAbi };

// ERC20 ABI for token information
export const ERC20Abi = [
  {
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// ===== PARAMETER ENCODING ABIS =====

export const UniV4PM_MintPositionAbi = [
  {
    type: "tuple",
    components: [
      { type: "address", name: "currency0" },
      { type: "address", name: "currency1" },
      { type: "uint24", name: "fee" },
      { type: "int24", name: "tickSpacing" },
      { type: "address", name: "hooks" },
    ],
  },
  { type: "int24", name: "tickLower" },
  { type: "int24", name: "tickUpper" },
  { type: "uint256", name: "liquidity" },
  { type: "uint128", name: "amount0Max" },
  { type: "uint128", name: "amount1Max" },
  { type: "address", name: "owner" },
  { type: "bytes", name: "hookData" },
] as const;

export const UniV4PM_SettlePairAbi = [
  {
    type: "tuple",
    components: [
      { type: "address", name: "currency0" },
      { type: "address", name: "currency1" },
    ],
  },
] as const;

export const DecreaseLiquidityParamsAbi = [
  { type: "uint256", name: "tokenId" },
  { type: "uint256", name: "liquidity" },
  { type: "uint128", name: "amount0Min" },
  { type: "uint128", name: "amount1Min" },
  { type: "bytes", name: "hookData" },
] as const;

export const SettlePairParamsAbi = [
  { type: "address", name: "currency0" },
  { type: "address", name: "currency1" },
] as const;

export const TakePairParamsAbi = [
  { type: "address", name: "currency0" },
  { type: "address", name: "currency1" },
  { type: "address", name: "recipient" },
] as const;

// ===== ACTION CONSTANTS =====

export const V4PMActions = {
  INCREASE_LIQUIDITY: "00",
  DECREASE_LIQUIDITY: "01",
  MINT_POSITION: "02",
  BURN_POSITION: "03",
  INCREASE_LIQUIDITY_FROM_DELTAS: "04",
  MINT_POSITION_FROM_DELTAS: "05",
  SWAP_EXACT_IN_SINGLE: "06",
  SWAP_EXACT_IN: "07",
  SWAP_EXACT_OUT_SINGLE: "08",
  SWAP_EXACT_OUT: "09",
  DONATE: "0a",
  SETTLE: "0b",
  SETTLE_ALL: "0c",
  SETTLE_PAIR: "0d",
  TAKE: "0e",
  TAKE_ALL: "0f",
  TAKE_PORTION: "10",
  TAKE_PAIR: "11",
  CLOSE_CURRENCY: "12",
  CLEAR_OR_TAKE: "13",
  SWEEP: "14",
  WRAP: "15",
  UNWRAP: "16",
  MINT_6909: "17",
  BURN_6909: "18",
} as const;

// ===== MATH CONSTANTS =====

export const Q96 = 2n ** 96n;
export const Q192 = 2n ** 192n;

// TickMath constants
export const MIN_TICK = -887272;
export const MAX_TICK = 887272;

// ===== UTILITY CONSTANTS =====

// Native ETH address representation
export const NATIVE_ETH = "0x0000000000000000000000000000000000000000";

// Default slippage in basis points (0.5% = 50 basis points)
export const DEFAULT_SLIPPAGE_BPS = 50;

// Maximum slippage in basis points (10% = 1000 basis points)
export const MAX_SLIPPAGE_BPS = 1000;

// ===== TYPE DEFINITIONS =====

export interface PoolKey {
  currency0: Address;
  currency1: Address;
  fee: number;
  tickSpacing: number;
  hooks: Address;
}

// ===== QUOTER CONSTANTS =====

export const quoterAbi = [
  {
    inputs: [
      {
        internalType: "contract IPoolManager",
        name: "_poolManager",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [{ internalType: "PoolId", name: "poolId", type: "bytes32" }],
    name: "NotEnoughLiquidity",
    type: "error",
  },
  { inputs: [], name: "NotPoolManager", type: "error" },
  { inputs: [], name: "NotSelf", type: "error" },
  {
    inputs: [
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "uint160", name: "sqrtPriceX96After", type: "uint160" },
      { internalType: "int24", name: "tickAfter", type: "int24" },
    ],
    name: "QuoteSwap",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amount", type: "uint256" },
      {
        internalType: "uint160[]",
        name: "sqrtPriceX96AfterList",
        type: "uint160[]",
      },
      { internalType: "int24[]", name: "tickAfterList", type: "int24[]" },
    ],
    name: "QuoteSwapList",
    type: "error",
  },
  { inputs: [], name: "UnexpectedCallSuccess", type: "error" },
  {
    inputs: [{ internalType: "bytes", name: "revertData", type: "bytes" }],
    name: "UnexpectedRevertBytes",
    type: "error",
  },
  {
    inputs: [
      {
        components: [
          { internalType: "Currency", name: "exactCurrency", type: "address" },
          {
            components: [
              {
                internalType: "Currency",
                name: "intermediateCurrency",
                type: "address",
              },
              { internalType: "uint24", name: "fee", type: "uint24" },
              { internalType: "int24", name: "tickSpacing", type: "int24" },
              {
                internalType: "contract IHooks",
                name: "hooks",
                type: "address",
              },
              { internalType: "bytes", name: "hookData", type: "bytes" },
            ],
            internalType: "struct PathKey[]",
            name: "path",
            type: "tuple[]",
          },
          { internalType: "uint128", name: "exactAmount", type: "uint128" },
        ],
        internalType: "struct IV4QuoterV2.QuoteExactParams",
        name: "params",
        type: "tuple",
      },
    ],
    name: "_quoteExactInput",
    outputs: [{ internalType: "bytes", name: "", type: "bytes" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            components: [
              { internalType: "Currency", name: "currency0", type: "address" },
              { internalType: "Currency", name: "currency1", type: "address" },
              { internalType: "uint24", name: "fee", type: "uint24" },
              { internalType: "int24", name: "tickSpacing", type: "int24" },
              {
                internalType: "contract IHooks",
                name: "hooks",
                type: "address",
              },
            ],
            internalType: "struct PoolKey",
            name: "poolKey",
            type: "tuple",
          },
          { internalType: "bool", name: "zeroForOne", type: "bool" },
          { internalType: "uint128", name: "exactAmount", type: "uint128" },
          { internalType: "bytes", name: "hookData", type: "bytes" },
        ],
        internalType: "struct IV4QuoterV2.QuoteExactSingleParams",
        name: "params",
        type: "tuple",
      },
    ],
    name: "_quoteExactInputSingle",
    outputs: [{ internalType: "bytes", name: "", type: "bytes" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          { internalType: "Currency", name: "exactCurrency", type: "address" },
          {
            components: [
              {
                internalType: "Currency",
                name: "intermediateCurrency",
                type: "address",
              },
              { internalType: "uint24", name: "fee", type: "uint24" },
              { internalType: "int24", name: "tickSpacing", type: "int24" },
              {
                internalType: "contract IHooks",
                name: "hooks",
                type: "address",
              },
              { internalType: "bytes", name: "hookData", type: "bytes" },
            ],
            internalType: "struct PathKey[]",
            name: "path",
            type: "tuple[]",
          },
          { internalType: "uint128", name: "exactAmount", type: "uint128" },
        ],
        internalType: "struct IV4QuoterV2.QuoteExactParams",
        name: "params",
        type: "tuple",
      },
    ],
    name: "_quoteExactOutput",
    outputs: [{ internalType: "bytes", name: "", type: "bytes" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            components: [
              { internalType: "Currency", name: "currency0", type: "address" },
              { internalType: "Currency", name: "currency1", type: "address" },
              { internalType: "uint24", name: "fee", type: "uint24" },
              { internalType: "int24", name: "tickSpacing", type: "int24" },
              {
                internalType: "contract IHooks",
                name: "hooks",
                type: "address",
              },
            ],
            internalType: "struct PoolKey",
            name: "poolKey",
            type: "tuple",
          },
          { internalType: "bool", name: "zeroForOne", type: "bool" },
          { internalType: "uint128", name: "exactAmount", type: "uint128" },
          { internalType: "bytes", name: "hookData", type: "bytes" },
        ],
        internalType: "struct IV4QuoterV2.QuoteExactSingleParams",
        name: "params",
        type: "tuple",
      },
    ],
    name: "_quoteExactOutputSingle",
    outputs: [{ internalType: "bytes", name: "", type: "bytes" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "msgSender",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "poolManager",
    outputs: [
      { internalType: "contract IPoolManager", name: "", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          { internalType: "Currency", name: "exactCurrency", type: "address" },
          {
            components: [
              {
                internalType: "Currency",
                name: "intermediateCurrency",
                type: "address",
              },
              { internalType: "uint24", name: "fee", type: "uint24" },
              { internalType: "int24", name: "tickSpacing", type: "int24" },
              {
                internalType: "contract IHooks",
                name: "hooks",
                type: "address",
              },
              { internalType: "bytes", name: "hookData", type: "bytes" },
            ],
            internalType: "struct PathKey[]",
            name: "path",
            type: "tuple[]",
          },
          { internalType: "uint128", name: "exactAmount", type: "uint128" },
        ],
        internalType: "struct IV4QuoterV2.QuoteExactParams",
        name: "params",
        type: "tuple",
      },
    ],
    name: "quoteExactInput",
    outputs: [
      { internalType: "uint256", name: "amountOut", type: "uint256" },
      {
        internalType: "uint160[]",
        name: "sqrtPriceX96AfterList",
        type: "uint160[]",
      },
      { internalType: "int24[]", name: "tickAfterList", type: "int24[]" },
      { internalType: "uint256", name: "gasEstimate", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            components: [
              { internalType: "Currency", name: "currency0", type: "address" },
              { internalType: "Currency", name: "currency1", type: "address" },
              { internalType: "uint24", name: "fee", type: "uint24" },
              { internalType: "int24", name: "tickSpacing", type: "int24" },
              {
                internalType: "contract IHooks",
                name: "hooks",
                type: "address",
              },
            ],
            internalType: "struct PoolKey",
            name: "poolKey",
            type: "tuple",
          },
          { internalType: "bool", name: "zeroForOne", type: "bool" },
          { internalType: "uint128", name: "exactAmount", type: "uint128" },
          { internalType: "bytes", name: "hookData", type: "bytes" },
        ],
        internalType: "struct IV4QuoterV2.QuoteExactSingleParams",
        name: "params",
        type: "tuple",
      },
    ],
    name: "quoteExactInputSingle",
    outputs: [
      { internalType: "uint256", name: "amountOut", type: "uint256" },
      { internalType: "uint160", name: "sqrtPriceX96After", type: "uint160" },
      { internalType: "int24", name: "tickAfter", type: "int24" },
      { internalType: "uint256", name: "gasEstimate", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          { internalType: "Currency", name: "exactCurrency", type: "address" },
          {
            components: [
              {
                internalType: "Currency",
                name: "intermediateCurrency",
                type: "address",
              },
              { internalType: "uint24", name: "fee", type: "uint24" },
              { internalType: "int24", name: "tickSpacing", type: "int24" },
              {
                internalType: "contract IHooks",
                name: "hooks",
                type: "address",
              },
              { internalType: "bytes", name: "hookData", type: "bytes" },
            ],
            internalType: "struct PathKey[]",
            name: "path",
            type: "tuple[]",
          },
          { internalType: "uint128", name: "exactAmount", type: "uint128" },
        ],
        internalType: "struct IV4QuoterV2.QuoteExactParams",
        name: "params",
        type: "tuple",
      },
    ],
    name: "quoteExactOutput",
    outputs: [
      { internalType: "uint256", name: "amountIn", type: "uint256" },
      {
        internalType: "uint160[]",
        name: "sqrtPriceX96AfterList",
        type: "uint160[]",
      },
      { internalType: "int24[]", name: "tickAfterList", type: "int24[]" },
      { internalType: "uint256", name: "gasEstimate", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            components: [
              { internalType: "Currency", name: "currency0", type: "address" },
              { internalType: "Currency", name: "currency1", type: "address" },
              { internalType: "uint24", name: "fee", type: "uint24" },
              { internalType: "int24", name: "tickSpacing", type: "int24" },
              {
                internalType: "contract IHooks",
                name: "hooks",
                type: "address",
              },
            ],
            internalType: "struct PoolKey",
            name: "poolKey",
            type: "tuple",
          },
          { internalType: "bool", name: "zeroForOne", type: "bool" },
          { internalType: "uint128", name: "exactAmount", type: "uint128" },
          { internalType: "bytes", name: "hookData", type: "bytes" },
        ],
        internalType: "struct IV4QuoterV2.QuoteExactSingleParams",
        name: "params",
        type: "tuple",
      },
    ],
    name: "quoteExactOutputSingle",
    outputs: [
      { internalType: "uint256", name: "amountIn", type: "uint256" },
      { internalType: "uint160", name: "sqrtPriceX96After", type: "uint160" },
      { internalType: "int24", name: "tickAfter", type: "int24" },
      { internalType: "uint256", name: "gasEstimate", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes", name: "data", type: "bytes" }],
    name: "unlockCallback",
    outputs: [{ internalType: "bytes", name: "", type: "bytes" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export const quoterAddress: Record<number, Address> = {
  // our unofficial quoter
  [baseSepolia.id]: "0xF0f351A4472b3F54A0232538969d1Ea6BaAFCfEE",
  [base.id]: "0xad23E08D7F40e2844fF01A6d19D0e4a57381D6a6",
};

// ===== LOCAL STORAGE KEYS =====

// Shared pool configuration keys used across multiple components
export enum PoolConfigLocalStorageKeys {
  CURRENCY0 = "uniswap-currency0",
  CURRENCY1 = "uniswap-currency1",
  TICK_SPACING = "uniswap-tickSpacing",
  FEE = "uniswap-fee",
  HOOK_ADDRESS = "uniswap-hookAddress",
  HOOK_DATA = "uniswap-hookData",
}

// Add liquidity specific local storage keys
export enum AddLiquidityLocalStorageKeys {
  HOOK_DATA = "uniswap-add-liquidity-hookData",
  AMOUNT0 = "uniswap-add-liquidity-amount0",
  AMOUNT1 = "uniswap-add-liquidity-amount1",
  TICK_LOWER = "uniswap-add-liquidity-tickLower",
  TICK_UPPER = "uniswap-add-liquidity-tickUpper",
  PRICE_INPUT_MODE = "uniswap-add-liquidity-priceInputMode",
  LOWER_PRICE = "uniswap-add-liquidity-lowerPrice",
  UPPER_PRICE = "uniswap-add-liquidity-upperPrice",
  PRICE_DIRECTION = "uniswap-add-liquidity-priceDirection",
  INITIAL_PRICE = "uniswap-add-liquidity-initialPrice",
  INITIAL_PRICE_DIRECTION = "uniswap-add-liquidity-initialPriceDirection",
}

// Swap specific local storage keys
export enum SwapLocalStorageKeys {
  POOLS = "uniswap-swap-pools",
  FROM_CURRENCY = "uniswap-swap-from",
  TO_CURRENCY = "uniswap-swap-to",
  AMOUNT = "uniswap-swap-amount",
  SLIPPAGE = "uniswap-swap-slippage",
}
