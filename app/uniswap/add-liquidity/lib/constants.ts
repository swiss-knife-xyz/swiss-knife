import { Address } from "viem";
import { baseSepolia } from "viem/chains";

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
] as const;

export const StateViewAddress: Record<number, Address> = {
  [baseSepolia.id]: "0x571291b572ed32ce6751a2Cb2486EbEe8DEfB9B4",
};

export const Permit2Address: Record<number, Address> = {
  [baseSepolia.id]: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
};

export const UniV4PositionManagerAddress: Record<number, Address> = {
  [baseSepolia.id]: "0x4B2C77d209D3405F41a037Ec6c77F7F5b8e2ca80",
};

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
] as const;

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

export const V4PMActions = {
  MINT_POSITION: "02",
  SETTLE_PAIR: "0d",
};

export const Q96 = 2n ** 96n;
export const Q192 = 2n ** 192n;

// TickMath constants
export const MIN_TICK = -887272;
export const MAX_TICK = 887272;

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
