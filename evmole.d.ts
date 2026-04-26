declare module "evmole" {
  export function functionSelectors(
    bytecode: string | Uint8Array,
    gasLimit?: number
  ): string[];

  export function functionArguments(
    bytecode: string | Uint8Array,
    selector: string,
    gasLimit?: number
  ): string;

  export function functionStateMutability(
    bytecode: string | Uint8Array,
    selector: string,
    gasLimit?: number
  ): string;
}
