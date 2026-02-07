import { Address, Hex } from "viem";

export interface PoolKey {
  currency0: Address;
  currency1: Address;
  fee: number;
  tickSpacing: number;
  hooks: Address;
}

export interface PoolWithHookData extends PoolKey {
  hookData: Hex;
}

export interface QuoteExactInputParams {
  exactAmount: bigint;
  exactCurrency: `0x${string}`;
  path: {
    fee: number;
    tickSpacing: number;
    hookData: `0x${string}`;
    hooks: `0x${string}`;
    intermediateCurrency: `0x${string}`;
  }[];
}
